// ============================================================
// Lokalizácia rozhrania (UI) — momentálne podporuje slovenčinu (sk)
// a angličtinu (en). Ostatné jazyky v "Jazyk knižnice" naďalej
// fungujú len pre preklad POPISOV kníh (cez Gemini), nie pre toto
// rozhranie appky — to je zámerný, dočasný rozsah.
//
// Zdieľaný súbor pre index.html aj nastavenia.html.
// ============================================================

const UI_LANGUAGE_STORAGE = "domaca_kniznica_ui_language";

const UI_STRINGS = {
  sk: {
    appTitle: "Knižnica",
    appSubtitle: "osobný katalóg kníh — odfoť, zapíš, prelistuj",
    syncShared: "☁️ zdieľané",
    syncLocalOnly: "⚠️ len lokálne",
    settingsLink: "⚙️ Nastavenia",
    settingsHint: "API kľúče, jazyk, zdieľanie knižnice, záloha a ďalšie nastavenia účtu.",
    categories: "Kategórie",
    allCategories: "Všetky kategórie",
    addBookHeading: "Pridať knihu",
    scanIsbnTitle: "📖 Sken ISBN",
    scanIsbnDesc: "Jedna kniha — namier kameru na čiarový kód, rozpozná sa automaticky.",
    scanIsbnBtn: "📷 Sken ISBN",
    scanIsbnBtnShort: "Sken ISBN",
    shelfPhotoTitle: "📚 Odfotiť policu",
    shelfPhotoDesc: "Viac kníh naraz — odfoť chrbty na poličke, vyber si, ktoré pridať.",
    shelfPhotoBtn: "📷 Odfotiť policu",
    shelfPhotoBtnShort: "Polica",
    manualAddTitle: "✏️ Zapísať ručne",
    manualAddDesc: "Vyplň údaje sám, bez fotky.",
    manualAddBtn: "✏️ Zapísať ručne",
    manualAddBtnShort: "Ručne",
    manualFormHeading: "✏️ Zapísať knihu ručne",
    fieldTitle: "Názov knihy",
    fieldAuthor: "Autor",
    fieldOriginalTitle: "Originálny/EN názov (nepovinné)",
    fieldIsbn: "ISBN (nepovinné)",
    addBtn: "Pridať",
    fillAllHeading: "📚 Doplniť chýbajúce údaje",
    startFillAllBtn: "Doplniť všetko",
    phaseCoversLabel: "Obaly a popisy",
    phaseIsbnLabel: "ISBN",
    phaseMetaLabel: "Rok a počet strán",
    advancedOptions: "Pokročilé možnosti",
    isbnLegendGreen: "zelené ISBN = odfotené/zadané ručne, isté",
    isbnLegendOrange: "oranžové ISBN = len dohľadané podľa názvu, over si to",
    nothingMissing: "už doplnené",
    allDetailsFilled: "Všetky knihy už majú obal, ISBN aj rok/strany (kde sa to podarilo nájsť).",
    myLibrary: "Môj katalóg",
    sortTitleAsc: "Názov A–Z",
    sortTitleDesc: "Názov Z–A",
    sortAuthorAsc: "Autor A–Z",
    sortAuthorDesc: "Autor Z–A",
    sortAddedDesc: "Najnovšie pridané",
    sortAddedAsc: "Najstaršie pridané",
    searchPlaceholder: "Hľadať názov alebo autora…",
    viewGridTitle: "Mriežka",
    viewShelfTitle: "Polica",
    emptyLibrary: "Váš katalóg je zatiaľ prázdny. Pridajte prvú knihu vyššie.",
    emptySearch: "Žiadne knihy nezodpovedajú vášmu hľadaniu v tejto kategórii.",
    unknownAuthor: "Neznámy autor",
    editBtn: "✏️ Upraviť",
    rescanBtn: "🔄 Hľadať znova",
    moreBtn: "⋯ Viac",
    closeBtn: "Zavrieť",
    saveChangesBtn: "Uložiť zmeny",
    cancelBtn: "Zrušiť",
    uploadCoverBtn: "📷 Nahrať obal",
    geminiSearchBtn: "🔎 Hľadať cez Gemini (web)",
    translateBtn: "🌐 Preložiť popis",
    descNotFound: "Popis pre túto knihu nebol nájdený.",
    footerText: "Tvoja knižnica je viazaná na tvoj účet a zdieľaná naprieč zariadeniami, kde sa prihlásiš.",
    logoutBtn: "Odhlásiť sa",
    loginScreenSubtitle: "Osobný katalóg kníh — prihlás sa alebo si vytvor účet, aby si videl svoju knižnicu.",
    loginBtn: "Prihlásiť sa / Registrovať",
  },
  en: {
    appTitle: "Library",
    appSubtitle: "personal book catalog — snap, log, browse",
    syncShared: "☁️ synced",
    syncLocalOnly: "⚠️ local only",
    settingsLink: "⚙️ Settings",
    settingsHint: "API keys, language, library sharing, backup and other account settings.",
    categories: "Categories",
    allCategories: "All categories",
    addBookHeading: "Add a book",
    scanIsbnTitle: "📖 Scan ISBN",
    scanIsbnDesc: "One book — point the camera at the barcode, it's recognized automatically.",
    scanIsbnBtn: "📷 Scan ISBN",
    scanIsbnBtnShort: "Scan ISBN",
    shelfPhotoTitle: "📚 Photograph a shelf",
    shelfPhotoDesc: "Multiple books at once — photograph spines on a shelf, pick which to add.",
    shelfPhotoBtn: "📷 Photograph shelf",
    shelfPhotoBtnShort: "Shelf",
    manualAddTitle: "✏️ Add manually",
    manualAddDesc: "Fill in the details yourself, no photo.",
    manualAddBtn: "✏️ Add manually",
    manualAddBtnShort: "Manual",
    manualFormHeading: "✏️ Add a book manually",
    fieldTitle: "Book title",
    fieldAuthor: "Author",
    fieldOriginalTitle: "Original/EN title (optional)",
    fieldIsbn: "ISBN (optional)",
    addBtn: "Add",
    fillAllHeading: "📚 Fill in missing details",
    startFillAllBtn: "Fill in everything",
    phaseCoversLabel: "Covers and descriptions",
    phaseIsbnLabel: "ISBN",
    phaseMetaLabel: "Year and page count",
    advancedOptions: "Advanced options",
    isbnLegendGreen: "green ISBN = scanned/manually entered, certain",
    isbnLegendOrange: "orange ISBN = found by title only, verify it",
    nothingMissing: "already filled",
    allDetailsFilled: "All books already have a cover, ISBN, and year/pages (where it could be found).",
    myLibrary: "My catalog",
    sortTitleAsc: "Title A–Z",
    sortTitleDesc: "Title Z–A",
    sortAuthorAsc: "Author A–Z",
    sortAuthorDesc: "Author Z–A",
    sortAddedDesc: "Recently added",
    sortAddedAsc: "Oldest added",
    searchPlaceholder: "Search title or author…",
    viewGridTitle: "Grid",
    viewShelfTitle: "Shelf",
    emptyLibrary: "Your catalog is empty for now. Add your first book above.",
    emptySearch: "No books match your search in this category.",
    unknownAuthor: "Unknown author",
    editBtn: "✏️ Edit",
    rescanBtn: "🔄 Search again",
    moreBtn: "⋯ More",
    closeBtn: "Close",
    saveChangesBtn: "Save changes",
    cancelBtn: "Cancel",
    uploadCoverBtn: "📷 Upload cover",
    geminiSearchBtn: "🔎 Search with Gemini (web)",
    translateBtn: "🌐 Translate description",
    descNotFound: "No description was found for this book.",
    footerText: "Your library is tied to your account and shared across devices where you sign in.",
    logoutBtn: "Log out",
    loginScreenSubtitle: "Personal book catalog — sign in or create an account to see your library.",
    loginBtn: "Sign in / Sign up",
  }
};

function getUiLanguage() {
  return localStorage.getItem(UI_LANGUAGE_STORAGE) || 'sk';
}

function setUiLanguage(code) {
  localStorage.setItem(UI_LANGUAGE_STORAGE, code);
}

// Vráti preložený text pre daný kľúč v aktuálnom jazyku rozhrania.
// Ak kľúč v danom jazyku chýba, spadne na slovenčinu (nikdy nezobrazí
// holý kľúč používateľovi).
function t(key) {
  const lang = getUiLanguage();
  return UI_STRINGS[lang]?.[key] || UI_STRINGS.sk[key] || key;
}

// Aplikuje preklady na všetky elementy s atribútom data-i18n (textContent)
// a data-i18n-placeholder (placeholder atribút) — volá sa pri štarte appky
// a po každej zmene jazyka.
function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.dataset.i18nTitle);
  });
  document.documentElement.lang = getUiLanguage();
}
