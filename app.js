// ============================================================
// Domáca knižnica — katalóg (čisto klientská verzia)
// Dáta sa ukladajú do localStorage prehliadača.
// ============================================================

const GENRES = [
  "Svetová klasika",
  "Slovenská a česká literatúra",
  "Spoločenské a psychologické romány",
  "Historické a dobrodružné romány",
  "Krimi, thrillery a špionážne romány",
  "Vojnové romány",
  "Humor a satira",
  "Sci-fi a fantasy",
  "Povesti a legendy",
  "Nezaradená beletria",
  "Poézia",
  "Životopisy a Dejiny",
  "Umenie, Dizajn a Architektúra",
  "Veda, Príroda a Cestopisy",
  "Spoločnosť, Psychológia a Ostatné",
  "Slovníky a Učebnice",
  "Publikácie, Sprievodcovia a Kolektívne diela",
  "Neznámy / Nečitateľný autor",
  "Naskenované z fotky"
];

const STORAGE_KEY = "domaca_kniznica_books_v1";
const API_KEY_STORAGE = "domaca_kniznica_gemini_key";
const BOOKS_API_KEY_STORAGE = "domaca_kniznica_books_api_key";

// Paleta "knižných chrbtov" pre placeholder, keď sa obal nenájde — cyklicky podľa žánru
const SPINE_PALETTE = [
  { bg: '#E3EEEC', fg: '#143E37' }, // jemná zelenkavá (accent-soft)
  { bg: '#F0EDE6', fg: '#55534D' }, // teplá béžová
  { bg: '#EAEDF0', fg: '#3A4550' }, // chladná sivomodrá
  { bg: '#F3E9E6', fg: '#7A4A3D' }, // jemná terakotová
  { bg: '#EDEFE6', fg: '#4F5C3D' }, // jemná olivová
  { bg: '#F0EAF0', fg: '#5C4A5C' }, // jemná slivková
  { bg: '#E8EDED', fg: '#3D5454' }, // jemná petrolejová
  { bg: '#F2EDE3', fg: '#6B5A3D' }  // jemná pieskovo-okrová
];

function spineColorForGenre(genre) {
  const idx = GENRES.indexOf(genre);
  const i = idx >= 0 ? idx : (genre || '').length;
  return SPINE_PALETTE[i % SPINE_PALETTE.length];
}

// Sýtejšie verzie tých istých farebných rodín — len pre malé swatch body v sidebar,
// kde by tlmené "fg" farby z SPINE_PALETTE boli na 7px bodoch takmer nerozoznateľné.
const SWATCH_PALETTE = ['#2F7A6C', '#A6855E', '#5C7A99', '#C17A5E', '#7A8F5E', '#8F6B8F', '#4F7A7A', '#A6904F'];

function swatchColorForGenre(genre) {
  const idx = GENRES.indexOf(genre);
  const i = idx >= 0 ? idx : (genre || '').length;
  return SWATCH_PALETTE[i % SWATCH_PALETTE.length];
}

// --- DOM elementy ---
const imageUpload = document.getElementById('imageUpload'),
  fileNameDisplay = document.getElementById('fileName'),
  addBookForm = document.getElementById('addBookForm'),
  bookTitleInput = document.getElementById('bookTitle'),
  bookAuthorInput = document.getElementById('bookAuthor'),
  bookOriginalTitleInput = document.getElementById('bookOriginalTitle'),
  bookGenreInput = document.getElementById('bookGenre'),
  bookList = document.getElementById('bookList'),
  loader = document.getElementById('loader'),
  statusMessage = document.getElementById('statusMessage'),
  errorMessage = document.getElementById('errorMessage'),
  emptyState = document.getElementById('emptyState'),
  searchInput = document.getElementById('searchInput'),
  bookCount = document.getElementById('bookCount'),
  ledgerCount = document.getElementById('ledgerCount'),
  syncStatusEl = document.getElementById('syncStatus'),
  genreListContainer = document.getElementById('genreList'),
  bookModal = document.getElementById('bookModal'),
  modalCover = document.getElementById('modalCover'),
  modalTitle = document.getElementById('modalTitle'),
  modalOriginalTitle = document.getElementById('modalOriginalTitle'),
  modalAuthor = document.getElementById('modalAuthor'),
  modalGenre = document.getElementById('modalGenre'),
  modalDescription = document.getElementById('modalDescription'),
  modalLoader = document.getElementById('modalLoader'),
  closeModal = document.getElementById('closeModal'),
  apiKeyInput = document.getElementById('apiKeyInput'),
  apiKeyStatus = document.getElementById('apiKeyStatus'),
  booksApiKeyInput = document.getElementById('booksApiKeyInput'),
  booksApiKeyStatus = document.getElementById('booksApiKeyStatus'),
  retryDetailsBtn = document.getElementById('retryDetailsBtn'),
  fetchMissingBtn = document.getElementById('fetchMissingBtn'),
  stopFetchBtn = document.getElementById('stopFetchBtn'),
  sourceOpenLibraryCheckbox = document.getElementById('sourceOpenLibrary'),
  sourceGoogleBooksCheckbox = document.getElementById('sourceGoogleBooks'),
  sourceWikidataCheckbox = document.getElementById('sourceWikidata'),
  missingCoversInfo = document.getElementById('missingCoversInfo'),
  customCoverUpload = document.getElementById('customCoverUpload'),
  modalCoverBtn = document.getElementById('modalCoverBtn'),
  modalTranslateBtn = document.getElementById('modalTranslateBtn'),
  modalViewMode = document.getElementById('modalViewMode'),
  modalEditMode = document.getElementById('modalEditMode'),
  modalEditBtn = document.getElementById('modalEditBtn'),
  modalSaveBtn = document.getElementById('modalSaveBtn'),
  modalCancelEditBtn = document.getElementById('modalCancelEditBtn'),
  modalRescanBtn = document.getElementById('modalRescanBtn'),
  modalGeminiSearchBtn = document.getElementById('modalGeminiSearchBtn'),
  modalScanIsbnBtn = document.getElementById('modalScanIsbnBtn'),
  modalIsbn = document.getElementById('modalIsbn'),
  isbnScanUpload = document.getElementById('isbnScanUpload'),
  editTitleInput = document.getElementById('editTitle'),
  editOriginalTitleInput = document.getElementById('editOriginalTitle'),
  editAuthorInput = document.getElementById('editAuthor'),
  editIsbnInput = document.getElementById('editIsbn'),
  editGenreInput = document.getElementById('editGenre'),
  exportBtn = document.getElementById('exportBtn'),
  importBtn = document.getElementById('importBtn'),
  importFileInput = document.getElementById('importFileInput'),
  importStatus = document.getElementById('importStatus');

let allBooks = [];
let selectedGenre = 'Všetky';
let detailsFetchInitiated = false;
let currentModalBookId = null;
let fetchInProgress = false; // true len počas aktívneho behu fetchAllMissingDetails
let fetchShouldStop = false; // nastaví sa na true po kliknutí na "Zastaviť"

// Vráti, ktoré zdroje sú aktuálne zaškrtnuté v paneli "Doplniť obaly a popisy".
// Google Books je predvolene vypnutý — dlhodobo vyčerpaná denná kvóta ho robí
// v praxi nepoužiteľným pre hromadné dopĺňanie, kým si ho používateľ sám nezapne.
function getEnabledSources() {
  return {
    openLibrary: sourceOpenLibraryCheckbox ? sourceOpenLibraryCheckbox.checked : true,
    googleBooks: sourceGoogleBooksCheckbox ? sourceGoogleBooksCheckbox.checked : false,
    wikidata: sourceWikidataCheckbox ? sourceWikidataCheckbox.checked : true
  };
}

// ============================================================
// Persistencia (localStorage)
// ============================================================

// ============================================================
// Zdieľané cloud úložisko (Netlify Blobs cez serverless funkciu).
// localStorage slúži ako rýchla lokálna cache pre okamžité zobrazenie
// a ako záloha pre prípad výpadku siete — vždy sa ale snažíme
// synchronizovať so zdieľaným cloud úložiskom, aby všetky zariadenia
// (mobil, počítač...) videli ten istý katalóg.
// ============================================================

const CATALOG_API_URL = '/.netlify/functions/catalog';
let cloudSyncAvailable = true; // ak cloud volanie raz zlyhá (napr. lokálny file:// vývoj), prestaneme skúšať
let saveDebounceTimer = null;

function updateSyncStatusUI() {
  if (!syncStatusEl) return;
  if (cloudSyncAvailable) {
    syncStatusEl.textContent = '☁️ zdieľané';
    syncStatusEl.style.color = 'var(--accent)';
  } else {
    syncStatusEl.textContent = '⚠️ len lokálne';
    syncStatusEl.style.color = 'var(--ink-soft)';
  }
}

// Rýchle synchrónne načítanie len z localStorage (alebo prvotné dáta z data.js),
// bez čakania na sieť — používa sa pri starte, aby bolo UI hneď použiteľné.
function loadLocalBooksOnly() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      allBooks = JSON.parse(raw);
      backfillOriginalTitles();
    } else {
      allBooks = INITIAL_BOOKS.map((b, i) => ({
        id: 'init_' + i + '_' + Date.now(),
        title: (b.title || '').trim(),
        author: (b.author || '').trim(),
        genre: (b.genre || 'Nezaradené').trim(),
        originalTitle: (b.originalTitle || '').trim(),
        coverUrl: null,
        description: null,
        createdAt: Date.now() - (INITIAL_BOOKS.length - i)
      }));
    }
  } catch (e) {
    console.error('Chyba pri načítaní z localStorage:', e);
    allBooks = [];
  }
}

