// ============================================================
// Nastavenia — samostatná stránka s vlastnou auth logikou (rovnaký
// princíp ako index.html), API kľúčmi, jazykom, zdieľaním, zálohou
// a nebezpečnými akciami (zmazanie kníh / zmazanie účtu).
//
// Tento súbor zdieľa localStorage kľúče s hlavnou appkou (app.js),
// takže zmeny tu sa rovno prejavia aj tam a naopak.
// ============================================================

const STORAGE_KEY_BASE = "domaca_kniznica_books_v1";
const API_KEY_STORAGE = "domaca_kniznica_gemini_key";
const BOOKS_API_KEY_STORAGE = "domaca_kniznica_books_api_key";
const LANGUAGE_STORAGE = "domaca_kniznica_language";
const CATALOG_API_URL = '/.netlify/functions/catalog';

let currentUser = null;

function getStorageKey() {
  const userId = currentUser?.id || 'anon';
  return STORAGE_KEY_BASE + '_' + userId;
}

async function authHeaders() {
  if (!currentUser || !window.netlifyIdentity) return {};
  try {
    const token = await currentUser.jwt();
    return token ? { Authorization: 'Bearer ' + token } : {};
  } catch (e) {
    console.error('Nepodarilo sa obnoviť prihlasovací token:', e);
    return {};
  }
}

function getUserLanguage() {
  return localStorage.getItem(LANGUAGE_STORAGE) || 'sk';
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// --- DOM elementy ---
const uiLanguageSelect = document.getElementById('uiLanguageSelect'),
  languageSelect = document.getElementById('languageSelect'),
  booksApiKeyInput = document.getElementById('booksApiKeyInput'),
  booksApiKeyStatus = document.getElementById('booksApiKeyStatus'),
  apiKeyInput = document.getElementById('apiKeyInput'),
  apiKeyStatus = document.getElementById('apiKeyStatus'),
  publicToggle = document.getElementById('publicToggle'),
  publicLinkBox = document.getElementById('publicLinkBox'),
  publicLinkInput = document.getElementById('publicLinkInput'),
  copyPublicLinkBtn = document.getElementById('copyPublicLinkBtn'),
  publicStatus = document.getElementById('publicStatus'),
  exportBtn = document.getElementById('exportBtn'),
  exportCsvBtn = document.getElementById('exportCsvBtn'),
  importBtn = document.getElementById('importBtn'),
  importFileInput = document.getElementById('importFileInput'),
  importStatus = document.getElementById('importStatus'),
  accountEmail = document.getElementById('accountEmail'),
  deleteAllBooksBtn = document.getElementById('deleteAllBooksBtn'),
  deleteAccountBtn = document.getElementById('deleteAccountBtn'),
  dangerStatus = document.getElementById('dangerStatus'),
  importChoiceModal = document.getElementById('importChoiceModal'),
  importChoiceSummary = document.getElementById('importChoiceSummary'),
  importMergeBtn = document.getElementById('importMergeBtn'),
  importReplaceBtn = document.getElementById('importReplaceBtn'),
  importCancelBtn = document.getElementById('importCancelBtn'),
  confirmDangerModal = document.getElementById('confirmDangerModal'),
  confirmDangerTitle = document.getElementById('confirmDangerTitle'),
  confirmDangerText = document.getElementById('confirmDangerText'),
  confirmDangerWord = document.getElementById('confirmDangerWord'),
  confirmDangerInput = document.getElementById('confirmDangerInput'),
  confirmDangerBtn = document.getElementById('confirmDangerBtn'),
  cancelDangerBtn = document.getElementById('cancelDangerBtn');

let allBooks = []; // naplní sa pri loadBooks(), pre export/import/zdieľanie
let isPublicEnabled = false;

// ============================================================
// API kľúče a jazyk — jednoduché uloženie do localStorage
// ============================================================

function loadApiKey() {
  const saved = localStorage.getItem(API_KEY_STORAGE);
  if (saved) {
    apiKeyInput.value = saved;
    apiKeyStatus.textContent = 'Kľúč je uložený.';
    apiKeyStatus.className = 'status-msg ok';
  }
}
apiKeyInput.addEventListener('input', () => {
  const val = apiKeyInput.value.trim();
  if (val) {
    localStorage.setItem(API_KEY_STORAGE, val);
    apiKeyStatus.textContent = 'Kľúč uložený.';
    apiKeyStatus.className = 'status-msg ok';
  } else {
    localStorage.removeItem(API_KEY_STORAGE);
    apiKeyStatus.textContent = '';
  }
});

function loadBooksApiKey() {
  const saved = localStorage.getItem(BOOKS_API_KEY_STORAGE);
  if (saved) {
    booksApiKeyInput.value = saved;
    booksApiKeyStatus.textContent = 'Kľúč je uložený.';
    booksApiKeyStatus.className = 'status-msg ok';
  }
}
booksApiKeyInput.addEventListener('input', () => {
  const val = booksApiKeyInput.value.trim();
  if (val) {
    localStorage.setItem(BOOKS_API_KEY_STORAGE, val);
    booksApiKeyStatus.textContent = 'Kľúč uložený.';
    booksApiKeyStatus.className = 'status-msg ok';
  } else {
    localStorage.removeItem(BOOKS_API_KEY_STORAGE);
    booksApiKeyStatus.textContent = '';
  }
});

languageSelect.addEventListener('change', () => {
  localStorage.setItem(LANGUAGE_STORAGE, languageSelect.value);
});

uiLanguageSelect.addEventListener('change', () => {
  setUiLanguage(uiLanguageSelect.value);
  applyTranslations();
  const statusEl = document.getElementById('uiLanguageStatus');
  if (statusEl) {
    statusEl.style.display = 'block';
    statusEl.textContent = t('uiLanguageSaved');
    setTimeout(() => { statusEl.style.display = 'none'; }, 3000);
  }
});

// ============================================================
// Načítanie katalógu z cloudu (potrebné pre export/zdieľanie stav)
// ============================================================

async function loadBooks() {
  try {
    const res = await fetch(CATALOG_API_URL, { headers: await authHeaders() });
    if (res.ok) {
      const cloudData = await res.json();
      allBooks = Array.isArray(cloudData.books) ? cloudData.books : [];
      isPublicEnabled = !!cloudData.publicEnabled;
    }
  } catch (e) {
    console.error('Nepodarilo sa načítať katalóg:', e);
  }
  updatePublicToggleUI();
}

async function syncToCloud() {
  try {
    const headers = await authHeaders();
    await fetch(CATALOG_API_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ books: allBooks, publicEnabled: isPublicEnabled })
    });
  } catch (e) {
    console.error('Cloud sync zlyhal:', e);
  }
}

