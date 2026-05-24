/**
 * main.js — 应用主入口
 */

import { db } from './core/db.js';
import { eventBus } from './core/eventBus.js';
import { engine } from './core/engine.js';
import { initDesktop, changeWallpaper } from './apps/desktopApp.js';
import { initSettings } from './apps/settingsApp.js';

const TOTAL_PAGES = 2;
const SWIPE_THRESHOLD = 50;

const state = {
  currentPage: 0,
  activeApp: null,
  touchStartX: 0,
  touchStartY: 0,
  isSwiping: false,
};

//================================================================
document.addEventListener('DOMContentLoaded', async () => {
  try { await bootstrap(); }
  catch (err) { console.error('[main]启动失败:', err); showFatalError(err); }
});

async function bootstrap() {
  registerServiceWorker();
  await initDatabase();
  await applyUserTheme();
  initStatusBar();
  initStarfield();
  await initDesktop();
  initDesktopSlider();
  initRouter();
  engine.start();
  bindGlobalEvents();
  hideLoadingScreen();
  window.__phoneRouter = { openApp };
}

// ================================================================
//  1. SW
// ================================================================
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./sw.js')
    .then(r => console.log('[SW] 注册成功, scope:', r.scope))
    .catch(e => console.warn('[SW] 注册失败:', e));
}

// ================================================================
//  2. DB初始化（扩展 profile 字段）
// ================================================================
async function initDatabase() {
  let user = await db.user.get('profile');
  if (!user) {
    user = {
      name: 'User',
      avatar: '',
      persona: '',
      social_name: '',
      social_bio: '',
      social_id: '',
      api_base: '',
      api_key: '',
      api_model: '',
      theme: 'dark',
    };
    await db.user.set('profile', user);
  } else {
    // 迁移：确保新字段存在
    let dirty = false;
    const defaults = {
      social_name: '', social_bio: '', social_id: '',
      api_base: '', api_model: '', persona: '', avatar: '',
    };
    for (const [k, v] of Object.entries(defaults)) {
      if (!(k in user)) { user[k] = v; dirty = true; }
    }
    if (dirty) await db.user.set('profile', user);
  }

  const chars = await db.characters.getAll();
  if (!chars || chars.length === 0) {
    await db.characters.set('char_001', {
      id: 'char_001', name: '系统助理', avatar: '',
      system_prompt: '你是一个友善、简洁的智能助手。',
      first_message: '你好！有什么我可以帮你的吗？✨',
      custom_css: '', is_bot: true,});
  }
}

// ================================================================
//  3. 主题
// ================================================================
async function applyUserTheme() {
  const user = await db.user.get('profile');
  document.documentElement.setAttribute('data-theme', user?.theme ?? 'dark');
}

// ================================================================
//  4. 状态栏
// ================================================================
function initStatusBar() {
  updateClock();
  setInterval(updateClock, 1000);
  if ('getBattery' in navigator) {
    navigator.getBattery().then(bat => {
      updateBatteryUI(bat.level, bat.charging);
      bat.addEventListener('levelchange', () => updateBatteryUI(bat.level, bat.charging));
      bat.addEventListener('chargingchange', () => updateBatteryUI(bat.level, bat.charging));
    });
  }
}

function updateClock() {
  const el = document.getElementById('status-time');
  if (!el) return;
  const n = new Date();
  el.textContent = `${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`;
}

function updateBatteryUI(level, charging) {
  const el = document.getElementById('status-battery');
  if (!el) return;
  const p = Math.round(level * 100);
  el.textContent = charging ? `⚡${p}%` : `🔋${p}%`;
}