async function loadBooks() {
  // Potom sa skúsime zosynchronizovať s cloudom — ak tam je novší/iný katalóg
  // (napr. pridaný z mobilu), nahradíme ním lokálnu kópiu.
  try {
    const res = await fetch(CATALOG_API_URL);
    if (res.ok) {
      const cloudData = await res.json();
      if (Array.isArray(cloudData.books) && cloudData.books.length > 0) {
        allBooks = cloudData.books;
      } else if (allBooks.length > 0) {
        // Cloud je prázdny, ale máme lokálne dáta (napr. úplne prvé spustenie) —
        // nahrajeme ich do cloudu, nech sú dostupné aj z iných zariadení.
        await syncToCloud();
      }
      cloudSyncAvailable = true;
    } else {
      cloudSyncAvailable = false;
    }
  } catch (e) {
    // Cloud funkcia nie je dostupná (napr. lokálny vývoj cez python http.server,
    // alebo výpadok siete) — pokračujeme len s lokálnou kópiou.
    cloudSyncAvailable = false;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(allBooks));
  updateSyncStatusUI();
}

// Pre knihy už uložené v localStorage (z predošlej verzie bez originalTitle poľa)
// doplní originálny/anglický názov podľa zhody s pôvodným zoznamom v data.js.
// Nepoužíva sa na prepisovanie už existujúcich vlastných úprav.
function backfillOriginalTitles() {
  let changed = false;
  const byTitle = {};
  INITIAL_BOOKS.forEach(b => {
    if (b.originalTitle) byTitle[(b.title || '').trim()] = b.originalTitle.trim();
  });
  allBooks.forEach(book => {
    if (!book.originalTitle && byTitle[book.title]) {
      book.originalTitle = byTitle[book.title];
      changed = true;
    }
  });
}

// ============================================================
// Export / import celého katalógu — záloha a presun na iný
// počítač, prehliadač alebo hosting (napr. po nasadení na Netlify).
// ============================================================

