import { api } from './platform.js';
import { $$, el, escapeXml, hashString, hostOf } from './util.js';

const S = (body, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" ${extra} aria-hidden="true">${body}</svg>`;

export const SVG = {
  spark: S('<path d="M12 2.6c.7 4.5 2.9 6.7 7.4 7.4-4.5.7-6.7 2.9-7.4 7.4-.7-4.5-2.9-6.7-7.4-7.4 4.5-.7 6.7-2.9 7.4-7.4Z" fill="currentColor" fill-opacity=".16"/><path d="M18.8 17.1c.25 1.55 1 2.3 2.55 2.55-1.55.25-2.3 1-2.55 2.55-.25-1.55-1-2.3-2.55-2.55 1.55-.25 2.3-1 2.55-2.55Z" fill="currentColor" fill-opacity=".48" stroke="none"/>'),
  search: S('<circle cx="10.8" cy="10.8" r="6.4"/><path d="m15.6 15.6 4.4 4.4"/>'),
  wifi: S('<path d="M2.8 8.5a13.4 13.4 0 0 1 18.4 0"/><path d="M5.7 11.7a9 9 0 0 1 12.6 0"/><path d="M8.7 14.9a4.6 4.6 0 0 1 6.6 0"/><circle cx="12" cy="18" r="1.1" fill="currentColor" stroke="none"/>'),
  hand: S('<path d="M8.6 12.2V5.7a1.6 1.6 0 0 1 3.2 0v5.1"/><path d="M11.8 10.8V4.9a1.6 1.6 0 0 1 3.2 0v5.9"/><path d="M15 10.8V6.5a1.6 1.6 0 0 1 3.2 0v6.6c0 4.2-2.5 6.9-6.5 6.9-2.4 0-4.1-1-5.4-2.8l-2.6-3.6a1.65 1.65 0 0 1 2.5-2.1l2.4 2.3"/>'),
  desktop: S('<rect x="2.5" y="3.7" width="19" height="13.2" rx="2.2"/><path d="M8 20.3h8M12 16.9v3.4"/><path d="M5.7 13.4h12.6" stroke-opacity=".35"/>'),
  pin: S('<path d="M9 3.8h6l-.8 5.1 3.3 3.1H6.5l3.3-3.1L9 3.8Z"/><path d="M12 12v8.2"/><path d="m9.2 17.4 2.8 2.8 2.8-2.8" stroke-opacity=".55"/>'),
  pinOff: S('<path d="M9 3.8h6l-.8 5.1 3.3 3.1H6.5l3.3-3.1L9 3.8Z"/><path d="M12 12v8.2"/><path d="m4 3 16 18" stroke="#e6a0ad"/>'),
  trash: S('<path d="M4.5 6.6h15M9.2 6.6V4.4h5.6v2.2"/><path d="M6.6 6.6 7.5 20h9l.9-13.4"/><path d="M10.2 10v6M13.8 10v6"/>'),
  close: S('<path d="m6.5 6.5 11 11M17.5 6.5l-11 11"/>'),
  image: S('<rect x="3" y="4.5" width="18" height="15" rx="2.4"/><circle cx="8.4" cy="9.5" r="1.6"/><path d="m4.2 17 4.8-4.6 3.4 3 2.7-2.4 5 4"/>'),
  refresh: S('<path d="M20 11.5a8 8 0 1 0-2.2 6"/><path d="M20 5.6v5.9h-5.9"/>'),
  grid: S('<rect x="3.5" y="3.5" width="7" height="7" rx="1.7"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.7"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.7"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.7"/>'),
  list: S('<path d="M8.5 6.5h11M8.5 12h11M8.5 17.5h11"/><circle cx="4.7" cy="6.5" r="1" fill="currentColor" stroke="none"/><circle cx="4.7" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="4.7" cy="17.5" r="1" fill="currentColor" stroke="none"/>'),
  back: S('<path d="m14.5 5.5-6 6.5 6 6.5"/>'),
  forward: S('<path d="m9.5 5.5 6 6.5-6 6.5"/>'),
  chevron: S('<path d="m8.5 10 3.5 3.5 3.5-3.5"/>'),
  finder: S('<rect x="3" y="3.2" width="18" height="17.6" rx="3.6" fill="currentColor" fill-opacity=".07"/><path d="M9 3.2v17.6" stroke-opacity=".55"/><circle cx="6" cy="8" r=".9" fill="currentColor" stroke="none"/><circle cx="6" cy="12" r=".9" fill="currentColor" fill-opacity=".55" stroke="none"/><path d="M12.4 8h5M12.4 12h5M12.4 16h3" stroke-opacity=".75"/>'),
  folder: S('<path d="M3.2 6.6A2.2 2.2 0 0 1 5.4 4.4h3.5l1.9 2.2h7.8a2.2 2.2 0 0 1 2.2 2.2v8a2.2 2.2 0 0 1-2.2 2.2H5.4A2.2 2.2 0 0 1 3.2 16.8V6.6Z" fill="currentColor" fill-opacity=".07"/><path d="M3.2 9.2h17.6v7.6a2.2 2.2 0 0 1-2.2 2.2H5.4a2.2 2.2 0 0 1-2.2-2.2V9.2Z" fill="currentColor" fill-opacity=".045" stroke="none"/><path d="M3.2 6.6A2.2 2.2 0 0 1 5.4 4.4h3.5l1.9 2.2h7.8a2.2 2.2 0 0 1 2.2 2.2v8a2.2 2.2 0 0 1-2.2 2.2H5.4A2.2 2.2 0 0 1 3.2 16.8V6.6Z" fill="none" stroke="currentColor" stroke-width="1.05" stroke-opacity=".98"/><path d="M3.2 9.2h17.6" stroke-width="1.05" stroke-opacity=".78"/>'),
  history: S('<path d="M3.6 12a8.4 8.4 0 1 0 2.6-6.1L3.4 8.7"/><path d="M3.4 4.5v4.2h4.2"/><path d="M12 7.5V12l3.2 2"/>'),
  bookmarks: S('<path d="M6 3.8h12v16.4l-6-4.1-6 4.1V3.8Z"/><path d="M9.2 8.1h5.6" stroke-opacity=".5"/>'),
  dock: S('<rect x="2.5" y="9.5" width="19" height="10" rx="3.2"/><rect x="5.3" y="12.4" width="3" height="3" rx=".8" fill="currentColor" fill-opacity=".45" stroke="none"/><rect x="10.5" y="12.4" width="3" height="3" rx=".8" fill="currentColor" fill-opacity=".45" stroke="none"/><rect x="15.7" y="12.4" width="3" height="3" rx=".8" fill="currentColor" fill-opacity=".45" stroke="none"/>'),
  settings: S('<path d="M4 7h9M17 7h3M4 12h3M11 12h9M4 17h7M15 17h5"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="13" cy="17" r="2"/>'),
  external: S('<path d="M13.5 4.5H19.5V10.5"/><path d="M19.5 4.5 10.8 13.2"/><path d="M18 14.5v4a1.8 1.8 0 0 1-1.8 1.8H5.8A1.8 1.8 0 0 1 4 18.5V8.2a1.8 1.8 0 0 1 1.8-1.8h4"/>'),
  copy: S('<rect x="8" y="8" width="11.5" height="11.5" rx="2.2"/><path d="M16 8V6.2A2.2 2.2 0 0 0 13.8 4H6.2A2.2 2.2 0 0 0 4 6.2v7.6A2.2 2.2 0 0 0 6.2 16H8"/>'),
  clock: S('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.2V12l3.2 2"/>'),
  globe: S('<circle cx="12" cy="12" r="8.5"/><path d="M3.6 12h16.8M12 3.5c2.2 2.4 3.3 5.3 3.3 8.5S14.2 18.1 12 20.5c-2.2-2.4-3.3-5.3-3.3-8.5S9.8 5.9 12 3.5Z"/>'),
  app: S('<rect x="3.5" y="3.5" width="17" height="17" rx="4.2"/><circle cx="12" cy="12" r="3.4"/><path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2"/>'),
  eye: S('<path d="M2.6 12S6 6.6 12 6.6 21.4 12 21.4 12 18 17.4 12 17.4 2.6 12 2.6 12Z"/><circle cx="12" cy="12" r="2.5"/>'),
  more: S('<circle cx="5.5" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.2" fill="currentColor" stroke="none"/>'),
  check: S('<path d="m5 12.5 4.5 4.5L19 7"/>'),
  plus: S('<path d="M12 5v14M5 12h14"/>'),
  arrowUpRight: S('<path d="M7 17 17 7M8 7h9v9"/>'),
  command: S('<path d="M9 6.5a2.5 2.5 0 1 0-2.5 2.5H9m0 0v6m0-6h6M9 17.5A2.5 2.5 0 1 1 6.5 15H9m6-8.5a2.5 2.5 0 1 1 2.5 2.5H15m0 0v6m0-6H9m6 6a2.5 2.5 0 1 0 2.5-2.5H15"/>'),
  stack: S('<rect x="4" y="4" width="12" height="12" rx="2.2"/><path d="M8 20h10a2 2 0 0 0 2-2V8"/>'),
  window: S('<rect x="3" y="4.5" width="18" height="15" rx="2.4"/><path d="M3 9h18"/><circle cx="6.2" cy="6.8" r=".8" fill="currentColor" stroke="none"/><circle cx="8.8" cy="6.8" r=".8" fill="currentColor" stroke="none"/>'),
  widgets: S('<rect x="3.2" y="3.2" width="7.4" height="7.4" rx="2"/><rect x="13.4" y="3.2" width="7.4" height="7.4" rx="2"/><rect x="3.2" y="13.4" width="7.4" height="7.4" rx="2"/><rect x="13.4" y="13.4" width="7.4" height="7.4" rx="2"/><path d="M6.9 6.9h.1M17.1 6.9h.1M6.9 17.1h.1M17.1 17.1h.1" stroke-width="2.4"/>'),
  spaces: S('<rect x=\"3\" y=\"3.5\" width=\"8\" height=\"7\" rx=\"1.7\"/><rect x=\"13\" y=\"3.5\" width=\"8\" height=\"7\" rx=\"1.7\"/><rect x=\"3\" y=\"13.5\" width=\"8\" height=\"7\" rx=\"1.7\"/><rect x=\"13\" y=\"13.5\" width=\"8\" height=\"7\" rx=\"1.7\"/><path d=\"M7 7h.1M17 7h.1M7 17h.1M17 17h.1\" stroke-width=\"2.2\"/>')
};

export function iconEl(name = 'app', className = 'glyph') {
  const span = el('span', className);
  span.setAttribute('aria-hidden', 'true');
  span.innerHTML = SVG[name] || SVG.app;
  return span;
}

export function hydrateIcons(root = document) {
  $$('[data-icon]', root).forEach((placeholder) => {
    const name = placeholder.dataset.icon || 'app';
    const icon = iconEl(name, placeholder.className || 'glyph');
    placeholder.replaceWith(icon);
  });
}

function isAllowedIconUrl(value) {
  if (typeof value !== 'string' || !value) return false;
  return /^(https?:\/\/|data:image\/|blob:)/i.test(value);
}

export function monogramDataUrl(label = '', seed = '') {
  const character = escapeXml(Array.from((label || seed || '?').trim())[0]?.toUpperCase() || '?');
  const shade = 198 + (Math.abs(parseInt(hashString(seed || label), 36) || 0) % 34);
  const light = Math.min(255, shade + 5);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="6" y="6" width="52" height="52" rx="14" fill="none" stroke="#ffffff" stroke-opacity=".30" stroke-width="2"/><text x="32" y="34" text-anchor="middle" dominant-baseline="central" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="26" font-weight="600" fill="rgb(${shade},${shade},${light})">${character}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function detectDarkFavicon(img, wrap) {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 24;
    canvas.height = 24;
    const ctx = canvas.getContext('2d');
    if (!ctx || typeof ctx.drawImage !== 'function' || typeof ctx.getImageData !== 'function') return;
    ctx.drawImage(img, 0, 0, 24, 24);
    const data = ctx.getImageData(0, 0, 24, 24).data;
    let luminance = 0;
    let count = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 24) continue;
      luminance += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      count += 1;
    }
    if (count && luminance / count < 92) wrap.classList.add('is-dark-favicon');
    else wrap.classList.remove('is-dark-favicon');
  } catch {
    
  }
}

