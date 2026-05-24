/**
 * main.js — 应用主入口 & 初始化流程
 *
 * 职责：
 *  1. 注册 Service Worker
 *  2. 初始化 DB（localForage 实例）
 *  3. 启动 EventBus
 *  4. 渲染状态栏时钟 & 电量
 *  5. 初始化桌面滑动手势
 *  6. 初始化 Dock 路由
 *  7. 启动星空背景动画
 *  8. 隐藏 Loading 遮罩，完成冷启动
 */

import { db }       from './core/db.js';
import { eventBus } from './core/eventBus.js';
import { engine }   from './core/engine.js';

// ── 常量 ──────────────────────────────────────────────────────────
const TOTAL_PAGES    = 2;          // 桌面总页数
const SWIPE_THRESHOLD = 50;        // 触发翻页的最小滑动距离 (px)

// ── 应用状态 ─────────────────────────────────────────────────────
const state = {
  currentPage:    0,               // 当前桌面页索引
  activeApp:      null,            // 当前打开的 App id（null = 桌面）
  touchStartX:    0,
  touchStartY:    0,
  isSwiping:      false,
};

// ================================================================
//  入口：DOMContentLoaded
// ================================================================
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await bootstrap();
  } catch (err) {
    console.error('[main] 启动失败:', err);
    showFatalError(err);
  }
});

// ================================================================
//  bootstrap — 按序执行所有初始化步骤
// ================================================================
async function bootstrap() {
  // 1. 注册 Service Worker（PWA 离线支持）
  registerServiceWorker();

  // 2. 初始化数据库（确保各数据表存在默认值）
  await initDatabase();

  // 3. 读取用户偏好，应用主题
  await applyUserTheme();

  // 4. 启动状态栏（时钟 + 电量）
  initStatusBar();

  // 5. 初始化星空背景
  initStarfield();

  // 6. 初始化桌面滑动手势 & 分页指示器
  initDesktopSlider();

  // 7. 初始化 Dock 路由 & 返回按钮
  initRouter();

  // 8. 启动后台引擎（主动打招呼 / 朋友圈自动化）
  engine.start();

  // 9. 监听跨模块事件
  bindGlobalEvents();

  // 10. 隐藏 Loading 遮罩，完成启动
  hideLoadingScreen();
}

// ================================================================
//  1. Service Worker 注册
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
  // 确保 user 表有默认记录（首次启动）
  const user = await db.user.get('profile');
  if (!user) {
    await db.user.set('profile', {
      name:    'User',
      avatar:  '',
      persona: '',
      api_key: '',
      theme:   'dark',
    });
  }

  // 确保至少有一个默认角色（系统助理）
  const chars = await db.characters.getAll();
  if (!chars || chars.length === 0) {
    await db.characters.set('char_001', {
      id:            'char_001',
      name:          '系统助理',
      avatar:        '',
      system_prompt: '你是一个友善、简洁的智能助手。',
      first_message: '你好！有什么我可以帮你的吗？✨',
      custom_css:    '',
      is_bot:        true,
    });
  }
}

// ================================================================
//  3. 应用用户主题
// ================================================================
async function applyUserTheme() {
  const user = await db.user.get('profile');
  const theme = user?.theme ?? 'dark';
  document.documentElement.setAttribute('data-theme', theme);
}

// ================================================================
//  4. 状态栏：时钟 & 电量
// ================================================================
function initStatusBar() {
  updateClock();
  setInterval(updateClock, 1000);

  updateBattery();
  // Battery API（部分浏览器支持）
  if ('getBattery' in navigator) {
    navigator.getBattery().then(battery => {
      updateBatteryUI(battery.level, battery.charging);
      battery.addEventListener('levelchange',   () => updateBatteryUI(battery.level, battery.charging));
      battery.addEventListener('chargingchange', () => updateBatteryUI(battery.level, battery.charging));
    });
  }
}

function updateClock() {
  const el = document.getElementById('status-time');
  if (!el) return;
  const now  = new Date();
  const h    = String(now.getHours()).padStart(2, '0');
  const m    = String(now.getMinutes()).padStart(2, '0');
  el.textContent = `${h}:${m}`;
}

function updateBattery() {
  const el = document.getElementById('status-battery');
  if (el) el.textContent = '🔋';
}

function updateBatteryUI(level, charging) {
  const el = document.getElementById('status-battery');
  if (!el) return;
  const pct = Math.round(level * 100);
  el.textContent = charging ? `⚡${pct}%` : `🔋${pct}%`;
  el.setAttribute('aria-label', `电量 ${pct}%${charging ? '，充电中' : ''}`);
}

