// Netlify serverless funkcia: /.netlify/functions/catalog
// REST API pre katalóg kníh, uložený v Netlify Blobs — KAŽDÝ PRIHLÁSENÝ
// POUŽÍVATEĽ MÁ VLASTNÝ, ODDELENÝ KATALÓG (kľúč v úložisku je odvodený
// od jeho Identity user.id, nie jeden spoločný kľúč pre všetkých).
//
// GET  /.netlify/functions/catalog  -> vráti katalóg prihláseného používateľa
// PUT  /.netlify/functions/catalog  -> nahradí katalóg prihláseného používateľa
//                                       (telo: { books: [...], publicEnabled: bool })
//
// Vyžaduje platný Netlify Identity JWT v hlavičke Authorization: Bearer <token>.
// Bez neho vracia 401 — dáta nie sú prístupné anonymne.
//
// Pre READ-ONLY verejný náhľad knižnice (keď ju vlastník chce niekomu ukázať
// bez prihlásenia) slúži samostatná funkcia public-catalog.mjs — táto funkcia
// tu nikdy nevracia dáta bez platného prihlásenia.

import { getStore } from '@netlify/blobs';
import { getUser } from '@netlify/identity';

const STORE_NAME = 'kniznica-katalog';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const user = await getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: 'Pre prístup ku katalógu sa musíš prihlásiť.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  // Kľúč v Netlify Blobs je viazaný na konkrétneho používateľa — každý vidí
  // a upravuje len svoj vlastný katalóg, nikdy katalóg niekoho iného.
  const key = 'books-' + user.id;
  const store = getStore(STORE_NAME);

  if (req.method === 'GET') {
    try {
      const data = await store.get(key, { type: 'json' });
      return new Response(JSON.stringify(data || { books: [], publicEnabled: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Nepodarilo sa načítať katalóg.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
  }

  if (req.method === 'PUT') {
    try {
      const body = await req.json();
      if (!body || !Array.isArray(body.books)) {
        return new Response(JSON.stringify({ error: 'Telo požiadavky musí obsahovať pole "books".' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
      // publicEnabled je nepovinné — ak chýba, zachováme predošlú hodnotu
      // (aby PUT volania, ktoré ho nepošlú, omylom nevypli verejný režim).
      let publicEnabled = body.publicEnabled;
      if (typeof publicEnabled !== 'boolean') {
        const existing = await store.get(key, { type: 'json' });
        publicEnabled = existing?.publicEnabled || false;
      }
      await store.setJSON(key, {
        books: body.books,
        publicEnabled,
        ownerLabel: user.email ? user.email.split('@')[0] : 'Knižnica',
        updatedAt: new Date().toISOString(),
      });
      return new Response(JSON.stringify({ ok: true, bookCount: body.books.length, publicEnabled }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Nepodarilo sa uložiť katalóg.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Nepodporovaná metóda.' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
};

export const config = {
  path: '/.netlify/functions/catalog',
};
