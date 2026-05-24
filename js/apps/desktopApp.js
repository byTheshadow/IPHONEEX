/**
 * desktopApp.js — 桌面渲染引擎
 *
 * 职责：
 *- 渲染可自定义的 Widget 小组件（头像卡、签名卡、图片卡、日历卡、标签卡等）
 *  - 渲染桌面 App 图标网格
 *  - Widget 长按编辑（自定义文字、图片）
 *  - 壁纸自定义
 *  - 数据持久化到IndexedDB
 */

import { db } from '../core/db.js';
import { eventBus } from '../core/eventBus.js';

//── 默认 Widget 配置 ──────────────────────────────────────────
const DEFAULT_WIDGETS_PAGE0 = [
  {
    id: 'w_avatar',
    type: 'avatar-card',
    size: 'medium',       // small | medium | large
    data: {
      avatar: '',
      name: '✿ 你的名字',
      signature: '🌙 "幸福进行时ᵕ̈ ᵕ̈🐻"',
      tag: '#◇宅妹⌐¬⌐…',
    },
  },
  {
    id: 'w_photo1',
    type: 'photo-card',
    size: 'medium',
    data: {
      image: '',
      caption: '',},
  },
  {
    id: 'w_datetime',
    type: 'datetime-card',
    size: 'large',
    data: {
      avatar: '',
      greeting: 'ɞ🐻+☆🐾·˚🐾。ɞ公主请好运',
      location: '☁晴',},
  },
  {
    id: 'w_tag1',
    type: 'tag-card',
    size: 'small',
    data: {
      emoji: '🎧',
      text: '🐾"☆.+🐾☆',
    },
  },
  {
    id: 'w_tag2',
    type: 'tag-card',
    size: 'small',
    data: {
      emoji: '💚',
      text: '·☆·🐻◎·☆',
    },
  },
  {
    id: 'w_tag3',
    type: 'tag-card',
    size: 'small',
    data: {
      emoji: '#',
      text: '◆⌂‹black',
    },
  },
  {
    id: 'w_tag4',
    type: 'tag-card',
    size: 'small',
    data: {
      emoji: '🌷',
      text: '♪🎀💛Løve',
    },
  },
];

const DEFAULT_WIDGETS_PAGE1 = [
  {
    id: 'w_profile',
    type: 'profile-card',
    size: 'large',
    data: {
      avatar: '',
      name: '⁺₊♡_祝森活鱼块⌒',
      plog: '🏸周②!! plog :)',},
  },
  {
    id: 'w_photo2',
    type: 'photo-card',
    size: 'medium',
    data: {
      image: '',
      caption: '',
    },
  },
  {
    id: 'w_photo3',
    type: 'photo-card',
    size: 'medium',
    data: {
      image: '',
      caption: '',
    },
  },
  {
    id: 'w_music',
    type: 'music-card',
    size: 'medium',
    data: {
      title: 'iScreen Music',
      artist: 'iScreen',
    },
  },
  {
    id: 'w_memo',
    type: 'memo-card',
    size: 'large',
    data: {
      text: '🐱ooook啦❗',
      text2: '🐾宅家Day',
    },
  },
];

// ── 桌面 App 图标列表 ──
const DESKTOP_APPS = [
  { id: 'chat',icon: '💬', label: '消息' },
  { id: 'calendar', icon: '📅', label: '日历' },
  { id: 'moments',  icon: '🌸', label: '朋友圈' },
  { id: 'settings', icon: '⚙️', label: '设置' },
];

// ── 模块状态 ──
let widgetsPage0 = [];
let widgetsPage1 = [];
let wallpaperUrl = '';
let editModal = null;

// ================================================================
//初始化
// ================================================================
export async function initDesktop() {
  await loadDesktopData();
  renderPage(0, widgetsPage0);
  renderPage(1, widgetsPage1);
  renderAppIcons(0);
  renderAppIcons(1);
  applyWallpaper();
  bindDesktopEvents();
  startDateTimeTicker();
  console.log('[Desktop] ✅ 桌面渲染完成');
}

// ================================================================
//  数据加载 / 保存
// ================================================================
async function loadDesktopData() {
  const saved0 = await db.user.get('desktop_widgets_page0');
  const saved1 = await db.user.get('desktop_widgets_page1');
  const savedWp = await db.user.get('wallpaper');

  widgetsPage0 = saved0 || JSON.parse(JSON.stringify(DEFAULT_WIDGETS_PAGE0));
  widgetsPage1 = saved1 || JSON.parse(JSON.stringify(DEFAULT_WIDGETS_PAGE1));
  wallpaperUrl = savedWp || '';
}