export function appIcon(item = {}, size = 56) {
  const wrap = el('div', 'app-icon');
  wrap.style.setProperty('--app-size', `${size}px`);

  const mono = document.createElement('img');
  mono.className = 'app-icon__mono';
  mono.src = monogramDataUrl(item.title || hostOf(item.url) || 'A', item.url || item.title);
  mono.alt = '';
  mono.draggable = false;
  wrap.append(mono);

  const candidates = [];
  if (isAllowedIconUrl(item.favIconUrl)) candidates.push(item.favIconUrl);
  const local = api.faviconUrl(item.url, 128);
  if (local) candidates.push(local);
  if (!candidates.length) return wrap;

  const img = document.createElement('img');
  img.className = 'app-icon__favicon';
  img.alt = '';
  img.decoding = 'async';
  img.referrerPolicy = 'no-referrer';
  img.draggable = false;

  let index = 0;
  const next = () => {
    if (index >= candidates.length) {
      img.remove();
      return;
    }
    img.src = candidates[index];
    index += 1;
  };
  img.addEventListener('error', next);
  img.addEventListener('load', () => {
    wrap.classList.add('has-favicon');
    detectDarkFavicon(img, wrap);
  });
  wrap.append(img);
  next();
  return wrap;
}

export function folderIcon(size = 56) {
  const wrap = el('div', 'folder-icon');
  wrap.style.setProperty('--app-size', `${size}px`);
  wrap.innerHTML = SVG.folder;
  wrap.setAttribute('aria-hidden', 'true');
  return wrap;
}

export function builtinIcon(name = 'app', size = 56) {
  const wrap = el('div', `builtin-icon builtin-icon--${name}`);
  wrap.style.setProperty('--app-size', `${size}px`);
  wrap.append(iconEl(SVG[name] ? name : 'app', 'glyph'));
  return wrap;
}

export function itemIcon(item = {}, size = 56) {
  if (item.kind === 'folder') return folderIcon(size);
  if (item.app) return builtinIcon(item.app, size);
  if (item.url) return appIcon(item, size);
  return builtinIcon('app', size);
}
