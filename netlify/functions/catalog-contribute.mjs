// Netlify serverless funkcia: /.netlify/functions/catalog-contribute
// Zapíše AI-generovaný SK popis knihy do zdieľaného katalógu (Supabase),
// ale LEN ak tam popis ešte chýba. Katalóg sa tak obohacuje používaním —
// prvý vygenerovaný popis pomôže všetkým ďalším používateľom.
//
// POST /.netlify/functions/catalog-contribute
//   body: { isbn?, title, author?, description }
//
// BEZPEČNOSŤ:
// - Zápis vyžaduje SUPABASE_SERVICE_KEY (service-role) — drží sa LEN na
//   serveri (Netlify env), NIKDY v prehliadači. Ak nie je nastavený,
//   funkcia ticho neurobí nič (nenahráva).
// - Zapisuje LEN keď description v DB chýba (IS NULL / prázdny) — nikdy
//   neprepíše existujúci (najmä overený) popis.
// - Označí description_source = 'ai', nech sa AI popisy dajú odlíšiť.
// - Základná validácia vstupu (dĺžka, nie chybová hláška).

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function normIsbn(s) {
  return (s || '').replace(/[^0-9Xx]/g, '').toUpperCase();
}

// Základná validácia popisu — chráni databázu pred nezmyslom/spamom/chybami.
function looksValid(desc) {
  if (!desc || typeof desc !== 'string') return false;
  const d = desc.trim();
  if (d.length < 30) return false;            // príliš krátke
  if (d.length > 4000) return false;          // podozrivo dlhé
  // odmietni typické chybové/prázdne odpovede
  const bad = ['nenašiel', 'nepodarilo', 'error', 'chyba', 'null', 'undefined'];
  const low = d.toLowerCase();
  if (bad.some(b => low === b || low.startsWith(b + ' '))) return false;
  return true;
}

export default async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'Len POST.' }), {
      status: 405, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  // Zápis potrebuje service-role kľúč (anon má len read). Ak chýba, ticho nič.
  const WRITE_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SUPABASE_URL || !WRITE_KEY) {
    // Nenahráva sa — ale nevraciame chybu, aby to appku nerušilo.
    return new Response(JSON.stringify({ ok: false, skipped: 'not-configured' }), {
      status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  let body;
  try { body = await req.json(); } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: 'Zlý JSON.' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const isbn = normIsbn(body.isbn);
  const title = (body.title || '').trim();
  const author = (body.author || '').trim();
  const description = (body.description || '').trim();

  if (!title || !looksValid(description)) {
    return new Response(JSON.stringify({ ok: false, skipped: 'invalid' }), {
      status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const sbHeaders = {
    'apikey': WRITE_KEY,
    'Authorization': 'Bearer ' + WRITE_KEY,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  // Nájdeme cieľový riadok: podľa ISBN (ak je), inak podľa presného názvu+autora.
  // Zapíšeme LEN ak tam popis chýba (description IS NULL alebo prázdny).
  async function findRow() {
    const sel = 'select=isbn,title,author,description';
    let q;
    if (isbn) {
      q = `${SUPABASE_URL}/rest/v1/books?${sel}&isbn=eq.${encodeURIComponent(isbn)}&limit=1`;
    } else {
      // ilike bez wildcards = case-insensitive presná zhoda; autor voliteľne
      q = `${SUPABASE_URL}/rest/v1/books?${sel}&title=ilike.${encodeURIComponent(title)}&limit=5`;
    }
    const res = await fetch(q, { headers: sbHeaders });
    if (!res.ok) return null;
    const rows = await res.json();
    if (!rows || !rows.length) return null;
    if (isbn) return rows[0];
    // bez ISBN: dofiltruj podľa autora ak zadaný
    const norm = s => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    return rows.find(r => !author || norm(r.author) === norm(author)) || rows[0];
  }

  try {
    const row = await findRow();
    if (!row) {
      return new Response(JSON.stringify({ ok: false, skipped: 'not-in-catalog' }), {
        status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    // Popis už existuje → NEPREPISUJEME (R8 pravidlo, dvojvrstvový model).
    if (row.description && row.description.trim()) {
      return new Response(JSON.stringify({ ok: false, skipped: 'already-has-description' }), {
        status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Zapíšeme popis + označíme ako 'ai'. PATCH podľa ISBN alebo title+author.
    let patchUrl;
    if (row.isbn) {
      patchUrl = `${SUPABASE_URL}/rest/v1/books?isbn=eq.${encodeURIComponent(row.isbn)}`;
    } else {
      patchUrl = `${SUPABASE_URL}/rest/v1/books?title=eq.${encodeURIComponent(row.title)}` +
                 `&author=eq.${encodeURIComponent(row.author || '')}`;
    }
    const patch = await fetch(patchUrl, {
      method: 'PATCH',
      headers: { ...sbHeaders, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ description, description_source: 'ai' }),
    });
    if (!patch.ok) {
      return new Response(JSON.stringify({ ok: false, error: 'patch ' + patch.status }), {
        status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    return new Response(JSON.stringify({ ok: true, contributed: true }), {
      status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e && e.message || e) }), {
      status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

export const config = {
  path: '/.netlify/functions/catalog-contribute',
};
