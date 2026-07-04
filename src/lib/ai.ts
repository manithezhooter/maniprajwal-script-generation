const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

export async function callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
  if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY.startsWith("your_") || OPENROUTER_API_KEY === "") {
    throw new Error("OpenRouter API key is not configured. Please add OPENROUTER_API_KEY in your environment variables.");
  }

  try {
    console.log("[AI ROUTING] Attempting generation via OpenRouter API...");
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://maniprajwal-script-generation.vercel.app",
        "X-Title": "Liquid Glass Script Generator",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash:free",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log("[AI ROUTING] OpenRouter generation successful.");
      return data.choices[0].message.content || "";
    } else {
      const errText = await response.text();
      throw new Error(`OpenRouter API error: ${errText}`);
    }
  } catch (e: any) {
    console.error("[AI ROUTING] OpenRouter call failed:", e);
    throw e;
  }
}