// ================================================================
//  5. 星空
// ================================================================
function initStarfield() {
  const canvas = document.getElementById('starfield-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let stars = [], animId = null;

  function resize() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;const count = Math.floor((canvas.width * canvas.height) / 3000);
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.3, alpha: Math.random(),speed: Math.random() * 0.008 + 0.002, phase: Math.random() * Math.PI * 2,
    }));
  }

  function draw(ts) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const s of stars) {
      s.alpha =0.3 + 0.7 * Math.abs(Math.sin(ts * s.speed + s.phase));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(232,224,208,${s.alpha})`;
      ctx.fill();
    }
    animId = requestAnimationFrame(draw);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(animId);
    else animId = requestAnimationFrame(draw);
  });

  new ResizeObserver(resize).observe(canvas);
  resize();animId = requestAnimationFrame(draw);
}

// ================================================================
//  6. 桌面滑动（触摸 + 鼠标拖拽 + 滚轮 + 键盘）
// ================================================================
function initDesktopSlider() {
  const slider = document.getElementById('desktop-slider');
  const indicator = document.getElementById('page-indicator');
  if (!slider || !indicator) return;

  indicator.innerHTML = '';
  for (let i = 0; i < TOTAL_PAGES; i++) {
    const dot = document.createElement('button');
    dot.className = 'page-dot';
    dot.setAttribute('role', 'tab');
    dot.setAttribute('aria-label', `第 ${i + 1} 页`);
    dot.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    dot.dataset.page = i;
    dot.addEventListener('click', () => goToPage(i));
    indicator.appendChild(dot);
  }
  updatePageIndicator();

  // 触摸
  slider.addEventListener('touchstart', (e) => {
    state.touchStartX = e.touches[0].clientX;
    state.touchStartY = e.touches[0].clientY;
    state.isSwiping = false;
  }, { passive: true });

  slider.addEventListener('touchmove', (e) => {
    const dx = e.touches[0].clientX - state.touchStartX;
    const dy = e.touches[0].clientY - state.touchStartY;
    if (!state.isSwiping && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) >8) state.isSwiping = true;
  }, { passive: true });

  slider.addEventListener('touchend', (e) => {
    if (!state.isSwiping) return;
    const dx = e.changedTouches[0].clientX - state.touchStartX;
    if (dx< -SWIPE_THRESHOLD && state.currentPage < TOTAL_PAGES - 1) goToPage(state.currentPage + 1);
    else if (dx > SWIPE_THRESHOLD && state.currentPage > 0) goToPage(state.currentPage - 1);
    state.isSwiping = false;
  }, { passive: true });

  // 鼠标拖拽
  slider.addEventListener('mousedown', (e) => {
    if (e.target.closest('.widget-editor-overlay')) return;
    if (e.target.closest('.app-icon-item')) return;
    state.touchStartX = e.clientX;
    state.touchStartY = e.clientY;
    state.isSwiping = false;slider.style.cursor = 'grabbing';

    const onMove = (ev) => {
      const dx = ev.clientX - state.touchStartX;
      const dy = ev.clientY - state.touchStartY;
      if (!state.isSwiping && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) state.isSwiping = true;
    };
    const onUp = (ev) => {
      slider.style.cursor = '';
      if (state.isSwiping) {
        const dx = ev.clientX - state.touchStartX;
        if (dx < -SWIPE_THRESHOLD && state.currentPage < TOTAL_PAGES - 1) goToPage(state.currentPage + 1);
        else if (dx > SWIPE_THRESHOLD && state.currentPage > 0) goToPage(state.currentPage - 1);}
      state.isSwiping = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  // 滚轮
  let wheelCooldown = false;
  slider.addEventListener('wheel', (e) => {
    if (e.target.closest('.widget-editor-overlay')) return;
    if (wheelCooldown) return;
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(delta) < 30) return;
    e.preventDefault();
    wheelCooldown = true;
    setTimeout(() => { wheelCooldown = false; }, 500);
    if (delta > 0 && state.currentPage < TOTAL_PAGES - 1) goToPage(state.currentPage + 1);
    else if (delta < 0 && state.currentPage > 0) goToPage(state.currentPage - 1);
  }, { passive: false });

  // 键盘
  document.addEventListener('keydown', (e) => {
    if (state.activeApp) return;
    if (e.key === 'ArrowRight' && state.currentPage < TOTAL_PAGES - 1) goToPage(state.currentPage + 1);
    if (e.key === 'ArrowLeft' && state.currentPage > 0) goToPage(state.currentPage - 1);
  });
}

function goToPage(idx) {
  if (idx < 0 || idx >= TOTAL_PAGES) return;
  state.currentPage = idx;
  const slider = document.getElementById('desktop-slider');
  if (slider) {
    slider.style.transform = `translateX(${-(idx * 100)}%)`;slider.style.transition = `transform var(--duration-page) var(--ease-smooth)`;
  }
  updatePageIndicator();
  eventBus.emit('desktop:pageChanged', { page: idx });
}

function updatePageIndicator() {
  document.querySelectorAll('.page-dot').forEach((d, i) => {
    const a = i === state.currentPage;
    d.classList.toggle('active', a);d.setAttribute('aria-selected', a ? 'true' : 'false');
  });
}

// ================================================================
//  7. 路由
// ================================================================
function initRouter() {
  document.querySelectorAll('.dock-item[data-app]').forEach(btn => {
    btn.addEventListener('click', () => openApp(btn.dataset.app));
  });
  document.getElementById('btn-home')?.addEventListener('click', closeCurrentApp);
  document.querySelectorAll('.btn-back').forEach(btn => {
    btn.addEventListener('click', closeCurrentApp);
  });
  window.addEventListener('popstate', () => { if (state.activeApp) closeCurrentApp(); });document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.activeApp) closeCurrentApp();
  });
}

function openApp(appId) {
  if (state.activeApp === appId) return;
  if (state.activeApp) closeAppView(state.activeApp);
  const v = document.querySelector(`.app-view[data-app="${appId}"]`);
  if (!v) return;
  history.pushState({ app: appId }, '', `#${appId}`);
  v.hidden = false;
  void v.offsetHeight;
  v.classList.add('app-view--active');
  state.activeApp = appId;
  eventBus.emit('app:opened', { appId });
}

