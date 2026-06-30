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

    const imagePrompt = `Book cover for "${title}" by ${author || 'unknown'}. Genre: ${genre || 'fiction'}. Year: ${year || 'unknown'}. ${description ? description.slice(0, 200) : ''} Create an authentic, period-appropriate book cover illustration. Rich colors, professional composition, artistic style matching the era and genre. No text, no letters, no title on the image.`;

    // Nano Banana 2 (gemini-3.1-flash-image) — aktuálny stable model pre generovanie obrázkov
    // Fallback: gemini-3-pro-image
    const models = ['gemini-3.1-flash-image', 'gemini-3-pro-image'];

    let lastErr = null;
    for (const model of models) {
      const res = await fetchWithRetry(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: imagePrompt }] }],
            generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }
          })
        }
      );

      const data = await res.json();

      if (res.status === 404 || res.status === 400) {
        lastErr = data?.error?.message || `HTTP ${res.status} model=${model}`;
        continue;
      }

      data._prompt = imagePrompt;
      data._model = model;
      return new Response(JSON.stringify(data), {
        status: res.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: lastErr || 'All models failed' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const config = { path: '/.netlify/functions/imagen-proxy' };
