import { api, IS_EXTENSION, STORAGE_KEY, LEGACY_STORAGE_KEY, DEMO_DEFAULTS } from './platform.js';
import { iconEl, hydrateIcons, itemIcon } from './icons.js';
import {
  $, $$, el, clamp, debounce, hashString, safeUrl, hostOf, siteName, shortTitle,
  normalizeUrl, itemKey, sameItem, formatRelative, formatDate, plural, uid, copyText, escapeXml,
  googleSearchUrl, urlFromQuery
} from './util.js';
import {
  applyTheme, initClock, initAmbient, showContextMenu, hideContextMenu,
  showDockTooltip, hideDockTooltip, bounce
} from './ui.js';
import { startI18n, t, locale } from './i18n.js';

const GRID_MARGIN_X = 34;
const GRID_MARGIN_Y = 96;
const GRID_BOTTOM = 118;
const GRID_SIZE_MIN = 80;
const GRID_SIZE_MAX = 180;
const GRID_SIZE_DEFAULT = 104;
const ICON_SIZE_MIN = 48;
const ICON_SIZE_MAX = 112;
const ICON_SIZE_DEFAULT = 64;
const VIDEO_DB_NAME = 'hush-media';
const VIDEO_DB_STORE = 'files';
const VIDEO_DB_KEY = 'wallpaper-video';
const VIDEO_MAX_BYTES = 150 * 1024 * 1024;
const CLOCK_COLOR_DEFAULT = '#f4f4f7';
const DOCK_COLOR_DEFAULT = '#0d0d11';
const DEFAULT_SEARCH_SHORTCUT = 'Space';
const windowRegistry = new Map();
const CLIENT_ID = uid('hush-client');
let settingsRevision = 0;
let windowZCounter = 300;
let activeWindowId = null;

const DEFAULT_SETTINGS = {
  animations: true,
  magnify: false,
  parallax: true,
  dim: 42,
  darkenWallpaper: false,
  glass: 52,
  recents: 8,
  explorerView: 'grid',
  wallpaper: null,
  language: 'en',
  languageMigrated: true,
  showSeconds: false,
  font: 'orbitron',
  customFont: null,
  dockSide: 'bottom',
  clockX: 0.5,
  clockY: 0.035,
  clockScale: 1,
  gridSize: GRID_SIZE_DEFAULT,
  gridEnabled: true,
  iconSize: ICON_SIZE_DEFAULT,
  wallpaperVideoSource: null,
  wallpaperVideoUrl: null,
  clockColor: CLOCK_COLOR_DEFAULT,
  dockColor: DOCK_COLOR_DEFAULT,
  theme: 'dark',
  windowGlass: 62,
  dockAutoHide: false,
  dockStyle: 'island',
  dockAlign: 'center',
  dockAlpha: 62,
  dockBlur: 18,
  dockRadius: 22,
  searchShortcut: DEFAULT_SEARCH_SHORTCUT,
  shortenLinks: true,
  wallpaperPackActive: false,
  wallpaperPackCount: 0,
  wallpaperPackIndex: 0,
  wallpaperPackTimer: 5,
  wallpaperPackOnReload: true,
  wallpaperIndexByTheme: {},
  widgetsEnabled: true,
  settingsVersion: 12
};

const FONT_STACKS = {
  orbitron: "'Orbitron', 'SF Mono', 'Segoe UI Mono', ui-monospace, monospace",
  redaction10: "'Redaction 10', 'Courier New', ui-monospace, monospace",
  redaction: "'Redaction', 'Courier New', ui-monospace, monospace",
  bebas: "'Bebas Neue', 'Arial Narrow', Impact, sans-serif",
  beaurivage: "'Beau Rivage', 'Segoe Script', cursive",
  limelight: "'Limelight', 'Times New Roman', serif",
  audiowide: "'Audiowide', 'Orbitron', 'SF Mono', ui-monospace, monospace",
  michroma: "'Michroma', 'Orbitron', 'SF Mono', ui-monospace, monospace",
  oxanium: "'Oxanium', 'Orbitron', 'SF Mono', ui-monospace, monospace",
  chakra: "'Chakra Petch', 'Rajdhani', 'Segoe UI', sans-serif",
  rajdhani: "'Rajdhani', 'Chakra Petch', 'Segoe UI', sans-serif",
  space: "'Space Grotesk', 'Segoe UI', Inter, sans-serif",
  italiana: "'Italiana', 'Times New Roman', serif",
  cormorant: "'Cormorant Garamond', 'Times New Roman', serif",
  playfair: "'Playfair Display', Georgia, serif",
  bodoni: "'Bodoni Moda', 'Times New Roman', serif",
  custom: "'HushCustom', 'Orbitron', 'SF Mono', ui-monospace, monospace"
};

const FONT_STYLES = Object.freeze({ cormorant: 'italic', playfair: 'italic', bodoni: 'italic' });
const DOCK_SIDES = Object.freeze(['bottom', 'top', 'left', 'right']);
const CLOCK_SCALE_MIN = 0.6;
const CLOCK_SCALE_MAX = 4;
const DOCK_STYLES = Object.freeze(['island', 'win10', 'win11']);
const DOCK_ALIGNS = Object.freeze(['left', 'center', 'right']);
const WALLPAPER_PACK_PREFIX = 'wallpaper-pack:';
const WALLPAPER_PACK_FADE_MS = 450;
const WALLPAPER_PACK_MAX_FILES = 200;
const SHORTCUT_MODIFIER_ORDER = Object.freeze(['Ctrl', 'Alt', 'Shift', 'Meta']);
const SHORTCUT_MODIFIER_ALIASES = Object.freeze({
  ctrl: 'Ctrl', control: 'Ctrl', cmd: 'Meta', command: 'Meta', meta: 'Meta', super: 'Meta',
  alt: 'Alt', option: 'Alt', shift: 'Shift'
});
const SHORTCUT_KEY_ALIASES = Object.freeze({
  ' ': 'Space', space: 'Space', spacebar: 'Space', leertaste: 'Space',
  slash: 'Slash', '/': 'Slash', esc: 'Esc', escape: 'Esc', enter: 'Enter', return: 'Enter',
  arrowup: 'Up', arrowdown: 'Down', arrowleft: 'Left', arrowright: 'Right',
  up: 'Up', down: 'Down', left: 'Left', right: 'Right'
});
const SHORTCUT_UNSAFE = new Set([
  'Esc', 'F5', 'Ctrl+W', 'Meta+W', 'Ctrl+Shift+W', 'Meta+Shift+W',
  'Ctrl+T', 'Meta+T', 'Ctrl+N', 'Meta+N', 'Ctrl+Q', 'Meta+Q', 'Ctrl+Shift+Q', 'Meta+Shift+Q',
  'Ctrl+R', 'Meta+R', 'Alt+F4', 'Meta+F4'
]);

function canonicalShortcutModifier(value) {
  return SHORTCUT_MODIFIER_ALIASES[String(value || '').trim().toLowerCase()] || '';
}

function canonicalShortcutKey(value) {
  const raw = String(value || '').trim();
  const alias = SHORTCUT_KEY_ALIASES[raw.toLowerCase()];
  if (alias) return alias;
  if (/^f([1-9]|1[0-2])$/i.test(raw)) return raw.toUpperCase();
  if (/^[a-z]$/i.test(raw)) return raw.toUpperCase();
  if (/^\d$/.test(raw)) return raw;
  return '';
}

function composeShortcut(modifiers, key) {
  const set = new Set(modifiers);
  return [...SHORTCUT_MODIFIER_ORDER.filter((modifier) => set.has(modifier)), key].join('+');
}

function sanitizeSearchShortcut(raw) {
  const parts = String(raw || '').split('+').map((part) => part.trim()).filter(Boolean);
  if (!parts.length || parts.length > 5) return DEFAULT_SEARCH_SHORTCUT;
  const modifiers = [];
  let key = '';
  for (const part of parts) {
    const modifier = canonicalShortcutModifier(part);
    if (modifier && !key && !modifiers.includes(modifier)) {
      modifiers.push(modifier);
      continue;
    }
    if (!key) {
      key = canonicalShortcutKey(part);
      if (key) continue;
    }
    return DEFAULT_SEARCH_SHORTCUT;
  }
  if (!key) return DEFAULT_SEARCH_SHORTCUT;
  const binding = composeShortcut(modifiers, key);
  return SHORTCUT_UNSAFE.has(binding) ? DEFAULT_SEARCH_SHORTCUT : binding;
}

function shortcutKeyFromEvent(event) {
  const key = String(event?.key || '');
  const code = String(event?.code || '');
  if (code === 'Space' || key === ' ' || key === 'Spacebar') return 'Space';
  if (code === 'Slash' || key === '/') return 'Slash';
  if (/^f([1-9]|1[0-2])$/i.test(key)) return key.toUpperCase();
  if (/^[a-z]$/i.test(key)) return key.toUpperCase();
  if (/^\d$/.test(key)) return key;
  if (code.startsWith('Key')) return code.slice(3).toUpperCase();
  if (code.startsWith('Digit')) return code.slice(5);
  return canonicalShortcutKey(key);
}

function shortcutFromEvent(event) {
  const key = shortcutKeyFromEvent(event);
  if (!key) return '';
  const modifiers = [];
  if (event.ctrlKey) modifiers.push('Ctrl');
  if (event.altKey) modifiers.push('Alt');
  if (event.shiftKey) modifiers.push('Shift');
  if (event.metaKey) modifiers.push('Meta');
  const binding = composeShortcut(modifiers, key);
  return SHORTCUT_UNSAFE.has(binding) ? '' : binding;
}

function shortcutParts(binding) {
  const parts = sanitizeSearchShortcut(binding).split('+');
  const key = parts.pop() || DEFAULT_SEARCH_SHORTCUT;
  return { key, modifiers: new Set(parts) };
}

function shortcutMatchesEvent(event, binding) {
  const { key, modifiers } = shortcutParts(binding);
  if (event.ctrlKey !== modifiers.has('Ctrl')) return false;
  if (event.altKey !== modifiers.has('Alt')) return false;
  if (event.shiftKey !== modifiers.has('Shift')) return false;
  if (event.metaKey !== modifiers.has('Meta')) return false;
  return shortcutKeyFromEvent(event) === key;
}

function shortcutKeyLabel(key, technical) {
  const labels = {
    Space: technical ? 'Space' : t('Leertaste'),
    Slash: '/', Esc: 'Esc', Enter: '↵', Up: '↑', Down: '↓', Left: '←', Right: '→'
  };
  return labels[key] || key;
}

function shortcutLabel(binding = state.settings.searchShortcut, technical = false) {
  const { key, modifiers } = shortcutParts(binding);
  const labels = [];
  if (modifiers.has('Ctrl')) labels.push('Ctrl');
  if (modifiers.has('Alt')) labels.push('Alt');
  if (modifiers.has('Shift')) labels.push('Shift');
  if (modifiers.has('Meta')) labels.push(technical ? 'Cmd' : '⌘');
  labels.push(shortcutKeyLabel(key, technical));
  return labels.join(' + ');
}

function shortcutTechnicalLabel(binding = state.settings.searchShortcut) {
  return shortcutLabel(binding, true);
}

function shortcutAriaValue(binding = state.settings.searchShortcut) {
  const { key, modifiers } = shortcutParts(binding);
  const values = [];
  if (modifiers.has('Ctrl')) values.push('Control');
  if (modifiers.has('Alt')) values.push('Alt');
  if (modifiers.has('Shift')) values.push('Shift');
  if (modifiers.has('Meta')) values.push('Meta');
  const ariaKeys = {
    Space: 'Space', Slash: '/', Esc: 'Escape', Enter: 'Enter',
    Up: 'ArrowUp', Down: 'ArrowDown', Left: 'ArrowLeft', Right: 'ArrowRight'
  };
  values.push(ariaKeys[key] || key);
  return values.join('+');
}

function canTriggerSearchShortcut(event) {
  if (event.defaultPrevented || event.repeat || event.isComposing) return false;
  if (state.captureShortcut || state.spotlight.open || state.rename.open || state.displayEditor.open) return false;
  if (refs.launchOverlay?.classList.contains('is-open') || refs.launchOverlay?.classList.contains('is-closing')) return false;
  const target = event.target;
  if (target && typeof target.closest === 'function') {
    if (target.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""], button, a')) return false;
    if (target.closest('.window, .settings-window, .context-menu, .spotlight-overlay, .launch-overlay')) return false;
    const roleButton = target.closest('[role="button"]');
    if (roleButton && roleButton.id !== 'clockDisplay' && !roleButton.classList.contains('desktop-icon')) return false;
  }
  return true;
}

function updateSearchShortcutUI() {
  if (!refs.setSearchShortcut || !refs.setSearchShortcutHint || state.captureShortcut) return;
  const binding = state.settings.searchShortcut;
  const label = shortcutLabel(binding);
  refs.setSearchShortcut.textContent = label;
  refs.setSearchShortcut.classList.remove('is-capturing');
  refs.setSearchShortcutHint.textContent = `${label} ${t('öffnet die Suche')}`;
  const aria = shortcutAriaValue(binding);
  refs.setSearchShortcut.setAttribute('aria-keyshortcuts', aria);
  if (refs.clockDisplay) {
    refs.clockDisplay.setAttribute('aria-keyshortcuts', aria);
    refs.clockDisplay.dataset.shortcut = shortcutTechnicalLabel(binding);
  }
}

function startShortcutCapture() {
  if (!refs.setSearchShortcut || state.captureShortcut) return;
  state.captureShortcut = true;
  refs.setSearchShortcut.classList.add('is-capturing');
  refs.setSearchShortcut.textContent = t('Taste drücken …');
  refs.setSearchShortcutHint.textContent = t('Esc bricht ab');
  refs.setSearchShortcut.focus();
}

function stopShortcutCapture() {
  if (!state.captureShortcut) return;
  state.captureShortcut = false;
  refs.setSearchShortcut?.classList.remove('is-capturing');
  updateSearchShortcutUI();
}

function onShortcutCapture(event) {
  if (!state.captureShortcut) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    stopShortcutCapture();
    return;
  }
  if (event.key === 'Tab') {
    stopShortcutCapture();
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  const binding = shortcutFromEvent(event);
  if (!binding) return;
  updateSettings({ searchShortcut: binding });
  stopShortcutCapture();
}
const DEFAULT_THEME = 'dark';
const THEME_PRESETS = Object.freeze({
  dark: { clockColor: '#f4f4f7', dockColor: '#0d0d11', font: 'orbitron' },
  light: { clockColor: '#101014', dockColor: '#e9e9ef', font: 'michroma' },
  color: { clockColor: '#f4f4f7', dockColor: '#ffffff', font: 'space' }
});
const THEME_IDS = Object.freeze(Object.keys(THEME_PRESETS));
const THEME_LABELS = Object.freeze({ dark: 'Dunkel', light: 'Hell', color: 'Farbig' });
const THEME_WALLPAPERS = Object.freeze({
  dark: ['assets/wallpapers/dark1.webp', 'assets/wallpapers/dark2.webp', 'assets/wallpapers/dark3.webp', 'assets/wallpapers/dark4.webp'],
  light: ['assets/wallpapers/light1.webp', 'assets/wallpapers/light2.webp', 'assets/wallpapers/light3.webp', 'assets/wallpapers/light4.webp'],
  color: ['assets/wallpapers/color1.webp', 'assets/wallpapers/color2.webp', 'assets/wallpapers/color3.webp', 'assets/wallpapers/color4.webp']
});
const LEGACY_THEME_MAP = Object.freeze({
  obsidian: 'dark', selenit: 'dark', vesper: 'dark', nocturne: 'dark', basalt: 'dark', klassisch: 'dark', modern: 'dark', custom: 'dark',
  aurora: 'light', zephyr: 'light', opal: 'light',
  kobalt: 'color', umber: 'color', solstice: 'color', moire: 'color'
});

const FOLDER_LABELS = {
  '0': 'Alle Lesezeichen',
  '1': 'Lesezeichenleiste',
  '2': 'Andere Lesezeichen',
  '3': 'Mobile Lesezeichen'
};

const BUILTIN_ITEMS = {
  'app:finder': { id: 'app:finder', kind: 'app', app: 'finder', title: 'Ablage' },
  'app:settings': { id: 'app:settings', kind: 'app', app: 'settings', title: 'Darstellung' },
  'app:widgets': { id: 'app:widgets', kind: 'app', app: 'widgets', title: 'Widgets' },
  'app:spaces': { id: 'app:spaces', kind: 'app', app: 'spaces', title: 'Spaces' }
};

const APP_VERSION = '2.1.2';
const MAX_SPACES = 3;
const DEFAULT_SPACE_ID = 'space-main';
const SPACE_COLORS = Object.freeze(['#b7b7bc', '#8ea4d2', '#c7a6b8', '#a8c9b5', '#d2bd96']);

const WIDGET_TYPES = Object.freeze(['note', 'tasks', 'timer', 'calendar', 'worldclock']);
const WIDGET_ICONS = Object.freeze({
  note: 'copy', tasks: 'check', timer: 'clock', calendar: 'grid', worldclock: 'clock'
});
const WIDGET_MIN_W = 190;
const WIDGET_MIN_H = 132;
const WIDGET_MAX_W = 520;
const WIDGET_MAX_H = 460;
const WIDGET_DEFAULT_SIZES = Object.freeze({
  note: { w: 260, h: 190 },
  tasks: { w: 280, h: 220 },
  timer: { w: 260, h: 190 },
  calendar: { w: 260, h: 230 },
  worldclock: { w: 250, h: 190 }
});
const WIDGET_TIMEZONES = Object.freeze([
  'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow', 'Europe/London', 'UTC',
  'America/New_York', 'America/Los_Angeles', 'Asia/Dubai', 'Asia/Tokyo', 'Australia/Sydney'
]);
const DEFAULT_WIDGETS = [];

const refs = {};
let ambient = { update() {} };
let widgetTimerId = 0;
let widgetDrag = null;
let videoObjectUrl = null;
let videoLoadToken = 0;
let launchSequence = 0;
let launchCloseTimer = 0;
let wallpaperPackTimerId = 0;
let wallpaperPackFadeTimer = 0;
let wallpaperPackToken = 0;
let wallpaperPackBusy = false;
let wallpaperPackObjectUrl = null;
let wallpaperFadeToken = 0;

const state = {
  settings: { ...DEFAULT_SETTINGS },
  desktop: [],
  pinned: [],
  widgets: [],
  spaces: [],
  activeSpaceId: DEFAULT_SPACE_ID,
  bookmarksTree: [],
  bookmarkMap: new Map(),
  bookmarkList: [],
  folderList: [],
  rootId: '0',
  recents: [],
  tabs: [],
  selected: null,
  explorer: {
    open: false,
    minimized: false,
    maximized: false,
    wasDragged: false,
    dom: null,
    stack: [],
    index: -1,
    query: '',
    items: [],
    view: 'grid',
    expanded: new Set(['0'])
  },
  spotlight: { open: false, results: [], index: 0, token: 0 },
  displayEditor: { open: false, drag: null },
  rename: { open: false, id: null, mode: 'rename' },
  suppressClickUntil: 0,
  captureShortcut: false,
  pendingRefresh: false,
  demo: !IS_EXTENSION
};

const drag = {
  pending: false,
  active: false,
  pointerId: null,
  mode: 'copy',
  source: '',
  sourceEl: null,
  item: null,
  startX: 0,
  startY: 0,
  pointerX: 0,
  pointerY: 0,
  currentX: 0,
  currentY: 0,
  vx: 0,
  vy: 0,
  targetDX: 0,
  targetDY: 0,
  currentDX: 0,
  currentDY: 0,
  vdx: 0,
  vdy: 0,
  startCol: 0,
  startRow: 0,
  raf: 0,
  drop: '',
  hotEl: null,
  ghostToken: ''
};

let persistTimer = 0;
function persistNow() {
  clearTimeout(persistTimer);
  persistTimer = 0;
  captureActiveSpace();
  const revision = ++settingsRevision;
  Promise.resolve(api.set({
    [STORAGE_KEY]: {
      settings: state.settings,
      desktop: state.desktop,
      pinned: state.pinned,
      widgets: state.widgets,
      spaces: state.spaces,
      activeSpaceId: state.activeSpaceId,
      __clientId: CLIENT_ID,
      __revision: revision
    }
  })).catch(() => {});
}
function persist() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(persistNow, 220);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function numberOr(value, fallback) {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeColor(value, fallback) {
  return /^#[0-9a-f]{6}$/i.test(String(value || '')) ? String(value).toLowerCase() : fallback;
}

function hexToRgb(value) {
  const hex = safeColor(value, CLOCK_COLOR_DEFAULT).slice(1);
  const number = Number.parseInt(hex, 16);
  return [(number >> 16) & 255, (number >> 8) & 255, number & 255];
}

function safeMediaUrl(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const value = raw.trim();
  if (!value) return null;
  if (/^blob:/i.test(value) || /^data:video\//i.test(value)) return value;
  return urlFromQuery(value) || safeUrl(value);
}

function storedItemUrl(raw) {
  const clean = safeUrl(raw);
  if (!clean) return null;
  if (!state.settings.shortenLinks) return clean;
  try {
    const url = new URL(clean);
    return url.origin || clean;
  } catch {
    return clean;
  }
}

function wallpaperPackKey(index) {
  return `${WALLPAPER_PACK_PREFIX}${index}`;
}

function customWallpaperActive() {
  return typeof state.settings.wallpaper === 'string' && state.settings.wallpaper.startsWith('data:image/');
}

function customWallpaperPackActive() {
  return state.settings.wallpaperPackActive === true && state.settings.wallpaperPackCount > 0;
}

function themeWallpapers() {
  return THEME_WALLPAPERS[state.settings.theme] || THEME_WALLPAPERS[DEFAULT_THEME];
}

function themeWallpaperFallback() {
  const list = themeWallpapers();
  return list[Math.round(clamp(readWallpaperIndex(list.length), 0, Math.max(0, list.length - 1)))] || list[0] || '';
}

function activeWallpaperCount() {
  if (customWallpaperActive()) return 1;
  if (customWallpaperPackActive()) return Math.max(0, Math.round(numberOr(state.settings.wallpaperPackCount, 0)));
  return themeWallpapers().length;
}

function wallpaperIndexKey() {
  return customWallpaperPackActive() ? 'custom' : state.settings.theme;
}

function readWallpaperIndex(count) {
  const map = state.settings.wallpaperIndexByTheme || {};
  const raw = customWallpaperPackActive() ? state.settings.wallpaperPackIndex : map[wallpaperIndexKey()];
  return Math.round(clamp(numberOr(raw, 0), 0, Math.max(0, count - 1)));
}

function writeWallpaperIndex(index) {
  const key = wallpaperIndexKey();
  if (customWallpaperPackActive()) {
    state.settings.wallpaperPackIndex = index;
  } else {
    const map = { ...(state.settings.wallpaperIndexByTheme || {}) };
    map[key] = index;
    state.settings.wallpaperIndexByTheme = map;
  }
}

function iconBoxWidth() {
  return Math.round(numberOr(state.settings.iconSize, ICON_SIZE_DEFAULT) + 32);
}

function iconBoxHeight() {
  return Math.round(numberOr(state.settings.iconSize, ICON_SIZE_DEFAULT) + 120);
}

function videoStatusText() {
  const source = state.settings.wallpaperVideoSource;
  if (source === 'local' || source === 'data') return 'Lokales Video aktiv';
  if (source === 'url') return 'Video-URL aktiv';
  return 'Kein Video aktiv';
}

function wallpaperPackStatusText() {
  const settings = state.settings;
  if (customWallpaperActive()) return t('Eigenes Bild aktiv');
  const count = activeWallpaperCount();
  if (!count) return t('Kein Ordner gewählt');
  const theme = t(THEME_LABELS[settings.theme] || 'Dunkel');
  const scope = customWallpaperPackActive() ? t('Eigener Ordner') : t('Theme-Pack');
  const mode = settings.wallpaperPackOnReload ? t('Timer und Neuladen') : t('nur Timer');
  return `${scope} · ${theme} · ${plural(count, 'Bild', 'Bilder')} · ${t(`${settings.wallpaperPackTimer} Min`)} · ${mode}`;
}

function openMediaDb() {
  if (!globalThis.indexedDB) return Promise.resolve(null);
  return new Promise((resolve) => {
    let request;
    try { request = indexedDB.open(VIDEO_DB_NAME, 1); }
    catch { resolve(null); return; }
    let settled = false;
    const done = (value) => { if (!settled) { settled = true; resolve(value); } };
    request.onupgradeneeded = () => {
      const db = request.result;
      if (db && !db.objectStoreNames.contains(VIDEO_DB_STORE)) db.createObjectStore(VIDEO_DB_STORE);
    };
    request.onsuccess = () => done(request.result || null);
    request.onerror = () => done(null);
    request.onblocked = () => done(null);
  });
}

function runMediaTx(db, mode, action) {
  return new Promise((resolve) => {
    if (!db) { resolve({ ok: false, value: null }); return; }
    let tx;
    let request;
    try {
      tx = db.transaction(VIDEO_DB_STORE, mode);
      request = action(tx.objectStore(VIDEO_DB_STORE));
    } catch {
      db.close?.();
      resolve({ ok: false, value: null });
      return;
    }
    let settled = false;
    const done = (ok, value) => {
      if (settled) return;
      settled = true;
      db.close?.();
      resolve({ ok, value });
    };
    if (request) {
      request.onsuccess = () => done(true, request.result ?? null);
      request.onerror = () => done(false, null);
    }
    tx.oncomplete = () => { if (!request) done(true, null); };
    tx.onerror = () => done(false, null);
    tx.onabort = () => done(false, null);
  });
}

async function putMediaBlob(blob) {
  const db = await openMediaDb();
  const result = await runMediaTx(db, 'readwrite', (store) => store.put(blob, VIDEO_DB_KEY));
  return result.ok;
}

async function getMediaBlob() {
  const db = await openMediaDb();
  const result = await runMediaTx(db, 'readonly', (store) => store.get(VIDEO_DB_KEY));
  return result.ok ? result.value : null;
}

async function deleteMediaBlob() {
  const db = await openMediaDb();
  const result = await runMediaTx(db, 'readwrite', (store) => store.delete(VIDEO_DB_KEY));
  return result.ok;
}

async function putMediaBlobKey(blob, key) {
  const db = await openMediaDb();
  const result = await runMediaTx(db, 'readwrite', (store) => store.put(blob, key));
  return result.ok;
}

async function getMediaBlobKey(key) {
  const db = await openMediaDb();
  const result = await runMediaTx(db, 'readonly', (store) => store.get(key));
  return result.ok ? result.value : null;
}

async function deleteMediaBlobKey(key) {
  const db = await openMediaDb();
  const result = await runMediaTx(db, 'readwrite', (store) => store.delete(key));
  return result.ok;
}

async function putWallpaperPackFiles(files) {
  for (let index = 0; index < files.length; index += 1) {
    const saved = await putMediaBlobKey(files[index], wallpaperPackKey(index));
    if (!saved) return false;
  }
  return true;
}

async function deleteWallpaperPackBlobs(fromIndex = 0) {
  for (let index = fromIndex; index < WALLPAPER_PACK_MAX_FILES; index += 1) {
    await deleteMediaBlobKey(wallpaperPackKey(index));
  }
}

function isWallpaperPackFile(file) {
  const name = String(file?.name || '');
  const type = String(file?.type || '');
  return /^image\//i.test(type) || /\.(jpe?g|png|webp|gif|avif|bmp)$/i.test(name);
}

function setWallpaperImage(src, animate = false) {
  const base = refs.wallpaper;
  const next = refs.wallpaperNext;
  if (!base || !next) return;
  const token = ++wallpaperFadeToken;
  clearTimeout(wallpaperPackFadeTimer);
  const resolved = src || themeWallpaperFallback();
  if (!resolved) return;
  const image = `url("${resolved}")`;
  document.documentElement.style.setProperty('--wallpaper-fallback', image);
  const finish = () => {
    if (token !== wallpaperFadeToken) return;
    base.style.backgroundImage = image;
    base.classList.remove('is-fading-out');
    next.classList.remove('is-visible');
    next.style.backgroundImage = image;
  };
  if (!animate || document.body.classList.contains('reduced-motion')) {
    finish();
    return;
  }
  next.style.backgroundImage = image;
  next.classList.remove('is-visible');
  base.classList.remove('is-fading-out');
  void next.offsetWidth;
  requestAnimationFrame(() => {
    if (token !== wallpaperFadeToken) return;
    base.classList.add('is-fading-out');
    next.classList.add('is-visible');
  });
  wallpaperPackFadeTimer = setTimeout(finish, WALLPAPER_PACK_FADE_MS + 40);
}

function scheduleWallpaperPack() {
  clearTimeout(wallpaperPackTimerId);
  wallpaperPackTimerId = 0;
  const count = activeWallpaperCount();
  if (customWallpaperActive() || count < 2) return;
  wallpaperPackTimerId = setTimeout(() => rotateWallpaperPack(), state.settings.wallpaperPackTimer * 60_000);
}

async function wallpaperSourceForIndex(index) {
  if (customWallpaperActive()) return state.settings.wallpaper;
  if (customWallpaperPackActive()) {
    const blob = await getMediaBlobKey(wallpaperPackKey(index));
    return blob || null;
  }
  const list = themeWallpapers();
  return list[index % list.length] || list[0] || themeWallpaperFallback();
}

async function applyWallpaperPack(options = {}) {
  const count = activeWallpaperCount();
  clearTimeout(wallpaperPackTimerId);
  if (!count) {
    if (wallpaperPackObjectUrl) {
      URL.revokeObjectURL?.(wallpaperPackObjectUrl);
      wallpaperPackObjectUrl = null;
    }
    setWallpaperImage(themeWallpaperFallback(), false);
    return;
  }
  let index = readWallpaperIndex(count);
  if (options.advanceOnReload && state.settings.wallpaperPackOnReload && count > 1 && !customWallpaperActive()) {
    index = (index + 1) % count;
    writeWallpaperIndex(index);
    persistNow();
  }
  const requestToken = ++wallpaperPackToken;
  const requestTheme = state.settings.theme;
  const requestCustomPack = customWallpaperPackActive();
  let source = await wallpaperSourceForIndex(index);
  if (requestToken !== wallpaperPackToken || requestTheme !== state.settings.theme || requestCustomPack !== customWallpaperPackActive()) return;
  if (!source && customWallpaperPackActive()) {
    const fallback = themeWallpapers();
    source = fallback[0] || '';
    state.settings.wallpaperPackActive = false;
    state.settings.wallpaperPackCount = 0;
    writeWallpaperIndex(0);
    persistNow();
    syncSettingsUI();
  }
  let src = '';
  if (typeof source === 'string') {
    if (wallpaperPackObjectUrl) {
      URL.revokeObjectURL?.(wallpaperPackObjectUrl);
      wallpaperPackObjectUrl = null;
    }
    src = source;
  } else if (source && globalThis.URL?.createObjectURL) {
    const nextUrl = URL.createObjectURL(source);
    if (wallpaperPackObjectUrl && wallpaperPackObjectUrl !== nextUrl) URL.revokeObjectURL?.(wallpaperPackObjectUrl);
    wallpaperPackObjectUrl = nextUrl;
    src = nextUrl;
  }
  setWallpaperImage(src, !!options.animate);
  scheduleWallpaperPack();
}

async function rotateWallpaperPack() {
  const count = activeWallpaperCount();
  if (customWallpaperActive() || count < 2 || wallpaperPackBusy) {
    scheduleWallpaperPack();
    return;
  }
  wallpaperPackBusy = true;
  const nextIndex = (readWallpaperIndex(count) + 1) % count;
  writeWallpaperIndex(nextIndex);
  persistNow();
  try {
    await applyWallpaperPack({ animate: true });
  } finally {
    wallpaperPackBusy = false;
  }
}

async function handleWallpaperPackFiles(fileList) {
  const files = Array.from(fileList || [])
    .filter(isWallpaperPackFile)
    .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || ''), 'de'))
    .slice(0, WALLPAPER_PACK_MAX_FILES);
  if (!files.length) {
    refs.wallpaperPackInput.value = '';
    return;
  }
  try {
    await clearWallpaperVideo(true);
    const saved = await putWallpaperPackFiles(files);
    if (!saved) throw new Error('indexeddb');
    await deleteWallpaperPackBlobs(files.length);
    state.settings.wallpaper = null;
    state.settings.wallpaperPackActive = true;
    state.settings.wallpaperPackCount = files.length;
    state.settings.wallpaperPackIndex = 0;
    persistNow();
    syncSettingsUI();
    await applyWallpaperPack({ animate: true });
  } catch {
  } finally {
    refs.wallpaperPackInput.value = '';
  }
}

