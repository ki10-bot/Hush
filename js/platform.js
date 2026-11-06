import { safeUrl, normalizeUrl } from './util.js';

export const STORAGE_KEY = 'hush-desktop:v1';
export const LEGACY_STORAGE_KEY = 'aether-desktop:v1';

const chromeApi = globalThis.chrome;
export const IS_EXTENSION = !!(
  chromeApi?.runtime?.id &&
  chromeApi?.bookmarks?.getTree &&
  chromeApi?.history?.search &&
  chromeApi?.storage?.local
);

const minutes = (n) => Date.now() - n * 60_000;

const folder = (id, title, children, dateAdded = minutes(60 * 24 * 40)) => ({ id, title, dateAdded, children });
const bookmark = (id, title, url, dateAdded = minutes(60 * 24 * 20)) => ({ id, title, url, dateAdded });

const DEMO_BOOKMARKS = [
  folder('0', '', [
    folder('1', 'Bookmarks bar', [
      bookmark('b-arena', 'Arena.ai', 'https://arena.ai/'),
      bookmark('b-figma', 'Figma', 'https://www.figma.com/'),
      bookmark('b-github', 'GitHub', 'https://github.com/'),
      folder('f-design', 'Design', [
        bookmark('b-dribbble', 'Dribbble', 'https://dribbble.com/'),
        bookmark('b-behance', 'Behance', 'https://www.behance.net/'),
        bookmark('b-awwwards', 'Awwwards', 'https://www.awwwards.com/'),
        folder('f-type', 'Typografie', [
          bookmark('b-fonts', 'Google Fonts', 'https://fonts.google.com/'),
          bookmark('b-typewolf', 'Typewolf', 'https://www.typewolf.com/')
        ])
      ]),
      folder('f-dev', 'Entwicklung', [
        bookmark('b-mdn', 'MDN Web Docs', 'https://developer.mozilla.org/de/'),
        bookmark('b-chrome', 'Chrome Extensions Docs', 'https://developer.chrome.com/docs/extensions/'),
        bookmark('b-stack', 'Stack Overflow', 'https://stackoverflow.com/'),
        bookmark('b-codepen', 'CodePen', 'https://codepen.io/')
      ]),
      folder('f-read', 'Lesen', [
        bookmark('b-wiki', 'Wikipedia', 'https://de.wikipedia.org/'),
        bookmark('b-gutenberg', 'Project Gutenberg', 'https://www.gutenberg.org/'),
        bookmark('b-zeit', 'ZEIT ONLINE', 'https://www.zeit.de/')
      ])
    ]),
    folder('2', 'Other bookmarks', [
      bookmark('b-youtube', 'YouTube', 'https://www.youtube.com/'),
      bookmark('b-spotify', 'Spotify', 'https://open.spotify.com/'),
      bookmark('b-notion', 'Notion', 'https://www.notion.so/'),
      folder('f-travel', 'Reisen', [
        bookmark('b-bahn', 'Deutsche Bahn', 'https://www.bahn.de/'),
        bookmark('b-maps', 'OpenStreetMap', 'https://www.openstreetmap.org/')
      ]),
      folder('f-tools', 'Werkzeuge', [
        bookmark('b-deepl', 'DeepL', 'https://www.deepl.com/translator'),
        bookmark('b-photopea', 'Photopea', 'https://www.photopea.com/'),
        bookmark('b-excalidraw', 'Excalidraw', 'https://excalidraw.com/')
      ])
    ])
  ], minutes(60 * 24 * 400))
];

const DEMO_HISTORY = [
  { id: 'h1', title: 'Arena.ai – Agent Mode', url: 'https://arena.ai/', lastVisitTime: minutes(2), visitCount: 42 },
  { id: 'h2', title: 'Figma', url: 'https://www.figma.com/files/', lastVisitTime: minutes(14), visitCount: 88 },
  { id: 'h3', title: 'GitHub', url: 'https://github.com/', lastVisitTime: minutes(38), visitCount: 121 },
  { id: 'h4', title: 'Chrome Extensions Docs', url: 'https://developer.chrome.com/docs/extensions/', lastVisitTime: minutes(74), visitCount: 19 },
  { id: 'h5', title: 'YouTube', url: 'https://www.youtube.com/', lastVisitTime: minutes(132), visitCount: 203 },
  { id: 'h6', title: 'Dribbble', url: 'https://dribbble.com/', lastVisitTime: minutes(210), visitCount: 31 },
  { id: 'h7', title: 'Wikipedia', url: 'https://de.wikipedia.org/wiki/Wikipedia', lastVisitTime: minutes(340), visitCount: 56 },
  { id: 'h8', title: 'MDN Web Docs', url: 'https://developer.mozilla.org/de/', lastVisitTime: minutes(520), visitCount: 64 },
  { id: 'h9', title: 'Spotify', url: 'https://open.spotify.com/', lastVisitTime: minutes(760), visitCount: 97 },
  { id: 'h10', title: 'Notion', url: 'https://www.notion.so/', lastVisitTime: minutes(1100), visitCount: 73 },
  { id: 'h11', title: 'Excalidraw', url: 'https://excalidraw.com/', lastVisitTime: minutes(1600), visitCount: 12 },
  { id: 'h12', title: 'DeepL Übersetzer', url: 'https://www.deepl.com/translator', lastVisitTime: minutes(2200), visitCount: 28 }
];

