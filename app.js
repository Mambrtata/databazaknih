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

// Mapa SK názov žánru → i18n kľúč. Samotné hodnoty v GENRES a v book.genre
// ostávajú kanonické (slovenské) — podľa nich sa filtruje a porovnáva. Prekladá
// sa len ZOBRAZENIE cez displayGenre(). Sem patrí aj "Nezaradené" (fallback
// hodnota), nech sa preloží aj tá, keď sa zobrazuje.
const GENRE_KEYS = {
  "Svetová klasika": "genre_worldClassics",
  "Slovenská a česká literatúra": "genre_slovakCzech",
  "Spoločenské a psychologické romány": "genre_socialPsych",
  "Historické a dobrodružné romány": "genre_histAdventure",
  "Krimi, thrillery a špionážne romány": "genre_crimeThriller",
  "Vojnové romány": "genre_war",
  "Humor a satira": "genre_humorSatire",
  "Sci-fi a fantasy": "genre_scifiFantasy",
  "Povesti a legendy": "genre_talesLegends",
  "Nezaradená beletria": "genre_otherFiction",
  "Poézia": "genre_poetry",
  "Životopisy a Dejiny": "genre_bioHistory",
  "Umenie, Dizajn a Architektúra": "genre_artDesign",
  "Veda, Príroda a Cestopisy": "genre_scienceNature",
  "Spoločnosť, Psychológia a Ostatné": "genre_societyPsych",
  "Slovníky a Učebnice": "genre_dictTextbooks",
  "Publikácie, Sprievodcovia a Kolektívne diela": "genre_publications",
  "Neznámy / Nečitateľný autor": "genre_unknownAuthor",
  "Naskenované z fotky": "genre_scannedFromPhoto",
  "Nezaradené": "uncategorized",
};

// Preloží žáner len na zobrazenie; internú hodnotu (book.genre) nemení.
function displayGenre(g) {
  return GENRE_KEYS[g] ? t(GENRE_KEYS[g]) : g;
}

// Správny tvar slova "kniha" podľa počtu a jazyka rozhrania. SK má trojtvar
// (1 kniha / 2–4 knihy / 5+ kníh), EN má book/books.
function bookCountWord(n) {
  if (getUiLanguage() === 'en') return n === 1 ? 'book' : 'books';
  return n === 1 ? 'kniha' : (n < 5 ? 'knihy' : 'kníh');
}

// Preloží zdroj obalu len na zobrazenie. Hodnota "Aktuálny" ostáva kanonická,
// lebo sa podľa nej porovnáva (odstránenie aktuálneho pseudo-obalu).
function displaySource(src) {
  return src === 'Aktuálny' ? t('current') : src;
}

const STORAGE_KEY_BASE = "domaca_kniznica_books_v1";

// localStorage kľúč MUSÍ byť viazaný na konkrétneho prihláseného používateľa —
// inak by sa pri prepnutí medzi účtami v tom istom prehliadači krátko zobrazili
// (a prípadne aj zapísali do cloudu druhého účtu) dáta predošlého používateľa.
// Bez prihláseného používateľa (napr. počas úvodného načítavania pred auth)
// použijeme spoločný "anon" kľúč, ktorý sa prakticky nikdy reálne nepoužije
// na uloženie dát (appka v tomto stave nezobrazuje katalóg).
function getStorageKey() {
  const userId = currentUser?.id || 'anon';
  return STORAGE_KEY_BASE + '_' + userId;
}
const API_KEY_STORAGE = "domaca_kniznica_gemini_key";
const BOOKS_API_KEY_STORAGE = "domaca_kniznica_books_api_key";
const LANGUAGE_STORAGE = "domaca_kniznica_language";

// Jazyky, do ktorých vie appka automaticky prekladať popisy. Kód je BCP-47,
// "name" je anglický názov jazyka pre Gemini prompt (presnejšie než skratka),
// "label" je to, čo vidí používateľ vo výbere.
const SUPPORTED_LANGUAGES = [
  { code: 'sk', name: 'Slovak', label: t('lang_sk') },
  { code: 'cs', name: 'Czech', label: t('lang_cs') },
  { code: 'en', name: 'English', label: t('lang_en') },
  { code: 'de', name: 'German', label: t('lang_de') },
  { code: 'pl', name: 'Polish', label: t('lang_pl') },
  { code: 'hu', name: 'Hungarian', label: t('lang_hu') },
  { code: 'fr', name: 'French', label: t('lang_fr') },
  { code: 'es', name: 'Spanish', label: t('lang_es') },
  { code: 'it', name: 'Italian', label: t('lang_it') },
];

function getUserLanguage() {
  const saved = localStorage.getItem(LANGUAGE_STORAGE);
  if (saved) return saved;
  // Nový používateľ (žiadna uložená voľba) — odhadni podľa prehliadača.
  // 'en*' → angličtina, čeština → 'cs', inak predvolene slovenčina.
  const nav = (navigator.language || navigator.userLanguage || 'sk').toLowerCase();
  if (nav.startsWith('en')) return 'en';
  if (nav.startsWith('cs')) return 'cs';
  return 'sk';
}

// Mapuje jazyk knižnice (2-písmenový kód z SUPPORTED_LANGUAGES) na zoznam
// preferovaných Open Library jazykových kódov (3-písmenové ISO 639-2),
// zoradených od najpreferovanejšieho. Pre slovenčinu preferujeme aj
// české vydania — pre staršie/menej známe knihy je české vydanie často
// jediné dostupné v inom jazyku než angličtina, a je bližšie originálu
// než čisto anglický preklad.
const OL_LANGUAGE_PREFERENCE = {
  sk: ['slo', 'cze'],
  cs: ['cze', 'slo'],
  en: ['eng'],
  de: ['ger'],
  pl: ['pol'],
  hu: ['hun'],
  fr: ['fre'],
  es: ['spa'],
  it: ['ita'],
};

function getPreferredOlLanguages() {
  return OL_LANGUAGE_PREFERENCE[getUserLanguage()] || ['eng'];
}

function getLanguageInfo(code) {
  return SUPPORTED_LANGUAGES.find(l => l.code === code) || SUPPORTED_LANGUAGES[0];
}
const SORT_PREFERENCE_STORAGE = "domaca_kniznica_sort_pref";
const VIEW_MODE_STORAGE = "domaca_kniznica_view_mode";
let currentViewMode = localStorage.getItem(VIEW_MODE_STORAGE) || 'grid';

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

// Hue (odtieň, 0-360°) pre každý žáner — používa sa len v knižnej poličke
// na veľmi jemné, takmer biele zafarbenie chrbtov (pozri shelfSpineColor).
// Rovnaké poradie ako GENRES, cyklicky.
const SHELF_HUE_PALETTE = [25, 95, 8, 145, 50, 200, 35, 70]; // širšie zemité spektrum: terakota, oliva, tehlová, šalviová, okrová, bridlicová, horčicová, mach

// Vygeneruje jemný gradient pre chrbát knihy — odtieň podľa žánru
// (konzistentný naprieč celou kategóriou). Intenzita farby je pre KAŽDÚ
// knihu iná — niektoré knihy majú farbu sotva badateľnú (takmer biele),
// iné majú plnú intenzitu (MAX_SAT/MAX_CONTRAST), väčšina niečo medzi —
// presne ako majú skutočné knihy v rámci tej istej farebnej "rodiny"
// rôzne sýte chrbty, nie všetky rovnako výrazné.
function shelfSpineColor(book) {
  const idx = GENRES.indexOf(book.genre);
  const hue = SHELF_HUE_PALETTE[(idx >= 0 ? idx : (book.genre || '').length) % SHELF_HUE_PALETTE.length];

  // Deterministická "náhodná" intenzita podľa id knihy — rovnaká kniha má
  // vždy rovnakú farbu pri každom vykreslení, nemení sa pri každom reloade.
  let seed = 0;
  for (let i = 0; i < book.id.length; i++) seed = (seed * 31 + book.id.charCodeAt(i)) % 1000;
  const intensity = seed / 1000; // 0 = takmer biela, 1 = maximálna farba (horný limit)

  const MAX_SAT = 34;      // sýtosť pri intensity=1 (zhoduje sa s predošlým "max" stavom)
  const MAX_CONTRAST = 9;  // rozdiel okraj/stred pri intensity=1

  const satBase = intensity * MAX_SAT;                  // 0–34%
  const lightCenter = 98 - intensity * 7;                // 98% (biela) → 91% pri plnej intenzite
  const lightEdge = lightCenter - intensity * MAX_CONTRAST;

  const center = `hsl(${hue}, ${satBase}%, ${lightCenter}%)`;
  const edge = `hsl(${hue}, ${satBase}%, ${lightEdge}%)`;
  const highlight = `hsl(${hue}, ${Math.max(0, satBase - 10)}%, ${Math.min(98, lightCenter + 5)}%)`;
  return `linear-gradient(to right, ${edge} 0%, ${center} 15%, ${highlight} 50%, ${center} 85%, ${edge} 100%)`;
}

function swatchColorForGenre(genre) {
  const idx = GENRES.indexOf(genre);
  const i = idx >= 0 ? idx : (genre || '').length;
  return SWATCH_PALETTE[i % SWATCH_PALETTE.length];
}

// --- DOM elementy ---
const openIsbnScanBtn = document.getElementById('openIsbnScanBtn'),
  isbnScanModal = document.getElementById('isbnScanModal'),
  isbnScanStatus = document.getElementById('isbnScanStatus'),
  isbnScanVideoWrap = document.getElementById('isbnScanVideoWrap'),
  isbnScanVideo = document.getElementById('isbnScanVideo'),
  isbnScanFallback = document.getElementById('isbnScanFallback'),
  isbnScanFallbackUpload = document.getElementById('isbnScanFallbackUpload'),
  isbnScanCancelBtn = document.getElementById('isbnScanCancelBtn'),
  shelfAddUpload = document.getElementById('shelfAddUpload'),
  openManualAddBtn = document.getElementById('openManualAddBtn'),
  manualAddPanel = document.getElementById('manualAddPanel'),
  addFlowStatus = document.getElementById('addFlowStatus'),
  addBookForm = document.getElementById('addBookForm'),
  bookTitleInput = document.getElementById('bookTitle'),
  bookAuthorInput = document.getElementById('bookAuthor'),
  bookOriginalTitleInput = document.getElementById('bookOriginalTitle'),
  bookIsbnInput = document.getElementById('bookIsbn'),
  bookGenreInput = document.getElementById('bookGenre'),
  shelfReviewModal = document.getElementById('shelfReviewModal'),
  shelfReviewSummary = document.getElementById('shelfReviewSummary'),
  shelfReviewList = document.getElementById('shelfReviewList'),
  shelfReviewAddBtn = document.getElementById('shelfReviewAddBtn'),
  shelfReviewSelectAllBtn = document.getElementById('shelfReviewSelectAllBtn'),
  shelfReviewCancelBtn = document.getElementById('shelfReviewCancelBtn'),
  importChoiceModal = document.getElementById('importChoiceModal'),
  importChoiceSummary = document.getElementById('importChoiceSummary'),
  importMergeBtn = document.getElementById('importMergeBtn'),
  importReplaceBtn = document.getElementById('importReplaceBtn'),
  importCancelBtn = document.getElementById('importCancelBtn'),
  bookList = document.getElementById('bookList'),
  loader = document.getElementById('loader'),
  statusMessage = document.getElementById('statusMessage'),
  errorMessage = document.getElementById('errorMessage'),
  modalErrorMessage = document.getElementById('modalErrorMessage'),
  emptyState = document.getElementById('emptyState'),
  searchInput = document.getElementById('searchInput'),
  filterLoanedBtn = document.getElementById('filterLoanedBtn'),
  viewGridBtn = document.getElementById('viewGridBtn'),
  viewShelfBtn = document.getElementById('viewShelfBtn'),
  sortSelect = document.getElementById('sortSelect'),
  bookCount = document.getElementById('bookCount'),
  ledgerCount = document.getElementById('ledgerCount'),
  currentUserLabel = document.getElementById('currentUserLabel'),
  syncStatusEl = document.getElementById('syncStatus'),
  genreListContainer = document.getElementById('genreList'),
  authorListContainer = document.getElementById('authorList'),
  authorSearchInput = document.getElementById('authorSearch'),
  sidebarPanel = document.getElementById('sidebarPanel'),
  mobileCategoriesToggle = document.getElementById('mobileCategoriesToggle'),
  mobileCategoriesActiveLabel = document.getElementById('mobileCategoriesActiveLabel'),
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
  languageSelect = document.getElementById('languageSelect'),
  apiKeyStatus = document.getElementById('apiKeyStatus'),
  booksApiKeyInput = document.getElementById('booksApiKeyInput'),
  booksApiKeyStatus = document.getElementById('booksApiKeyStatus'),
  retryDetailsBtn = document.getElementById('retryDetailsBtn'),
  scanOverlay = document.getElementById('scanOverlay'),
  scanTitle = document.getElementById('scanTitle'),
  scanSubtitle = document.getElementById('scanSubtitle'),
  toastContainer = document.getElementById('toastContainer'),
  fetchMissingBtn = document.getElementById('fetchMissingBtn'),
  fillAllBtn = document.getElementById('fillAllBtn'),
  fillAllProgress = document.getElementById('fillAllProgress'),
  fillAllSummary = document.getElementById('fillAllSummary'),
  fillAllBadge = document.getElementById('fillAllBadge'),
  fillAllMoreBtn = document.getElementById('fillAllMoreBtn'),
  fillAllMoreMenu = document.getElementById('fillAllMoreMenu'),
  phaseCovers = document.getElementById('phaseCovers'),
  phaseIsbn = document.getElementById('phaseIsbn'),
  phaseMeta = document.getElementById('phaseMeta'),
  stopFetchBtn = document.getElementById('stopFetchBtn'),
  sourceCatalogCheckbox = document.getElementById('sourceCatalog'),
  sourceOpenLibraryCheckbox = document.getElementById('sourceOpenLibrary'),
  sourceGoogleBooksCheckbox = document.getElementById('sourceGoogleBooks'),
  sourceWikidataCheckbox = document.getElementById('sourceWikidata'),
  missingCoversInfo = document.getElementById('missingCoversInfo'),
  bulkFindIsbnBtn = document.getElementById('bulkFindIsbnBtn'),
  missingIsbnInfo = document.getElementById('missingIsbnInfo'),
  bulkFindMetaBtn = document.getElementById('bulkFindMetaBtn'),
  missingMetaInfo = document.getElementById('missingMetaInfo'),
  customCoverUpload = document.getElementById('customCoverUpload'),
  modalCoverBtn = document.getElementById('modalCoverBtn'),
  modalCoverPickBtn = document.getElementById('modalCoverPickBtn'),
  coverGalleryModal = document.getElementById('coverGalleryModal'),
  coverGalleryGrid = document.getElementById('coverGalleryGrid'),
  coverGalleryStatus = document.getElementById('coverGalleryStatus'),
  coverGalleryCloseBtn = document.getElementById('coverGalleryCloseBtn'),
  coverGalleryGenerateBtn = document.getElementById('coverGalleryGenerateBtn'),
  coverGalleryWebSearchBtn = document.getElementById('coverGalleryWebSearchBtn'),
  coverGallerySearchDbBtn = document.getElementById('coverGallerySearchDbBtn'),
  coverGalleryUploadBtn = document.getElementById('coverGalleryUploadBtn'),
  coverGalleryRemoveBtn = document.getElementById('coverGalleryRemoveBtn'),
  coverGalleryUrlBox = document.getElementById('coverGalleryUrlBox'),
  coverGalleryUrlInput = document.getElementById('coverGalleryUrlInput'),
  coverGalleryUrlConfirm = document.getElementById('coverGalleryUrlConfirm'),
  coverGalleryUrlCancel = document.getElementById('coverGalleryUrlCancel'),
  coverGalleryPasteBtn = document.getElementById('coverGalleryPasteBtn'),
  modalTranslateBtn = document.getElementById('modalTranslateBtn'),
  aiConfirmModal = document.getElementById('aiConfirmModal'),
  aiConfirmTitle = document.getElementById('aiConfirmTitle'),
  aiConfirmStatus = document.getElementById('aiConfirmStatus'),
  aiConfirmText = document.getElementById('aiConfirmText'),
  aiConfirmSaveBtn = document.getElementById('aiConfirmSaveBtn'),
  aiConfirmCancelBtn = document.getElementById('aiConfirmCancelBtn'),
  aiConfirmCloseBtn = document.getElementById('aiConfirmCloseBtn'),
  modalCoverAiBadge = document.getElementById('modalCoverAiBadge'),
  modalDescAiBadge = document.getElementById('modalDescAiBadge'),
  modalRating = document.getElementById('modalRating'),
  modalRatingClear = document.getElementById('modalRatingClear'),
  themeToggle = document.getElementById('themeToggle'),
  modalViewMode = document.getElementById('modalViewMode'),
  modalEditMode = document.getElementById('modalEditMode'),
  modalEditBtn = document.getElementById('modalEditBtn'),
  modalReadBtn = document.getElementById('modalReadBtn'),
  modalReadIcon = document.getElementById('modalReadIcon'),
  modalReadLabel = document.getElementById('modalReadLabel'),
  modalLoanSection = document.getElementById('modalLoanSection'),
  modalLoanInfo = document.getElementById('modalLoanInfo'),
  modalLoanName = document.getElementById('modalLoanName'),
  modalLoanDate = document.getElementById('modalLoanDate'),
  modalLoanBtn = document.getElementById('modalLoanBtn'),
  modalLoanIconBtn = document.getElementById('modalLoanIconBtn'),
  modalLoanIconLabel = document.getElementById('modalLoanIconLabel'),
  modalReturnBtn = document.getElementById('modalReturnBtn'),
  modalWhatsAppBtn = document.getElementById('modalWhatsAppBtn'),
  modalLoanForm = document.getElementById('modalLoanForm'),
  modalLoanNameInput = document.getElementById('modalLoanNameInput'),
  modalLoanConfirmBtn = document.getElementById('modalLoanConfirmBtn'),
  modalLoanCancelBtn = document.getElementById('modalLoanCancelBtn'),
  modalSaveBtn = document.getElementById('modalSaveBtn'),
  modalCancelEditBtn = document.getElementById('modalCancelEditBtn'),
  modalPrimaryActions = document.getElementById('modalPrimaryActions'),
  modalEditActions = document.getElementById('modalEditActions'),
  modalMoreBtn = document.getElementById('modalMoreBtn'),
  modalMoreMenu = document.getElementById('modalMoreMenu'),
  modalRescanBtn = document.getElementById('modalRescanBtn'),
  matchModal = document.getElementById('matchModal'),
  matchGrid = document.getElementById('matchGrid'),
  matchStatus = document.getElementById('matchStatus'),
  matchCloseBtn = document.getElementById('matchCloseBtn'),
  modalGeminiSearchBtn = document.getElementById('modalGeminiSearchBtn'),
  modalAiBtn = document.getElementById('modalAiBtn'),
  modalScanIsbnBtn = document.getElementById('modalScanIsbnBtn'),
  modalIsbn = document.getElementById('modalIsbn'),
  modalMeta = document.getElementById('modalMeta'),
  editTitleInput = document.getElementById('editTitle'),
  editOriginalTitleInput = document.getElementById('editOriginalTitle'),
  editAuthorInput = document.getElementById('editAuthor'),
  editIsbnInput = document.getElementById('editIsbn'),
  editPublishYearInput = document.getElementById('editPublishYear'),
  editPageCountInput = document.getElementById('editPageCount'),
  editGenreInput = document.getElementById('editGenre'),
  exportBtn = document.getElementById('exportBtn'),
  migratePanel = document.getElementById('migratePanel'),
  migrateLegacyBtn = document.getElementById('migrateLegacyBtn'),
  migrateStatus = document.getElementById('migrateStatus'),
  publicToggle = document.getElementById('publicToggle'),
  publicLinkBox = document.getElementById('publicLinkBox'),
  publicLinkInput = document.getElementById('publicLinkInput'),
  copyPublicLinkBtn = document.getElementById('copyPublicLinkBtn'),
  publicStatus = document.getElementById('publicStatus'),
  exportCsvBtn = document.getElementById('exportCsvBtn'),
  importBtn = document.getElementById('importBtn'),
  importFileInput = document.getElementById('importFileInput'),
  importStatus = document.getElementById('importStatus');

let allBooks = [];
let selectedGenre = 'Všetky';
let selectedAuthor = null;
let filterLoaned = false;
let detailsFetchInitiated = false;
let currentModalBookId = null;
let fetchInProgress = false; // true len počas aktívneho behu fetchAllMissingDetails
let fetchShouldStop = false; // nastaví sa na true po kliknutí na "Zastaviť"

