/**
 * main.js — 应用主入口 & 初始化流程
 */

import { db }from './core/db.js';
import { eventBus } from './core/eventBus.js';
import { engine }   from './core/engine.js';
import { initDesktop, changeWallpaper } from './apps/desktopApp.js';

// ── 常量 ──
const TOTAL_PAGES= 2;
const SWIPE_THRESHOLD = 50;

// ── 应用状态 ──
const state = {
  currentPage:  0,
  activeApp:    null,
  touchStartX:  0,
  touchStartY:  0,
  isSwiping:    false,
};

// ================================================================
//入口
// ================================================================
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await bootstrap();
  } catch (err) {
    console.error('[main]启动失败:', err);
    showFatalError(err);
  }
});

// ================================================================
//  bootstrap
// ================================================================
async function bootstrap() {
  registerServiceWorker();
  await initDatabase();
  await applyUserTheme();
  initStatusBar();
  initStarfield();
  await initDesktop();       // ← 渲染桌面 Widget
  initDesktopSlider();
  initRouter();
  engine.start();
  bindGlobalEvents();
  hideLoadingScreen();

  // 暴露路由给desktopApp 的 App 图标使用
  window.__phoneRouter = { openApp };
}

// ================================================================
//  1. Service Worker
// ================================================================
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker
    .register('./sw.js')
    .then(reg => console.log('[SW] 注册成功, scope:', reg.scope))
    .catch(err => console.warn('[SW] 注册失败:', err));
}

// ================================================================
//  2. 数据库初始化
// ================================================================
async function initDatabase() {
  const user = await db.user.get('profile');
  if (!user) {
    await db.user.set('profile', {
      name:'User', avatar: '', persona: '',api_key: '', theme: 'dark',});
  }

  const chars = await db.characters.getAll();
  if (!chars || chars.length === 0) {
    await db.characters.set('char_001', {
      id: 'char_001', name: '系统助理', avatar: '',
      system_prompt: '你是一个友善、简洁的智能助手。',
      first_message: '你好！有什么我可以帮你的吗？✨',
      custom_css: '', is_bot: true,
    });
  }
}

// ================================================================
//  3. 主题
// ================================================================
async function applyUserTheme() {
  const user = await db.user.get('profile');
  const theme = user?.theme ?? 'dark';
  document.documentElement.setAttribute('data-theme', theme);
}

// ================================================================
//  4. 状态栏
// ================================================================
function initStatusBar() {
  updateClock();
  setInterval(updateClock, 1000);
  if ('getBattery' in navigator) {
    navigator.getBattery().then(battery => {
      updateBatteryUI(battery.level, battery.charging);
      battery.addEventListener('levelchange', () => updateBatteryUI(battery.level, battery.charging));
      battery.addEventListener('chargingchange', () => updateBatteryUI(battery.level, battery.charging));
    });
  }
}

function updateClock() {
  const el = document.getElementById('status-time');
  if (!el) return;
  const now = new Date();
  el.textContent = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
}

function updateBatteryUI(level, charging) {
  const el = document.getElementById('status-battery');
  if (!el) return;
  const pct = Math.round(level * 100);
  el.textContent = charging ? `⚡${pct}%` : `🔋${pct}%`;
}

