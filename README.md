# Knižnica — cloud verzia (zdieľaný katalóg)

Táto verzia ukladá katalóg do **Netlify Blobs** — zdieľaného úložiska
dostupného z akéhokoľvek zariadenia (mobil, počítač, iný prehliadač),
nie len v localStorage jedného prehliadača.

## Dôležitý rozdiel oproti predošlej verzii

Predošlú verziu (bez priečinka `netlify/`) sa dalo nahodiť jednoducho
pretiahnutím priečinka na **app.netlify.com/drop**. Táto cloud verzia
to **nepôjde** rovnako — potrebuje serverless funkciu, ktorú Netlify
musí najprv zostaviť. Vyžaduje to git repozitár napojený na Netlify
(jednorazové nastavenie, potom je to už jednoduché).

## Postup nasadenia (jednorazové nastavenie)

### 1. Vytvor si GitHub účet (ak ešte nemáš)
Idi na [github.com](https://github.com) a zaregistruj sa zadarmo.

### 2. Vytvor nový repozitár
- Klikni "New repository", daj mu názov (napr. `moja-kniznica`).
- Nechaj ho **Public** alebo **Private** (oboje je v poriadku, Netlify
  vie pracovať s oboma zadarmo).
- Nepridávaj README/gitignore (už ich máme).

### 3. Nahraj tieto súbory do repozitára
Najjednoduchšie cez webové rozhranie GitHubu:
- Otvor svoj nový repozitár, klikni "uploading an existing file".
- Pretiahni **všetky súbory a priečinky** z tohto balíka (vrátane
  priečinka `netlify/` so všetkým vnútri) — zachovaj presnú štruktúru.
- Commit (potvrď nahranie).

### 4. Prepoj repozitár s Netlify
- Idi na [app.netlify.com](https://app.netlify.com), prihlás sa
  (môžeš použiť rovno svoj GitHub účet na prihlásenie).
- Klikni "Add new site" → "Import an existing project".
- Vyber "Deploy with GitHub", autorizuj prístup, vyber svoj repozitár
  `moja-kniznica`.
- Build settings nechaj predvyplnené (sú už v `netlify.toml`), klikni
  "Deploy".

### 5. Hotovo
Po minúte-dvoch bude stránka dostupná na vygenerovanej URL
(`https://nieco.netlify.app`). Funkcia `/.netlify/functions/catalog`
sa nasadí automaticky spolu so stránkou — žiadna ďalšia konfigurácia.

## Ako to potom aktualizovať

Keď v budúcnosti dostaneš nové súbory (opravy, vylepšenia):
1. V GitHub repozitári nahraď zmenené súbory (cez "Add file" →
   "Upload files", alebo úpravou priamo v GitHub editore).
2. Netlify **automaticky znova nasadí** stránku do minúty od commitu
   — žiadny manuálny drag & drop už nie je potrebný.

## Ako to funguje

- Katalóg sa primárne ukladá do **Netlify Blobs** (vidno ho cez
  funkciu `netlify/functions/catalog.mjs`) — zdieľané pre všetky
  zariadenia, ktoré otvoria tvoju stránku.
- `localStorage` v prehliadači slúži ako rýchla lokálna kópia/cache,
  pre prípad výpadku internetu a pre okamžité zobrazenie pri otvorení.
- Indikátor v pravom hornom rohu stránky ukazuje, či je aktuálne
  pripojenie k zdieľanému úložisku aktívne (☁️ zdieľané) alebo nie
  (⚠️ len lokálne — napr. pri výpadku siete).

## Upozornenie k súkromiu

Toto zdieľané úložisko **nemá prihlasovanie** — ktokoľvek, kto má URL
tvojej stránky, môže katalóg čítať aj upravovať. Pre osobné/rodinné
použitie je to v poriadku, ale neodporúča sa zdieľať túto URL verejne
(napr. na sociálnych sieťach).
