// Netlify serverless funkcia: /.netlify/functions/catalog-lookup
// Vyhľadá knihu vo vlastnom katalógu (Supabase) — najprv podľa ISBN,
// inak podľa názvu (+ voliteľne autora). Slúži ako PRVÝ zdroj metadát
// pre appku, pred Open Library / Google Books, keďže tento katalóg
// pokrýva slovenské/české knihy lepšie než verejné zahraničné API.
//
// GET /.netlify/functions/catalog-lookup?isbn=<isbn>
// GET /.netlify/functions/catalog-lookup?title=<nazov>&author=<autor>
//
// Supabase URL a kľúč sa čítajú z Netlify environment variables
// (SUPABASE_URL, SUPABASE_KEY) — kľúč sa tak NIKDY neobjaví v prehliadači.
// Tabuľka `books` má RLS policy "public read" (SELECT USING true), takže
// na čítanie stačí anon/publishable kľúč.
//
// Funkcia iba číta, nikdy nezapisuje.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Namapuje riadok z tabuľky `books` (Supabase) na tvar, ktorý appka
// očakáva z lookupBookByIsbn / fetchFromOpenLibrary (camelCase polia).
function rowToBook(row) {
  if (!row) return null;
  return {
    title: row.title || null,
    author: row.author || null,
    coverUrl: row.cover_url || null,
    description: row.description || null,
    publishYear: row.publish_year != null ? row.publish_year : null,
    pageCount: row.page_count != null ? row.page_count : null,
    language: row.language || null,
    isbn: row.isbn || null,
    genre: row.genre || null,
    source: 'catalog',
  };
}

export default async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Nepodporovaná metóda.' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return new Response(JSON.stringify({ error: 'Katalóg nie je nakonfigurovaný na serveri.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const url = new URL(req.url);
  const isbnRaw = (url.searchParams.get('isbn') || '').trim();
  const title = (url.searchParams.get('title') || '').trim();
  const author = (url.searchParams.get('author') || '').trim();

  // Spoločné hlavičky pre Supabase REST (PostgREST).
  const sbHeaders = {
    'apikey': SUPABASE_KEY,
    'Authorization': 'Bearer ' + SUPABASE_KEY,
    'Accept': 'application/json',
  };

  // Pomocná funkcia — vykoná GET na Supabase REST a vráti pole riadkov.
  async function sbSelect(query) {
    const endpoint = `${SUPABASE_URL}/rest/v1/books?${query}`;
    const res = await fetch(endpoint, { headers: sbHeaders });
    if (!res.ok) {
      throw new Error('Supabase ' + res.status);
    }
    return res.json();
  }

  // Pole stĺpcov, ktoré vraciame (nech neťaháme zbytočne celé riadky).
  const SELECT = 'select=isbn,title,author,description,cover_url,publish_year,page_count,language,genre';

  try {
    // ---- 1) Podľa ISBN — najpresnejšie (jednoznačná identifikácia vydania) ----
    if (isbnRaw) {
      // Normalizuj ISBN na číslice/X (v DB môžu byť uložené bez pomlčiek).
      const isbn = isbnRaw.replace(/[^0-9Xx]/g, '').toUpperCase();
      if (isbn) {
        const rows = await sbSelect(`${SELECT}&isbn=eq.${encodeURIComponent(isbn)}&limit=1`);
        const book = rowToBook(rows && rows[0]);
        if (book) {
          return new Response(JSON.stringify({ found: true, book }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          });
        }
      }
    }

    // ---- 2) Podľa názvu (+ autora) — fulltext-ish cez ILIKE ----
    if (title) {
      // ILIKE s * ako wildcard (PostgREST syntax). Escapneme čiarky a zátvorky,
      // ktoré majú v PostgREST filtroch špeciálny význam.
      const safe = (s) => s.replace(/[,()*]/g, ' ').trim();
      const tPattern = `*${safe(title)}*`;
      let query = `${SELECT}&title=ilike.${encodeURIComponent(tPattern)}&limit=5`;
      if (author) {
        const aPattern = `*${safe(author)}*`;
        query += `&author=ilike.${encodeURIComponent(aPattern)}`;
      }
      const rows = await sbSelect(query);

      if (rows && rows.length) {
        // Ak máme viac zhôd, uprednostni tú, ktorá má obálku a popis.
        rows.sort((a, b) => {
          const score = (r) => (r.cover_url ? 2 : 0) + (r.description ? 1 : 0);
          return score(b) - score(a);
        });
        const book = rowToBook(rows[0]);
        return new Response(JSON.stringify({ found: true, book }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
    }

    // Nič sa nenašlo — appka plynulo prejde na Open Library / Google Books.
    return new Response(JSON.stringify({ found: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    // Pri chybe vrátime found:false (nie 500), aby appka nezasekla dopĺňanie
    // a jednoducho použila ďalšie zdroje.
    return new Response(JSON.stringify({ found: false, error: String(error && error.message || error) }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

export const config = {
  path: '/.netlify/functions/catalog-lookup',
};