// ============================================================
// Zdieľanie knižnice
// ============================================================

function updatePublicToggleUI() {
  publicToggle.checked = isPublicEnabled;
  if (isPublicEnabled && currentUser) {
    publicLinkBox.style.display = 'flex';
    publicLinkInput.value = `${location.origin}/verejna.html?id=${encodeURIComponent(currentUser.id)}`;
  } else {
    publicLinkBox.style.display = 'none';
  }
}

publicToggle.addEventListener('change', async () => {
  isPublicEnabled = publicToggle.checked;
  updatePublicToggleUI();
  await syncToCloud();
  publicStatus.textContent = isPublicEnabled
    ? 'Verejný náhľad je zapnutý — pošli odkaz nižšie komukoľvek, koho chceš nechať nazrieť do knižnice.'
    : 'Verejný náhľad je vypnutý.';
  publicStatus.className = 'status-msg ok';
});

copyPublicLinkBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(publicLinkInput.value);
    publicStatus.textContent = 'Odkaz skopírovaný do schránky.';
    publicStatus.className = 'status-msg ok';
  } catch (e) {
    publicLinkInput.select();
    publicStatus.textContent = 'Skopíruj odkaz ručne (Ctrl+C).';
    publicStatus.className = 'status-msg bad';
  }
});

// ============================================================
// Export / Import (rovnaká logika ako v app.js)
// ============================================================