async function saveWidgets() {
  await db.user.set('desktop_widgets_page0', widgetsPage0);
  await db.user.set('desktop_widgets_page1', widgetsPage1);
}

async function saveWallpaper(url) {
  wallpaperUrl = url;
  await db.user.set('wallpaper', url);
  applyWallpaper();
}

// ================================================================
//  壁纸
// ================================================================
function applyWallpaper() {
  const screen = document.getElementById('screen');
  if (!screen) return;

  if (wallpaperUrl) {
    screen.style.backgroundImage = `url("${wallpaperUrl}")`;screen.style.backgroundSize = 'cover';
    screen.style.backgroundPosition = 'center';screen.classList.add('has-wallpaper');
  } else {
    screen.style.backgroundImage = '';
    screen.classList.remove('has-wallpaper');
  }
}

// ================================================================
//  渲染桌面页
// ================================================================
function renderPage(pageIndex, widgets) {
  const grid = document.getElementById(`widget-grid-${pageIndex}`);
  if (!grid) return;
  grid.innerHTML = '';

  widgets.forEach((w, idx) => {
    const el = createWidgetElement(w, pageIndex, idx);
    grid.appendChild(el);
  });
}

// ================================================================
//  创建单个 Widget DOM
// ================================================================
function createWidgetElement(widget, pageIndex, idx) {
  const card = document.createElement('div');
  card.className = `widget-card widget-card--${widget.size} widget-type--${widget.type}`;
  card.dataset.widgetId = widget.id;
  card.dataset.pageIndex = pageIndex;
  card.dataset.idx = idx;
  card.setAttribute('role', 'listitem');

  // 长按编辑
  let pressTimer = null;
  const startPress = (e) => {
    e.preventDefault();
    pressTimer = setTimeout(() => {
      openWidgetEditor(widget, pageIndex, idx);
    }, 600);
  };
  const cancelPress = () => {
    if (pressTimer) clearTimeout(pressTimer);
  };

  card.addEventListener('touchstart', startPress, { passive: false });
  card.addEventListener('touchend', cancelPress);
  card.addEventListener('touchmove', cancelPress);
  card.addEventListener('mousedown', startPress);
  card.addEventListener('mouseup', cancelPress);
  card.addEventListener('mouseleave', cancelPress);

  // 根据类型渲染内容
  card.innerHTML = renderWidgetContent(widget);
  return card;
}

// ================================================================
//  Widget 内容渲染器（按类型分发）
// ================================================================
function renderWidgetContent(w) {
  switch (w.type) {
    case 'avatar-card':
      return renderAvatarCard(w.data);
    case 'photo-card':
      return renderPhotoCard(w.data);
    case 'datetime-card':
      return renderDatetimeCard(w.data);
    case 'tag-card':
      return renderTagCard(w.data);
    case 'profile-card':
      return renderProfileCard(w.data);
    case 'music-card':
      return renderMusicCard(w.data);
    case 'memo-card':
      return renderMemoCard(w.data);
    default:
      return `<div class="widget-label">${w.type}</div>`;
  }
}

// ── 头像签名卡 ──
function renderAvatarCard(d) {
  const avatarSrc = d.avatar || generateDefaultAvatar(d.name);
  return `
    <div class="w-avatar-card">
      <img class="w-avatar-img" src="${avatarSrc}" alt="${escHtml(d.name)}" />
      <p class="w-avatar-sig">${escHtml(d.signature)}</p>
      <div class="w-avatar-tag glass">${escHtml(d.tag)}</div>
    </div>
  `;
}

// ── 图片卡 ──
function renderPhotoCard(d) {
  if (d.image) {
    return `
      <div class="w-photo-card">
        <img class="w-photo-img" src="${d.image}" alt="${escHtml(d.caption)}" />
        ${d.caption ? `<p class="w-photo-caption">${escHtml(d.caption)}</p>` : ''}
      </div>
    `;
  }
  return `
    <div class="w-photo-card w-photo-card--empty">
      <div class="w-photo-placeholder">
        <span>📷</span>
        <span>长按添加图片</span>
      </div>
    </div>
  `;
}

