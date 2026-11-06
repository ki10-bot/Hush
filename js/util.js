import { locale, plural as pluralI18n, t } from './i18n.js';

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

export function el(tag, className = '', text = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function debounce(fn, wait = 180) {
  let timer = 0;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

export function hashString(value = '') {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

export function escapeXml(value = '') {
  return String(value).replace(/[<>&"']/g, (c) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

export function safeUrl(raw) {
  if (!raw || typeof raw !== 'string') return null;
  try {
    const url = new URL(raw);
    const allowed = new Set(['http:', 'https:', 'file:', 'ftp:', 'chrome:']);
    return allowed.has(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export function hostOf(raw) {
  try {
    return new URL(raw).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

const KNOWN_SITES = new Map([
  ['arena', 'Arena.ai'], ['figma', 'Figma'], ['github', 'GitHub'], ['youtube', 'YouTube'],
  ['wikipedia', 'Wikipedia'], ['developer.chrome', 'Chrome Docs'], ['developer.mozilla', 'MDN'],
  ['stackoverflow', 'Stack Overflow'], ['dribbble', 'Dribbble'], ['behance', 'Behance'],
  ['awwwards', 'Awwwards'], ['spotify', 'Spotify'], ['notion', 'Notion'], ['reddit', 'Reddit'],
  ['google', 'Google'], ['apple', 'Apple'], ['openai', 'OpenAI'],
  ['chatgpt', 'ChatGPT'], ['claude', 'Claude'], ['producthunt', 'Product Hunt'],
  ['deepl', 'DeepL'], ['heise', 'heise'], ['zeit', 'ZEIT'], ['spiegel', 'Spiegel'],
  ['amazon', 'Amazon'], ['netflix', 'Netflix'], ['instagram', 'Instagram'], ['x', 'X'],
  ['linkedin', 'LinkedIn'], ['mail', 'Mail'], ['proton', 'Proton'], ['discord', 'Discord']
]);

export function siteName(raw, title = '') {
  const host = hostOf(raw);
  if (!host) return title || t('Webseite');
  const parts = host.split('.');
  const base = parts.length > 2 && parts[parts.length - 2] === 'co' ? parts[parts.length - 3] : parts[0];
  const dotted = host.replace(/\.(com|de|org|net|io|ai|app|dev|co\.uk)$/, '');
  if (KNOWN_SITES.has(dotted)) return KNOWN_SITES.get(dotted);
  if (KNOWN_SITES.has(base)) return KNOWN_SITES.get(base);
  return base.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function shortTitle(item, max = 24) {
  const title = (item?.title || '').trim();
  if (!title) return item?.url ? siteName(item.url) : t('Ohne Titel');
  if (title.length <= max) return title;
  return `${title.slice(0, max - 1).trim()}…`;
}

export function googleSearchUrl(query) {
  return `https://www.google.com/search?q=${encodeURIComponent(String(query || '').trim())}`;
}

export function urlFromQuery(query) {
  const value = String(query || '').trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return safeUrl(value);
  if (/^www\./i.test(value)) return safeUrl(`https://${value}`);
  if (/^[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/|$)/i.test(value)) return safeUrl(`https://${value}`);
  return null;
}

export function normalizeUrl(raw) {
  const clean = safeUrl(raw);
  if (!clean) return String(raw || '').trim();
  try {
    const url = new URL(clean);
    url.hash = '';
    let result = url.href;
    if (result.endsWith('/')) result = result.slice(0, -1);
    return result;
  } catch {
    return clean;
  }
}

export function itemKey(item) {
  if (!item) return '';
  if (item.kind === 'folder') return `folder:${item.folderId || item.id}`;
  return `url:${normalizeUrl(item.url)}`;
}

export function sameItem(a, b) {
  return !!a && !!b && itemKey(a) === itemKey(b);
}

export function formatRelative(timestamp) {
  if (!timestamp) return '—';
  const diff = timestamp - Date.now();
  const abs = Math.abs(diff);
  const relative = new Intl.RelativeTimeFormat(locale(), { numeric: 'auto' });
  if (abs < 60_000) return t('gerade eben');
  if (abs < 3_600_000) return relative.format(Math.round(diff / 60_000), 'minute');
  if (abs < 86_400_000) return relative.format(Math.round(diff / 3_600_000), 'hour');
  if (abs < 604_800_000) return relative.format(Math.round(diff / 86_400_000), 'day');
  return formatDate(timestamp);
}

export function formatDate(timestamp) {
  if (!timestamp) return '—';
  return new Intl.DateTimeFormat(locale(), { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(timestamp));
}

export function plural(count, one = 'Objekt', many = 'Objekte') {
  return pluralI18n(count, one, many);
}

export function uid(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function copyText(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text).catch(() => legacyCopy(text));
  }
  return Promise.resolve(legacyCopy(text));
}

function legacyCopy(text) {
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  try { document.execCommand('copy'); } catch {  }
  area.remove();
}