function exportCatalog() {
  try {
    const payload = {
      exportedAt: new Date().toISOString(),
      bookCount: allBooks.length,
      books: allBooks
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `kniznica-zaloha-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    importStatus.textContent = `Stiahnutých ${allBooks.length} kníh.`;
    importStatus.className = 'api-status ok';
  } catch (error) {
    console.error('Chyba pri exporte katalógu:', error);
    importStatus.textContent = 'Export sa nepodaril. Skús to znova.';
    importStatus.className = 'api-status bad';
  }
}

function importCatalog(file) {
  const reader = new FileReader();
  reader.onload = () => {
    let parsed;
    try {
      parsed = JSON.parse(reader.result);
    } catch (error) {
      importStatus.textContent = 'Tento súbor nie je platný JSON export z tohto katalógu.';
      importStatus.className = 'api-status bad';
      return;
    }

    const importedBooks = Array.isArray(parsed) ? parsed : parsed.books;
    if (!Array.isArray(importedBooks)) {
      importStatus.textContent = 'Súbor neobsahuje rozpoznateľný zoznam kníh.';
      importStatus.className = 'api-status bad';
      return;
    }

    const validBooks = importedBooks.filter(b => b && typeof b.title === 'string' && b.title.trim());
    if (validBooks.length === 0) {
      importStatus.textContent = 'V súbore sa nenašla žiadna platná kniha.';
      importStatus.className = 'api-status bad';
      return;
    }

    const hasExisting = allBooks.length > 0;
    const proceed = !hasExisting || confirm(
      `Import obsahuje ${validBooks.length} kníh. Tvoj aktuálny katalóg má ${allBooks.length} kníh.\n\n` +
      `OK = nahradiť aktuálny katalóg importovaným (odporúčané pri prenose na nový hosting)\n` +
      `Zrušiť = nepokračovať`
    );
    if (!proceed) return;

    // Doplníme chýbajúce povinné polia a unikátne id, nech sa zídu so zvyškom aplikácie.
    allBooks = validBooks.map((b, i) => ({
      id: b.id || ('imported_' + i + '_' + Date.now()),
      title: b.title.trim(),
      author: (b.author || '').trim(),
      genre: (b.genre || 'Nezaradené').trim(),
      originalTitle: (b.originalTitle || '').trim(),
      coverUrl: b.coverUrl || null,
      description: b.description || null,
      customCover: !!b.customCover,
      createdAt: b.createdAt || Date.now()
    }));

    saveBooks(true);
    filterAndRenderBooks();
    importStatus.textContent = `Naimportovaných ${allBooks.length} kníh.`;
    importStatus.className = 'api-status ok';
  };
  reader.onerror = () => {
    importStatus.textContent = 'Súbor sa nepodarilo prečítať.';
    importStatus.className = 'api-status bad';
  };
  reader.readAsText(file);
}

function saveBooks(immediate = false) {
  // Lokálnu kópiu ukladáme hneď a synchrónne — UI nesmie čakať na sieť.
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allBooks));
  } catch (e) {
    console.error('Chyba pri ukladaní do localStorage:', e);
    showError('Pamäť prehliadača pre tento katalóg je plná (typicky pri veľkom množstve vlastných fotiek obalov). Skús zmenšiť počet vlastných fotiek, alebo si urob export katalógu a pokračuj v inom prehliadači.');
  }

  if (!cloudSyncAvailable) return;
  clearTimeout(saveDebounceTimer);

  if (immediate) {
    // Pre jednorazové, dôležité akcie (preklad, rescan, ručná úprava, nahraný
    // obal) chceme zápis do cloudu hneď — ak by si stránku zatvoril/obnovil
    // skôr, než by debounce stihol odoslať dáta, loadBooks() by pri ďalšom
    // otvorení stiahla zo serveru staršiu verziu a prepísala by ňou zmenu.
    syncToCloud();
  } else {
    // Pre hromadné/rýchlo opakované zmeny (napr. dopĺňanie obalov pri 190
    // knihách) odložíme zápis o 800ms, nech sa neposielajú desiatky
    // požiadaviek za sekundu — vždy sa zapíše len posledný, najaktuálnejší stav.
    saveDebounceTimer = setTimeout(syncToCloud, 800);
  }
}

async function syncToCloud() {
  try {
    const res = await fetch(CATALOG_API_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ books: allBooks })
    });
    if (!res.ok) {
      console.error('Cloud sync zlyhal s HTTP', res.status);
      cloudSyncAvailable = false;
    } else {
      cloudSyncAvailable = true;
    }
  } catch (e) {
    console.error('Cloud sync zlyhal:', e);
    // Nezobrazujeme chybu používateľovi pri každom zápise — lokálna kópia
    // je v poriadku, cloud sa zosynchronizuje pri ďalšej príležitosti.
    cloudSyncAvailable = false;
  }
  updateSyncStatusUI();
}

function loadApiKey() {
  const key = localStorage.getItem(API_KEY_STORAGE) || '';
  apiKeyInput.value = key;
  updateApiKeyStatus();
}

function loadBooksApiKey() {
  const key = localStorage.getItem(BOOKS_API_KEY_STORAGE) || '';
  booksApiKeyInput.value = key;
  updateBooksApiKeyStatus();
}

function updateBooksApiKeyStatus() {
  const key = booksApiKeyInput.value.trim();
  if (key) {
    booksApiKeyStatus.textContent = 'Kľúč je uložený lokálne. Sťahovanie obalov by malo byť stabilnejšie.';
    booksApiKeyStatus.className = 'api-status ok';
  } else {
    booksApiKeyStatus.textContent = 'Bez kľúča hrozia chyby 429 (príliš veľa požiadaviek).';
    booksApiKeyStatus.className = 'api-status bad';
  }
}

booksApiKeyInput.addEventListener('change', () => {
  localStorage.setItem(BOOKS_API_KEY_STORAGE, booksApiKeyInput.value.trim());
  updateBooksApiKeyStatus();
  rateLimitedUntil = 0; // skús znova bez čakania, keď používateľ doplní kľúč
});
booksApiKeyInput.addEventListener('blur', () => {
  localStorage.setItem(BOOKS_API_KEY_STORAGE, booksApiKeyInput.value.trim());
  updateBooksApiKeyStatus();
});

function updateApiKeyStatus() {
  const key = apiKeyInput.value.trim();
  if (key) {
    apiKeyStatus.textContent = 'Kľúč je uložený lokálne. Foto-rozpoznávanie je aktívne.';
    apiKeyStatus.className = 'api-status ok';
  } else {
    apiKeyStatus.textContent = 'Bez kľúča nebude fungovať rozpoznávanie z fotky.';
    apiKeyStatus.className = 'api-status bad';
  }
}

apiKeyInput.addEventListener('change', () => {
  localStorage.setItem(API_KEY_STORAGE, apiKeyInput.value.trim());
  updateApiKeyStatus();
});
apiKeyInput.addEventListener('blur', () => {
  localStorage.setItem(API_KEY_STORAGE, apiKeyInput.value.trim());
  updateApiKeyStatus();
});

// ============================================================
// UI stav
// ============================================================

function showLoader(message) {
  loader.style.display = 'block';
  statusMessage.textContent = message;
  errorMessage.textContent = '';
  retryDetailsBtn.style.display = 'none';
}
function hideLoader() {
  loader.style.display = 'none';
  statusMessage.textContent = '';
}
function showError(message) {
  hideLoader();
  errorMessage.textContent = message;
}
function showRetryButton() {
  hideLoader();
  retryDetailsBtn.style.display = 'inline-flex';
}
function hideRetryButton() {
  retryDetailsBtn.style.display = 'none';
}

// ============================================================
// Google Books API — obal + popis (funguje aj bez kľúča, ale
// s vlastným Google API kľúčom je oveľa spoľahlivejšie)
// ============================================================

let lastNetworkErrorShown = false;
let rateLimitedUntil = 0; // timestamp, do kedy nemá zmysel skúšať (po opakovanom 429)
let wikidataRateLimitedUntil = 0; // samostatný rate-limit flag pre Wikidata fallback
let permanentlyStopped = false; // bez kľúča a po vyčerpaní pokusov už ďalej neskúšame v tejto dávke

// Normalizuje meno autora na porovnanie (bez diakritiky, malými písmenami,
// bez interpunkcie) — "Dumas, Alexandre" aj "Alexandre Dumas" dajú rovnaký výsledok.
function normalizeAuthorName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // odstráni diakritiku
    .replace(/[(),.]/g, ' ')
    .split(/[\s,]+/)
    .filter(w => w.length > 1)
    .sort()
    .join(' ');
}

// Overí, či sa aspoň jedno priezvisko/meno z nášho záznamu nachádza medzi
// autormi vráteného výsledku. Bez tejto kontroly fulltextové vyhľadávanie
// podľa všeobecného názvu ľahko vráti úplne inú knihu od iného autora.
function authorMatches(ourAuthor, resultAuthors) {
  if (!ourAuthor) return true; // nemáme s čím porovnať — neblokujeme
  if (!resultAuthors || resultAuthors.length === 0) return false;

  const ourWords = new Set(normalizeAuthorName(ourAuthor).split(' ').filter(w => w.length > 2));
  if (ourWords.size === 0) return true;

  const resultWords = new Set(
    resultAuthors.flatMap(a => normalizeAuthorName(a).split(' ')).filter(w => w.length > 2)
  );

  for (const w of ourWords) {
    if (resultWords.has(w)) return true;
  }
  return false;
}

async function fetchBookDetails(title, author, originalTitle, book, enabledSources, attempt = 0, titleFallbackUsed = false) {
  if (!title) return { coverUrl: null, description: null, networkError: false, sources: {} };

  const enabled = enabledSources || { openLibrary: true, googleBooks: false, wikidata: true };

  // Per-zdroj stav danej knihy — ak je už zaznamenané, že zdroj bol vyskúšaný
  // a nič nenašiel, preskočíme ho (šetrí to API volania pri opakovanom behu).
  const sources = (book && book.sourcesTried) ? { ...book.sourcesTried } : {};

  // Ak máme originálny/anglický názov, skúsime ho ako prvý — všetky tri zdroje
  // (Open Library, Google Books, Wikidata) majú spravidla oveľa lepšie pokrytie
  // pre originálne/anglické vydania kníh než pre konkrétne preklady do slovenčiny/češtiny.
  const useOriginal = !titleFallbackUsed && originalTitle && originalTitle.trim();
  const searchTitle = useOriginal ? originalTitle.trim() : title;

  let coverUrl = null;
  let description = null;

  // ---- 0) Open Library podľa ISBN — ak ho kniha má, je to najpresnejší
  // a najspoľahlivejší spôsob (jednoznačná identifikácia konkrétneho vydania,
  // žiadna kontrola zhody autora nie je ani potrebná). Skúša sa pred
  // fulltextovým vyhľadávaním podľa názvu.
  const isbn = book && book.isbn ? book.isbn : null;
  if (isbn && enabled.openLibrary && sources.openLibraryIsbn !== 'found' && sources.openLibraryIsbn !== 'empty') {
    const olIsbn = await fetchFromOpenLibraryByIsbn(isbn);
    sources.openLibraryIsbn = olIsbn.coverUrl ? 'found' : 'empty';
    if (olIsbn.coverUrl) coverUrl = olIsbn.coverUrl;
    if (olIsbn.description) description = olIsbn.description;
  }

  if (coverUrl) {
    return { coverUrl, description: description || 'Popis pre túto knihu nebol nájdený.', networkError: false, sources };
  }

  // ---- 1) Open Library — skúšame ako prvú, nemá denný limit požiadaviek ----
  if (enabled.openLibrary && sources.openLibrary !== 'found' && sources.openLibrary !== 'empty') {
    const ol = await fetchFromOpenLibrary(searchTitle, author);
    sources.openLibrary = ol.coverUrl ? 'found' : 'empty';
    if (ol.coverUrl) coverUrl = ol.coverUrl;
    if (ol.description) description = ol.description;
  }

  if (coverUrl) {
    return { coverUrl, description: description || 'Popis pre túto knihu nebol nájdený.', networkError: false, sources };
  }

  // ---- 2) Google Books — druhý zdroj, má denný limit (najmä bez vlastného kľúča) ----
  const booksAlreadyTried = sources.googleBooks === 'found' || sources.googleBooks === 'empty';

  if (!enabled.googleBooks) {
    // Zdroj je v paneli vypnutý (napr. dlhodobo vyčerpaná kvóta) — vôbec ho neskúšame.
  } else if (!booksAlreadyTried && Date.now() < rateLimitedUntil) {
    // Books API je v "pauze" po predošlom 429 — neskúšame ho znova zbytočne v tomto behu,
    // ale NEZNAMENÁME si to ako "empty", aby sa skúsilo nabudúce, keď kvóta bude voľná.
    sources.googleBooksRateLimited = true;
  } else if (!booksAlreadyTried) {
    const booksApiKey = (localStorage.getItem(BOOKS_API_KEY_STORAGE) || '').trim();
    try {
      // Ak máme ISBN, je to presnejší identifikátor než názov/autor.
      const query = isbn
        ? `isbn:${encodeURIComponent(isbn)}`
        : `intitle:${encodeURIComponent(searchTitle)}${author ? '+inauthor:' + encodeURIComponent(author) : ''}`;
      let url = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`;
      if (booksApiKey) url += `&key=${encodeURIComponent(booksApiKey)}`;

      const response = await fetch(url);

      if (response.status === 429) {
        // Retry tu nedáva zmysel: 429 na Books API takmer vždy znamená vyčerpanú
        // dennú kvótu (resetuje sa raz za 24h), nie krátky prechodný výkyv.
        rateLimitedUntil = Date.now() + 5 * 60000; // 5 min pauza, nech zbytočne nešpiníme konzolu
        sources.googleBooksRateLimited = true;
        if (!lastNetworkErrorShown) {
          lastNetworkErrorShown = true;
          errorMessage.textContent = booksApiKey
            ? 'Google Books API odmieta požiadavky aj s tvojím kľúčom (HTTP 429, denná kvóta je pravdepodobne vyčerpaná). Skúšam Open Library a Wikidata, no tie pokryjú len časť kníh.'
            : 'Google Books API odmieta požiadavky bez kľúča (HTTP 429). Skúšam Open Library a Wikidata, no tie pokryjú len časť kníh.';
        }
      } else if (response.status === 403) {
        sources.googleBooks = 'empty';
        if (!lastNetworkErrorShown) {
          lastNetworkErrorShown = true;
          showError('Google Books API odmietol kľúč (HTTP 403). Over, že je v Google Cloud Console povolené „Books API“ pre tento kľúč a že kľúč nemá obmedzenia, ktoré by blokovali tento web.');
        }
      } else if (response.ok) {
        const data = await response.json();
        const bookResult = data.items?.[0]?.volumeInfo;
        // Pri vyhľadávaní podľa ISBN je výsledok jednoznačný, kontrola zhody
        // autora nie je potrebná. Pri fulltextovom vyhľadávaní podľa názvu ju
        // potrebujeme — inak by všeobecný názov (napr. "Dedič", "Goya") mohol
        // vrátiť úplne inú knihu od iného autora, len so zhodným/podobným titulom.
        const matches = isbn ? true : (bookResult && authorMatches(author, bookResult.authors));
        const foundCover = matches ? (bookResult?.imageLinks?.thumbnail || null) : null;
        sources.googleBooks = foundCover ? 'found' : 'empty';
        if (foundCover) coverUrl = foundCover;
        if (matches && bookResult?.description) description = bookResult.description;
      } else {
        sources.googleBooks = 'empty';
      }
    } catch (error) {
      console.error('Chyba pri načítaní detailov z Google Books pre "' + title + '":', error);
      // Sieťová chyba nie je fatálna ani trvalá — neoznačujeme zdroj ako "empty",
      // nech sa skúsi znova nabudúce (mohol to byť len dočasný výpadok).
    }
  }

  if (coverUrl) {
    return { coverUrl, description: description || 'Popis pre túto knihu nebol nájdený.', networkError: false, sources };
  }

  // Ak sme hľadali podľa originálneho/EN názvu a nič sme nenašli, skúsime ešte
  // raz s pôvodným (preloženým) názvom (cez zdroje, ktoré ešte neboli vyskúšané).
  if (useOriginal) {
    const fallback = await fetchBookDetails(title, author, null, { sourcesTried: sources }, enabled, 0, true);
    if (fallback.coverUrl) return fallback;
    Object.assign(sources, fallback.sources);
    if (!description && fallback.description && fallback.description !== 'Popis pre túto knihu nebol nájdený.') {
      description = fallback.description;
    }
  }

  // ---- 3) Wikidata — posledný fallback pre veľmi známe diela ----
  if (enabled.wikidata && sources.wikidata !== 'found' && sources.wikidata !== 'empty') {
    const wd = await fetchCoverFromWikidata(searchTitle, author);
    sources.wikidata = wd.coverUrl ? 'found' : 'empty';
    if (wd.coverUrl) coverUrl = wd.coverUrl;
    if (!description && wd.description) description = wd.description;
  }

  // Ak Books API bolo rate-limited a nič iné nenašlo obal, nepovažujeme
  // toto za finálny výsledok — nech sa kniha skúsi znova, keď bude kvóta voľná.
  if (!coverUrl && sources.googleBooksRateLimited) {
    return { coverUrl: null, description, networkError: true, rateLimited: true, sources };
  }

  return {
    coverUrl: coverUrl,
    description: description || 'Popis pre túto knihu nebol nájdený.',
    networkError: false,
    sources
  };
}



// ============================================================
// Open Library — primárny zdroj obalu/popisu. Na rozdiel od Google Books
// nemá denný limit požiadaviek a je zameraná na čo najširšiu knižnú
// databázu (vrátane starších/menej známych vydaní), takže ju skúšame
// ako prvú. https://openlibrary.org/developers/api
// ============================================================

async function fetchWithTimeout(url, ms) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

let openLibraryRateLimitedUntil = 0;

