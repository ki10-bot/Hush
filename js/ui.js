import { iconEl } from './icons.js';
import { $, clamp, el } from './util.js';
import { setLanguage, currentLanguage, t, locale } from './i18n.js';

const REDUCE_QUERY = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');

export function prefersReducedMotion() {
  return !!REDUCE_QUERY?.matches;
}

export function applyTheme(settings = {}) {
  if (currentLanguage() !== (settings.language || 'en')) setLanguage(settings.language || 'en');
  const root = document.documentElement;
  const glassPercent = clamp(Number(settings.glass ?? 52), 35, 85);
  const dimPercent = clamp(Number(settings.dim ?? 42), 0, 65);
  const windowGlass = clamp(Number(settings.windowGlass ?? 62), 0, 100);
  const glass = glassPercent / 100;
  const reduce = !settings.animations || prefersReducedMotion();
  const theme = ['dark', 'light', 'color'].includes(settings.theme) ? settings.theme : 'dark';
  const darken = settings.darkenWallpaper === true && dimPercent > 0;

  
  root.style.setProperty('--glass-alpha', (0.60 + glass * 0.30).toFixed(2));
  root.style.setProperty('--glass-blur', `${Math.round(6 + glass * 18)}px`);
  root.style.setProperty('--dim', (dimPercent / 100).toFixed(2));
  root.style.setProperty('--glass-glow', (0.012 + glass * 0.024).toFixed(3));
  root.style.setProperty('--window-alpha', (0.90 - windowGlass * 0.0032).toFixed(2));
  root.style.setProperty('--window-blur', `${Math.round(4 + windowGlass * 0.24)}px`);
  root.style.setProperty('--wallpaper-brightness', darken ? (1 - dimPercent / 100 * 0.34).toFixed(2) : '1');
  root.style.setProperty('--wallpaper-saturate', darken ? (1 - dimPercent / 100 * 0.22).toFixed(2) : '1');
  root.dataset.theme = theme;

  document.body.classList.toggle('reduced-motion', reduce);
  document.body.classList.toggle('no-parallax', !settings.parallax);
  document.body.classList.toggle('no-magnify', !settings.magnify);
  document.body.classList.toggle('darken-wallpaper', darken);
  document.body.classList.toggle('theme-light', theme === 'light');
  document.body.classList.toggle('theme-color', theme === 'color');

  return reduce;
}

export function initClock(getSettings = () => ({})) {
  const clock = $('#clock');
  const timeNode = $('#clockTime');
  const dateNode = $('#clockDate');
  if (!clock || !timeNode || !dateNode) return () => {};

  const render = (main, seconds) => {
    timeNode.replaceChildren();
    const mainNode = document.createElement('span');
    mainNode.className = 'clock__main';
    mainNode.textContent = main;
    timeNode.append(mainNode);
    if (seconds) {
      const secondsNode = document.createElement('span');
      secondsNode.className = 'clock__seconds';
      secondsNode.textContent = `.${seconds}`;
      timeNode.append(secondsNode);
    }
  };

  const update = () => {
    const settings = getSettings() || {};
    const lang = locale();
    const weekdayFmt = new Intl.DateTimeFormat(lang, { weekday: 'short' });
    const monthFmt = new Intl.DateTimeFormat(lang, { month: 'short' });
    const options = { hour: '2-digit', minute: '2-digit', hour12: false };
    if (settings.showSeconds) options.second = '2-digit';
    const parts = new Intl.DateTimeFormat(lang, options).formatToParts(new Date());
    const value = (type) => parts.find((part) => part.type === type)?.value || '';
    const now = new Date();
    const weekday = weekdayFmt.format(now).replace('.', '').toUpperCase();
    const day = String(now.getDate()).padStart(2, '0');
    const month = monthFmt.format(now).replace('.', '').toUpperCase();
    const main = `${value('hour')}:${value('minute')}`;
    const seconds = settings.showSeconds ? value('second') : '';
    render(main, seconds);
    dateNode.textContent = `${weekday} · ${day} ${month} ${now.getFullYear()}`;
    clock.dateTime = now.toISOString();
  };

  let timer = 0;
  const schedule = () => {
    clearTimeout(timer);
    const withSeconds = !!getSettings()?.showSeconds;
    const period = withSeconds ? 1000 : 15_000;
    const delay = Math.max(120, period - (Date.now() % period));
    timer = setTimeout(() => {
      update();
      schedule();
    }, delay);
  };

  const refresh = () => { update(); schedule(); };
  document.addEventListener('hush:settingschange', refresh);
  document.addEventListener('hush:localechange', refresh);
  update();
  schedule();

  return () => {
    clearTimeout(timer);
    document.removeEventListener('hush:settingschange', refresh);
    document.removeEventListener('hush:localechange', refresh);
  };
}