// Vráti, ktoré zdroje sú aktuálne zaškrtnuté v paneli "Doplniť obaly a popisy".
// Google Books je predvolene vypnutý — dlhodobo vyčerpaná denná kvóta ho robí
// v praxi nepoužiteľným pre hromadné dopĺňanie, kým si ho používateľ sám nezapne.
function getEnabledSources() {
  return {
    catalog: sourceCatalogCheckbox ? sourceCatalogCheckbox.checked : true,
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
let currentUser = null; // prihlásený Netlify Identity používateľ (alebo null, kým nie je auth pripravená)
let isPublicEnabled = false; // či je zapnutý verejný (read-only) náhľad knižnice

function updatePublicToggleUI() {
  if (!publicToggle) return;
  publicToggle.checked = isPublicEnabled;
  if (isPublicEnabled && currentUser) {
    publicLinkBox.style.display = 'flex';
    publicLinkBox.style.flexDirection = 'column';
    const link = `${location.origin}/verejna.html?id=${encodeURIComponent(currentUser.id)}`;
    publicLinkInput.value = link;
  } else {
    publicLinkBox.style.display = 'none';
  }
}

// Pridá Authorization hlavičku s JWT tokenom prihláseného používateľa —
// serverless funkcia (catalog.mjs) ho použije na oddelenie dát jednotlivých
// účtov. Bez prihláseného používateľa vráti prázdny objekt (žiadna hlavička).
// Vráti Authorization hlavičku s AKTUÁLNYM, platným JWT tokenom. Netlify
// Identity tokeny expirujú po 1 hodine — currentUser.jwt() ho v prípade
// potreby automaticky obnoví (refresh token), takže tu NIKDY nečítame
// currentUser.token.access_token priamo (tá hodnota môže byť zastaraná
// a server by zápis potichu odmietol s 401, čo vyzerá ako "neuložilo sa").
async function authHeaders() {
  if (!currentUser || !window.netlifyIdentity) return {};
  try {
    const token = await currentUser.jwt();
    return token ? { Authorization: 'Bearer ' + token } : {};
  } catch (e) {
    console.error(t('tokenRefreshFail'), e);
    return {};
  }
}

function updateSyncStatusUI() {
  if (!syncStatusEl) return;
  if (cloudSyncAvailable) {
    syncStatusEl.textContent = t('syncShared');
    syncStatusEl.style.color = 'var(--accent)';
  } else {
    syncStatusEl.textContent = t('syncLocalOnly');
    syncStatusEl.style.color = 'var(--ink-soft)';
  }
}

// Rýchle synchrónne načítanie len z localStorage (alebo prvotné dáta z data.js),
// bez čakania na sieť — používa sa pri starte, aby bolo UI hneď použiteľné.
function loadLocalBooksOnly() {
  try {
    const raw = localStorage.getItem(getStorageKey());
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
    console.error(t('loadLocalStorageErr'), e);
    allBooks = [];
  }
}

async function loadBooks() {
  // Potom sa skúsime zosynchronizovať s cloudom — ak tam je novší/iný katalóg
  // (napr. pridaný z mobilu), nahradíme ním lokálnu kópiu.
  try {
    const res = await fetch(CATALOG_API_URL, { headers: await authHeaders() });
    if (res.ok) {
      const cloudData = await res.json();
      if (Array.isArray(cloudData.books) && cloudData.books.length > 0) {
        allBooks = cloudData.books;
        migratePanel.style.display = 'none';
      } else {
        // Cloud (tento účet) je prázdny — skôr než tam automaticky nahráme
        // predvolené dáta z data.js, ponúkneme možnosť priradiť prípadné
        // staré dáta zo zdieľanej verzie appky (spred prihlasovania).
        // Pridanie predvolených dát odložíme, kým sa používateľ nerozhodne.
        if (migratePanel) migratePanel.style.display = 'block';
      }
      isPublicEnabled = !!cloudData.publicEnabled;
      updatePublicToggleUI();
      cloudSyncAvailable = true;
    } else {
      cloudSyncAvailable = false;
    }
  } catch (e) {
    // Cloud funkcia nie je dostupná (napr. lokálny vývoj cez python http.server,
    // alebo výpadok siete) — pokračujeme len s lokálnou kópiou.
    cloudSyncAvailable = false;
  }

  localStorage.setItem(getStorageKey(), JSON.stringify(allBooks));
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
    importStatus.textContent = tf('exportedJson', { n: allBooks.length });
    importStatus.className = 'api-status ok';
  } catch (error) {
    console.error(t('exportCatalogErr'), error);
    importStatus.textContent = t('exportFail');
    importStatus.className = 'api-status bad';
  }
}

// CSV export v tvare, ktorý vie importnúť Goodreads aj LibraryThing (a teda
// pravdepodobne aj väčšina podobných služieb) — tieto služby si pri zhode ISBN
// samy dohľadajú vlastné bibliografické dáta, takže CSV tu slúži najmä ako
// "zoznam ISBN + záložný text", nie ako úplná záloha (tá je v JSON exporte).
// Obrázky vlastných obalov sa do CSV nedajú vložiť — tie zostávajú len v JSON.
function csvEscape(value) {
  const str = (value === null || value === undefined) ? '' : String(value);
  if (/[",\n]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function exportCatalogCsv() {
  try {
    // Stĺpce zodpovedajú formátu, ktorý LibraryThing aj Goodreads vedia
    // priamo importovať: TITLE, AUTHOR, ISBN — plus GENRE a ORIGINAL_TITLE
    // navyše (tie si tieto služby ignorujú, ale neprekážajú pri importe).
    const header = ['TITLE', 'AUTHOR', 'ISBN', 'GENRE', 'ORIGINAL_TITLE'];
    const rows = allBooks.map(b => [
      csvEscape(b.title),
      csvEscape(b.author),
      csvEscape(b.isbn || ''),
      csvEscape(b.genre || ''),
      csvEscape(b.originalTitle || '')
    ].join(','));

    // BOM na začiatku, nech sa diakritika správne zobrazí aj v Exceli na Windows.
    const csvContent = '\uFEFF' + header.join(',') + '\n' + rows.join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `kniznica-${dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    importStatus.textContent = tf('exportedCsv', { n: allBooks.length });
    importStatus.className = 'api-status ok';
  } catch (error) {
    console.error(t('exportCsvErr'), error);
    importStatus.textContent = t('exportCsvFail');
    importStatus.className = 'api-status bad';
  }
}

// Normalizuje text na porovnanie duplicít — bez diakritiky, malými písmenami,
// orezané medzery. Rovnaký princíp ako normalizeAuthorName, len bez triedenia slov
// (na názov/autora chceme presnejšiu zhodu, nie len "obsahuje rovnaké slová").
function normalizeForDuplicateCheck(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Nájde existujúcu knihu v katalógu, ktorá je pravdepodobne duplicitom danej
// knihy. Vracia { book, matchType } alebo null.
//   matchType: 'isbn'          — zhoda podľa ISBN (najspoľahlivejšia)
//              'title-has-isbn'— zhoda podľa názvu+autora, existujúca MÁ ISBN
//              'title-no-isbn' — zhoda podľa názvu+autora, existujúca BEZ ISBN
// ISBN (ak ho majú obe) jednoznačne identifikuje vydanie; bez neho
// porovnávame normalizovaný názov + autora.
function findDuplicateBook(candidate) {
  if (candidate.isbn) {
    const isbnMatch = allBooks.find(b => b.isbn && b.isbn === candidate.isbn);
    if (isbnMatch) return { book: isbnMatch, matchType: 'isbn' };
  }
  const titleKey = normalizeForDuplicateCheck(candidate.title);
  const authorKey = normalizeForDuplicateCheck(candidate.author);
  if (!titleKey) return null;
  const nameMatch = allBooks.find(b =>
    normalizeForDuplicateCheck(b.title) === titleKey &&
    normalizeForDuplicateCheck(b.author) === authorKey
  );
  if (!nameMatch) return null;
  return {
    book: nameMatch,
    matchType: nameMatch.isbn ? 'title-has-isbn' : 'title-no-isbn'
  };
}

let pendingImportBooks = null;

function importCatalog(file) {
  const reader = new FileReader();
  reader.onload = () => {
    let parsed;
    try {
      parsed = JSON.parse(reader.result);
    } catch (error) {
      importStatus.textContent = t('notValidJsonExportFull');
      importStatus.className = 'api-status bad';
      return;
    }

    const importedBooks = Array.isArray(parsed) ? parsed : parsed.books;
    if (!Array.isArray(importedBooks)) {
      importStatus.textContent = t('noRecognizableList');
      importStatus.className = 'api-status bad';
      return;
    }

    const validBooks = importedBooks.filter(b => b && typeof b.title === 'string' && b.title.trim());
    if (validBooks.length === 0) {
      importStatus.textContent = t('noValidBook');
      importStatus.className = 'api-status bad';
      return;
    }

    const normalizedImport = validBooks.map(b => ({
      title: b.title.trim(),
      author: (b.author || '').trim(),
      genre: (b.genre || 'Nezaradené').trim(),
      originalTitle: (b.originalTitle || '').trim(),
      isbn: normalizeIsbn(b.isbn || ''),
      coverUrl: b.coverUrl || null,
      description: b.description || null,
      customCover: !!b.customCover,
      sourcesTried: b.sourcesTried || {},
      createdAt: b.createdAt || Date.now()
    }));

    if (allBooks.length === 0) {
      // Prázdny katalóg — niet čo zlučovať, jednoducho naplníme bez pýtania.
      allBooks = normalizedImport.map((b, i) => ({ id: 'imported_' + i + '_' + Date.now(), ...b }));
      saveBooks(true);
      filterAndRenderBooks();
      importStatus.textContent = tf('importedBooks', { n: allBooks.length });
      importStatus.className = 'api-status ok';
      return;
    }

    const duplicateCount = normalizedImport.filter(b => findDuplicateBook(b)).length;
    pendingImportBooks = normalizedImport;

    importChoiceSummary.textContent = tf('importSummary', { n: validBooks.length, dup: duplicateCount, cur: allBooks.length });

    importChoiceModal.classList.remove('hidden');
    requestAnimationFrame(() => {
      importChoiceModal.style.opacity = '1';
      importChoiceModal.querySelector('.modal-card').style.transform = 'scale(1)';
    });
  };
  reader.onerror = () => {
    importStatus.textContent = t('fileReadFail');
    importStatus.className = 'api-status bad';
  };
  reader.readAsText(file);
}

function closeImportChoiceModal() {
  importChoiceModal.style.opacity = '0';
  importChoiceModal.querySelector('.modal-card').style.transform = 'scale(0.97)';
  setTimeout(() => importChoiceModal.classList.add('hidden'), 200);
  pendingImportBooks = null;
}

importCancelBtn.addEventListener('click', () => {
  importStatus.textContent = t('importCancelled');
  importStatus.className = 'api-status';
  closeImportChoiceModal();
});
importChoiceModal.addEventListener('click', (e) => {
  if (e.target === importChoiceModal) closeImportChoiceModal();
});

importReplaceBtn.addEventListener('click', () => {
  if (!pendingImportBooks) return;
  allBooks = pendingImportBooks.map((b, i) => ({ id: 'imported_' + i + '_' + Date.now(), ...b }));
  saveBooks(true);
  filterAndRenderBooks();
  importStatus.textContent = tf('catalogReplaced', { n: allBooks.length });
  importStatus.className = 'api-status ok';
  closeImportChoiceModal();
});

importMergeBtn.addEventListener('click', () => {
  if (!pendingImportBooks) return;
  let addedCount = 0;
  let skippedCount = 0;
  pendingImportBooks.forEach((b, i) => {
    if (findDuplicateBook(b)) {
      skippedCount++;
      return;
    }
    allBooks.push({ id: 'imported_' + i + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), ...b });
    addedCount++;
  });
  saveBooks(true);
  filterAndRenderBooks();
  importStatus.textContent = tf('addedSkipped', { added: addedCount, skipped: skippedCount });
  importStatus.className = 'api-status ok';
  closeImportChoiceModal();
});

function saveBooks(immediate = false) {
  // Lokálnu kópiu ukladáme hneď a synchrónne — UI nesmie čakať na sieť.
  try {
    localStorage.setItem(getStorageKey(), JSON.stringify(allBooks));
  } catch (e) {
    console.error(t('saveLocalStorageErr'), e);
    showError(t('storageFull'));
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
    const headers = await authHeaders();
    const res = await fetch(CATALOG_API_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ books: allBooks, publicEnabled: isPublicEnabled })
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
    booksApiKeyStatus.textContent = t('gbKeySavedStable');
    booksApiKeyStatus.className = 'api-status ok';
  } else {
    booksApiKeyStatus.textContent = t('gbNoKey429');
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
    apiKeyStatus.textContent = t('geminiKeySavedActive');
    apiKeyStatus.className = 'api-status ok';
  } else {
    apiKeyStatus.textContent = t('geminiNoKey');
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
// Výrazný plnoplošný indikátor počas analýzy fotky (sken police/ISBN) —
// odlišný od bežného malého loadera, nech je jasné, že prebieha niečo
// dôležité a môže to chvíľu trvať.
// ============================================================

function showScanOverlay(title, subtitle) {
  scanTitle.textContent = title || 'Analyzujem fotku';
  scanSubtitle.innerHTML = (subtitle || 'Pracujem na tom') + '<span class="scan-dots"><span></span><span></span><span></span></span>';
  scanOverlay.classList.remove('hidden');
  requestAnimationFrame(() => { scanOverlay.style.opacity = '1'; });
}

function updateScanOverlay(subtitle) {
  scanSubtitle.innerHTML = subtitle + '<span class="scan-dots"><span></span><span></span><span></span></span>';
}

function hideScanOverlay() {
  scanOverlay.style.opacity = '0';
  setTimeout(() => scanOverlay.classList.add('hidden'), 250);
}

// ============================================================
// Toast notifikácie — výrazné, dočasné hlášky v rohu obrazovky pre
// dôležité udalosti (napr. úspešné hromadné pridanie kníh), ktoré sa
// ľahko prehliadnu v tichom statusMessage texte pod formulárom.
// ============================================================

function showToast(message, type = 'success', durationMs = 5000) {
  const toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  const icon = type === 'success' ? '✅' : (type === 'error' ? '⚠️' : 'ℹ️');
  toast.innerHTML = `<span class="toast-icon">${icon}</span><span>${escapeHtml(message)}</span>`;
  toastContainer.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, durationMs);
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

  const enabled = enabledSources || { catalog: true, openLibrary: true, googleBooks: false, wikidata: true };
  if (enabled.catalog === undefined) enabled.catalog = true;

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
  let publishYear = null;
  let pageCount = null;

  const isbn = book && book.isbn ? book.isbn : null;

  // ---- 0) Vlastný katalóg (Supabase) — PRVÝ zdroj, najlepšie pokrytie
  // slovenských/českých kníh. Katalóg sa pýtame VŽDY (nikdy sa nepreskakuje
  // cachovaním), lebo databáza priebežne pribúda — kniha, ktorá tam dnes
  // nebola, tam zajtra môže byť. Skúšame slovenský názov (title) prioritne,
  // lebo katalóg má SK/CZ názvy; originálny/EN názov až ako druhý pokus.
  if (enabled.catalog) {
    // 1. pokus: slovenský názov (to má katalóg uložené)
    let cat = await fetchFromCatalog({ isbn, title, author });
    // 2. pokus: ak SK názov nič nedal a máme originálny/EN názov, skús ten
    if (!cat && originalTitle && originalTitle.trim() && originalTitle.trim() !== title) {
      cat = await fetchFromCatalog({ isbn, title: originalTitle.trim(), author });
    }
    sources.catalog = cat ? 'found' : 'empty';
    if (cat) {
      if (cat.coverUrl) coverUrl = cat.coverUrl;
      if (cat.description) description = cat.description;
      if (cat.publishYear) publishYear = cat.publishYear;
      if (cat.pageCount) pageCount = cat.pageCount;
      // Jazyk a vydavateľstvo uložíme priamo na knihu (nie sú v návratovom
      // objekte fetchBookDetails) — dopĺňame len ak chýbajú.
      if (book && cat.language && !book.language) book.language = cat.language;
      if (book && cat.publisher && !book.publisher) book.publisher = cat.publisher;
    }
  }

  // Vrátime sa hneď LEN ak katalóg dal obálku — inak pokračujeme na ďalšie
  // zdroje, aby sa chýbajúca obálka doplnila (popis/rok z katalógu si držíme).
  if (coverUrl) {
    return { coverUrl, description: description || t('descNotFound'), publishYear, pageCount, networkError: false, sources };
  }

  // ---- 0b) Open Library podľa ISBN — ak ho kniha má, je to najpresnejší
  // a najspoľahlivejší spôsob (jednoznačná identifikácia konkrétneho vydania,
  // žiadna kontrola zhody autora nie je ani potrebná). Skúša sa pred
  // fulltextovým vyhľadávaním podľa názvu.
  if (isbn && enabled.openLibrary && sources.openLibraryIsbn !== 'found' && sources.openLibraryIsbn !== 'empty') {
    const olIsbn = await fetchFromOpenLibraryByIsbn(isbn);
    sources.openLibraryIsbn = olIsbn.coverUrl ? 'found' : 'empty';
    if (olIsbn.coverUrl) coverUrl = olIsbn.coverUrl;
    if (olIsbn.description) description = olIsbn.description;
    if (olIsbn.publishYear) publishYear = olIsbn.publishYear;
    if (olIsbn.pageCount) pageCount = olIsbn.pageCount;
  }

  if (coverUrl) {
    return { coverUrl, description: description || t('descNotFound'), publishYear, pageCount, networkError: false, sources };
  }

  // ---- 1) Open Library — skúšame ako prvú, nemá denný limit požiadaviek ----
  if (enabled.openLibrary && sources.openLibrary !== 'found' && sources.openLibrary !== 'empty') {
    const ol = await fetchFromOpenLibrary(searchTitle, author);
    sources.openLibrary = ol.coverUrl ? 'found' : 'empty';
    if (ol.coverUrl) coverUrl = ol.coverUrl;
    if (ol.description) description = ol.description;
    if (ol.publishYear) publishYear = ol.publishYear;
    if (ol.pageCount) pageCount = ol.pageCount;
  }

  if (coverUrl) {
    return { coverUrl, description: description || t('descNotFound'), publishYear, pageCount, networkError: false, sources };
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
            ? t('gb429WithKey')
            : t('gb429NoKey');
        }
      } else if (response.status === 403) {
        sources.googleBooks = 'empty';
        if (!lastNetworkErrorShown) {
          lastNetworkErrorShown = true;
          showError(t('gb403'));
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
        if (matches && bookResult?.publishedDate) {
          const yearMatch = bookResult.publishedDate.match(/\d{4}/);
          if (yearMatch) publishYear = parseInt(yearMatch[0], 10);
        }
        if (matches && bookResult?.pageCount) pageCount = bookResult.pageCount;
      } else {
        sources.googleBooks = 'empty';
      }
    } catch (error) {
      console.error(t('gbDetailErr') + title + '":', error);
      // Sieťová chyba nie je fatálna ani trvalá — neoznačujeme zdroj ako "empty",
      // nech sa skúsi znova nabudúce (mohol to byť len dočasný výpadok).
    }
  }

  if (coverUrl) {
    return { coverUrl, description: description || t('descNotFound'), publishYear, pageCount, networkError: false, sources };
  }

  // Ak sme hľadali podľa originálneho/EN názvu a nič sme nenašli, skúsime ešte
  // raz s pôvodným (preloženým) názvom (cez zdroje, ktoré ešte neboli vyskúšané).
  if (useOriginal) {
    const fallback = await fetchBookDetails(title, author, null, { sourcesTried: sources }, enabled, 0, true);
    if (fallback.coverUrl) return fallback;
    Object.assign(sources, fallback.sources);
    if (!description && fallback.description && fallback.description !== t('descNotFound')) {
      description = fallback.description;
    }
    if (!publishYear && fallback.publishYear) publishYear = fallback.publishYear;
    if (!pageCount && fallback.pageCount) pageCount = fallback.pageCount;
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
    return { coverUrl: null, description, publishYear, pageCount, networkError: true, rateLimited: true, sources };
  }

  return {
    coverUrl: coverUrl,
    description: description || t('descNotFound'),
    publishYear,
    pageCount,
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

async function fetchWithTimeout(url, ms, options) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...(options || {}), signal: controller.signal });
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
  if (!isbn) return { coverUrl: null, description: null, publishYear: null, pageCount: null, language: null };
  if (Date.now() < openLibraryRateLimitedUntil) {
    return { coverUrl: null, description: null, publishYear: null, pageCount: null, language: null };
  }
  try {
    const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(isbn)}&format=json&jscmd=data`;
    const res = await fetchWithTimeout(url, 6000);

    if (res.status === 429) {
      openLibraryRateLimitedUntil = Date.now() + 5 * 60000;
      return { coverUrl: null, description: null, publishYear: null, pageCount: null, language: null };
    }
    if (!res.ok) return { coverUrl: null, description: null, publishYear: null, pageCount: null, language: null };

    const data = await res.json();
    const book = data['ISBN:' + isbn];
    if (!book) return { coverUrl: null, description: null, publishYear: null, pageCount: null, language: null };

    const coverUrl = book.cover?.large || book.cover?.medium || null;
    let description = null;
    if (typeof book.notes === 'string') description = book.notes;
    else if (book.excerpts?.[0]?.text) description = book.excerpts[0].text;

    // publish_date je voľný text (napr. "1958", "March 1999") — vytiahneme
    // z neho len 4-miestny rok, nech sa dá jednotne zobraziť a triediť.
    const yearMatch = (book.publish_date || '').match(/\d{4}/);
    const publishYear = yearMatch ? parseInt(yearMatch[0], 10) : null;
    const pageCount = book.number_of_pages || null;
    // languages je pole objektov typu { key: "/l/eng" } — vytiahneme 3-písmenový kód.
    const language = book.languages?.[0]?.key?.split('/').pop() || null;

    return { coverUrl, description, publishYear, pageCount, language };
  } catch (error) {
    return { coverUrl: null, description: null, publishYear: null, pageCount: null, language: null };
  }
}

// Samotné volanie — voliteľný languageCode obmedzí výsledky na daný jazyk.
async function findIsbnByTitleRaw(title, author, languageCode) {
  if (Date.now() < openLibraryRateLimitedUntil) return null;
  try {
    const query = `${title}${author ? ' ' + author : ''}`;
    let url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&fields=title,author_name,isbn&limit=3`;
    if (languageCode) url += `&language=${encodeURIComponent(languageCode)}`;
    const res = await fetchWithTimeout(url, 6000);
    if (res.status === 429) {
      openLibraryRateLimitedUntil = Date.now() + 5 * 60000;
      return null;
    }
    if (!res.ok) return null;

    const data = await res.json();
    const docs = data.docs || [];
    for (const doc of docs) {
      if (author && doc.author_name && !authorMatches(author, doc.author_name)) continue;
      if (Array.isArray(doc.isbn) && doc.isbn.length > 0) {
        // Uprednostníme 13-miestne ISBN, ak je dostupné.
        const isbn13 = doc.isbn.find(i => normalizeIsbn(i).length === 13);
        return normalizeIsbn(isbn13 || doc.isbn[0]);
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}

// Skúsi nájsť ISBN pre knihu podľa názvu a autora (fulltextové vyhľadávanie,
// teda menej spoľahlivé než keby sme ISBN odfotili priamo z knihy — výsledok
// sa preto vždy označí ako 'searched', nie 'scanned', a používateľ ho vidí
// ako "pravdepodobné" s možnosťou overiť/opraviť). Najprv skúša vydanie
// v jazyku knižnice (pozri fetchFromOpenLibrary), až potom akýkoľvek jazyk.
async function findIsbnByTitle(title, author) {
  for (const lang of getPreferredOlLanguages()) {
    const result = await findIsbnByTitleRaw(title, author, lang);
    if (result) return result;
  }
  return findIsbnByTitleRaw(title, author, null);
}

// Skúsi dohľadať rok vydania a počet strán podľa názvu a autora (fulltextové
// vyhľadávanie na Open Library) — pre knihy, ktoré tieto údaje ešte nemajú.
// DÔLEŽITÉ: first_publish_year a number_of_pages_median z /search.json sú
// vlastnosti DIELA (work) — najstarší rok vydania kedykoľvek, v hocijakom
// jazyku, a medián počtu strán naprieč VŠETKÝMI vydaniami. To nie je to,
// čo chceš vedieť o KONKRÉTNOM výtlačku, ktorý vlastníš (napr. slovenský
// preklad z roku 1975 vs. anglický originál z roku 1950). Navyše Open
// Library má známy, nedoriešený bug (issue #6226 v ich trackeri), kde
// jazykový filter na /search.json filtruje len ktoré DIELA sa vôbec
// vrátia, nie ktoré KONKRÉTNE vydanie sa zobrazí v poli "editions" —
// čiže spoliehať sa na "vydanie po jazykovom filtri" by ticho vracalo
// dáta úplne iného vydania. Spoľahlivé riešenie: najprv nájdeme ISBN
// KONKRÉTNEHO vydania v danom jazyku (rovnaká funkcia ako pri hľadaní
// ISBN), a z neho cez /api/books vyčítame presný rok a počet strán
// PRESNE TOHTO vydania — tie dáta sú na rozdiel od search.json viazané
// na konkrétny výtlačok, nie na dielo ako celok.
async function findMetaByTitle(title, author) {
  for (const lang of getPreferredOlLanguages()) {
    const isbn = await findIsbnByTitleRaw(title, author, lang);
    if (isbn) {
      const editionData = await fetchFromOpenLibraryByIsbn(isbn);
      if (editionData.publishYear || editionData.pageCount) {
        return { publishYear: editionData.publishYear, pageCount: editionData.pageCount };
      }
    }
  }
  // Fallback bez jazykového obmedzenia — skúsime znova nájsť konkrétne
  // vydanie (akéhokoľvek jazyka) cez ISBN, namiesto rovno siahania po
  // nepresnom first_publish_year diela.
  const isbn = await findIsbnByTitleRaw(title, author, null);
  if (isbn) {
    const editionData = await fetchFromOpenLibraryByIsbn(isbn);
    if (editionData.publishYear || editionData.pageCount) {
      return { publishYear: editionData.publishYear, pageCount: editionData.pageCount };
    }
  }
  return { publishYear: null, pageCount: null };
}

// Samotné volanie Open Library search API — voliteľný parameter
// languageCode (3-písmenový OL kód, napr. "slo") obmedzí výsledky len
// na dané jazykové vydanie. Bez neho hľadá naprieč všetkými jazykmi
// (pôvodné správanie).
async function fetchFromOpenLibraryRaw(title, author, languageCode) {
  if (Date.now() < openLibraryRateLimitedUntil) {
    return { coverUrl: null, description: null, publishYear: null, pageCount: null };
  }
  try {
    const query = `${title}${author ? ' ' + author : ''}`;
    let url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&fields=title,author_name,cover_i,key,first_sentence,first_publish_year,number_of_pages_median&limit=3`;
    if (languageCode) url += `&language=${encodeURIComponent(languageCode)}`;
    const res = await fetchWithTimeout(url, 6000);

    if (res.status === 429) {
      openLibraryRateLimitedUntil = Date.now() + 5 * 60000;
      return { coverUrl: null, description: null, publishYear: null, pageCount: null };
    }
    if (!res.ok) return { coverUrl: null, description: null, publishYear: null, pageCount: null };

    const data = await res.json();
    const docs = data.docs || [];

    for (const doc of docs) {
      // Rovnaká kontrola zhody autora ako pri Google Books — fulltextové
      // vyhľadávanie podľa všeobecného názvu by inak mohlo vrátiť celkom inú knihu.
      if (author && doc.author_name && !authorMatches(author, doc.author_name)) continue;
      if (!doc.cover_i) continue;

      const coverUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
      const publishYear = doc.first_publish_year || null;
      const pageCount = doc.number_of_pages_median || null;

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

      return { coverUrl, description, publishYear, pageCount };
    }
    return { coverUrl: null, description: null, publishYear: null, pageCount: null };
  } catch (error) {
    // Timeout alebo iná sieťová chyba — ticho preskočíme na ďalší zdroj.
    return { coverUrl: null, description: null, publishYear: null, pageCount: null };
  }
}

// Vyhľadá obal/popis na Open Library — najprv skúsi vydanie v jazyku
// knižnice (napr. pre slovenčinu skúša slovenské, potom české vydanie),
// a až keď v žiadnom z preferovaných jazykov nič nenájde, padne na
// pôvodné správanie (hľadanie naprieč všetkými jazykmi). Vďaka tomu
// appka neprednostne priraďuje anglické vydanie tam, kde existuje
// vydanie bližšie jazyku, v ktorom používateľ vedie svoju knižnicu.
async function fetchFromOpenLibrary(title, author) {
  for (const lang of getPreferredOlLanguages()) {
    const result = await fetchFromOpenLibraryRaw(title, author, lang);
    if (result.coverUrl) return result;
  }
  return fetchFromOpenLibraryRaw(title, author, null);
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

async function addBook(title, author, genre, originalTitle, skipDetails, isbn, silentDuplicateSkip = false, source = 'manual') {
  if (!title || !title.trim()) return;

  const candidate = { title: title.trim(), author: (author || '').trim(), isbn: normalizeIsbn(isbn || '') };
  const dup = findDuplicateBook(candidate);
  if (dup) {
    const existing = dup.book;

    // --- 1A / 3A: zhoda podľa ISBN → kniha už je, preskočiť + upozorniť ---
    if (dup.matchType === 'isbn') {
      if (!silentDuplicateSkip) {
        showToast(tf('dupAlreadyHaveIsbn', { title: existing.title }), 'info', 4000);
      }
      return 'duplicate';
    }

    // --- 1B: sken ISBN, existujúca má rovnaký názov ale BEZ ISBN ---
    // → spýtať sa: zlúčiť (doplniť ISBN k existujúcej) alebo pridať nový záznam.
    if (dup.matchType === 'title-no-isbn' && candidate.isbn && source === 'isbn') {
      if (silentDuplicateSkip) return 'duplicate';
      const merge = confirm(
        tf('dupMergePrompt', { title: existing.title, authorPart: existing.author ? ' (' + existing.author + ')' : '' })
      );
      if (merge) {
        // Zlúčiť: doplniť ISBN + chýbajúce metadáta k existujúcej knihe.
        existing.isbn = candidate.isbn;
        saveBooks(true);
        await enrichBookFromCatalog(existing); // doplní len prázdne polia
        saveBooks(true);
        filterAndRenderBooks();
        showToast(tf('dupMerged', { title: existing.title }), 'success', 3500);
        return 'merged';
      }
      // inak pokračuje nižšie a pridá ako nový záznam (iné vydanie)
    }

    // --- 2A: foto police, existujúca s rovnakým názvom MÁ ISBN ---
    // → spýtať sa, či pridať ako novú knihu (z fotky ISBN nemáme).
    else if (dup.matchType === 'title-has-isbn' && source === 'shelf') {
      if (silentDuplicateSkip) {
        // pri hromadnom fotení sa rozhoduje súhrnne — signalizuj „treba sa spýtať"
        return 'ask';
      }
      const addNew = confirm(
        tf('dupPhotoHasIsbnPrompt', { title: existing.title, authorPart: existing.author ? ' (' + existing.author + ')' : '' })
      );
      if (!addNew) return 'duplicate';
      // inak pokračuje a pridá ako novú
    }

    // --- 2B: foto police, existujúca s rovnakým názvom BEZ ISBN → preskočiť ---
    else if (dup.matchType === 'title-no-isbn' && source === 'shelf') {
      return 'duplicate';
    }

    // --- 3B: ručne, zhoda podľa názvu → spýtať sa (pôvodné správanie) ---
    else {
      if (silentDuplicateSkip) return 'duplicate';
      const proceed = confirm(
        tf('dupPrompt', { title: existing.title, authorPart: existing.author ? ' (' + existing.author + ')' : '' }) +
        t('dupOkCancel')
      );
      if (!proceed) {
        showToast(t('addCancelledExists'), 'info', 4000);
        return 'duplicate';
      }
    }
  }

  const newBook = {
    id: 'b_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    title: title.trim(),
    author: (author || '').trim(),
    genre: (genre || 'Nezaradené').trim(),
    originalTitle: (originalTitle || '').trim(),
    isbn: normalizeIsbn(isbn || ''),
    coverUrl: null,
    description: null,
    createdAt: Date.now()
  };
  allBooks.unshift(newBook);
  saveBooks(true);
  filterAndRenderBooks();

  if (!skipDetails) {
    showLoader(tf('searchingCoverFor', { title: newBook.title }));
    const { coverUrl, description, publishYear, pageCount, networkError, sources } = await fetchBookDetails(newBook.title, newBook.author, newBook.originalTitle, newBook, getEnabledSources());
    if (!networkError) {
      newBook.coverUrl = coverUrl;
      newBook.description = description;
      if (publishYear) newBook.publishYear = publishYear;
      if (pageCount) newBook.pageCount = pageCount;
      const apiKey = (localStorage.getItem(API_KEY_STORAGE) || '').trim();
      if (apiKey && descriptionLooksForeign(newBook.description)) {
        const translated = await translateDescription(newBook);
        if (translated) newBook.description = translated;
      }
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
    missingCoversInfo.textContent = t('allHaveCoverPlaceholder');
    fetchMissingBtn.disabled = true;
  } else {
    const bookWord = getUiLanguage() === 'en'
      ? (missingCount === 1 ? 'book has' : 'books have')
      : (missingCount === 1 ? 'kniha nemá' : 'kníh nemá');
    missingCoversInfo.textContent = tf('missingCoverInfo', { n: missingCount, bookWord });
    fetchMissingBtn.disabled = false;
  }
  updateMissingIsbnInfo();
  updateMissingMetaInfo();
  updateFillAllSummary();
}

// Súhrnný text v hlavnom paneli "Doplniť chýbajúce údaje" — koľko kníh
// celkovo má aspoň jeden chýbajúci údaj (obal, ISBN, alebo rok/strany).
function updateFillAllSummary() {
  if (!fillAllSummary) return;
  const needsCover = allBooks.filter(b => !b.coverUrl).length;
  const needsIsbn = allBooks.filter(b => !b.isbn).length;
  const needsMeta = allBooks.filter(b => !b.publishYear && !b.pageCount).length;
  const anyMissing = needsCover > 0 || needsIsbn > 0 || needsMeta > 0;

  if (!anyMissing) {
    fillAllSummary.textContent = t('allDetailsFilled');
    fillAllBtn.disabled = true;
  } else {
    const parts = [];
    if (needsCover > 0) parts.push(`${needsCover} ${t('phaseCoversLabel').toLowerCase()}`);
    if (needsIsbn > 0) parts.push(`${needsIsbn} ${t('phaseIsbnLabel')}`);
    if (needsMeta > 0) parts.push(`${needsMeta} ${t('phaseMetaLabel').toLowerCase()}`);
    fillAllSummary.textContent = parts.join(' · ');
    fillAllBtn.disabled = false;
  }

  // Odznak na ikone "Doplniť" — počet KNÍH (nie súčet kategórií), ktoré
  // majú aspoň jeden chýbajúci údaj, nech jedna kniha chýbajúca vo
  // všetkých troch veciach nezavádza počítaním 3x.
  if (fillAllBadge) {
    const needsAnything = allBooks.filter(b => !b.coverUrl || !b.isbn || (!b.publishYear && !b.pageCount)).length;
    fillAllBadge.textContent = needsAnything > 99 ? '99+' : String(needsAnything);
    fillAllBadge.style.display = needsAnything > 0 ? 'flex' : 'none';
  }
}

function updateMissingIsbnInfo() {
  if (!missingIsbnInfo) return;
  const missingCount = allBooks.filter(b => !b.isbn).length;
  if (missingCount === 0) {
    missingIsbnInfo.textContent = t('allHaveIsbn');
    bulkFindIsbnBtn.disabled = true;
  } else {
    const bookWord = getUiLanguage() === 'en'
      ? (missingCount === 1 ? "book doesn't have" : "books don't have")
      : (missingCount === 1 ? 'kniha nemá' : 'kníh nemá');
    missingIsbnInfo.textContent = tf('missingIsbnInfo', { n: missingCount, bookWord });
    bulkFindIsbnBtn.disabled = false;
  }
}

// Hromadne skúsi dohľadať ISBN pre knihy, ktoré ho ešte nemajú — podľa
// názvu a autora (fulltextové vyhľadávanie na Open Library). Keďže ide
// o nepriamy, menej istý spôsob než priame odfotenie ISBN z knihy,
// výsledok sa vždy označí ako 'searched' (zobrazí sa oranžovo, na overenie),
// nikdy nie ako 'scanned'.
let bulkIsbnInProgress = false;

async function bulkFindIsbn() {
  const missing = allBooks.filter(b => !b.isbn);
  if (missing.length === 0 || bulkIsbnInProgress) return;

  bulkIsbnInProgress = true;
  bulkFindIsbnBtn.disabled = true;
  statusMessage.textContent = tf('searchingIsbnStart', { total: missing.length });

  let foundCount = 0;
  let processed = 0;

  try {
    for (const book of missing) {
      if (book.isbn) { processed++; continue; } // medzitým mohlo pribudnúť (napr. ručne)

      await new Promise(res => setTimeout(res, 1000));
      const isbn = await findIsbnByTitle(book.originalTitle || book.title, book.author);
      processed++;

      if (isbn) {
        book.isbn = isbn;
        book.isbnSource = 'searched';
        book.isbnVerified = false; // dohľadané podľa názvu — nikdy automaticky "potvrdené"
        foundCount++;
        if (foundCount % 8 === 0) saveBooks();
      }
      statusMessage.textContent = tf('searchingIsbnProgress', { done: processed, total: missing.length, found: foundCount });
    }
    saveBooks(true);
    filterAndRenderBooks();
    statusMessage.textContent = '';
    if (foundCount > 0) {
      showToast(tf('isbnFoundSummary', { found: foundCount, total: missing.length }), 'success', 7000);
    } else {
      showToast(t('noIsbnFound'), 'info');
    }
  } finally {
    bulkIsbnInProgress = false;
    bulkFindIsbnBtn.disabled = false;
    updateMissingIsbnInfo();
  }
}

function updateMissingMetaInfo() {
  if (!missingMetaInfo) return;
  const missingCount = allBooks.filter(b => !b.publishYear && !b.pageCount).length;
  if (missingCount === 0) {
    missingMetaInfo.textContent = t('allHaveYearPages');
    bulkFindMetaBtn.disabled = true;
  } else {
    const bookWord = getUiLanguage() === 'en'
      ? (missingCount === 1 ? "book doesn't have" : "books don't have")
      : (missingCount === 1 ? 'kniha nemá' : 'kníh nemá');
    missingMetaInfo.textContent = tf('missingMetaInfo', { n: missingCount, bookWord });
    bulkFindMetaBtn.disabled = false;
  }
}

// Hromadne skúsi dohľadať rok vydania a počet strán pre knihy, ktoré
// ani jeden z týchto údajov ešte nemajú — podľa názvu a autora.
let bulkMetaInProgress = false;

async function bulkFindMeta() {
  const missing = allBooks.filter(b => !b.publishYear && !b.pageCount);
  if (missing.length === 0 || bulkMetaInProgress) return;

  bulkMetaInProgress = true;
  bulkFindMetaBtn.disabled = true;
  statusMessage.textContent = tf('searchingMetaStart', { total: missing.length });

  let foundCount = 0;
  let processed = 0;

  try {
    for (const book of missing) {
      if (book.publishYear || book.pageCount) { processed++; continue; }

      await new Promise(res => setTimeout(res, 1000));
      const meta = await findMetaByTitle(book.originalTitle || book.title, book.author);
      processed++;

      if (meta.publishYear || meta.pageCount) {
        if (meta.publishYear) book.publishYear = meta.publishYear;
        if (meta.pageCount) book.pageCount = meta.pageCount;
        foundCount++;
        if (foundCount % 8 === 0) saveBooks();
      }
      statusMessage.textContent = tf('searchingMetaProgress', { done: processed, total: missing.length, found: foundCount });
    }
    saveBooks(true);
    filterAndRenderBooks();
    statusMessage.textContent = '';
    if (foundCount > 0) {
      showToast(tf('metaFoundSummary', { found: foundCount, total: missing.length }), 'success', 6000);
    } else {
      showToast(t('noMetaFound'), 'info');
    }
  } finally {
    bulkMetaInProgress = false;
    bulkFindMetaBtn.disabled = false;
    updateMissingMetaInfo();
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

// R11 — Volanie Gemini API s automatickým opakovaním pri preťažení.
// Chyby 503 („overloaded"/„high demand") a 429 (rate limit) sú zvyčajne
// dočasné — skúsime ešte 1-2x po krátkej pauze, než to vzdáme. Ostatné
// chyby (403, 400…) vrátime hneď, opakovanie by nepomohlo.
async function geminiFetchRetry(apiUrl, payload, maxAttempts = 3) {
  let lastResp = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (response.ok) return response;
    lastResp = response;
    // Opakuj len pri dočasných chybách preťaženia.
    if (response.status === 503 || response.status === 429) {
      if (attempt < maxAttempts - 1) {
        await new Promise(r => setTimeout(r, 1500 * (attempt + 1))); // 1.5s, 3s
        continue;
      }
    }
    break; // iná chyba alebo posledný pokus
  }
  return lastResp;
}

async function searchViaGeminiWeb(book) {
  const apiKey = (localStorage.getItem(API_KEY_STORAGE) || '').trim();
  if (!apiKey) {
    showError(t('geminiKeyNeededSearch'));
    return null;
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const searchTerm = book.originalTitle ? `${book.title} (${book.originalTitle})` : book.title;
  const lang = getLanguageInfo(getUserLanguage());
  const systemPrompt = "You are a helpful research assistant for a personal book catalog. Use web search to find publicly available information about the specific book edition described, then respond with structured JSON only.";
  // Poznámka: Gemini cez grounding často nevie spoľahlivo skonštruovať priamu
  // funkčnú URL obrázka obalu (vidí len text výsledkov vyhľadávania, nie
  // skutočné obrázkové súbory) — preto žiadame radšej odkaz na stránku
  // (antikvariát/databáza), odkiaľ si obal vieš stiahnuť a nahrať ručne.
  // Popis generujeme v jazyku knižnice (lang.name) — EN používateľ dostane
  // anglický popis. Do zdieľanej SK/CZ DB sa aj tak nahrá len SK/CZ text
  // (kontrola looksSlovakOrCzech pri prispievaní), takže EN popis ostane lokálny.
  const userQuery = `Nájdi informácie o knihe "${searchTerm}" od autora "${book.author || t('unknown')}" (žáner: ${book.genre || t('unknown')}).
Hľadaj na stránkach ako databazeknih.cz, cbdb.cz, knihy.abz.cz, martinus.sk, goodreads.com, alebo stránky vydavateľstiev.
Ak nájdeš obal knihy, získaj PRIAMU URL obrázka (končiacu na .jpg, .png, .webp) — nie URL stránky, ale samotného obrázka.
Zhrň dej knihy vlastnými slovami v jazyku ${lang.name} (6-8 viet — vystihni zápletku, hlavné postavy a atmosféru, no neprezrádzaj koniec).

Odpovedz IBA validným JSON objektom, bez markdown, bez úvodzoviek:
{"coverImageUrl": "https://...priama url obrazka.jpg alebo null", "description": "popis v jazyku ${lang.name} alebo null"}`;

  const payload = {
    contents: [{ parts: [{ text: userQuery }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    tools: [{ google_search: {} }]
  };

  try {
    const response = await geminiFetchRetry(apiUrl, payload);

    if (!response.ok) {
      const errBody = await response.json().catch(() => null);
      showError(t('geminiSearchFailed') + (errBody?.error?.message || ('HTTP ' + response.status)));
      return null;
    }

    const result = await response.json();
    let text = result.candidates?.[0]?.content?.parts?.find(p => p.text)?.text?.trim();
    if (!text) {
      showError(t('geminiNoResponse'));
      return null;
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const cleanedText = jsonMatch ? jsonMatch[0] : text.replace(/^```json\s*|\s*```$/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleanedText);
    } catch (e) {
      showError(t('geminiBadFormat'));
      return null;
    }

    const description = (parsed.description && parsed.description !== 'null') ? parsed.description : null;
    const coverImageUrl = (parsed.coverImageUrl && parsed.coverImageUrl !== 'null') ? parsed.coverImageUrl : null;

    return { description, coverImageUrl };
  } catch (error) {
    console.error(t('geminiSearchErr'), error);
    showError(t('geminiConnectFail'));
    return null;
  }
}

async function translateDescription(book) {
  const apiKey = (localStorage.getItem(API_KEY_STORAGE) || '').trim();
  if (!apiKey) {
    showError(t('geminiKeyNeededTranslate'));
    return null;
  }
  if (!book.description) return null;

  const lang = getLanguageInfo(getUserLanguage());
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const systemPrompt = `You are a helpful assistant that writes short book summaries in ${lang.name} for a personal library catalog.`;
  const userQuery = `Na základe nasledujúceho cudzojazyčného popisu knihy "${book.title}" od autora "${book.author || t('unknown')}" napíš vlastnými slovami sformulovanú anotáciu v jazyku: ${lang.name} (6-8 viet, bez doslovného prekladu vety po vete — vystihni zápletku, hlavné postavy a atmosféru). Odpovedz IBA samotným textom anotácie v jazyku ${lang.name}, bez úvodzoviek, bez nadpisu, bez ďalšieho komentára.\n\nPôvodný popis:\n${book.description}`;

  const payload = {
    contents: [{ parts: [{ text: userQuery }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] }
  };

  try {
    const response = await geminiFetchRetry(apiUrl, payload);

    if (!response.ok) {
      const errBody = await response.json().catch(() => null);
      showError('Preklad sa nepodaril: ' + (errBody?.error?.message || ('HTTP ' + response.status)));
      return null;
    }

    const result = await response.json();
    const translated = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!translated) {
      showError(t('geminiNoTranslation'));
      return null;
    }
    return translated;
  } catch (error) {
    console.error('Chyba pri preklade popisu:', error);
    showError(t('geminiConnectFailTranslate'));
    return null;
  }
}

async function fetchAllMissingDetails() {
  // Chýba obal = skúsime znova (aj keby kniha už má popis z predošlého behu bez Wikidata fallbacku).
  const missing = allBooks.filter(b => !b.coverUrl);
  if (missing.length === 0) return;

  const enabledSources = getEnabledSources();
  if (!enabledSources.catalog && !enabledSources.openLibrary && !enabledSources.googleBooks && !enabledSources.wikidata) {
    errorMessage.textContent = t('pickAtLeastOneSource');
    return;
  }

  // Automatický preklad popisov beží len ak je nastavený Gemini kľúč —
  // overíme to raz vopred, nech sa pri každej knihe nezobrazuje rovnaká
  // chyba "chýba kľúč" a beh sa zbytočne nespomaľuje márnymi pokusmi.
  const canAutoTranslate = !!(localStorage.getItem(API_KEY_STORAGE) || '').trim();

  fetchInProgress = true;
  fetchShouldStop = false;
  fetchMissingBtn.disabled = true;
  stopFetchBtn.style.display = 'inline-flex';
  showLoader(tf('fillingCoversStart', { total: missing.length }));
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
          statusMessage.textContent = tf('fillingCoversProgress', { total: missing.length, done: processed });
        }
        // iná sieťová chyba (napr. file:// alebo výpadok, alebo rate-limit) — skús ďalšiu knihu
        continue;
      }

      book.coverUrl = details.coverUrl;
      book.description = details.description;
      if (details.publishYear) book.publishYear = details.publishYear;
      if (details.pageCount) book.pageCount = details.pageCount;

      // Automatický preklad — ak nový popis vyzerá byť v inom jazyku než
      // zvolený default, rovno ho preložíme (namiesto čakania, kým si to
      // používateľ všimne a klikne na manuálne tlačidlo "Preložiť popis").
      if (canAutoTranslate && descriptionLooksForeign(book.description)) {
        const translated = await translateDescription(book);
        if (translated) book.description = translated;
      }

      count++;
      statusMessage.textContent = tf('fillingCoversProgress', { total: missing.length, done: processed });
      if (count % 8 === 0) {
        saveBooks();
        filterAndRenderBooks();
      }
    }
    saveBooks();

    if (stoppedEarly) {
      hideLoader();
      statusMessage.textContent = '';
      errorMessage.textContent = tf('fillingStopped', { done: processed, total: missing.length });
    } else if (rateLimitedCount > 0) {
      showRetryButton();
      statusMessage.textContent = '';
      errorMessage.textContent = tf('gbExhausted', { n: rateLimitedCount });
    } else {
      hideLoader();
      if (count > 0) {
        showToast(tf('coversFilledSummary', { done: count, total: missing.length }), 'success');
      }
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
  bookGenreInput.innerHTML = GENRES.map(g => `<option value="${escapeHtml(g)}">${escapeHtml(displayGenre(g))}</option>`).join('');
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

  if (filterLoaned) {
    toDisplay = toDisplay.filter(b => !!b.loanedTo);
  }
  if (selectedGenre !== 'Všetky') {
    toDisplay = toDisplay.filter(b => (b.genre || 'Nezaradené') === selectedGenre);
  }
  if (selectedAuthor) {
    toDisplay = toDisplay.filter(b => ((b.author || '').trim() || t('unknownAuthor')) === selectedAuthor);
  }
  if (term) {
    toDisplay = toDisplay.filter(b =>
      b.title.toLowerCase().includes(term) ||
      (b.author && b.author.toLowerCase().includes(term))
    );
  }
  toDisplay = sortBooks(toDisplay, sortSelect.value);
  renderBooks(toDisplay, sortSelect.value);
}

// Zoradí kópiu poľa kníh podľa zvoleného kritéria. Triedenie sa aplikuje
// vnútri každej žánrovej sekcie (poradie sekcií samotných zostáva abecedné).
function sortBooks(books, sortKey) {
  const sorted = [...books];
  const byTitle = (a, b) => a.title.localeCompare(b.title, getUiLanguage(), { sensitivity: 'base' });
  const byAuthor = (a, b) => (a.author || '').localeCompare(b.author || '', getUiLanguage(), { sensitivity: 'base' });

  switch (sortKey) {
    case 'title-desc':
      return sorted.sort((a, b) => byTitle(b, a));
    case 'author-asc':
      return sorted.sort((a, b) => byAuthor(a, b) || byTitle(a, b));
    case 'author-desc':
      return sorted.sort((a, b) => byAuthor(b, a) || byTitle(a, b));
    case 'added-desc':
      return sorted.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    case 'added-asc':
      return sorted.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    case 'title-asc':
    default:
      return sorted.sort(byTitle);
  }
}

function renderSidebar() {
  const genresPresent = [...new Set(allBooks.map(b => b.genre || 'Nezaradené'))]
    .sort((a, b) => a.localeCompare(b, getUiLanguage()));

  let html = `<a href="#" class="genre-link ${selectedGenre === 'Všetky' ? 'active' : ''}" data-genre="Všetky">
      <span class="label"><span class="swatch" style="background:var(--ink-soft);"></span>${t('allCategoriesLabel')}</span><span class="count">${allBooks.length}</span></a>`;

  genresPresent.forEach(genre => {
    const count = allBooks.filter(b => (b.genre || 'Nezaradené') === genre).length;
    const swatchColor = swatchColorForGenre(genre);
    html += `<a href="#" class="genre-link ${selectedGenre === genre ? 'active' : ''}" data-genre="${escapeHtml(genre)}">
        <span class="label"><span class="swatch" style="background:${swatchColor};"></span>${escapeHtml(displayGenre(genre))}</span><span class="count">${count}</span></a>`;
  });
  genreListContainer.innerHTML = html;
  if (mobileCategoriesActiveLabel) {
    mobileCategoriesActiveLabel.textContent = selectedGenre === 'Všetky' ? '' : displayGenre(selectedGenre);
  }
  renderAuthorList(authorSearchInput ? authorSearchInput.value : '');
}

// R1 — Zoznam autorov v bočnej lište. Zobrazuje autorov (voliteľne filtrovaných
// podľa hľadaného textu); klik vyfiltruje knihy daného autora. Bez hľadania
// ukáže max 30 autorov, nech to nie je pridlhé.
function renderAuthorList(filter = '') {
  if (!authorListContainer) return;
  const authorCounts = {};
  allBooks.forEach(b => {
    const a = (b.author || '').trim() || t('unknownAuthor');
    authorCounts[a] = (authorCounts[a] || 0) + 1;
  });

  const term = filter.toLowerCase().trim();
  let authors = Object.keys(authorCounts)
    .filter(a => !term || a.toLowerCase().includes(term))
    .sort((a, b) => a.localeCompare(b, getUiLanguage(), { sensitivity: 'base' }));

  if (authors.length === 0) {
    authorListContainer.innerHTML = `<p style="font-size:12px; color:var(--ink-soft); margin:6px 0 0;">${t('noAuthorFound')}</p>`;
    return;
  }

  let html = '';
  // „Všetci autori" na zrušenie filtra (len keď nehľadáme)
  if (!term) {
    html += `<a href="#" class="genre-link ${!selectedAuthor ? 'active' : ''}" data-author="">
        <span class="label">${t('allAuthorsLabel')}</span><span class="count">${Object.keys(authorCounts).length}</span></a>`;
    authors = authors.slice(0, 30);
  }
  authors.forEach(a => {
    const isUnknown = a === t('unknownAuthor');
    html += `<a href="#" class="genre-link ${selectedAuthor === a ? 'active' : ''}" data-author="${escapeHtml(a)}">
        <span class="label">${escapeHtml(a)}</span><span class="count">${authorCounts[a]}</span></a>`;
  });
  authorListContainer.innerHTML = html;
}

function renderBooks(booksToRender, sortKey) {
  bookList.innerHTML = '';
  bookCount.textContent = allBooks.length;

  if (allBooks.length === 0) {
    emptyState.style.display = 'block';
    emptyState.textContent = t('emptyLibrary');
    return;
  }
  if (booksToRender.length === 0) {
    emptyState.style.display = 'block';
    emptyState.textContent = t('emptySearch');
    return;
  }
  emptyState.style.display = 'none';

  if (currentViewMode === 'shelf') {
    renderShelfView(booksToRender, sortKey);
    return;
  }

  // Pri "Všetky kategórie" so zvoleným triedením, ktoré nie je "Názov A-Z"
  // (napr. "Najnovšie pridané"), zoznam zámerne NEROZDEĽUJEME na žánrové
  // sekcie — používateľ chce vidieť napr. naozaj najnovšie pridanú knihu
  // ako prvú v celom katalógu, nie len prvú v rámci jej žánrovej sekcie.
  // Pri "Názov A-Z" žánrové sekcie ostávajú, lebo s abecedným triedením
  // prirodzene pôsobia ako prehľadné zoskupenie, nie ako prekážka.
  const showFlatList = selectedGenre === 'Všetky' && sortKey && sortKey !== 'title-asc';

  if (showFlatList) {
    const grid = document.createElement('div');
    grid.className = 'grid';
    booksToRender.forEach(b => grid.appendChild(createBookElement(b)));
    bookList.appendChild(grid);
    return;
  }

  const byGenre = booksToRender.reduce((acc, b) => {
    const g = b.genre || 'Nezaradené';
    (acc[g] = acc[g] || []).push(b);
    return acc;
  }, {});

  if (selectedGenre === 'Všetky') {
    const genreNames = Object.keys(byGenre).sort((a, b) => a.localeCompare(b, getUiLanguage()));
    genreNames.forEach(genre => bookList.appendChild(createGenreSection(genre, byGenre[genre])));
  } else if (byGenre[selectedGenre]) {
    const grid = document.createElement('div');
    grid.className = 'grid';
    byGenre[selectedGenre].forEach(b => grid.appendChild(createBookElement(b)));
    bookList.appendChild(grid);
  }
}

// ============================================================
// Knižná polica — alternatívne zobrazenie katalógu, knihy ako úzke
// chrbty vedľa seba (horizontálne), len názov + autor, žiadne ďalšie
// údaje. Vizuálne pripomína skutočnú policu s knihami.
// ============================================================

function renderShelfView(booksToRender, sortKey) {
  const showFlatList = selectedGenre === 'Všetky' && sortKey && sortKey !== 'title-asc';

  if (showFlatList) {
    appendShelfBooks(bookList, booksToRender);
    return;
  }

  const byGenre = booksToRender.reduce((acc, b) => {
    const g = b.genre || 'Nezaradené';
    (acc[g] = acc[g] || []).push(b);
    return acc;
  }, {});

  if (selectedGenre === 'Všetky') {
    const genreNames = Object.keys(byGenre).sort((a, b) => a.localeCompare(b, getUiLanguage()));
    genreNames.forEach(genre => {
      const section = document.createElement('div');
      section.className = 'genre-section';
      section.innerHTML = `<h3>${escapeHtml(displayGenre(genre))} <span class="tally">— ${byGenre[genre].length} ${bookCountWord(byGenre[genre].length)}</span></h3>`;
      appendShelfBooks(section, byGenre[genre]);
      bookList.appendChild(section);
    });
  } else if (byGenre[selectedGenre]) {
    appendShelfBooks(bookList, byGenre[selectedGenre]);
  }
}

// Rozdeľuje knihy do riadkov podľa šírky kontajnera — každý riadok je
// samostatná "polica" s čiarou dole. Prvých SHELF_INITIAL_COUNT kníh
// vykreslí hneď, zvyšok lazy-loadom cez Intersection Observer.
const SHELF_INITIAL_COUNT = 40;
const SHELF_LAZY_BATCH = 30;

function appendShelfBooks(container, books) {
  const containerWidth = bookList.clientWidth || 900;
  const GAP = 3;

  // Rozdelíme books do riadkov podľa šírky
  function splitIntoRows(bookList) {
    const rows = [];
    let currentRow = [];
    let currentWidth = 0;
    for (const book of bookList) {
      const w = shelfSpineWidth(book) + GAP;
      if (currentWidth + w > containerWidth && currentRow.length > 0) {
        rows.push(currentRow);
        currentRow = [book];
        currentWidth = w;
      } else {
        currentRow.push(book);
        currentWidth += w;
      }
    }
    if (currentRow.length > 0) rows.push(currentRow);
    return rows;
  }

  const initial = books.slice(0, SHELF_INITIAL_COUNT);
  const remaining = books.slice(SHELF_INITIAL_COUNT);

  // Vykreslíme prvé riadky
  splitIntoRows(initial).forEach(row => container.appendChild(createShelfRow(row)));

  // Lazy load zvyšku
  if (remaining.length === 0) return;

  const sentinel = document.createElement('div');
  sentinel.className = 'shelf-lazy-sentinel';
  container.appendChild(sentinel);

  let loaded = 0;
  const observer = new IntersectionObserver((entries) => {
    if (!entries[0].isIntersecting) return;
    const batch = remaining.slice(loaded, loaded + SHELF_LAZY_BATCH);
    splitIntoRows(batch).forEach(row => {
      container.insertBefore(createShelfRow(row), sentinel);
    });
    loaded += batch.length;
    if (loaded >= remaining.length) {
      observer.disconnect();
      sentinel.remove();
    }
  }, { rootMargin: '300px' });

  observer.observe(sentinel);
}

// Šírka chrbta sa odvíja od dĺžky najdlhšieho textu (názov, alebo autor) —
// pri pevnej výške police platí, že čím dlhší text, tým viac riadkov
// vertikálneho textu potrebuje, teda tým širší musí byť chrbát, aby sa
// doň zmestil bez orezania. Výška je rovnaká pre celú policu (rovnako
// ako majú skutočné knihy v sérii podobnú výšku), len mierne kolíše.
const SHELF_SPINE_HEIGHT = 280;
const SHELF_CHARS_PER_LINE = 15;

function shelfSpineWidth(book) {
  const titleLen = (book.title || '').length;
  const authorLen = (book.author || '').length;
  // Názov a autor sú v stĺpcoch vedľa seba (gap medzi nimi), takže ich
  // riadky sa sčítavajú — odhadneme celkový potrebný počet "riadkov".
  const titleLines = Math.max(1, Math.ceil(titleLen / SHELF_CHARS_PER_LINE));
  const authorLines = authorLen ? Math.max(1, Math.ceil(authorLen / SHELF_CHARS_PER_LINE)) + 1 : 0; // +1 riadok rezervy pre dlhšie autorské mená
  const totalLines = titleLines + authorLines;
  const minWidth = 28; // aj veľmi krátky názov potrebuje chrbát aspoň takto hrubý
  const perLineWidth = 19; // približná šírka jedného "riadku" vertikálneho textu (font + padding)
  return Math.max(minWidth, totalLines * perLineWidth);
}

function createShelfRow(books) {
  const wrap = document.createElement('div');
  wrap.className = 'shelf-row-wrap';
  const row = document.createElement('div');
  row.className = 'shelf-row';
  books.forEach((book, i) => {
    const spine = document.createElement('div');
    spine.className = 'shelf-spine';
    if (book.readStatus === 'read') spine.classList.add('is-read');
    spine.dataset.id = book.id;
    const width = shelfSpineWidth(book);
    spine.style.width = width + 'px';
    spine.style.height = (SHELF_SPINE_HEIGHT + (i % 3) * 6) + 'px';
    spine.style.background = shelfSpineColor(book);
    spine.title = `${book.title}${book.author ? ' — ' + book.author : ''}`;
    const readMark = book.readStatus === 'read'
      ? `<span class="spine-read-mark" title="${t('readTitle')}">✓</span>` : '';
    spine.innerHTML = `
      <span class="spine-text">
        <span class="spine-text-title">${escapeHtml(book.title)}</span>
        ${book.author ? `<span class="spine-text-author">${escapeHtml(book.author)}</span>` : ''}
      </span>${readMark}`;
    row.appendChild(spine);
  });
  wrap.appendChild(row);
  return wrap;
}

function createGenreSection(genre, books) {
  const section = document.createElement('div');
  section.className = 'genre-section';
  section.innerHTML = `<h3>${escapeHtml(displayGenre(genre))} <span class="tally">— ${books.length} ${bookCountWord(books.length)}</span></h3>`;
  const grid = document.createElement('div');
  grid.className = 'grid';
  books.forEach(b => grid.appendChild(createBookElement(b)));
  section.appendChild(grid);
  return section;
}

function createBookElement(book) {
  const el = document.createElement('div');
  el.className = 'book-card';
  el.dataset.id = book.id;
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
          ? `<span style="font-size:11px;color:var(--ink-soft);padding:8px;text-align:center;">${t('coverSearching')}</span>`
          : `<div class="book-spine" style="background:${spine.bg}; color:${spine.fg};">
               <span class="spine-title">${escapeHtml(book.title)}</span>
               <span class="spine-author">${escapeHtml(book.author) || ''}</span>
             </div>`
      }
      <button class="card-delete-btn" data-id="${book.id}" title="${t('removeFromCatalog')}" aria-label="${t('remove')}">✕</button>
      ${book.readStatus === 'read' ? `<span class="card-read-badge" title="${t('readTitle')}">✓</span>` : ''}
      ${book.loanedTo ? `<span class="card-loan-badge" title="${t('loaned')}: ${escapeHtml(book.loanedTo)}">${book.loanedAt ? (() => { const d = new Date(book.loanedAt); return `\u{1F4E4} ${d.getDate()}.${d.getMonth()+1}.${d.getFullYear()}`; })() : '\u{1F4E4}'}</span>` : ''}
    </div>
    <div class="book-body">
      <p class="book-title" title="${escapeHtml(book.title)}">${escapeHtml(book.title)}</p>
      <p class="book-author">${escapeHtml(book.author) || t('unknownAuthor')}</p>
      ${(book.publishYear || book.pageCount) ? `<p class="book-meta">${[book.publishYear, book.pageCount ? book.pageCount + ' s.' : null].filter(Boolean).join(' · ')}</p>` : ''}
      ${book.rating ? `<div class="card-rating" title="${book.rating}/5">${'★'.repeat(book.rating)}</div>` : ''}
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

// Heuristika: ak je default jazyk SK/CZ, kontrolujeme typickú diakritiku.
// Pre ostatné jazyky (kde túto jednoduchú kontrolu nemáme) radšej tlačidlo
// "Preložiť popis" zobrazíme vždy, keď popis existuje — nech si používateľ
// sám rozhodne, či preklad potrebuje (false positive je menej rušivé než
// skryté tlačidlo, ktoré by potreboval, ale nevidel).
function descriptionLooksForeign(text) {
  if (!text) return false;
  const lang = getUserLanguage();
  if (lang === 'sk' || lang === 'cs') {
    const skczDiacritics = /[áéíóúýäôčšžťďňľřěů]/i;
    return !skczDiacritics.test(text);
  }
  return true;
}

// Rozpozná, či je text slovenský/český (obsahuje charakteristickú SK/CZ
// diakritiku). Katalóg je SK/CZ, takže takýto text je „hodný databázy" —
// aj keď vznikol prekladom (R9 rozšírené: preklad do jazyka katalógu smie
// prispieť do zdieľanej DB, preklad do iného jazyka ostáva lokálny).
function looksSlovakOrCzech(text) {
  if (!text) return false;
  return /[áäčďéíĺľňóôŕšťúýžěřů-]/i.test(text) && /[čšžťďňľáíéúäôěř]/i.test(text);
}

async function handleDetailClick(bookId) {
  const book = allBooks.find(b => b.id === bookId);
  if (!book) return;
  currentModalBookId = bookId;
  exitEditMode();
  updateReadButton(book);
  updateLoanSection(book);

  modalTitle.textContent = book.title;
  if (book.originalTitle) {
    modalOriginalTitle.textContent = book.originalTitle;
    modalOriginalTitle.style.display = 'block';
  } else {
    modalOriginalTitle.style.display = 'none';
  }
  modalAuthor.textContent = book.author || t('unknownAuthor');
  modalGenre.textContent = displayGenre(book.genre || 'Nezaradené');
  updateModalIsbnDisplay(book);
  updateModalMetaDisplay(book);
  updateModalAiBadges(book);
  updateRatingDisplay(book);

  bookModal.classList.remove('hidden');
  requestAnimationFrame(() => {
    bookModal.style.opacity = '1';
    bookModal.querySelector('.modal-card').style.transform = 'scale(1)';
  });

  if (book.coverUrl || book.description) {
    modalLoader.style.display = 'none';
    modalDescription.style.display = book.description ? 'block' : 'none';
    if (book.coverUrl) {
      modalCover.src = book.coverUrl;
    } else {
      modalCover.removeAttribute('src');
      modalCover.style.background = 'var(--paper-deep)';
    }
    if (book.description) {
      modalDescription.textContent = book.description;
      updateTranslateButtonVisibility(book);
    }
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
        if (!book.coverUrl) book.coverUrl = details.coverUrl;
        if (!book.description) book.description = details.description; // neprepisuj existujúci popis (napr. od Gemini)
        if (details.publishYear) book.publishYear = details.publishYear;
        if (details.pageCount) book.pageCount = details.pageCount;
        saveBooks(true);
        filterAndRenderBooks();
      }

      if (book.coverUrl) {
        modalCover.src = book.coverUrl;
      } else {
        modalCover.removeAttribute('src');
      }
      modalDescription.textContent = details.networkError
        ? t('cantConnectGb')
        : book.description;
      updateTranslateButtonVisibility(book);
    } catch (error) {
      console.error(t('unexpectedDetailErr'), error);
      modalDescription.textContent = t('unexpectedDetailMsg');
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
    && book.description !== t('descNotFound');
  modalTranslateBtn.style.display = looksForeign ? 'inline-flex' : 'none';
}

function closeModalHandler() {
  bookModal.style.opacity = '0';
  bookModal.querySelector('.modal-card').style.transform = 'scale(0.96)';
  setTimeout(() => bookModal.classList.add('hidden'), 250);
  currentModalBookId = null;
  exitEditMode();
  closeMoreMenu();
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
  if (!book.isbn) {
    modalIsbn.style.display = 'none';
    return;
  }
  // ISBN samotné: zelená pre naskenované/ručne zadané (o číslach niet pochýb,
  // bolo fyzicky odčítané), oranžová len pre fulltextovo dohľadané (skutočne
  // neisté — môže patriť úplne inej knihe s podobným názvom).
  const isCertainIsbn = book.isbnSource === 'scanned' || book.isbnSource === 'manual';
  const dotColor = isCertainIsbn ? '#3F8F5C' : '#D9A441';
  const dotTitle = isCertainIsbn
    ? t('isbnCertain')
    : t('isbnProbable');

  let html = `<span style="display:inline-block; width:7px; height:7px; border-radius:50%; background:${dotColor}; margin-right:5px;" title="${dotTitle}"></span>ISBN ${escapeHtml(book.isbn)}`;

  // Aj keď je samotné ISBN isté, vydanie (rok/jazyk) nemusí byť potvrdené —
  // napr. kniha mala iný rok zapísaný a toto ISBN vrátilo iný rok. V tom
  // prípade zobrazíme jasné textové upozornenie, nech sa to nedá prehliadnuť.
  if (isCertainIsbn && book.isbnVerified === false) {
    html += ` <span style="color:#9A6A14; font-weight:600;" title="${t('editionMismatchTitle')}">${t('editionUnconfirmed')}</span>`;
  }

  modalIsbn.innerHTML = html;
  modalIsbn.style.display = 'inline-flex';
  modalIsbn.style.alignItems = 'center';
}

// Open Library aj Google Books vracajú jazyk ako ISO kód (rôzne dĺžky/varianty
// podľa zdroja) — táto mapa pokrýva najbežnejšie jazyky, ktoré sa v knižnici
// pravdepodobne vyskytnú, pre čitateľné zobrazenie namiesto holého kódu.
// Mapa ISO kódu → i18n kľúč s malými písmenami (langLower_*). Preklad sa
// rieši až v languageLabel() cez t(), aby sledoval jazyk rozhrania.
const LANGUAGE_CODE_LABELS = {
  slo: 'langLower_sk', sk: 'langLower_sk',
  cze: 'langLower_cs', cs: 'langLower_cs', cz: 'langLower_cs',
  eng: 'langLower_en', en: 'langLower_en',
  ger: 'langLower_de', de: 'langLower_de',
  fre: 'langLower_fr', fr: 'langLower_fr',
  spa: 'langLower_es', es: 'langLower_es',
  ita: 'langLower_it', it: 'langLower_it',
  rus: 'langLower_ru', ru: 'langLower_ru',
  pol: 'langLower_pl', pl: 'langLower_pl',
  hun: 'langLower_hu', hu: 'langLower_hu',
};
function languageLabel(code) {
  if (!code) return null;
  const key = LANGUAGE_CODE_LABELS[code.toLowerCase()];
  return key ? t(key) : code;
}

function updateModalMetaDisplay(book) {
  const parts = [
    book.publishYear,
    book.pageCount ? book.pageCount + t('pagesSuffix') : null,
    book.language ? languageLabel(book.language) : null,
    book.publisher || null
  ].filter(Boolean);
  if (parts.length > 0) {
    modalMeta.textContent = parts.join(' · ');
    modalMeta.style.display = 'inline';
  } else {
    modalMeta.style.display = 'none';
  }
}

function enterEditMode() {
  const book = allBooks.find(b => b.id === currentModalBookId);
  if (!book) return;

  editTitleInput.value = book.title || '';
  editOriginalTitleInput.value = book.originalTitle || '';
  editAuthorInput.value = book.author || '';
  editIsbnInput.value = book.isbn || '';
  editPublishYearInput.value = book.publishYear || '';
  editPageCountInput.value = book.pageCount || '';
  editGenreInput.innerHTML = GENRES.map(g =>
    `<option value="${escapeHtml(g)}" ${g === book.genre ? 'selected' : ''}>${escapeHtml(displayGenre(g))}</option>`
  ).join('');

  modalViewMode.style.display = 'none';
  modalEditMode.style.display = 'block';
  modalPrimaryActions.style.display = 'none';
  modalEditActions.style.display = 'flex';
  modalCoverPickBtn.style.display = 'flex';
  closeMoreMenu();
}

function exitEditMode() {
  modalViewMode.style.display = 'block';
  modalEditMode.style.display = 'none';
  modalPrimaryActions.style.display = 'flex';
  modalEditActions.style.display = 'none';
  modalCoverPickBtn.style.display = 'none';
}

async function saveEditedBook() {
  const book = allBooks.find(b => b.id === currentModalBookId);
  if (!book) return;

  const newTitle = editTitleInput.value.trim();
  if (!newTitle) {
    showError(t('titleEmpty'));
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
  if (isbnChanged) {
    book.isbnSource = book.isbn ? 'manual' : null;
    book.isbnVerified = null; // overíme nižšie, ak je nové ISBN vyplnené
  }
  book.genre = editGenreInput.value;
  book.publishYear = editPublishYearInput.value ? parseInt(editPublishYearInput.value, 10) : null;
  book.pageCount = editPageCountInput.value ? parseInt(editPageCountInput.value, 10) : null;

  // Ak sa zmenil názov, autor, originálny názov alebo ISBN, predošlý obal/popis
  // už nemusí sedieť — zresetujeme ich, aby sa pri ďalšom otvorení/rescane
  // vyhľadali znova. Vlastné nahraté obaly (customCover) sa zachovajú.
  if ((titleChanged || authorChanged || originalChanged || isbnChanged) && !book.customCover) {
    book.coverUrl = null;
    book.description = null;
    book.sourcesTried = {};
  }

  // Ak bolo ručne zadané nové ISBN, overíme ho rovnako ako pri skene —
  // porovnáme rok, ktorý appka pre knihu už mala, s rokom podľa tohto ISBN.
  if (isbnChanged && book.isbn) {
    const meta = await lookupBookByIsbn(book.isbn);
    book.isbnVerified = isbnYearMatches(book, meta.publishYear);
    if (meta.language && !book.language) book.language = meta.language;
    if (!book.publishYear && meta.publishYear) book.publishYear = meta.publishYear;
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
  modalAuthor.textContent = book.author || t('unknownAuthor');
  modalGenre.textContent = displayGenre(book.genre || 'Nezaradené');
  updateModalIsbnDisplay(book);
  updateModalMetaDisplay(book);

  // Po úprave názvu/autora potichu skontroluj katalóg a doplň LEN prázdne
  // polia (obálka, popis, rok, strany). Nič vyplnené sa neprepíše.
  // Toast sa zobrazí len ak sa naozaj niečo doplnilo.
  if (!book.coverUrl || !book.description) {
    const filled = await enrichBookFromCatalog(book);
    saveBooks(true);
    filterAndRenderBooks();
    if (filled.length) {
      showToast(tf('enrichedFromCatalog', { fields: filled.join(', ') }), 'success', 3000);
    }
  }
  if (book.coverUrl) {
    modalCover.src = book.coverUrl;
    modalDescription.textContent = book.description || t('descNotFound');
  }
}

async function rescanFromModal() {
  const book = allBooks.find(b => b.id === currentModalBookId);
  if (!book) return;

  modalRescanBtn.disabled = true;
  modalRescanBtn.style.opacity = '0.5';
  modalLoader.style.display = 'block';
  modalDescription.style.display = 'none';
  modalCover.removeAttribute('src');
  modalCover.style.background = 'var(--bg-sunk)';

  try {
    book.sourcesTried = {};
    const details = await fetchBookDetails(book.title, book.author, book.originalTitle, book, { openLibrary: true, googleBooks: true, wikidata: true });
    if (details.sources) book.sourcesTried = details.sources;
    if (!details.networkError) {
      book.coverUrl = details.coverUrl;
      book.description = details.description;
      if (details.publishYear) book.publishYear = details.publishYear;
      if (details.pageCount) book.pageCount = details.pageCount;
      saveBooks(true);
      filterAndRenderBooks();
    }
    if (book.coverUrl) {
      modalCover.src = book.coverUrl;
    } else {
      modalCover.removeAttribute('src');
    }

    const foundSomething = book.coverUrl || book.description;

    // Ak databázy nič nenašli, skúsime Gemini web search na pozadí
    if (!foundSomething && !details.networkError) {
      const apiKey = (localStorage.getItem(API_KEY_STORAGE) || '').trim();
      if (apiKey) {
        modalDescription.textContent = t('aiSearchingMeta');
        modalDescription.style.display = 'block';
        modalLoader.style.display = 'none';

        const result = await searchViaGeminiWeb(book);
        if (result) {
          if (result.description && !book.description) {
            book.description = result.description;
            updateTranslateButtonVisibility(book);
          }
          if (result.coverImageUrl && !book.coverUrl) {
            book.coverUrl = result.coverImageUrl;
            modalCover.src = result.coverImageUrl;
          } else if (result.coverImageUrl) {
            galleryCoverBookId = currentModalBookId;
            if (!galleryCovers.find(g => g.url === result.coverImageUrl)) {
              galleryCovers.push({ url: result.coverImageUrl, source: 'Gemini', generated: false });
            }
          }
          if (result.description || result.coverImageUrl) {
            saveBooks(true);
            filterAndRenderBooks();
          }
        }
      }
    }

    modalDescription.textContent = details.networkError
      ? t('cantConnectGb')
      : (book.description || t('descNotFound'));
  } catch (error) {
    console.error(t('unexpectedRescanModalErr'), error);
    modalDescription.textContent = t('unexpectedDetailMsg2');
  } finally {
    modalLoader.style.display = 'none';
    modalDescription.style.display = 'block';
    modalRescanBtn.disabled = false;
    modalRescanBtn.style.opacity = '';
  }
}

// ============================================================
// Gemini API — rozpoznávanie kníh z fotky (vyžaduje vlastný kľúč)
// ============================================================

async function analyzeImage(base64ImageData) {
  const apiKey = (localStorage.getItem(API_KEY_STORAGE) || '').trim();
  if (!apiKey) {
    showError(t('geminiKeyNeededPhoto'));
    return;
  }

  showScanOverlay(t('analyzingShelfPhoto'), t('recognizingSpines'));

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const systemPrompt = "You are an expert librarian AI. Your task is to accurately identify book titles and authors from images of bookshelves, and to honestly flag when text is unclear or only partially legible.";
  const userQuery = "From the provided image, identify all visible books on the shelf (by their spines or covers). Respond ONLY with a valid JSON array of objects, one per book, each with these keys: 'title' (string, your best reading of it), 'author' (string, empty '' if not visible), 'readable' (boolean — true only if you are reasonably confident in the title text, false if the spine was blurry, partially obscured, at a steep angle, or you had to guess significantly). Example: [{\"title\": \"The Hobbit\", \"author\": \"J.R.R. Tolkien\", \"readable\": true}, {\"title\": \"???ouse of L???\", \"author\": \"\", \"readable\": false}]. Include books even if you're unsure — just mark them readable:false. Do not include any text, notes or markdown formatting before or after the JSON array.";

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
          throw { fatal: true, message: errBody?.error?.message || tf('apiKeyRejected', { status: response.status }) };
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const candidate = result.candidates?.[0];

      if (candidate && candidate.content?.parts?.[0]?.text) {
        const identifiedBooks = JSON.parse(candidate.content.parts[0].text);
        if (Array.isArray(identifiedBooks) && identifiedBooks.length > 0) {
          updateScanOverlay(tf('foundBooks', { n: identifiedBooks.length }));
          await new Promise(res => setTimeout(res, 500)); // krátka pauza, nech sa stihne zobraziť výsledok
          hideScanOverlay();
          openShelfReviewModal(identifiedBooks);
        } else {
          hideScanOverlay();
          showError(t('noBooksRecognized'));
        }
      } else {
        throw new Error(t('unexpectedAiStructure'));
      }
      return;
    } catch (error) {
      if (error && error.fatal) {
        hideScanOverlay();
        showError(error.message);
        return;
      }
      attempts++;
      console.error(`Pokus ${attempts} zlyhal:`, error);
      if (attempts >= maxAttempts) {
        hideScanOverlay();
        showError(t('analyzeFailedRetries'));
        break;
      }
      updateScanOverlay(tf('retryingAttempt', { attempt: attempts + 1, max: maxAttempts }));
      await new Promise(res => setTimeout(res, Math.pow(2, attempts) * 1000));
    }
  }
}

// ============================================================
// Review modal pre knihy rozpoznané z fotky police — zobrazí zoznam
// s checkboxami pred pridaním, nečitateľné položky vizuálne označí.
// ============================================================

let shelfReviewBooks = [];

function openShelfReviewModal(identifiedBooks) {
  shelfReviewBooks = identifiedBooks.map((b, i) => ({
    tempId: 'shelf_' + i,
    title: (b.title || '').trim(),
    author: (b.author || '').trim(),
    readable: b.readable !== false,
    genre: 'Naskenované z fotky',
    selected: b.readable !== false // nečitateľné položky predvolene nezaškrtnuté
  }));

  const readableCount = shelfReviewBooks.filter(b => b.readable).length;
  const uncertainCount = shelfReviewBooks.length - readableCount;
  shelfReviewSummary.textContent = tf('foundBooksReadable', { n: shelfReviewBooks.length, readable: readableCount }) +
    (uncertainCount > 0 ? tf('uncertainRecognized', { n: uncertainCount }) : '.');

  renderShelfReviewList();

  shelfReviewModal.classList.remove('hidden');
  requestAnimationFrame(() => {
    shelfReviewModal.style.opacity = '1';
    shelfReviewModal.querySelector('.modal-card').style.transform = 'scale(1)';
  });
}

function closeShelfReviewModal() {
  shelfReviewModal.style.opacity = '0';
  shelfReviewModal.querySelector('.modal-card').style.transform = 'scale(0.97)';
  setTimeout(() => shelfReviewModal.classList.add('hidden'), 200);
}

function renderShelfReviewList() {
  shelfReviewList.innerHTML = shelfReviewBooks.map(b => `
    <label class="review-row ${b.readable ? '' : 'uncertain'}" data-temp-id="${b.tempId}">
      <input type="checkbox" class="review-checkbox" data-temp-id="${b.tempId}" ${b.selected ? 'checked' : ''}>
      <div style="flex:1; min-width:0;">
        <p class="review-title">${escapeHtml(b.title) || t('noTitle')}</p>
        <p class="review-author">${escapeHtml(b.author) || t('unknownAuthor')}</p>
        ${!b.readable ? `<p class="review-warning">${t('reviewWarning')}</p>` : ''}
      </div>
    </label>
  `).join('');
}

shelfReviewList.addEventListener('change', (e) => {
  if (!e.target.classList.contains('review-checkbox')) return;
  const tempId = e.target.dataset.tempId;
  const book = shelfReviewBooks.find(b => b.tempId === tempId);
  if (book) book.selected = e.target.checked;
});

shelfReviewSelectAllBtn.addEventListener('click', () => {
  shelfReviewBooks.forEach(b => { b.selected = b.readable; });
  renderShelfReviewList();
});

shelfReviewCancelBtn.addEventListener('click', closeShelfReviewModal);
shelfReviewModal.addEventListener('click', (e) => {
  if (e.target === shelfReviewModal) closeShelfReviewModal();
});

shelfReviewAddBtn.addEventListener('click', async () => {
  const toAdd = shelfReviewBooks.filter(b => b.selected && b.title);
  if (toAdd.length === 0) {
    closeShelfReviewModal();
    return;
  }

  closeShelfReviewModal();
  showScanOverlay(t('addingBooks'), tf('doneProgress', { done: 0, total: toAdd.length }));

  let count = 0;
  let skipped = 0;
  const needAsk = []; // 2A — rovnaký názov existuje s ISBN, treba sa spýtať

  for (const b of toAdd) {
    // source='shelf', silentDuplicateSkip=true → 2B ticho preskočí,
    // 2A vráti 'ask' (rozhodneme hromadne po cykle), 2C pridá.
    const result = await addBook(b.title, b.author, "Naskenované z fotky", '', true, '', true, 'shelf');
    if (result === 'duplicate') { skipped++; }
    else if (result === 'ask') { needAsk.push(b); }
    else { count++; }
    updateScanOverlay(tf('doneProgress', { done: count, total: toAdd.length }));
  }
  hideScanOverlay();

  // 2A — hromadné rozhodnutie pre knihy, kde existuje rovnaký názov s ISBN
  // (nevieme, či je to tá istá alebo iné vydanie). Jedna otázka pre všetky.
  if (needAsk.length > 0) {
    const addThem = confirm(tf('dupPhotoBulkPrompt', {
      count: needAsk.length,
      titles: needAsk.slice(0, 5).map(b => b.title).join(', ') + (needAsk.length > 5 ? '…' : '')
    }));
    if (addThem) {
      for (const b of needAsk) {
        // force pridať ako novú: source='manual' obíde shelf-vetvu, ale
        // keďže existujúca má ISBN a táto nemá, matchType bude title-has-isbn
        // → v manual vetve spadne do 3B confirm; preto pridáme priamo.
        const nb = {
          id: 'b_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
          title: b.title.trim(), author: (b.author || '').trim(),
          genre: 'Naskenované z fotky', originalTitle: '', isbn: '',
          coverUrl: null, description: null, createdAt: Date.now()
        };
        allBooks.unshift(nb);
        count++;
      }
      saveBooks(true);
      filterAndRenderBooks();
    } else {
      skipped += needAsk.length;
    }
  }

  const skippedNote = skipped > 0 ? tf('skippedInLibrary', { n: skipped }) : '';
  showToast(tf('addedToCatalog', { n: count, bookWord: bookCountWord(count), skippedNote }), 'success', 6000);
  await fetchAllMissingDetails();
});

// Rozpozná ISBN z fotky zadnej strany knihy (čiarový kód alebo vytlačené číslo).
// Vracia samotný ISBN string (alebo null) — volajúci kód rozhoduje, čo s ním urobí.
// ============================================================
// Live sken ISBN čiarového kódu cez kameru (BarcodeDetector API).
// Funguje natívne na Chrome/Edge (Android aj desktop s webkamerou).
// Safari/iOS túto prehliadačovú API nepodporuje vôbec — v tom prípade
// sa zobrazí fallback na klasický výber/odfotenie súboru.
// ============================================================

let isbnScanStream = null;
let isbnScanDetector = null;
let isbnScanLoopActive = false;
let isbnScanResolve = null; // callback (isbn) => void, nastaví ho openIsbnScanModal

function isbnScanSupported() {
  return 'BarcodeDetector' in window;
}

async function openIsbnScanModal(onDetected) {
  isbnScanResolve = onDetected;
  isbnScanStatus.textContent = t('pointCameraBarcode');
  isbnScanModal.classList.remove('hidden');
  requestAnimationFrame(() => {
    isbnScanModal.style.opacity = '1';
    isbnScanModal.querySelector('.modal-card').style.transform = 'scale(1)';
  });

  if (!isbnScanSupported()) {
    // Prehliadač nemá BarcodeDetector (typicky Safari/iOS) — rovno fallback.
    isbnScanVideoWrap.style.display = 'none';
    isbnScanFallback.style.display = 'block';
    isbnScanStatus.textContent = '';
    return;
  }

  isbnScanFallback.style.display = 'none';
  isbnScanVideoWrap.style.display = 'block';

  try {
    isbnScanStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } }
    });
    isbnScanVideo.srcObject = isbnScanStream;
    await isbnScanVideo.play();

    // EAN-13 je formát bežných ISBN čiarových kódov na knihách; pridávame
    // aj EAN-8 a Code 128 pre širšiu kompatibilitu s rôznymi vydaniami.
    isbnScanDetector = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'code_128'] });
    isbnScanLoopActive = true;
    runIsbnScanLoop();
  } catch (error) {
    console.error(t('cameraStartFail'), error);
    isbnScanVideoWrap.style.display = 'none';
    isbnScanFallback.style.display = 'block';
    isbnScanStatus.textContent = t('cameraAccessFail');
  }
}

async function runIsbnScanLoop() {
  while (isbnScanLoopActive) {
    try {
      const barcodes = await isbnScanDetector.detect(isbnScanVideo);
      if (barcodes.length > 0) {
        const raw = barcodes[0].rawValue;
        const isbn = normalizeIsbn(raw);
        if (isbn.length === 10 || isbn.length === 13) {
          isbnScanStatus.textContent = tf('recognized', { isbn });
          const callback = isbnScanResolve;
          closeIsbnScanModal();
          if (callback) callback(isbn);
          return;
        }
      }
    } catch (error) {
      // chvíľková chyba detekcie (napr. video ešte nie je pripravené) — pokračujeme ďalej
    }
    await new Promise(res => setTimeout(res, 300));
  }
}

function closeIsbnScanModal() {
  isbnScanLoopActive = false;
  if (isbnScanStream) {
    isbnScanStream.getTracks().forEach(track => track.stop());
    isbnScanStream = null;
  }
  isbnScanVideo.srcObject = null;
  isbnScanModal.style.opacity = '0';
  isbnScanModal.querySelector('.modal-card').style.transform = 'scale(0.97)';
  setTimeout(() => isbnScanModal.classList.add('hidden'), 200);
}

isbnScanCancelBtn.addEventListener('click', () => {
  isbnScanResolve = null;
  closeIsbnScanModal();
});
isbnScanModal.addEventListener('click', (e) => {
  if (e.target === isbnScanModal) {
    isbnScanResolve = null;
    closeIsbnScanModal();
  }
});

// Fallback file input (v rámci samotného modalu) — keď BarcodeDetector
// nie je dostupný, alebo zlyhal prístup ku kamere.
isbnScanFallbackUpload.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const callback = isbnScanResolve;
  isbnScanResolve = null;
  closeIsbnScanModal();

  const reader = new FileReader();
  reader.onloadend = async () => {
    const base64String = reader.result.replace('data:', '').replace(/^.+,/, '');
    const isbn = await analyzeIsbnImage(base64String);
    if (isbn && callback) callback(isbn);
  };
  reader.onerror = () => showError(t('fileLoadErr'));
  reader.readAsDataURL(file);
  isbnScanFallbackUpload.value = '';
});