// Vyhľadanie podľa ISBN je oveľa presnejšie než fulltextové vyhľadávanie podľa
// názvu/autora — žiadna kontrola zhody autora nie je potrebná, ISBN jednoznačne
// identifikuje konkrétne vydanie knihy. Používa sa ako prioritný spôsob, keď
// má kniha vyplnené ISBN.
async function fetchFromOpenLibraryByIsbn(isbn) {
  if (!isbn) return { coverUrl: null, description: null };
  if (Date.now() < openLibraryRateLimitedUntil) {
    return { coverUrl: null, description: null };
  }
  try {
    const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(isbn)}&format=json&jscmd=data`;
    const res = await fetchWithTimeout(url, 6000);

    if (res.status === 429) {
      openLibraryRateLimitedUntil = Date.now() + 5 * 60000;
      return { coverUrl: null, description: null };
    }
    if (!res.ok) return { coverUrl: null, description: null };

    const data = await res.json();
    const book = data['ISBN:' + isbn];
    if (!book) return { coverUrl: null, description: null };

    const coverUrl = book.cover?.large || book.cover?.medium || null;
    let description = null;
    if (typeof book.notes === 'string') description = book.notes;
    else if (book.excerpts?.[0]?.text) description = book.excerpts[0].text;

    return { coverUrl, description };
  } catch (error) {
    return { coverUrl: null, description: null };
  }
}

async function fetchFromOpenLibrary(title, author) {
  if (Date.now() < openLibraryRateLimitedUntil) {
    return { coverUrl: null, description: null };
  }
  try {
    const query = `${title}${author ? ' ' + author : ''}`;
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&fields=title,author_name,cover_i,key,first_sentence&limit=3`;
    const res = await fetchWithTimeout(url, 6000);

    if (res.status === 429) {
      openLibraryRateLimitedUntil = Date.now() + 5 * 60000;
      return { coverUrl: null, description: null };
    }
    if (!res.ok) return { coverUrl: null, description: null };

    const data = await res.json();
    const docs = data.docs || [];

    for (const doc of docs) {
      // Rovnaká kontrola zhody autora ako pri Google Books — fulltextové
      // vyhľadávanie podľa všeobecného názvu by inak mohlo vrátiť celkom inú knihu.
      if (author && doc.author_name && !authorMatches(author, doc.author_name)) continue;
      if (!doc.cover_i) continue;

      const coverUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;

      // "first_sentence" je len úvodná veta textu, nie skutočný popis/anotácia —
      // tú treba dotiahnuť samostatne z /works/{key}.json (pole "description").
      let description = null;
      if (doc.key) {
        try {
          const workRes = await fetchWithTimeout(`https://openlibrary.org${doc.key}.json`, 5000);
          if (workRes.ok) {
            const workData = await workRes.json();
            description = typeof workData.description === 'string'
              ? workData.description
              : (workData.description?.value || null);
          }
        } catch (e) {
          // popis sa nepodarilo dotiahnuť — obal je dôležitejší, pokračujeme aj bez popisu
        }
      }
      if (!description) {
        description = Array.isArray(doc.first_sentence)
          ? doc.first_sentence[0]
          : (doc.first_sentence || null);
      }

      return { coverUrl, description };
    }
    return { coverUrl: null, description: null };
  } catch (error) {
    // Timeout alebo iná sieťová chyba — ticho preskočíme na ďalší zdroj.
    return { coverUrl: null, description: null };
  }
}


// ============================================================
// Wikidata — záložný zdroj obalu/popisu pre veľmi známe diela,
// ktoré majú vlastnú Wikidata položku (napr. svetová klasika).
// Skúša sa, keď ani Open Library ani Google Books nenájdu obal.
// ============================================================

// Wikidata QID-y pre typy, ktoré akceptujeme ako "kniha/literárne dielo".
// Q7725634 = literary work, Q571 = book, Q8261 = novel, Q47461344 = written work
const WIKIDATA_BOOK_TYPES = new Set(['Q7725634', 'Q571', 'Q8261', 'Q47461344', 'Q49084', 'Q1667921']);

async function fetchCoverFromWikidata(title, author) {
  if (Date.now() < wikidataRateLimitedUntil) {
    return { coverUrl: null, description: null };
  }
  try {
    const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(title)}&language=sk&uselang=sk&type=item&limit=3&format=json&origin=*`;
    const searchRes = await fetchWithTimeout(searchUrl, 4000);

    if (searchRes.status === 429) {
      wikidataRateLimitedUntil = Date.now() + 5 * 60000;
      return { coverUrl: null, description: null };
    }
    if (!searchRes.ok) return { coverUrl: null, description: null };
    const searchData = await searchRes.json();
    const candidates = searchData.search || [];
    if (candidates.length === 0) return { coverUrl: null, description: null };

    // Potrebujeme aj mená autorov (P50), nielen claims — vyžiadame aj labels.
    const ids = candidates.map(c => c.id).join('|');
    const entitiesUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${ids}&props=claims|labels&languages=en&format=json&origin=*`;
    const entitiesRes = await fetchWithTimeout(entitiesUrl, 4000);
    if (!entitiesRes.ok) return { coverUrl: null, description: null };
    const entitiesData = await entitiesRes.json();

    // Zozbierame všetky P50 (author) QID-y, ktoré sa objavujú medzi kandidátmi,
    // aby sme ich mohli v jednom volaní rozmenovať na mená.
    const authorQids = new Set();
    for (const id of candidates.map(c => c.id)) {
      const entity = entitiesData.entities?.[id];
      const authorClaims = entity?.claims?.P50 || [];
      authorClaims.forEach(c => {
        const qid = c.mainsnak?.datavalue?.value?.id;
        if (qid) authorQids.add(qid);
      });
    }

    let authorLabels = {};
    if (authorQids.size > 0) {
      const authorIds = [...authorQids].join('|');
      const authorRes = await fetchWithTimeout(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${authorIds}&props=labels&languages=en&format=json&origin=*`, 4000);
      if (authorRes.ok) {
        const authorData = await authorRes.json();
        for (const qid of authorQids) {
          authorLabels[qid] = authorData.entities?.[qid]?.labels?.en?.value || '';
        }
      }
    }

    for (const id of candidates.map(c => c.id)) {
      const entity = entitiesData.entities?.[id];
      if (!entity || !entity.claims) continue;

      // 1) Musí ísť o knihu/literárne dielo, nie o osobu, film, miesto a pod.
      const instanceOfClaims = entity.claims.P31 || [];
      const isBookLike = instanceOfClaims.some(c => WIKIDATA_BOOK_TYPES.has(c.mainsnak?.datavalue?.value?.id));
      if (!isBookLike) continue;

      // 2) Ak máme autora na overenie, musí sa zhodovať s autorom diela na Wikidata.
      const authorClaims = entity.claims.P50 || [];
      const entityAuthorNames = authorClaims
        .map(c => authorLabels[c.mainsnak?.datavalue?.value?.id])
        .filter(Boolean);
      if (author && entityAuthorNames.length > 0 && !authorMatches(author, entityAuthorNames)) continue;

      const imageClaim = entity.claims.P18?.[0]?.mainsnak?.datavalue?.value;
      if (imageClaim) {
        const fileName = imageClaim.replace(/ /g, '_');
        const coverUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}?width=400`;
        return { coverUrl, description: null };
      }
    }
    return { coverUrl: null, description: null };
  } catch (error) {
    // Timeout alebo iná sieťová chyba pri Wikidata fallbacku — ticho preskočíme,
    // nejde o kritický zdroj a nechceme tým blokovať alebo strašiť chybovými hláškami.
    return { coverUrl: null, description: null };
  }
}

// ============================================================
// CRUD operácie nad knihami
// ============================================================

async function addBook(title, author, genre, originalTitle, skipDetails) {
  if (!title || !title.trim()) return;
  const newBook = {
    id: 'b_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    title: title.trim(),
    author: (author || '').trim(),
    genre: (genre || 'Nezaradené').trim(),
    originalTitle: (originalTitle || '').trim(),
    coverUrl: null,
    description: null,
    createdAt: Date.now()
  };
  allBooks.unshift(newBook);
  saveBooks(true);
  filterAndRenderBooks();

  if (!skipDetails) {
    showLoader(`Hľadám obal a popis pre „${newBook.title}“…`);
    const { coverUrl, description, networkError, sources } = await fetchBookDetails(newBook.title, newBook.author, newBook.originalTitle, newBook, getEnabledSources());
    if (!networkError) {
      newBook.coverUrl = coverUrl;
      newBook.description = description;
    }
    newBook.sourcesTried = sources || newBook.sourcesTried;
    saveBooks(true);
    filterAndRenderBooks();
    hideLoader();
  }
}

function deleteBook(id) {
  allBooks = allBooks.filter(b => b.id !== id);
  saveBooks(true);
  filterAndRenderBooks();
}

// Zobrazí v paneli, koľko kníh ešte nemá obal, nech je jasné, či má zmysel
// kliknúť na manuálne tlačidlo "Spustiť dopĺňanie".
function updateFetchMissingButtonLabel() {
  if (!missingCoversInfo) return;
  const missingCount = allBooks.filter(b => !b.coverUrl).length;
  if (missingCount === 0) {
    missingCoversInfo.textContent = 'Všetky knihy v katalógu už majú obal alebo placeholder.';
    fetchMissingBtn.disabled = true;
  } else {
    missingCoversInfo.textContent = `${missingCount} ${missingCount === 1 ? 'kniha nemá' : 'kníh nemá'} obal. Spustenie skúsi vybrané zdroje nižšie (zdroje, ktoré už raz nič nenašli, sa pri tej istej knihe preskočia).`;
    fetchMissingBtn.disabled = false;
  }
}

// ============================================================
// Preklad anotácie knihy do slovenčiny cez Gemini API. Popis sa
// nielen prekladá, ale aj stručne preformuluje vlastnými slovami —
// nejde o doslovnú reprodukciu pôvodného textu, len o krátku
// slovenskú anotáciu rovnakého obsahu pre potreby katalógu.
// ============================================================

// ============================================================
// Vyhľadanie obalu a popisu cez Gemini s Google Search groundingom.
// Používa sa ako posledná možnosť pre knihy, ktoré Open Library, Google
// Books ani Wikidata nenašli — Gemini si samo vykoná webové vyhľadávanie
// (podobne ako Google "AI Overview") a vráti, čo nájde, vo vlastnej
// stručnej syntéze (nie doslovnú citáciu zdrojových stránok).
// ============================================================

