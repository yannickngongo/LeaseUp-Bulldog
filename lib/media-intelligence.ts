import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/lib/supabase";

const anthropic = new Anthropic();

type ImageCategory = "exterior" | "kitchen" | "bedroom" | "bathroom" | "amenities" | "neighborhood" | "other";

interface MediaAnalysisResult {
  propertyId: string;
  totalImages: number;
  categorized: Record<ImageCategory, string[]>;
  missingCategories: ImageCategory[];
  recommendations: string[];
  coverageScore: number;
}

const REQUIRED_CATEGORIES: ImageCategory[] = ["exterior", "kitchen", "bedroom", "bathroom", "amenities"];

export async function analyzePropertyMedia(propertyId: string): Promise<MediaAnalysisResult> {
  const db = getSupabaseAdmin();

  const { data: property } = await db
    .from("properties")
    .select("id, name, images")
    .eq("id", propertyId)
    .single();

  const images: string[] = property?.images ?? [];

  const categorized: Record<ImageCategory, string[]> = {
    exterior: [],
    kitchen: [],
    bedroom: [],
    bathroom: [],
    amenities: [],
    neighborhood: [],
    other: [],
  };

  if (images.length > 0) {
    const prompt = `You are a real estate media analyst. Categorize these image URLs for a rental property.

Image URLs:
${images.map((url, i) => `${i + 1}. ${url}`).join("\n")}

Categories: exterior, kitchen, bedroom, bathroom, amenities, neighborhood, other

Respond with JSON only:
{
  "categorizations": [
    { "url": "...", "category": "exterior" },
    ...
  ]
}`;

    try {
      const response = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        for (const item of parsed.categorizations ?? []) {
          const cat = item.category as ImageCategory;
          if (categorized[cat] !== undefined) {
            categorized[cat].push(item.url);
          } else {
            categorized.other.push(item.url);
          }
        }
      }
    } catch {
      categorized.other.push(...images);
    }
  }

  const missingCategories = REQUIRED_CATEGORIES.filter((cat) => categorized[cat].length === 0);
  const coverageScore = Math.round(
    ((REQUIRED_CATEGORIES.length - missingCategories.length) / REQUIRED_CATEGORIES.length) * 100
  );

  const recommendations: string[] = [];
  if (missingCategories.length > 0) {
    recommendations.push(`Add photos for missing categories: ${missingCategories.join(", ")}`);
  }
  if (images.length < 10) {
    recommendations.push("Add more photos — listings with 10+ images get 40% more inquiries");
  }
  if (categorized.exterior.length === 0) {
    recommendations.push("Exterior photos are critical — add curb appeal shots immediately");
  }
  if (categorized.amenities.length === 0) {
    recommendations.push("Highlight amenities (gym, pool, parking) to justify premium pricing");
  }

  await db.from("media_analysis").upsert(
    {
      property_id: propertyId,
      total_images: images.length,
      categorized: categorized as unknown as Record<string, unknown>,
      missing_categories: missingCategories,
      recommendations,
      coverage_score: coverageScore,
      analyzed_at: new Date().toISOString(),
    },
    { onConflict: "property_id" }
  );

  return {
    propertyId,
    totalImages: images.length,
    categorized,
    missingCategories,
    recommendations,
    coverageScore,
  };
}

export async function recommendImagesForCampaign(
  campaignId: string
): Promise<{ recommended: string[]; reasoning: string }> {
  const db = getSupabaseAdmin();

  const { data: campaign } = await db
    .from("campaigns")
    .select("id, property_id, campaign_goal, target_renter, special_offer")
    .eq("id", campaignId)
    .single();

  if (!campaign) {
    return { recommended: [], reasoning: "Campaign not found" };
  }

  const { data: mediaAnalysis } = await db
    .from("media_analysis")
    .select("categorized")
    .eq("property_id", campaign.property_id)
    .single();

  if (!mediaAnalysis) {
    return { recommended: [], reasoning: "No media analysis found — run analyzePropertyMedia first" };
  }

  const categorized = mediaAnalysis.categorized as Record<ImageCategory, string[]>;

  const prompt = `You are a real estate marketing expert. Select the best images for a campaign.

Campaign goal: ${campaign.campaign_goal ?? "maximize leads"}
Target renter: ${campaign.target_renter ?? "general audience"}
Special offer: ${campaign.special_offer ?? "none"}

Available images by category:
${Object.entries(categorized)
  .filter(([, urls]) => (urls as string[]).length > 0)
  .map(([cat, urls]) => `${cat}: ${(urls as string[]).join(", ")}`)
  .join("\n")}

Select the 3-5 best images for this campaign and explain why. Respond with JSON:
{
  "recommended": ["url1", "url2", "url3"],
  "reasoning": "Brief explanation of why these images fit the campaign goal"
}`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      await db.from("media_recommendations").insert({
        campaign_id: campaignId,
        property_id: campaign.property_id,
        recommended_images: parsed.recommended ?? [],
        reasoning: parsed.reasoning ?? "",
        created_at: new Date().toISOString(),
      });

      return { recommended: parsed.recommended ?? [], reasoning: parsed.reasoning ?? "" };
    }
  } catch {
    // fall through
  }

  const fallback: string[] = [
    ...((categorized.exterior ?? []).slice(0, 1)),
    ...((categorized.kitchen ?? []).slice(0, 1)),
    ...((categorized.amenities ?? []).slice(0, 1)),
  ];

  return { recommended: fallback, reasoning: "Defaulted to exterior + kitchen + amenities selection" };
}