async function analyzeIsbnImage(base64ImageData) {
  const apiKey = (localStorage.getItem(API_KEY_STORAGE) || '').trim();
  if (!apiKey) {
    showError(t('geminiKeyNeededIsbn'));
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
      showError(t('geminiNoResponsePhoto'));
      return null;
    }

    const parsed = JSON.parse(text);
    const isbn = normalizeIsbn(parsed.isbn || '');
    if (!isbn || (isbn.length !== 10 && isbn.length !== 13)) {
      showError(t('noReadableIsbn'));
      return null;
    }
    return isbn;
  } catch (error) {
    console.error(t('isbnRecognizeErr'), error);
    showError(t('geminiConnectFailIsbn'));
    return null;
  }
}

// Celý tok "pridať knihu odfotením ISBN": rozpozná ISBN z fotky, podľa neho
// dohľadá názov/autora/obal/popis (Open Library, prípadne Google Books)
// a rovno pridá novú knihu do katalógu.
// Vyhľadá názov/autora/obal/popis podľa ISBN — Open Library ako prvé
// (presné, žiadny denný limit), Google Books ako záložný zdroj.
// Porovná rok vydania, ktorý kniha už má (ak nejaký), s rokom vráteným
// pri vyhľadaní podľa ISBN — slúži na rozlíšenie "ISBN je isté, ALE
// nevieme potvrdiť, že ide o presne toto vydanie" od "ISBN aj vydanie
// sedí". Vracia true ak nemáme oba roky na porovnanie (nie je s čím byť
// v rozpore), alebo ak sa zhodujú; false len ak oba existujú a nesedia.
function isbnYearMatches(book, newPublishYear) {
  if (!book.publishYear || !newPublishYear) return true;
  return book.publishYear === newPublishYear;
}

