// Netlify serverless funkcia: /.netlify/functions/migrate-legacy
// JEDNORAZOVÁ, DOČASNÁ funkcia — prenesie staré dáta zo zdieľaného
// kľúča "books" (z verzie appky pred prihlasovaním) do nového,
// per-user kľúča "books-{userId}" prihláseného používateľa.
//
// POST /.netlify/functions/migrate-legacy
//   - vyžaduje platný Netlify Identity JWT (Authorization: Bearer ...)
//   - ak nový per-user kľúč už obsahuje knihy, migrácia sa NEVYKONÁ
//     (aby neprepísala niečo, čo si používateľ medzitým už pridal)
//   - ak starý zdieľaný kľúč neexistuje/je prázdny, vráti chybu
//
// Po úspešnom použití túto funkciu (a tlačidlo v appke, ktoré ju volá)
// pokojne odstráň — slúži len na jednorazový prechod zo starej verzie.

import { getStore } from '@netlify/blobs';
import { getUser } from '@netlify/identity';

const STORE_NAME = 'kniznica-katalog';
const LEGACY_KEY = 'books'; // pôvodný spoločný kľúč z verzie bez prihlásenia

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Nepodporovaná metóda.' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const user = await getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: 'Pre migráciu sa musíš prihlásiť.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const store = getStore(STORE_NAME);
  const newKey = 'books-' + user.id;

  try {
    const existing = await store.get(newKey, { type: 'json' });
    if (existing && Array.isArray(existing.books) && existing.books.length > 0) {
      return new Response(JSON.stringify({
        error: `Tvoj účet už má ${existing.books.length} kníh — migrácia by ich prepísala, preto sa nevykonala. Ak naozaj chceš nahradiť svoj súčasný katalóg starými dátami, najprv si súčasný katalóg vyexportuj a kontaktuj podporu/uprav si dáta ručne.`,
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const legacy = await store.get(LEGACY_KEY, { type: 'json' });
    if (!legacy || !Array.isArray(legacy.books) || legacy.books.length === 0) {
      return new Response(JSON.stringify({ error: 'Staré zdieľané dáta sa nenašli (možno už boli migrované, alebo nikdy neexistovali).' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    await store.setJSON(newKey, {
      books: legacy.books,
      publicEnabled: false,
      ownerLabel: user.email ? user.email.split('@')[0] : 'Knižnica',
      updatedAt: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ ok: true, bookCount: legacy.books.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    console.error('Chyba pri migrácii:', error);
    return new Response(JSON.stringify({ error: 'Migrácia zlyhala. Skús to znova alebo použi export/import.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

export const config = {
  path: '/.netlify/functions/migrate-legacy',
};
