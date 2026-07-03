import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { callLLM } from "@/lib/ai";

export const dynamic = "force-dynamic";

function getAge(dob: Date | string) {
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export async function POST(request: Request) {
  try {
    const session = await getAuthUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user to check age (DOB)
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const age = getAge(user.dob);

    const { prompt, improvedPrompt, language, duration, niche, readingLevel } = await request.json();

    if (!prompt || !language || !duration || !niche || !readingLevel) {
      return NextResponse.json(
        { error: "Missing required fields: prompt, language, duration, niche, and readingLevel" },
        { status: 400 }
      );
    }

    // Define standard system prompt for generating 5-6 script drafts
    const systemPrompt = `You are a world-class viral video content creator, copywriter, and scriptwriter.
Your goal is to generate 6 completely different script drafts for an Instagram Reel/YouTube Short.
Each draft must target the user's specific topic, niche, reading level, language, and duration.

Strict constraints:
1. Duration: Target script duration is ${duration} seconds (average speaking rate of 2.5 to 3 words per second, so roughly ${duration * 2.5} to ${duration * 3} words total per script, split between hook, body, and ending).
2. Niche: The scripts must match the style of the niche "${niche}".
3. Reading Level: Customize vocabulary for reading level "${readingLevel}".
4. Language: Generate the scripts in "${language}". You must output all script text (hooks, bodies, endings, and visual/expression cues inside brackets) in the requested language "${language}". Only the structural JSON keys must remain in English.
5. Content hooks: Start each script with an extremely compelling hook (first 3 seconds). Avoid sensitive/explicit words in hooks.
6. Altered bodies: The body scripts must be completely different for each hook. Do not repeat the same body with different hooks.
7. Expressions: Embed expressive cues inside the body and ending scripts using brackets translated into "${language}" (e.g., if language is Spanish write [Sonriendo con entusiasmo] instead of English [Smiling enthusiastically]).
8. Sensitivity check: Identify if the prompt or subject contains themes that are highly sensitive, adult-oriented (18+), violent, illegal, or dark.
9. Outro/Ending: Provide a short, viral call-to-action ending script (outro) for each variation.

You must respond with a raw JSON object. Do not wrap it in markdown code blocks or write any explanation outside the JSON.
JSON format:
{
  "isSensitive": boolean,
  "flaggedWords": string[],
  "drafts": [
    {
      "hook": "string (the hook in the requested language)",
      "body": "string (the main body with [expression cues] in the requested language, excluding the outro)",
      "ending": "string (the viral outro/ending script with [expression cues] in the requested language)"
    }
  ]
}
Ensure you generate exactly 6 drafts.`;

    const userPromptInput = `Topic Prompt: ${improvedPrompt || prompt}
Niche: ${niche}
Duration: ${duration} seconds
Reading Level: ${readingLevel}
Language: ${language}`;

    const llmResponse = await callLLM(systemPrompt, userPromptInput);

    let parsedResult;
    try {
      // Clean up markdown block styling if present
      const cleanJSON = llmResponse.replace(/```json/g, "").replace(/```/g, "").trim();
      parsedResult = JSON.parse(cleanJSON);
    } catch (e) {
      console.error("Failed to parse JSON response from LLM:", llmResponse);
      return NextResponse.json({ error: "AI generated an invalid format. Please try again." }, { status: 500 });
    }

    // Check sensitive warning
    if (parsedResult.isSensitive) {
      if (age < 18) {
        return NextResponse.json(
          {
            error: "Sensitive Content Blocked",
            message: "This prompt contains sensitive/mature words that are restricted for users under 18 years of age.",
            flaggedWords: parsedResult.flaggedWords,
          },
          { status: 403 }
        );
      } else {
        // User is 18+, return warning status requiring confirmation
        return NextResponse.json({
          sensitiveWarning: true,
          flaggedWords: parsedResult.flaggedWords,
          drafts: parsedResult.drafts,
          prompt,
          improvedPrompt: improvedPrompt || prompt,
          language,
          duration: parseInt(duration),
          niche,
          readingLevel,
        });
      }
    }

    // Normal generation, no sensitivity warning
    return NextResponse.json({
      sensitiveWarning: false,
      drafts: parsedResult.drafts,
      prompt,
      improvedPrompt: improvedPrompt || prompt,
      language,
      duration: parseInt(duration),
      niche,
      readingLevel,
    });
  } catch (error: any) {
    console.error("Generate Route Error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate scripts" }, { status: 500 });
  }
}