// ================================================================
//  5. 星空背景
// ================================================================
function initStarfield() {
  const canvas = document.getElementById('starfield-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let stars = [];
  let animId = null;

  function resize() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;const count = Math.floor((canvas.width * canvas.height) / 3000);
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.3,
      alpha: Math.random(),speed: Math.random() * 0.008 + 0.002,
      phase: Math.random() * Math.PI * 2,
    }));
  }

  function draw(ts) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach(s => {
      s.alpha =0.3 + 0.7 * Math.abs(Math.sin(ts * s.speed + s.phase));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(232, 224, 208, ${s.alpha})`;
      ctx.fill();
    });animId = requestAnimationFrame(draw);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(animId);
    else animId = requestAnimationFrame(draw);
  });

  new ResizeObserver(resize).observe(canvas);
  resize();
  animId = requestAnimationFrame(draw);
}

// ================================================================
//  6. 桌面滑动（触摸 + 鼠标 + 滚轮）
// ================================================================
function initDesktopSlider() {
  const slider    = document.getElementById('desktop-slider');
  const indicator = document.getElementById('page-indicator');
  if (!slider || !indicator) return;

  // 分页指示器
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

  // ── 触摸事件 ──
  slider.addEventListener('touchstart', (e) => {
    state.touchStartX = e.touches[0].clientX;
    state.touchStartY = e.touches[0].clientY;state.isSwiping = false;
  }, { passive: true });

  slider.addEventListener('touchmove', (e) => {
    const dx = e.touches[0].clientX - state.touchStartX;
    const dy = e.touches[0].clientY - state.touchStartY;
    if (!state.isSwiping && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) >8) {
      state.isSwiping = true;
    }
  }, { passive: true });

  slider.addEventListener('touchend', (e) => {
    if (!state.isSwiping) return;
    const dx = e.changedTouches[0].clientX - state.touchStartX;
    if (dx< -SWIPE_THRESHOLD && state.currentPage < TOTAL_PAGES - 1) goToPage(state.currentPage + 1);
    else if (dx > SWIPE_THRESHOLD && state.currentPage > 0) goToPage(state.currentPage - 1);
    state.isSwiping = false;
  }, { passive: true });

  // ── 鼠标拖拽（电脑端） ──
  slider.addEventListener('mousedown', (e) => {
    // 不拦截编辑器内的操作
    if (e.target.closest('.widget-editor-overlay')) return;

    state.touchStartX = e.clientX;
    state.touchStartY = e.clientY;
    state.isSwiping = false;
    slider.style.cursor = 'grabbing';

    const onMove = (ev) => {
      const dx = ev.clientX - state.touchStartX;
      const dy = ev.clientY - state.touchStartY;
      if (!state.isSwiping && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) {
        state.isSwiping = true;
      }
    };

    const onUp = (ev) => {
      slider.style.cursor = '';
      if (state.isSwiping) {
        const dx = ev.clientX - state.touchStartX;
        if (dx < -SWIPE_THRESHOLD && state.currentPage < TOTAL_PAGES - 1) goToPage(state.currentPage + 1);
        else if (dx > SWIPE_THRESHOLD && state.currentPage > 0) goToPage(state.currentPage - 1);
      }
      state.isSwiping = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  // ── 鼠标滚轮横向翻页（电脑端） ──
  slider.addEventListener('wheel', (e) => {
    // 不拦截编辑器内的滚动
    if (e.target.closest('.widget-editor-overlay')) return;

    // deltaX 横向滚动 或 deltaY 纵向滚动都支持翻页
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(delta) < 30) return;

    e.preventDefault();
    if (delta > 0 && state.currentPage < TOTAL_PAGES - 1) goToPage(state.currentPage + 1);
    else if (delta < 0 && state.currentPage > 0) goToPage(state.currentPage - 1);
  }, { passive: false });

  // ── 键盘左右箭头（电脑端） ──
  document.addEventListener('keydown', (e) => {
    if (state.activeApp) return; // App 打开时不响应
    if (e.key === 'ArrowRight' && state.currentPage < TOTAL_PAGES - 1) goToPage(state.currentPage + 1);
    if (e.key === 'ArrowLeft' && state.currentPage > 0) goToPage(state.currentPage - 1);
  });
}

function goToPage(pageIndex) {
  if (pageIndex < 0 || pageIndex >= TOTAL_PAGES) return;
  state.currentPage = pageIndex;
  const slider = document.getElementById('desktop-slider');
  if (slider) {
    slider.style.transform = `translateX(${-(pageIndex * 100)}%)`;slider.style.transition = `transform var(--duration-page) var(--ease-smooth)`;
  }
  updatePageIndicator();
  eventBus.emit('desktop:pageChanged', { page: pageIndex });
}

function updatePageIndicator() {
  document.querySelectorAll('.page-dot').forEach((dot, i) => {
    const active = i === state.currentPage;
    dot.classList.toggle('active', active);
    dot.setAttribute('aria-selected', active ? 'true' : 'false');
  });
}

// ================================================================
//  7. 路由
// ================================================================
function initRouter() {
  // Dock 按钮
  document.querySelectorAll('.dock-item[data-app]').forEach(btn => {
    btn.addEventListener('click', () => openApp(btn.dataset.app));
  });

  // Home 按钮
  document.getElementById('btn-home')?.addEventListener('click', closeCurrentApp);

  // App 内返回按钮
  document.querySelectorAll('.btn-back').forEach(btn => {
    btn.addEventListener('click', closeCurrentApp);
  });

  // 浏览器后退
  window.addEventListener('popstate', () => {
    if (state.activeApp) closeCurrentApp();
  });

  // ESC 键关闭 App（电脑端）
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.activeApp) closeCurrentApp();
  });
}

function openApp(appId) {
  if (state.activeApp === appId) return;
  if (state.activeApp) closeAppView(state.activeApp);

  const appView = document.querySelector(`.app-view[data-app="${appId}"]`);
  if (!appView) return;

  history.pushState({ app: appId }, '', `#${appId}`);
  appView.hidden = false;
  void appView.offsetHeight;
  appView.classList.add('app-view--active');
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
  const appView = document.querySelector(`.app-view[data-app="${appId}"]`);
  if (!appView) return;
  appView.classList.remove('app-view--active');
  appView.classList.add('app-view--closing');
  const onEnd = () => {
    appView.classList.remove('app-view--closing');
    appView.hidden = true;
    appView.removeEventListener('transitionend', onEnd);
    appView.removeEventListener('animationend', onEnd);
  };
  appView.addEventListener('transitionend', onEnd, { once: true });
  appView.addEventListener('animationend', onEnd, { once: true });setTimeout(onEnd, 450);
}

// ================================================================
//  8. 全局事件
// ================================================================
function bindGlobalEvents() {
  // 通知横幅
  eventBus.on('notification:show', ({ avatar, name, text, appId }) => {
    showNotification(avatar, name, text, appId);
  });

  // 主题切换
  eventBus.on('theme:change', ({ theme }) => {
    document.documentElement.setAttribute('data-theme', theme);
  });

  // 小红点
  eventBus.on('badge:update', ({ appId, count }) => {
    const dockItem = document.querySelector(`.dock-item[data-app="${appId}"]`);
    if (!dockItem) return;
    let badge = dockItem.querySelector('.dock-badge');
    if (count > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'dock-badge';
        dockItem.appendChild(badge);
      }
      badge.textContent = count > 99 ? '99+' : count;
      badge.hidden = false;
    } else if (badge) {
      badge.hidden = true;
    }
  });

  // 壁纸更换事件（供设置页调用）
  eventBus.on('wallpaper:change', async ({ file }) => {
    await changeWallpaper(file);
  });
}