export const DEMO_DEFAULTS = {
  desktop: [
    { id: 'demo-desktop-1', kind: 'folder', title: 'Design', folderId: 'f-design', col: 0, row: 0 },
    { id: 'demo-desktop-2', kind: 'bookmark', title: 'Arena.ai', url: 'https://arena.ai/', col: 0, row: 1 },
    { id: 'demo-desktop-3', kind: 'bookmark', title: 'GitHub', url: 'https://github.com/', col: 0, row: 2 },
    { id: 'demo-desktop-4', kind: 'bookmark', title: 'Figma', url: 'https://www.figma.com/', col: 1, row: 0 }
  ],
  pinned: [
    { id: 'demo-pin-1', kind: 'bookmark', title: 'Arena.ai', url: 'https://arena.ai/', bookmarkId: 'b-arena' },
    { id: 'demo-pin-2', kind: 'folder', title: 'Entwicklung', folderId: 'f-dev' }
  ]
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}



function invoke(target, method, ...args) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      if (error) reject(error instanceof Error ? error : new Error(String(error)));
      else resolve(value);
    };

    let returned;
    try {
      returned = target[method](...args, (value) => {
        const lastError = chromeApi?.runtime?.lastError;
        finish(lastError ? new Error(lastError.message) : null, value);
      });
    } catch (error) {
      finish(error);
      return;
    }

    if (returned && typeof returned.then === 'function') {
      returned.then((value) => finish(null, value), (error) => finish(error));
    }
  });
}

function demoGet(keys) {
  const list = typeof keys === 'string' ? [keys] : Array.isArray(keys) ? keys : Object.keys(keys || {});
  const result = {};
  for (const key of list) {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) result[key] = JSON.parse(raw);
    } catch {  }
  }
  return Promise.resolve(result);
}

function demoSet(object) {
  for (const [key, value] of Object.entries(object)) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {  }
  }
  return Promise.resolve();
}

