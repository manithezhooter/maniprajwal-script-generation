const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

export async function callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
  // Try OpenRouter first
  if (OPENROUTER_API_KEY && !OPENROUTER_API_KEY.startsWith("your_") && OPENROUTER_API_KEY !== "") {
    try {
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
        return data.choices[0].message.content || "";
      } else {
        const errText = await response.text();
        console.warn("OpenRouter API call failed, trying direct OpenAI. Details:", errText);
      }
    } catch (e) {
      console.warn("OpenRouter call error, trying direct OpenAI:", e);
    }
  }

  // Try OpenAI first
  if (OPENAI_API_KEY && !OPENAI_API_KEY.startsWith("your_") && OPENAI_API_KEY !== "") {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.choices[0].message.content || "";
      } else {
        const errText = await response.text();
        console.warn("OpenAI API call failed, trying Gemini. Details:", errText);
      }
    } catch (e) {
      console.warn("OpenAI call error, trying Gemini:", e);
    }
  }

  // Fallback to Gemini
  if (GOOGLE_API_KEY && !GOOGLE_API_KEY.startsWith("your_") && GOOGLE_API_KEY !== "") {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_API_KEY}`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `${systemPrompt}\n\nUser Prompt: ${userPrompt}`
                }
              ]
            }
          ],
          tools: [
            {
              googleSearch: {}
            }
          ],
          generationConfig: {
            temperature: 0.7,
          }
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.candidates[0].content.parts[0].text || "";
      } else {
        const errText = await response.text();
        throw new Error(`Gemini API error: ${errText}`);
      }
    } catch (e) {
      console.error("Gemini API call failed:", e);
      throw e;
    }
  }

  throw new Error("No valid OpenAI or Google Gemini API key configured.");
}
