// Netlify serverless funkcia: /.netlify/functions/delete-account
// Úplne zmaže prihláseného používateľa — jeho Netlify Identity účet
// AJ jeho katalóg kníh v Netlify Blobs. Nezvratná akcia.
//
// POST /.netlify/functions/delete-account
//   - vyžaduje platný Netlify Identity JWT v hlavičke Authorization
//   - zmaže Blobs kľúč "books-{userId}"
//   - zmaže Identity účet cez admin API (admin.deleteUser)

import { getStore } from '@netlify/blobs';
import { getUser, admin } from '@netlify/identity';

const STORE_NAME = 'kniznica-katalog';

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
    return new Response(JSON.stringify({ error: 'Pre zmazanie účtu sa musíš prihlásiť.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    // Najprv zmažeme dáta (knihy) — ak by zlyhalo zmazanie Identity účtu,
    // radšej zostanú "osirelé" dáta bez prístupu (menej škodlivé) než
    // naopak zmazaný účet s dátami niekoho iného, kto by sa neskôr
    // zaregistroval s rovnakým user.id (čo sa v praxi nestáva, ale pre istotu).
    const store = getStore(STORE_NAME);
    await store.delete('books-' + user.id);

    await admin.deleteUser(user.id);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    console.error('Chyba pri mazaní účtu:', error);
    return new Response(JSON.stringify({ error: 'Zmazanie účtu zlyhalo. Skús to znova alebo kontaktuj podporu.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

export const config = {
  path: '/.netlify/functions/delete-account',
};
