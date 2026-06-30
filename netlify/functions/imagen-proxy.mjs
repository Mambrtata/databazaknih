// Proxy pre Imagen API — volanie priamo z prehliadača zlyháva kvôli CORS,
// Netlify function to volá na serveri kde CORS neplatí.
export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { prompt, apiKey } = await req.json();
    if (!prompt || !apiKey) {
      return new Response(JSON.stringify({ error: 'Missing prompt or apiKey' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: { sampleCount: 2, aspectRatio: '2:3' }
        })
      }
    );

    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const config = { path: '/.netlify/functions/imagen-proxy' };