// ============================================================
// Vlastný katalóg (Supabase cez Netlify funkciu) — PRVÝ zdroj metadát.
// Pýta sa cez /.netlify/functions/catalog-lookup, ktorá drží Supabase
// kľúč na serveri (nikdy nie je v prehliadači). Keď katalóg knihu nemá,
// vráti null a appka plynulo pokračuje na Open Library / Google Books.
// Pri lokálnom vývoji bez Netlify funkcia neexistuje — vtedy len vráti
// null (žiadna chyba), takže appka funguje aj bez katalógu.
// ============================================================
async function fetchFromCatalog({ isbn, title, author } = {}) {
  const params = new URLSearchParams();
  if (isbn) params.set('isbn', isbn);
  if (title) params.set('title', title);
  if (author) params.set('author', author);
  if (![...params.keys()].length) return null;

  try {
    const res = await fetchWithTimeout('/.netlify/functions/catalog-lookup?' + params.toString(), 6000);
    if (!res.ok) return null;
    const data = await res.json();
    return data && data.found ? data.book : null;
  } catch (e) {
    // Ticho — katalóg je len prvý pokus, ostatné zdroje bežia ďalej.
    return null;
  }
}

// ============================================================
// Tiché doplnenie chýbajúcich údajov knihy z katalógu (a fallback
// Open Library / Google Books). Dopĺňa LEN prázdne polia — nikdy
// neprepisuje to, čo používateľ vyplnil. Vráti pole názvov doplnených
// polí (napr. ['obálka','popis']), aby volajúci vedel, či niečo pribudlo.
// ============================================================
async function enrichBookFromCatalog(book) {
  if (!book || !book.title) return [];
  const filled = [];

  // Čo knihe chýba? Ak má všetko, netreba nič robiť.
  const needsCover = !book.coverUrl;
  const needsDesc = !book.description || book.description === t('descNotFound');
  const needsYear = !book.publishYear;
  const needsPages = !book.pageCount;
  if (!needsCover && !needsDesc && !needsYear && !needsPages) return [];

  // Použijeme rovnaký reťazec zdrojov ako pri pridaní (katalóg → OL → GB).
  // fetchBookDetails vracia coverUrl/description/publishYear/pageCount.
  let details;
  try {
    details = await fetchBookDetails(
      book.title, book.author, book.originalTitle, book, getEnabledSources()
    );
  } catch (e) {
    return [];
  }
  if (!details) return [];

  // Doplň LEN prázdne polia.
  if (needsCover && details.coverUrl) { book.coverUrl = details.coverUrl; filled.push('obálka'); }
  if (needsDesc && details.description && details.description !== t('descNotFound')) {
    book.description = details.description; filled.push('popis');
  }
  if (needsYear && details.publishYear) { book.publishYear = details.publishYear; filled.push('rok'); }
  if (needsPages && details.pageCount) { book.pageCount = details.pageCount; filled.push('strany'); }

  if (details.sources) book.sourcesTried = details.sources;

  return filled;
}

