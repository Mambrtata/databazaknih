// Netlify serverless funkcia: /.netlify/functions/public-catalog
// READ-ONLY verejný náhľad knižnice — žiadne prihlásenie nepotrebné.
// Funguje len ak majiteľ knižnice explicitne zapol "Verejný náhľad"
// v nastaveniach (publicEnabled: true), inak vracia 404.
//
// GET /.netlify/functions/public-catalog?id=<userId> -> verejné dáta knižnice
//
// Táto funkcia nikdy nezapisuje dáta — slúži výhradne na zobrazenie,
// nie na úpravu. Nevyžaduje JWT, keďže má byť dostupná komukoľvek,
// komu majiteľ pošle odkaz.

import { getStore } from '@netlify/blobs';

const STORE_NAME = 'kniznica-katalog';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

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

  const url = new URL(req.url);
  const userId = url.searchParams.get('id');
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Chýba parameter "id".' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    const store = getStore(STORE_NAME);
    const data = await store.get('books-' + userId, { type: 'json' });

    if (!data || !data.publicEnabled) {
      // Zámerne rovnaká chyba pre "neexistuje" aj "nie je verejné" — nech sa
      // nedá zvonku zistiť, či daný userId vôbec existuje v systéme.
      return new Response(JSON.stringify({ error: 'Táto knižnica nie je verejne dostupná.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Vrátime len to, čo je pre verejné zobrazenie potrebné — žiadne
    // citlivé/interné polia (napr. sourcesTried), len to, čo appka
    // reálne zobrazuje v karte/detaile knihy.
    const publicBooks = (data.books || []).map(b => ({
      id: b.id,
      title: b.title,
      author: b.author,
      genre: b.genre,
      originalTitle: b.originalTitle,
      isbn: b.isbn,
      coverUrl: b.coverUrl,
      description: b.description,
    }));

    return new Response(JSON.stringify({
      books: publicBooks,
      ownerLabel: data.ownerLabel || 'Knižnica',
      updatedAt: data.updatedAt || null,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Nepodarilo sa načítať knižnicu.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

export const config = {
  path: '/.netlify/functions/public-catalog',
};
