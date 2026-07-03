import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { callLLM } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prompt } = await request.json();
    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const systemPrompt = `You are an expert copywriter and video script prompt engineer. 
Your goal is to rewrite and improve the user's short-form video prompt (for TikTok, Reels, Shorts).
Make the prompt more detailed, engaging, and specify details that will yield high-conversion hooks, emotional triggers, clear narrative arcs, and visual direction.
Respond with ONLY the improved prompt text. Do not add intros, explanations, or quotes.`;

    const improvedPrompt = await callLLM(systemPrompt, prompt);

    return NextResponse.json({ improvedPrompt: improvedPrompt.trim() });
  } catch (error: any) {
    console.error("Improve Prompt Error:", error);
    return NextResponse.json({ error: error.message || "Failed to improve prompt" }, { status: 500 });
  }
}
