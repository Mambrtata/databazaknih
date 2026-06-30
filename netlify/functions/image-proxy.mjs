export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  try {
    const { url } = await req.json();
    if (!url || !/^https?:\/\//.test(url)) {
      return new Response(JSON.stringify({ error: 'Neplatná URL' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    const origin = new URL(url).origin;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': origin + '/',
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'sk-SK,sk;q=0.9,cs;q=0.8,en;q=0.7',
      },
      redirect: 'follow'
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ error: `Server vrátil ${res.status}` }), {
        status: res.status, headers: { 'Content-Type': 'application/json' }
      });
    }

    const contentType = res.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) {
      return new Response(JSON.stringify({ error: 'URL neodkazuje na obrázok' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const dataUrl = `data:${contentType.split(';')[0]};base64,${base64}`;

    return new Response(JSON.stringify({ dataUrl }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const config = { path: '/.netlify/functions/image-proxy' };