export function initAmbient(initialSettings = {}) {
  const canvas = $('#ambientCanvas');
  if (!canvas) return { update() {}, destroy() {} };
  const ctx = canvas.getContext('2d', { alpha: true });
  let settings = { ...initialSettings };
  let reduce = !settings.animations || prefersReducedMotion();
  let width = 0;
  let height = 0;
  let dpr = 1;
  let particles = [];
  let raf = 0;
  let pointerFrame = 0;
  let mouseX = 0;
  let mouseY = 0;

  const makeParticles = () => {
    const count = clamp(Math.round((width * height) / 26000), 18, 54);
    particles = Array.from({ length: count }, (_, i) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 0.4 + Math.random() * (i % 9 === 0 ? 1.4 : 0.8),
      speed: 0.002 + Math.random() * 0.008,
      drift: 0.1 + Math.random() * 0.4,
      alpha: 0.08 + Math.random() * 0.24,
      phase: Math.random() * Math.PI * 2
    }));
  };

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    makeParticles();
    draw(performance.now());
  };

  function draw(time = 0) {
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    const px = settings.parallax && !reduce ? (mouseX - width / 2) * 0.008 : 0;
    const py = settings.parallax && !reduce ? (mouseY - height / 2) * 0.008 : 0;

    for (const p of particles) {
      const y = ((p.y - time * p.speed * 10 + height * 2) % (height + 80)) - 40;
      const x = ((p.x + Math.sin(time * 0.00016 + p.phase) * 8 * p.drift + px * p.drift + width) % (width + 40)) - 20;
      const twinkle = 0.72 + 0.28 * Math.sin(time * 0.0009 + p.phase);
      const alpha = p.alpha * twinkle;
      ctx.beginPath();
      ctx.arc(x, y + py * p.drift, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(235, 235, 242, ${alpha})`;
      if (p.r > 1.4) {
        ctx.shadowBlur = 6;
        ctx.shadowColor = 'rgba(255, 255, 255, .22)';
      } else {
        ctx.shadowBlur = 0;
      }
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  const frame = (time) => {
    draw(time);
    raf = requestAnimationFrame(frame);
  };

  const start = () => {
    cancelAnimationFrame(raf);
    raf = 0;
    if (reduce) draw(performance.now());
    else raf = requestAnimationFrame(frame);
  };

  window.addEventListener('resize', () => {
    clearTimeout(resize._timer);
    resize._timer = setTimeout(resize, 140);
  });

  window.addEventListener('pointermove', (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
    if (pointerFrame || !settings.parallax || reduce) return;
    pointerFrame = requestAnimationFrame(() => {
      pointerFrame = 0;
      const root = document.documentElement;
      root.style.setProperty('--parallax-x', `${clamp((mouseX / window.innerWidth - 0.5) * -10, -7, 7)}px`);
      root.style.setProperty('--parallax-y', `${clamp((mouseY / window.innerHeight - 0.5) * -7, -5, 5)}px`);
    });
  }, { passive: true });

  const mediaHandler = () => {
    reduce = !settings.animations || prefersReducedMotion();
    start();
  };
  REDUCE_QUERY?.addEventListener?.('change', mediaHandler);

  resize();
  start();

  return {
    update(nextSettings) {
      settings = { ...settings, ...nextSettings };
      const nextReduce = !settings.animations || prefersReducedMotion();
      const changed = nextReduce !== reduce;
      reduce = nextReduce;
      if (changed) start();
      if (!settings.parallax) {
        document.documentElement.style.setProperty('--parallax-x', '0px');
        document.documentElement.style.setProperty('--parallax-y', '0px');
      }
    },
    destroy() {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(pointerFrame);
      raf = 0;
      pointerFrame = 0;
      REDUCE_QUERY?.removeEventListener?.('change', mediaHandler);
    }
  };
}


let menuCloseBound = false;

export function hideContextMenu() {
  const menu = $('#contextMenu');
  if (!menu) return;
  menu.classList.remove('is-open');
  menu.setAttribute('aria-hidden', 'true');
}

export function showContextMenu(x, y, items = []) {
  const menu = $('#contextMenu');
  if (!menu) return;
  menu.innerHTML = '';

  items.forEach((entry) => {
    if (!entry) return;
    if (entry.separator) {
      menu.append(el('div', 'context-separator'));
      return;
    }
    const button = el('button', `context-item${entry.danger ? ' context-item--danger' : ''}${entry.disabled ? ' context-item--disabled' : ''}`);
    button.type = 'button';
    button.setAttribute('role', 'menuitem');
    button.disabled = !!entry.disabled;
    button.append(iconEl(entry.icon || 'more', 'context-item__icon'));
    button.append(el('span', 'context-item__label', t(entry.label || '')));
    if (entry.shortcut) button.append(el('kbd', 'context-item__shortcut', entry.shortcut));
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      hideContextMenu();
      if (!entry.disabled) entry.action?.();
    });
    menu.append(button);
  });

  menu.setAttribute('aria-hidden', 'false');
  menu.classList.add('is-open');
  menu.style.visibility = 'hidden';
  menu.style.left = '0px';
  menu.style.top = '0px';

  requestAnimationFrame(() => {
    const rect = menu.getBoundingClientRect();
    const left = clamp(x, 8, window.innerWidth - rect.width - 8);
    const top = clamp(y, 42, window.innerHeight - rect.height - 8);
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    menu.style.visibility = '';
  });

  if (!menuCloseBound) {
    menuCloseBound = true;
    document.addEventListener('pointerdown', (event) => {
      if (menu.classList.contains('is-open') && !menu.contains(event.target)) hideContextMenu();
    }, true);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') hideContextMenu();
    });
    window.addEventListener('blur', hideContextMenu);
    window.addEventListener('resize', hideContextMenu);
  }
}

export function showDockTooltip(text, rect) {
  const tip = $('#dockTooltip');
  if (!tip || !text) return;
  tip.textContent = t(text);
  tip.setAttribute('aria-hidden', 'false');
  tip.classList.add('is-visible');
  const width = tip.offsetWidth || 160;
  const left = clamp(rect.left + rect.width / 2, width / 2 + 8, window.innerWidth - width / 2 - 8);
  tip.style.left = `${left}px`;
  tip.style.top = `${Math.max(48, rect.top - 12)}px`;
}

export function hideDockTooltip() {
  const tip = $('#dockTooltip');
  if (!tip) return;
  tip.classList.remove('is-visible');
  tip.setAttribute('aria-hidden', 'true');
}

export function bounce(node) {
  if (!node || document.body.classList.contains('reduced-motion')) return;
  node.classList.remove('is-bouncing');
  void node.offsetWidth;
  node.classList.add('is-bouncing');
  setTimeout(() => node.classList.remove('is-bouncing'), 400);
}