async function searchViaGeminiWeb(book) {
  const apiKey = (localStorage.getItem(API_KEY_STORAGE) || '').trim();
  if (!apiKey) {
    showError('Pre vyhľadanie cez Gemini (web) najprv vlož svoj Gemini API kľúč do panela vľavo.');
    return null;
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const searchTerm = book.originalTitle ? `${book.title} (${book.originalTitle})` : book.title;
  const systemPrompt = "You are a helpful research assistant for a personal book catalog. Use web search to find publicly available information about the specific book edition described, then respond with structured JSON only.";
  // Poznámka: Gemini cez grounding často nevie spoľahlivo skonštruovať priamu
  // funkčnú URL obrázka obalu (vidí len text výsledkov vyhľadávania, nie
  // skutočné obrázkové súbory) — preto žiadame radšej odkaz na stránku
  // (antikvariát/databáza), odkiaľ si obal vieš stiahnuť a nahrať ručne.
  const userQuery = `Nájdi informácie o knihe "${searchTerm}" od autora "${book.author || 'neznámy'}" (slovenské/české vydanie, žáner: ${book.genre || 'neznámy'}). Skús nájsť webovú stránku (napr. antikvariát, knižná databáza ako databazeknih.cz, alebo vydavateľstvo), kde je k tejto konkrétnej knihe zobrazený obal — uveď URL tej stránky, NIE priamu URL obrázka. Stručne zhrň aj dej vlastnými slovami v slovenčine (2-4 vety).\n\nOdpovedz IBA validným JSON objektom v tomto presnom tvare, bez markdown formátovania, bez spätných úvodzoviek, bez akéhokoľvek ďalšieho textu pred alebo za JSON-om:\n{"pageUrl": "https://... alebo null ak si žiadnu nenašiel", "pageSource": "názov stránky, napr. Databáze knih, alebo null", "description": "slovenský popis alebo null"}`;

  const payload = {
    contents: [{ parts: [{ text: userQuery }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    tools: [{ google_search: {} }]
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => null);
      showError('Vyhľadanie cez Gemini sa nepodarilo: ' + (errBody?.error?.message || ('HTTP ' + response.status)));
      return null;
    }

    const result = await response.json();
    let text = result.candidates?.[0]?.content?.parts?.find(p => p.text)?.text?.trim();
    if (!text) {
      console.error('Gemini web search — žiadny text v odpovedi. Celá odpoveď:', JSON.stringify(result));
      showError('Gemini nevrátil žiadnu odpoveď. Skús to znova.');
      return null;
    }

    // Gemini niekedy odpoveď zabalí do ```json ... ``` bloku, alebo pred/za JSON
    // pridá vysvetľujúci text napriek pokynu — vytiahneme len samotný JSON blok.
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const cleanedText = jsonMatch ? jsonMatch[0] : text.replace(/^```json\s*|\s*```$/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleanedText);
    } catch (e) {
      console.error('Gemini web search vrátil text, ktorý sa nepodarilo spracovať ako JSON. Pôvodný text:', text);
      showError('Gemini vrátil neočakávaný formát odpovede (pozri konzolu pre detail). Skús to znova.');
      return null;
    }

    const pageUrl = (parsed.pageUrl && parsed.pageUrl !== 'null') ? parsed.pageUrl : null;
    const pageSource = (parsed.pageSource && parsed.pageSource !== 'null') ? parsed.pageSource : null;
    const description = (parsed.description && parsed.description !== 'null') ? parsed.description : null;

    if (!pageUrl && !description) {
      console.log('Gemini web search pre "' + book.title + '" nenašiel nič. Surová odpoveď:', text);
    }

    return { pageUrl, pageSource, description };
  } catch (error) {
    console.error('Chyba pri vyhľadávaní cez Gemini web search:', error);
    showError('Nepodarilo sa spojiť s Gemini API. Skontroluj pripojenie.');
    return null;
  }
}

async function translateDescription(book) {
  const apiKey = (localStorage.getItem(API_KEY_STORAGE) || '').trim();
  if (!apiKey) {
    showError('Pre preklad popisu najprv vlož svoj Gemini API kľúč do panela vľavo.');
    return null;
  }
  if (!book.description) return null;

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const systemPrompt = "You are a helpful assistant that writes short Slovak-language book summaries for a personal library catalog.";
  const userQuery = `Na základe nasledujúceho anglického/cudzojazyčného popisu knihy "${book.title}" od autora "${book.author || 'neznámy'}" napíš krátku, vlastnými slovami sformulovanú anotáciu v slovenčine (2-4 vety, bez doslovného prekladu vety po vete). Odpovedz IBA samotným slovenským textom anotácie, bez úvodzoviek, bez nadpisu, bez ďalšieho komentára.\n\nPôvodný popis:\n${book.description}`;

  const payload = {
    contents: [{ parts: [{ text: userQuery }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] }
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => null);
      showError('Preklad sa nepodaril: ' + (errBody?.error?.message || ('HTTP ' + response.status)));
      return null;
    }

    const result = await response.json();
    const translated = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!translated) {
      showError('Gemini nevrátil žiadny preložený text. Skús to znova.');
      return null;
    }
    return translated;
  } catch (error) {
    console.error('Chyba pri preklade popisu:', error);
    showError('Nepodarilo sa spojiť s Gemini API pre preklad. Skontroluj pripojenie.');
    return null;
  }
}

async function fetchAllMissingDetails() {
  // Chýba obal = skúsime znova (aj keby kniha už má popis z predošlého behu bez Wikidata fallbacku).
  const missing = allBooks.filter(b => !b.coverUrl);
  if (missing.length === 0) return;

  const enabledSources = getEnabledSources();
  if (!enabledSources.openLibrary && !enabledSources.googleBooks && !enabledSources.wikidata) {
    errorMessage.textContent = 'Vyber aspoň jeden zdroj nižšie (Open Library, Google Books, Wikidata), inak nie je čo spustiť.';
    return;
  }

  fetchInProgress = true;
  fetchShouldStop = false;
  fetchMissingBtn.disabled = true;
  stopFetchBtn.style.display = 'inline-flex';
  showLoader(`Dopĺňam obaly pre ${missing.length} kníh… (0/${missing.length})`);
  let count = 0; // počet úspešne doplnených kníh
  let processed = 0; // počet spracovaných kníh (úspešne aj neúspešne) — pre priebežné počítadlo
  let rateLimitedCount = 0;
  let stoppedEarly = false;

  try {
    for (const book of missing) {
      if (fetchShouldStop) { stoppedEarly = true; break; }

      // znova over, či kniha medzitým nedostala obal (napr. cez klik na Detail alebo vlastné nahratie)
      if (book.coverUrl) { count++; processed++; continue; }

      await new Promise(res => setTimeout(res, 1200));
      if (fetchShouldStop) { stoppedEarly = true; break; }

      const details = await fetchBookDetails(book.title, book.author, book.originalTitle, book, enabledSources);
      processed++;

      // Uložíme si, ktoré zdroje boli vyskúšané, bez ohľadu na výsledok —
      // nech sa pri ďalšom behu zbytočne neopakujú zdroje, ktoré už raz nič nenašli.
      if (details.sources) book.sourcesTried = details.sources;

      if (details.networkError) {
        if (details.rateLimited) {
          // Books API je vyčerpané a Wikidata pre túto knihu nič nenašla —
          // preskočíme ju (skúsi sa znova nabudúce) a pokračujeme ďalšími,
          // kde Wikidata ešte môže niečo nájsť. Books API sa medzitým
          // automaticky "odpočíva" cez rateLimitedUntil vo fetchBookDetails.
          rateLimitedCount++;
          // Počítadlo priebehu necháme viditeľné aj nad chybovou hláškou,
          // nech je jasné, že beh stále pokračuje na pozadí.
          statusMessage.textContent = `Dopĺňam obaly pre ${missing.length} kníh… (${processed}/${missing.length})`;
        }
        // iná sieťová chyba (napr. file:// alebo výpadok, alebo rate-limit) — skús ďalšiu knihu
        continue;
      }

      book.coverUrl = details.coverUrl;
      book.description = details.description;
      count++;
      statusMessage.textContent = `Dopĺňam obaly pre ${missing.length} kníh… (${processed}/${missing.length})`;
      if (count % 8 === 0) {
        saveBooks();
        filterAndRenderBooks();
      }
    }
    saveBooks();

    if (stoppedEarly) {
      hideLoader();
      statusMessage.textContent = '';
      errorMessage.textContent = `Dopĺňanie bolo zastavené (spracovaných ${processed} z ${missing.length} kníh). Zvyšok môžeš doplniť neskôr opätovným spustením.`;
    } else if (rateLimitedCount > 0) {
      showRetryButton();
      statusMessage.textContent = '';
      errorMessage.textContent = `Google Books API bolo vyčerpané pre ${rateLimitedCount} kníh (skúsené aspoň cez ostatné zvolené zdroje). Skús to znova neskôr, alebo zajtra po obnovení dennej kvóty.`;
    } else {
      hideLoader();
    }
  } finally {
    fetchInProgress = false;
    fetchShouldStop = false;
    fetchMissingBtn.disabled = false;
    stopFetchBtn.style.display = 'none';
    filterAndRenderBooks();
  }
}

// ============================================================
// Renderovanie
// ============================================================