async function clearWallpaperPack(silent = false) {
  clearTimeout(wallpaperPackTimerId);
  wallpaperPackTimerId = 0;
  ++wallpaperPackToken;
  await deleteWallpaperPackBlobs(0);
  if (wallpaperPackObjectUrl) {
    URL.revokeObjectURL?.(wallpaperPackObjectUrl);
    wallpaperPackObjectUrl = null;
  }
  state.settings.wallpaperPackActive = false;
  state.settings.wallpaperPackCount = 0;
  state.settings.wallpaperPackIndex = 0;
  state.settings.wallpaperIndexByTheme = {};
  persistNow();
  syncSettingsUI();
  await applyWallpaperPack({ animate: true });
}

async function applyWallpaperVideo() {
  const token = ++videoLoadToken;
  const video = refs.wallpaperVideo;
  if (!video) return;
  const source = state.settings.wallpaperVideoSource;
  const rawUrl = state.settings.wallpaperVideoUrl;
  let src = '';
  if (source === 'local') {
    const blob = await getMediaBlob();
    if (token !== videoLoadToken) return;
    if (blob && globalThis.URL?.createObjectURL) {
      const nextUrl = URL.createObjectURL(blob);
      if (videoObjectUrl && videoObjectUrl !== nextUrl) URL.revokeObjectURL?.(videoObjectUrl);
      videoObjectUrl = nextUrl;
      src = nextUrl;
    }
  } else if (source === 'url' || source === 'data') {
    src = safeMediaUrl(rawUrl) || '';
  }
  if (token !== videoLoadToken) return;
  if (videoObjectUrl && src !== videoObjectUrl) {
    URL.revokeObjectURL?.(videoObjectUrl);
    videoObjectUrl = null;
  }
  if (!src) {
    try { video.pause(); } catch {}
    video.removeAttribute('src');
    video.classList.remove('is-active');
    document.body.classList.remove('has-video-wallpaper');
    return;
  }
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.setAttribute('playsinline', '');
  video.classList.remove('is-active');
  document.body.classList.remove('has-video-wallpaper');
  const showVideo = () => {
    if (token !== videoLoadToken || video.getAttribute('src') !== src) return;
    video.classList.add('is-active');
    document.body.classList.add('has-video-wallpaper');
  };
  const clearVideo = () => {
    if (token !== videoLoadToken) return;
    try { video.pause(); } catch {}
    video.classList.remove('is-active');
    document.body.classList.remove('has-video-wallpaper');
  };
  video.addEventListener('loadeddata', showVideo, { once: true });
  video.addEventListener('error', clearVideo, { once: true });
  video.src = src;
  try {
    const playing = video.play();
    if (playing?.catch) playing.catch(() => {});
  } catch {}
}