// ================================================================
//  9. 通知横幅
// ================================================================
function showNotification(avatar, name, text, appId) {
  const banner = document.getElementById('notification-banner');
  if (!banner) return;

  document.getElementById('notif-avatar').src = avatar || '';
  document.getElementById('notif-name').textContent = name || '系统通知';
  document.getElementById('notif-text').textContent = text || '';

  banner.hidden = false;
  banner.classList.remove('notif--hide');
  banner.classList.add('notif--show');

  const clickHandler = () => {
    hideNotification();
    if (appId) openApp(appId);
    banner.removeEventListener('click', clickHandler);
  };
  banner.addEventListener('click', clickHandler);
  setTimeout(hideNotification, 4000);
}

function hideNotification() {
  const banner = document.getElementById('notification-banner');
  if (!banner || banner.hidden) return;
  banner.classList.remove('notif--show');
  banner.classList.add('notif--hide');
  setTimeout(() => {
    banner.hidden = true;
    banner.classList.remove('notif--hide');
  }, 350);
}

// ================================================================
//  10. Loading
// ================================================================
function hideLoadingScreen() {
  const loading = document.getElementById('loading-screen');
  if (!loading) return;
  const fill = loading.querySelector('.loading-bar-fill');
  if (fill) fill.style.animation = 'loadingBar 600ms var(--ease-out) forwards';
  setTimeout(() => {
    loading.style.opacity = '0';
    loading.style.transition = `opacity var(--duration-slow) var(--ease-out)`;
    setTimeout(() => {
      loading.hidden = true;
      loading.remove();
      console.log('[main]✅ 虚拟掌机启动完成');
    }, 450);
  }, 700);
}

function showFatalError(err) {
  const loading = document.getElementById('loading-screen');
  if (loading) {
    const text = loading.querySelector('.loading-text');
    if (text) {
      text.textContent = `启动失败: ${err.message || err}`;
      text.style.color = '#ff6b6b';
    }
  }
}

// ================================================================
//  导出
// ================================================================
export { openApp, closeCurrentApp, goToPage, state };