function populateGenreSelect() {
  bookGenreInput.innerHTML = GENRES.map(g => `<option value="${escapeHtml(g)}">${escapeHtml(g)}</option>`).join('');
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function filterAndRenderBooks() {
  renderSidebar();
  ledgerCount.textContent = String(allBooks.length).padStart(3, '0');
  updateFetchMissingButtonLabel();

  const term = searchInput.value.toLowerCase().trim();
  let toDisplay = allBooks;

  if (selectedGenre !== 'Všetky') {
    toDisplay = toDisplay.filter(b => (b.genre || 'Nezaradené') === selectedGenre);
  }
  if (term) {
    toDisplay = toDisplay.filter(b =>
      b.title.toLowerCase().includes(term) ||
      (b.author && b.author.toLowerCase().includes(term))
    );
  }
  renderBooks(toDisplay);
}

function renderSidebar() {
  const genresPresent = [...new Set(allBooks.map(b => b.genre || 'Nezaradené'))]
    .sort((a, b) => a.localeCompare(b, 'sk'));

  let html = `<a href="#" class="genre-link ${selectedGenre === 'Všetky' ? 'active' : ''}" data-genre="Všetky">
      <span class="label"><span class="swatch" style="background:var(--ink-soft);"></span>Všetky kategórie</span><span class="count">${allBooks.length}</span></a>`;

  genresPresent.forEach(genre => {
    const count = allBooks.filter(b => (b.genre || 'Nezaradené') === genre).length;
    const swatchColor = swatchColorForGenre(genre);
    html += `<a href="#" class="genre-link ${selectedGenre === genre ? 'active' : ''}" data-genre="${escapeHtml(genre)}">
        <span class="label"><span class="swatch" style="background:${swatchColor};"></span>${escapeHtml(genre)}</span><span class="count">${count}</span></a>`;
  });
  genreListContainer.innerHTML = html;
}

function renderBooks(booksToRender) {
  bookList.innerHTML = '';
  bookCount.textContent = allBooks.length;

  if (allBooks.length === 0) {
    emptyState.style.display = 'block';
    emptyState.textContent = 'Váš katalóg je zatiaľ prázdny. Pridajte prvú knihu vyššie.';
    return;
  }
  if (booksToRender.length === 0) {
    emptyState.style.display = 'block';
    emptyState.textContent = 'Žiadne knihy nezodpovedajú vášmu hľadaniu v tejto kategórii.';
    return;
  }
  emptyState.style.display = 'none';

  const byGenre = booksToRender.reduce((acc, b) => {
    const g = b.genre || 'Nezaradené';
    (acc[g] = acc[g] || []).push(b);
    return acc;
  }, {});

  if (selectedGenre === 'Všetky') {
    const genreNames = Object.keys(byGenre).sort((a, b) => a.localeCompare(b, 'sk'));
    genreNames.forEach(genre => bookList.appendChild(createGenreSection(genre, byGenre[genre])));
  } else if (byGenre[selectedGenre]) {
    const grid = document.createElement('div');
    grid.className = 'grid';
    byGenre[selectedGenre].forEach(b => grid.appendChild(createBookElement(b)));
    bookList.appendChild(grid);
  }
}

function createGenreSection(genre, books) {
  const section = document.createElement('div');
  section.className = 'genre-section';
  section.innerHTML = `<h3>${escapeHtml(genre)} <span class="tally">— ${books.length} ${books.length === 1 ? 'kniha' : 'kníh'}</span></h3>`;
  const grid = document.createElement('div');
  grid.className = 'grid';
  books.forEach(b => grid.appendChild(createBookElement(b)));
  section.appendChild(grid);
  return section;
}

function createBookElement(book) {
  const el = document.createElement('div');
  el.className = 'book-card';
  const cover = book.coverUrl;
  const spine = spineColorForGenre(book.genre);
  // "stillLoading" je true len počas aktívneho behu dopĺňania (fetchInProgress),
  // inak rovno zobrazíme placeholder chrbát — žiadne automatické hľadanie
  // na pozadí už neprebieha, dokým ho používateľ sám nespustí tlačidlom.
  const stillLoading = !cover && book.description === null && fetchInProgress;

  el.innerHTML = `
    <div class="book-cover">
      ${cover
        ? `<img src="${escapeHtml(cover)}" alt="Obal: ${escapeHtml(book.title)}" loading="lazy" data-id="${book.id}" onerror="window.__handleCoverError && window.__handleCoverError(this);">`
        : stillLoading
          ? `<span style="font-size:11px;color:var(--ink-soft);padding:8px;text-align:center;">hľadám obal…</span>`
          : `<div class="book-spine" style="background:${spine.bg}; color:${spine.fg};">
               <span class="spine-title">${escapeHtml(book.title)}</span>
               <span class="spine-author">${escapeHtml(book.author) || ''}</span>
             </div>`
      }
    </div>
    <div class="book-body">
      <p class="book-title" title="${escapeHtml(book.title)}">${escapeHtml(book.title)}</p>
      <p class="book-author">${escapeHtml(book.author) || 'Neznámy autor'}</p>
      <div class="book-actions">
        <button data-id="${book.id}" class="detail-btn">Detail</button>
        <button data-id="${book.id}" class="cover-btn" title="Nahrať vlastnú fotku obalu">📷 Obal</button>
        <button data-id="${book.id}" class="rescan-btn" title="Znova vyhľadať obal a popis">🔄 Hľadať</button>
        <button data-id="${book.id}" class="delete-btn">Odstrániť</button>
      </div>
    </div>`;
  return el;
}

// Keď zlyhá načítanie URL obalu (napr. odkaz vypršal), prepneme knihu na placeholder chrbát natrvalo
window.__handleCoverError = function(imgEl) {
  const id = imgEl.dataset.id;
  const book = allBooks.find(b => b.id === id);
  if (book) {
    book.coverUrl = null;
    saveBooks();
  }
  filterAndRenderBooks();
};

// ============================================================
// Detail modal
// ============================================================

// Jednoduchá heuristika: ak popis neobsahuje žiadnu typickú slovenskú/českú
// diakritiku (á é í ó ú ý ä ô č š ž ť ď ň ľ ř ě ů), je pravdepodobne v inom
// jazyku (najčastejšie angličtina, keďže prioritne hľadáme podľa originálu).
function descriptionLooksForeign(text) {
  if (!text) return false;
  const skczDiacritics = /[áéíóúýäôčšžťďňľřěů]/i;
  return !skczDiacritics.test(text);
}

async function handleDetailClick(bookId) {
  const book = allBooks.find(b => b.id === bookId);
  if (!book) return;
  currentModalBookId = bookId;
  exitEditMode();

  modalTitle.textContent = book.title;
  if (book.originalTitle) {
    modalOriginalTitle.textContent = book.originalTitle;
    modalOriginalTitle.style.display = 'block';
  } else {
    modalOriginalTitle.style.display = 'none';
  }
  modalAuthor.textContent = book.author || 'Neznámy autor';
  modalGenre.textContent = book.genre || 'Nezaradené';
  updateModalIsbnDisplay(book);

  bookModal.classList.remove('hidden');
  requestAnimationFrame(() => {
    bookModal.style.opacity = '1';
    bookModal.querySelector('.modal-card').style.transform = 'scale(1)';
  });

  if (book.coverUrl && book.description) {
    modalLoader.style.display = 'none';
    modalDescription.style.display = 'block';
    modalCover.src = book.coverUrl;
    modalDescription.textContent = book.description;
    updateTranslateButtonVisibility(book);
  } else {
    modalLoader.style.display = 'block';
    modalDescription.style.display = 'none';
    modalCover.removeAttribute('src');
    modalCover.style.background = 'var(--paper-deep)';
    modalTranslateBtn.style.display = 'none';

    try {
      const details = await fetchBookDetails(book.title, book.author, book.originalTitle, book, getEnabledSources());
      if (details.sources) book.sourcesTried = details.sources;
      if (!details.networkError) {
        if (!book.coverUrl) book.coverUrl = details.coverUrl; // nepreписuj vlastný/už nájdený obal
        book.description = details.description;
        saveBooks(true);
        filterAndRenderBooks();
      }

      if (book.coverUrl) {
        modalCover.src = book.coverUrl;
      } else {
        modalCover.removeAttribute('src');
      }
      modalDescription.textContent = details.networkError
        ? 'Nepodarilo sa pripojiť k internetu / Google Books API. Skús to znova neskôr.'
        : book.description;
      updateTranslateButtonVisibility(book);
    } catch (error) {
      console.error('Neočakávaná chyba pri hľadaní detailov v modale:', error);
      modalDescription.textContent = 'Nastala neočakávaná chyba pri hľadaní detailov. Skús znova kliknúť na „Detail“, alebo „Hľadať“ na karte knihy.';
    } finally {
      modalLoader.style.display = 'none';
      modalDescription.style.display = 'block';
    }
  }
}

// Zobrazí tlačidlo "Preložiť popis" len ak má kniha popis, ktorý vyzerá byť
// v inom jazyku ako slovenčina/čeština (heuristika podľa diakritiky).
function updateTranslateButtonVisibility(book) {
  const looksForeign = book.description && descriptionLooksForeign(book.description)
    && book.description !== 'Popis pre túto knihu nebol nájdený.';
  modalTranslateBtn.style.display = looksForeign ? 'inline-flex' : 'none';
}

function closeModalHandler() {
  bookModal.style.opacity = '0';
  bookModal.querySelector('.modal-card').style.transform = 'scale(0.96)';
  setTimeout(() => bookModal.classList.add('hidden'), 250);
  currentModalBookId = null;
  exitEditMode();
}

// ============================================================
// Ručná úprava knihy v detail-modale
// ============================================================

// Odstráni medzery, pomlčky a iné oddeľovače z ISBN, nech sa dá spoľahlivo
// použiť vo vyhľadávacích URL aj porovnávať (ISBN sa bežne zapisuje s rôznou
// interpunkciou, napr. "978-80-86964-09-6" aj "9788086964096" sú to isté).
function normalizeIsbn(raw) {
  if (!raw) return '';
  return raw.replace(/[^0-9Xx]/g, '').toUpperCase();
}

function updateModalIsbnDisplay(book) {
  if (book.isbn) {
    modalIsbn.textContent = 'ISBN ' + book.isbn;
    modalIsbn.style.display = 'inline';
  } else {
    modalIsbn.style.display = 'none';
  }
}

function enterEditMode() {
  const book = allBooks.find(b => b.id === currentModalBookId);
  if (!book) return;

  editTitleInput.value = book.title || '';
  editOriginalTitleInput.value = book.originalTitle || '';
  editAuthorInput.value = book.author || '';
  editIsbnInput.value = book.isbn || '';
  editGenreInput.innerHTML = GENRES.map(g =>
    `<option value="${escapeHtml(g)}" ${g === book.genre ? 'selected' : ''}>${escapeHtml(g)}</option>`
  ).join('');

  modalViewMode.style.display = 'none';
  modalEditMode.style.display = 'block';
  modalEditBtn.style.display = 'none';
  modalRescanBtn.style.display = 'none';
  modalScanIsbnBtn.style.display = 'none';
  modalGeminiSearchBtn.style.display = 'none';
  modalCoverBtn.style.display = 'none';
  modalSaveBtn.style.display = 'inline-flex';
  modalCancelEditBtn.style.display = 'inline-flex';
}

function exitEditMode() {
  modalViewMode.style.display = 'block';
  modalEditMode.style.display = 'none';
  modalEditBtn.style.display = 'inline-flex';
  modalRescanBtn.style.display = 'inline-flex';
  modalScanIsbnBtn.style.display = 'inline-flex';
  modalGeminiSearchBtn.style.display = 'inline-flex';
  modalCoverBtn.style.display = 'inline-flex';
  modalSaveBtn.style.display = 'none';
  modalCancelEditBtn.style.display = 'none';
}

function saveEditedBook() {
  const book = allBooks.find(b => b.id === currentModalBookId);
  if (!book) return;

  const newTitle = editTitleInput.value.trim();
  if (!newTitle) {
    showError('Názov knihy nemôže byť prázdny.');
    return;
  }

  const titleChanged = newTitle !== book.title;
  const authorChanged = editAuthorInput.value.trim() !== book.author;
  const originalChanged = editOriginalTitleInput.value.trim() !== (book.originalTitle || '');
  const isbnChanged = editIsbnInput.value.trim() !== (book.isbn || '');

  book.title = newTitle;
  book.author = editAuthorInput.value.trim();
  book.originalTitle = editOriginalTitleInput.value.trim();
  book.isbn = normalizeIsbn(editIsbnInput.value);
  book.genre = editGenreInput.value;

  // Ak sa zmenil názov, autor, originálny názov alebo ISBN, predošlý obal/popis
  // už nemusí sedieť — zresetujeme ich, aby sa pri ďalšom otvorení/rescane
  // vyhľadali znova. Vlastné nahraté obaly (customCover) sa zachovajú.
  if ((titleChanged || authorChanged || originalChanged || isbnChanged) && !book.customCover) {
    book.coverUrl = null;
    book.description = null;
    book.sourcesTried = {};
  }

  saveBooks(true);
  filterAndRenderBooks();
  exitEditMode();

  // Znova vykresliť modal so zaktualizovanými údajmi
  modalTitle.textContent = book.title;
  if (book.originalTitle) {
    modalOriginalTitle.textContent = book.originalTitle;
    modalOriginalTitle.style.display = 'block';
  } else {
    modalOriginalTitle.style.display = 'none';
  }
  modalAuthor.textContent = book.author || 'Neznámy autor';
  modalGenre.textContent = book.genre || 'Nezaradené';
  updateModalIsbnDisplay(book);

  if (!book.coverUrl) {
    rescanFromModal();
  } else {
    modalCover.src = book.coverUrl;
    modalDescription.textContent = book.description || 'Popis pre túto knihu nebol nájdený.';
  }
}

async function rescanFromModal() {
  const book = allBooks.find(b => b.id === currentModalBookId);
  if (!book) return;

  modalRescanBtn.disabled = true;
  modalRescanBtn.textContent = '… hľadám';
  modalLoader.style.display = 'block';
  modalDescription.style.display = 'none';
  modalCover.removeAttribute('src');
  modalCover.style.background = 'var(--bg-sunk)';

  try {
    // Manuálny rescan ignoruje predošlý sourcesTried stav aj výber zdrojov v paneli —
    // používateľ to klikol zámerne, takže chceme skutočne znova skúsiť všetky tri zdroje.
    book.sourcesTried = {};
    const details = await fetchBookDetails(book.title, book.author, book.originalTitle, book, { openLibrary: true, googleBooks: true, wikidata: true });
    if (details.sources) book.sourcesTried = details.sources;
    if (!details.networkError) {
      book.coverUrl = details.coverUrl;
      book.description = details.description;
      saveBooks(true);
      filterAndRenderBooks();
    }
    if (book.coverUrl) {
      modalCover.src = book.coverUrl;
    } else {
      modalCover.removeAttribute('src');
    }
    modalDescription.textContent = details.networkError
      ? 'Nepodarilo sa pripojiť k internetu / Google Books API. Skús to znova neskôr.'
      : (book.description || 'Popis pre túto knihu nebol nájdený.');
  } catch (error) {
    console.error('Neočakávaná chyba pri rescan z modalu:', error);
    modalDescription.textContent = 'Nastala neočakávaná chyba pri hľadaní detailov. Skús to znova.';
  } finally {
    modalLoader.style.display = 'none';
    modalDescription.style.display = 'block';
    modalRescanBtn.disabled = false;
    modalRescanBtn.textContent = '🔄 Hľadať znova';
  }
}

// ============================================================
// Gemini API — rozpoznávanie kníh z fotky (vyžaduje vlastný kľúč)
// ============================================================

async function analyzeImage(base64ImageData) {
  const apiKey = (localStorage.getItem(API_KEY_STORAGE) || '').trim();
  if (!apiKey) {
    showError('Pre rozpoznávanie z fotky najprv vlož svoj Gemini API kľúč do panela vľavo.');
    return;
  }

  showLoader('Analyzujem fotku… môže to chvíľu trvať.');

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const systemPrompt = "You are an expert librarian AI. Your task is to accurately identify book titles and authors from images of bookshelves.";
  const userQuery = "From the provided image, identify all visible book titles and their authors. Respond ONLY with a valid JSON array of objects. Each object should have two keys: 'title' and 'author'. If an author is not visible, set the author's value to an empty string. Example: [{\"title\": \"The Hobbit\", \"author\": \"J.R.R. Tolkien\"}]. Do not include any text, notes or markdown formatting before or after the JSON array.";

  const payload = {
    contents: [{
      parts: [
        { text: userQuery },
        { inlineData: { mimeType: "image/jpeg", data: base64ImageData } }
      ]
    }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: { responseMimeType: "application/json" }
  };

  let attempts = 0;
  const maxAttempts = 4;
  while (attempts < maxAttempts) {
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        if (response.status === 400 || response.status === 403) {
          const errBody = await response.json().catch(() => null);
          throw { fatal: true, message: errBody?.error?.message || `API kľúč bol odmietnutý (HTTP ${response.status}).` };
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const candidate = result.candidates?.[0];

      if (candidate && candidate.content?.parts?.[0]?.text) {
        const identifiedBooks = JSON.parse(candidate.content.parts[0].text);
        if (Array.isArray(identifiedBooks) && identifiedBooks.length > 0) {
          statusMessage.textContent = `Našiel som ${identifiedBooks.length} kníh. Pridávam do katalógu a hľadám obaly…`;
          for (const b of identifiedBooks) {
            await addBook(b.title, b.author || '', "Naskenované z fotky", '', true);
          }
          await fetchAllMissingDetails();
        } else {
          showError('Na fotke sa nepodarilo rozpoznať žiadne knihy. Skús jasnejšiu fotku chrbtov kníh.');
        }
      } else {
        throw new Error("Neočakávaná štruktúra odpovede od AI.");
      }
      hideLoader();
      return;
    } catch (error) {
      if (error && error.fatal) {
        showError(error.message);
        return;
      }
      attempts++;
      console.error(`Pokus ${attempts} zlyhal:`, error);
      if (attempts >= maxAttempts) {
        showError("Nepodarilo sa analyzovať obrázok ani po viacerých pokusoch. Skús to znova o chvíľu.");
        break;
      }
      await new Promise(res => setTimeout(res, Math.pow(2, attempts) * 1000));
    }
  }
}

// Rozpozná ISBN z fotky zadnej strany knihy (čiarový kód alebo vytlačené číslo)
// a priamo ho priradí ku konkrétnej knihe v katalógu (volá sa z detailu knihy).
async function analyzeIsbnImage(book, base64ImageData) {
  const apiKey = (localStorage.getItem(API_KEY_STORAGE) || '').trim();
  if (!apiKey) {
    showError('Pre rozpoznávanie ISBN z fotky najprv vlož svoj Gemini API kľúč do panela vľavo.');
    return null;
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const systemPrompt = "You are an expert at reading ISBN numbers from photos of book covers and barcodes.";
  const userQuery = "From the provided image, find the ISBN number (it is often printed near a barcode, may be labeled 'ISBN' and is typically 10 or 13 digits, sometimes with hyphens). Respond ONLY with a valid JSON object: {\"isbn\": \"the ISBN digits found, no hyphens or spaces\" or null if none is visible}. Do not include any other text.";

  const payload = {
    contents: [{
      parts: [
        { text: userQuery },
        { inlineData: { mimeType: "image/jpeg", data: base64ImageData } }
      ]
    }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: { responseMimeType: "application/json" }
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => null);
      showError('Rozpoznanie ISBN sa nepodarilo: ' + (errBody?.error?.message || ('HTTP ' + response.status)));
      return null;
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      showError('Gemini nevrátil žiadnu odpoveď. Skús to znova s jasnejšou fotkou.');
      return null;
    }

    const parsed = JSON.parse(text);
    const isbn = normalizeIsbn(parsed.isbn || '');
    if (!isbn || (isbn.length !== 10 && isbn.length !== 13)) {
      showError('Na fotke sa nepodarilo nájsť čitateľné ISBN. Skús odfotiť čiarový kód/ISBN zblízka a v dobrom svetle.');
      return null;
    }
    return isbn;
  } catch (error) {
    console.error('Chyba pri rozpoznávaní ISBN:', error);
    showError('Nepodarilo sa spojiť s Gemini API pre rozpoznanie ISBN. Skontroluj pripojenie.');
    return null;
  }
}

// ============================================================
// Event listeners
// ============================================================

imageUpload.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) {
    fileNameDisplay.textContent = `Vybraný súbor: ${file.name}`;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result.replace('data:', '').replace(/^.+,/, '');
      analyzeImage(base64String);
    };
    reader.onerror = () => showError("Chyba pri načítavaní súboru.");
    reader.readAsDataURL(file);
  }
});