// ============================================================
// Periodické doplnenie z katalógu — pár krát za deň prejde knihy, ktorým
// niečo chýba, a doplní ich z KATALÓGU (databáza priebežne dostáva nové
// obálky/popisy). Spustí sa max raz za PERIODIC_SCAN_INTERVAL, aby to
// nezaťažovalo API pri každom otvorení stránky. Používa LEN katalóg
// (náš zdroj, bez limitov) — externé zdroje (OL/GB) sa tu zámerne
// nevolajú, aby sa nevyčerpávali ich kvóty; tie rieši manuálne dopĺňanie.
// ============================================================
const PERIODIC_SCAN_KEY = 'domaca_kniznica_last_catalog_scan';
const PERIODIC_SCAN_INTERVAL = 8 * 60 * 60 * 1000; // 8 hodín

async function periodicCatalogScan() {
  const last = parseInt(localStorage.getItem(PERIODIC_SCAN_KEY) || '0', 10);
  if (Date.now() - last < PERIODIC_SCAN_INTERVAL) return; // ešte nie je čas

  // Knihy, ktorým chýba obálka alebo popis (rok/strany sú menej dôležité).
  const incomplete = allBooks.filter(b => b.title && (!b.coverUrl || !b.description));
  if (!incomplete.length) {
    localStorage.setItem(PERIODIC_SCAN_KEY, String(Date.now()));
    return;
  }

  let totalFilled = 0;
  for (const book of incomplete) {
    // Pýtame sa LEN katalógu (nie OL/GB), doplníme len prázdne polia.
    let cat = null;
    try {
      cat = await fetchFromCatalog({ isbn: book.isbn, title: book.title, author: book.author });
    } catch (e) { continue; }
    if (!cat) continue;

    let changed = false;
    if (!book.coverUrl && cat.coverUrl) { book.coverUrl = cat.coverUrl; changed = true; }
    if ((!book.description || book.description === t('descNotFound')) && cat.description) {
      book.description = cat.description; changed = true;
    }
    if (!book.publishYear && cat.publishYear) { book.publishYear = cat.publishYear; changed = true; }
    if (!book.pageCount && cat.pageCount) { book.pageCount = cat.pageCount; changed = true; }
    if (changed) totalFilled++;

    // Malá pauza, nech nezahltíme Supabase pri veľkom katalógu.
    await new Promise(r => setTimeout(r, 150));
  }

  localStorage.setItem(PERIODIC_SCAN_KEY, String(Date.now()));

  if (totalFilled > 0) {
    saveBooks(true);
    filterAndRenderBooks();
    showToast(tf('periodicScanFilled', { count: totalFilled }), 'success', 4000);
  }
}