// ── 日期天气卡 ──
function renderDatetimeCard(d) {
  const now = new Date();
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const weekDay = weekDays[now.getDay()];
  const hours = now.getHours();
  const avatarSrc = d.avatar || generateDefaultAvatar('♡');

  // 根据时间段生成温度模拟
  const temp = hours < 6 ?18 : hours < 12 ? 22 : hours < 18 ? 26 : 20;

  return `
    <div class="w-datetime-card">
      <div class="w-datetime-top">
        <img class="w-datetime-avatar" src="${avatarSrc}" alt="" />
        <div class="w-datetime-info">
          <p class="w-datetime-greeting">${escHtml(d.greeting)}</p>
          <p class="w-datetime-date">${month}月${String(day).padStart(2, '0')}日 ${weekDay}</p>
        </div>
        <div class="w-datetime-temp">
          <span class="w-datetime-temp-num">${temp}</span>
          <span class="w-datetime-temp-deg">°</span>
        </div>
      </div>
      <p class="w-datetime-location">${escHtml(d.location)}</p>
    </div>
  `;
}

// ── 标签小卡 ──
function renderTagCard(d) {
  return `
    <div class="w-tag-card glass">
      <span class="w-tag-emoji">${escHtml(d.emoji)}</span>
      <span class="w-tag-text">${escHtml(d.text)}</span>
    </div>
  `;
}

// ── 个人资料卡 ──
function renderProfileCard(d) {
  const avatarSrc = d.avatar || generateDefaultAvatar(d.name);
  return `
    <div class="w-profile-card">
      <div class="w-profile-left">
        <img class="w-profile-avatar" src="${avatarSrc}" alt="" />
      </div>
      <div class="w-profile-right">
        <p class="w-profile-plog">${escHtml(d.plog)}</p>
        <p class="w-profile-name">${escHtml(d.name)}</p></div>
    </div>
  `;
}

// ── 音乐播放器卡 ──
function renderMusicCard(d) {
  return `
    <div class="w-music-card">
      <p class="w-music-title">${escHtml(d.title)}</p>
      <p class="w-music-artist">${escHtml(d.artist)}</p>
      <div class="w-music-controls">
        <button class="w-music-btn" aria-label="上一首">⏮</button>
        <button class="w-music-btn w-music-btn--play" aria-label="播放">▶</button>
        <button class="w-music-btn" aria-label="下一首">⏭</button>
      </div>
    </div>
  `;
}

// ── 便签卡 ──
function renderMemoCard(d) {
  return `
    <div class="w-memo-card">
      <div class="w-memo-item glass">${escHtml(d.text)}</div>
      ${d.text2 ? `<div class="w-memo-item glass">${escHtml(d.text2)}</div>` : ''}
    </div>
  `;
}

// ================================================================
//  App 图标渲染
// ================================================================
function renderAppIcons(pageIndex) {
  const grid = document.getElementById(`app-icon-grid-${pageIndex}`);
  if (!grid) return;
  grid.innerHTML = '';

  // 只在第 0 页显示 App 图标
  if (pageIndex !== 0) return;

  DESKTOP_APPS.forEach(app => {
    const item = document.createElement('div');
    item.className = 'app-icon-item';
    item.dataset.app = app.id;
    item.setAttribute('role', 'listitem');
    item.innerHTML = `
      <div class="app-icon-item__icon">${app.icon}</div>
      <span class="app-icon-item__label">${escHtml(app.label)}</span>
    `;
    item.addEventListener('click', () => {
      eventBus.emit('router:openApp', { appId: app.id });
    });
    grid.appendChild(item);
  });
}

// ================================================================
//  日期时间自动刷新
// ================================================================
function startDateTimeTicker() {
  // 每分钟刷新日期时间 Widget
  setInterval(() => {
    widgetsPage0.forEach((w, idx) => {
      if (w.type === 'datetime-card') {
        const card = document.querySelector(`[data-widget-id="${w.id}"]`);
        if (card) card.innerHTML = renderWidgetContent(w);
      }
    });
    widgetsPage1.forEach((w, idx) => {
      if (w.type === 'datetime-card') {
        const card = document.querySelector(`[data-widget-id="${w.id}"]`);
        if (card) card.innerHTML = renderWidgetContent(w);
      }
    });
  }, 60000);
}

