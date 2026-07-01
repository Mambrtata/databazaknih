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

// Odstráni diakritiku, interpunkciu a viacnásobné medzery; malé písmená.
// Vďaka tomu „Dcéra bažín!" aj „Dcera bazin" vyjdú rovnako: „dcera bazin".
function normalize(s) {
  return (s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // preč diakritika
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')                      // preč interpunkcia
    .replace(/\s+/g, ' ')
    .trim();
}

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
  const mode = (url.searchParams.get('mode') || 'auto').trim(); // 'auto' = 1 kniha, 'list' = zoznam kandidátov

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
    // Zbierka kandidátov pre list-režim (Match metadata). V auto-režime
    // ostáva pôvodné správanie (vráti jednu najlepšiu knihu).
    const listCandidates = [];
    const pushCand = (row) => {
      if (!row) return;
      const key = (row.isbn || '') + '|' + normalize(row.title) + '|' + normalize(row.author);
      if (!listCandidates.some(c => c._key === key)) {
        const b = rowToBook(row);
        b._key = key;
        listCandidates.push(b);
      }
    };

    if (isbnRaw) {
      // Normalizuj ISBN na číslice/X (v DB môžu byť uložené bez pomlčiek).
      const isbn = isbnRaw.replace(/[^0-9Xx]/g, '').toUpperCase();
      if (isbn) {
        const rows = await sbSelect(`${SELECT}&isbn=eq.${encodeURIComponent(isbn)}&limit=1`);
        const book = rowToBook(rows && rows[0]);
        if (book) {
          if (mode === 'list') {
            pushCand(rows[0]);
          } else {
            return new Response(JSON.stringify({ found: true, book }), {
              status: 200,
              headers: { 'Content-Type': 'application/json', ...corsHeaders },
            });
          }
        }
      }
    }

    // ---- 2) Podľa názvu (+ autora) — odolné voči diakritike a interpunkcii ----
    if (title) {
      // Namiesto hľadania celého názvu naraz (čo padne na diakritike/interpunkcii)
      // hľadáme podľa jednotlivých "slov" názvu cez ILIKE. Aj keď DB má „bažín"
      // a fotka „bazin", spoločné čitateľné slová (napr. „dcera") sa prekryjú
      // dostatočne na predbežný výber; presné poradie rieši normalizované
      // porovnanie nižšie.
      const titleWords = normalize(title).split(' ').filter(w => w.length >= 3);
      // ILIKE hľadá len znaky, ktoré v DB naozaj sú — použijeme "jadro" slova
      // bez koncovej diakritiky tak, že hľadáme len jeho začiatok (prefix),
      // čím obídeme rozdiel typu „bazin" vs „bažín".
      const patterns = (titleWords.length ? titleWords : [normalize(title)])
        .slice(0, 4) // max 4 slová, nech query nie je obrovská
        .map(w => `title.ilike.*${encodeURIComponent(w.slice(0, Math.max(3, w.length - 1)))}*`);

      // PostgREST OR: vráti knihy, ktoré obsahujú ktorékoľvek z hľadaných slov.
      let query = `${SELECT}&or=(${patterns.join(',')})&limit=40`;
      let rows = await sbSelect(query);

      // Ak autor zadaný, ešte pridaj samostatné hľadanie podľa priezviska
      // (posledné slovo), aby sme nezmeškali zhodu, keď názov sedí slabšie.
      if (author && (!rows || rows.length < 3)) {
        const authorWords = normalize(author).split(' ').filter(w => w.length >= 3);
        const lastName = authorWords[authorWords.length - 1];
        if (lastName) {
          const aq = `${SELECT}&author=ilike.*${encodeURIComponent(lastName.slice(0, Math.max(3, lastName.length - 1)))}*&limit=40`;
          const aRows = await sbSelect(aq);
          const seen = new Set((rows || []).map(r => r.isbn + '|' + r.title));
          for (const r of (aRows || [])) {
            const k = r.isbn + '|' + r.title;
            if (!seen.has(k)) { (rows = rows || []).push(r); seen.add(k); }
          }
        }
      }

      if (rows && rows.length) {
        const nTitle = normalize(title);
        const nAuthor = normalize(author);
        // Do porovnania berieme len významové slová (dĺžka >= 3) — spojky ako
        // „a", „na", „z" sa ignorujú, aby „všetky slová sadli" znamenalo všetky
        // podstatné slová názvu. Ak by po filtri neostalo nič (napr. názov je
        // samé krátke slová), použijeme všetky slová ako zálohu.
        const sigWords = nTitle.split(' ').filter(w => w.length >= 3);
        const titleTokens = new Set(sigWords.length ? sigWords : nTitle.split(' ').filter(Boolean));

        // Ohodnotí každý kandidát. Cieľ: presná zhoda názvu + sediaci autor
        // vyhrá jednoznačne; knihy, ktoré len náhodou zdieľajú jedno slovo
        // (napr. „noc"), majú byť nízko a pod prahom.
        const scored = rows.map(r => {
          const rt = normalize(r.title);
          const ra = normalize(r.author);
          const rTokens = new Set(rt.split(' ').filter(Boolean));
          let overlap = 0;
          for (const w of titleTokens) if (rTokens.has(w)) overlap++;
          const titleScore = titleTokens.size ? overlap / titleTokens.size : 0; // 0..1
          const exactTitle = rt === nTitle ? 1 : 0;

          // Autor: 1 = priezvisko sedí, -1 = autor bol zadaný ale nesedí vôbec,
          // 0 = autor nezadaný (nevieme posúdiť). Nesediaci autor je silný
          // signál, že ide o inú knihu s podobným názvom.
          let authorScore = 0;
          if (nAuthor) {
            const aTok = nAuthor.split(' ').filter(w => w.length >= 3);
            const hit = aTok.some(w => ra.includes(w) || w.includes(ra.split(' ').pop() || '\0'));
            authorScore = hit ? 1 : -1;
          }

          // Obálka je najdôležitejšia — pri viacerých vydaniach tej istej knihy
          // (rovnaký názov + autor) má vyhrať to, ktoré má obálku. Preto je
          // bonus za obálku dosť veľký, aby rozhodol medzi inak rovnakými zhodami.
          const richness = (r.cover_url ? 1.0 : 0) + (r.description ? 0.25 : 0);
          const total = exactTitle * 2 + titleScore + authorScore * 1.2 + richness;
          return { r, total, titleScore, exactTitle, authorScore };
        });

        scored.sort((a, b) => b.total - a.total);
        const best = scored[0];

        // Prah zhody. Kľúčové: pri viacslovnom názve musí kniha obsahovať
        // VÄČŠINU slov, nie len jedno. „Svadobná noc" (2 slová) → treba obe;
        // kniha len so „svadobná" alebo len s „noc" neprejde.
        // Konkrétne požadujeme: presný názov, ALEBO (všetky slová názvu sadnú),
        // ALEBO (aspoň 75 % slov sadne a autor sedí). Autor nesmie protirečiť.
        const nTitleWords = titleTokens.size;
        const strongMatch = best && best.authorScore >= 0 && (
          best.exactTitle === 1 ||
          best.titleScore >= 0.999 ||                       // všetky slová názvu
          (nTitleWords >= 4 && best.titleScore >= 0.75 && best.authorScore > 0)
        );

        // Aj pri dobrej zhode: ak víťaz nemá ani obálku ani popis, katalóg
        // appke reálne nič neprinesie — nech radšej doplní Open Library /
        // Google Books. (Napr. „SVADOBNÁ NOC" bez obálky aj popisu.)
        const hasContent = best && (best.r.cover_url || best.r.description);

        if (mode === 'list') {
          // Do zoznamu dáme rozumných kandidátov: aspoň nejaká zhoda slov názvu
          // (>= 40 %) alebo sediaci autor. Zoradené podľa skóre, max 8.
          scored
            .filter(s => s.titleScore >= 0.4 || s.authorScore > 0)
            .slice(0, 8)
            .forEach(s => pushCand(s.r));
        } else if (strongMatch) {
          // Vrátime katalógovú knihu aj keď nemá obálku — má správny názov,
          // autora a prípadne rok/popis, čo sú platné dáta. Chýbajúcu obálku
          // appka následne doplní z Open Library / Google Books (fetchBookDetails
          // pokračuje na ďalšie zdroje, keď coverUrl chýba).
          const book = rowToBook(best.r);
          return new Response(JSON.stringify({ found: true, book }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          });
        }
      }
    }

    // list-režim: vráť zozbieraných kandidátov (môže byť aj prázdny).
    if (mode === 'list') {
      const candidates = listCandidates.map(({ _key, ...rest }) => ({ ...rest, source: 'Katalóg' }));
      return new Response(JSON.stringify({ candidates }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
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