async function lookupBookByIsbn(isbn) {
  let title = null, author = null, coverUrl = null, description = null, publishYear = null, pageCount = null, language = null;

  // ---- 0) Vlastný katalóg (Supabase) — najprv, najlepšie pokrytie SK/CZ ----
  try {
    const c = await fetchFromCatalog({ isbn });
    if (c) {
      title = c.title || null;
      author = c.author || null;
      coverUrl = c.coverUrl || null;
      description = c.description || null;
      publishYear = c.publishYear || null;
      pageCount = c.pageCount || null;
      language = c.language || null;
    }
  } catch (e) { /* ignoruj, pokračuj na OL/Google */ }

  // Ak katalóg vrátil aspoň názov aj obálku, netreba ísť ďalej.
  if (title && coverUrl) {
    return { title, author, coverUrl, description, publishYear, pageCount, language };
  }

  try {
    const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(isbn)}&format=json&jscmd=data`;
    const res = await fetchWithTimeout(url, 6000);
    if (res.ok) {
      const data = await res.json();
      const book = data['ISBN:' + isbn];
      if (book) {
        // Dopĺňame len to, čo katalóg (zdroj 0) nenašiel — nikdy neprepisujeme
        // už získané hodnoty z vlastného katalógu.
        if (!title) title = book.title || null;
        if (!author) author = (book.authors || []).map(a => a.name).join(' / ') || null;
        if (!coverUrl) coverUrl = book.cover?.large || book.cover?.medium || null;
        if (!description) description = typeof book.notes === 'string' ? book.notes : (book.excerpts?.[0]?.text || null);
        if (!publishYear) {
          const yearMatch = (book.publish_date || '').match(/\d{4}/);
          publishYear = yearMatch ? parseInt(yearMatch[0], 10) : null;
        }
        if (!pageCount) pageCount = book.number_of_pages || null;
        if (!language) language = book.languages?.[0]?.key?.split('/').pop() || null;
      }
    }
  } catch (e) {
    console.error(t('olIsbnErr'), e);
  }

  if (!title) {
    try {
      const booksApiKey = (localStorage.getItem(BOOKS_API_KEY_STORAGE) || '').trim();
      let url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}&maxResults=1`;
      if (booksApiKey) url += `&key=${encodeURIComponent(booksApiKey)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const info = data.items?.[0]?.volumeInfo;
        if (info) {
          title = info.title || null;
          author = (info.authors || []).join(' / ') || null;
          if (!coverUrl) coverUrl = info.imageLinks?.thumbnail || null;
          if (!description) description = info.description || null;
          if (!publishYear) {
            const yearMatch = (info.publishedDate || '').match(/\d{4}/);
            publishYear = yearMatch ? parseInt(yearMatch[0], 10) : null;
          }
          if (!pageCount) pageCount = info.pageCount || null;
          if (!language) language = info.language || null;
        }
      }
    } catch (e) {
      console.error(t('gbIsbnErr'), e);
    }
  }

  return { title, author, coverUrl, description, publishYear, pageCount, language };
}

// Pridá novú knihu rovno podľa ISBN (bez fotky, napr. z live skenu) —
// vyhľadá metadáta a uloží do katalógu.
async function addBookFromIsbn(isbn) {
  showScanOverlay(t('searchingBook'), `ISBN ${isbn}`);

  const apiKey = (localStorage.getItem(API_KEY_STORAGE) || '').trim();
  let { title, author, coverUrl, description, publishYear, pageCount, language } = await lookupBookByIsbn(isbn);

  if (apiKey && description && descriptionLooksForeign(description)) {
    const translated = await translateDescription({ title: title || isbn, author, description });
    if (translated) description = translated;
  }

  hideScanOverlay();

  if (!title) {
    showToast(tf('isbnNotFoundInDb', { isbn }), 'error');
    return;
  }

  // Kontrola duplicity podľa matice (sken ISBN).
  const dup = findDuplicateBook({ title: title.trim(), author: (author || '').trim(), isbn });
  if (dup) {
    const existing = dup.book;

    // 1A — rovnaké ISBN už je → preskočiť + upozorniť.
    if (dup.matchType === 'isbn') {
      showToast(tf('dupAlreadyHaveIsbn', { title: existing.title }), 'info', 4000);
      return;
    }

    // 1B — rovnaký názov, existujúca BEZ ISBN → spýtať sa zlúčiť / nový záznam.
    if (dup.matchType === 'title-no-isbn') {
      const merge = confirm(
        tf('dupMergePrompt', { title: existing.title, authorPart: existing.author ? ' (' + existing.author + ')' : '' })
      );
      if (merge) {
        existing.isbn = isbn;
        if (!existing.coverUrl && coverUrl) existing.coverUrl = coverUrl;
        if (!existing.description && description) existing.description = description;
        if (!existing.publishYear && publishYear) existing.publishYear = publishYear;
        if (!existing.pageCount && pageCount) existing.pageCount = pageCount;
        existing.isbnSource = 'scanned';
        existing.isbnVerified = true;
        saveBooks(true);
        filterAndRenderBooks();
        showToast(tf('dupMerged', { title: existing.title }), 'success', 3500);
        return;
      }
      // inak pokračuje a pridá ako nový záznam (iné vydanie)
    }

    // title-has-isbn pri skene ISBN: obe majú ISBN ale rôzne → iné vydanie,
    // pridá sa ako nová (žiadna otázka netreba, ISBN sa líši).
  }

  const newBook = {
    id: 'b_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    title: title.trim(),
    author: (author || '').trim(),
    genre: 'Naskenované z fotky',
    originalTitle: '',
    isbn: isbn,
    isbnSource: 'scanned',
    isbnVerified: true, // nová kniha — žiadny predošlý rok na porovnanie, nie je s čím byť v rozpore
    coverUrl: coverUrl || null,
    description: description || null,
    publishYear: publishYear || null,
    pageCount: pageCount || null,
    language: language || null,
    sourcesTried: { openLibraryIsbn: coverUrl ? 'found' : 'empty' },
    createdAt: Date.now()
  };
  allBooks.unshift(newBook);
  saveBooks(true);
  filterAndRenderBooks();
  showToast(tf('added', { title: newBook.title }), 'success');
}

// Pridá knihu podľa fotky ISBN (fallback cesta, keď live sken nie je
// dostupný) — najprv Gemini rozpozná ISBN z obrázka, potom rovnaká
// logika ako addBookFromIsbn.
async function addBookFromIsbnScan(base64ImageData) {
  showScanOverlay(t('readingIsbn'), t('recognizingBarcode'));
  const isbn = await analyzeIsbnImage(base64ImageData);
  if (!isbn) {
    hideScanOverlay();
    return;
  }
  await addBookFromIsbn(isbn);
}

// ============================================================
// Event listeners
// ============================================================

openIsbnScanBtn.addEventListener('click', () => {
  openIsbnScanModal((isbn) => {
    addBookFromIsbn(isbn);
  });
});

shelfAddUpload.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onloadend = () => {
    const base64String = reader.result.replace('data:', '').replace(/^.+,/, '');
    analyzeImage(base64String);
  };
  reader.onerror = () => showError(t('fileLoadErr'));
  reader.readAsDataURL(file);
  shelfAddUpload.value = '';
});

openManualAddBtn.addEventListener('click', () => {
  const isHidden = manualAddPanel.style.display === 'none';
  manualAddPanel.style.display = isHidden ? 'block' : 'none';
  if (isHidden) {
    manualAddPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    bookTitleInput.focus();
  }
});

addBookForm.addEventListener('submit', (event) => {
  event.preventDefault();
  addBook(bookTitleInput.value, bookAuthorInput.value, bookGenreInput.value, bookOriginalTitleInput.value, false, normalizeIsbn(bookIsbnInput.value));
  addBookForm.reset();
  populateGenreSelect();
});

searchInput.addEventListener('input', filterAndRenderBooks);

filterLoanedBtn.addEventListener('click', () => {
  filterLoaned = !filterLoaned;
  filterLoanedBtn.style.background = filterLoaned ? 'var(--accent)' : 'var(--card)';
  filterLoanedBtn.style.color = filterLoaned ? '#fff' : 'var(--ink-soft)';
  filterLoanedBtn.style.borderColor = filterLoaned ? 'var(--accent)' : 'var(--line)';
  filterAndRenderBooks();
});

sortSelect.addEventListener('change', () => {
  localStorage.setItem(SORT_PREFERENCE_STORAGE, sortSelect.value);
  filterAndRenderBooks();
});

function setViewMode(mode) {
  currentViewMode = mode;
  localStorage.setItem(VIEW_MODE_STORAGE, mode);
  viewGridBtn.classList.toggle('active', mode === 'grid');
  viewShelfBtn.classList.toggle('active', mode === 'shelf');
  filterAndRenderBooks();
}
viewGridBtn.addEventListener('click', () => setViewMode('grid'));
viewShelfBtn.addEventListener('click', () => setViewMode('shelf'));

languageSelect.addEventListener('change', () => {
  localStorage.setItem(LANGUAGE_STORAGE, languageSelect.value);
  showToast(tf('libLangSetTo', { label: t('lang_' + languageSelect.value) }), 'success', 5000);
});

genreListContainer.addEventListener('click', (e) => {
  e.preventDefault();
  const link = e.target.closest('.genre-link');
  if (link && link.dataset.genre) {
    selectedGenre = link.dataset.genre;
    selectedAuthor = null; // výber kategórie zruší filter autora
    filterAndRenderBooks();
    sidebarPanel.classList.remove('mobile-open');
  }
});

// R1 — klik na autora v bočnej lište vyfiltruje jeho knihy
authorListContainer.addEventListener('click', (e) => {
  const link = e.target.closest('.genre-link');
  if (!link) return;
  e.preventDefault();
  selectedAuthor = link.dataset.author || null;
  selectedGenre = 'Všetky'; // výber autora zruší filter kategórie
  filterAndRenderBooks();
  sidebarPanel.classList.remove('mobile-open');
});

authorSearchInput.addEventListener('input', () => {
  renderAuthorList(authorSearchInput.value);
});

mobileCategoriesToggle.addEventListener('click', () => {
  sidebarPanel.classList.toggle('mobile-open');
});

bookList.addEventListener('click', (event) => {
  const deleteBtn = event.target.closest('.card-delete-btn');
  if (deleteBtn) {
    event.stopPropagation();
    if (confirm(t('confirmRemoveBook'))) {
      deleteBook(deleteBtn.dataset.id);
    }
    return;
  }
  const spine = event.target.closest('.shelf-spine');
  if (spine && spine.dataset.id) {
    handleDetailClick(spine.dataset.id);
    return;
  }
  const card = event.target.closest('.book-card');
  if (card && card.dataset.id) {
    handleDetailClick(card.dataset.id);
  }
});

// Vynúti znova vyhľadanie obalu/popisu pre jednu konkrétnu knihu,
// nezávisle od hromadného dopĺňania a bez ohľadu na to, či už obal má.
async function rescanBook(bookId, buttonEl) {
  const book = allBooks.find(b => b.id === bookId);
  if (!book) return;

  if (buttonEl) {
    buttonEl.disabled = true;
    buttonEl.textContent = t('searchingEllipsis');
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
      if (details.publishYear) book.publishYear = details.publishYear;
      if (details.pageCount) book.pageCount = details.pageCount;
      saveBooks(true);
    } else {
      showError(t('rescanFailed'));
    }
  } catch (error) {
    console.error(t('unexpectedRescanErr'), error);
    showError(t('unexpectedSearchMsg'));
  } finally {
    filterAndRenderBooks();
  }
}

modalCoverBtn.addEventListener('click', () => {
  openCoverGallery();
});

// ============================================================
// Galéria obalov — načíta obaly zo všetkých zdrojov naraz,
// umožní vybrať jeden alebo vygenerovať AI obal cez Gemini.
// ============================================================

// Zoznam obalov nájdených pre aktuálnu knihu — každý záznam:
// { url, source, generated } kde generated = true pre AI obaly
let galleryCovers = [];

// ID knihy pre ktorú sú galleryCovers platné
let galleryCoverBookId = null;

function openCoverGallery() {
  const book = allBooks.find(b => b.id === currentModalBookId);
  if (!book) return;

  // Vždy začni s čerstvým „aktuálnym" obalom (book.coverUrl), nie zo starej
  // cache — inak by po zmene obálky ostal v galérii neaktuálny „Aktuálny".
  galleryCoverBookId = currentModalBookId;
  galleryCovers = book.coverUrl
    ? [{ url: book.coverUrl, source: 'Aktuálny', generated: false }]
    : [];

  coverGalleryGrid.innerHTML = '';
  coverGalleryModal.style.display = 'flex';
  coverGalleryGenerateBtn.disabled = false;
  coverGalleryGenerateBtn.textContent = t('generateAiCover');
  coverGalleryUrlBox.style.display = 'none';
  renderGalleryCovers();

  // Automaticky dohľadaj VŠETKY dostupné obálky (katalóg, Open Library,
  // Google Books, Wikidata) — nech si používateľ vyberá z viacerých, nielen
  // z aktuálnej. Beží na pozadí, výsledky sa dopĺňajú priebežne.
  coverGalleryStatus.textContent = t('searchingInDbs');
  fetchAllGalleryCovers(book).then(() => {
    coverGalleryStatus.textContent = galleryCovers.length > 0
      ? t('clickCoverToSelect')
      : t('noCoverGenerate');
  }).catch(() => {
    coverGalleryStatus.textContent = galleryCovers.length > 0
      ? t('clickCoverToSelect')
      : t('noCoverGenerate');
  });
}

function renderGalleryCovers() {
  coverGalleryGrid.innerHTML = '';
  if (galleryCovers.length === 0) {
    coverGalleryGrid.innerHTML = `<p style="color:var(--ink-soft); font-size:13px; grid-column:1/-1;">${t('noCoversYet')}</p>`;
    return;
  }
  galleryCovers.forEach((item, idx) => {
    const wrap = document.createElement('div');
    wrap.className = 'cover-gallery-item';
    const book = allBooks.find(b => b.id === currentModalBookId);
    if (book && item.url === book.coverUrl) wrap.classList.add('selected');

    wrap.innerHTML = `
      <img src="${escapeHtml(item.url)}" loading="lazy" 
        style="background:var(--bg-sunk);"
        onerror="this.style.display='none'; this.nextElementSibling && this.nextElementSibling.classList.add('cover-src-broken');">
      <div class="cover-src-placeholder" style="display:none; position:absolute; inset:0; display:flex; align-items:center; justify-content:center; flex-direction:column; gap:6px; padding:8px; text-align:center;">
        <span style="font-size:20px;">🖼</span>
        <span style="font-size:9px; color:var(--ink-soft); word-break:break-all;">${escapeHtml(displaySource(item.source))}</span>
      </div>
      <span class="cover-src">${escapeHtml(displaySource(item.source))}</span>
      <button class="cover-delete" data-idx="${idx}" title="${t('remove')}">×</button>
    `;
    wrap.addEventListener('click', (e) => {
      if (e.target.classList.contains('cover-delete')) return;
      selectGalleryCover(item.url);
    });
    wrap.querySelector('.cover-delete').addEventListener('click', (e) => {
      e.stopPropagation();
      galleryCovers.splice(idx, 1);
      // Ak sme zmazali aktuálny obal, vyčistíme ho z knihy
      const book = allBooks.find(b => b.id === currentModalBookId);
      if (book && book.coverUrl === item.url) {
        book.coverUrl = null;
        modalCover.removeAttribute('src');
        modalCover.style.background = 'var(--paper-deep)';
        saveBooks(true);
        filterAndRenderBooks();
      }
      renderGalleryCovers();
    });
    coverGalleryGrid.appendChild(wrap);
  });
}

// Zobrazí/skryje „AI" značky na obale a popise v detaile knihy podľa toho,
// či sú AI-generované (book.coverIsAi / book.descriptionIsAi).
// R6 — Moje hodnotenie (hviezdičky 1-5). Uložené na book.rating.
function updateRatingDisplay(book) {
  if (!modalRating) return;
  const r = book && book.rating ? book.rating : 0;
  modalRating.querySelectorAll('.star').forEach(s => {
    s.classList.toggle('filled', parseInt(s.dataset.val, 10) <= r);
  });
  if (modalRatingClear) modalRatingClear.style.display = r > 0 ? 'inline' : 'none';
}

function updateModalAiBadges(book) {
  if (modalCoverAiBadge) {
    modalCoverAiBadge.style.display = (book && book.coverIsAi && book.coverUrl) ? 'inline-flex' : 'none';
  }
  if (modalDescAiBadge) {
    modalDescAiBadge.style.display = (book && book.descriptionIsAi && book.description) ? 'inline-flex' : 'none';
  }
}

function selectGalleryCover(url) {
  const book = allBooks.find(b => b.id === currentModalBookId);
  if (!book) return;
  book.coverUrl = url;
  // Zisti, či vybraný obal je AI-generovaný (má v galérii generated: true).
  const item = galleryCovers.find(g => g.url === url);
  book.coverIsAi = !!(item && item.generated);
  modalCover.src = url;
  saveBooks(true);
  filterAndRenderBooks();
  renderGalleryCovers();
  updateModalAiBadges(book);
  showToast(t('coverSaved'), 'success', 2000);
}

// ============================================================
// Match metadata — používateľ si v detaile môže vybrať správnu knihu
// z kandidátov (katalóg + Open Library + Google Books), keď automatické
// priradenie netrafilo. Výber prepíše celý záznam (názov, autor, rok,
// popis, obálka). Automatické priraďovanie tým nie je dotknuté.
// ============================================================
let matchCandidates = [];

async function openMatchModal() {
  const book = allBooks.find(b => b.id === currentModalBookId);
  if (!book) return;

  matchCandidates = [];
  matchGrid.innerHTML = '';
  matchStatus.textContent = t('matchSearching');
  matchModal.style.display = 'flex';

  const seen = new Set();
  const addCand = (c) => {
    if (!c || !c.title) return;
    // Kľúč zahŕňa aj zdroj — tá istá kniha z katalógu aj z Open Library sa
    // zobrazí zvlášť (rôzne obálky, nech si používateľ vyberie). Duplikáty
    // v rámci jedného zdroja sa odfiltrujú.
    const key = normalizeKey(c.title) + '|' + normalizeKey(c.author || '') + '|' + (c.source || '');
    if (seen.has(key)) return;
    seen.add(key);
    matchCandidates.push(c);
  };

  // --- 1) Vlastný katalóg (Supabase) — zoznam kandidátov ---
  try {
    const params = new URLSearchParams({ mode: 'list' });
    if (book.isbn) params.set('isbn', book.isbn);
    if (book.title) params.set('title', book.title);
    if (book.author) params.set('author', book.author);
    const res = await fetchWithTimeout('/.netlify/functions/catalog-lookup?' + params.toString(), 7000);
    if (res.ok) {
      const data = await res.json();
      (data.candidates || []).forEach(c => addCand({
        title: c.title, author: c.author, coverUrl: c.coverUrl,
        description: c.description, publishYear: c.publishYear,
        pageCount: c.pageCount, isbn: c.isbn, language: c.language,
        publisher: c.publisher, source: t('sourceCatalog'),
      }));
    }
  } catch (e) { /* pokračuj na ostatné zdroje */ }

  // --- 2) Open Library podľa názvu ---
  // fetchFromOpenLibraryRaw vracia len obal/popis/rok/strany (nie názov/autora),
  // takže názov a autora preberáme z aktuálnej knihy — OL kandidát je „tá istá
  // kniha, ale s obálkou a popisom z Open Library".
  try {
    const ol = await fetchFromOpenLibraryRaw(book.title, book.author, null);
    if (ol && (ol.coverUrl || ol.description)) addCand({
      title: book.title, author: book.author, coverUrl: ol.coverUrl,
      description: ol.description, publishYear: ol.publishYear,
      pageCount: ol.pageCount, isbn: book.isbn || null, source: 'Open Library',
    });
  } catch (e) {}

  // --- 3) Google Books (viac výsledkov) ---
  try {
    const gbKey = (localStorage.getItem(BOOKS_API_KEY_STORAGE) || '').trim();
    const q = encodeURIComponent(`${book.title} ${book.author || ''}`.trim());
    const gbUrl = `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=5${gbKey ? '&key=' + gbKey : ''}`;
    const res = await fetchWithTimeout(gbUrl, 6000);
    if (res.ok) {
      const data = await res.json();
      (data.items || []).forEach(item => {
        const info = item.volumeInfo || {};
        const img = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || null;
        const yearMatch = (info.publishedDate || '').match(/\d{4}/);
        addCand({
          title: info.title || null,
          author: (info.authors || []).join(' / ') || null,
          coverUrl: img ? img.replace('http://', 'https://') : null,
          description: info.description || null,
          publishYear: yearMatch ? parseInt(yearMatch[0], 10) : null,
          pageCount: info.pageCount || null,
          isbn: (info.industryIdentifiers || []).map(i => i.identifier)[0] || null,
          source: 'Google Books',
        });
      });
    }
  } catch (e) {}

  renderMatchCandidates();
}

// Pomocná normalizácia kľúča (bez diakritiky/interpunkcie) na deduplikáciu.
function normalizeKey(s) {
  return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function renderMatchCandidates() {
  matchGrid.innerHTML = '';

  // Hore ukáž AKTUÁLNY záznam knihy, nech má používateľ s čím porovnávať.
  const cur = allBooks.find(b => b.id === currentModalBookId);
  if (cur) {
    const curDesc = cur.description && cur.description !== t('descNotFound')
      ? (cur.description.length > 160 ? cur.description.slice(0, 157) + '…' : cur.description) : '';
    const curBox = document.createElement('div');
    curBox.style.cssText = 'border:1px solid var(--line); border-radius:10px; padding:10px; margin-bottom:6px; background:var(--bg-sunk);';
    curBox.innerHTML = `
      <div style="font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--ink-soft); margin-bottom:8px;">${t('matchCurrentLabel')}</div>
      <div style="display:flex; gap:12px; align-items:flex-start;">
        ${cur.coverUrl
          ? `<img src="${escapeHtml(cur.coverUrl)}" style="width:48px; height:72px; object-fit:cover; border-radius:4px; background:var(--card); flex-shrink:0;" onerror="this.style.visibility='hidden'">`
          : `<div style="width:48px; height:72px; border-radius:4px; background:var(--card); flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:18px;">📖</div>`}
        <div style="flex:1; min-width:0;">
          <div style="font-weight:600; font-size:14px;">${escapeHtml(cur.title || t('noTitle'))}</div>
          <div style="color:var(--ink-soft); font-size:12.5px;">${escapeHtml(cur.author || t('unknownAuthor'))}${cur.publishYear ? ' · ' + cur.publishYear : ''}${cur.isbn ? ' · ISBN ' + escapeHtml(cur.isbn) : ''}</div>
          <div style="font-size:11px; color:var(--ink-soft); margin-top:3px;">${cur.coverUrl ? '🖼️' : '— bez obálky'} · ${curDesc ? '📝 má popis' : '— bez popisu'}${cur.pageCount ? ' · ' + cur.pageCount + ' s.' : ''}</div>
          ${curDesc ? `<div style="font-size:11.5px; color:var(--ink-soft); margin-top:4px; line-height:1.35;">${escapeHtml(curDesc)}</div>` : ''}
        </div>
      </div>`;
    matchGrid.appendChild(curBox);
  }

  if (!matchCandidates.length) {
    matchStatus.textContent = t('matchNothing');
    return;
  }
  // Nadpis sekcie kandidátov
  const hdr = document.createElement('div');
  hdr.style.cssText = 'font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--accent); margin:10px 0 2px;';
  hdr.textContent = t('matchCandidatesLabel');
  matchGrid.appendChild(hdr);

  matchStatus.textContent = '';
  matchCandidates.forEach((c, idx) => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex; gap:12px; align-items:flex-start; border:1px solid var(--line); border-radius:10px; padding:10px; cursor:pointer; transition:border-color .15s;';
    row.onmouseenter = () => row.style.borderColor = 'var(--accent)';
    row.onmouseleave = () => row.style.borderColor = 'var(--line)';
    const desc = c.description ? (c.description.length > 160 ? c.description.slice(0, 157) + '…' : c.description) : '';
    row.innerHTML = `
      ${c.coverUrl
        ? `<img src="${escapeHtml(c.coverUrl)}" loading="lazy" style="width:52px; height:78px; object-fit:cover; border-radius:4px; background:var(--bg-sunk); flex-shrink:0;" onerror="this.style.visibility='hidden'">`
        : `<div style="width:52px; height:78px; border-radius:4px; background:var(--bg-sunk); flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:20px;">📖</div>`}
      <div style="flex:1; min-width:0;">
        <div style="font-weight:600; font-size:14px;">${escapeHtml(c.title || t('noTitle'))}</div>
        <div style="color:var(--ink-soft); font-size:12.5px;">${escapeHtml(c.author || t('unknownAuthor'))}${c.publishYear ? ' · ' + c.publishYear : ''}${c.isbn ? ' · ISBN ' + escapeHtml(c.isbn) : ''}</div>
        <div style="font-size:11px; color:var(--accent); margin-top:2px;">${escapeHtml(c.source || '')}</div>
        ${desc ? `<div style="font-size:11.5px; color:var(--ink-soft); margin-top:4px; line-height:1.35;">${escapeHtml(desc)}</div>` : ''}
      </div>`;
    row.addEventListener('click', () => applyMatchCandidate(idx));
    matchGrid.appendChild(row);
  });
}

function applyMatchCandidate(idx) {
  const c = matchCandidates[idx];
  const book = allBooks.find(b => b.id === currentModalBookId);
  if (!c || !book) return;

  // Prepíš celý záznam. Prázdne polia kandidáta nemažú existujúce dáta.
  if (c.title) book.title = c.title;
  if (c.author) book.author = c.author;
  if (c.coverUrl) { book.coverUrl = c.coverUrl; book.coverIsAi = false; }
  if (c.description) { book.description = c.description; book.descriptionIsAi = false; }
  if (c.publishYear) book.publishYear = c.publishYear;
  if (c.pageCount) book.pageCount = c.pageCount;
  if (c.isbn) book.isbn = c.isbn;
  if (c.language) book.language = c.language;
  if (c.publisher) book.publisher = c.publisher;

  saveBooks(true);
  filterAndRenderBooks();
  matchModal.style.display = 'none';

  // Znovu otvor detail s aktualizovanými dátami.
  if (typeof handleDetailClick === 'function') handleDetailClick(book.id);
  showToast(t('matchApplied'), 'success', 2500);
}

async function fetchAllGalleryCovers(book) {
  const sources = [];

  // Vlastný katalóg (Supabase) — PRVÝ zdroj obálok, má reálne SK/CZ obálky.
  try {
    const params = new URLSearchParams({ mode: 'list' });
    if (book.isbn) params.set('isbn', book.isbn);
    if (book.title) params.set('title', book.title);
    if (book.author) params.set('author', book.author);
    const res = await fetchWithTimeout('/.netlify/functions/catalog-lookup?' + params.toString(), 6000);
    if (res.ok) {
      const data = await res.json();
      (data.candidates || []).forEach(c => {
        if (c.coverUrl && !sources.find(s => s.url === c.coverUrl)) {
          const yr = c.publishYear ? ` ${c.publishYear}` : '';
          sources.push({ url: c.coverUrl, source: `${t('sourceCatalog')}${yr}` });
        }
      });
    }
  } catch(e) {}

  // Open Library podľa ISBN
  if (book.isbn) {
    try {
      const sizes = ['L', 'M'];
      for (const size of sizes) {
        const url = `https://covers.openlibrary.org/b/isbn/${book.isbn}-${size}.jpg`;
        sources.push({ url, source: `Open Library (${size})` });
      }
    } catch(e) {}
  }

  // Open Library podľa názvu
  try {
    const olData = await fetchFromOpenLibraryRaw(book.title, book.author, null);
    if (olData.coverUrl && !sources.find(s => s.url === olData.coverUrl)) {
      sources.push({ url: olData.coverUrl, source: t('olByTitle') });
    }
  } catch(e) {}

  // Google Books
  try {
    const gbKey = (localStorage.getItem(BOOKS_API_KEY_STORAGE) || '').trim();
    const q = encodeURIComponent(`${book.title} ${book.author || ''}`);
    const gbUrl = `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=5${gbKey ? '&key=' + gbKey : ''}`;
    const res = await fetchWithTimeout(gbUrl, 5000);
    if (res.ok) {
      const data = await res.json();
      (data.items || []).forEach(item => {
        const img = item.volumeInfo?.imageLinks?.extraLarge
          || item.volumeInfo?.imageLinks?.large
          || item.volumeInfo?.imageLinks?.thumbnail;
        if (img) {
          const hiRes = img.replace('http://', 'https://').replace('&zoom=1', '&zoom=0');
          if (!sources.find(s => s.url === hiRes)) {
            sources.push({ url: hiRes, source: 'Google Books' });
          }
        }
      });
    }
  } catch(e) {}

  // Wikidata
  try {
    const wdData = await fetchCoverFromWikidata(book.title, book.author);
    if (wdData && !sources.find(s => s.url === wdData)) {
      sources.push({ url: wdData, source: 'Wikidata' });
    }
  } catch(e) {}

  // Pridáme nájdené zdroje (neprepisujeme "Aktuálny" ak už existuje)
  sources.forEach(s => {
    if (!galleryCovers.find(g => g.url === s.url)) {
      galleryCovers.push({ ...s, generated: false });
    }
  });

  coverGalleryStatus.textContent = galleryCovers.length > 0
    ? tf('coversFoundClick', { n: galleryCovers.length })
    : t('noCoversInDb');
  renderGalleryCovers();
}