// ================================================================
//  Widget 编辑器（长按弹出 Modal）
// ================================================================
function openWidgetEditor(widget, pageIndex, idx) {
  // 触觉反馈
  if (navigator.vibrate) navigator.vibrate(30);

  closeWidgetEditor(); // 关闭已有的

  const fields = getEditableFields(widget);
  if (fields.length === 0) return;

  const overlay = document.createElement('div');
  overlay.className = 'widget-editor-overlay';
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeWidgetEditor();
  });

  const modal = document.createElement('div');
  modal.className = 'widget-editor-modal';

  let fieldsHtml = fields.map(f => {
    if (f.type === 'image') {
      return `
        <div class="we-field">
          <label class="we-label">${escHtml(f.label)}</label>
          <div class="we-image-picker">
            ${f.value ? `<img class="we-image-preview" src="${f.value}" alt="" />` : ''}
            <button class="we-image-btn" data-field="${f.key}">📷选择图片</button>${f.value ? `<button class="we-image-clear" data-field="${f.key}">✕ 清除</button>` : ''}
          </div>
          <input type="file" accept="image/*" class="we-file-input" data-field="${f.key}" hidden />
        </div>
      `;
    }
    if (f.type === 'textarea') {
      return `
        <div class="we-field">
          <label class="we-label">${escHtml(f.label)}</label>
          <textarea class="we-input we-textarea" data-field="${f.key}" placeholder="${escHtml(f.label)}">${escHtml(f.value || '')}</textarea>
        </div>
      `;
    }
    return `
      <div class="we-field">
        <label class="we-label">${escHtml(f.label)}</label>
        <input class="we-input" type="text" data-field="${f.key}" value="${escHtml(f.value || '')}" placeholder="${escHtml(f.label)}" />
      </div>
    `;
  }).join('');

  modal.innerHTML = `
    <div class="we-header">
      <h3 class="we-title">✏️ 编辑小组件</h3>
      <button class="we-close" aria-label="关闭">✕</button>
    </div>
    <div class="we-body">${fieldsHtml}</div>
    <div class="we-footer">
      <button class="we-btn we-btn--delete">🗑️ 删除</button>
      <button class="we-btn we-btn--save">💾 保存</button>
    </div>
  `;

  overlay.appendChild(modal);
  document.getElementById('phone-shell').appendChild(overlay);
  editModal = overlay;

  // 强制 reflow 后显示
  void overlay.offsetHeight;
  overlay.classList.add('we-overlay--show');

  // ── 事件绑定 ──
  modal.querySelector('.we-close').addEventListener('click', closeWidgetEditor);

  // 图片选择按钮
  modal.querySelectorAll('.we-image-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const fileInput = modal.querySelector(`.we-file-input[data-field="${btn.dataset.field}"]`);
      if (fileInput) fileInput.click();
    });
  });

  // 图片清除按钮
  modal.querySelectorAll('.we-image-clear').forEach(btn => {
    btn.addEventListener('click', () => {
      const field = btn.dataset.field;
      const preview = btn.parentElement.querySelector('.we-image-preview');
      if (preview) preview.remove();
      btn.remove();
      // 标记为清除
      btn.parentElement.dataset.cleared = 'true';
    });
  });

  // 文件输入
  modal.querySelectorAll('.we-file-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const container = input.parentElement;
        let preview = container.querySelector('.we-image-preview');
        if (!preview) {
          preview = document.createElement('img');
          preview.className = 'we-image-preview';
          container.insertBefore(preview, container.firstChild);
        }
        preview.src = ev.target.result;
        container.dataset.cleared = 'false';
      };
      reader.readAsDataURL(file);
    });
  });

  // 保存
  modal.querySelector('.we-btn--save').addEventListener('click', async () => {
    const widgetList = pageIndex === 0 ? widgetsPage0 : widgetsPage1;
    const w = widgetList[idx];
    if (!w) return;

    // 收集所有字段值
    modal.querySelectorAll('.we-input, .we-textarea').forEach(input => {
      const key = input.dataset.field;
      if (key && w.data.hasOwnProperty(key)) {
        w.data[key] = input.value;
      }
    });

    // 收集图片字段
    modal.querySelectorAll('.we-file-input').forEach(input => {
      const key = input.dataset.field;
      const container = input.parentElement;
      const preview = container.querySelector('.we-image-preview');
      const cleared = container.dataset.cleared === 'true';

      if (cleared) {
        w.data[key] = '';
      } else if (preview && preview.src && preview.src.startsWith('data:')) {
        w.data[key] = preview.src;
      }
    });

    await saveWidgets();
    renderPage(pageIndex, widgetList);
    closeWidgetEditor();
  });

  // 删除
  modal.querySelector('.we-btn--delete').addEventListener('click', async () => {
    const widgetList = pageIndex === 0 ? widgetsPage0 : widgetsPage1;
    widgetList.splice(idx, 1);
    await saveWidgets();
    renderPage(pageIndex, widgetList);
    closeWidgetEditor();
  });
}

