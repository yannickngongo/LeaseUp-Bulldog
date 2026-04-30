// GET /api/cron/sentry-digest
// Daily cron — pulls yesterday's unresolved errors from Sentry and posts a
// digest to Slack so you actually see them. Skips silently if creds aren't set.
//
// Required env (skip cleanly if missing):
//   SENTRY_AUTH_TOKEN     — User Auth Token from Sentry → User → API → Auth Tokens (with project:read)
//   SENTRY_ORG_SLUG       — your Sentry org slug
//   SENTRY_PROJECT_SLUG   — your Sentry project slug (e.g. "leaseup-bulldog")
//   SLACK_WEBHOOK_URL     — Slack incoming webhook URL (Slack app config)
//
// Auth: CRON_SECRET via Authorization: Bearer header (Vercel cron sends this).
//
// Schedule: vercel.json adds it at 9am UTC daily.

import { NextRequest, NextResponse } from "next/server";

interface SentryIssue {
  id:           string;
  shortId:      string;
  title:        string;
  culprit:      string;
  count:        string;       // Sentry returns these as strings
  userCount:    number;
  permalink:    string;
  level:        string;
  lastSeen:     string;
  firstSeen:    string;
  status:       string;
}

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  const url = new URL(req.url);
  return url.searchParams.get("secret") === secret;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sentryToken   = process.env.SENTRY_AUTH_TOKEN;
  const orgSlug       = process.env.SENTRY_ORG_SLUG;
  const projectSlug   = process.env.SENTRY_PROJECT_SLUG;
  const slackWebhook  = process.env.SLACK_WEBHOOK_URL;

  if (!sentryToken || !orgSlug || !projectSlug) {
    return NextResponse.json({
      ok: false,
      skipped: "Sentry env vars not configured",
      missing: {
        SENTRY_AUTH_TOKEN:    !sentryToken,
        SENTRY_ORG_SLUG:      !orgSlug,
        SENTRY_PROJECT_SLUG:  !projectSlug,
        SLACK_WEBHOOK_URL:    !slackWebhook,
      },
    });
  }

  // Pull unresolved issues from the last 24h, sorted by frequency
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const url   = new URL(`https://sentry.io/api/0/projects/${orgSlug}/${projectSlug}/issues/`);
  url.searchParams.set("query",  `is:unresolved age:-24h`);
  url.searchParams.set("sort",   "freq");
  url.searchParams.set("limit",  "10");

  let issues: SentryIssue[] = [];
  try {
    const r = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${sentryToken}` },
    });
    if (!r.ok) throw new Error(`Sentry API ${r.status}: ${await r.text()}`);
    issues = await r.json() as SentryIssue[];
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }

  if (issues.length === 0) {
    return NextResponse.json({ ok: true, issues: 0, message: "No new errors in the last 24h" });
  }

  // Build Slack message
  const blocks: Record<string, unknown>[] = [
    {
      type: "header",
      text: { type: "plain_text", text: `🐛 LUB error digest — ${issues.length} unresolved issue${issues.length === 1 ? "" : "s"}` },
    },
    {
      type: "context",
      elements: [{ type: "mrkdwn", text: `Last 24h, sorted by frequency · ${new Date().toLocaleDateString()}` }],
    },
    { type: "divider" },
  ];
  for (const issue of issues.slice(0, 8)) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*<${issue.permalink}|${issue.shortId}> ${issue.title}*\n_${issue.culprit}_\n${issue.count} events · ${issue.userCount} users · level: ${issue.level}`,
      },
    });
  }

  if (slackWebhook) {
    try {
      await fetch(slackWebhook, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ blocks }),
      });
    } catch (err) {
      return NextResponse.json({ ok: false, sentryIssues: issues.length, slackError: err instanceof Error ? err.message : String(err) }, { status: 502 });
    }
  }

  return NextResponse.json({
    ok:           true,
    sentryIssues: issues.length,
    slackPosted:  !!slackWebhook,
    skipped:      slackWebhook ? null : "SLACK_WEBHOOK_URL not set — issues fetched but not posted",
  });
}

// Stop "since" unused warning in some bundlers
void { since: null };