async function handleWallpaperVideoFile(file) {
  if (!file) return;
  const isVideo = /^video\//i.test(file.type || '') || /\.(mp4|webm|mov|m4v|ogv|ogg)$/i.test(file.name || '');
  if (!isVideo) {
    refs.wallpaperVideoInput.value = '';
    return;
  }
  if (Number(file.size) > VIDEO_MAX_BYTES) {
    refs.wallpaperVideoInput.value = '';
    return;
  }
  try {
    const saved = await putMediaBlob(file);
    if (saved) {
      updateSettings({ wallpaperVideoSource: 'local', wallpaperVideoUrl: null });
    } else {
      let dataUrl = await readFileAsDataURL(file);
      if (!/^data:video\//i.test(dataUrl)) {
        const mime = /^video\//i.test(file.type || '') ? file.type : 'video/mp4';
        dataUrl = dataUrl.replace(/^data:[^;,]+/, `data:${mime}`);
      }
      if (!/^data:video\//i.test(dataUrl)) throw new Error('invalid video');
      updateSettings({ wallpaperVideoSource: 'data', wallpaperVideoUrl: dataUrl });
    }
  } catch {
  } finally {
    refs.wallpaperVideoInput.value = '';
  }
}

async function applyWallpaperVideoUrl() {
  const value = String(refs.setWallpaperVideoUrl?.value || '').trim();
  if (!value) { await clearWallpaperVideo(); return; }
  const clean = safeMediaUrl(value);
  if (!clean) {
    return;
  }
  await deleteMediaBlob();
  updateSettings({ wallpaperVideoSource: 'url', wallpaperVideoUrl: clean });
}

async function clearWallpaperVideo(silent = false) {
  await deleteMediaBlob();
  updateSettings({ wallpaperVideoSource: null, wallpaperVideoUrl: null });
}

function effectiveDockSide() {
  return DOCK_SIDES.includes(state.settings.dockSide) ? state.settings.dockSide : 'bottom';
}
function syncDockVisibility() {
  if (!state.settings.dockAutoHide || state.displayEditor.open || drag.active || drag.pending) {
    document.body.classList.add('dock-visible');
    return;
  }
  document.body.classList.remove('dock-visible');
}
function onDockEdgeMove(event) {
  if (!state.settings.dockAutoHide) return;
  if (state.displayEditor.open || drag.active || drag.pending) {
    document.body.classList.add('dock-visible');
    return;
  }
  const side = document.documentElement.dataset.dockSide || 'bottom';
  const edge = 24;
  const x = Number(event.clientX) || 0;
  const y = Number(event.clientY) || 0;
  const near = side === 'top' ? y <= edge
    : side === 'bottom' ? y >= window.innerHeight - edge
      : side === 'left' ? x <= edge
        : x >= window.innerWidth - edge;
  const overDock = event.target instanceof Element && refs.dockWrap?.contains(event.target);
  document.body.classList.toggle('dock-visible', near || overDock);
}

function safeTitle(value, fallback) {
  const clean = String(value || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 80);
  return clean || fallback;
}

function allowedFavicon(value) {
  if (typeof value !== 'string' || !value) return '';
  return /^(https?:\/\/|data:image\/|blob:)/i.test(value) ? value : '';
}


function faviconForUrl(url) {
  if (!url) return '';
  const target = normalizeUrl(url);
  const host = hostOf(url);
  const exact = state.tabs.find((tab) => normalizeUrl(tab.url) === target && tab.favIconUrl);
  if (exact) return allowedFavicon(exact.favIconUrl);
  const sameHost = state.tabs.find((tab) => hostOf(tab.url) === host && tab.favIconUrl);
  return sameHost ? allowedFavicon(sameHost.favIconUrl) : '';
}

function withFavicon(item) {
  if (!item || !item.url) return item;
  return { ...item, favIconUrl: item.favIconUrl || faviconForUrl(item.url) };
}

function sanitizeSettings(raw = {}) {
  const wallpaper = typeof raw.wallpaper === 'string' && raw.wallpaper.startsWith('data:image/')
    ? raw.wallpaper
    : null;
  const customFont = typeof raw.customFont === 'string' && raw.customFont.startsWith('data:font/')
    ? raw.customFont
    : null;
  const language = ['en', 'de', 'ru'].includes(raw.language) ? raw.language : 'en';
  const font = Object.prototype.hasOwnProperty.call(FONT_STACKS, raw.font) ? raw.font : 'orbitron';
  const dockSide = DOCK_SIDES.includes(raw.dockSide) ? raw.dockSide : 'bottom';
  const legacyDockStyle = raw.dockStyle === 'panel' ? 'win11' : raw.dockStyle;
  const themeCandidate = LEGACY_THEME_MAP[raw.theme] || raw.theme;
  const wallpaperPackCount = Math.round(clamp(numberOr(raw.wallpaperPackCount, 0), 0, WALLPAPER_PACK_MAX_FILES));
  const gridSize = Math.round(clamp(numberOr(raw.gridSize, GRID_SIZE_DEFAULT), GRID_SIZE_MIN, GRID_SIZE_MAX) / 4) * 4;
  const iconSize = Math.round(clamp(numberOr(raw.iconSize, ICON_SIZE_DEFAULT), ICON_SIZE_MIN, ICON_SIZE_MAX) / 2) * 2;
  let wallpaperVideoSource = null;
  let wallpaperVideoUrl = null;
  if (['local', 'url', 'data'].includes(raw.wallpaperVideoSource)) {
    const value = typeof raw.wallpaperVideoUrl === 'string' ? raw.wallpaperVideoUrl : '';
    if (raw.wallpaperVideoSource === 'local') {
      wallpaperVideoSource = 'local';
    } else if (raw.wallpaperVideoSource === 'url') {
      const clean = safeMediaUrl(value);
      if (clean) { wallpaperVideoSource = 'url'; wallpaperVideoUrl = clean; }
    } else if (raw.wallpaperVideoSource === 'data' && /^data:video\//i.test(value)) {
      wallpaperVideoSource = 'data';
      wallpaperVideoUrl = value;
    }
  }
  return {
    animations: raw.animations !== false,
    magnify: raw.magnify === true,
    parallax: raw.parallax !== false,
    dim: Math.round(clamp(numberOr(raw.dim, 42), 0, 65)),
    darkenWallpaper: raw.darkenWallpaper === true,
    glass: Math.round(clamp(numberOr(raw.glass, 52), 35, 85)),
    recents: Math.round(clamp(numberOr(raw.recents, 8), 4, 12)),
    explorerView: raw.explorerView === 'list' ? 'list' : 'grid',
    wallpaper,
    language,
    languageMigrated: raw.languageMigrated === true,
    showSeconds: raw.showSeconds === true,
    font: customFont ? font : (font === 'custom' ? 'orbitron' : font),
    customFont,
    dockSide,
    clockX: clamp(numberOr(raw.clockX, 0.5), 0.03, 0.97),
    clockY: clamp(numberOr(raw.clockY, 0.035), 0.02, 0.9),
    clockScale: clamp(numberOr(raw.clockScale, 1), CLOCK_SCALE_MIN, CLOCK_SCALE_MAX),
    gridSize,
    gridEnabled: raw.gridEnabled !== false,
    iconSize,
    wallpaperVideoSource,
    wallpaperVideoUrl,
    clockColor: safeColor(raw.clockColor, CLOCK_COLOR_DEFAULT),
    dockColor: safeColor(raw.dockColor, DOCK_COLOR_DEFAULT),
    theme: THEME_IDS.includes(themeCandidate) ? themeCandidate : DEFAULT_THEME,
    windowGlass: Math.round(clamp(numberOr(raw.windowGlass, 62), 0, 100)),
    dockAutoHide: raw.dockAutoHide === true,
    dockStyle: DOCK_STYLES.includes(legacyDockStyle) ? legacyDockStyle : 'island',
    dockAlign: DOCK_ALIGNS.includes(raw.dockAlign) ? raw.dockAlign : 'center',
    dockAlpha: Math.round(clamp(numberOr(raw.dockAlpha, 62), 20, 95)),
    dockBlur: Math.round(clamp(numberOr(raw.dockBlur, 18), 0, 40)),
    dockRadius: Math.round(clamp(numberOr(raw.dockRadius, 22), 0, 34)),
    searchShortcut: sanitizeSearchShortcut(raw.searchShortcut),
    shortenLinks: raw.shortenLinks !== false,
    wallpaperPackCount,
    wallpaperPackIndex: Math.round(clamp(numberOr(raw.wallpaperPackIndex, 0), 0, Math.max(0, wallpaperPackCount - 1))),
    wallpaperPackTimer: Math.round(clamp(numberOr(raw.wallpaperPackTimer, 5), 1, 120)),
    wallpaperPackOnReload: raw.wallpaperPackOnReload !== false,
    wallpaperIndexByTheme: raw.wallpaperIndexByTheme && typeof raw.wallpaperIndexByTheme === 'object' ? raw.wallpaperIndexByTheme : {},
    wallpaperPackActive: raw.wallpaperPackActive === true && wallpaperPackCount > 0,
    widgetsEnabled: raw.widgetsEnabled !== false,
    settingsVersion: 12
  };
}

function normalizeShortcut(raw, scope) {
  if (!raw || typeof raw !== 'object') return null;
  const isFolder = raw.kind === 'folder' && raw.folderId;
  const url = safeUrl(raw.url);
  if (!isFolder && !url) return null;

  const item = {
    id: String(raw.id || uid(scope === 'desktop' ? 'desktop' : 'pin')),
    kind: isFolder ? 'folder' : 'bookmark',
    title: String(raw.title || '').trim().slice(0, 140) || (isFolder ? t('Ordner') : siteName(url))
  };

  if (isFolder) {
    item.folderId = String(raw.folderId);
  } else {
    item.url = url;
    if (raw.bookmarkId) item.bookmarkId = String(raw.bookmarkId);
  }

  if (scope === 'desktop') {
    item.col = Math.round(clamp(numberOr(raw.col, 0), 0, 40));
    item.row = Math.round(clamp(numberOr(raw.row, 0), 0, 40));
    const hasX = raw.x !== null && raw.x !== undefined && raw.x !== '' && Number.isFinite(Number(raw.x));
    const hasY = raw.y !== null && raw.y !== undefined && raw.y !== '' && Number.isFinite(Number(raw.y));
    item.x = hasX ? Math.round(clamp(Number(raw.x), 0, 4000)) : null;
    item.y = hasY ? Math.round(clamp(Number(raw.y), 0, 4000)) : null;
    const inferredFree = hasX && hasY && (Number(raw.x) !== 0 || Number(raw.y) !== 0);
    item.freePos = raw.freePos === true || (raw.freePos == null && inferredFree);
    item.exactPos = raw.exactPos === true && item.freePos === true;
  }
  return item;
}

function sanitizeShortcuts(list, scope) {
  if (!Array.isArray(list)) return null;
  const seen = new Set();
  const result = [];
  for (const raw of list) {
    const item = normalizeShortcut(raw, scope);
    if (!item) continue;
    const key = itemKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function applyPersisted(data, initial = false) {
  const hadData = !!(data && typeof data === 'object' && (
    data.settings || Array.isArray(data.desktop) || Array.isArray(data.pinned)
    || Array.isArray(data.widgets) || Array.isArray(data.spaces) || typeof data.activeSpaceId === 'string'
  ));

  state.settings = sanitizeSettings(data?.settings || {});
  if (numberOr(data?.settings?.settingsVersion, 0) < 6) state.settings.searchShortcut = DEFAULT_SEARCH_SHORTCUT;
  if (numberOr(data?.settings?.settingsVersion, 0) < 7) state.settings.shortenLinks = true;
  if (numberOr(data?.settings?.settingsVersion, 0) < 8) {
    state.settings.darkenWallpaper = false;
    state.settings.wallpaperPackIndex = 0;
  }
  if (numberOr(data?.settings?.settingsVersion, 0) < 9) state.settings.wallpaperIndexByTheme = {};
  if (numberOr(data?.settings?.settingsVersion, 0) < 11) state.settings.widgetsEnabled = true;
  
  if (!state.settings.languageMigrated) {
    state.settings.language = 'en';
    state.settings.languageMigrated = true;
  }
  state.desktop = sanitizeShortcuts(data?.desktop, 'desktop');
  state.pinned = sanitizeShortcuts(data?.pinned, 'pinned');
  if (Array.isArray(data?.widgets)) state.widgets = sanitizeWidgets(data.widgets);
  else if (initial || !Array.isArray(state.widgets)) state.widgets = [];
  if (numberOr(data?.settings?.settingsVersion, 0) < 11) {
    state.widgets = state.widgets.filter((widget) => !['widget-note-default', 'widget-timer-default'].includes(widget.id));
  }
  if (numberOr(data?.settings?.settingsVersion, 0) < 12) {
    state.widgets = (Array.isArray(state.widgets) ? state.widgets : [])
      .filter((widget) => WIDGET_TYPES.includes(widget.type));
  }

  if (state.desktop === null) state.desktop = IS_EXTENSION ? [] : clone(DEMO_DEFAULTS.desktop);
  if (state.pinned === null) state.pinned = IS_EXTENSION ? [] : clone(DEMO_DEFAULTS.pinned);

  state.explorer.view = state.settings.explorerView;

  const spacesState = sanitizeSpaces(data?.spaces, data?.activeSpaceId, {
    settings: clone(state.settings),
    desktop: clone(state.desktop),
    pinned: clone(state.pinned),
    widgets: clone(state.widgets)
  });
  state.spaces = spacesState.spaces;
  state.activeSpaceId = spacesState.activeSpaceId;
  captureActiveSpace();

  if (!initial) {
    applyTheme(state.settings);
    applyLayout();
    applyFont();
    ambient.update?.(state.settings);
    syncSettingsUI();
    applyWallpaperVideo();
    applyWallpaperPack({ animate: false });
    renderDesktop(false);
    renderDock();
    renderWidgets();
    renderSpacesPane();
    if (state.explorer.open) renderExplorer({ preserveSearch: true });
    if (state.spotlight.open) renderSpotlightResults();
  }
  return hadData;
}

function syncSettingsUI() {
  if (!refs.setAnimations) return;
  refs.setAnimations.checked = state.settings.animations;
  refs.setDarkenWallpaper.checked = state.settings.darkenWallpaper;
  refs.setMagnify.checked = state.settings.magnify;
  refs.setParallax.checked = state.settings.parallax;
  refs.setDim.value = String(state.settings.dim);
  refs.setGlass.value = String(state.settings.glass);
  refs.setRecents.value = String(state.settings.recents);
  refs.setDimValue.textContent = `${state.settings.dim} %`;
  refs.setGlassValue.textContent = `${state.settings.glass} %`;
  refs.setRecentsValue.textContent = `${state.settings.recents} Apps`;
  refs.setLanguage.value = state.settings.language;
  refs.setSeconds.checked = state.settings.showSeconds;
  refs.setFont.value = state.settings.font;
  refs.customFontButton.textContent = state.settings.customFont
    ? t('Eigene Schrift aktiv')
    : t('Datei auswählen');
  const percent = Math.round(state.settings.clockScale * 100);
  refs.setClockScale.value = String(percent);
  refs.setClockScaleValue.textContent = `${percent} %`;
  refs.setGridSize.value = String(state.settings.gridSize);
  refs.setGridSizeValue.textContent = `${state.settings.gridSize} px`;
  refs.setGridEnabled.checked = state.settings.gridEnabled;
  refs.setIconSize.value = String(state.settings.iconSize);
  refs.setIconSizeValue.textContent = `${state.settings.iconSize} px`;
  refs.setWallpaperVideoUrl.value = state.settings.wallpaperVideoSource === 'url'
    ? (state.settings.wallpaperVideoUrl || '')
    : '';
  refs.wallpaperVideoStatus.textContent = t(videoStatusText());
  refs.setClockColor.value = state.settings.clockColor;
  refs.setDockColor.value = state.settings.dockColor;
  refs.setTheme.value = state.settings.theme;
  refs.setWindowGlass.value = String(state.settings.windowGlass);
  refs.setWindowGlassValue.textContent = `${state.settings.windowGlass} %`;
  refs.setDockAutoHide.checked = state.settings.dockAutoHide;
  refs.setDockStyle.value = state.settings.dockStyle;
  refs.setDockSide.value = state.settings.dockSide;
  refs.setDockAlign.value = state.settings.dockAlign;
  refs.setDockAlpha.value = String(state.settings.dockAlpha);
  refs.setDockAlphaValue.textContent = `${state.settings.dockAlpha} %`;
  refs.setDockBlur.value = String(state.settings.dockBlur);
  refs.setDockBlurValue.textContent = `${state.settings.dockBlur} px`;
  refs.setDockRadius.value = String(state.settings.dockRadius);
  refs.setDockRadiusValue.textContent = `${state.settings.dockRadius} px`;
  $$('[data-theme]', refs.settingsEditorTab || refs.displayEditorBar).forEach((button) => {
    button.classList.toggle('is-active', button.dataset.theme === state.settings.theme);
  });
  refs.setShortenLinks.checked = state.settings.shortenLinks;
  refs.setWallpaperPackTimer.value = String(state.settings.wallpaperPackTimer);
  refs.setWallpaperPackTimerValue.textContent = t(`${state.settings.wallpaperPackTimer} Min`);
  refs.setWallpaperPackReload.checked = state.settings.wallpaperPackOnReload;
  refs.wallpaperPackStatus.textContent = wallpaperPackStatusText();
  syncWidgetsPane();
  renderSpacesPane();
  updateSearchShortcutUI();
}

function ensureCustomFontFace(dataUrl) {
  let style = document.getElementById('hushCustomFont');
  if (!style) {
    style = document.createElement('style');
    style.id = 'hushCustomFont';
    document.head.append(style);
  }
  const lower = dataUrl.slice(0, 120).toLowerCase();
  const format = lower.includes('woff2') ? 'woff2'
    : lower.includes('truetype') || lower.includes('.ttf') ? 'truetype'
      : 'opentype';
  style.textContent = `@font-face{font-family:'HushCustom';src:url("${dataUrl}") format('${format}');font-style:normal;font-weight:100 900;font-display:swap;}`;
}

function applyFont() {
  const stack = FONT_STACKS[state.settings.font] || FONT_STACKS.orbitron;
  document.documentElement.style.setProperty('--font-display', stack);
  document.documentElement.style.setProperty('--font-style', FONT_STYLES[state.settings.font] || 'normal');
  if (state.settings.font === 'custom' && state.settings.customFont) ensureCustomFontFace(state.settings.customFont);
  else document.getElementById('hushCustomFont')?.remove();
}

function applyLayout() {
  const root = document.documentElement;
  const side = effectiveDockSide();
  root.dataset.dockSide = side;
  root.dataset.dockAlign = state.settings.dockAlign;
  root.dataset.dockStyle = state.settings.dockStyle;
  root.dataset.gridEnabled = state.settings.gridEnabled ? 'true' : 'false';
  root.style.setProperty('--clock-x', String(state.settings.clockX));
  root.style.setProperty('--clock-y', String(state.settings.clockY));
  root.style.setProperty('--clock-scale', String(state.settings.clockScale));
  root.style.setProperty('--grid-size', `${state.settings.gridSize}px`);
  root.style.setProperty('--desktop-icon-size', `${state.settings.iconSize}px`);
  root.style.setProperty('--clock-color', state.settings.clockColor);
  const [r, g, b] = hexToRgb(state.settings.dockColor);
  root.style.setProperty('--dock-rgb', `${r}, ${g}, ${b}`);
  root.style.setProperty('--dock-alpha', (state.settings.dockAlpha / 100).toFixed(2));
  root.style.setProperty('--dock-blur', `${state.settings.dockBlur}px`);
  root.style.setProperty('--dock-radius', `${state.settings.dockRadius}px`);
  document.body.classList.toggle('dock-autohide', state.settings.dockAutoHide);
  syncDockVisibility();
  if (state.displayEditor?.open) {
    positionEditorHandles();
    positionEditorBar();
  }
}

function updateSettings(patch) {
  const next = { ...state.settings, ...patch };
  if ('theme' in patch) {
    const preset = THEME_PRESETS[patch.theme];
    if (preset) Object.assign(next, preset);
  }
  state.settings = sanitizeSettings(next);
  state.explorer.view = state.settings.explorerView;
  applyTheme(state.settings);
  applyLayout();
  applyFont();
  syncDockVisibility();
  ambient.update?.(state.settings);
  syncSettingsUI();
  persist();
  document.dispatchEvent(new CustomEvent('hush:settingschange'));
  if ('recents' in patch || 'magnify' in patch || 'language' in patch) renderDock();
  if ('explorerView' in patch && state.explorer.open) renderExplorer({ preserveSearch: true });
  if ('language' in patch && state.explorer.open) renderExplorer({ preserveSearch: true });
  if ('language' in patch && state.spotlight.open) renderSpotlightResults();
  if ('iconSize' in patch || 'gridSize' in patch || 'gridEnabled' in patch || 'clockX' in patch || 'clockY' in patch || 'clockScale' in patch) renderDesktop(false);
  if ('wallpaperVideoSource' in patch || 'wallpaperVideoUrl' in patch) applyWallpaperVideo();
  if (['theme', 'wallpaper', 'wallpaperPackActive', 'wallpaperPackCount', 'wallpaperPackIndex', 'wallpaperPackTimer', 'wallpaperPackOnReload'].some((key) => key in patch)) {
    applyWallpaperPack({ animate: 'theme' in patch || 'wallpaper' in patch || 'wallpaperPackActive' in patch });
  }
  if ('widgetsEnabled' in patch) renderWidgets();
  if (state.displayEditor.open) {
    updateEditorDockButtons();
    requestAnimationFrame(() => { positionEditorHandles(); positionEditorBar(); });
  }
}



function normalizeHistory(items = []) {
  const seen = new Set();
  const allowed = new Set(['http:', 'https:', 'file:']);
  const result = [];

  for (const entry of items) {
    if (!entry?.url) continue;
    const clean = safeUrl(entry.url);
    if (!clean) continue;
    let protocol = '';
    try { protocol = new URL(clean).protocol; } catch { continue; }
    if (!allowed.has(protocol)) continue;
    const url = clean;
    const key = hostOf(url) || normalizeUrl(url);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({
      id: `recent:${hashString(normalizeUrl(url))}`,
      kind: 'recent',
      title: siteName(url, entry.title),
      fullTitle: entry.title || siteName(url),
      url,
      host: hostOf(url),
      favIconUrl: faviconForUrl(url),
      lastVisitTime: entry.lastVisitTime || Date.now(),
      visitCount: entry.visitCount || 1
    });
  }
  return result.slice(0, 40);
}

function folderTitle(node) {
  if (!node) return t('Ordner');
  const label = FOLDER_LABELS[String(node.id)];
  if (label) return t(label);
  const lower = String(node.title || '').toLowerCase();
  if (lower === 'bookmarks bar') return t('Lesezeichenleiste');
  if (lower === 'other bookmarks') return t('Andere Lesezeichen');
  if (lower === 'mobile bookmarks') return t('Mobile Lesezeichen');
  return node.title || (String(node.id) === '0' ? t('Alle Lesezeichen') : t('Ordner'));
}

function nodeToItem(node) {
  if (!node) return null;
  const id = String(node.id);
  if (node.url) {
    const url = safeUrl(node.url);
    if (!url) return null;
    return {
      id: `bm:${id}`,
      kind: 'bookmark',
      title: node.title || siteName(url),
      url,
      bookmarkId: id,
      favIconUrl: faviconForUrl(url),
      dateAdded: node.dateAdded || 0,
      pathLabel: '',
      childCount: 0
    };
  }
  return {
    id: `folder:${id}`,
    kind: 'folder',
    title: folderTitle(node),
    folderId: id,
    dateAdded: node.dateAdded || 0,
    pathLabel: '',
    childCount: (node.children || []).length
  };
}

function buildBookmarkIndex() {
  state.bookmarkMap.clear();
  state.bookmarkList = [];
  state.folderList = [];
  const roots = Array.isArray(state.bookmarksTree) ? state.bookmarksTree : [];
  state.rootId = roots[0]?.id ? String(roots[0].id) : '0';

  const walk = (node, parentId, pathIds) => {
    const id = String(node.id);
    state.bookmarkMap.set(id, { node, parentId, pathIds: [...pathIds] });

    const pathLabel = pathIds
      .map((pathId) => folderTitle(state.bookmarkMap.get(pathId)?.node || { id: pathId }))
      .filter((label) => label && label !== 'Alle Lesezeichen')
      .join(' › ');

    const item = nodeToItem(node);
    if (item) {
      item.pathLabel = pathLabel;
      if (item.kind === 'folder') state.folderList.push(item);
      else state.bookmarkList.push(item);
    }

    (node.children || []).forEach((child) => {
      walk(child, id, [...pathIds, id]);
    });
  };

  roots.forEach((root) => walk(root, null, []));
}

function allChildren(id) {
  return state.bookmarkMap.get(String(id))?.node?.children || [];
}

function folderChildren(id) {
  return allChildren(id).filter((node) => !node.url);
}

function folderPath(id) {
  const chain = [];
  let entry = state.bookmarkMap.get(String(id));
  let guard = 0;
  while (entry && guard < 30) {
    guard += 1;
    chain.unshift(entry.node);
    if (entry.parentId == null) break;
    entry = state.bookmarkMap.get(String(entry.parentId));
  }
  return chain.length ? chain : [{ id: state.rootId, title: '' }];
}

function findFolderIdByTitle(pattern) {
  for (const { node } of state.bookmarkMap.values()) {
    if (!node.url && pattern.test(node.title || '')) return String(node.id);
  }
  return '';
}

function expandAncestors(id) {
  let entry = state.bookmarkMap.get(String(id));
  let guard = 0;
  while (entry?.parentId != null && guard < 30) {
    guard += 1;
    state.explorer.expanded.add(String(entry.parentId));
    entry = state.bookmarkMap.get(String(entry.parentId));
  }
  state.explorer.expanded.add(String(state.rootId));
}

async function refreshData() {
  const [treeResult, historyResult, tabsResult] = await Promise.allSettled([
    api.bookmarksTree(),
    api.recentSites(40),
    api.tabs()
  ]);
  const tree = treeResult.status === 'fulfilled' ? treeResult.value : [];
  const historyItems = historyResult.status === 'fulfilled' ? historyResult.value : [];
  const tabs = tabsResult.status === 'fulfilled' ? tabsResult.value : [];

  state.bookmarksTree = Array.isArray(tree) ? tree : [];
  state.tabs = (Array.isArray(tabs) ? tabs : []).filter((tab) => {
    if (!tab?.url) return false;
    const clean = safeUrl(tab.url);
    if (!clean) return false;
    try { return ['http:', 'https:', 'file:'].includes(new URL(clean).protocol); } catch { return false; }
  });
  buildBookmarkIndex();
  state.recents = normalizeHistory(Array.isArray(historyItems) ? historyItems : []);

  if (!state.explorer.stack.length) {
    state.explorer.stack = [{ type: 'folder', id: state.rootId }];
    state.explorer.index = 0;
  }
  expandAncestors(state.rootId);

  renderDock();
  if (state.explorer.open) renderExplorer({ preserveSearch: true });
  if (state.spotlight.open) renderSpotlightResults();
}

const scheduleRefresh = debounce(() => {
  if (drag.active || drag.pending) {
    state.pendingRefresh = true;
    return;
  }
  refreshData().catch((error) => console.warn('Hush: Aktualisierung fehlgeschlagen.', error));
}, 500);



function gridMetrics() {
  const rect = refs.desktopSurface.getBoundingClientRect();
  const requested = clamp(numberOr(state.settings.gridSize, GRID_SIZE_DEFAULT), GRID_SIZE_MIN, GRID_SIZE_MAX);
  const cellW = Math.max(requested, iconBoxWidth() + 8);
  const cellH = Math.max(Math.round(cellW * 1.02), iconBoxHeight() + 8);
  const cols = Math.max(1, Math.floor((rect.width - GRID_MARGIN_X * 2) / cellW));
  const rows = Math.max(1, Math.floor((rect.height - GRID_MARGIN_Y - GRID_BOTTOM) / cellH));
  return { cols, rows, cellW, cellH, width: rect.width, height: rect.height };
}

function slotToPx(col, row, metrics = gridMetrics()) {
  return {
    left: GRID_MARGIN_X + col * metrics.cellW,
    top: GRID_MARGIN_Y + row * metrics.cellH
  };
}

function desktopPosition(item, metrics = gridMetrics()) {
  const gridPos = slotToPx(item.col, item.row, metrics);
  const exactDrop = item.exactPos === true && item.freePos === true;
  if (!exactDrop && (state.settings.gridEnabled || !item.freePos)) return gridPos;
  return {
    left: Math.round(clamp(numberOr(item.x, gridPos.left), 0, Math.max(0, metrics.width - iconBoxWidth()))),
    top: Math.round(clamp(numberOr(item.y, gridPos.top), 0, Math.max(0, metrics.height - iconBoxHeight())))
  };
}

function desktopDropPosition(clientX, clientY) {
  const rect = refs.desktopSurface.getBoundingClientRect();
  const metrics = gridMetrics();
  const maxX = Math.max(0, metrics.width - iconBoxWidth());
  const maxY = Math.max(0, metrics.height - iconBoxHeight());
  const halfWidth = iconBoxWidth() / 2;
  const halfHeight = Math.max(24, state.settings.iconSize / 2);
  return {
    x: Math.round(clamp(numberOr(clientX, 0) - numberOr(rect.left, 0) - halfWidth, 0, maxX)),
    y: Math.round(clamp(numberOr(clientY, 0) - numberOr(rect.top, 0) - halfHeight, 0, maxY))
  };
}

function applyExactDesktopPosition(item, position, metrics = gridMetrics()) {
  const maxX = Math.max(0, metrics.width - iconBoxWidth());
  const maxY = Math.max(0, metrics.height - iconBoxHeight());
  item.x = Math.round(clamp(numberOr(position?.x, 0), 0, maxX));
  item.y = Math.round(clamp(numberOr(position?.y, 0), 0, maxY));
  item.col = Math.round(clamp((item.x - GRID_MARGIN_X) / metrics.cellW, 0, metrics.cols - 1));
  item.row = Math.round(clamp((item.y - GRID_MARGIN_Y) / metrics.cellH, 0, metrics.rows - 1));
  item.freePos = true;
  item.exactPos = true;
}

function indexToSlot(index, metrics = gridMetrics()) {
  return {
    col: index % metrics.cols,
    row: Math.floor(index / metrics.cols)
  };
}

function nextFreeSlot() {
  const metrics = gridMetrics();
  const occupied = new Set(state.desktop.map((item) => `${item.col},${item.row}`));
  for (let row = 0; row < metrics.rows; row += 1) {
    for (let col = 0; col < metrics.cols; col += 1) {
      if (!occupied.has(`${col},${row}`)) return { col, row };
    }
  }
  return { col: metrics.cols - 1, row: metrics.rows - 1 };
}

function clampDesktopSlots() {
  const metrics = gridMetrics();
  state.desktop.forEach((item) => {
    item.col = Math.round(clamp(numberOr(item.col, 0), 0, metrics.cols - 1));
    item.row = Math.round(clamp(numberOr(item.row, 0), 0, metrics.rows - 1));
    const pos = slotToPx(item.col, item.row, metrics);
    const exactDrop = item.exactPos === true && item.freePos === true;
    if (exactDrop) {
      item.x = Math.round(clamp(numberOr(item.x, pos.left), 0, Math.max(0, metrics.width - iconBoxWidth())));
      item.y = Math.round(clamp(numberOr(item.y, pos.top), 0, Math.max(0, metrics.height - iconBoxHeight())));
    } else if (state.settings.gridEnabled || !item.freePos) {
      item.freePos = false;
      item.exactPos = false;
      item.x = pos.left;
      item.y = pos.top;
    } else {
      item.exactPos = false;
      item.x = Math.round(clamp(numberOr(item.x, pos.left), 0, Math.max(0, metrics.width - iconBoxWidth())));
      item.y = Math.round(clamp(numberOr(item.y, pos.top), 0, Math.max(0, metrics.height - iconBoxHeight())));
    }
  });
}

function isPinned(item) {
  return !!item && state.pinned.some((pinned) => sameItem(pinned, item));
}

function isOnDesktop(item) {
  return !!item && state.desktop.some((desktop) => sameItem(desktop, item));
}

function makeShortcut(item, scope, slot = null, position = null) {
  const base = item.kind === 'folder'
    ? { kind: 'folder', title: item.title || t('Ordner'), folderId: String(item.folderId) }
    : {
        kind: 'bookmark',
        title: item.title || siteName(item.url),
        url: storedItemUrl(item.url),
        ...(item.bookmarkId ? { bookmarkId: String(item.bookmarkId) } : {})
      };

  const prefix = scope === 'desktop' ? 'desktop' : 'pin';
  const shortcut = {
    ...base,
    id: `${prefix}:${hashString(itemKey(base))}`
  };
  if (scope === 'desktop') {
    const metrics = gridMetrics();
    if (position) {
      Object.assign(shortcut, { col: 0, row: 0, x: 0, y: 0, freePos: true, exactPos: true });
      applyExactDesktopPosition(shortcut, position, metrics);
    } else if (slot) {
      const pos = slotToPx(slot.col, slot.row, metrics);
      shortcut.col = slot.col;
      shortcut.row = slot.row;
      shortcut.x = pos.left;
      shortcut.y = pos.top;
      shortcut.freePos = false;
      shortcut.exactPos = false;
    } else {
      Object.assign(shortcut, { col: 0, row: 0, x: null, y: null, freePos: false, exactPos: false });
    }
  }
  return shortcut;
}

function renderDesktop(animate = true) {
  if (!refs.desktopIcons) return;
  clampDesktopSlots();
  const metrics = gridMetrics();
  refs.desktopIcons.innerHTML = '';

  state.desktop.forEach((item, index) => {
    const node = el('div', 'desktop-icon');
    node.dataset.source = 'desktop';
    node.dataset.id = item.id;
    node.tabIndex = 0;
    node.setAttribute('role', 'button');
    node.setAttribute('aria-label', `${item.title} öffnen`);
    node.title = item.title || '';
    const pos = desktopPosition(item, metrics);
    node.style.left = `${pos.left}px`;
    node.style.top = `${pos.top}px`;
    if (animate) node.style.animationDelay = `${Math.min(index * 35, 260)}ms`;
    else node.style.animation = 'none';
    if (isSelected('desktop', item.id)) node.classList.add('is-selected');

    const iconWrap = el('div', 'desktop-icon__icon');
    iconWrap.append(itemIcon(withFavicon(item), state.settings.iconSize));
    node.append(iconWrap);
    node.append(el('div', 'desktop-icon__label', item.title));
    refs.desktopIcons.append(node);
  });
}

function addToDesktop(item, options = {}) {
  if (!item || (!item.url && item.kind !== 'folder')) return false;
  const position = options.position || null;
  if (position) {
    const existing = state.desktop.find((entry) => sameItem(entry, item));
    if (existing) {
      applyExactDesktopPosition(existing, position);
      persistNow();
      renderDesktop(false);
      setTimeout(() => {
        const node = $$('.desktop-icon', refs.desktopIcons).find((n) => n.dataset.id === existing.id);
        bounce(node);
      }, 40);
      return true;
    }
  }
  if (isOnDesktop(item)) {
    return false;
  }
  const shortcut = makeShortcut(item, 'desktop', position ? null : nextFreeSlot(), position);
  state.desktop.push(shortcut);
  if (position) persistNow();
  else persist();
  renderDesktop(true);
  setTimeout(() => {
    const node = $$('.desktop-icon', refs.desktopIcons).find((n) => n.dataset.id === shortcut.id);
    bounce(node);
  }, 40);
  return true;
}

function removeFromDesktop(id, options = {}) {
  const index = state.desktop.findIndex((item) => item.id === id);
  if (index < 0) return;
  const removed = state.desktop.splice(index, 1)[0];
  persistNow();
  renderDesktop(false);
}

function pinToDock(item, options = {}) {
  if (!item || (!item.url && item.kind !== 'folder')) return false;
  if (isPinned(item)) {
    return false;
  }
  const pin = makeShortcut(item, 'pinned');
  state.pinned.push(pin);
  persist();
  renderDock();
  renderDesktop(false);
  setTimeout(() => {
    const node = $$('.dock-item', refs.dock).find((n) => n.dataset.id === pin.id);
    bounce(node);
  }, 40);
  return true;
}

function unpin(id, options = {}) {
  const index = state.pinned.findIndex((item) => item.id === id);
  if (index < 0) return;
  const removed = state.pinned.splice(index, 1)[0];
  persistNow();
  renderDock();
  renderDesktop(false);
}

function removeShortcutEverywhere(item) {
  const removedDesktop = state.desktop.filter((shortcut) => sameItem(shortcut, item));
  const removedPinned = state.pinned.filter((pin) => sameItem(pin, item));
  if (!removedDesktop.length && !removedPinned.length) {
    return;
  }
  const desktopKeys = new Set(removedDesktop.map((entry) => entry.id));
  const pinnedKeys = new Set(removedPinned.map((entry) => entry.id));
  state.desktop = state.desktop.filter((entry) => !desktopKeys.has(entry.id));
  state.pinned = state.pinned.filter((entry) => !pinnedKeys.has(entry.id));
  persistNow();
  renderDesktop(false);
  renderDock();
}

function arrangeIcons() {
  const metrics = gridMetrics();
  state.desktop.forEach((item, index) => {
    const slot = indexToSlot(index, metrics);
    const pos = slotToPx(slot.col, slot.row, metrics);
    item.col = slot.col;
    item.row = slot.row;
    item.x = pos.left;
    item.y = pos.top;
    item.freePos = false;
    item.exactPos = false;
  });
  persist();
  renderDesktop(true);
}

function clearDesktop() {
  if (!state.desktop.length) {
    return;
  }
  const previous = [...state.desktop];
  state.desktop = [];
  persistNow();
  renderDesktop(false);
}

function moveDesktopIconBy(id, dx, dy) {
  const item = state.desktop.find((entry) => entry.id === id);
  if (!item) return;
  const metrics = gridMetrics();
  const base = desktopPosition(item, metrics);
  let left = 0;
  let top = 0;
  const useFree = !state.settings.gridEnabled || (item.exactPos === true && item.freePos === true);
  if (!useFree) {
    const col = clamp(item.col + dx, 0, metrics.cols - 1);
    const row = clamp(item.row + dy, 0, metrics.rows - 1);
    if (col === item.col && row === item.row) return;
    item.col = col;
    item.row = row;
    item.freePos = false;
    item.exactPos = false;
    const pos = slotToPx(col, row, metrics);
    left = pos.left;
    top = pos.top;
    item.x = pos.left;
    item.y = pos.top;
  } else {
    const step = Math.round(metrics.cellW * 0.25);
    left = Math.round(clamp(base.left + dx * step, 0, Math.max(0, metrics.width - iconBoxWidth())));
    top = Math.round(clamp(base.top + dy * step, 0, Math.max(0, metrics.height - iconBoxHeight())));
    if (left === base.left && top === base.top) return;
    item.x = left;
    item.y = top;
    item.freePos = true;
    item.exactPos = true;
  }
  const node = $$('.desktop-icon', refs.desktopIcons).find((n) => n.dataset.id === id);
  if (node) {
    node.style.transition = 'left .38s var(--spring), top .38s var(--spring), background .25s';
    node.style.left = `${left}px`;
    node.style.top = `${top}px`;
    setTimeout(() => { node.style.transition = ''; }, 420);
  }
  persist();
}



function isRunning(item) {
  if (!item?.url) return false;
  let targetHost = '';
  try { targetHost = new URL(item.url).hostname.replace(/^www\./, ''); } catch { return false; }
  if (!targetHost) return false;
  return state.tabs.some((tab) => {
    try { return new URL(tab.url).hostname.replace(/^www\./, '') === targetHost; } catch { return false; }
  });
}

function findTabForUrl(url) {
  let target;
  try { target = new URL(normalizeUrl(url)); } catch { return null; }
  const candidates = [];
  for (const tab of state.tabs) {
    try {
      const parsed = new URL(tab.url);
      candidates.push({ tab, parsed });
    } catch {  }
  }
  const exact = candidates.find(({ parsed }) => normalizeUrl(parsed.href) === normalizeUrl(target.href));
  if (exact) return exact.tab;
  const sameHost = candidates
    .filter(({ parsed }) => parsed.hostname.replace(/^www\./, '') === target.hostname.replace(/^www\./, ''))
    .sort((a, b) => (b.tab.lastAccessed || 0) - (a.tab.lastAccessed || 0));
  return sameHost[0]?.tab || null;
}

function dockItemLabel(item) {
  if (item.app === 'finder') return 'Ablage · Lesezeichen';
  if (item.app === 'settings') return 'Darstellung · Einstellungen';
  if (item.app === 'widgets') return 'Widgets · Desktop';
  if (item.app === 'spaces') return `${t('Hush Spaces')} · ${activeSpace()?.name || ''}`;
  if (item.url) return `${item.title} · ${hostOf(item.url) || t('Lesezeichen')}`;
  return `${item.title} · ${t('Ordner')}`;
}

function appendDockItem(item, source, pinned, draggable, size) {
  const button = el('button', 'dock-item');
  button.type = 'button';
  button.dataset.source = source;
  button.dataset.id = item.id;
  button.dataset.pinned = pinned ? 'true' : 'false';
  button.dataset.draggable = draggable ? 'true' : 'false';
  button.dataset.tooltip = dockItemLabel(item);
  button.setAttribute('aria-label', dockItemLabel(item));
  if (item.app === 'settings') button.dataset.opensSettings = 'true';
  if (pinned) button.classList.add('is-pinned');
  if (isRunning(item)) button.classList.add('is-running');

  const iconWrap = el('span', 'dock-item__icon');
  iconWrap.append(itemIcon(withFavicon(item), size));
  button.append(iconWrap);
  button.append(el('span', 'dock-item__dot'));
  refs.dock.append(button);
  return button;
}

function dockSeparator() {
  refs.dock.append(el('div', 'dock-separator'));
}

function renderDock() {
  if (!refs.dock) return;
  hideDockTooltip();
  refs.dock.innerHTML = '';

  const recents = state.recents.slice(0, state.settings.recents);
  const total = 3 + state.pinned.length + recents.length;
  const size = total > 15 ? 34 : total > 12 ? 38 : total > 9 ? 42 : 46;
  refs.dock.style.setProperty('--dock-icon', `${size}px`);

  appendDockItem(BUILTIN_ITEMS['app:finder'], 'dock-app', false, false, size);
  if (state.pinned.length || recents.length) dockSeparator();

  state.pinned.forEach((item) => appendDockItem(item, 'dock-pinned', true, true, size));
  if (state.pinned.length && recents.length) dockSeparator();

  recents.forEach((item) => appendDockItem(item, 'dock-recent', false, true, size));
  dockSeparator();
  appendDockItem(BUILTIN_ITEMS['app:settings'], 'dock-app', false, false, size);
  appendDockItem(BUILTIN_ITEMS['app:widgets'], 'dock-app', false, false, size);
}

function lookupDockItem(button) {
  const source = button.dataset.source;
  const id = button.dataset.id;
  if (source === 'dock-app') return BUILTIN_ITEMS[id] || null;
  if (source === 'dock-pinned') return state.pinned.find((item) => item.id === id) || null;
  if (source === 'dock-recent') return state.recents.find((item) => item.id === id) || null;
  return null;
}

function lookupItem(source, id) {
  if (source === 'desktop') return state.desktop.find((item) => item.id === id) || null;
  if (source === 'dock-pinned') return state.pinned.find((item) => item.id === id) || null;
  if (source === 'dock-recent') return state.recents.find((item) => item.id === id) || null;
  if (source === 'dock-app') return BUILTIN_ITEMS[id] || null;
  if (source === 'finder') return state.explorer.items.find((item) => item.id === id) || null;
  return null;
}

let dockRaf = 0;
let dockPointerX = 0;

function updateDockMagnification(x) {
  if (!state.settings.magnify) return;
  const baseSize = parseFloat(getComputedStyle(refs.dock).getPropertyValue('--dock-icon')) || 46;
  $$('.dock-item', refs.dock).forEach((button) => {
    const rect = button.getBoundingClientRect();
    const center = rect.left + rect.width / 2;
    const distance = Math.abs(x - center);
    
    const influence = Math.exp(-Math.pow(distance / 92, 2));
    const scale = 1 + influence * 0.16;
    const lift = -6 * influence;
    const extra = (scale - 1) * baseSize / 2;
    button.style.setProperty('--dock-scale', scale.toFixed(3));
    button.style.setProperty('--dock-lift', `${lift.toFixed(1)}px`);
    button.style.setProperty('--dock-extra', `${extra.toFixed(1)}px`);
    button.style.zIndex = String(Math.round(10 + influence * 12));
  });
}

function resetDockMagnification() {
  $$('.dock-item', refs.dock).forEach((button) => {
    button.style.setProperty('--dock-scale', '1');
    button.style.setProperty('--dock-lift', '0px');
    button.style.setProperty('--dock-extra', '0px');
    button.style.zIndex = '';
  });
}



function beginLaunchOverlay() {
  const overlay = refs.launchOverlay;
  const token = ++launchSequence;
  clearTimeout(launchCloseTimer);
  if (!overlay) return null;
  overlay.classList.remove('is-closing');
  overlay.classList.add('is-open');
  overlay.setAttribute('aria-hidden', 'false');
  let done = false;
  let fallback = 0;
  const finish = () => {
    if (done || token !== launchSequence) return;
    done = true;
    clearTimeout(fallback);
    overlay.classList.add('is-closing');
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    clearTimeout(launchCloseTimer);
    launchCloseTimer = setTimeout(() => {
      if (token === launchSequence) overlay.classList.remove('is-closing');
    }, 430);
  };
  fallback = setTimeout(finish, 3200);
  return { finish };
}

function scheduleLaunchFinish(launch, result, url) {
  if (!launch) return;
  const minimum = new Promise((resolve) => setTimeout(resolve, 420));
  const loaded = api.waitForTabComplete
    ? api.waitForTabComplete(result?.tabId, url, 1800).catch(() => false)
    : Promise.resolve(false);
  const cap = new Promise((resolve) => setTimeout(resolve, 2200));
  Promise.race([Promise.all([minimum, loaded]), cap])
    .then(() => launch.finish())
    .catch(() => launch.finish());
}

async function openItem(item, options = {}) {
  if (!item) return;
  if (item.app === 'finder') { openExplorer(); return; }
  if (item.app === 'settings') { toggleSettings(true); return; }
  if (item.app === 'widgets') { openWidgetsSettings(); return; }
  if (item.app === 'spaces') { openSpacesSettings(); return; }
  if (item.kind === 'folder') {
    openExplorer({ type: 'folder', id: item.folderId });
    return;
  }
  const url = safeUrl(item.url);
  if (!url) {
    return;
  }
  if (options.hushWindow) {
    openHushAppWindow({ ...item, url });
    return;
  }

  const showLaunch = !options.background && !(options.newTab && options.active === false);
  const launch = showLaunch ? beginLaunchOverlay() : null;

  if (!options.newTab && !options.background) {
    const tab = findTabForUrl(url);
    if (tab) {
      const activated = await api.activateTab(tab.id, tab.windowId);
      if (activated) {
        scheduleLaunchFinish(launch, { tabId: tab.id }, url);
        return;
      }
    }
  }

  try {
    const result = await api.open(url, options);
    scheduleLaunchFinish(launch, result, url);
  } catch (error) {
    launch?.finish();
  }
}

function openFileItem(item, hushWindow = false) {
  if (!item) return;
  if (item.kind === 'folder') navigateExplorer({ type: 'folder', id: item.folderId });
  else openItem(item, { hushWindow });
}



function targetKey(target) {
  if (!target) return '';
  return target.type === 'folder' ? `folder:${target.id}` : `special:${target.key}`;
}

function currentTarget() {
  return state.explorer.stack[state.explorer.index] || { type: 'folder', id: state.rootId };
}

function targetTitle(target, query = '') {
  if (query) return `Suche nach „${query}“`;
  if (target.type === 'folder') {
    return folderTitle(state.bookmarkMap.get(String(target.id))?.node || { id: target.id });
  }
  const labels = {
    recent: t('Zuletzt besucht'),
    desktop: t('Desktop'),
    dock: t('Dock'),
    all: t('Alle Lesezeichen')
  };
  return labels[target.key] || t('Ablage');
}

function navigateExplorer(target, options = {}) {
  if (!state.explorer.open) {
    openExplorer(target);
    return;
  }
  if (state.explorer.minimized) restoreExplorer();
  if (options.push !== false) {
    state.explorer.stack = state.explorer.stack.slice(0, state.explorer.index + 1);
    state.explorer.stack.push(target);
    state.explorer.index = state.explorer.stack.length - 1;
  } else {
    state.explorer.stack[state.explorer.index] = target;
  }
  state.explorer.query = '';
  if (target.type === 'folder') expandAncestors(target.id);
  renderExplorer();
}

function goBack() {
  if (state.explorer.index <= 0) return;
  state.explorer.index -= 1;
  state.explorer.query = '';
  renderExplorer();
}

function goForward() {
  if (state.explorer.index >= state.explorer.stack.length - 1) return;
  state.explorer.index += 1;
  state.explorer.query = '';
  renderExplorer();
}

function getItemsForTarget(target) {
  if (target.type === 'folder' || target.key === 'all') {
    const id = target.type === 'folder' ? target.id : state.rootId;
    const items = allChildren(id).map(nodeToItem).filter(Boolean);
    return [
      ...items.filter((item) => item.kind === 'folder'),
      ...items.filter((item) => item.kind !== 'folder')
    ];
  }
  if (target.key === 'recent') return state.recents.map((item) => ({ ...item, sourceLabel: t('Zuletzt besucht') }));
  if (target.key === 'desktop') return state.desktop.map((item) => ({ ...item, sourceLabel: t('Desktop') }));
  if (target.key === 'dock') return state.pinned.map((item) => ({ ...item, sourceLabel: t('Dock') }));
  return [];
}

function matchScore(text, query) {
  const value = String(text || '').toLocaleLowerCase('de-DE');
  const q = query.toLocaleLowerCase('de-DE').trim();
  if (!q) return 0;
  if (value === q) return 100;
  if (value.startsWith(q)) return 82;
  if (value.includes(q)) return 62;
  const words = q.split(/\s+/).filter(Boolean);
  if (words.length > 1 && words.every((word) => value.includes(word))) return 44;
  return 0;
}

function searchBookmarks(query) {
  const q = query.trim();
  if (!q) return [];
  const scored = [];
  const candidates = [...state.folderList, ...state.bookmarkList]
    .filter((item) => item.folderId !== state.rootId || item.kind !== 'folder');
  for (const item of candidates) {
    const score = Math.max(
      matchScore(item.title, q),
      matchScore(item.url || '', q),
      matchScore(item.pathLabel, q),
      matchScore(hostOf(item.url || ''), q)
    );
    if (score > 0) scored.push({ item, score });
  }
  return scored
    .sort((a, b) => b.score - a.score || String(a.item.title).localeCompare(String(b.item.title), 'de'))
    .slice(0, 140)
    .map(({ item }) => ({ ...item }));
}

function childCount(item) {
  if (item?.kind !== 'folder') return 0;
  return state.bookmarkMap.get(String(item.folderId))?.node?.children?.length ?? item.childCount ?? 0;
}

function itemMeta(item) {
  if (item.kind === 'folder') {
    const count = childCount(item);
    return item.pathLabel ? `${plural(count, 'Objekt', 'Objekte')} · ${item.pathLabel}` : plural(count, 'Objekt', 'Objekte');
  }
  if (item.kind === 'recent') return `${item.host || hostOf(item.url)} · ${formatRelative(item.lastVisitTime)}`;
  if (state.explorer.query && item.pathLabel) return item.pathLabel;
  return hostOf(item.url) || item.sourceLabel || t('Lesezeichen');
}

function itemTypeLabel(item) {
  if (item.kind === 'folder') return 'Ordner';
  if (item.kind === 'recent') return 'Website';
  if (item.kind === 'app') return 'App';
  return item.sourceLabel || t('Lesezeichen');
}

function itemDateLabel(item) {
  if (item.kind === 'recent') return formatRelative(item.lastVisitTime);
  return formatDate(item.dateAdded);
}

function makeSidebarItem(config) {
  const node = el('div', `sidebar-item${config.active ? ' is-active' : ''}${config.expanded ? ' is-expanded' : ''}`);
  node.setAttribute('role', 'button');
  node.tabIndex = 0;
  node.style.setProperty('--depth', config.depth || 0);
  node.dataset.action = config.action;
  if (config.folderId) node.dataset.folderId = config.folderId;
  if (config.special) node.dataset.special = config.special;

  const twisty = el('span', 'sidebar-item__twisty');
  if (config.toggleId) {
    twisty.dataset.toggle = config.toggleId;
    twisty.append(iconEl('chevron', 'glyph'));
  }
  node.append(twisty);

  const glyph = el('span', 'sidebar-item__glyph');
  glyph.append(iconEl(config.icon || 'folder', 'glyph'));
  node.append(glyph);
  node.append(el('span', 'sidebar-item__label', config.label));
  if (config.count) node.append(el('span', 'sidebar-item__count', config.count));
  return node;
}

function renderSidebar(target) {
  const e = state.explorer.dom;
  if (!e?.sidebar) return;
  e.sidebar.innerHTML = '';
  const activeKey = targetKey(target);

  const favorites = el('section', 'sidebar-section');
  favorites.append(el('div', 'sidebar-section__title', 'Favoriten'));

  const barId = state.bookmarkMap.has('1') ? '1' : findFolderIdByTitle(/bookmarks bar|lesezeichenleiste/i);
  const otherId = state.bookmarkMap.has('2') ? '2' : findFolderIdByTitle(/other bookmarks|andere lesezeichen/i);
  const mobileId = state.bookmarkMap.has('3') ? '3' : findFolderIdByTitle(/mobile bookmarks|mobile lesezeichen|synced/i);

  const favoriteDefs = [
    { label: 'Alle Lesezeichen', icon: 'bookmarks', action: 'folder', folderId: state.rootId },
    ...(barId ? [{ label: 'Lesezeichenleiste', icon: 'bookmarks', action: 'folder', folderId: barId }] : []),
    ...(otherId ? [{ label: 'Andere Lesezeichen', icon: 'bookmarks', action: 'folder', folderId: otherId }] : []),
    ...(mobileId ? [{ label: 'Mobile Lesezeichen', icon: 'bookmarks', action: 'folder', folderId: mobileId }] : []),
    { label: 'Zuletzt besucht', icon: 'history', action: 'special', special: 'recent' },
    { label: 'Desktop', icon: 'desktop', action: 'special', special: 'desktop' },
    { label: 'Dock', icon: 'dock', action: 'special', special: 'dock' }
  ];

  favoriteDefs.forEach((def) => {
    const candidate = def.action === 'folder'
      ? { type: 'folder', id: def.folderId }
      : { type: 'special', key: def.special };
    favorites.append(makeSidebarItem({
      ...def,
      active: targetKey(candidate) === activeKey
    }));
  });
  e.sidebar.append(favorites);

  const tree = el('section', 'sidebar-section');
  tree.append(el('div', 'sidebar-section__title', 'Orte'));
  const fragment = document.createDocumentFragment();

  const appendRows = (parentId, depth) => {
    if (depth > 5) return;
    folderChildren(parentId).forEach((node) => {
      const id = String(node.id);
      const hasChildren = folderChildren(id).length > 0;
      const expanded = state.explorer.expanded.has(id);
      fragment.append(makeSidebarItem({
        label: folderTitle(node),
        icon: 'folder',
        action: 'folder',
        folderId: id,
        depth,
        active: targetKey({ type: 'folder', id }) === activeKey,
        toggleId: hasChildren ? id : '',
        expanded,
        count: String((node.children || []).length)
      }));
      if (expanded) appendRows(id, depth + 1);
    });
  };
  appendRows(state.rootId, 0);
  tree.append(fragment);
  e.sidebar.append(tree);
}

function renderBreadcrumb(target, query) {
  const e = state.explorer.dom;
  if (!e?.breadcrumb) return;
  e.breadcrumb.innerHTML = '';

  if (query || target.type === 'special') {
    e.breadcrumb.append(el('span', 'breadcrumb__current', targetTitle(target, query)));
    return;
  }

  const chain = folderPath(target.id);
  chain.forEach((node, index) => {
    if (index > 0) {
      const chevron = el('span', 'breadcrumb__chevron');
      chevron.append(iconEl('chevron', 'glyph'));
      e.breadcrumb.append(chevron);
    }
    if (index === chain.length - 1) {
      e.breadcrumb.append(el('span', 'breadcrumb__current', folderTitle(node)));
    } else {
      const button = el('button', '', folderTitle(node));
      button.type = 'button';
      button.dataset.folderId = String(node.id);
      e.breadcrumb.append(button);
    }
  });
}

function renderFileBrowser(items, target, query) {
  const e = state.explorer.dom;
  if (!e?.fileBrowser) return;
  const browser = e.fileBrowser;
  browser.innerHTML = '';
  browser.classList.toggle('is-grid', state.explorer.view === 'grid');
  browser.classList.toggle('is-list', state.explorer.view === 'list');

  if (!items.length) {
    const empty = el('div', 'file-empty');
    const icon = el('div', 'file-empty__icon');
    icon.append(iconEl(query ? 'search' : 'folder', 'glyph'));
    empty.append(icon);
    empty.append(el('strong', '', query ? 'Keine Treffer' : 'Noch nichts hier'));
    empty.append(el('span', '', query
      ? `Für „${query}“ wurde kein Lesezeichen gefunden.`
      : 'Ziehe Lesezeichen aus einem Ordner hierher oder lege sie auf dem Desktop ab.'));
    browser.append(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  items.forEach((item, index) => {
    const node = el('div', 'file-item');
    node.dataset.source = 'finder';
    node.dataset.id = item.id;
    node.dataset.kind = item.kind;
    node.tabIndex = 0;
    node.setAttribute('role', 'button');
    node.setAttribute('aria-label', `${item.title} ${item.kind === 'folder' ? 'öffnen' : 'öffnen oder ziehen'}`);
    node.style.animationDelay = `${Math.min(index * 11, 220)}ms`;
    if (isSelected('finder', item.id)) node.classList.add('is-selected');

    const iconWrap = el('div', 'file-item__icon');
    iconWrap.append(itemIcon(withFavicon(item), 56));
    node.append(iconWrap);
    node.append(el('div', 'file-item__name', item.title));
    node.append(el('div', 'file-item__meta', itemMeta(item)));
    node.append(el('div', 'file-item__type', itemTypeLabel(item)));
    node.append(el('div', 'file-item__date', itemDateLabel(item)));
    fragment.append(node);
  });
  browser.append(fragment);
}

function renderExplorer(options = {}) {
  if (!state.explorer.open || !state.explorer.dom) return;
  const e = state.explorer.dom;
  const target = currentTarget();
  const query = state.explorer.query.trim();
  const items = query ? searchBookmarks(query) : getItemsForTarget(target);
  state.explorer.items = items.map(withFavicon);

  renderSidebar(target);
  renderBreadcrumb(target, query);
  renderFileBrowser(items, target, query);

  e.title.textContent = targetTitle(target, query);
  e.back.disabled = state.explorer.index <= 0;
  e.forward.disabled = state.explorer.index >= state.explorer.stack.length - 1;
  e.viewButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.view === state.explorer.view);
  });
  if (!options.preserveSearch) e.search.value = state.explorer.query;

  const folders = items.filter((item) => item.kind === 'folder').length;
  const selected = state.selected?.source === 'finder' ? ' · 1 ausgewählt' : '';
  e.statusLeft.textContent = `${plural(items.length, 'Objekt', 'Objekte')}${folders ? ` · ${plural(folders, 'Ordner', 'Ordner')}` : ''}${selected}`;
  e.statusRight.textContent = query ? 'Suchergebnisse · Ziehen zum Ablegen' : 'Doppelklick öffnen · Ziehen zum Ablegen';
}

function windowGeometry(win) {
  const layer = refs.windowsLayer.getBoundingClientRect();
  const rect = win.getBoundingClientRect();
  return {
    layer,
    rect,
    left: rect.left - layer.left,
    top: rect.top - layer.top,
    width: rect.width,
    height: rect.height
  };
}

function windowSnapZone(x, y) {
  const edge = 30;
  const width = window.innerWidth;
  const height = window.innerHeight;
  const left = x <= edge;
  const right = x >= width - edge;
  const top = y <= edge;
  const bottom = y >= height - edge;
  if (top && left) return 'top-left';
  if (top && right) return 'top-right';
  if (bottom && left) return 'bottom-left';
  if (bottom && right) return 'bottom-right';
  if (top) return 'top';
  if (bottom) return 'bottom';
  if (left) return 'left';
  if (right) return 'right';
  return null;
}

function windowSnapRect(zone) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const halfW = width / 2;
  const halfH = height / 2;
  if (zone === 'left') return { left: 0, top: 0, width: halfW, height };
  if (zone === 'right') return { left: halfW, top: 0, width: halfW, height };
  if (zone === 'top') return { left: 0, top: 0, width, height: halfH };
  if (zone === 'bottom') return { left: 0, top: halfH, width, height: halfH };
  if (zone === 'top-left') return { left: 0, top: 0, width: halfW, height: halfH };
  if (zone === 'top-right') return { left: halfW, top: 0, width: halfW, height: halfH };
  if (zone === 'bottom-left') return { left: 0, top: halfH, width: halfW, height: halfH };
  if (zone === 'bottom-right') return { left: halfW, top: halfH, width: halfW, height: halfH };
  return null;
}

function showWindowSnapPreview(zone) {
  const preview = refs.snapPreview;
  const rect = windowSnapRect(zone);
  if (!preview || !rect) return;
  preview.style.left = `${rect.left}px`;
  preview.style.top = `${rect.top}px`;
  preview.style.width = `${rect.width}px`;
  preview.style.height = `${rect.height}px`;
  preview.dataset.zone = zone;
  preview.classList.add('is-visible');
}

function hideWindowSnapPreview() {
  refs.snapPreview?.classList.remove('is-visible');
}

function applyWindowSnap(win, zone) {
  const rect = windowSnapRect(zone);
  if (!rect) return;
  win.classList.remove('is-maximized');
  win.classList.add('is-snapping');
  win.style.left = `${rect.left}px`;
  win.style.top = `${rect.top}px`;
  win.style.width = `${rect.width}px`;
  win.style.height = `${rect.height}px`;
  win.style.setProperty('--win-base', 'translate(0, 0)');
  win.style.transform = 'none';
  setTimeout(() => win.classList.remove('is-snapping'), 420);
}

function toggleWindowMaximize(e) {
  if (!e) return;
  focusWindow(e.win.dataset.windowId);
  const maximized = !e.win.classList.contains('is-maximized');
  e.win.classList.toggle('is-maximized', maximized);
  e.win.classList.remove('is-snapped');
  e.win.style.setProperty('--win-base', 'translate(0, 0)');
  e.win.style.transform = 'none';
  if (e.win === state.explorer.dom?.win) {
    state.explorer.maximized = maximized;

  }
}

function bindWindowDrag(e) {
  const titlebar = e.titlebar || $('[data-role="titlebar"]', e.win) || $('.window-titlebar', e.win);
  if (!titlebar) return;
  titlebar.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || event.target.closest('button, input, textarea, select')) return;
    if (e.win.classList.contains('is-maximized')) return;
    event.preventDefault();
    const geo = windowGeometry(e.win);
    e.win.style.left = `${geo.left}px`;
    e.win.style.top = `${geo.top}px`;
    e.win.style.width = `${geo.width}px`;
    e.win.style.height = `${geo.height}px`;
    e.win.style.setProperty('--win-base', 'translate(0, 0)');
    e.win.style.transform = 'none';
    e.win.classList.add('is-moving');
    if (e.win === state.explorer.dom?.win) state.explorer.wasDragged = true;
    try { titlebar.setPointerCapture(event.pointerId); } catch {  }
    let zone = null;
    const move = (moveEvent) => {
      const dx = moveEvent.clientX - event.clientX;
      const dy = moveEvent.clientY - event.clientY;
      const left = clamp(geo.left + dx, 8, Math.max(8, geo.layer.width - geo.width - 8));
      const top = clamp(geo.top + dy, 8, Math.max(8, geo.layer.height - geo.height - 8));
      e.win.style.left = `${left}px`;
      e.win.style.top = `${top}px`;
      zone = windowSnapZone(moveEvent.clientX, moveEvent.clientY);
      if (zone) showWindowSnapPreview(zone);
      else hideWindowSnapPreview();
    };
    const up = () => {
      e.win.classList.remove('is-moving');
      hideWindowSnapPreview();
      if (zone) applyWindowSnap(e.win, zone);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  });
  titlebar.addEventListener('dblclick', (event) => {
    if (event.target.closest('button')) return;
    toggleWindowMaximize(e);
  });
}

