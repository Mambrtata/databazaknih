# Kompletný balík — knižnica (lokalizácia + napojenie katalógu)

Toto je **celá appka** so všetkými súbormi — stačí nahrať naraz na GitHub
(nič sa neskladá po kúskoch). Obsahuje obe naše posledné úpravy:

1. **Lokalizácia SK/EN** — celé rozhranie sa prepne pri zmene jazyka
   (upravené: `app.js`, `i18n.js`, `settings.js`, `verejna.html`).
2. **Napojenie vlastného katalógu (Supabase)** — appka hľadá metadáta
   najprv v tvojom katalógu, potom Open Library / Google Books
   (upravené: `app.js`; nové: `netlify/functions/catalog-lookup.mjs`).

## Nasadenie

### 1. Nahraj všetky súbory na GitHub (repo `databazaknih`)
Zachovaj priečinkovú štruktúru — hlavne `netlify/functions/` musí ostať.
Najjednoduchšie: **Add file → Upload files**, pretiahni celý obsah.

### 2. Nastav kľúč v Netlify (POVINNÉ pre katalóg)
**Project configuration → Environment variables → Add a variable**, pridaj:

| Key | Value |
|-----|-------|
| `SUPABASE_URL` | `https://ovwozlwpkdxvhmrdcdib.supabase.co` |
| `SUPABASE_KEY` | *(anon / publishable kľúč zo Supabase → Settings → API)* |

Potom **Deploys → Trigger deploy → Deploy site**, nech funkcia kľúč načíta.

### 3. Otestuj
- Prepni jazyk (Nastavenia → Jazyk rozhrania → English) — má sa prepnúť
  celé rozhranie.
- Pridaj knihu z tvojho katalógu — obálka/popis sa má načítať z neho
  (v prehliadači F12 → Network uvidíš `catalog-lookup` → `found: true`).

## Poznámky
- Bez `SUPABASE_KEY` v Netlify katalóg nič nevráti a appka použije len
  Open Library / Google Books (nič sa nerozbije, len katalóg je "vypnutý").
- Ak je Supabase tabuľka `books` práve prázdna (napr. počas re-uploadu),
  katalóg zatiaľ nevráti výsledky — to je očakávané.
- Všetky JS súbory overené `node --check`.

## Zoznam súborov v balíku
19 súborov — celá appka:
`README.md, app.js, data.js, favicon.svg, i18n.js, index.html,
nastavenia.html, netlify.toml, package.json, settings.js,
spustit-server.bat, verejna.html` + `netlify/functions/`:
`catalog-lookup.mjs (NOVÉ), catalog.mjs, delete-account.mjs,
image-proxy.mjs, imagen-proxy.mjs, migrate-legacy.mjs, public-catalog.mjs`