function csvEscape(value) {
  const str = (value === null || value === undefined) ? '' : String(value);
  if (/[",\n]/.test(str)) return '"' + str.replace(/"/g, '""') + '"';
  return str;
}

function downloadBlob(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

exportBtn.addEventListener('click', () => {
  const payload = { exportedAt: new Date().toISOString(), bookCount: allBooks.length, books: allBooks };
  const dateStr = new Date().toISOString().slice(0, 10);
  downloadBlob(JSON.stringify(payload, null, 2), `kniznica-zaloha-${dateStr}.json`, 'application/json');
  importStatus.textContent = `Stiahnutých ${allBooks.length} kníh (JSON, plná záloha).`;
  importStatus.className = 'status-msg ok';
});

exportCsvBtn.addEventListener('click', () => {
  const header = ['TITLE', 'AUTHOR', 'ISBN', 'GENRE', 'ORIGINAL_TITLE'];
  const rows = allBooks.map(b => [
    csvEscape(b.title), csvEscape(b.author), csvEscape(b.isbn || ''),
    csvEscape(b.genre || ''), csvEscape(b.originalTitle || '')
  ].join(','));
  const csvContent = '\uFEFF' + header.join(',') + '\n' + rows.join('\n');
  const dateStr = new Date().toISOString().slice(0, 10);
  downloadBlob(csvContent, `kniznica-${dateStr}.csv`, 'text/csv;charset=utf-8');
  importStatus.textContent = `Stiahnutých ${allBooks.length} kníh (CSV, pre Goodreads/LibraryThing).`;
  importStatus.className = 'status-msg ok';
});

importBtn.addEventListener('click', () => importFileInput.click());

function normalizeForDuplicateCheck(text) {
  if (!text) return '';
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}
function findDuplicateBook(candidate) {
  if (candidate.isbn) {
    const isbnMatch = allBooks.find(b => b.isbn && b.isbn === candidate.isbn);
    if (isbnMatch) return isbnMatch;
  }
  const titleKey = normalizeForDuplicateCheck(candidate.title);
  const authorKey = normalizeForDuplicateCheck(candidate.author);
  if (!titleKey) return null;
  return allBooks.find(b => normalizeForDuplicateCheck(b.title) === titleKey && normalizeForDuplicateCheck(b.author) === authorKey) || null;
}

let pendingImportBooks = null;

importFileInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    let parsed;
    try {
      parsed = JSON.parse(reader.result);
    } catch (e) {
      importStatus.textContent = 'Tento súbor nie je platný JSON export.';
      importStatus.className = 'status-msg bad';
      return;
    }
    const importedBooks = Array.isArray(parsed) ? parsed : parsed.books;
    if (!Array.isArray(importedBooks)) {
      importStatus.textContent = 'Súbor neobsahuje rozpoznateľný zoznam kníh.';
      importStatus.className = 'status-msg bad';
      return;
    }
    const validBooks = importedBooks.filter(b => b && typeof b.title === 'string' && b.title.trim());
    if (validBooks.length === 0) {
      importStatus.textContent = 'V súbore sa nenašla žiadna platná kniha.';
      importStatus.className = 'status-msg bad';
      return;
    }
    const normalizedImport = validBooks.map(b => ({
      title: b.title.trim(), author: (b.author || '').trim(), genre: (b.genre || 'Nezaradené').trim(),
      originalTitle: (b.originalTitle || '').trim(), isbn: (b.isbn || '').replace(/[^0-9Xx]/g, '').toUpperCase(),
      coverUrl: b.coverUrl || null, description: b.description || null, customCover: !!b.customCover,
      sourcesTried: b.sourcesTried || {}, createdAt: b.createdAt || Date.now()
    }));

    if (allBooks.length === 0) {
      allBooks = normalizedImport.map((b, i) => ({ id: 'imported_' + i + '_' + Date.now(), ...b }));
      await syncToCloud();
      importStatus.textContent = `Naimportovaných ${allBooks.length} kníh.`;
      importStatus.className = 'status-msg ok';
      return;
    }

    const duplicateCount = normalizedImport.filter(b => findDuplicateBook(b)).length;
    pendingImportBooks = normalizedImport;
    importChoiceSummary.textContent = `Import obsahuje ${validBooks.length} kníh (z toho ${duplicateCount} sa zhoduje s knihami, ktoré už máš v katalógu). Tvoj aktuálny katalóg má ${allBooks.length} kníh.`;
    importChoiceModal.style.display = 'flex';
  };
  reader.onerror = () => {
    importStatus.textContent = 'Súbor sa nepodarilo prečítať.';
    importStatus.className = 'status-msg bad';
  };
  reader.readAsText(file);
  importFileInput.value = '';
});

importCancelBtn.addEventListener('click', () => {
  importChoiceModal.style.display = 'none';
  pendingImportBooks = null;
});
importReplaceBtn.addEventListener('click', async () => {
  if (!pendingImportBooks) return;
  allBooks = pendingImportBooks.map((b, i) => ({ id: 'imported_' + i + '_' + Date.now(), ...b }));
  await syncToCloud();
  importStatus.textContent = `Katalóg nahradený — ${allBooks.length} kníh.`;
  importStatus.className = 'status-msg ok';
  importChoiceModal.style.display = 'none';
  pendingImportBooks = null;
});
importMergeBtn.addEventListener('click', async () => {
  if (!pendingImportBooks) return;
  let addedCount = 0, skippedCount = 0;
  pendingImportBooks.forEach((b, i) => {
    if (findDuplicateBook(b)) { skippedCount++; return; }
    allBooks.push({ id: 'imported_' + i + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), ...b });
    addedCount++;
  });
  await syncToCloud();
  importStatus.textContent = `Pridaných ${addedCount} nových kníh, ${skippedCount} duplicít preskočených.`;
  importStatus.className = 'status-msg ok';
  importChoiceModal.style.display = 'none';
  pendingImportBooks = null;
});