function bindWindowResize(e) {
  if (!e.resize) return;
  e.resize.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || e.win.classList.contains('is-maximized')) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = e.win.getBoundingClientRect();
    const startW = rect.width;
    const startH = rect.height;
    const startX = event.clientX;
    const startY = event.clientY;
    const minW = Math.min(560, window.innerWidth - 24);
    e.win.classList.add('is-moving');
    try { e.resize.setPointerCapture(event.pointerId); } catch {  }
    const move = (moveEvent) => {
      e.win.style.width = `${clamp(startW + moveEvent.clientX - startX, minW, window.innerWidth - 32)}px`;
      e.win.style.height = `${clamp(startH + moveEvent.clientY - startY, 320, window.innerHeight - 130)}px`;
    };
    const up = () => {
      e.win.classList.remove('is-moving');
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  });
}

function focusWindow(id) {
  const entry = id ? windowRegistry.get(id) : null;
  if (!entry?.win?.isConnected) return;
  if (entry.win.classList.contains('is-minimized')) return;
  if (entry.win.classList.contains('settings-window') && !entry.win.classList.contains('is-open')) return;
  if (activeWindowId === id) return;
  windowZCounter += 1;
  windowRegistry.forEach((other, key) => other.win.classList.toggle('is-focused', key === id));
  entry.win.style.zIndex = String(windowZCounter);
  activeWindowId = id;
}

function focusTopWindow() {
  let bestId = null;
  let bestZ = -Infinity;
  windowRegistry.forEach((entry, id) => {
    if (!entry.win?.isConnected || entry.win.classList.contains('is-minimized')) return;
    if (entry.win.classList.contains('settings-window') && !entry.win.classList.contains('is-open')) return;
    const z = Number(entry.win.style.zIndex || 0);
    if (z > bestZ) { bestZ = z; bestId = id; }
  });
  if (bestId) focusWindow(bestId);
  else activeWindowId = null;
}

function bindWindowShell(e, onClose = null, onMinimize = null, options = {}) {
  const id = uid('window');
  e.win.dataset.windowId = id;
  windowRegistry.set(id, e);
  e.closeBtn?.addEventListener('click', () => {
    if (options.keepOnClose) {
      e.win.classList.add('is-closing');
      setTimeout(() => e.win.classList.remove('is-closing'), 320);
    } else {
      e.win.classList.add('is-closing');
      windowRegistry.delete(id);
      if (activeWindowId === id) activeWindowId = null;
      setTimeout(() => e.win.remove(), 320);
    }
    onClose?.();
    if (!options.keepOnClose) focusTopWindow();
  });
  e.minimizeBtn?.addEventListener('click', () => {
    e.win.classList.add('is-minimized');
    if (activeWindowId === id) activeWindowId = null;
    onMinimize?.();
    focusTopWindow();
  });
  e.maximizeBtn?.addEventListener('click', () => {
    focusWindow(id);
    toggleWindowMaximize(e);
  });
  bindWindowDrag(e);
  bindWindowResize(e);
  if (!options.deferFocus) focusWindow(id);
  return id;
}

function createWindowShell({ className = '', title = '', icon = 'window', body = '', width = 760, height = 560 }) {
  const win = el('div', `window ${className}`.trim());
  win.innerHTML = `
    <div class="window-mist" aria-hidden="true"></div>
    <header class="window-titlebar" data-role="titlebar">
      <div class="traffic-lights">
        <button type="button" class="traffic-light traffic-light--close" data-window-action="close" aria-label="Schließen"></button>
        <button type="button" class="traffic-light traffic-light--minimize" data-window-action="minimize" aria-label="Minimieren"></button>
        <button type="button" class="traffic-light traffic-light--maximize" data-window-action="maximize" aria-label="Vollbild"></button>
      </div>
      <div class="window-title"><span class="glyph" data-icon="${escapeXml(icon)}"></span><span>${escapeXml(title)}</span></div>
      <div class="window-actions"></div>
    </header>
    <div class="window-body">${body}</div>
    <div class="resize-handle" data-role="resize" aria-hidden="true"></div>`;
  const w = Math.min(width, Math.max(320, window.innerWidth - 32));
  const h = Math.min(height, Math.max(240, window.innerHeight - 32));
  win.style.width = `${w}px`;
  win.style.height = `${h}px`;
  win.style.left = `${Math.max(16, Math.round((window.innerWidth - w) / 2))}px`;
  win.style.top = `${Math.max(16, Math.round((window.innerHeight - h) / 2))}px`;
  win.style.setProperty('--win-base', 'translate(0, 0)');
  win.style.transform = 'none';
  refs.windowsLayer.append(win);
  win.classList.add('is-ready');
  hydrateIcons(win);
  return {
    win,
    titlebar: $('[data-role="titlebar"]', win),
    closeBtn: $('[data-window-action="close"]', win),
    minimizeBtn: $('[data-window-action="minimize"]', win),
    maximizeBtn: $('[data-window-action="maximize"]', win),
    resize: $('[data-role="resize"]', win)
  };
}

function createSettingsWindow() {
  if (refs.settingsWindow) return;
  const shell = createWindowShell({
    className: 'settings-window',
    title: 'Einstellungen',
    icon: 'settings',
    width: 920,
    height: 700,
    body: `<div class="settings-tabs" role="tablist"><div class="settings-tabs-group" role="presentation"><button type="button" class="settings-tab is-active" data-settings-tab="settings" role="tab" aria-selected="true">Einstellungen</button><button type="button" class="settings-tab" data-settings-tab="editor" role="tab" aria-selected="false" tabindex="-1">Editor</button><button type="button" class="settings-tab" data-settings-tab="widgets" role="tab" aria-selected="false" tabindex="-1">Widgets</button><button type="button" class="settings-tab" data-settings-tab="spaces" role="tab" aria-selected="false" tabindex="-1">Spaces</button></div></div><div class="settings-window__panes"></div>`
  });
  const panes = $('.settings-window__panes', shell.win);
  refs.settingsWindow = shell.win;
  refs.settingsTabs = $$('.settings-tab', shell.win);
  refs.settingsEditorTab = el('div', 'settings-editor-tab');
  refs.settingsEditorTab.id = 'settingsEditorTab';
  refs.settingsEditorTab.append(refs.displayEditorBar);
  refs.settingsWidgetsTab = el('div', 'settings-widgets-tab');
  refs.settingsWidgetsTab.id = 'settingsWidgetsTab';
  refs.settingsWidgetsTab.innerHTML = `
    <section class="settings-group">
      <h3>Widgets</h3>
      <div class="settings-line">
        <div class="settings-line__text"><strong>Widgets aktivieren</strong><small>Notizen, Aufgaben, Timer, Kalender und Weltuhren auf dem Desktop</small></div>
        <label class="settings-switch"><input type="checkbox" data-widget-role="enabled"><span></span></label>
      </div>
      <div class="settings-line">
        <div class="settings-line__text"><strong>Verfügbare Typen</strong><small>Notiz, Aufgaben, Timer, Kalender und Weltuhr</small></div>
      </div>
      <div class="settings-actions">
        <select class="settings-select" data-widget-role="type" aria-label="Widget-Typ">
          <option value="note">Notiz</option>
          <option value="tasks">Aufgaben</option>
          <option value="timer">Timer</option>
          <option value="calendar">Kalender</option>
          <option value="worldclock">Weltuhr</option>
        </select>
        <button class="settings-button" type="button" data-widget-action="add">Widget hinzufügen</button>
        <button class="settings-button" type="button" data-widget-action="reset">Alle Widgets entfernen</button>
      </div>
      <p class="settings-note"><span data-widget-role="count">0</span> Widgets aktiv. Standardmäßig ist der Desktop leer. Ziehe am Kopf, ändere die Größe unten rechts.</p>
    </section>
    <section class="settings-group">
      <h3>Lokales Backup</h3>
      <div class="settings-line">
        <div class="settings-line__text"><strong>Alles lokal sichern</strong><small>Einstellungen, Desktop-Symbole, Dock-Pins, Widgets und Spaces</small></div>
      </div>
      <div class="settings-actions">
        <button class="settings-button" type="button" data-widget-action="export">Backup exportieren</button>
        <button class="settings-button" type="button" data-widget-action="import">Backup importieren</button>
        <input type="file" data-widget-role="import-file" accept=".json,application/json" hidden>
      </div>
      <p class="settings-video-status" data-widget-role="status">Noch kein Backup geladen</p>
      <p class="settings-note">Ein Backup enthält Einstellungen, Desktop-Symbole, Dock-Pins, Widgets und Spaces. Videos und selbst gewählte Hintergrund-Pack-Bilder bleiben in IndexedDB und werden nicht exportiert.</p>
    </section>`;
  refs.settingsSpacesTab = el('div', 'settings-spaces-tab');
  refs.settingsSpacesTab.id = 'settingsSpacesTab';
  refs.settingsSpacesTab.innerHTML = spacesPaneMarkup();
  refs.settingsPanel.classList.add('settings-pane');
  panes.append(refs.settingsPanel, refs.settingsEditorTab, refs.settingsWidgetsTab, refs.settingsSpacesTab);
  refs.settingsWindow.setAttribute('aria-hidden', 'true');
  refs.settingsTabs.forEach((tab) => {
    tab.addEventListener('click', () => switchSettingsTab(tab.dataset.settingsTab));
  });
  bindSettingsTabKeys();
  hydrateIcons(refs.settingsWidgetsTab);
  hydrateIcons(refs.settingsSpacesTab);
  bindWidgetsPane(refs.settingsWidgetsTab);
  bindSpacesPane(refs.settingsSpacesTab);
  syncWidgetsPane();
  renderSpacesPane();
  bindWindowShell(shell, () => toggleSettings(false), null, { keepOnClose: true, deferFocus: true });
}

