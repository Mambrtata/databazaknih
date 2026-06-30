// Generovanie obalu: Gemini 2.5 Flash analyzuje knihu → prompt → Gemini 2.0 Flash generuje obrázok
// Všetko na serveri — obchádza CORS aj rate limit problém pri priamom volaní z prehliadača.

async function fetchWithRetry(url, options, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    const res = await fetch(url, options);
    if (res.status === 429 && i < retries) {
      await new Promise(r => setTimeout(r, 3000 * (i + 1)));
      continue;
    }
    return res;
  }
}

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  try {
    const { title, author, genre, year, description, apiKey } = await req.json();
    if (!title || !apiKey) {
      return new Response(JSON.stringify({ error: 'Missing title or apiKey' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    // Krok 1: Gemini Flash navrhne vizuálny prompt
    const contextPrompt = `You are an expert book cover art director. Write a detailed visual prompt for an AI image generator to create an authentic book cover.

Book: "${title}"
Author: ${author || 'unknown'}
Genre: ${genre || 'unknown'}
Year: ${year || 'unknown'}
Description: ${description ? description.slice(0, 300) : 'not available'}

Write ONLY the image prompt (2-3 sentences):
- Start with: "Book cover for '${title}' by ${author || 'unknown'},"
- Visual style matching the era and genre
- Key visual elements, mood, color palette
- End with: "Professional book cover illustration, no text, no letters, no title."

Respond with the prompt only.`;

    const analysisRes = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: contextPrompt }] }],
          generationConfig: { maxOutputTokens: 200, temperature: 0.7 }
        })
      }
    );

    if (!analysisRes.ok) {
      const err = await analysisRes.json().catch(() => ({}));
      return new Response(JSON.stringify({ error: err?.error?.message || `Analysis failed: ${analysisRes.status}` }), {
        status: analysisRes.status, headers: { 'Content-Type': 'application/json' }
      });
    }

    const analysisData = await analysisRes.json();
    const imagePrompt = analysisData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!imagePrompt) {
      return new Response(JSON.stringify({ error: 'No prompt generated' }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      });
    }

    // Krok 2: Gemini 2.0 Flash generuje obrázok
    const imageRes = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: imagePrompt }] }],
          generationConfig: { responseModalities: ['IMAGE', 'TEXT'] }
        })
      }
    );

    const imageData = await imageRes.json();
    // Pridáme použitý prompt do odpovede pre debug
    imageData._prompt = imagePrompt;
    return new Response(JSON.stringify(imageData), {
      status: imageRes.status,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const config = { path: '/.netlify/functions/imagen-proxy' };