// ================================================================
//  5. 星空背景 Canvas 动画
// ================================================================
function initStarfield() {
  const canvas = document.getElementById('starfield-canvas');
  if (!canvas) return;

  const ctx    = canvas.getContext('2d');
  let stars    = [];
  let animId   = null;

  function resize() {
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    generateStars();
  }

  function generateStars() {
    const count = Math.floor((canvas.width * canvas.height) / 3000);
    stars = Array.from({ length: count }, () => ({
      x:       Math.random() * canvas.width,
      y:       Math.random() * canvas.height,
      r:       Math.random() * 1.5 + 0.3,
      alpha:   Math.random(),
      speed:   Math.random() * 0.008 + 0.002,
      phase:   Math.random() * Math.PI * 2,
    }));
  }

  function draw(ts) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach(s => {
      // 呼吸闪烁效果
      s.alpha = 0.3 + 0.7 * Math.abs(Math.sin(ts * s.speed + s.phase));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(232, 224, 208, ${s.alpha})`;
      ctx.fill();
    });
    animId = requestAnimationFrame(draw);
  }

  // 页面可见性优化：隐藏时暂停动画
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(animId);
    } else {
      animId = requestAnimationFrame(draw);
    }
  });

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();
  animId = requestAnimationFrame(draw);
}

// ================================================================
//  6. 桌面滑动手势 & 分页指示器
// ================================================================
function initDesktopSlider() {
  const slider    = document.getElementById('desktop-slider');
  const indicator = document.getElementById('page-indicator');
  if (!slider || !indicator) return;

  // 生成分页指示器 dots
  indicator.innerHTML = '';
  for (let i = 0; i < TOTAL_PAGES; i++) {
    const dot = document.createElement('button');
    dot.className  = 'page-dot';
    dot.setAttribute('role', 'tab');
    dot.setAttribute('aria-label', `第 ${i + 1} 页`);
    dot.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    dot.dataset.page = i;
    dot.addEventListener('click', () => goToPage(i));
    indicator.appendChild(dot);
  }
  updatePageIndicator();

  // Touch 事件
  slider.addEventListener('touchstart', onTouchStart, { passive: true });
  slider.addEventListener('touchmove',  onTouchMove,  { passive: true });
  slider.addEventListener('touchend',   onTouchEnd,   { passive: true });

  // 鼠标拖拽（桌面端调试用）
  slider.addEventListener('mousedown',  onMouseDown);
}

function onTouchStart(e) {
  state.touchStartX  = e.touches[0].clientX;
  state.touchStartY  = e.touches[0].clientY;
  state.isSwiping    = false;
}

function onTouchMove(e) {
  const dx = e.touches[0].clientX - state.touchStartX;
  const dy = e.touches[0].clientY - state.touchStartY;
  // 水平滑动优先判断
  if (!state.isSwiping && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) {
    state.isSwiping = true;
  }
}

function onTouchEnd(e) {
  if (!state.isSwiping) return;
  const dx = e.changedTouches[0].clientX - state.touchStartX;

  if (dx< -SWIPE_THRESHOLD && state.currentPage < TOTAL_PAGES - 1) {
    goToPage(state.currentPage + 1);
  } else if (dx > SWIPE_THRESHOLD && state.currentPage > 0) {
    goToPage(state.currentPage - 1);
  }

  state.isSwiping = false;
}

// ──鼠标拖拽（桌面端调试） ──
function onMouseDown(e) {
  state.touchStartX = e.clientX;
  state.touchStartY = e.clientY;
  state.isSwiping   = false;

  const onMouseMove = (ev) => {
    const dx = ev.clientX - state.touchStartX;
    const dy = ev.clientY - state.touchStartY;
    if (!state.isSwiping && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) {
      state.isSwiping = true;
    }
  };

  const onMouseUp = (ev) => {
    if (state.isSwiping) {
      const dx = ev.clientX - state.touchStartX;
      if (dx < -SWIPE_THRESHOLD && state.currentPage < TOTAL_PAGES - 1) {
        goToPage(state.currentPage + 1);
      } else if (dx > SWIPE_THRESHOLD && state.currentPage > 0) {
        goToPage(state.currentPage - 1);
      }
    }
    state.isSwiping = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup',   onMouseUp);
  };

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup',   onMouseUp);
}

/**
 * goToPage — 切换桌面页
 * @param {number} pageIndex 目标页索引
 */
function goToPage(pageIndex) {
  if (pageIndex < 0 || pageIndex >= TOTAL_PAGES) return;
  state.currentPage = pageIndex;

  const slider = document.getElementById('desktop-slider');
  if (slider) {
    const offsetPercent = -(pageIndex * 100);
    slider.style.transform  = `translateX(${offsetPercent}%)`;
    slider.style.transition = `transform var(--duration-page) var(--ease-smooth)`;
  }

  updatePageIndicator();
  eventBus.emit('desktop:pageChanged', { page: pageIndex });
}

/**
 * updatePageIndicator —刷新分页指示器高亮
 */
function updatePageIndicator() {
  const dots = document.querySelectorAll('.page-dot');
  dots.forEach((dot, i) => {
    const isActive = i === state.currentPage;
    dot.classList.toggle('active', isActive);
    dot.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
}

// ================================================================
//  7. 路由系统：Dock 导航 & App 打开/关闭
// ================================================================
function initRouter() {
  //── Dock 按钮点击 ──
  const dockItems = document.querySelectorAll('.dock-item[data-app]');
  dockItems.forEach(btn => {
    btn.addEventListener('click', () => {
      const appId = btn.dataset.app;
      openApp(appId);
    });
  });

  // ── Home 按钮（返回桌面） ──
  const btnHome = document.getElementById('btn-home');
  if (btnHome) {
    btnHome.addEventListener('click', closeCurrentApp);
  }

  // ── 所有 App 内的返回按钮 ──
  const backBtns = document.querySelectorAll('.btn-back');
  backBtns.forEach(btn => {
    btn.addEventListener('click', closeCurrentApp);
  });

  // ── 监听浏览器后退键 ──
  window.addEventListener('popstate', (e) => {
    if (state.activeApp) {
      closeCurrentApp();
    }
  });
}

/**
 * openApp — 打开指定 App
 * @param {string} appId  App 标识 (chat / calendar / moments / settings)
 */
function openApp(appId) {
  if (state.activeApp === appId) return;

  // 关闭当前已打开的 App
  if (state.activeApp) {
    closeAppView(state.activeApp);
  }

  const appView = document.querySelector(`.app-view[data-app="${appId}"]`);
  if (!appView) {
    console.warn(`[Router] 未找到 App: ${appId}`);
    return;
  }

  // 推入浏览器历史记录（支持物理返回键）
  history.pushState({ app: appId }, '', `#${appId}`);

  // 显示 App 视图
  appView.hidden = false;
  // 强制 reflow 后添加动画 class
  void appView.offsetHeight;
  appView.classList.add('app-view--active');

  state.activeApp = appId;

  // 发布事件，通知各App 模块进行初始化渲染
  eventBus.emit('app:opened', { appId });

  console.log(`[Router] 打开 App: ${appId}`);
}

/**
 * closeCurrentApp — 关闭当前打开的 App，回到桌面
 */
function closeCurrentApp() {
  if (!state.activeApp) return;
  closeAppView(state.activeApp);
  state.activeApp = null;

  // 清除 hash
  if (location.hash) {
    history.replaceState(null, '', location.pathname);
  }

  eventBus.emit('app:closed', {});
  console.log('[Router] 返回桌面');
}

/**
 * closeAppView —隐藏指定 App 视图（带退出动画）
 * @param {string} appId
 */
function closeAppView(appId) {
  const appView = document.querySelector(`.app-view[data-app="${appId}"]`);
  if (!appView) return;

  appView.classList.remove('app-view--active');
  appView.classList.add('app-view--closing');

  const onEnd = () => {
    appView.classList.remove('app-view--closing');
    appView.hidden = true;
    appView.removeEventListener('transitionend', onEnd);
    appView.removeEventListener('animationend',  onEnd);
  };

  appView.addEventListener('transitionend', onEnd, { once: true });
  appView.addEventListener('animationend',  onEnd, { once: true });

  // 兜底：如果动画未触发，400ms 后强制隐藏
  setTimeout(onEnd, 450);
}

// ================================================================
//  8. 全局事件绑定
// ================================================================
function bindGlobalEvents() {
  // ── 通知横幅展示 ──
  eventBus.on('notification:show', ({ avatar, name, text, appId }) => {
    showNotification(avatar, name, text, appId);
  });

  // ── 主题切换 ──
  eventBus.on('theme:change', ({ theme }) => {
    document.documentElement.setAttribute('data-theme', theme);
  });

  // ── 桌面 Widget 小红点 ──
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
}

// ================================================================
//  9. 系统通知横幅
// ================================================================
function showNotification(avatar, name, text, appId) {
  const banner= document.getElementById('notification-banner');
  const elAvatar  = document.getElementById('notif-avatar');
  const elName    = document.getElementById('notif-name');
  const elText    = document.getElementById('notif-text');

  if (!banner) return;

  elAvatar.src= avatar || '';
  elAvatar.alt        = name   || '';
  elName.textContent  = name   || '系统通知';
  elText.textContent  = text   || '';

  banner.hidden = false;
  banner.classList.remove('notif--hide');
  banner.classList.add('notif--show');

  // 点击通知跳转到对应 App
  const clickHandler = () => {
    hideNotification();
    if (appId) openApp(appId);
    banner.removeEventListener('click', clickHandler);
  };
  banner.addEventListener('click', clickHandler);

  // 4秒后自动隐藏
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
//10. 隐藏 Loading 遮罩
// ================================================================
function hideLoadingScreen() {
  const loading = document.getElementById('loading-screen');
  if (!loading) return;

  const fill = loading.querySelector('.loading-bar-fill');
  if (fill) {
    fill.style.animation = 'loadingBar 600ms var(--ease-out) forwards';
  }

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


// ================================================================
//  11. 致命错误展示（兜底）
// ================================================================
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
//  导出（供其他模块调用）
// ================================================================
export { openApp, closeCurrentApp, goToPage, state };