function bindSettingsTabKeys() {
  const tabs = refs.settingsTabs;
  if (!tabs?.length || tabs[0].dataset.tabKeysBound === 'true') return;
  tabs[0].dataset.tabKeysBound = 'true';
  const list = tabs[0].closest('[role="tablist"]');
  if (!list) return;
  list.addEventListener('keydown', (event) => {
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const current = tabs.findIndex((tab) => tab.classList.contains('is-active'));
    let next = current < 0 ? 0 : current;
    if (event.key === 'ArrowLeft') next = (current - 1 + tabs.length) % tabs.length;
    else if (event.key === 'ArrowRight') next = (current + 1) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    const target = tabs[next];
    if (!target) return;
    switchSettingsTab(target.dataset.settingsTab);
    target.focus();
  });
}

function switchSettingsTab(tab) {
  createSettingsWindow();
  const editor = tab === 'editor';
  const widgets = tab === 'widgets';
  const spaces = tab === 'spaces';
  const settings = tab === 'settings';
  refs.settingsTabs?.forEach((button) => {
    const isActive = button.dataset.settingsTab === tab;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-selected', isActive ? 'true' : 'false');
    button.tabIndex = isActive ? 0 : -1;
  });
  refs.settingsPanel.classList.toggle('is-hidden', !settings);
  refs.settingsEditorTab.classList.toggle('is-hidden', !editor);
  refs.settingsWidgetsTab?.classList.toggle('is-hidden', !widgets);
  refs.settingsSpacesTab?.classList.toggle('is-hidden', !spaces);
  state.displayEditor.open = editor;
  document.body.classList.toggle('editor-open', editor);
  refs.displayEditorStage?.classList.toggle('is-active', editor);
  syncDockVisibility();
  if (widgets) syncWidgetsPane();
  if (spaces) renderSpacesPane();
  if (editor) {
    updateEditorDockButtons();
    refs.setClockScale.value = String(Math.round(state.settings.clockScale * 100));
    refs.setClockScaleValue.textContent = `${Math.round(state.settings.clockScale * 100)} %`;
    requestAnimationFrame(() => {
      positionEditorHandles();
      positionEditorBar();
    });
  }
}

function openWidgetsSettings() {
  toggleSettings(true);
  switchSettingsTab('widgets');
}

function openSpacesSettings() {
  toggleSettings(true);
  switchSettingsTab('spaces');
}

function openHushAppWindow(item) {
  const clean = safeUrl(item.url);
  if (!clean) return;
  const title = shortTitle(item.title || siteName(clean) || hostOf(clean) || 'App');
  const domain = hostOf(clean) || siteName(clean) || 'App';
  const icon = itemIcon(item, 96);
  const shell = createWindowShell({
    className: 'hush-app-window',
    title: 'Hush',
    icon: 'window',
    width: 520,
    height: 360,
    body: `<div class="hush-app-card"><div class="hush-app-card__icon">${icon}</div><div class="hush-app-card__title"></div><div class="hush-app-card__domain"></div><button type="button" class="settings-button settings-button--primary hush-app-card__start">Start</button></div>`
  });
  hydrateIcons(shell.win);
  $('.hush-app-card__title', shell.win).textContent = title;
  $('.hush-app-card__domain', shell.win).textContent = domain;
  $('.hush-app-card__start', shell.win).addEventListener('click', () => openItem(item, { newTab: true }));
  const id = bindWindowShell(shell);
  focusWindow(id);
}

function createFinderWindow() {
  const win = el('div', 'window finder-window');
  win.setAttribute('role', 'dialog');
  win.setAttribute('aria-label', 'Ablage – Lesezeichen');
  win.innerHTML = `
    <div class="window-mist"><i></i><i></i><i></i></div>
    <header class="window-titlebar">
      <div class="traffic-lights">
        <button class="traffic-light traffic-light--close" type="button" data-window-action="close" aria-label="Schließen"></button>
        <button class="traffic-light traffic-light--minimize" type="button" data-window-action="minimize" aria-label="Minimieren"></button>
        <button class="traffic-light traffic-light--maximize" type="button" data-window-action="maximize" aria-label="Maximieren"></button>
      </div>
      <div class="window-title"><span class="glyph" data-icon="finder"></span><span data-role="window-title">Ablage</span></div>
      <div class="window-actions">
        <button class="icon-button" type="button" data-window-action="refresh" title="Aktualisieren" aria-label="Aktualisieren"><span class="glyph" data-icon="refresh"></span></button>
      </div>
    </header>
    <div class="window-body">
      <aside class="finder-sidebar" data-role="sidebar"></aside>
      <section class="finder-main">
        <div class="finder-toolbar">
          <div class="toolbar-nav">
            <button class="icon-button" type="button" data-role="back" title="Zurück" aria-label="Zurück"><span class="glyph" data-icon="back"></span></button>
            <button class="icon-button" type="button" data-role="forward" title="Vorwärts" aria-label="Vorwärts"><span class="glyph" data-icon="forward"></span></button>
          </div>
          <div class="breadcrumb" data-role="breadcrumb"></div>
          <div class="toolbar-right">
            <div class="view-switch">
              <button type="button" data-view="grid" title="Symbole" aria-label="Symbolansicht"><span class="glyph" data-icon="grid"></span></button>
              <button type="button" data-view="list" title="Liste" aria-label="Listenansicht"><span class="glyph" data-icon="list"></span></button>
            </div>
            <label class="finder-search">
              <span class="glyph" data-icon="search"></span>
              <input type="search" data-role="search" placeholder="In Lesezeichen suchen" autocomplete="off" spellcheck="false" aria-label="In Lesezeichen suchen">
            </label>
          </div>
        </div>
        <div class="file-browser is-grid" data-role="file-browser"></div>
        <div class="finder-status"><span data-role="status-left"></span><span data-role="status-right"></span></div>
      </section>
    </div>
    <div class="resize-handle" data-role="resize" aria-hidden="true"></div>
  `;

  hydrateIcons(win);
  refs.windowsLayer.append(win);
  setTimeout(() => win.classList.add('is-ready'), 700);
  setTimeout(() => win.querySelector('.window-mist')?.remove(), 900);

  const e = {
    win,
    titlebar: $('.window-titlebar', win),
    title: $('[data-role="window-title"]', win),
    sidebar: $('[data-role="sidebar"]', win),
    back: $('[data-role="back"]', win),
    forward: $('[data-role="forward"]', win),
    breadcrumb: $('[data-role="breadcrumb"]', win),
    search: $('[data-role="search"]', win),
    viewButtons: $$('[data-view]', win),
    fileBrowser: $('[data-role="file-browser"]', win),
    statusLeft: $('[data-role="status-left"]', win),
    statusRight: $('[data-role="status-right"]', win),
    refresh: $('[data-window-action="refresh"]', win),
    closeBtn: $('[data-window-action="close"]', win),
    minimizeBtn: $('[data-window-action="minimize"]', win),
    maximizeBtn: $('[data-window-action="maximize"]', win),
    resize: $('[data-role="resize"]', win)
  };
  state.explorer.dom = e;
  const id = bindWindowEvents(e);
  focusWindow(id);
}

function toggleSidebarFolder(id) {
  if (!id) return;
  if (state.explorer.expanded.has(id)) state.explorer.expanded.delete(id);
  else state.explorer.expanded.add(id);
  renderExplorer();
}

function activateSidebarItem(item) {
  if (!item) return;
  if (item.dataset.action === 'folder') navigateExplorer({ type: 'folder', id: item.dataset.folderId });
  else if (item.dataset.action === 'special') navigateExplorer({ type: 'special', key: item.dataset.special });
}

function bindWindowEvents(e) {
  const id = bindWindowShell(e, closeExplorer, minimizeExplorer);

  e.back.addEventListener('click', goBack);
  e.forward.addEventListener('click', goForward);
  e.refresh.addEventListener('click', scheduleRefresh);
  e.search.addEventListener('input', () => {
    state.explorer.query = e.search.value;
    renderExplorer({ preserveSearch: true });
  });
  e.viewButtons.forEach((button) => button.addEventListener('click', () => setExplorerView(button.dataset.view)));
  e.breadcrumb.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-folder-id]');
    if (button) navigateExplorer({ type: 'folder', id: button.dataset.folderId });
  });
  e.sidebar.addEventListener('click', (event) => {
    const toggle = event.target.closest('[data-toggle]');
    if (toggle) { toggleSidebarFolder(toggle.dataset.toggle); return; }
    activateSidebarItem(event.target.closest('.sidebar-item'));
  });
  e.sidebar.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const item = event.target.closest('.sidebar-item');
    if (!item) return;
    event.preventDefault();
    activateSidebarItem(item);
  });

  e.fileBrowser.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    const node = event.target.closest('.file-item');
    if (!node) return;
    const item = lookupItem('finder', node.dataset.id);
    if (!item) return;
    pendingDrag({ event, sourceEl: node, item: { ...item }, source: 'finder', mode: 'copy' });
  });
  e.fileBrowser.addEventListener('click', (event) => {
    if (performance.now() < state.suppressClickUntil) return;
    const node = event.target.closest('.file-item');
    if (!node) { clearSelection(); return; }
    selectItem('finder', node.dataset.id);
  });
  e.fileBrowser.addEventListener('dblclick', (event) => {
    if (performance.now() < state.suppressClickUntil) return;
    const node = event.target.closest('.file-item');
    if (!node) return;
    openFileItem(lookupItem('finder', node.dataset.id), event.altKey);
  });
  e.fileBrowser.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    event.stopPropagation();
    const node = event.target.closest('.file-item');
    if (!node) { showFinderBackgroundMenu(event.clientX, event.clientY); return; }
    const item = lookupItem('finder', node.dataset.id);
    if (!item) return;
    selectItem('finder', node.dataset.id);
    showItemContextMenu(event.clientX, event.clientY, item, 'finder');
  });
  e.fileBrowser.addEventListener('keydown', (event) => {
    const node = event.target.closest('.file-item');
    if (event.key === 'Backspace' && !state.explorer.query) {
      event.preventDefault();
      goBack();
      return;
    }
    if (!node) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openFileItem(lookupItem('finder', node.dataset.id));
    }
  });
  return id;
}

function openExplorer(target = null) {
  if (state.explorer.open) {
    if (state.explorer.minimized) restoreExplorer();
    else if (state.explorer.dom) bounce(state.explorer.dom.titlebar);
    focusWindow(state.explorer.dom?.win?.dataset.windowId);
    if (target) navigateExplorer(target);
    return;
  }

  state.explorer.open = true;
  state.explorer.minimized = false;
  state.explorer.maximized = false;
  state.explorer.wasDragged = false;
  state.explorer.stack = [{ type: 'folder', id: state.rootId }];
  state.explorer.index = 0;
  state.explorer.query = '';
  createFinderWindow();
  expandAncestors(state.rootId);
  if (target) navigateExplorer(target, { push: false });
  else renderExplorer();
}

function closeExplorer() {
  if (!state.explorer.open || !state.explorer.dom) return;
  const win = state.explorer.dom.win;
  win.classList.remove('is-minimized');
  win.classList.add('is-closing');
  setTimeout(() => win.remove(), 320);
  state.explorer.open = false;
  state.explorer.minimized = false;
  state.explorer.dom = null;
  clearSelection();
  focusTopWindow();
}

function minimizeExplorer() {
  if (!state.explorer.open || !state.explorer.dom) return;
  state.explorer.dom.win.classList.add('is-minimized');
  state.explorer.minimized = true;
  hideDockTooltip();
}

function restoreExplorer() {
  if (!state.explorer.open || !state.explorer.dom) return;
  const win = state.explorer.dom.win;
  win.classList.remove('is-minimized', 'is-closing');
  win.classList.add('is-restoring');
  setTimeout(() => win.classList.remove('is-restoring'), 500);
  state.explorer.minimized = false;
  focusWindow(win.dataset.windowId);
}

function toggleMaximize(e = state.explorer.dom) {
  toggleWindowMaximize(e);
}

function setExplorerView(view) {
  if (view !== 'grid' && view !== 'list') return;
  state.explorer.view = view;
  updateSettings({ explorerView: view });
}

function revealInAblage(item) {
  const id = item.bookmarkId || item.folderId;
  const parentId = id ? (state.bookmarkMap.get(String(id))?.parentId || state.rootId) : state.rootId;
  const revealId = item.bookmarkId
    ? `bm:${item.bookmarkId}`
    : item.folderId
      ? `folder:${item.folderId}`
      : item.id;
  openExplorer({ type: 'folder', id: parentId });
  state.selected = { source: 'finder', id: revealId };
  renderExplorer();
  setTimeout(() => {
    const node = $$('.file-item', state.explorer.dom?.fileBrowser || document).find((n) => n.dataset.id === revealId);
    node?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    if (node) node.classList.add('is-selected');
  }, 90);
}



function isSelected(source, id) {
  return state.selected?.source === source && state.selected?.id === id;
}

function selectItem(source, id) {
  state.selected = { source, id };
  $$('.desktop-icon.is-selected', refs.desktopIcons).forEach((n) => n.classList.remove('is-selected'));
  const fileRoot = state.explorer.dom?.fileBrowser;
  if (fileRoot) $$('.file-item.is-selected', fileRoot).forEach((n) => n.classList.remove('is-selected'));
  if (source === 'desktop') {
    $$('.desktop-icon', refs.desktopIcons).find((n) => n.dataset.id === id)?.classList.add('is-selected');
  } else if (source === 'finder' && fileRoot) {
    $$('.file-item', fileRoot).find((n) => n.dataset.id === id)?.classList.add('is-selected');
  }
}

function clearSelection() {
  state.selected = null;
  $$('.desktop-icon.is-selected', refs.desktopIcons).forEach((n) => n.classList.remove('is-selected'));
  const fileRoot = state.explorer.dom?.fileBrowser;
  if (fileRoot) $$('.file-item.is-selected', fileRoot).forEach((n) => n.classList.remove('is-selected'));
  if (state.explorer.open) renderExplorer({ preserveSearch: true });
}

function openRenameDialog(id, mode = 'rename') {
  const item = state.desktop.find((entry) => entry.id === id);
  if (!item || !refs.renameOverlay) return;
  const isLink = mode === 'link';
  if (isLink && !item.url) return;
  state.rename = { open: true, id, mode: isLink ? 'link' : 'rename' };
  refs.renameOverlay.classList.add('is-open');
  refs.renameOverlay.setAttribute('aria-hidden', 'false');
  refs.renameTitle.textContent = t(isLink ? 'Adresse ändern' : 'Umbenennen');
  refs.renameLabel.textContent = t(isLink ? 'Neue Adresse' : 'Neuer Name');
  refs.renameInput.type = isLink ? 'url' : 'text';
  refs.renameInput.maxLength = isLink ? 500 : 80;
  refs.renameInput.placeholder = isLink ? t('https://') : '';
  refs.renameInput.value = isLink ? (item.url || '') : (item.title || '');
  refs.renameInput.focus();
  refs.renameInput.select();
}

function closeRenameDialog() {
  if (!state.rename.open) return;
  state.rename = { open: false, id: null, mode: 'rename' };
  refs.renameOverlay.classList.remove('is-open');
  refs.renameOverlay.setAttribute('aria-hidden', 'true');
  refs.renameInput.blur();
  refs.renameInput.type = 'text';
  refs.renameInput.maxLength = 80;
  refs.renameInput.placeholder = '';
}

function commitRename() {
  const item = state.desktop.find((entry) => entry.id === state.rename.id);
  if (!item) { closeRenameDialog(); return; }
  if (state.rename.mode === 'link') {
    const value = String(refs.renameInput.value || '').trim();
    const clean = storedItemUrl(urlFromQuery(value) || safeUrl(value));
    if (!clean) {
        refs.renameInput.focus();
      return;
    }
    if (clean !== item.url) {
      item.url = clean;
      delete item.bookmarkId;
      delete item.favIconUrl;
      persistNow();
      renderDesktop(false);
      renderDock();
      }
    closeRenameDialog();
    return;
  }
  const value = safeTitle(refs.renameInput.value, '');
  if (!value) {
    refs.renameInput.focus();
    return;
  }
  item.title = value;
  persist();
  renderDesktop(false);
  closeRenameDialog();
}

function showItemContextMenu(x, y, item, source) {
  if (!item) return;
  if (item.app) { showDockAppMenu(x, y, item); return; }

  const items = [];
  if (item.kind === 'folder') {
    items.push({ label: 'Ordner öffnen', icon: 'folder', action: () => openExplorer({ type: 'folder', id: item.folderId }) });
  } else if (item.url) {
    items.push({ label: 'Öffnen', icon: 'external', shortcut: '↵', action: () => openItem(item) });
    items.push({ label: 'In neuem Tab öffnen', icon: 'window', action: () => openItem(item, { newTab: true }) });
    items.push({ label: 'Im Hintergrund öffnen', icon: 'stack', action: () => openItem(item, { newTab: true, background: true }) });
  }
  items.push({ separator: true });

  const desktopEntry = state.desktop.find((entry) => sameItem(entry, item));
  const pinnedEntry = state.pinned.find((entry) => sameItem(entry, item));
  if (item.url || item.kind === 'folder') {
    if (!desktopEntry) items.push({ label: 'Auf Desktop legen', icon: 'desktop', action: () => addToDesktop(item) });
    if (!pinnedEntry) items.push({ label: 'Im Dock anheften', icon: 'pin', action: () => pinToDock(item) });
    if (item.bookmarkId || item.folderId) {
      items.push({ label: 'In Ablage zeigen', icon: 'finder', action: () => revealInAblage(item) });
    }
    if (desktopEntry) items.push({ label: 'Vom Desktop entfernen', icon: 'trash', danger: true, action: () => removeFromDesktop(desktopEntry.id) });
    if (pinnedEntry) items.push({ label: 'Nicht mehr anheften', icon: 'pinOff', danger: true, action: () => unpin(pinnedEntry.id) });
    if (desktopEntry || pinnedEntry) items.push({ label: 'Verknüpfung entfernen', icon: 'pinOff', danger: true, action: () => removeShortcutEverywhere(item) });
  }
  if (item.url) {
    items.push({ separator: true });
    items.push({
      label: 'Adresse kopieren',
      icon: 'copy',
      action: () => copyText(item.url)
    });
  }

  if (source === 'desktop') {
    items.push({ separator: true });
    if (item.url) items.push({ label: 'Adresse ändern …', icon: 'external', action: () => openRenameDialog(item.id, 'link') });
    items.push({ label: 'Umbenennen', icon: 'external', action: () => openRenameDialog(item.id) });
  }

  showContextMenu(x, y, items);
}

function showDesktopContextMenu(x, y) {
  showContextMenu(x, y, [
    { label: 'Ablage öffnen', icon: 'finder', action: () => openExplorer() },
    { label: 'Suche öffnen', icon: 'search', shortcut: shortcutLabel(), action: openSpotlight },
    { separator: true },
    { label: 'Symbole anordnen', icon: 'grid', action: arrangeIcons },
    { label: 'Hintergrundbild ändern …', icon: 'image', action: () => refs.wallpaperInput.click() },
    { label: 'Hintergrund-Pack wählen …', icon: 'folder', action: () => refs.wallpaperPackInput.click() },
    { label: 'Darstellung …', icon: 'settings', action: () => toggleSettings(true) },
    { separator: true },
    { label: 'Desktop leeren', icon: 'trash', danger: true, action: clearDesktop }
  ]);
}

function showFinderBackgroundMenu(x, y) {
  showContextMenu(x, y, [
    { label: 'Symbolansicht', icon: 'grid', action: () => setExplorerView('grid') },
    { label: 'Listenansicht', icon: 'list', action: () => setExplorerView('list') },
    { separator: true },
    { label: 'Alle Lesezeichen', icon: 'bookmarks', action: () => navigateExplorer({ type: 'folder', id: state.rootId }) },
    { label: 'Zuletzt besucht', icon: 'history', action: () => navigateExplorer({ type: 'special', key: 'recent' }) },
    { label: 'Aktualisieren', icon: 'refresh', action: () => refreshData().catch(() => {}) }
  ]);
}

function showDockAppMenu(x, y, item) {
  if (item.app === 'settings') {
    showContextMenu(x, y, [
      { label: 'Darstellung öffnen', icon: 'settings', action: () => toggleSettings(true) },
      { label: 'Hintergrundbild ändern …', icon: 'image', action: () => refs.wallpaperInput.click() },
      { separator: true },
      { label: 'Symbole anordnen', icon: 'grid', action: arrangeIcons }
    ]);
    return;
  }
  if (item.app === 'widgets') {
    showContextMenu(x, y, [
      { label: 'Widgets öffnen', icon: 'widgets', action: openWidgetsSettings },
      { separator: true },
      { label: 'Notiz hinzufügen', icon: 'copy', action: () => addWidget('note') },
      { label: 'Aufgaben hinzufügen', icon: 'check', action: () => addWidget('tasks') },
      { label: 'Timer hinzufügen', icon: 'clock', action: () => addWidget('timer') },
      { label: 'Kalender hinzufügen', icon: 'grid', action: () => addWidget('calendar') },
      { label: 'Weltuhr hinzufügen', icon: 'clock', action: () => addWidget('worldclock') }
    ]);
    return;
  }
  if (item.app === 'spaces') {
    showContextMenu(x, y, [
      { label: t('Spaces öffnen'), icon: 'spaces', action: openSpacesSettings },
      { separator: true },
      ...state.spaces.map((space) => ({
        label: `${t('Zu Space wechseln')}: ${space.name}`,
        icon: 'grid',
        action: () => switchSpace(space.id)
      }))
    ]);
    return;
  }
  showContextMenu(x, y, [
    { label: 'Ablage öffnen', icon: 'finder', action: () => openExplorer() },
    { label: 'Alle Lesezeichen', icon: 'bookmarks', action: () => openExplorer({ type: 'folder', id: state.rootId }) },
    { label: 'Zuletzt besucht', icon: 'history', action: () => openExplorer({ type: 'special', key: 'recent' }) },
    { separator: true },
    { label: 'Suche öffnen', icon: 'search', shortcut: shortcutLabel(), action: openSpotlight }
  ]);
}



function commandResults() {
  return [
    { group: 'Befehle', title: 'Ablage öffnen', sub: 'Alle Lesezeichen und Ordner durchsuchen', icon: 'finder', hint: 'Ablage', action: () => openExplorer() },
    { group: 'Befehle', title: 'Darstellung öffnen', sub: 'Glas, Bewegung, Hintergrund und Dock', icon: 'settings', hint: 'Einstellungen', action: () => toggleSettings(true) },
    { group: 'Befehle', title: 'Hintergrundbild ändern', sub: 'Eigenes Bild auswählen', icon: 'image', hint: 'Bild', action: () => refs.wallpaperInput.click() },
    { group: 'Befehle', title: 'Hintergrund-Pack wählen', sub: 'Ordner mit Bildern auswählen', icon: 'folder', hint: 'Ordner', action: () => refs.wallpaperPackInput.click() },
    { group: 'Befehle', title: 'Desktop-Symbole anordnen', sub: 'Symbole wieder im Raster ausrichten', icon: 'grid', hint: 'Ordnen', action: arrangeIcons },
    { group: 'Befehle', title: 'Lesezeichen aktualisieren', sub: 'Bookmarks und Verlauf neu laden', icon: 'refresh', hint: 'Laden', action: () => refreshData().catch(() => {}) },
    { group: 'Befehle', title: 'Widgets öffnen', sub: t('Fünf Widget-Typen verwalten'), icon: 'widgets', hint: 'Widgets', action: openWidgetsSettings },
    { group: 'Befehle', title: t('Hush Spaces öffnen'), sub: t('Lokale Arbeitsbereiche verwalten'), icon: 'spaces', hint: 'Spaces', action: openSpacesSettings },
    { group: 'Befehle', title: t('Space hinzufügen'), sub: t('Maximal drei Spaces'), icon: 'plus', hint: 'Space', action: addSpace },
    ...state.spaces.map((space) => ({
      group: 'Spaces',
      title: `${t('Zu Space wechseln')}: ${space.name}`,
      sub: space.id === state.activeSpaceId ? t('Aktiv') : t('Wechseln'),
      icon: 'grid',
      hint: 'Space',
      action: () => switchSpace(space.id)
    })),
    { group: 'Befehle', title: 'Backup exportieren', sub: 'Einstellungen, Symbole, Widgets und Spaces lokal sichern', icon: 'copy', hint: 'JSON', action: exportBackup }
  ];
}

function historyItemsFrom(entries = []) {
  return entries
    .filter((entry) => entry?.url && safeUrl(entry.url))
    .map((entry) => {
      const url = safeUrl(entry.url);
      return {
        id: `history:${hashString(normalizeUrl(url))}`,
        kind: 'recent',
        title: siteName(url, entry.title),
        fullTitle: entry.title || siteName(url),
        url,
        host: hostOf(url),
        favIconUrl: faviconForUrl(url),
        lastVisitTime: entry.lastVisitTime || Date.now(),
        visitCount: entry.visitCount || 1
      };
    });
}