addBookForm.addEventListener('submit', (event) => {
  event.preventDefault();
  addBook(bookTitleInput.value, bookAuthorInput.value, bookGenreInput.value, bookOriginalTitleInput.value);
  addBookForm.reset();
  populateGenreSelect();
});

searchInput.addEventListener('input', filterAndRenderBooks);

genreListContainer.addEventListener('click', (e) => {
  e.preventDefault();
  const link = e.target.closest('.genre-link');
  if (link && link.dataset.genre) {
    selectedGenre = link.dataset.genre;
    filterAndRenderBooks();
  }
});

bookList.addEventListener('click', (event) => {
  const target = event.target.closest('button');
  if (!target) return;
  if (target.classList.contains('delete-btn')) {
    if (confirm('Naozaj chceš odstrániť túto knihu z katalógu?')) {
      deleteBook(target.dataset.id);
    }
  }
  if (target.classList.contains('detail-btn')) {
    handleDetailClick(target.dataset.id);
  }
  if (target.classList.contains('cover-btn')) {
    customCoverUpload.dataset.targetId = target.dataset.id;
    customCoverUpload.click();
  }
  if (target.classList.contains('rescan-btn')) {
    rescanBook(target.dataset.id, target);
  }
});

// Vynúti znova vyhľadanie obalu/popisu pre jednu konkrétnu knihu,
// nezávisle od hromadného dopĺňania a bez ohľadu na to, či už obal má.
async function rescanBook(bookId, buttonEl) {
  const book = allBooks.find(b => b.id === bookId);
  if (!book) return;

  if (buttonEl) {
    buttonEl.disabled = true;
    buttonEl.textContent = '… hľadám';
  }

  try {
    // Manuálny rescan ignoruje predošlý sourcesTried stav aj výber zdrojov v paneli —
    // používateľ to klikol zámerne, takže chceme skutočne znova skúsiť všetky tri zdroje.
    book.sourcesTried = {};
    const details = await fetchBookDetails(book.title, book.author, book.originalTitle, book, { openLibrary: true, googleBooks: true, wikidata: true });
    if (details.sources) book.sourcesTried = details.sources;
    if (!details.networkError) {
      book.coverUrl = details.coverUrl;
      book.description = details.description;
      saveBooks(true);
    } else {
      showError('Nepodarilo sa znova vyhľadať túto knihu — skontroluj pripojenie alebo to skús neskôr.');
    }
  } catch (error) {
    console.error('Neočakávaná chyba pri rescan:', error);
    showError('Nastala neočakávaná chyba pri hľadaní. Skús to znova.');
  } finally {
    filterAndRenderBooks();
  }
}