function closeWidgetEditor() {
  if (!editModal) return;
  editModal.classList.remove('we-overlay--show');
  editModal.classList.add('we-overlay--hide');
  setTimeout(() => {
    editModal?.remove();
    editModal = null;
  }, 300);
}

/**
 * 根据 Widget 类型返回可编辑字段列表
 */
function getEditableFields(widget) {
  const d = widget.data;
  switch (widget.type) {
    case 'avatar-card':
      return [
        { key: 'avatar',label: '头像图片', type: 'image',    value: d.avatar },
        { key: 'name',      label: '名字',     type: 'text',     value: d.name },
        { key: 'signature', label: '签名',     type: 'text',     value: d.signature },
        { key: 'tag',       label: '标签',     type: 'text',     value: d.tag },
      ];
    case 'photo-card':
      return [
        { key: 'image',   label: '图片',   type: 'image', value: d.image },
        { key: 'caption', label: '图片说明', type: 'text',value: d.caption },
      ];
    case 'datetime-card':
      return [
        { key: 'avatar',   label: '头像',   type: 'image', value: d.avatar },
        { key: 'greeting', label: '问候语', type: 'text',  value: d.greeting },
        { key: 'location', label: '位置/天气', type: 'text', value: d.location },
      ];
    case 'tag-card':
      return [
        { key: 'emoji', label: 'Emoji', type: 'text', value: d.emoji },
        { key: 'text',  label: '文字',  type: 'text', value: d.text },
      ];
    case 'profile-card':
      return [
        { key: 'avatar', label: '头像',   type: 'image', value: d.avatar },
        { key: 'name',   label: '名字',   type: 'text',  value: d.name },
        { key: 'plog',   label: 'Plog 签名', type: 'text', value: d.plog },];
    case 'music-card':
      return [
        { key: 'title',  label: '歌曲名', type: 'text', value: d.title },
        { key: 'artist', label: '歌手',   type: 'text', value: d.artist },
      ];
    case 'memo-card':
      return [
        { key: 'text',  label: '便签 1', type: 'text', value: d.text },
        { key: 'text2', label: '便签 2', type: 'text', value: d.text2 },
      ];
    default:
      return [];
  }
}

// ================================================================
//  添加新 Widget（供设置页调用）
// ================================================================
export async function addWidget(pageIndex, widgetConfig) {
  const list = pageIndex === 0 ? widgetsPage0 : widgetsPage1;
  const id = 'w_' + Date.now().toString(36);
  const newWidget = { id, ...widgetConfig };
  list.push(newWidget);
  await saveWidgets();
  renderPage(pageIndex, list);
  return newWidget;
}

// ================================================================
//  壁纸更换（供外部调用）
// ================================================================
export async function changeWallpaper(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      // 清除壁纸
      saveWallpaper('');
      resolve('');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      saveWallpaper(e.target.result);
      resolve(e.target.result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ================================================================
//  全局事件绑定
// ================================================================
function bindDesktopEvents() {
  // 监听路由事件（从 App 图标打开 App）
  eventBus.on('router:openApp', ({ appId }) => {
    // 由main.js 处理，这里只做转发
    const { openApp } = window.__phoneRouter || {};
    if (openApp) openApp(appId);
  });
}

// ================================================================
//  工具函数
// ================================================================
function escHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function generateDefaultAvatar(name) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  // 渐变背景
  const grad = ctx.createLinearGradient(0, 0, 128, 128);
  grad.addColorStop(0, '#a8c5da');
  grad.addColorStop(1, '#e8b4cb');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(64, 64, 64, 0, Math.PI * 2);
  ctx.fill();

  // 文字
  const char = (name || '?').charAt(0);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 52px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(char, 64, 64);

  return canvas.toDataURL();
}
