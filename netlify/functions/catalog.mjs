// Netlify serverless funkcia: /​.netlify/functions/catalog
// Slúži ako jednoduché REST API pre zdieľaný katalóg kníh, uložený
// v Netlify Blobs (zabudované úložisko, žiadny externý účet potrebný).
//
// GET  /.netlify/functions/catalog        -> vráti celý katalóg (JSON)
// PUT  /.netlify/functions/catalog        -> nahradí celý katalóg (telo: { books: [...] })
//
// Toto úložisko je VEREJNÉ pre kohokoľvek, kto má URL tejto stránky —
// nie je tu žiadne prihlasovanie. Hodí sa na osobné/rodinné použitie,
// nie na verejne zdieľanú stránku, kde by cudzí ľudia mohli dáta meniť.

import { getStore } from '@netlify/blobs';

const STORE_NAME = 'kniznica-katalog';
const KEY = 'books';

export default async (req) => {
  const store = getStore(STORE_NAME);

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method === 'GET') {
    try {
      const data = await store.get(KEY, { type: 'json' });
      return new Response(JSON.stringify(data || { books: [] }), {
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
      await store.setJSON(KEY, { books: body.books, updatedAt: new Date().toISOString() });
      return new Response(JSON.stringify({ ok: true, bookCount: body.books.length }), {
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
