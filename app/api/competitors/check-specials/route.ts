// POST /api/competitors/check-specials
// Given a competitor's address, finds their website and checks for active specials.
//
// Flow:
//   1. Search DuckDuckGo for "{address} {city} {state} apartments"
//   2. Extract top result URLs
//   3. Fetch the most promising URL (5s timeout)
//   4. Use Claude to extract: marketing name + any active concessions
//
// Returns:
//   { property_name, concession, website_url }
//   Any field may be null if not found.

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-haiku-4-5-20251001"; // fast + cheap for web parsing
const FETCH_TIMEOUT_MS = 6000;
const MAX_PAGE_CHARS = 12000; // truncate large pages before sending to Claude

let _ai: Anthropic | null = null;
function getAI(): Anthropic {
  if (_ai) return _ai;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("Missing ANTHROPIC_API_KEY");
  _ai = new Anthropic({ apiKey: key });
  return _ai;
}

// ─── DuckDuckGo search ────────────────────────────────────────────────────────

async function searchDDG(query: string): Promise<string[]> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  try {
    const res = await fetchWithTimeout(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) return [];
    const html = await res.text();

    // DDG HTML redirects encode destination in `uddg` param
    const matches = [...html.matchAll(/uddg=([^&"]+)/g)];
    const urls = matches
      .map(m => {
        try { return decodeURIComponent(m[1]); } catch { return null; }
      })
      .filter((u): u is string => !!u && u.startsWith("http"))
      .filter(u => !u.includes("duckduckgo.com") && !u.includes("bing.com"));

    // Deduplicate and return top 5
    return [...new Set(urls)].slice(0, 5);
  } catch {
    return [];
  }
}

// ─── Fetch with timeout ───────────────────────────────────────────────────────

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ─── Fetch page text ──────────────────────────────────────────────────────────

async function fetchPageText(url: string): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        Accept: "text/html",
      },
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Strip tags, collapse whitespace
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();

    return text.slice(0, MAX_PAGE_CHARS);
  } catch {
    return null;
  }
}

// ─── Claude extraction ────────────────────────────────────────────────────────

interface CheckResult {
  property_name: string | null;
  concession: string | null;
  website_url: string | null;
}

async function extractFromPage(
  pageText: string,
  url: string,
  address: string
): Promise<CheckResult> {
  const ai = getAI();

  const response = await ai.messages.create({
    model: MODEL,
    max_tokens: 300,
    system: `You are reading the website of an apartment community. Extract two things:
1. The marketing name of the apartment community (e.g. "The Reserve at Westchase", "Oak Creek Flats"). Not the street address — the brand name.
2. Any active special offer, concession, or promotion currently being advertised (e.g. "1 month free", "$500 off first month", "No deposit through June"). Only report what is explicitly on the page — do not invent anything.

Return ONLY valid JSON: {"property_name": "..." or null, "concession": "..." or null}
If you cannot determine something with confidence, return null for that field.`,
    messages: [
      {
        role: "user",
        content: `URL: ${url}\nAddress hint: ${address}\n\nPage text:\n${pageText}`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "{}";
  try {
    const parsed = JSON.parse(text.trim());
    return {
      property_name: parsed.property_name ?? null,
      concession: parsed.concession ?? null,
      website_url: url,
    };
  } catch {
    return { property_name: null, concession: null, website_url: url };
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { address, city, state } = body as {
    address?: string;
    city?: string;
    state?: string;
  };

  if (!address) {
    return NextResponse.json({ error: "address required" }, { status: 400 });
  }

  const empty: CheckResult = {
    property_name: null,
    concession: null,
    website_url: null,
  };

  // Search for the property website
  const query = [address, city, state, "apartments"].filter(Boolean).join(" ");
  const urls = await searchDDG(query);

  if (urls.length === 0) {
    return NextResponse.json(empty);
  }

  // Try the top URLs in order — stop at the first one that yields page text
  for (const url of urls.slice(0, 3)) {
    // Skip obvious non-property sites
    if (
      /zillow|apartments\.com|apartmentlist|rent\.com|trulia|realtor|facebook|yelp|google/i.test(
        url
      )
    ) {
      continue;
    }

    const text = await fetchPageText(url);
    if (!text || text.length < 200) continue;

    try {
      const result = await extractFromPage(text, url, address);
      return NextResponse.json(result);
    } catch {
      continue;
    }
  }

  // Fallback: try the first URL even if it's a listing site
  const fallbackText = urls[0] ? await fetchPageText(urls[0]) : null;
  if (fallbackText && fallbackText.length >= 200) {
    try {
      const result = await extractFromPage(fallbackText, urls[0], address);
      return NextResponse.json(result);
    } catch {
      // ignore
    }
  }

  return NextResponse.json(empty);
}