modalCoverBtn.addEventListener('click', () => {
  if (!currentModalBookId) return;
  customCoverUpload.dataset.targetId = currentModalBookId;
  customCoverUpload.click();
});

modalTranslateBtn.addEventListener('click', async () => {
  const book = allBooks.find(b => b.id === currentModalBookId);
  if (!book) return;

  modalTranslateBtn.disabled = true;
  modalTranslateBtn.textContent = '… prekladám';

  const translated = await translateDescription(book);
  if (translated) {
    book.description = translated;
    saveBooks(true);
    modalDescription.textContent = translated;
    filterAndRenderBooks();
  }

  modalTranslateBtn.disabled = false;
  modalTranslateBtn.textContent = '🌐 Preložiť popis';
  updateTranslateButtonVisibility(book);
});

modalEditBtn.addEventListener('click', enterEditMode);
modalCancelEditBtn.addEventListener('click', exitEditMode);
modalSaveBtn.addEventListener('click', saveEditedBook);
modalRescanBtn.addEventListener('click', rescanFromModal);

modalGeminiSearchBtn.addEventListener('click', async () => {
  const book = allBooks.find(b => b.id === currentModalBookId);
  if (!book) return;

  modalGeminiSearchBtn.disabled = true;
  modalGeminiSearchBtn.textContent = '… hľadám na webe';
  errorMessage.textContent = '';

  const result = await searchViaGeminiWeb(book);
  if (result) {
    if (result.description) {
      book.description = result.description;
      saveBooks(true);
      filterAndRenderBooks();
      modalDescription.textContent = book.description;
      updateTranslateButtonVisibility(book);
    }

    if (result.pageUrl) {
      // Gemini cez webové vyhľadávanie nevie spoľahlivo poskytnúť priamu
      // funkčnú URL obrázka — namiesto toho ukážeme odkaz na stránku
      // (antikvariát/databáza), odkiaľ si obal vieš ručne stiahnuť a nahrať
      // cez tlačidlo "📷 Nahrať obal".
      const safeUrl = escapeHtml(result.pageUrl);
      const linkLabel = result.pageSource ? `Otvoriť na ${escapeHtml(result.pageSource)}` : 'Otvoriť nájdenú stránku';
      errorMessage.innerHTML = `Gemini našiel možný zdroj obalu: <a href="${safeUrl}" target="_blank" rel="noopener" style="color:var(--accent); text-decoration:underline;">${linkLabel}</a> — obal si odtiaľ môžeš stiahnuť a nahrať tlačidlom „📷 Nahrať obal“.`;
    } else if (!result.description) {
      errorMessage.textContent = 'Gemini cez webové vyhľadávanie nenašiel pre túto knihu žiadnu stránku s obalom ani popis.';
    }
  }

  modalGeminiSearchBtn.disabled = false;
  modalGeminiSearchBtn.textContent = '🔎 Hľadať cez Gemini (web)';
});

modalScanIsbnBtn.addEventListener('click', () => {
  if (!currentModalBookId) return;
  isbnScanUpload.click();
});

isbnScanUpload.addEventListener('change', (event) => {
  const file = event.target.files[0];
  const bookId = currentModalBookId;
  if (!file || !bookId) return;

  const book = allBooks.find(b => b.id === bookId);
  if (!book) return;

  modalScanIsbnBtn.disabled = true;
  modalScanIsbnBtn.textContent = '… čítam ISBN';

  const reader = new FileReader();
  reader.onloadend = async () => {
    const base64String = reader.result.replace('data:', '').replace(/^.+,/, '');
    const isbn = await analyzeIsbnImage(book, base64String);

    if (isbn) {
      book.isbn = isbn;
      // Nové ISBN — predošlý obal/popis (ak vznikol z menej presného fulltextového
      // vyhľadávania) môže byť nahradený presnejším výsledkom podľa ISBN.
      if (!book.customCover) {
        book.sourcesTried = {};
      }
      saveBooks(true);
      updateModalIsbnDisplay(book);
      filterAndRenderBooks();
      statusMessage.textContent = `Rozpoznané ISBN: ${isbn}. Hľadám obal a popis…`;
      await rescanFromModal();
      statusMessage.textContent = '';
    }

    modalScanIsbnBtn.disabled = false;
    modalScanIsbnBtn.textContent = '📷 Odfotiť ISBN';
  };
  reader.onerror = () => {
    showError('Chyba pri načítavaní súboru.');
    modalScanIsbnBtn.disabled = false;
    modalScanIsbnBtn.textContent = '📷 Odfotiť ISBN';
  };
  reader.readAsDataURL(file);

  isbnScanUpload.value = '';
});

customCoverUpload.addEventListener('change', (event) => {
  const file = event.target.files[0];
  const bookId = customCoverUpload.dataset.targetId;
  if (!file || !bookId) return;

  const book = allBooks.find(b => b.id === bookId);
  if (!book) return;

  resizeImageToDataUrl(file, 400, 600, (dataUrl) => {
    book.coverUrl = dataUrl;
    book.customCover = true;
    saveBooks(true);
    filterAndRenderBooks();
    if (currentModalBookId === bookId) {
      modalCover.src = dataUrl;
    }
  }, () => {
    showError('Nepodarilo sa spracovať obrázok. Skús iný súbor.');
  });

  customCoverUpload.value = '';
});

// Zmenší nahraný obrázok na rozumnú veľkosť a vráti ho ako data URL (JPEG),
// nech localStorage nepretečie pri väčšom množstve vlastných obalov.
function resizeImageToDataUrl(file, maxW, maxH, onDone, onError) {
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      const ratio = Math.min(maxW / width, maxH / height, 1);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      try {
        onDone(canvas.toDataURL('image/jpeg', 0.85));
      } catch (e) {
        onError(e);
      }
    };
    img.onerror = onError;
    img.src = reader.result;
  };
  reader.onerror = onError;
  reader.readAsDataURL(file);
}

retryDetailsBtn.addEventListener('click', () => {
  rateLimitedUntil = 0;
  lastNetworkErrorShown = false;
  hideRetryButton();
  errorMessage.textContent = '';
  fetchAllMissingDetails();
});

fetchMissingBtn.addEventListener('click', () => {
  lastNetworkErrorShown = false;
  errorMessage.textContent = '';
  hideRetryButton();
  fetchAllMissingDetails();
});

stopFetchBtn.addEventListener('click', () => {
  fetchShouldStop = true;
  stopFetchBtn.disabled = true;
  stopFetchBtn.textContent = '⏹ Zastavujem…';
  setTimeout(() => {
    stopFetchBtn.disabled = false;
    stopFetchBtn.textContent = '⏹ Zastaviť';
  }, 2000);
});

exportBtn.addEventListener('click', exportCatalog);

importBtn.addEventListener('click', () => {
  importFileInput.click();
});

importFileInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) importCatalog(file);
  importFileInput.value = '';
});

closeModal.addEventListener('click', closeModalHandler);
bookModal.addEventListener('click', (e) => {
  if (e.target === bookModal) closeModalHandler();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !bookModal.classList.contains('hidden')) closeModalHandler();
});

// ============================================================
// Štart
// ============================================================

async function init() {
  populateGenreSelect();
  loadApiKey();
  loadBooksApiKey();

  // Zobrazíme hneď lokálnu (cache) verziu, nech používateľ nečaká na sieť…
  loadLocalBooksOnly();
  filterAndRenderBooks();

  // …a na pozadí dotiahneme/zosynchronizujeme cloud verziu.
  await loadBooks();
  filterAndRenderBooks();

  // Dopĺňanie obalov/popisov sa už nespúšťa automaticky pri každom otvorení
  // stránky (spôsobovalo to zbytočné opakované vyčerpávanie API kvót) —
  // spustí sa len manuálne, tlačidlom "Doplniť chýbajúce obaly".
  updateFetchMissingButtonLabel();
}

document.addEventListener('DOMContentLoaded', init);
