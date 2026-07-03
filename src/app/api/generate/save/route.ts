import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { callLLM } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await getAuthUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      prompt,
      improvedPrompt,
      language,
      duration,
      niche,
      readingLevel,
      drafts,
      selectedDraftIndex,
    } = await request.json();

    if (
      !prompt ||
      !language ||
      !duration ||
      !niche ||
      !readingLevel ||
      !drafts ||
      drafts.length === 0 ||
      selectedDraftIndex === undefined
    ) {
      return NextResponse.json(
        { error: "Missing required fields for saving" },
        { status: 400 }
      );
    }

    const selectedDraft = drafts[selectedDraftIndex];

    // Create Script first
    const scriptRecord = await prisma.script.create({
      data: {
        userId: session.userId,
        prompt,
        improvedPrompt: improvedPrompt || prompt,
        language,
        duration: parseInt(duration),
        niche,
        readingLevel,
      },
    });

    // Create all Drafts
    const draftRecords = await Promise.all(
      drafts.map((d: any) =>
        prisma.draft.create({
          data: {
            scriptId: scriptRecord.id,
            hook: d.hook,
            body: d.body + (d.ending ? `[ENDING_SPLIT]${d.ending}` : ""),
            isSensitive: false,
          },
        })
      )
    );

    const selectedDraftRecord = draftRecords[selectedDraftIndex];

    // Run SEO Analysis on the selected hook and body
    let seoKeywords = "";
    let seoHashtags = "";
    let seoCaption = "";
    let seoScore = 75;

    try {
      const seoSystemPrompt = `You are an SEO expert and growth marketer specialized in YouTube Shorts and Instagram Reels.
Analyze the provided video script hook and body, then output a JSON object containing:
1. keywords: a comma-separated list of top search keywords for SEO.
2. hashtags: a space-separated string of trending hashtags (4-6 hashtags).
3. caption: a highly engaging caption (under 200 characters) designed to encourage views, saves, and comments.
4. score: a numerical engagement score between 50 and 100 based on hook strength, pacing, and visual triggers.

Respond with ONLY the JSON object. Do not include markdown code wrappers or any intro.
JSON format:
{
  "keywords": "keyword1, keyword2, keyword3",
  "hashtags": "#tag1 #tag2 #tag3",
  "caption": "Your awesome caption here",
  "score": 85
}`;

      const seoInput = `Hook: ${selectedDraft.hook}\n\nBody: ${selectedDraft.body}`;
      const seoLLMResponse = await callLLM(seoSystemPrompt, seoInput);
      const cleanJSON = seoLLMResponse.replace(/```json/g, "").replace(/```/g, "").trim();
      const seoResult = JSON.parse(cleanJSON);

      seoKeywords = seoResult.keywords || "";
      seoHashtags = seoResult.hashtags || "";
      seoCaption = seoResult.caption || "";
      seoScore = seoResult.score || 75;
    } catch (seoErr) {
      console.warn("SEO analysis failed, using fallback:", seoErr);
      seoKeywords = `${niche}, content creation, viral videos`;
      seoHashtags = `#${niche.replace(/\s+/g, "")} #viral #shorts #reels`;
      seoCaption = `Check out this script on ${prompt.slice(0, 50)}!`;
    }

    // Update Script with selected draft and SEO parameters
    const updatedScript = await prisma.script.update({
      where: { id: scriptRecord.id },
      data: {
        selectedDraftId: selectedDraftRecord.id,
        seoKeywords,
        seoHashtags,
        seoCaption,
        seoScore,
      },
      include: {
        drafts: true,
      },
    });

    return NextResponse.json({
      message: "Script saved successfully",
      script: updatedScript,
    });
  } catch (error: any) {
    console.error("Save Script Error:", error);
    return NextResponse.json({ error: error.message || "Failed to save script" }, { status: 500 });
  }
}
