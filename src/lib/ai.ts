const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

export async function callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
  if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY.startsWith("your_") || OPENROUTER_API_KEY === "") {
    throw new Error("OpenRouter API key is not configured. Please add OPENROUTER_API_KEY in your environment variables.");
  }

  const modelsToTry = [
    "google/gemini-2.5-flash",
    "nvidia/llama-3.1-nemotron-70b-instruct:free",
    "meta-llama/llama-3.1-8b-instruct:free",
    "openrouter/free"
  ];

  let lastError = null;

  for (const model of modelsToTry) {
    try {
      console.log(`[AI ROUTING] Attempting generation via OpenRouter API using model: ${model}...`);
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://maniprajwal-script-generation.vercel.app",
          "X-Title": "Liquid Glass Script Generator",
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`[AI ROUTING] OpenRouter generation successful using model: ${model}.`);
        return data.choices[0].message.content || "";
      } else {
        const errText = await response.text();
        console.warn(`[AI ROUTING] OpenRouter call failed for model ${model}. Details:`, errText);
        lastError = new Error(`OpenRouter API error (${model}): ${errText}`);
      }
    } catch (e: any) {
      console.warn(`[AI ROUTING] OpenRouter connection error for model ${model}:`, e);
      lastError = e;
    }
  }

  throw lastError || new Error("All OpenRouter models failed to generate content.");
}
