export async function callGeminiAPI(system: string, user: string): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API key is missing. Please set VITE_GEMINI_API_KEY.");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: system }]
      },
      contents: [{
        parts: [{ text: user }]
      }]
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    console.error("Gemini API Error:", err);
    throw new Error(err.error?.message || `API request failed with status ${response.status}`);
  }

  const data = await response.json();
  
  if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts.length > 0) {
    return data.candidates[0].content.parts[0].text;
  }
  
  throw new Error("Failed to parse Gemini response.");
}