function localDebounce(fn, wait) {
  let timer = 0;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

export const api = {
  isExtension: IS_EXTENSION,

  async bookmarksTree() {
    if (!IS_EXTENSION) return clone(DEMO_BOOKMARKS);
    return invoke(chromeApi.bookmarks, 'getTree');
  },

  async recentSites(limit = 40) {
    if (!IS_EXTENSION) return clone(DEMO_HISTORY);
    return invoke(chromeApi.history, 'search', {
      text: '',
      startTime: 0,
      maxResults: Math.max(100, limit * 3)
    });
  },

  async searchHistory(query, limit = 20) {
    const text = String(query || '').trim();
    if (!IS_EXTENSION) {
      const needle = text.toLocaleLowerCase();
      return clone(DEMO_HISTORY)
        .filter((entry) => !needle || `${entry.title || ''} ${entry.url || ''}`.toLocaleLowerCase().includes(needle))
        .slice(0, limit);
    }
    return invoke(chromeApi.history, 'search', { text, startTime: 0, maxResults: limit });
  },

  async createBookmark(title, url) {
    const clean = safeUrl(url);
    if (!clean) throw new Error('Ungültige Adresse');
    if (!IS_EXTENSION) return { id: `demo-${Date.now()}`, title: String(title || clean), url: clean };
    return invoke(chromeApi.bookmarks, 'create', { title: String(title || clean), url: clean });
  },

  async tabs() {
    if (!IS_EXTENSION || !chromeApi.tabs?.query) return [];
    try {
      return await invoke(chromeApi.tabs, 'query', {});
    } catch {
      return [];
    }
  },

  async get(keys) {
    if (!IS_EXTENSION) return demoGet(keys);
    try {
      return await invoke(chromeApi.storage.local, 'get', keys);
    } catch {
      return {};
    }
  },

  async set(object) {
    if (!IS_EXTENSION) return demoSet(object);
    try {
      return await invoke(chromeApi.storage.local, 'set', object);
    } catch (error) {
      console.warn('Hush: Einstellungen konnten nicht gespeichert werden.', error);
    }
  },

  faviconUrl(url, size = 128) {
    if (!IS_EXTENSION || !chromeApi.runtime?.getURL) return null;
    const clean = safeUrl(url);
    if (!clean) return null;
    try {
      const favicon = new URL(chromeApi.runtime.getURL('/_favicon/'));
      favicon.searchParams.set('pageUrl', clean);
      favicon.searchParams.set('size', String(size));
      return favicon.toString();
    } catch {
      return null;
    }
  },

  async activateTab(tabId, windowId) {
    if (!IS_EXTENSION || tabId == null || !chromeApi.tabs?.update) return false;
    try {
      if (windowId != null && chromeApi.windows?.update) {
        await invoke(chromeApi.windows, 'update', windowId, { focused: true });
      }
      await invoke(chromeApi.tabs, 'update', tabId, { active: true });
      return true;
    } catch {
      return false;
    }
  },

  async waitForTabComplete(tabId, url, timeout = 1800) {
    if (!IS_EXTENSION || tabId == null) return false;
    const events = chromeApi.tabs?.onUpdated;
    if (!events?.addListener) return false;
    const target = url ? normalizeUrl(url) : '';
    return new Promise((resolve) => {
      let settled = false;
      let timer = 0;
      const finish = (loaded) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        try { events.removeListener?.(listener); } catch { }
        resolve(loaded);
      };
      const listener = (id, changeInfo, tab) => {
        if (id !== tabId || settled) return;
        const candidate = changeInfo?.url || tab?.url;
        if (candidate && target && normalizeUrl(candidate) !== target) return;
        if (changeInfo?.status === 'complete' || (changeInfo?.url && changeInfo?.status !== 'loading')) finish(true);
      };
      try { events.addListener(listener); } catch { resolve(false); return; }
      if (chromeApi.tabs?.get) {
        invoke(chromeApi.tabs, 'get', tabId).then((tab) => {
          if (settled || tab?.status !== 'complete') return;
          const candidate = tab?.url;
          if (candidate && target && normalizeUrl(candidate) !== target) return;
          finish(true);
        }).catch(() => {});
      }
      timer = setTimeout(() => finish(false), Math.max(250, Math.min(timeout, 5000)));
    });
  },

  async open(url, options = {}) {
    const clean = safeUrl(url);
    if (!clean) throw new Error('Diese Adresse kann aus Sicherheitsgründen nicht geöffnet werden.');

    if (!IS_EXTENSION) {
      try { window.open(clean, '_blank', 'noopener,noreferrer'); } catch {  }
      return { demo: true, url: clean, tabId: null };
    }

    if (options.newTab) {
      const created = await invoke(chromeApi.tabs, 'create', { url: clean, active: !options.background });
      return { url: clean, tabId: created?.id ?? null };
    }

    if (options.navigateCurrent === false) {
      const created = await invoke(chromeApi.tabs, 'create', { url: clean, active: true });
      return { url: clean, tabId: created?.id ?? null };
    }

    let current = null;
    try { current = await invoke(chromeApi.tabs, 'getCurrent'); } catch {  }

    if (current?.id != null) {
      try {
        await invoke(chromeApi.tabs, 'update', current.id, { url: clean });
        return { url: clean, tabId: current.id };
      } catch {  }
    }
    window.location.href = clean;
    return { url: clean, tabId: null };
  },

  onChanged(handlers = {}) {
    if (!IS_EXTENSION) return;
    const bookmarks = localDebounce(() => handlers.bookmarks?.(), 220);
    const history = localDebounce(() => handlers.history?.(), 450);
    const tabs = localDebounce(() => handlers.tabs?.(), 250);

    const bm = chromeApi.bookmarks;
    ['onChanged', 'onCreated', 'onRemoved', 'onMoved', 'onChildrenReordered'].forEach((event) => {
      try { bm?.[event]?.addListener(bookmarks); } catch {  }
    });

    try { chromeApi.history?.onVisited?.addListener(history); } catch {  }
    try { chromeApi.history?.onVisitRemoved?.addListener(history); } catch {  }

    try { chromeApi.tabs?.onUpdated?.addListener((_id, change) => {
      if (change.url || change.status === 'complete' || change.favIconUrl) tabs();
    }); } catch {  }
    ['onCreated', 'onRemoved', 'onActivated'].forEach((event) => {
      try { chromeApi.tabs?.[event]?.addListener(tabs); } catch {  }
    });

    try {
      chromeApi.storage?.onChanged?.addListener((changes, area) => {
        if (area === 'local' && changes[STORAGE_KEY]?.newValue) {
          handlers.storage?.(changes[STORAGE_KEY].newValue);
        }
      });
    } catch {  }
  }
};