function closeCurrentApp() {
  if (!state.activeApp) return;
  closeAppView(state.activeApp);
  state.activeApp = null;
  if (location.hash) history.replaceState(null, '', location.pathname);
  eventBus.emit('app:closed', {});
}

function closeAppView(appId) {
  const v = document.querySelector(`.app-view[data-app="${appId}"]`);
  if (!v) return;
  v.classList.remove('app-view--active');
  v.classList.add('app-view--closing');
  const onEnd = () => {
    v.classList.remove('app-view--closing');
    v.hidden = true;
    v.removeEventListener('transitionend', onEnd);
    v.removeEventListener('animationend', onEnd);
  };
  v.addEventListener('transitionend', onEnd, { once: true });
  v.addEventListener('animationend', onEnd, { once: true });setTimeout(onEnd, 450);
}

// ================================================================
//  8. 全局事件
// ================================================================
function bindGlobalEvents() {
  eventBus.on('notification:show', ({ avatar, name, text, appId }) => {
    showNotification(avatar, name, text, appId);
  });

  eventBus.on('theme:change', ({ theme }) => {
    document.documentElement.setAttribute('data-theme', theme);
  });

  eventBus.on('badge:update', ({ appId, count }) => {
    const di = document.querySelector(`.dock-item[data-app="${appId}"]`);
    if (!di) return;
    let b = di.querySelector('.dock-badge');
    if (count > 0) {
      if (!b) { b = document.createElement('span'); b.className = 'dock-badge'; di.appendChild(b); }
      b.textContent = count > 99 ? '99+' : count;
      b.hidden = false;
    } else if (b) { b.hidden = true; }
  });

  eventBus.on('wallpaper:change', async ({ file }) => { await changeWallpaper(file); });

  // App 打开时初始化对应模块
  eventBus.on('app:opened', ({ appId }) => {
    if (appId === 'settings') initSettings();
  });
}

// ================================================================
//  9. 通知
// ================================================================
function showNotification(avatar, name, text, appId) {
  const b = document.getElementById('notification-banner');
  if (!b) return;
  document.getElementById('notif-avatar').src = avatar || '';
  document.getElementById('notif-name').textContent = name || '系统通知';
  document.getElementById('notif-text').textContent = text || '';
  b.hidden = false;
  b.classList.remove('notif--hide');
  b.classList.add('notif--show');
  const handler = () => { hideNotification(); if (appId) openApp(appId); b.removeEventListener('click', handler); };
  b.addEventListener('click', handler);
  setTimeout(hideNotification, 4000);
}

function hideNotification() {
  const b = document.getElementById('notification-banner');
  if (!b || b.hidden) return;
  b.classList.remove('notif--show');
  b.classList.add('notif--hide');
  setTimeout(() => { b.hidden = true; b.classList.remove('notif--hide'); }, 350);
}

// ================================================================
//  10. Loading
// ================================================================
function hideLoadingScreen() {
  const l = document.getElementById('loading-screen');
  if (!l) return;
  const f = l.querySelector('.loading-bar-fill');
  if (f) f.style.animation = 'loadingBar 600ms var(--ease-out) forwards';
  setTimeout(() => {
    l.style.opacity = '0';
    l.style.transition = `opacity var(--duration-slow) var(--ease-out)`;
    setTimeout(() => { l.hidden = true; l.remove(); console.log('[main]✅ 虚拟掌机启动完成'); }, 450);
  }, 700);
}

function showFatalError(err) {
  const l = document.getElementById('loading-screen');
  if (l) {
    const t = l.querySelector('.loading-text');
    if (t) { t.textContent = `启动失败: ${err.message || err}`; t.style.color = '#ff6b6b'; }
  }
}

export { openApp, closeCurrentApp, goToPage, state };