async function generateAiCover(book) {
  const apiKey = (localStorage.getItem(API_KEY_STORAGE) || '').trim();
  if (!apiKey) {
    showToast(t('geminiKeyNeededAiCover'), 'error', 4000);
    return;
  }

  coverGalleryGenerateBtn.disabled = true;
  coverGalleryGenerateBtn.textContent = t('generatingBtn');
  coverGalleryStatus.textContent = 'Gemini analyzuje knihu a generuje obal…';

  try {
    const res = await fetch('/.netlify/functions/imagen-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: book.title,
        author: book.author || '',
        genre: book.genre || '',
        year: book.publishYear || '',
        description: book.description || '',
        apiKey
      })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.error || `HTTP ${res.status}`);
    }

    if (data._prompt) {
      coverGalleryStatus.textContent = `Prompt: "${data._prompt.slice(0, 60)}…"`;
    }

    const parts = data.candidates?.[0]?.content?.parts || [];
    let found = 0;
    parts.forEach((p) => {
      if (p.inlineData?.mimeType?.startsWith('image/')) {
        const url = `data:${p.inlineData.mimeType};base64,${p.inlineData.data}`;
        galleryCovers.push({ url, source: `AI obal ${found + 1}`, generated: true });
        found++;
      }
    });

    if (found === 0) {
      coverGalleryStatus.textContent = t('geminiNoCover');
      return;
    }

    coverGalleryStatus.textContent = tf('aiCoversGenerated', { n: found });
    renderGalleryCovers();
  } catch (err) {
    coverGalleryStatus.textContent = `Chyba: ${err.message}`;
    showToast('Generovanie zlyhalo: ' + err.message, 'error', 5000);
  } finally {
    coverGalleryGenerateBtn.disabled = false;
    coverGalleryGenerateBtn.textContent = t('generateAi');
  }
}

modalCoverPickBtn.addEventListener('click', openCoverGallery);

// Tlačidlo AI v riadku ikon — otvorí galériu obalov priamo (bez edit módu)
// ============================================================
// R10 — Potvrdzovacie okno pre AI návrhy textu.
// Zobrazí navrhnutý text a čaká na Uložiť/Zrušiť. Vracia Promise<boolean>.
// Kým sa hľadá, dá sa zobraziť status a text nechať prázdny.
// ============================================================
let aiConfirmResolve = null;

function openAiConfirm(titleText) {
  aiConfirmTitle.textContent = titleText || t('aiSuggestTitle');
  aiConfirmStatus.textContent = t('searchingEllipsis');
  aiConfirmText.textContent = '';
  aiConfirmSaveBtn.disabled = true;
  aiConfirmModal.style.display = 'flex';
}

// Naplní modal navrhnutým textom a čaká na rozhodnutie používateľa.
function awaitAiConfirm(suggestedText) {
  aiConfirmStatus.textContent = '';
  aiConfirmText.textContent = suggestedText;
  aiConfirmSaveBtn.disabled = false;
  return new Promise(resolve => { aiConfirmResolve = resolve; });
}

function closeAiConfirm(result) {
  aiConfirmModal.style.display = 'none';
  if (aiConfirmResolve) { aiConfirmResolve(result); aiConfirmResolve = null; }
}

aiConfirmSaveBtn.addEventListener('click', () => closeAiConfirm(true));

// R6 — klik na hviezdičku nastaví hodnotenie; klik na už nastavenú hodnotu
// s rovnakým počtom nechá tak; „×" zruší.
if (modalRating) {
  modalRating.querySelectorAll('.star').forEach(star => {
    star.addEventListener('click', () => {
      const book = allBooks.find(b => b.id === currentModalBookId);
      if (!book) return;
      book.rating = parseInt(star.dataset.val, 10);
      saveBooks(true);
      updateRatingDisplay(book);
      filterAndRenderBooks();
    });
    star.addEventListener('mouseenter', () => {
      const v = parseInt(star.dataset.val, 10);
      modalRating.querySelectorAll('.star').forEach(s =>
        s.classList.toggle('filled', parseInt(s.dataset.val, 10) <= v));
    });
  });
  modalRating.addEventListener('mouseleave', () => {
    const book = allBooks.find(b => b.id === currentModalBookId);
    if (book) updateRatingDisplay(book);
  });
}
if (modalRatingClear) {
  modalRatingClear.addEventListener('click', () => {
    const book = allBooks.find(b => b.id === currentModalBookId);
    if (!book) return;
    book.rating = 0;
    saveBooks(true);
    updateRatingDisplay(book);
    filterAndRenderBooks();
  });
}
aiConfirmCancelBtn.addEventListener('click', () => closeAiConfirm(false));
aiConfirmCloseBtn.addEventListener('click', () => closeAiConfirm(false));
aiConfirmModal.addEventListener('click', (e) => { if (e.target === aiConfirmModal) closeAiConfirm(false); });

// ============================================================
// R8 — Tíško prispeje AI popisom do zdieľaného katalógu (cez Netlify
// funkciu, ktorá zapíše LEN ak popis v DB chýba a označí ho 'ai').
// Beží na pozadí, chyby ignoruje — nesmie rušiť používateľa.
// ============================================================
async function contributeDescriptionToCatalog(book) {
  if (!book || !book.description) return;
  try {
    await fetchWithTimeout('/.netlify/functions/catalog-contribute', 7000, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        isbn: book.isbn || '',
        title: book.title || '',
        author: book.author || '',
        description: book.description || '',
      }),
    });
  } catch (e) { /* ticho — príspevok je best-effort */ }
}

modalAiBtn.addEventListener('click', async () => {
  const book = allBooks.find(b => b.id === currentModalBookId);
  if (!book) return;

  modalAiBtn.disabled = true;
  modalAiBtn.querySelector('.modal-icon-label').textContent = '…';
  if (modalErrorMessage) modalErrorMessage.textContent = '';

  // R10 — otvor potvrdzovacie okno so stavom „Hľadám…"
  openAiConfirm(t('aiSuggestTitle'));

  const result = await searchViaGeminiWeb(book);

  // Obálku spracujeme bez ohľadu na potvrdenie popisu (rieši sa galériou).
  let coverChanged = false;
  if (result && result.coverImageUrl) {
    galleryCoverBookId = currentModalBookId;
    if (!galleryCovers.find(g => g.url === result.coverImageUrl)) {
      galleryCovers.push({ url: result.coverImageUrl, source: 'Gemini', generated: false });
    }
    if (!book.coverUrl) {
      book.coverUrl = result.coverImageUrl;
      modalCover.src = result.coverImageUrl;
      coverChanged = true;
    }
  }

  if (result && result.description) {
    // R10 — ukáž návrh, čakaj na Uložiť/Zrušiť
    const accepted = await awaitAiConfirm(result.description);
    if (accepted) {
      book.description = result.description;
      book.descriptionIsAi = true;
      modalDescription.textContent = book.description;
      updateTranslateButtonVisibility(book);
      saveBooks(true);
      filterAndRenderBooks();
      updateModalAiBadges(book);
      // R8 — tíško prispej popisom do zdieľaného katalógu (len ak v DB chýba).
      // Poistka: prispievame len ak je popis SK/CZ (jazyk katalógu). Gemini
      // ho generuje po slovensky, takže to zvyčistí len prípadné výnimky.
      if (looksSlovakOrCzech(book.description)) {
        contributeDescriptionToCatalog(book);
      }
    } else {
      closeAiConfirm(false);
    }
  } else {
    // žiadny popis — zavri okno, prípadne upozorni
    closeAiConfirm(false);
    if (!result || (!result.description && !result.coverImageUrl)) {
      showToast(t('geminiNoDescCover'), 'error', 3000);
    }
  }

  if (coverChanged) { saveBooks(true); filterAndRenderBooks(); }
  if (result && result.coverImageUrl) openCoverGallery();

  modalAiBtn.disabled = false;
  modalAiBtn.querySelector('.modal-icon-label').textContent = 'AI';
});

coverGalleryCloseBtn.addEventListener('click', () => {
  coverGalleryModal.style.display = 'none';
});

coverGalleryModal.addEventListener('click', (e) => {
  if (e.target === coverGalleryModal) coverGalleryModal.style.display = 'none';
});

coverGalleryUploadBtn.addEventListener('click', () => {
  if (!currentModalBookId) return;
  customCoverUpload.dataset.targetId = currentModalBookId;
  customCoverUpload.click();
});

coverGallerySearchDbBtn.addEventListener('click', () => {
  const book = allBooks.find(b => b.id === currentModalBookId);
  if (!book) return;
  coverGallerySearchDbBtn.disabled = true;
  coverGallerySearchDbBtn.textContent = t('searchingBtn');
  coverGalleryStatus.textContent = t('searchingInDbs');
  fetchAllGalleryCovers(book).then(() => {
    coverGallerySearchDbBtn.disabled = false;
    coverGallerySearchDbBtn.textContent = t('searchInDbs');
  });
});

coverGalleryPasteBtn.addEventListener('click', () => {
  coverGalleryUrlBox.style.display = 'block';
  coverGalleryUrlInput.value = '';
  coverGalleryUrlInput.focus();
});

// Paste URL — zobrazí input pole
coverGalleryUrlBox.addEventListener('click', () => {}); // prevent bubble
document.addEventListener('paste', (e) => {
  if (coverGalleryModal.style.display !== 'flex') return;
  const text = e.clipboardData?.getData('text')?.trim();
  if (text && (text.startsWith('http://') || text.startsWith('https://'))) {
    coverGalleryUrlInput.value = text;
    coverGalleryUrlBox.style.display = 'block';
  }
});