// ============================================================
// Nebezpečná zóna — vyžaduje napísanie presného slova na potvrdenie,
// nech sa tieto nezvratné akcie nedajú spustiť omylom jedným klikom.
// ============================================================

let pendingDangerAction = null;

function openDangerConfirm(title, text, word, action) {
  confirmDangerTitle.textContent = title;
  confirmDangerText.textContent = text;
  confirmDangerWord.textContent = word;
  confirmDangerInput.value = '';
  confirmDangerBtn.disabled = true;
  pendingDangerAction = { word, action };
  confirmDangerModal.style.display = 'flex';
  confirmDangerInput.focus();
}

confirmDangerInput.addEventListener('input', () => {
  confirmDangerBtn.disabled = !pendingDangerAction || confirmDangerInput.value.trim() !== pendingDangerAction.word;
});

cancelDangerBtn.addEventListener('click', () => {
  confirmDangerModal.style.display = 'none';
  pendingDangerAction = null;
});

confirmDangerBtn.addEventListener('click', async () => {
  if (!pendingDangerAction) return;
  const action = pendingDangerAction.action;
  confirmDangerModal.style.display = 'none';
  pendingDangerAction = null;
  await action();
});

deleteAllBooksBtn.addEventListener('click', () => {
  openDangerConfirm(
    'Zmazať všetky knihy?',
    `Toto natrvalo vymaže všetkých ${allBooks.length} kníh z tvojho katalógu. Účet a prihlásenie zostanú — môžeš začať znova od nuly. Túto akciu nie je možné vrátiť späť (urob si radšej export pred zmazaním).`,
    'ZMAZAŤ',
    async () => {
      dangerStatus.textContent = 'Mažem…';
      dangerStatus.className = 'status-msg';
      allBooks = [];
      isPublicEnabled = false;
      await syncToCloud();
      localStorage.removeItem(getStorageKey());
      dangerStatus.textContent = 'Všetky knihy boli zmazané.';
      dangerStatus.className = 'status-msg ok';
    }
  );
});

deleteAccountBtn.addEventListener('click', () => {
  openDangerConfirm(
    'Zmazať účet?',
    'Toto natrvalo zmaže tvoj účet vrátane prihlasovacích údajov aj všetkých kníh. Po tomto kroku sa už nebudeš môcť prihlásiť pod týmto účtom a táto akcia sa nedá vrátiť späť.',
    'ZMAZAŤ ÚČET',
    async () => {
      dangerStatus.textContent = 'Mažem účet…';
      dangerStatus.className = 'status-msg';
      try {
        const headers = await authHeaders();
        const res = await fetch('/.netlify/functions/delete-account', {
          method: 'POST',
          headers
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          dangerStatus.textContent = err.error || 'Zmazanie účtu zlyhalo. Skús to znova.';
          dangerStatus.className = 'status-msg bad';
          return;
        }
        localStorage.removeItem(getStorageKey());
        dangerStatus.textContent = 'Účet bol zmazaný. O chvíľu ťa presmerujeme…';
        dangerStatus.className = 'status-msg ok';
        setTimeout(() => {
          window.netlifyIdentity?.logout();
          location.href = 'index.html';
        }, 2000);
      } catch (error) {
        console.error('Chyba pri mazaní účtu:', error);
        dangerStatus.textContent = 'Nepodarilo sa spojiť so serverom. Skús to znova.';
        dangerStatus.className = 'status-msg bad';
      }
    }
  );
});

// ============================================================
// Prihlásenie (Netlify Identity) — rovnaký princíp ako v app.js
// ============================================================

async function showSettings(user) {
  currentUser = user;
  applyTranslations();
  uiLanguageSelect.value = getUiLanguage();
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('settingsRoot').style.display = 'block';
  accountEmail.textContent = user?.email || '';

  loadApiKey();
  loadBooksApiKey();
  languageSelect.value = getUserLanguage();
  await loadBooks();
}

function showLogin() {
  currentUser = null;
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('settingsRoot').style.display = 'none';
}

function setupAuth() {
  if (!window.netlifyIdentity) {
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (window.netlifyIdentity) {
        clearInterval(interval);
        setupAuth();
      } else if (attempts > 20) {
        clearInterval(interval);
        // Lokálny vývoj bez Identity — odblokujeme nastavenia aj tak.
        showSettings({ id: 'local-dev', email: 'lokálny vývoj (bez prihlásenia)' });
      }
    }, 250);
    return;
  }

  const identity = window.netlifyIdentity;
  identity.on('init', (user) => {
    if (user) showSettings(user);
    else showLogin();
  });
  identity.on('logout', () => showLogin());
  identity.init();
}

document.addEventListener('DOMContentLoaded', setupAuth);