async function buildSpotlightResults(query) {
  const q = query.trim();
  const commands = commandResults();
  if (!q) {
    const recent = state.recents.slice(0, 4).map((item) => ({
      group: 'Zuletzt besucht',
      title: item.title,
      sub: item.fullTitle || item.host || hostOf(item.url),
      hint: hostOf(item.url),
      url: item.url,
      bookmarkTitle: item.title,
      iconItem: item,
      action: () => openItem(item)
    }));
    const bookmarks = state.bookmarkList.slice(0, 5).map((item) => ({
      group: 'Lesezeichen',
      title: item.title,
      sub: item.pathLabel || hostOf(item.url) || 'Lesezeichen',
      hint: '↵',
      url: item.url,
      bookmarkTitle: item.title,
      iconItem: item,
      action: () => openItem(item)
    }));
    return [...commands.slice(0, 3), ...recent, ...bookmarks].slice(0, 12);
  }

  const matchedCommands = commands
    .map((result) => ({ result, score: Math.max(matchScore(result.title, q), matchScore(result.sub, q)) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ result }) => result);

  const matchedBookmarks = [...state.folderList, ...state.bookmarkList]
    .filter((item) => !(item.kind === 'folder' && item.folderId === state.rootId))
    .map((item) => ({
      item,
      score: Math.max(
        matchScore(item.title, q),
        matchScore(item.url || '', q),
        matchScore(item.pathLabel, q),
        matchScore(hostOf(item.url || ''), q)
      )
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || String(a.item.title).localeCompare(String(b.item.title), 'de'))
    .slice(0, 9)
    .map(({ item }) => ({
      group: item.kind === 'folder' ? 'Ordner' : 'Lesezeichen',
      title: item.title,
      sub: item.pathLabel || hostOf(item.url) || 'Ordner',
      hint: '↵',
      url: item.url,
      bookmarkTitle: item.title,
      iconItem: item,
      action: () => (item.kind === 'folder' ? openExplorer({ type: 'folder', id: item.folderId }) : openItem(item))
    }));

  let historyItems = state.recents;
  try {
    const raw = await api.searchHistory(q, 24);
    const found = historyItemsFrom(raw);
    if (found.length) historyItems = found;
  } catch {  }

  const matchedHistory = historyItems
    .map((item) => ({ item, score: Math.max(matchScore(item.title, q), matchScore(item.fullTitle, q), matchScore(item.url, q)) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || b.item.lastVisitTime - a.item.lastVisitTime)
    .slice(0, 6)
    .map(({ item }) => ({
      group: 'Verlauf',
      title: item.title,
      sub: item.fullTitle || hostOf(item.url),
      hint: hostOf(item.url),
      url: item.url,
      bookmarkTitle: item.title,
      iconItem: item,
      action: () => openItem(item)
    }));

  const webResults = [];
  const directUrl = urlFromQuery(q);
  if (directUrl) {
    webResults.push({
      group: 'Website öffnen',
      title: `Website öffnen: ${q}`,
      sub: directUrl,
      hint: '↵',
      url: directUrl,
      bookmarkTitle: siteName(directUrl) || q,
      icon: 'globe',
      action: () => openItem({ url: directUrl })
    });
  }
  const googleUrl = googleSearchUrl(q);
  webResults.push({
    group: 'Google-Suche',
    title: `Google-Suche öffnen: ${q}`,
    sub: `Mit Google suchen nach „${q}“`,
    hint: '↵',
    url: googleUrl,
    bookmarkTitle: q,
    icon: 'search',
    action: () => openItem({ url: googleUrl }, { newTab: true })
  });

  return [...matchedCommands, ...matchedBookmarks, ...webResults, ...matchedHistory].slice(0, 20);
}

async function renderSpotlightResults() {
  if (!refs.spotlightResults) return;
  const token = ++state.spotlight.token;
  let results = [];
  try {
    results = await buildSpotlightResults(refs.spotlightInput.value);
  } catch {
    results = [];
  }
  if (token !== state.spotlight.token) return;
  state.spotlight.results = results;
  state.spotlight.index = clamp(state.spotlight.index, 0, Math.max(0, results.length - 1));
  refs.spotlightResults.innerHTML = '';

  if (!results.length) {
    refs.spotlightResults.append(el('div', 'spotlight-empty', 'Keine Treffer. Versuche einen anderen Begriff.'));
    return;
  }

  let lastGroup = '';
  results.forEach((result, index) => {
    if (result.group !== lastGroup) {
      refs.spotlightResults.append(el('div', 'spotlight-group-title', result.group));
      lastGroup = result.group;
    }
    const node = el('div', `spotlight-result${index === state.spotlight.index ? ' is-selected' : ''}`);
    node.dataset.index = String(index);
    node.setAttribute('role', 'option');
    const iconWrap = el('div', 'spotlight-result__icon');
    if (result.iconItem) iconWrap.append(itemIcon(withFavicon(result.iconItem), 34));
    else iconWrap.append(iconEl(result.icon || 'spark', 'glyph'));
    node.append(iconWrap);
    const text = el('div', 'spotlight-result__text');
    text.append(el('span', 'spotlight-result__title', result.title));
    text.append(el('span', 'spotlight-result__sub', result.sub));
    node.append(text);
    if (result.hint) node.append(el('span', 'spotlight-result__hint', result.hint));
    refs.spotlightResults.append(node);
  });
}

async function addBookmarkFromResult(result) {
  if (!result?.url) return;
  try {
    await api.createBookmark(result.bookmarkTitle || result.title || result.url, result.url);
    await refreshData();
  } catch {
  }
}

function showSpotlightResultContextMenu(x, y, result) {
  if (!result?.url) return;
  const item = {
    kind: 'bookmark',
    title: result.bookmarkTitle || result.title || siteName(result.url),
    url: result.url
  };
  showItemContextMenu(x, y, item, 'spotlight');
  const menu = refs.contextMenu;
  if (menu?.classList.contains('is-open')) {
    const add = el('button', 'context-item');
    add.type = 'button';
    add.dataset.role = 'add-bookmark';
    add.append(iconEl('bookmarks', 'context-item__icon'));
    add.append(el('span', 'context-item__label', t('Als Lesezeichen hinzufügen')));
    add.addEventListener('click', () => {
      hideContextMenu();
      addBookmarkFromResult(result);
    });
    menu.append(add);
  }
}

function setSpotlightIndex(index) {
  if (!state.spotlight.results.length) return;
  state.spotlight.index = clamp(index, 0, state.spotlight.results.length - 1);
  $$('.spotlight-result', refs.spotlightResults).forEach((node, i) => {
    node.classList.toggle('is-selected', i === state.spotlight.index);
  });
  $$('.spotlight-result', refs.spotlightResults)[state.spotlight.index]?.scrollIntoView({ block: 'nearest' });
}

function executeSpotlightResult(index) {
  const result = state.spotlight.results[index];
  if (!result) return;
  closeSpotlight();
  result.action?.();
}

function openSpotlight() {
  if (state.captureShortcut) stopShortcutCapture();
  if (state.spotlight.open) {
    refs.spotlightInput.focus();
    return;
  }
  closeRenameDialog();
  closeDisplayEditor();
  toggleSettings(false);
  state.spotlight.open = true;
  state.spotlight.index = 0;
  refs.spotlightOverlay.classList.add('is-open');
  refs.spotlightOverlay.setAttribute('aria-hidden', 'false');
  refs.spotlightInput.value = '';
  renderSpotlightResults();
  setTimeout(() => refs.spotlightInput.focus(), 70);
}

function closeSpotlight() {
  if (!state.spotlight.open) return;
  state.spotlight.open = false;
  refs.spotlightOverlay.classList.remove('is-open');
  refs.spotlightOverlay.setAttribute('aria-hidden', 'true');
  refs.spotlightInput.blur();
}



function toggleSettings(force) {
  const wasOpen = !!refs.settingsWindow?.classList.contains('is-open');
  const open = typeof force === 'boolean' ? force : !wasOpen;
  if (open) createSettingsWindow();
  else if (!refs.settingsWindow) return;
  const win = refs.settingsWindow;
  win.classList.toggle('is-open', open);
  refs.settingsPanel.classList.toggle('is-open', open);
  win.setAttribute('aria-hidden', open ? 'false' : 'true');
  refs.settingsPanel.setAttribute('aria-hidden', open ? 'false' : 'true');
  if (!open && state.captureShortcut) stopShortcutCapture();
  if (open) {
    closeRenameDialog();
    hideContextMenu();
    switchSettingsTab('settings');
    focusWindow(win.dataset.windowId);
  } else {
    state.displayEditor.open = false;
    refs.displayEditorStage?.classList.remove('is-active');
    document.body.classList.remove('editor-open');
    win.classList.remove('is-focused');
    if (activeWindowId === win.dataset.windowId) activeWindowId = null;
    focusTopWindow();
  }
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error('Lesefehler'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Bild konnte nicht geladen werden.'));
    image.src = src;
  });
}

async function compressWallpaper(file) {
  const source = await readFileAsDataURL(file);
  const image = await loadImage(source);
  const scale = Math.min(1, 1920 / image.naturalWidth, 1200 / image.naturalHeight);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0b0912';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  let output = canvas.toDataURL('image/jpeg', 0.84);
  if (output.length > 4_000_000) output = canvas.toDataURL('image/jpeg', 0.68);
  return output;
}

async function handleWallpaperFile(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    return;
  }
  try {
    const dataUrl = await compressWallpaper(file);
    await clearWallpaperVideo(true);
    await clearWallpaperPack(true);
    updateSettings({ wallpaper: dataUrl });
  } catch (error) {
  } finally {
    refs.wallpaperInput.value = '';
  }
}

async function handleCustomFontFile(file) {
  if (!file) return;
  const valid = /\.(woff2|ttf|otf)$/i.test(file.name) || /^font\//i.test(file.type);
  if (!valid) {
    refs.customFontInput.value = '';
    return;
  }
  try {
    const dataUrl = await readFileAsDataURL(file);
    if (!dataUrl.startsWith('data:font/')) throw new Error('invalid font');
    updateSettings({ font: 'custom', customFont: dataUrl });
  } catch {
  } finally {
    refs.customFontInput.value = '';
  }
}



function positionEditorHandles() {
  if (!state.displayEditor.open) return;
  const dockRect = refs.dockWrap.getBoundingClientRect();
  const clockRect = refs.clockDisplay.getBoundingClientRect();
  const place = (node, rect, pad = 8) => {
    const left = clamp(rect.left - pad, 0, Math.max(0, window.innerWidth - 20));
    const top = clamp(rect.top - pad, 0, Math.max(0, window.innerHeight - 20));
    node.style.left = `${left}px`;
    node.style.top = `${top}px`;
    node.style.width = `${clamp(rect.width + pad * 2, 20, Math.max(20, window.innerWidth - left))}px`;
    node.style.height = `${clamp(rect.height + pad * 2, 20, Math.max(20, window.innerHeight - top))}px`;
  };
  place(refs.editorDockHandle, dockRect, 10);
  place(refs.editorClockHandle, clockRect, 8);
}

function positionEditorBar() {
  if (!state.displayEditor.open || !refs.displayEditorBar) return;
  const bar = refs.displayEditorBar;
  if (bar.closest('.settings-window')) return;
  const dock = refs.dockWrap.getBoundingClientRect();
  const rect = bar.getBoundingClientRect();
  const side = effectiveDockSide();
  const maxLeft = Math.max(12, window.innerWidth - rect.width - 12);
  const maxTop = Math.max(12, window.innerHeight - rect.height - 12);
  let left = clamp((window.innerWidth - rect.width) / 2, 12, maxLeft);
  let top = 16;
  const overlaps = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  const barAt = (x, y) => ({ left: x, right: x + rect.width, top: y, bottom: y + rect.height });
  if (side === 'top' && overlaps(barAt(left, top), dock)) top = dock.bottom + 12;
  else if (side === 'bottom' && overlaps(barAt(left, top), dock)) top = dock.top - rect.height - 12;
  else if (side === 'left' && overlaps(barAt(left, top), dock)) left = dock.right + 12;
  else if (side === 'right' && overlaps(barAt(left, top), dock)) left = dock.left - rect.width - 12;
  bar.style.left = `${clamp(left, 12, maxLeft)}px`;
  bar.style.top = `${clamp(top, 12, maxTop)}px`;
  bar.style.transform = 'none';
}

function updateEditorDockButtons() {
  $$('[data-dock-side]', refs.displayEditorBar).forEach((button) => {
    button.classList.toggle('is-active', button.dataset.dockSide === state.settings.dockSide);
  });
}

function openDisplayEditor() {
  closeRenameDialog();
  closeSpotlight();
  hideContextMenu();
  toggleSettings(true);
  switchSettingsTab('editor');
  document.body.classList.add('editor-open');
  syncDockVisibility();
  requestAnimationFrame(() => {
    positionEditorHandles();
    positionEditorBar();
  });
}

function closeDisplayEditor() {
  state.displayEditor.open = false;
  state.displayEditor.drag = null;
  refs.displayEditor?.classList.remove('is-open');
  refs.displayEditor?.setAttribute('aria-hidden', 'true');
  refs.displayEditorStage?.classList.remove('is-active');
  document.body.classList.remove('editor-open');
  syncDockVisibility();
  toggleSettings(false);
}

function setDockSide(side) {
  if (!DOCK_SIDES.includes(side)) return;
  updateSettings({ dockSide: side });
  updateEditorDockButtons();
  requestAnimationFrame(() => {
    positionEditorHandles();
    positionEditorBar();
  });
}

function resetLayout() {
  updateSettings({
    dockSide: 'bottom',
    clockX: 0.5,
    clockY: 0.035,
    clockScale: 1,
    dockAlign: 'center'
  });
  updateEditorDockButtons();
  requestAnimationFrame(() => {
    positionEditorHandles();
    positionEditorBar();
  });
}

function nearestDockSide(x, y) {
  const distances = [
    { side: 'top', value: y },
    { side: 'bottom', value: window.innerHeight - y },
    { side: 'left', value: x },
    { side: 'right', value: window.innerWidth - x }
  ];
  distances.sort((a, b) => a.value - b.value);
  return distances[0]?.side || 'bottom';
}

function startEditorDrag(event) {
  if (!state.displayEditor.open || event.button !== 0) return;
  const resize = event.target.closest('[data-editor-resize]');
  const handle = event.target.closest('[data-editor-drag]');
  if (!handle && !resize) return;
  event.preventDefault();
  event.stopPropagation();

  const kind = resize ? 'resize' : handle?.dataset.editorDrag;
  if (!kind) return;
  const startX = event.clientX;
  const startY = event.clientY;
  const startScale = state.settings.clockScale;
  const startDistance = Math.max(24, Math.hypot(
    startX - window.innerWidth * state.settings.clockX,
    startY - window.innerHeight * state.settings.clockY
  ));
  state.displayEditor.drag = { kind, startX, startY, startScale, startDistance };

  const move = (moveEvent) => {
    const data = state.displayEditor.drag;
    if (!data) return;
    if (data.kind === 'dock') {
      const preview = nearestDockSide(moveEvent.clientX, moveEvent.clientY);
      $$('[data-dock-side]', refs.displayEditorBar).forEach((button) => {
        button.classList.toggle('is-preview', button.dataset.dockSide === preview);
      });
      refs.editorDockHandle.dataset.preview = preview;
    } else if (data.kind === 'clock') {
      const x = clamp(moveEvent.clientX / window.innerWidth, 0.03, 0.97);
      const y = clamp(moveEvent.clientY / window.innerHeight, 0.02, 0.9);
      document.documentElement.style.setProperty('--clock-x', String(x));
      document.documentElement.style.setProperty('--clock-y', String(y));
      positionEditorHandles();
    } else if (data.kind === 'resize') {
      const distance = Math.max(24, Math.hypot(
        moveEvent.clientX - window.innerWidth * state.settings.clockX,
        moveEvent.clientY - window.innerHeight * state.settings.clockY
      ));
      const scale = clamp(data.startScale * (distance / data.startDistance), CLOCK_SCALE_MIN, CLOCK_SCALE_MAX);
      document.documentElement.style.setProperty('--clock-scale', String(scale));
      const percent = Math.round(scale * 100);
      refs.setClockScale.value = String(percent);
      refs.setClockScaleValue.textContent = `${percent} %`;
      positionEditorHandles();
    }
  };

  const up = (upEvent) => {
    const data = state.displayEditor.drag;
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
    state.displayEditor.drag = null;
    $$('[data-dock-side]', refs.displayEditorBar).forEach((button) => button.classList.remove('is-preview'));
    if (!data) return;
    if (data.kind === 'dock') {
      setDockSide(nearestDockSide(upEvent.clientX, upEvent.clientY));
    } else {
      const x = clamp(Number(document.documentElement.style.getPropertyValue('--clock-x')) || state.settings.clockX, 0.03, 0.97);
      const y = clamp(Number(document.documentElement.style.getPropertyValue('--clock-y')) || state.settings.clockY, 0.02, 0.9);
      const scale = clamp(Number(document.documentElement.style.getPropertyValue('--clock-scale')) || state.settings.clockScale, CLOCK_SCALE_MIN, CLOCK_SCALE_MAX);
      updateSettings({ clockX: x, clockY: y, clockScale: scale });
    }
  };

  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
}

function showAbout() {
  const source = `Hush ${APP_VERSION} · ${shortcutLabel()} öffnet die Suche · F2 benennt Desktop-Symbole um`;
}



function pendingDrag({ event, sourceEl, item, source, mode }) {
  if (drag.pending || drag.active || event.button !== 0) return;
  drag.pending = true;
  drag.active = false;
  drag.pointerId = event.pointerId;
  drag.mode = mode;
  drag.source = source;
  drag.sourceEl = sourceEl;
  drag.item = { ...item };
  drag.startX = event.clientX;
  drag.startY = event.clientY;
  drag.pointerX = event.clientX;
  drag.pointerY = event.clientY;
  drag.currentX = event.clientX;
  drag.currentY = event.clientY;
  drag.vx = 0;
  drag.vy = 0;
  drag.targetDX = 0;
  drag.targetDY = 0;
  drag.currentDX = 0;
  drag.currentDY = 0;
  drag.vdx = 0;
  drag.vdy = 0;
  drag.drop = '';
  drag.hotEl = null;
  drag.startCol = source === 'desktop' && item.col != null ? item.col : 0;
  drag.startRow = source === 'desktop' && item.row != null ? item.row : 0;

  window.addEventListener('pointermove', onDragPointerMove, { passive: false });
  window.addEventListener('pointerup', onDragPointerUp);
  window.addEventListener('pointercancel', onDragPointerCancel);
}

function onDragPointerMove(event) {
  if (drag.pointerId != null && event.pointerId !== drag.pointerId) return;
  drag.pointerX = event.clientX;
  drag.pointerY = event.clientY;
  const dx = drag.pointerX - drag.startX;
  const dy = drag.pointerY - drag.startY;

  if (!drag.active) {
    if (Math.hypot(dx, dy) < 7) return;
    beginDrag();
  }
  event.preventDefault();
  drag.targetDX = dx;
  drag.targetDY = dy;
  updateHotTarget();
}

function beginDrag() {
  drag.active = true;
  drag.pending = false;
  state.suppressClickUntil = performance.now() + 1200;
  document.body.classList.add('is-dragging');
  hideDockTooltip();
  hideContextMenu();

  if (drag.mode === 'move') {
    drag.sourceEl.classList.add('is-dragging-icon');
    drag.sourceEl.style.transition = 'none';
    drag.currentDX = 0;
    drag.currentDY = 0;
    drag.vdx = 0;
    drag.vdy = 0;
  } else {
    drag.sourceEl.classList.add('is-dragging');
    showGhost(drag.item);
  }
  drag.raf = requestAnimationFrame(dragFrame);
}

function showGhost(item) {
  const ghost = refs.dragGhost;
  const token = uid('ghost');
  drag.ghostToken = token;
  ghost.dataset.token = token;
  ghost.innerHTML = '';
  ghost.append(itemIcon(withFavicon(item), state.settings.iconSize));
  ghost.classList.remove('is-dropping');
  ghost.classList.add('is-visible');
  drag.currentX = drag.startX;
  drag.currentY = drag.startY;
  drag.vx = 0;
  drag.vy = 0;
}

function fadeGhost() {
  const ghost = refs.dragGhost;
  const token = ghost.dataset.token;
  ghost.classList.add('is-dropping');
  setTimeout(() => {
    if (ghost.dataset.token !== token) return;
    ghost.classList.remove('is-visible', 'is-dropping');
    ghost.innerHTML = '';
  }, 320);
}

function dragFrame() {
  if (!drag.active) return;
  if (drag.mode === 'copy') {
    drag.vx = (drag.vx + (drag.pointerX - drag.currentX) * 0.22) * 0.72;
    drag.vy = (drag.vy + (drag.pointerY - drag.currentY) * 0.22) * 0.72;
    drag.currentX += drag.vx;
    drag.currentY += drag.vy;
    const rotation = clamp((drag.pointerX - drag.currentX) * 0.13, -12, 12);
    const ghost = refs.dragGhost;
    const half = numberOr(state.settings.iconSize, ICON_SIZE_DEFAULT) / 2;
    ghost.style.setProperty('--ghost-x', `${drag.currentX - half}px`);
    ghost.style.setProperty('--ghost-y', `${drag.currentY - half}px`);
    ghost.style.setProperty('--ghost-rot', `${rotation.toFixed(2)}deg`);
  } else {
    drag.vdx = (drag.vdx + (drag.targetDX - drag.currentDX) * 0.24) * 0.70;
    drag.vdy = (drag.vdy + (drag.targetDY - drag.currentDY) * 0.24) * 0.70;
    drag.currentDX += drag.vdx;
    drag.currentDY += drag.vdy;
    const rotation = clamp((drag.targetDX - drag.currentDX) * 0.018, -7, 7);
    drag.sourceEl.style.transform = `translate3d(${drag.currentDX}px, ${drag.currentDY}px, 0) scale(1.075) rotate(${rotation.toFixed(2)}deg)`;
  }
  drag.raf = requestAnimationFrame(dragFrame);
}

function clearDropHighlight() {
  refs.desktopSurface.classList.remove('drop-active');
  refs.dockWrap.classList.remove('drop-active');
}

function updateHotTarget() {
  const under = document.elementFromPoint(drag.pointerX, drag.pointerY);
  const targetEl = under?.closest?.('[data-drop]') || null;
  const drop = targetEl?.dataset.drop || '';
  if (drop === drag.drop && targetEl === drag.hotEl) return;
  clearDropHighlight();
  drag.drop = drop;
  drag.hotEl = targetEl;
  if (drop === 'desktop') refs.desktopSurface.classList.add('drop-active');
  if (drop === 'dock') refs.dockWrap.classList.add('drop-active');
}

function finishDrag(drop) {
  if (drag.mode === 'move') finishDesktopMove(drop);
  else finishCopyDrag(drop);
}

function commitDesktopMove(col, row, freeX = null, freeY = null, base = null) {
  const source = drag.sourceEl;
  const item = state.desktop.find((entry) => entry.id === source?.dataset.id);
  if (!item) return;
  const metrics = gridMetrics();
  if (freeX == null) {
    item.col = col;
    item.row = row;
    item.freePos = false;
    item.exactPos = false;
    const pos = slotToPx(col, row, metrics);
    item.x = pos.left;
    item.y = pos.top;
  } else {
    item.x = Math.round(freeX);
    item.y = Math.round(freeY);
    item.freePos = true;
    item.exactPos = true;
  }
  persistNow();
  renderDesktop(false);
}

function animateSourceRemoval(callback) {
  callback();
}

function finishDesktopMove(drop) {
  if (drop === 'dock') {
    pinToDock(drag.item);
    renderDesktop(false);
    return;
  }
  if (drop === 'remove') {
    animateSourceRemoval(() => removeFromDesktop(drag.sourceEl?.dataset.id));
    return;
  }
  if (drop === 'desktop') {
    const metrics = gridMetrics();
    const source = drag.sourceEl;
    const item = state.desktop.find((entry) => entry.id === source?.dataset.id);
    if (!item) { renderDesktop(false); return; }
    const useFree = !state.settings.gridEnabled || (item.exactPos === true && item.freePos === true);
    if (useFree) {
      const base = desktopPosition(item, metrics);
      const freeX = Math.round(clamp(base.left + drag.targetDX, 0, Math.max(0, metrics.width - iconBoxWidth())));
      const freeY = Math.round(clamp(base.top + drag.targetDY, 0, Math.max(0, metrics.height - iconBoxHeight())));
      if (Math.abs(freeX - base.left) >= 1 || Math.abs(freeY - base.top) >= 1) commitDesktopMove(drag.startCol, drag.startRow, freeX, freeY, base);
      else renderDesktop(false);
      return;
    }
    const col = clamp(drag.startCol + Math.round(drag.targetDX / metrics.cellW), 0, metrics.cols - 1);
    const row = clamp(drag.startRow + Math.round(drag.targetDY / metrics.cellH), 0, metrics.rows - 1);
    if (col === drag.startCol && row === drag.startRow) renderDesktop(false);
    else commitDesktopMove(col, row);
    return;
  }
  renderDesktop(false);
}

function finishCopyDrag(drop) {
  fadeGhost();
  const item = drag.item;
  if (drop === 'desktop') {
    const position = desktopDropPosition(drag.pointerX, drag.pointerY);
    addToDesktop(item, { position, silent: true });
  } else if (drop === 'dock') pinToDock(item);
  else if (drop === 'remove') removeShortcutEverywhere(item);
}

function onDragPointerUp(event) {
  if (drag.pointerId != null && event.pointerId !== drag.pointerId) return;
  drag.pointerX = event.clientX;
  drag.pointerY = event.clientY;
  if (!drag.active) {
    cleanupPendingDrag();
    return;
  }
  drag.targetDX = drag.pointerX - drag.startX;
  drag.targetDY = drag.pointerY - drag.startY;
  updateHotTarget();
  finishDrag(drag.drop);
  cleanupDrag();
  state.suppressClickUntil = performance.now() + 430;
}

function onDragPointerCancel() {
  if (drag.active) {
    if (drag.mode === 'move') renderDesktop(false);
    else fadeGhost();
  }
  cleanupDrag();
  state.suppressClickUntil = performance.now() + 250;
}

function cleanupPendingDrag() {
  window.removeEventListener('pointermove', onDragPointerMove);
  window.removeEventListener('pointerup', onDragPointerUp);
  window.removeEventListener('pointercancel', onDragPointerCancel);
  drag.pending = false;
  drag.active = false;
  drag.pointerId = null;
  drag.sourceEl = null;
  drag.item = null;
}

function cleanupDrag() {
  cancelAnimationFrame(drag.raf);
  drag.raf = 0;
  window.removeEventListener('pointermove', onDragPointerMove);
  window.removeEventListener('pointerup', onDragPointerUp);
  window.removeEventListener('pointercancel', onDragPointerCancel);
  clearDropHighlight();
  document.body.classList.remove('is-dragging');
  drag.sourceEl?.classList.remove('is-dragging', 'is-dragging-icon');
  drag.active = false;
  drag.pending = false;
  drag.pointerId = null;
  drag.drop = '';
  drag.hotEl = null;
  drag.sourceEl = null;
  drag.item = null;

  if (state.pendingRefresh) {
    state.pendingRefresh = false;
    setTimeout(() => refreshData().catch(() => {}), 100);
  }
}





function widgetTitle(type) {
  const labels = {
    note: 'Notiz', tasks: 'Aufgaben', timer: 'Timer', calendar: 'Kalender', worldclock: 'Weltuhr'
  };
  return t(labels[type] || 'Widget');
}

function defaultWidgetData(type) {
  if (type === 'note') return { text: '' };
  if (type === 'tasks') return { items: [] };
  if (type === 'timer') return { minutes: 25, remaining: 1500, running: false, endsAt: null };
  if (type === 'worldclock') return { zone: WIDGET_TIMEZONES[0] };
  return {};
}

function formatTimer(value) {
  const total = Math.max(0, Math.round(numberOr(value, 0)));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function sanitizeWidgets(raw) {
  if (!Array.isArray(raw)) return null;
  const seen = new Set();
  const result = [];
  for (const entry of raw.slice(0, 12)) {
    if (!entry || !WIDGET_TYPES.includes(entry.type)) continue;
    let id = typeof entry.id === 'string' && /^[\w:-]{1,64}$/.test(entry.id) ? entry.id : uid('widget');
    if (seen.has(id)) id = uid('widget');
    seen.add(id);
    const size = WIDGET_DEFAULT_SIZES[entry.type] || WIDGET_DEFAULT_SIZES.note;
    const w = Math.round(clamp(numberOr(entry.w, size.w), WIDGET_MIN_W, WIDGET_MAX_W));
    const h = Math.round(clamp(numberOr(entry.h, size.h), WIDGET_MIN_H, WIDGET_MAX_H));
    const x = clamp(numberOr(entry.x, 0.68), 0, 0.94);
    const y = clamp(numberOr(entry.y, 0.18), 0, 0.86);
    const data = entry.data && typeof entry.data === 'object' ? entry.data : {};
    let cleanData = {};
    if (entry.type === 'note') {
      cleanData = { text: String(data.text || '').slice(0, 4000) };
    } else if (entry.type === 'tasks') {
      cleanData = {
        items: (Array.isArray(data.items) ? data.items : []).slice(0, 40).map((item) => ({
          id: String(item?.id || uid('task')).slice(0, 64),
          text: String(item?.text || '').trim().slice(0, 140),
          done: item?.done === true
        })).filter((item) => item.text)
      };
    } else if (entry.type === 'timer') {
      const minutes = [5, 15, 25, 45, 60].includes(Number(data.minutes)) ? Number(data.minutes) : 25;
      const endsAt = Number(data.endsAt);
      const running = data.running === true && Number.isFinite(endsAt) && endsAt > Date.now();
      const remaining = running
        ? clamp(Math.ceil((endsAt - Date.now()) / 1000), 0, 3600)
        : Math.round(clamp(numberOr(data.remaining, minutes * 60), 0, 3600));
      cleanData = { minutes, remaining, running, endsAt: running ? endsAt : null };
    } else if (entry.type === 'worldclock') {
      cleanData = { zone: WIDGET_TIMEZONES.includes(data.zone) ? data.zone : WIDGET_TIMEZONES[0] };
    }
    result.push({ id, type: entry.type, x, y, w, h, data: cleanData });
  }
  return result;
}

function applyWidgetVisibility() {
  document.body.classList.toggle('widgets-disabled', !state.settings.widgetsEnabled);
}

function positionWidgetNode(node, widget) {
  const viewportW = window.innerWidth || 1280;
  const viewportH = window.innerHeight || 720;
  const maxX = Math.max(0, 1 - (widget.w + 16) / viewportW);
  const maxY = Math.max(0, 1 - (widget.h + 16) / viewportH);
  widget.x = clamp(widget.x, 0, maxX);
  widget.y = clamp(widget.y, 0, maxY);
  node.style.left = `${(widget.x * 100).toFixed(3)}%`;
  node.style.top = `${(widget.y * 100).toFixed(3)}%`;
  node.style.width = `${widget.w}px`;
  node.style.height = `${widget.h}px`;
}

function renderCalendar(container) {
  if (!container) return;
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const dayCount = new Date(year, month + 1, 0).getDate();
  const label = el('div', 'hush-widget__calendar-label');
  label.textContent = new Intl.DateTimeFormat(locale(), { month: 'long', year: 'numeric' }).format(now);
  container.append(label);
  const weekday = new Intl.DateTimeFormat(locale(), { weekday: 'short' });
  for (let index = 0; index < 7; index += 1) {
    const head = el('span', 'hush-widget__calendar-head');
    head.textContent = weekday.format(new Date(2024, 0, 1 + index));
    container.append(head);
  }
  for (let index = 0; index < startOffset; index += 1) container.append(el('span', 'hush-widget__calendar-empty'));
  for (let day = 1; day <= dayCount; day += 1) {
    const cell = el('span', 'hush-widget__calendar-day');
    cell.textContent = String(day);
    if (day === now.getDate()) cell.classList.add('is-today');
    container.append(cell);
  }
}

function widgetMarkup(widget) {
  const data = widget.data || {};
  const icon = WIDGET_ICONS[widget.type] || 'grid';
  const title = escapeXml(widgetTitle(widget.type));
  const removeLabel = escapeXml(t('Widget entfernen'));
  const resizeLabel = escapeXml(t('Größe ändern'));
  const head = `<div class="hush-widget__head" data-widget-role="drag"><span class="glyph" data-icon="${icon}"></span><strong>${title}</strong><button type="button" class="hush-widget__button" data-widget-action="remove" aria-label="${removeLabel}" title="${removeLabel}"><span class="glyph" data-icon="close"></span></button></div>`;
  let body = '';
  if (widget.type === 'note') {
    body = `<textarea class="hush-widget__note" data-widget-role="note" maxlength="4000" spellcheck="false" placeholder="${escapeXml(t('Gedanken, Notizen, Ideen …'))}" aria-label="${title}"></textarea>`;
  } else if (widget.type === 'tasks') {
    const items = Array.isArray(data.items) ? data.items : [];
    const taskRemoveLabel = escapeXml(t('Aufgabe entfernen'));
    const rows = items.map((item) => `<div class="hush-widget__task${item.done ? ' is-done' : ''}" data-task-id="${escapeXml(item.id)}"><input type="checkbox" data-widget-role="task-check" ${item.done ? 'checked' : ''} aria-label="${escapeXml(t('Aufgabe erledigt'))}"><span>${escapeXml(item.text)}</span><button type="button" class="hush-widget__task-remove" data-task-action="remove" aria-label="${taskRemoveLabel}" title="${taskRemoveLabel}"><span class="glyph" data-icon="close"></span></button></div>`).join('');
    body = `<div class="hush-widget__tasks" data-widget-role="tasks">${rows}</div><form class="hush-widget__task-form" data-widget-role="task-form"><input type="text" data-widget-role="task-input" maxlength="140" autocomplete="off" spellcheck="false" placeholder="${escapeXml(t('Neue Aufgabe'))}" aria-label="${escapeXml(t('Neue Aufgabe'))}"><button type="submit" class="settings-button settings-button--small" aria-label="${escapeXml(t('Aufgabe hinzufügen'))}"><span class="glyph" data-icon="plus"></span></button></form>`;
  } else if (widget.type === 'timer') {
    const minutes = [5, 15, 25, 45, 60].map((value) => `<option value="${value}" ${Number(data.minutes) === value ? 'selected' : ''}>${value} ${escapeXml(t('Minuten'))}</option>`).join('');
    body = `<div class="hush-widget__timer-display" data-widget-role="timer-display">${formatTimer(data.remaining)}</div><div class="hush-widget__timer-controls"><button type="button" class="settings-button settings-button--small" data-widget-action="timer-start">${escapeXml(t(data.running ? 'Pause' : 'Start'))}</button><button type="button" class="settings-button settings-button--small" data-widget-action="timer-reset">${escapeXml(t('Zurücksetzen'))}</button><select class="settings-select" data-widget-role="timer-minutes" aria-label="${escapeXml(t('Minuten'))}">${minutes}</select></div>`;
  } else if (widget.type === 'calendar') {
    body = `<div class="hush-widget__calendar" data-widget-role="calendar"></div>`;
  } else if (widget.type === 'worldclock') {
    const zones = WIDGET_TIMEZONES.map((zone) => `<option value="${escapeXml(zone)}" ${zone === data.zone ? 'selected' : ''}>${escapeXml(zone.replace(/_/g, ' '))}</option>`).join('');
    body = `<div class="hush-widget__worldclock-time" data-widget-role="worldclock-time">--:--:--</div><div class="hush-widget__worldclock-zone" data-widget-role="worldclock-zone-label"></div><select class="settings-select" data-widget-role="worldclock-zone" aria-label="${escapeXml(t('Zeitzone'))}">${zones}</select>`;
  }
  return `${head}<div class="hush-widget__body">${body}</div><span class="hush-widget__resize" data-widget-role="resize" title="${resizeLabel}" aria-label="${resizeLabel}"></span>`;
}

function renderWidgets() {
  if (!refs.widgetLayer) return;
  refs.widgetLayer.innerHTML = '';
  if (!state.settings.widgetsEnabled) {
    applyWidgetVisibility();
    tickWidgets();
    return;
  }
  state.widgets.forEach((widget, index) => {
    const node = el('section', `hush-widget hush-widget--${widget.type}`);
    node.dataset.widgetId = widget.id;
    node.style.zIndex = String(index + 1);
    node.innerHTML = widgetMarkup(widget);
    positionWidgetNode(node, widget);
    refs.widgetLayer.append(node);
    const note = $('[data-widget-role="note"]', node);
    if (note) note.value = widget.data?.text || '';
    if (widget.type === 'calendar') renderCalendar($('[data-widget-role="calendar"]', node));
  });
  hydrateIcons(refs.widgetLayer);
  applyWidgetVisibility();
  tickWidgets();
}

function updateWorldClocks() {
  const now = new Date();
  $$('.hush-widget--worldclock', refs.widgetLayer).forEach((node) => {
    const widget = findWidget(node.dataset.widgetId);
    const zone = WIDGET_TIMEZONES.includes(widget?.data?.zone) ? widget.data.zone : WIDGET_TIMEZONES[0];
    const time = $('[data-widget-role="worldclock-time"]', node);
    const label = $('[data-widget-role="worldclock-zone-label"]', node);
    try {
      if (time) time.textContent = new Intl.DateTimeFormat(locale(), {
        timeZone: zone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
      }).format(now);
    } catch {
      if (time) time.textContent = '--:--:--';
    }
    if (label) label.textContent = zone.replace(/_/g, ' ');
  });
}

function tickWidgets() {
  clearTimeout(widgetTimerId);
  widgetTimerId = 0;
  let anyRunning = false;
  let anyClock = false;
  const nodes = $$('.hush-widget', refs.widgetLayer);
  state.widgets.forEach((widget) => {
    if (widget.type === 'timer') {
      const data = widget.data;
      if (data.running) {
        const remaining = Math.max(0, Math.ceil((Number(data.endsAt) - Date.now()) / 1000));
        if (remaining <= 0) {
          data.running = false;
          data.remaining = 0;
          data.endsAt = null;
          persist();
        } else {
          data.remaining = remaining;
          anyRunning = true;
        }
      }
      const node = nodes.find((item) => item.dataset.widgetId === widget.id);
      const display = node ? $('[data-widget-role="timer-display"]', node) : null;
      if (display) display.textContent = formatTimer(data.remaining);
      const startButton = node ? $('[data-widget-action="timer-start"]', node) : null;
      if (startButton) startButton.textContent = t(data.running ? 'Pause' : 'Start');
    } else if (widget.type === 'worldclock') {
      anyClock = true;
    }
  });
  updateWorldClocks();
  if (anyRunning) widgetTimerId = setTimeout(tickWidgets, 250);
  else if (anyClock) widgetTimerId = setTimeout(tickWidgets, 1000);
}

function startWidgetTimer(widget) {
  const data = widget.data;
  if (data.running) {
    data.remaining = Math.max(0, Math.ceil((Number(data.endsAt) - Date.now()) / 1000));
    data.running = false;
    data.endsAt = null;
  } else {
    if (!data.remaining || data.remaining <= 0) data.remaining = data.minutes * 60;
    data.running = true;
    data.endsAt = Date.now() + data.remaining * 1000;
  }
  persist();
  tickWidgets();
}

function resetWidgetTimer(widget, minutes) {
  const data = widget.data;
  if (minutes !== undefined) data.minutes = [5, 15, 25, 45, 60].includes(Number(minutes)) ? Number(minutes) : 25;
  data.remaining = data.minutes * 60;
  data.running = false;
  data.endsAt = null;
  persist();
  tickWidgets();
}

function findWidget(id) {
  return state.widgets.find((widget) => widget.id === id) || null;
}

function addWidget(type) {
  if (!WIDGET_TYPES.includes(type)) type = 'note';
  if (state.widgets.length >= 12) {
    setWidgetsStatus(t('Maximal 12 Widgets'));
    return;
  }
  const size = WIDGET_DEFAULT_SIZES[type];
  const step = state.widgets.length % 4;
  const widget = {
    id: uid('widget'),
    type,
    x: clamp(0.68 + step * 0.035, 0, 0.86),
    y: clamp(0.16 + step * 0.045, 0, 0.72),
    w: size.w,
    h: size.h,
    data: defaultWidgetData(type)
  };
  state.widgets.push(widget);
  persist();
  renderWidgets();
  syncWidgetsPane();
}

function removeWidget(id) {
  state.widgets = state.widgets.filter((widget) => widget.id !== id);
  persist();
  renderWidgets();
  syncWidgetsPane();
}

function resetWidgets() {
  state.widgets = [];
  persist();
  renderWidgets();
  syncWidgetsPane();
  setWidgetsStatus(t('Widgets geleert'));
}

function setWidgetsStatus(text) {
  const status = refs.settingsWidgetsTab ? $('[data-widget-role="status"]', refs.settingsWidgetsTab) : null;
  if (status) status.textContent = text;
}

function syncWidgetsPane() {
  const pane = refs.settingsWidgetsTab;
  if (!pane) return;
  const enabled = $('[data-widget-role="enabled"]', pane);
  if (enabled) enabled.checked = state.settings.widgetsEnabled;
  const count = $('[data-widget-role="count"]', pane);
  if (count) count.textContent = String(state.widgets.length);
  const type = $('[data-widget-role="type"]', pane);
  if (type && !WIDGET_TYPES.includes(type.value)) type.value = 'note';
}

function bindWidgetsPane(pane) {
  pane.addEventListener('click', (event) => {
    const action = event.target.closest('[data-widget-action]')?.dataset.widgetAction;
    if (!action) return;
    if (action === 'add') {
      const type = $('[data-widget-role="type"]', pane)?.value || 'note';
      addWidget(type);
    } else if (action === 'reset') {
      resetWidgets();
    } else if (action === 'export') {
      exportBackup();
    } else if (action === 'import') {
      $('[data-widget-role="import-file"]', pane)?.click();
    }
  });
  pane.addEventListener('change', (event) => {
    const target = event.target;
    const role = target.dataset?.widgetRole;
    if (role === 'enabled') updateSettings({ widgetsEnabled: target.checked });
    else if (role === 'import-file') {
      const file = target.files?.[0];
      target.value = '';
      importBackup(file);
    }
  });
}

function activeSpace() {
  return state.spaces.find((space) => space.id === state.activeSpaceId) || state.spaces[0] || null;
}

function findSpace(id) {
  return state.spaces.find((space) => space.id === id) || null;
}

function sanitizeSpaces(raw, activeId, fallback = {}) {
  const fallbackSettings = sanitizeSettings(fallback.settings || {});
  fallbackSettings.settingsVersion = 12;
  const fallbackDesktop = sanitizeShortcuts(fallback.desktop, 'desktop') || [];
  const fallbackPinned = sanitizeShortcuts(fallback.pinned, 'pinned') || [];
  const fallbackWidgets = sanitizeWidgets(fallback.widgets) || [];
  const base = {
    id: DEFAULT_SPACE_ID,
    name: t('Hauptbereich'),
    color: SPACE_COLORS[0],
    settings: fallbackSettings,
    desktop: fallbackDesktop,
    pinned: fallbackPinned,
    widgets: fallbackWidgets.filter((widget) => WIDGET_TYPES.includes(widget.type))
  };
  if (!Array.isArray(raw)) return { spaces: [base], activeSpaceId: base.id };
  const seen = new Set();
  const spaces = [];
  for (const entry of raw.slice(0, MAX_SPACES)) {
    if (!entry || typeof entry !== 'object') continue;
    let id = typeof entry.id === 'string' && /^[\w:-]{1,64}$/.test(entry.id) ? entry.id : uid('space');
    if (seen.has(id)) id = uid('space');
    seen.add(id);
    const settings = sanitizeSettings(entry.settings || fallbackSettings);
    settings.settingsVersion = 12;
    const desktop = sanitizeShortcuts(entry.desktop, 'desktop') || [];
    const pinned = sanitizeShortcuts(entry.pinned, 'pinned') || [];
    const widgets = sanitizeWidgets(entry.widgets) || [];
    spaces.push({
      id,
      name: String(entry.name || '').trim().slice(0, 32) || t('Space'),
      color: SPACE_COLORS.includes(entry.color) ? entry.color : SPACE_COLORS[spaces.length % SPACE_COLORS.length],
      settings,
      desktop,
      pinned,
      widgets: widgets.filter((widget) => WIDGET_TYPES.includes(widget.type))
    });
  }
  if (!spaces.length) spaces.push(base);
  const activeSpaceId = spaces.some((space) => space.id === activeId) ? activeId : spaces[0].id;
  return { spaces, activeSpaceId };
}

function captureActiveSpace() {
  const space = activeSpace();
  if (!space) return;
  space.settings = clone(state.settings);
  space.settings.settingsVersion = 12;
  space.desktop = clone(state.desktop);
  space.pinned = clone(state.pinned);
  space.widgets = clone(state.widgets);
}

function spacesPaneMarkup() {
  return `
    <section class="settings-group">
      <h3>${escapeXml(t('Hush Spaces'))}</h3>
      <p class="settings-note">${escapeXml(t('Bis zu drei lokale Arbeitsbereiche mit eigener Darstellung, eigenen Symbolen, Dock-Pins und Widgets.'))}</p>
      <div class="spaces-list" data-space-role="list"></div>
      <div class="spaces-footer">
        <button class="settings-button" type="button" data-space-action="add">
          <span class="glyph" data-icon="plus"></span>${escapeXml(t('Space hinzufügen'))}
        </button>
        <span class="spaces-footer__count" data-space-role="count">0 / 3</span>
      </div>
      <p class="settings-video-status" data-space-role="status"></p>
    </section>`;
}

function renderSpacesPane() {
  const pane = refs.settingsSpacesTab;
  if (!pane) return;
  const list = $('[data-space-role="list"]', pane);
  if (!list) return;
  list.innerHTML = '';
  state.spaces.forEach((space, index) => {
    const active = space.id === state.activeSpaceId;
    const row = el('div', `space-row${active ? ' is-active' : ''}`);
    row.dataset.spaceId = space.id;
    row.style.setProperty('--space-color', space.color);

    // Marker: the Space color as a dot, with a ring when the Space is live.
    const marker = el('span', 'space-row__marker');
    marker.style.backgroundColor = space.color;
    marker.setAttribute('aria-hidden', 'true');

    const main = el('div', 'space-row__main');
    const name = el('input', 'settings-input space-row__name');
    name.type = 'text';
    name.maxLength = 32;
    name.value = space.name;
    name.dataset.spaceRole = 'name';
    name.dataset.spaceId = space.id;
    name.setAttribute('aria-label', t('Space-Name'));

    const meta = el('div', 'space-row__meta');
    const position = el('span', 'space-row__index');
    position.textContent = `${index + 1}`;
    const contents = el('span', 'space-row__contents');
    const pinCount = Array.isArray(space.pinned) ? space.pinned.length : 0;
    const widgetCount = Array.isArray(space.widgets) ? space.widgets.length : 0;
    const iconCount = Array.isArray(space.desktop) ? space.desktop.length : 0;
    contents.textContent = [
      plural(iconCount, 'Symbol', 'Symbole'),
      plural(pinCount, 'Dock-Pin', 'Dock-Pins'),
      plural(widgetCount, 'Widget', 'Widgets')
    ].join(' · ');
    meta.append(position, contents);

    const color = el('input', 'space-row__color');
    color.type = 'color';
    color.value = space.color;
    color.dataset.spaceRole = 'color';
    color.dataset.spaceId = space.id;
    color.setAttribute('aria-label', t('Space-Farbe'));

    const actions = el('div', 'space-row__actions');
    const badge = el('span', 'space-row__badge');
    if (active) {
      badge.textContent = t('Aktiv');
      actions.append(badge);
    } else {
      const switchButton = el('button', 'settings-button settings-button--small');
      switchButton.type = 'button';
      switchButton.textContent = t('Wechseln');
      switchButton.dataset.spaceAction = 'switch';
      switchButton.dataset.spaceId = space.id;
      const removeButton = el('button', 'settings-button settings-button--small space-row__remove');
      removeButton.type = 'button';
      removeButton.title = t('Space löschen');
      removeButton.setAttribute('aria-label', `${t('Space löschen')}: ${space.name}`);
      removeButton.append(iconEl('trash', 'glyph'));
      removeButton.dataset.spaceAction = 'remove';
      removeButton.dataset.spaceId = space.id;
      removeButton.disabled = state.spaces.length <= 1;
      actions.append(switchButton, removeButton);
    }

    main.append(name, meta);
    row.append(marker, main, color, actions);
    list.append(row);
  });
  const addButton = $('[data-space-action="add"]', pane);
  if (addButton) addButton.disabled = state.spaces.length >= MAX_SPACES;
  const count = $('[data-space-role="count"]', pane);
  if (count) count.textContent = `${state.spaces.length} / ${MAX_SPACES}`;
}

function bindSpacesPane(pane) {
  pane.addEventListener('click', (event) => {
    const target = event.target.closest('[data-space-action]');
    if (!target) return;
    const action = target.dataset.spaceAction;
    const id = target.dataset.spaceId;
    if (action === 'add') addSpace();
    else if (action === 'switch') switchSpace(id);
    else if (action === 'remove') removeSpace(id);
  });
  pane.addEventListener('change', (event) => {
    const target = event.target;
    const role = target.dataset?.spaceRole;
    const id = target.dataset?.spaceId;
    if (!role || !id) return;
    if (role === 'name') renameSpace(id, target.value);
    else if (role === 'color') setSpaceColor(id, target.value);
  });
}

function setSpacesStatus(text) {
  const status = refs.settingsSpacesTab ? $('[data-space-role="status"]', refs.settingsSpacesTab) : null;
  if (status) status.textContent = text;
}

function addSpace() {
  captureActiveSpace();
  if (state.spaces.length >= MAX_SPACES) {
    setSpacesStatus(t('Maximal drei Spaces'));
    return;
  }
  const index = state.spaces.length;
  const id = uid('space');
  const name = [t('Arbeit'), t('Privat')][index - 1] || `${t('Space')} ${index + 1}`;
  const color = SPACE_COLORS[index % SPACE_COLORS.length];
  const settings = clone(state.settings);
  settings.settingsVersion = 12;
  settings.wallpaper = null;
  settings.wallpaperPackActive = false;
  settings.wallpaperPackIndex = 0;
  settings.wallpaperIndexByTheme = clone(state.settings.wallpaperIndexByTheme || {});
  const candidate = { id, name, color, settings, desktop: [], pinned: [], widgets: [] };
  state.spaces.push(candidate);
  const cleaned = sanitizeSpaces(state.spaces, id, {
    settings: clone(state.settings),
    desktop: clone(state.desktop),
    pinned: clone(state.pinned),
    widgets: clone(state.widgets)
  });
  state.spaces = cleaned.spaces;
  switchSpace(id);
  setSpacesStatus(`${t('Space erstellt')}: ${activeSpace()?.name || ''}`);
}

function switchSpace(id) {
  const target = findSpace(id);
  if (!target || id === state.activeSpaceId) return;
  captureActiveSpace();
  hideContextMenu();
  const payload = {
    settings: clone(target.settings),
    desktop: clone(target.desktop),
    pinned: clone(target.pinned),
    widgets: clone(target.widgets),
    spaces: clone(state.spaces),
    activeSpaceId: id
  };
  applyPersisted(payload, false);
  persistNow();
  setSpacesStatus(`${t('Space gewechselt')}: ${activeSpace()?.name || ''}`);
}

function removeSpace(id) {
  if (!findSpace(id) || id === state.activeSpaceId || state.spaces.length <= 1) {
    setSpacesStatus(t('Ein Space muss aktiv bleiben.'));
    return;
  }
  state.spaces = state.spaces.filter((space) => space.id !== id);
  captureActiveSpace();
  renderDock();
  renderSpacesPane();
  persistNow();
  setSpacesStatus(t('Space gelöscht'));
}

function renameSpace(id, name) {
  const space = findSpace(id);
  if (!space) return;
  space.name = String(name || '').trim().slice(0, 32) || t('Space');
  captureActiveSpace();
  renderDock();
  renderSpacesPane();
  persistNow();
}

function setSpaceColor(id, value) {
  const space = findSpace(id);
  if (!space) return;
  space.color = safeColor(value, space.color);
  captureActiveSpace();
  renderDock();
  renderSpacesPane();
  persistNow();
}

function backupPayload() {
  captureActiveSpace();
  const settings = clone(state.settings);
  if (settings.wallpaperVideoSource !== 'url') {
    settings.wallpaperVideoSource = null;
    settings.wallpaperVideoUrl = null;
  }
  return {
    format: 'hush-backup',
    version: 4,
    exportedAt: new Date().toISOString(),
    settings,
    desktop: clone(state.desktop),
    pinned: clone(state.pinned),
    widgets: clone(state.widgets),
    spaces: clone(state.spaces),
    activeSpaceId: state.activeSpaceId
  };
}

function exportBackup() {
  try {
    const json = JSON.stringify(backupPayload(), null, 2);
    const blob = new window.Blob([json], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `hush-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    setWidgetsStatus(t('Backup exportiert'));
  } catch {
    setWidgetsStatus(t('Backup konnte nicht exportiert werden'));
  }
}

function importBackup(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const payload = JSON.parse(String(reader.result || '{}'));
      if (!payload || typeof payload !== 'object') throw new Error('invalid backup');
      if (payload.format && payload.format !== 'hush-backup') throw new Error('invalid backup');
      if (!payload.settings && !Array.isArray(payload.desktop) && !Array.isArray(payload.pinned)
        && !Array.isArray(payload.widgets) && !Array.isArray(payload.spaces)) throw new Error('invalid backup');
      applyPersisted(payload, false);
      persistNow();
      setWidgetsStatus(t('Backup wiederhergestellt'));
    } catch {
      setWidgetsStatus(t('Backup ist ungültig'));
    }
  };
  reader.onerror = () => setWidgetsStatus(t('Backup ist ungültig'));
  reader.readAsText(file);
}

function bindWidgetEvents() {
  if (!refs.widgetLayer) return;
  refs.widgetLayer.addEventListener('pointerdown', onWidgetPointerDown);
  refs.widgetLayer.addEventListener('input', onWidgetInput);
  refs.widgetLayer.addEventListener('change', onWidgetChange);
  refs.widgetLayer.addEventListener('submit', onWidgetSubmit);
  refs.widgetLayer.addEventListener('click', onWidgetClick);
}

function onWidgetPointerDown(event) {
  if (event.button !== 0) return;
  const node = event.target.closest('.hush-widget');
  if (!node) return;
  if (event.target.closest('button, input, textarea, select')) return;
  const resize = event.target.closest('[data-widget-role="resize"]');
  const dragHandle = event.target.closest('[data-widget-role="drag"]');
  if (!resize && !dragHandle) return;
  const widget = findWidget(node.dataset.widgetId);
  if (!widget) return;
  event.preventDefault();
  widgetDrag = {
    id: widget.id,
    node,
    mode: resize ? 'resize' : 'move',
    startX: event.clientX,
    startY: event.clientY,
    x: widget.x,
    y: widget.y,
    w: widget.w,
    h: widget.h
  };
  node.classList.add('is-moving');
  window.addEventListener('pointermove', onWidgetPointerMove);
  window.addEventListener('pointerup', onWidgetPointerUp);
  window.addEventListener('pointercancel', onWidgetPointerUp);
}

function onWidgetPointerMove(event) {
  if (!widgetDrag) return;
  const widget = findWidget(widgetDrag.id);
  if (!widget) return;
  if (widgetDrag.mode === 'move') {
    widget.x = clamp(widgetDrag.x + (event.clientX - widgetDrag.startX) / (window.innerWidth || 1280), 0, 0.94);
    widget.y = clamp(widgetDrag.y + (event.clientY - widgetDrag.startY) / (window.innerHeight || 720), 0, 0.86);
  } else {
    widget.w = Math.round(clamp(widgetDrag.w + event.clientX - widgetDrag.startX, WIDGET_MIN_W, Math.min(WIDGET_MAX_W, (window.innerWidth || 1280) - 32)));
    widget.h = Math.round(clamp(widgetDrag.h + event.clientY - widgetDrag.startY, WIDGET_MIN_H, Math.min(WIDGET_MAX_H, (window.innerHeight || 720) - 70)));
  }
  positionWidgetNode(widgetDrag.node, widget);
}

function onWidgetPointerUp() {
  if (!widgetDrag) return;
  widgetDrag.node.classList.remove('is-moving');
  widgetDrag = null;
  window.removeEventListener('pointermove', onWidgetPointerMove);
  window.removeEventListener('pointerup', onWidgetPointerUp);
  window.removeEventListener('pointercancel', onWidgetPointerUp);
  persist();
  applyWidgetVisibility();
}

function onWidgetInput(event) {
  const target = event.target;
  const role = target.dataset?.widgetRole;
  if (!role) return;
  const node = target.closest('.hush-widget');
  const widget = node ? findWidget(node.dataset.widgetId) : null;
  if (!widget) return;
  if (role === 'note') {
    widget.data.text = String(target.value || '').slice(0, 4000);
    persist();
  }
}

function onWidgetChange(event) {
  const target = event.target;
  const node = target.closest('.hush-widget');
  const widget = node ? findWidget(node.dataset.widgetId) : null;
  if (!widget) return;
  const role = target.dataset?.widgetRole;
  if (role === 'task-check') {
    const taskId = target.closest('[data-task-id]')?.dataset.taskId;
    const task = widget.data.items?.find((item) => item.id === taskId);
    if (!task) return;
    task.done = target.checked;
    target.closest('.hush-widget__task')?.classList.toggle('is-done', task.done);
    persist();
  } else if (role === 'timer-minutes') {
    resetWidgetTimer(widget, target.value);
  } else if (role === 'worldclock-zone') {
    widget.data.zone = WIDGET_TIMEZONES.includes(target.value) ? target.value : WIDGET_TIMEZONES[0];
    persist();
    tickWidgets();
  }
}

function onWidgetSubmit(event) {
  const form = event.target;
  const role = form.dataset?.widgetRole;
  if (!role) return;
  event.preventDefault();
  const node = form.closest('.hush-widget');
  const widget = node ? findWidget(node.dataset.widgetId) : null;
  if (!widget) return;
  if (role === 'task-form') {
    const input = $('[data-widget-role="task-input"]', form);
    const text = String(input?.value || '').trim().slice(0, 140);
    if (!text) return;
    if (!Array.isArray(widget.data.items)) widget.data.items = [];
    widget.data.items.push({ id: uid('task'), text, done: false });
    input.value = '';
    persist();
    renderWidgets();
  }
}

function onWidgetClick(event) {
  const removeTask = event.target.closest('[data-task-action="remove"]');
  if (removeTask) {
    const node = removeTask.closest('.hush-widget');
    const widget = node ? findWidget(node.dataset.widgetId) : null;
    const taskId = removeTask.closest('[data-task-id]')?.dataset.taskId;
    if (widget && Array.isArray(widget.data.items)) {
      widget.data.items = widget.data.items.filter((item) => item.id !== taskId);
      persist();
      renderWidgets();
    }
    return;
  }
  const action = event.target.closest('[data-widget-action]')?.dataset.widgetAction;
  if (!action) return;
  const node = event.target.closest('.hush-widget');
  const widget = node ? findWidget(node.dataset.widgetId) : null;
  if (!widget) return;
  if (action === 'remove') {
    removeWidget(widget.id);
  } else if (action === 'timer-start') {
    startWidgetTimer(widget);
  } else if (action === 'timer-reset') {
    resetWidgetTimer(widget);
  }
}

function cacheRefs() {
  Object.assign(refs, {
    clockDisplay: $('#clockDisplay'),
    desktopSurface: $('#desktopSurface'),
    desktopIcons: $('#desktopIcons'),
    windowsLayer: $('#windowsLayer'),
    dockWrap: $('#dockWrap'),
    dock: $('#dock'),
    dragGhost: $('#dragGhost'),
    spotlightOverlay: $('#spotlightOverlay'),
    spotlightInput: $('#spotlightInput'),
    spotlightResults: $('#spotlightResults'),
    settingsPanel: $('#settingsPanel'),
    snapPreview: $('#snapPreview'),
    closeSettings: $('#closeSettings'),
    contextMenu: $('#contextMenu'),
    demoBadge: $('#demoBadge'),
    wallpaper: $('#wallpaper'),
    wallpaperNext: $('#wallpaperNext'),
    wallpaperVideo: $('#wallpaperVideo'),
    wallpaperInput: $('#wallpaperInput'),
    wallpaperVideoInput: $('#wallpaperVideoInput'),
    changeWallpaper: $('#changeWallpaper'),
    changeWallpaperVideo: $('#changeWallpaperVideo'),
    clearWallpaperVideo: $('#clearWallpaperVideo'),
    setWallpaperVideoUrl: $('#setWallpaperVideoUrl'),
    applyWallpaperVideoUrl: $('#applyWallpaperVideoUrl'),
    wallpaperVideoStatus: $('#wallpaperVideoStatus'),
    resetWallpaper: $('#resetWallpaper'),
    arrangeIcons: $('#arrangeIcons'),
    clearDesktop: $('#clearDesktop'),
    setAnimations: $('#setAnimations'),
    setMagnify: $('#setMagnify'),
    setParallax: $('#setParallax'),
    setDim: $('#setDim'),
    setDarkenWallpaper: $('#setDarkenWallpaper'),
    setGlass: $('#setGlass'),
    setRecents: $('#setRecents'),
    setDimValue: $('#setDimValue'),
    setGlassValue: $('#setGlassValue'),
    setRecentsValue: $('#setRecentsValue'),
    setLanguage: $('#setLanguage'),
    setSeconds: $('#setSeconds'),
    setFont: $('#setFont'),
    customFontButton: $('#customFontButton'),
    customFontInput: $('#customFontInput'),
    openDisplayEditor: $('#openDisplayEditor'),
    displayEditor: $('#displayEditor'),
    displayEditorStage: $('#displayEditorStage'),
    editorDockHandle: $('#editorDockHandle'),
    editorClockHandle: $('#editorClockHandle'),
    setClockScale: $('#setClockScale'),
    setClockScaleValue: $('#setClockScaleValue'),
    setGridSize: $('#setGridSize'),
    setGridSizeValue: $('#setGridSizeValue'),
    setGridEnabled: $('#setGridEnabled'),
    setIconSize: $('#setIconSize'),
    setIconSizeValue: $('#setIconSizeValue'),
    setClockColor: $('#setClockColor'),
    setDockColor: $('#setDockColor'),
    setTheme: $('#setTheme'),
    setWindowGlass: $('#setWindowGlass'),
    setWindowGlassValue: $('#setWindowGlassValue'),
    setDockAutoHide: $('#setDockAutoHide'),
    setDockStyle: $('#setDockStyle'),
    setDockAlign: $('#setDockAlign'),
    setDockAlpha: $('#setDockAlpha'),
    setDockAlphaValue: $('#setDockAlphaValue'),
    setDockBlur: $('#setDockBlur'),
    setDockBlurValue: $('#setDockBlurValue'),
    setDockRadius: $('#setDockRadius'),
    setDockRadiusValue: $('#setDockRadiusValue'),
    displayEditorBar: $('#displayEditorBar'),
    renameOverlay: $('#renameOverlay'),
    renameTitle: $('#renameTitle'),
    renameLabel: $('#renameLabel'),
    renameInput: $('#renameInput'),
    renameCancel: $('#renameCancel'),
    renameConfirm: $('#renameConfirm'),
    resetLayout: $('#resetLayout'),
    closeDisplayEditor: $('#closeDisplayEditor'),
    app: $('#app'),
    widgetLayer: $('#widgetLayer'),
    setDockSide: $('#setDockSide'),
    setShortenLinks: $('#setShortenLinks'),
    wallpaperPackInput: $('#wallpaperPackInput'),
    chooseWallpaperPack: $('#chooseWallpaperPack'),
    clearWallpaperPack: $('#clearWallpaperPack'),
    wallpaperPackStatus: $('#wallpaperPackStatus'),
    setWallpaperPackTimer: $('#setWallpaperPackTimer'),
    setWallpaperPackTimerValue: $('#setWallpaperPackTimerValue'),
    setWallpaperPackReload: $('#setWallpaperPackReload'),
    setSearchShortcut: $('#setSearchShortcut'),
    setSearchShortcutHint: $('#setSearchShortcutHint'),
    launchOverlay: $('#launchOverlay'),
    launchHShape: $('#launchHShape'),
    launchHClip: $('#launchHClip'),
    launchLoader: $('.launch-loader'),
    launchMorph: $('.launch-overlay__morph')
  });
}

function bindEvents() {
  const openSearch = () => openSpotlight();
  bindWidgetEvents();
  document.addEventListener('keydown', onShortcutCapture, true);
  refs.setSearchShortcut.addEventListener('click', startShortcutCapture);
  refs.setSearchShortcut.addEventListener('blur', () => {
    if (state.captureShortcut) stopShortcutCapture();
  });
  refs.clockDisplay.addEventListener('click', openSearch);
  refs.clockDisplay.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || (event.key === ' ' && !shortcutMatchesEvent(event, state.settings.searchShortcut))) {
      event.preventDefault();
      openSearch();
    }
  });

  refs.desktopIcons.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    const node = event.target.closest('.desktop-icon');
    if (!node) return;
    const item = lookupItem('desktop', node.dataset.id);
    if (!item) return;
    pendingDrag({ event, sourceEl: node, item: { ...item }, source: 'desktop', mode: 'move' });
  });
  refs.desktopIcons.addEventListener('click', (event) => {
    if (performance.now() < state.suppressClickUntil || event.detail > 1) return;
    const node = event.target.closest('.desktop-icon');
    if (!node) return;
    event.stopPropagation();
    selectItem('desktop', node.dataset.id);
    openItem(lookupItem('desktop', node.dataset.id), { hushWindow: event.altKey });
  });
  refs.desktopIcons.addEventListener('contextmenu', (event) => {
    const node = event.target.closest('.desktop-icon');
    if (!node) return;
    event.preventDefault();
    event.stopPropagation();
    const item = lookupItem('desktop', node.dataset.id);
    if (!item) return;
    selectItem('desktop', node.dataset.id);
    showItemContextMenu(event.clientX, event.clientY, item, 'desktop');
  });
  refs.desktopIcons.addEventListener('keydown', (event) => {
    const node = event.target.closest('.desktop-icon');
    if (!node) return;
    const item = lookupItem('desktop', node.dataset.id);
    if (!item) return;
    if (event.key === 'Enter' || (event.key === ' ' && !shortcutMatchesEvent(event, state.settings.searchShortcut))) {
      event.preventDefault();
      openItem(item);
    } else if (event.key === 'F2') {
      event.preventDefault();
      openRenameDialog(item.id);
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      removeFromDesktop(item.id);
    } else if (event.key.startsWith('Arrow')) {
      event.preventDefault();
      const deltas = {
        ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1]
      };
      const [dx, dy] = deltas[event.key] || [0, 0];
      moveDesktopIconBy(item.id, dx, dy);
    }
  });

  refs.desktopSurface.addEventListener('click', (event) => {
    if (event.target.closest('.desktop-icon')) return;
    clearSelection();
  });
  refs.desktopSurface.addEventListener('contextmenu', (event) => {
    if (event.target.closest('.desktop-icon')) return;
    event.preventDefault();
    showDesktopContextMenu(event.clientX, event.clientY);
  });

  refs.dock.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    const button = event.target.closest('.dock-item');
    if (!button || button.dataset.draggable !== 'true') return;
    const item = lookupDockItem(button);
    if (!item) return;
    pendingDrag({
      event,
      sourceEl: button,
      item: { ...item },
      source: button.dataset.source,
      mode: 'copy'
    });
  });
  refs.dock.addEventListener('click', (event) => {
    if (performance.now() < state.suppressClickUntil) return;
    const button = event.target.closest('.dock-item');
    if (!button) return;
    const item = lookupDockItem(button);
    if (!item) return;
    if (item.app === 'finder') openExplorer();
    else if (item.app === 'settings') toggleSettings(!refs.settingsPanel.classList.contains('is-open'));
    else if (item.app === 'widgets') openWidgetsSettings();
    else if (item.app === 'spaces') openSpacesSettings();
    else openItem(item, { hushWindow: event.altKey });
  });
  refs.dock.addEventListener('contextmenu', (event) => {
    const button = event.target.closest('.dock-item');
    if (!button) return;
    event.preventDefault();
    const item = lookupDockItem(button);
    if (!item) return;
    showItemContextMenu(event.clientX, event.clientY, item, button.dataset.source);
  });
  refs.dock.addEventListener('pointerover', (event) => {
    const button = event.target.closest('.dock-item');
    if (!button || drag.active) return;
    const item = lookupDockItem(button);
    if (!item) return;
    showDockTooltip(dockItemLabel(item), button.getBoundingClientRect());
  });
  refs.dock.addEventListener('pointerout', (event) => {
    const from = event.target.closest('.dock-item');
    const to = event.relatedTarget?.closest?.('.dock-item');
    if (from && from !== to) hideDockTooltip();
  });
  refs.dockWrap.addEventListener('pointermove', (event) => {
    dockPointerX = event.clientX;
    if (!state.settings.magnify || dockRaf || drag.active) return;
    dockRaf = requestAnimationFrame(() => {
      dockRaf = 0;
      updateDockMagnification(dockPointerX);
    });
  });
  refs.dockWrap.addEventListener('pointerleave', () => {
    hideDockTooltip();
    resetDockMagnification();
  });

  refs.spotlightOverlay.addEventListener('pointerdown', (event) => {
    if (event.target === refs.spotlightOverlay) closeSpotlight();
  });
  refs.spotlightInput.addEventListener('input', () => {
    state.spotlight.index = 0;
    renderSpotlightResults();
  });
  refs.spotlightInput.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') { event.preventDefault(); setSpotlightIndex(state.spotlight.index + 1); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setSpotlightIndex(state.spotlight.index - 1); }
    else if (event.key === 'Enter') { event.preventDefault(); executeSpotlightResult(state.spotlight.index); }
    else if (event.key === 'Escape') { event.preventDefault(); closeSpotlight(); }
  });
  refs.spotlightResults.addEventListener('mousemove', (event) => {
    const node = event.target.closest('.spotlight-result');
    if (!node) return;
    const index = Number(node.dataset.index);
    if (index !== state.spotlight.index) setSpotlightIndex(index);
  });
  refs.spotlightResults.addEventListener('click', (event) => {
    const node = event.target.closest('.spotlight-result');
    if (!node) return;
    executeSpotlightResult(Number(node.dataset.index));
  });
  refs.spotlightResults.addEventListener('contextmenu', (event) => {
    const node = event.target.closest('.spotlight-result');
    if (!node) return;
    event.preventDefault();
    event.stopPropagation();
    const result = state.spotlight.results[Number(node.dataset.index)];
    showSpotlightResultContextMenu(event.clientX, event.clientY, result);
  });

  refs.closeSettings.addEventListener('click', () => toggleSettings(false));
  refs.setAnimations.addEventListener('change', (event) => updateSettings({ animations: event.target.checked }));
  refs.setMagnify.addEventListener('change', (event) => updateSettings({ magnify: event.target.checked }));
  refs.setParallax.addEventListener('change', (event) => updateSettings({ parallax: event.target.checked }));
  refs.setDim.addEventListener('input', (event) => {
    refs.setDimValue.textContent = `${event.target.value} %`;
    updateSettings({ dim: Number(event.target.value) });
  });
  refs.setDarkenWallpaper.addEventListener('change', (event) => updateSettings({ darkenWallpaper: event.target.checked }));
  refs.setGlass.addEventListener('input', (event) => {
    refs.setGlassValue.textContent = `${event.target.value} %`;
    updateSettings({ glass: Number(event.target.value) });
  });
  refs.setRecents.addEventListener('input', (event) => {
    refs.setRecentsValue.textContent = `${event.target.value} Apps`;
    updateSettings({ recents: Number(event.target.value) });
  });
  refs.setLanguage.addEventListener('change', (event) => updateSettings({ language: event.target.value }));
  refs.setSeconds.addEventListener('change', (event) => updateSettings({ showSeconds: event.target.checked }));
  refs.setFont.addEventListener('change', (event) => {
    updateSettings({ font: event.target.value });
    if (event.target.value === 'custom' && !state.settings.customFont) refs.customFontInput.click();
  });
  refs.customFontButton.addEventListener('click', () => refs.customFontInput.click());
  refs.customFontInput.addEventListener('change', (event) => handleCustomFontFile(event.target.files?.[0]));
  refs.openDisplayEditor.addEventListener('click', openDisplayEditor);
  refs.closeDisplayEditor.addEventListener('click', closeDisplayEditor);
  refs.resetLayout.addEventListener('click', resetLayout);
  refs.setClockScale.addEventListener('input', (event) => {
    const scale = clamp(Number(event.target.value) / 100, CLOCK_SCALE_MIN, CLOCK_SCALE_MAX);
    refs.setClockScaleValue.textContent = `${event.target.value} %`;
    updateSettings({ clockScale: scale });
    positionEditorHandles();
  });
  refs.setGridSize.addEventListener('input', (event) => {
    const size = Math.round(clamp(Number(event.target.value), GRID_SIZE_MIN, GRID_SIZE_MAX) / 4) * 4;
    refs.setGridSizeValue.textContent = `${size} px`;
    updateSettings({ gridSize: size });
  });
  refs.setGridEnabled.addEventListener('change', (event) => updateSettings({ gridEnabled: event.target.checked }));
  refs.setIconSize.addEventListener('input', (event) => {
    const size = Math.round(clamp(Number(event.target.value), ICON_SIZE_MIN, ICON_SIZE_MAX) / 2) * 2;
    refs.setIconSizeValue.textContent = `${size} px`;
    updateSettings({ iconSize: size });
  });
  refs.setClockColor.addEventListener('input', (event) => updateSettings({ clockColor: event.target.value }));
  refs.setDockColor.addEventListener('input', (event) => updateSettings({ dockColor: event.target.value }));
  refs.setTheme.addEventListener('change', (event) => updateSettings({ theme: event.target.value }));
  refs.setWindowGlass.addEventListener('input', (event) => {
    refs.setWindowGlassValue.textContent = `${event.target.value} %`;
    updateSettings({ windowGlass: Number(event.target.value) });
  });
  refs.setDockAutoHide.addEventListener('change', (event) => updateSettings({ dockAutoHide: event.target.checked }));
  refs.setDockStyle.addEventListener('change', (event) => updateSettings({ dockStyle: event.target.value }));
  refs.setDockSide.addEventListener('change', (event) => updateSettings({ dockSide: event.target.value }));
  refs.setDockAlign.addEventListener('change', (event) => updateSettings({ dockAlign: event.target.value }));
  refs.setShortenLinks.addEventListener('change', (event) => updateSettings({ shortenLinks: event.target.checked }));
  refs.setWallpaperPackTimer.addEventListener('input', (event) => {
    const minutes = Math.round(clamp(Number(event.target.value), 1, 120));
    refs.setWallpaperPackTimerValue.textContent = t(`${minutes} Min`);
    updateSettings({ wallpaperPackTimer: minutes });
  });
  refs.setWallpaperPackReload.addEventListener('change', (event) => updateSettings({ wallpaperPackOnReload: event.target.checked }));
  refs.chooseWallpaperPack.addEventListener('click', () => refs.wallpaperPackInput.click());
  refs.clearWallpaperPack.addEventListener('click', () => clearWallpaperPack());
  refs.wallpaperPackInput.addEventListener('change', (event) => handleWallpaperPackFiles(event.target.files));
  refs.setDockAlpha.addEventListener('input', (event) => {
    refs.setDockAlphaValue.textContent = `${event.target.value} %`;
    updateSettings({ dockAlpha: Number(event.target.value) });
  });
  refs.setDockBlur.addEventListener('input', (event) => {
    refs.setDockBlurValue.textContent = `${event.target.value} px`;
    updateSettings({ dockBlur: Number(event.target.value) });
  });
  refs.setDockRadius.addEventListener('input', (event) => {
    refs.setDockRadiusValue.textContent = `${event.target.value} px`;
    updateSettings({ dockRadius: Number(event.target.value) });
  });
  refs.renameCancel.addEventListener('click', closeRenameDialog);
  refs.renameConfirm.addEventListener('click', commitRename);
  refs.renameOverlay.addEventListener('pointerdown', (event) => {
    if (event.target === refs.renameOverlay) closeRenameDialog();
  });
  refs.renameInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') { event.preventDefault(); commitRename(); }
    else if (event.key === 'Escape') { event.preventDefault(); closeRenameDialog(); }
  });
  refs.displayEditorStage.addEventListener('pointerdown', startEditorDrag);
  refs.displayEditorBar.addEventListener('click', (event) => {
    const sideButton = event.target.closest('button[data-dock-side]');
    if (sideButton) { setDockSide(sideButton.dataset.dockSide); return; }
    const clockPreset = event.target.closest('button[data-clock-preset]');
    if (clockPreset) {
      const color = safeColor(clockPreset.dataset.clockPreset, CLOCK_COLOR_DEFAULT);
      refs.setClockColor.value = color;
      updateSettings({ clockColor: color });
      return;
    }
    const dockPreset = event.target.closest('button[data-dock-preset]');
    if (dockPreset) {
      const color = safeColor(dockPreset.dataset.dockPreset, DOCK_COLOR_DEFAULT);
      refs.setDockColor.value = color;
      updateSettings({ dockColor: color });
      return;
    }
    const themeButton = event.target.closest('button[data-theme]');
    if (themeButton) updateSettings({ theme: themeButton.dataset.theme });
  });
  refs.changeWallpaper.addEventListener('click', () => refs.wallpaperInput.click());
  refs.changeWallpaperVideo.addEventListener('click', () => refs.wallpaperVideoInput.click());
  refs.clearWallpaperVideo.addEventListener('click', () => clearWallpaperVideo());
  refs.applyWallpaperVideoUrl.addEventListener('click', applyWallpaperVideoUrl);
  refs.setWallpaperVideoUrl.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') { event.preventDefault(); applyWallpaperVideoUrl(); }
  });
  refs.wallpaperVideoInput.addEventListener('change', (event) => handleWallpaperVideoFile(event.target.files?.[0]));
  refs.resetWallpaper.addEventListener('click', async () => {
    await clearWallpaperVideo(true);
    await clearWallpaperPack(true);
    updateSettings({ wallpaper: null });
  });
  refs.arrangeIcons.addEventListener('click', arrangeIcons);
  refs.clearDesktop.addEventListener('click', clearDesktop);
  refs.wallpaperInput.addEventListener('change', (event) => handleWallpaperFile(event.target.files?.[0]));

  document.addEventListener('hush:localechange', () => {
    if (state.rename.open) {
      const isLink = state.rename.mode === 'link';
      refs.renameTitle.textContent = t(isLink ? 'Adresse ändern' : 'Umbenennen');
      refs.renameLabel.textContent = t(isLink ? 'Neue Adresse' : 'Neuer Name');
      if (isLink) refs.renameInput.placeholder = t('https://');
    }
    refs.wallpaperVideoStatus.textContent = t(videoStatusText());
    refs.wallpaperPackStatus.textContent = wallpaperPackStatusText();
    if (!state.captureShortcut) updateSearchShortcutUI();
  });

  document.addEventListener('pointerdown', (event) => {
    const win = event.target.closest?.('.window');
    if (win?.dataset.windowId) focusWindow(win.dataset.windowId);
  }, true);

  document.addEventListener('contextmenu', (event) => {
    if (event.target.closest('input, textarea, [contenteditable="true"], .spotlight-result')) return;
    event.preventDefault();
  });

  document.addEventListener('keydown', (event) => {
    if (canTriggerSearchShortcut(event) && shortcutMatchesEvent(event, state.settings.searchShortcut)) {
      event.preventDefault();
      openSpotlight();
      return;
    }
    if (event.key === 'Escape') {
      if (state.rename.open) closeRenameDialog();
      else if (state.displayEditor.open) closeDisplayEditor();
      else if (state.spotlight.open) closeSpotlight();
      else if (refs.settingsWindow?.classList.contains('is-open')) toggleSettings(false);
      else if (refs.contextMenu.classList.contains('is-open')) hideContextMenu();
      else if (state.selected) clearSelection();
    }
  });

  window.addEventListener('resize', debounce(() => {
    clampDesktopSlots();
    renderDesktop(false);
    renderWidgets();
    resetDockMagnification();
    positionEditorHandles();
    positionEditorBar();
  }, 160));
  window.addEventListener('focus', scheduleRefresh);
  window.addEventListener('mousemove', onDockEdgeMove, { passive: true });
  window.addEventListener('blur', () => { if (state.settings.dockAutoHide) document.body.classList.remove('dock-visible'); });
  document.addEventListener('mouseleave', () => { if (state.settings.dockAutoHide) document.body.classList.remove('dock-visible'); });
  refs.dockWrap.addEventListener('focusin', () => document.body.classList.add('dock-visible'));
  refs.dockWrap.addEventListener('focusout', () => { if (state.settings.dockAutoHide) document.body.classList.remove('dock-visible'); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) persistNow();
    else scheduleRefresh();
  });

  api.onChanged({
    bookmarks: scheduleRefresh,
    history: scheduleRefresh,
    tabs: scheduleRefresh,
    storage: (next) => {
      if (!next) return;
      const incomingRevision = Number(next.__revision || 0);
      const localEcho = next.__clientId === CLIENT_ID && incomingRevision <= settingsRevision;
      if (localEcho || (incomingRevision && incomingRevision < settingsRevision)) return;
      if (incomingRevision > settingsRevision) settingsRevision = incomingRevision;
      if (!drag.active) applyPersisted(next, false);
      else state.pendingRefresh = true;
    }
  });
}

async function init() {
  cacheRefs();
  if (refs.displayEditorStage && refs.displayEditorStage.parentElement !== document.body) {
    document.body.append(refs.displayEditorStage);
  }
  const stopI18n = startI18n();
  hydrateIcons(document);
  $$('[data-role="app-version"]', document).forEach((node) => { node.textContent = APP_VERSION; });

  const stored = await api.get([STORAGE_KEY, LEGACY_STORAGE_KEY]);
  const persisted = stored?.[STORAGE_KEY] || stored?.[LEGACY_STORAGE_KEY];
  if (!stored?.[STORAGE_KEY] && stored?.[LEGACY_STORAGE_KEY]) await api.set({ [STORAGE_KEY]: stored[LEGACY_STORAGE_KEY] });
  applyPersisted(persisted, true);
  applyTheme(state.settings);
  applyLayout();
  applyFont();
  const stopClock = initClock(() => state.settings);
  ambient = initAmbient(state.settings);
  syncSettingsUI();
  applyWallpaperVideo();
  applyWallpaperPack({ animate: true, advanceOnReload: true });

  await refreshData();
  renderDesktop(true);
  bindEvents();
  renderWidgets();

  window.addEventListener('pagehide', () => {
    persistNow();
    stopI18n?.();
    stopClock?.();
    ambient.destroy?.();
    cleanupDrag();
    clearTimeout(wallpaperPackTimerId);
    clearTimeout(wallpaperPackFadeTimer);
    clearTimeout(widgetTimerId);
  }, { once: true });
  window.addEventListener('beforeunload', persistNow);

  refs.demoBadge.hidden = IS_EXTENSION;
}

init().catch((error) => {
  console.error('Hush konnte nicht starten:', error);
});