// Alternatívne: zobrazí URL box pri pravom kliku / tlačidle (pridáme URL ikonu)
coverGalleryUrlConfirm.addEventListener('click', async () => {
  const url = coverGalleryUrlInput.value.trim();
  if (!url) return;

  coverGalleryUrlConfirm.disabled = true;
  coverGalleryUrlConfirm.textContent = '⏳';
  coverGalleryStatus.textContent = t('downloadingImage');

  try {
    let finalUrl = url;
    try {
      const res = await fetch('/.netlify/functions/image-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      if (data.dataUrl) finalUrl = data.dataUrl;
    } catch (proxyErr) {
      // Proxy nedostupná (napr. lokálne) — ulož priamu URL
      console.warn(t('imageProxyUnavailable'), proxyErr.message);
    }

    galleryCovers.push({ url: finalUrl, source: t('customUrl'), generated: false });
    renderGalleryCovers();
    selectGalleryCover(finalUrl);
    coverGalleryUrlBox.style.display = 'none';
    coverGalleryUrlInput.value = '';
    coverGalleryStatus.textContent = t('coverSaved');
  } catch (err) {
    coverGalleryStatus.textContent = `Chyba: ${err.message}`;
  } finally {
    coverGalleryUrlConfirm.disabled = false;
    coverGalleryUrlConfirm.textContent = t('use');
  }
});

coverGalleryUrlCancel.addEventListener('click', () => {
  coverGalleryUrlBox.style.display = 'none';
});


coverGalleryGenerateBtn.addEventListener('click', () => {
  const book = allBooks.find(b => b.id === currentModalBookId);
  if (book) generateAiCover(book);
});

coverGalleryWebSearchBtn.addEventListener('click', async () => {
  const book = allBooks.find(b => b.id === currentModalBookId);
  if (!book) return;
  coverGalleryWebSearchBtn.disabled = true;
  coverGalleryWebSearchBtn.textContent = t('searchingBtn');
  coverGalleryStatus.textContent = t('geminiSearchingCoverWeb');
  const result = await searchViaGeminiWeb(book);
  if (result?.coverImageUrl) {
    galleryCovers.push({ url: result.coverImageUrl, source: 'Gemini web', generated: false });
    renderGalleryCovers();
    coverGalleryStatus.textContent = t('geminiFoundCoverClick');
  } else {
    coverGalleryStatus.textContent = t('geminiNoCoverFound');
  }
  coverGalleryWebSearchBtn.disabled = false;
  coverGalleryWebSearchBtn.textContent = t('searchGeminiWeb');
});

coverGalleryRemoveBtn.addEventListener('click', () => {
  const book = allBooks.find(b => b.id === currentModalBookId);
  if (!book) return;
  book.coverUrl = null;
  modalCover.removeAttribute('src');
  modalCover.style.background = 'var(--paper-deep)';
  saveBooks(true);
  filterAndRenderBooks();
  galleryCovers = galleryCovers.filter(g => g.source !== 'Aktuálny');
  renderGalleryCovers();
  showToast(t('coverRemoved'), 'success', 2000);
});



modalTranslateBtn.addEventListener('click', async () => {
  const book = allBooks.find(b => b.id === currentModalBookId);
  if (!book) return;

  modalTranslateBtn.disabled = true;
  modalTranslateBtn.textContent = t('translatingEllipsis');

  // R10 — potvrdzovacie okno
  openAiConfirm(t('aiTranslateTitle'));
  const translated = await translateDescription(book);

  if (translated) {
    const accepted = await awaitAiConfirm(translated);
    if (accepted) {
      // R9 (rozšírené): preklad ostáva lokálne, ALE ak je v slovenčine/češtine
      // (jazyk katalógu), smie prispieť do zdieľanej DB — je to „hodný" popis.
      // Preklad do iného jazyka do DB nejde. contributeDescriptionToCatalog
      // aj tak zapíše len ak v DB popis chýba (overený má prednosť).
      book.description = translated;
      saveBooks(true);
      modalDescription.textContent = translated;
      filterAndRenderBooks();
      if (looksSlovakOrCzech(translated)) {
        contributeDescriptionToCatalog(book);
      }
    } else {
      closeAiConfirm(false);
    }
  } else {
    closeAiConfirm(false);
  }

  modalTranslateBtn.disabled = false;
  modalTranslateBtn.textContent = t('translateDescBtn');
  updateTranslateButtonVisibility(book);
});

function updateReadButton(book) {
  if (!modalReadBtn) return;
  const isRead = book.readStatus === 'read';
  modalReadBtn.style.color = isRead ? '#2D7D52' : '';
  modalReadBtn.style.borderColor = isRead ? '#2D7D52' : '';
  modalReadBtn.style.background = isRead ? '#EBF5EE' : '';
  modalReadLabel.textContent = isRead ? t('readCheck') : t('readTitle');
  modalReadBtn.title = isRead ? t('markAsUnread') : t('markAsRead');
}

function updateLoanSection(book) {
  if (!modalLoanSection) return;
  const loaned = !!book.loanedTo;
  // Sekcia je viditeľná len ak je kniha požičaná alebo je otvorený formulár
  modalLoanSection.style.display = loaned ? 'block' : 'none';
  modalLoanInfo.style.display = loaned ? 'block' : 'none';
  modalLoanForm.style.display = 'none';
  modalReturnBtn.style.display = loaned ? 'inline-flex' : 'none';
  modalWhatsAppBtn.style.display = loaned ? 'inline-flex' : 'none';
  // Ikona v riadku — zafarbíme ak je požičaná
  if (modalLoanIconBtn) {
    modalLoanIconBtn.style.color = loaned ? '#E8A020' : '';
    modalLoanIconBtn.style.borderColor = loaned ? '#E8A020' : '';
    modalLoanIconBtn.style.background = loaned ? '#FDF6E3' : '';
    modalLoanIconLabel.textContent = loaned ? '📤 ' + book.loanedTo.split(' ')[0] : t('loaned');
  }
  if (loaned) {
    modalLoanName.textContent = book.loanedTo;
    if (book.loanedAt) {
      const d = new Date(book.loanedAt);
      modalLoanDate.textContent = `— od ${d.getDate()}.${d.getMonth()+1}.${d.getFullYear()}`;
    } else {
      modalLoanDate.textContent = '';
    }
  }
}

// Klik na ikonu Požičané — ak nie je požičaná: zobraz formulár,
// ak je požičaná: zobraz/skry panel s detailmi
modalLoanIconBtn.addEventListener('click', () => {
  const book = allBooks.find(b => b.id === currentModalBookId);
  if (!book) return;
  if (book.loanedTo) {
    // Prepni viditeľnosť sekcie
    modalLoanSection.style.display =
      modalLoanSection.style.display === 'none' ? 'block' : 'none';
  } else {
    // Otvor formulár
    modalLoanSection.style.display = 'block';
    modalLoanForm.style.display = 'block';
    modalLoanNameInput.value = '';
    modalLoanNameInput.focus();
  }
});

modalLoanCancelBtn.addEventListener('click', () => {
  modalLoanForm.style.display = 'none';
  const book = allBooks.find(b => b.id === currentModalBookId);
  if (book && !book.loanedTo) modalLoanSection.style.display = 'none';
});

modalLoanConfirmBtn.addEventListener('click', () => {
  const book = allBooks.find(b => b.id === currentModalBookId);
  if (!book) return;
  const name = modalLoanNameInput.value.trim();
  if (!name) { modalLoanNameInput.focus(); return; }
  book.loanedTo = name;
  book.loanedAt = Date.now();
  saveBooks(true);
  filterAndRenderBooks();
  updateLoanSection(book);
});

modalReturnBtn.addEventListener('click', () => {
  const book = allBooks.find(b => b.id === currentModalBookId);
  if (!book) return;
  book.loanedTo = null;
  book.loanedAt = null;
  saveBooks(true);
  filterAndRenderBooks();
  updateLoanSection(book);
  showToast(t('bookMarkedReturned'), 'success', 3000);
});

modalWhatsAppBtn.addEventListener('click', () => {
  const book = allBooks.find(b => b.id === currentModalBookId);
  if (!book) return;
  const text = tf('loanReminder', { name: book.loanedTo, title: book.title, authorPart: book.author ? ' od ' + book.author : '' });
  window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
});

modalReadBtn.addEventListener('click', () => {
  const book = allBooks.find(b => b.id === currentModalBookId);
  if (!book) return;
  book.readStatus = book.readStatus === 'read' ? null : 'read';
  saveBooks(true);
  updateReadButton(book);
  filterAndRenderBooks();
});

modalEditBtn.addEventListener('click', enterEditMode);
modalCancelEditBtn.addEventListener('click', exitEditMode);
modalSaveBtn.addEventListener('click', saveEditedBook);
modalRescanBtn.addEventListener('click', openMatchModal);

matchCloseBtn.addEventListener('click', () => { matchModal.style.display = 'none'; });
matchModal.addEventListener('click', (e) => {
  if (e.target === matchModal) matchModal.style.display = 'none';
});

function closeMoreMenu() {
  modalMoreMenu.style.display = 'none';
}
function toggleMoreMenu() {
  modalMoreMenu.style.display = modalMoreMenu.style.display === 'none' ? 'block' : 'none';
}

modalMoreBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleMoreMenu();
});
document.addEventListener('click', (e) => {
  if (modalMoreMenu.style.display === 'block' && !modalMoreMenu.contains(e.target) && e.target !== modalMoreBtn) {
    closeMoreMenu();
  }
});
// Klik na ktorúkoľvek položku v menu ho zavrie (akcia sa spustí cez jej vlastný listener nižšie)
modalMoreMenu.addEventListener('click', (e) => {
  if (e.target.closest('.more-menu-item')) closeMoreMenu();
});

// Rovnaký princíp pre dropdown "Pokročilé možnosti" pri ikone "Doplniť" —
// otvára sa malým tlačidlom "⋯" v rohu ikony, zatvára sa kliknutím mimo.
fillAllMoreBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  fillAllMoreMenu.style.display = fillAllMoreMenu.style.display === 'none' ? 'block' : 'none';
});
document.addEventListener('click', (e) => {
  if (fillAllMoreMenu.style.display === 'block' && !fillAllMoreMenu.contains(e.target) && e.target !== fillAllMoreBtn) {
    fillAllMoreMenu.style.display = 'none';
  }
});

modalGeminiSearchBtn.addEventListener('click', async () => {
  const book = allBooks.find(b => b.id === currentModalBookId);
  if (!book) return;

  modalGeminiSearchBtn.disabled = true;
  modalGeminiSearchBtn.textContent = t('searchingWebEllipsis');
  errorMessage.textContent = '';

  const result = await searchViaGeminiWeb(book);
  if (result) {
    let changed = false;

    if (result.description && (!book.description || result.description.length > book.description.length)) {
      book.description = result.description;
      modalDescription.textContent = book.description;
      updateTranslateButtonVisibility(book);
      changed = true;
    }

    if (result.coverImageUrl && !book.coverUrl) {
      book.coverUrl = result.coverImageUrl;
      const modalCoverEl = document.getElementById('modalCover');
      if (modalCoverEl) {
        modalCoverEl.style.backgroundImage = `url(${book.coverUrl})`;
        modalCoverEl.style.backgroundSize = 'cover';
        modalCoverEl.style.backgroundPosition = 'center';
      }
      changed = true;
    }

    if (changed) {
      saveBooks(true);
      filterAndRenderBooks();
    }

    if (result.coverImageUrl) {
      errorMessage.textContent = t('geminiFoundSavedCover');
    } else if (!result.description) {
      errorMessage.textContent = t('geminiNoCoverNoDesc');
    } else {
      errorMessage.textContent = '';
    }
  }
  modalGeminiSearchBtn.disabled = false;
  modalGeminiSearchBtn.textContent = t('searchGeminiWeb');
});

// Priradí rozpoznané/zadané ISBN existujúcej knihe a rovno spustí rescan
// obalu/popisu podľa neho (presnejšie než predošlé fulltextové vyhľadávanie).
async function assignIsbnToBook(book, isbn) {
  book.isbn = isbn;
  book.isbnSource = 'scanned'; // ISBN samotné je isté — bolo fyzicky odčítané, o tom niet pochýb
  // Nové ISBN — predošlý obal/popis (ak vznikol z menej presného fulltextového
  // vyhľadávania) môže byť nahradený presnejším výsledkom podľa ISBN.
  if (!book.customCover) {
    book.sourcesTried = {};
  }
  saveBooks(true);
  if (currentModalBookId === book.id) { updateModalIsbnDisplay(book); updateModalMetaDisplay(book); }
  filterAndRenderBooks();
  statusMessage.textContent = tf('recognizedIsbnSearching', { isbn });

  // Overenie vydania: porovnáme rok, ktorý kniha už mala (ak nejaký), s rokom
  // vráteným pre toto konkrétne ISBN. Ak nesedia, ISBN zostáva isté (zelené),
  // ale appka na to upozorní — možno ide o iné vydanie než to, čo držíš v ruke.
  const meta = await lookupBookByIsbn(isbn);
  book.isbnVerified = isbnYearMatches(book, meta.publishYear);
  if (meta.language) book.language = meta.language;

  if (currentModalBookId === book.id) {
    await rescanFromModal();
    updateModalIsbnDisplay(book);
  } else {
    const details = await fetchBookDetails(book.title, book.author, book.originalTitle, book, { openLibrary: true, googleBooks: true, wikidata: true });
    if (!details.networkError) {
      book.coverUrl = details.coverUrl;
      book.description = details.description;
      if (details.publishYear) book.publishYear = details.publishYear;
      if (details.pageCount) book.pageCount = details.pageCount;
      saveBooks(true);
      filterAndRenderBooks();
    }
  }
  statusMessage.textContent = '';
}

modalScanIsbnBtn.addEventListener('click', () => {
  if (!currentModalBookId) return;
  const book = allBooks.find(b => b.id === currentModalBookId);
  if (!book) return;

  openIsbnScanModal((isbn) => {
    assignIsbnToBook(book, isbn);
  });
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
    showError(t('imageProcessFail'));
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

bulkFindIsbnBtn.addEventListener('click', bulkFindIsbn);
bulkFindMetaBtn.addEventListener('click', bulkFindMeta);

// "Doplniť všetko" — spustí postupne všetky tri dopĺňacie operácie
// (obaly+popisy, ISBN, rok+strany) jedným klikom, s viditeľným priebehom
// po fázach. Toto je hlavná cesta pre používateľa, ktorý očakáva, že sa
// chýbajúce údaje doplnia "samé" po hromadnom pridaní kníh (napr. po
// skene police) — nemusí rozumieť rozdielu medzi týmito troma zdrojmi.
function setPhaseState(rowEl, state, countText) {
  rowEl.classList.remove('active', 'done');
  const icon = rowEl.querySelector('.fill-phase-icon');
  const count = rowEl.querySelector('.fill-phase-count');
  if (state === 'active') {
    rowEl.classList.add('active');
    icon.textContent = '◐';
  } else if (state === 'done') {
    rowEl.classList.add('done');
    icon.textContent = '✓';
  } else {
    icon.textContent = '○';
  }
  if (countText !== undefined) count.textContent = countText;
}

fillAllBtn.addEventListener('click', async () => {
  fillAllBtn.disabled = true;
  fillAllProgress.classList.add('active');
  setPhaseState(phaseCovers, 'pending', '');
  setPhaseState(phaseIsbn, 'pending', '');
  setPhaseState(phaseMeta, 'pending', '');

  const missingCovers = allBooks.filter(b => !b.coverUrl).length;
  const missingIsbn = allBooks.filter(b => !b.isbn).length;
  const missingMeta = allBooks.filter(b => !b.publishYear && !b.pageCount).length;

  if (missingCovers > 0) {
    setPhaseState(phaseCovers, 'active', `0/${missingCovers}`);
    lastNetworkErrorShown = false;
    errorMessage.textContent = '';
    hideRetryButton();
    await fetchAllMissingDetails();
    setPhaseState(phaseCovers, 'done', `${missingCovers}/${missingCovers}`);
  } else {
    setPhaseState(phaseCovers, 'done', t('nothingMissing'));
  }

  if (missingIsbn > 0) {
    setPhaseState(phaseIsbn, 'active', `0/${missingIsbn}`);
    await bulkFindIsbn();
    setPhaseState(phaseIsbn, 'done', `${missingIsbn}/${missingIsbn}`);
  } else {
    setPhaseState(phaseIsbn, 'done', t('nothingMissing'));
  }

  if (missingMeta > 0) {
    setPhaseState(phaseMeta, 'active', `0/${missingMeta}`);
    await bulkFindMeta();
    setPhaseState(phaseMeta, 'done', `${missingMeta}/${missingMeta}`);
  } else {
    setPhaseState(phaseMeta, 'done', t('nothingMissing'));
  }

  fillAllBtn.disabled = false;
  updateFetchMissingButtonLabel();
  // Priebeh necháme chvíľu viditeľný (nech si používateľ stihne všimnúť
  // výsledok), potom sa skryje — panel tu nemá zaberať miesto natrvalo.
  setTimeout(() => fillAllProgress.classList.remove('active'), 4000);
});

stopFetchBtn.addEventListener('click', () => {
  fetchShouldStop = true;
  stopFetchBtn.disabled = true;
  stopFetchBtn.textContent = t('stoppingBtn');
  setTimeout(() => {
    stopFetchBtn.disabled = false;
    stopFetchBtn.textContent = t('stopBtn');
  }, 2000);
});

exportBtn.addEventListener('click', exportCatalog);
exportCsvBtn.addEventListener('click', exportCatalogCsv);

migrateLegacyBtn.addEventListener('click', async () => {
  migrateLegacyBtn.disabled = true;
  migrateLegacyBtn.textContent = t('transferringEllipsis');
  migrateStatus.textContent = '';

  try {
    const res = await fetch('/.netlify/functions/migrate-legacy', {
      method: 'POST',
      headers: await authHeaders()
    });
    const data = await res.json();

    if (!res.ok) {
      migrateStatus.textContent = data.error || t('migrationFailed');
      migrateStatus.className = 'api-status bad';
      migrateLegacyBtn.disabled = false;
      migrateLegacyBtn.textContent = t('migrateOldData');
      return;
    }

    showToast(tf('migratedBooks', { n: data.bookCount }), 'success', 6000);
    migratePanel.style.display = 'none';
    await loadBooks();
    filterAndRenderBooks();
  } catch (error) {
    console.error(t('migrationErr'), error);
    migrateStatus.textContent = t('serverConnectFail');
    migrateStatus.className = 'api-status bad';
    migrateLegacyBtn.disabled = false;
    migrateLegacyBtn.textContent = t('migrateOldData');
  }
});

publicToggle.addEventListener('change', () => {
  isPublicEnabled = publicToggle.checked;
  updatePublicToggleUI();
  saveBooks(true);
  publicStatus.textContent = isPublicEnabled
    ? t('publicViewOn')
    : t('publicViewOff');
  publicStatus.className = 'api-status ok';
});

copyPublicLinkBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(publicLinkInput.value);
    showToast(t('linkCopied'), 'success', 3000);
  } catch (e) {
    publicLinkInput.select();
    showToast(t('copyLinkManualFail'), 'error');
  }
});

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

// R7 — Tmavý režim. Uložené v localStorage, aplikované na <html data-theme>.
const THEME_STORAGE = 'domaca_kniznica_theme';
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
  if (themeToggle) themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
}
function initTheme() {
  let theme = localStorage.getItem(THEME_STORAGE);
  if (!theme) {
    // Prvý raz — rešpektuj systémové nastavenie prehliadača.
    theme = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  }
  applyTheme(theme);
}
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem(THEME_STORAGE, next);
    applyTheme(next);
  });
}
initTheme();

async function init() {
  applyTranslations();
  populateGenreSelect();
  loadApiKey();
  loadBooksApiKey();

  const savedSort = localStorage.getItem(SORT_PREFERENCE_STORAGE);
  if (savedSort) sortSelect.value = savedSort;

  viewGridBtn.classList.toggle('active', currentViewMode === 'grid');
  viewShelfBtn.classList.toggle('active', currentViewMode === 'shelf');

  languageSelect.value = getUserLanguage();

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

  // Periodický sken katalógu (max raz za ~8h) — na pozadí doplní z katalógu
  // knihy, ktorým chýba obálka/popis (databáza priebežne pribúda). Nevolá
  // externé API, len náš katalóg, takže kvóty OL/GB neohrozuje.
  periodicCatalogScan();
}

// ============================================================
// Prihlásenie (Netlify Identity) — appka sa naplno spustí (init())
// až po úspešnom prihlásení. Kým používateľ nie je prihlásený, vidí
// len úvodnú obrazovku s tlačidlom na prihlásenie/registráciu.
// ============================================================

let appInitialized = false;

function showApp(user) {
  currentUser = user;
  if (currentUserLabel) currentUserLabel.textContent = user?.email || '';
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appRoot').style.display = 'block';
  if (!appInitialized) {
    appInitialized = true;
    init();
  } else {
    // Používateľ sa prepol (napr. odhlásil a prihlásil ako niekto iný) —
    // okamžite vymeníme zobrazené dáta za lokálnu cache NOVÉHO používateľa
    // (getStorageKey() teraz vracia iný kľúč), aby sa čo i len na okamih
    // nezobrazili dáta predošlého účtu, kým čakáme na odpoveď z cloudu.
    loadLocalBooksOnly();
    filterAndRenderBooks();
    loadBooks().then(filterAndRenderBooks);
  }
}

function showLogin() {
  currentUser = null;
  if (currentUserLabel) currentUserLabel.textContent = '';
  applyTranslations();
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('appRoot').style.display = 'none';
}

// Zobrazí krátky výber jazyka rozhrania pri úplne prvom prihlásení
// (registrácii) — predtým, než sa zobrazí samotná appka. Voľba sa
// uloží a appka sa odvtedy zobrazuje v tomto jazyku (zmeniteľné
// neskôr v Nastaveniach).
function showFirstLoginLanguagePicker(onDone) {
  const modal = document.getElementById('firstLoginLangModal');
  modal.classList.remove('hidden');
  requestAnimationFrame(() => {
    modal.style.opacity = '1';
    modal.querySelector('.modal-card').style.transform = 'scale(1)';
  });

  function choose(lang) {
    setUiLanguage(lang);
    modal.style.opacity = '0';
    modal.querySelector('.modal-card').style.transform = 'scale(0.97)';
    setTimeout(() => modal.classList.add('hidden'), 200);
    onDone();
  }

  document.getElementById('chooseLangSk').onclick = () => choose('sk');
  document.getElementById('chooseLangEn').onclick = () => choose('en');
}

function setupAuth() {
  if (!window.netlifyIdentity) {
    // Identity skript sa ešte nestihol načítať (alebo beží mimo Netlify,
    // napr. lokálny vývoj) — skúsime znova o chvíľu, inak appku odblokujeme
    // bez prihlásenia, nech sa dá aspoň lokálne testovať.
    const loginStatus = document.getElementById('loginStatus');
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (window.netlifyIdentity) {
        clearInterval(interval);
        setupAuth();
      } else if (attempts > 20) {
        clearInterval(interval);
        if (loginStatus) loginStatus.textContent = t('localDevNoAuth');
        showApp(null);
      }
    }, 250);
    return;
  }

  const identity = window.netlifyIdentity;

  identity.on('init', (user) => {
    if (user) showApp(user);
    else showLogin();
    // Ak URL obsahuje invite/recovery/confirmation token (napr. z pozývacieho
    // emailu — "#invite_token=...", "#recovery_token=...", "#confirmation_token=..."),
    // widget ho síce zachytí sám, ale modal s formulárom na nastavenie hesla
    // sa bez explicitného volania open() nezobrazí automaticky. Bez tohto by
    // používateľ pri kliknutí na odkaz z emailu videl len bežný "Log in"
    // formulár — heslo si pritom ešte nikdy nenastavil.
    if (/(invite_token|recovery_token|confirmation_token)=/.test(location.hash)) {
      identity.open();
    }
  });

  identity.on('login', (user) => {
    // Ak appka ešte nikdy nemala uloženú preferenciu jazyka rozhrania pre
    // toto zariadenie, je to pravdepodobne prvé prihlásenie/registrácia —
    // opýtame sa rovno na jazyk, predtým než zobrazíme samotnú appku.
    const hasLangPreference = !!localStorage.getItem(UI_LANGUAGE_STORAGE);
    identity.close();
    if (!hasLangPreference) {
      showFirstLoginLanguagePicker(() => showApp(user));
    } else {
      showApp(user);
    }
  });

  identity.on('logout', () => {
    showLogin();
  });

  document.getElementById('loginBtn').addEventListener('click', () => {
    identity.open();
  });

  document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    identity.logout();
  });

  identity.init();
}

document.addEventListener('DOMContentLoaded', setupAuth);
