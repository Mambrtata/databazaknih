# Knižnica — verzia s prihlásením (per-user katalógy)

Táto verzia má **prihlasovací systém** (Netlify Identity) — každý
používateľ má vlastný, oddelený katalóg uložený v **Netlify Blobs**.
Nikto iný nevidí ani neupravuje tvoju knižnicu, kým sa neprihlási
do svojho vlastného účtu.

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

### 5. Zapni Netlify Identity (NOVÝ, POVINNÝ krok pre túto verziu)
Bez tohto kroku appka zostane "uväznená" na prihlasovacej obrazovke —
Identity sa musí zapnúť priamo v Netlify dashboarde, nedá sa to
nastaviť len cez kód v repozitári.

- V Netlify, na svojom projekte, idi do **Project configuration**
  (alebo "Site configuration") → v ľavom menu nájdi **Identity**.
- Klikni **"Enable Identity"**.
- V sekcii **Registration** zvoľ:
  - **"Open"** — ktokoľvek sa môže zaregistrovať sám (vhodné, ak to
    má byť verejne dostupná služba).
  - **"Invite only"** — registrovať sa môžu len ľudia, ktorých
    pozveš ty (vhodné, ak chceš mať kontrolu nad tým, kto má prístup).
- Ulož nastavenia.

### 6. Hotovo
Po minúte-dvoch bude stránka dostupná na vygenerovanej URL
(`https://nieco.netlify.app`). Otvor ju, klikni "Prihlásiť sa /
Registrovať" a vytvor si svoj prvý účet.

## Ako to potom aktualizovať

Keď v budúcnosti dostaneš nové súbory (opravy, vylepšenia):
1. V GitHub repozitári nahraď zmenené súbory (cez "Add file" →
   "Upload files", alebo úpravou priamo v GitHub editore).
2. Netlify **automaticky znova nasadí** stránku do minúty od commitu
   — žiadny manuálny drag & drop už nie je potrebný.

**Dôležité pre šetrenie kreditov:** každé nasadenie (commit) spotrebuje
kredity z mesačného limitu (Free plán = 300 kreditov, 1 nasadenie =
15 kreditov). Ak robíš veľa malých úprav, nahromaď ich a nahraj všetky
naraz v jednom commite, namiesto jedného commitu na každú drobnosť.

## Ako to funguje

- **Prihlásenie:** Netlify Identity (zabudovaná služba, žiadny externý
  účet potrebný). Po prihlásení appka pošle JWT token s každou
  požiadavkou na server, ktorý overí, kto si, a vráti/uloží len
  *tvoj* katalóg.
- **Úložisko:** Netlify Blobs, ale teraz s kľúčom per-user (`books-{tvoje
  user ID}`) — tvoja knižnica je oddelená od knižníc ostatných
  používateľov.
- `localStorage` v prehliadači slúži ako rýchla lokálna kópia/cache,
  pre prípad výpadku internetu a pre okamžité zobrazenie pri otvorení.
- Indikátor v pravom hornom rohu stránky ukazuje, či je aktuálne
  pripojenie k zdieľanému úložisku aktívne (☁️ zdieľané) alebo nie
  (⚠️ len lokálne — napr. pri výpadku siete).

## Lokálny vývoj/testovanie bez Netlify

Keď otvoríš stránku mimo Netlify (napr. cez `spustit-server.bat` na
lokálnom počítači), Netlify Identity nie je dostupná. Po cca 5 sekundách
čakania appka **automaticky prejde do testovacieho režimu bez
prihlásenia** — uvidíš o tom hlášku na prihlasovacej obrazovke a potom
sa zobrazí katalóg bežným spôsobom (bez cloud synchronizácie, len
lokálne). Toto je v poriadku pre testovanie vzhľadu/funkcií, ale
zmeny sa neuložia do zdieľaného cloud úložiska.

## Nové v tejto verzii

- **Jazyk knižnice** — v ľavom paneli si zvolíš default jazyk (slovenčina,
  čeština, angličtina a ďalšie). Nové popisy kníh, ktoré appka dotiahne
  z Open Library/Google Books, sa **automaticky preložia** do tohto
  jazyka (vyžaduje Gemini API kľúč). Manuálne tlačidlo "Preložiť popis"
  v detaile knihy zostáva ako záloha pre prípady, keď automatický
  preklad zlyhá alebo prebehol pred zmenou jazyka.
- **Živý sken ISBN** — tlačidlo "📷 Sken ISBN" teraz otvára kameru
  naživo a automaticky rozpozná čiarový kód, bez nutnosti fotiť a
  nahrávať súbor. Funguje na Chrome/Edge (Android aj desktop s
  webkamerou). **Na Safari/iPhone táto funkcia v prehliadači neexistuje**
  — appka to rozpozná sama a automaticky ponúkne fallback na klasické
  vyfotenie/nahratie súboru, žiadna ďalšia akcia nie je potrebná.
- **Verejný náhľad knižnice** — v ľavom paneli ("Zdieľanie knižnice")
  zapneš prepínač a dostaneš odkaz (`verejna.html?id=...`), ktorý môžeš
  poslať komukoľvek. Vidia tvoju knižnicu (obaly, popisy), nemôžu ju
  upravovať, nepotrebujú sa prihlasovať. Vypnutím prepínača sa odkaz
  okamžite prestane zobrazovať dáta.
- **Prehľadnejší detail knihy** — namiesto 8 tlačidiel v rade sú teraz
  3 hlavné akcie (Upraviť / Hľadať znova / Nahrať obal) + tlačidlo
  "⋯ Viac" s menej častými možnosťami (Sken ISBN, Hľadať cez Gemini,
  Preložiť popis).
- **Klikateľné karty kníh** — klik kdekoľvek na kartu otvára detail,
  malé tlačidlo "✕" na odstránenie sa zobrazí len pri prejdení myšou
  ponad obal.

## Obmedzenia, ktoré treba poznať

Živý sken čiarového kódu (`BarcodeDetector` API) je relatívne nová
prehliadačová funkcia. Funguje spoľahlivo na Chrome/Edge. Safari (a teda
všetky prehliadače na iPhone/iPade, keďže Apple núti používať Safari
engine) ju nepodporuje vôbec — to nie je chyba tejto appky, ale
obmedzenie Apple platformy. Appka to elegantne rieši automatickým
fallbackom, ale na iPhone bude sken stále vyžadovať odfotenie/výber
súboru, nie naozaj živé namierenie kamerou.
