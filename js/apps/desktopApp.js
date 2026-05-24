/**
 * desktopApp.js — 桌面渲染引擎
 *
 * - Widget 与 App 图标在同一网格中混排
 * - 所有 Widget 支持自定义文字 + 图片（URL 或文件上传）
 * - 长按编辑任意 Widget
 */

import { db } from '../core/db.js';
import { eventBus } from '../core/eventBus.js';

//── 默认桌面布局：Widget + App 混排 ──
const DEFAULT_LAYOUT_PAGE0 = [
  {
    id: 'w_avatar', type: 'widget', widget_type: 'avatar-card', size: 'medium',
    data: { image: '', text1: '✿ 你的名字', text2: '🌙 "幸福进行时ᵕ̈ ᵕ̈🐻"', text3: '#◇宅妹⌐¬⌐…' },
  },
  {
    id: 'w_photo1', type: 'widget', widget_type: 'photo-card', size: 'medium',
    data: { image: '', text1: '' },
  },
  {
    id: 'w_datetime', type: 'widget', widget_type: 'datetime-card', size: 'large',
    data: { image: '', text1: 'ɞ🐻+☆🐾·˚🐾。ɞ公主请好运', text2: '☁晴' },
  },
  { id: 'app_chat',type: 'app', appId: 'chat',     icon: '💬', label: '消息' },
  { id: 'app_calendar', type: 'app', appId: 'calendar', icon: '📅', label: '日历' },
  {
    id: 'w_tag1', type: 'widget', widget_type: 'tag-card', size: 'small',
    data: { text1: '🎧', text2: '🐾"☆.+🐾☆' },
  },
  {
    id: 'w_tag2', type: 'widget', widget_type: 'tag-card', size: 'small',
    data: { text1: '💚', text2: '·☆·🐻◎·☆' },
  },
  { id: 'app_moments',  type: 'app', appId: 'moments',  icon: '🌸', label: '朋友圈' },
  { id: 'app_settings', type: 'app', appId: 'settings', icon: '⚙️', label: '设置' },
  {
    id: 'w_tag3', type: 'widget', widget_type: 'tag-card', size: 'small',
    data: { text1: '#', text2: '◆⌂‹black' },
  },
  {
    id: 'w_tag4', type: 'widget', widget_type: 'tag-card', size: 'small',
    data: { text1: '🌷', text2: '♪🎀💛Løve' },
  },
];

const DEFAULT_LAYOUT_PAGE1 = [
  {
    id: 'w_profile', type: 'widget', widget_type: 'profile-card', size: 'large',
    data: { image: '', text1: '⁺₊♡_祝森活鱼块⌒', text2: '🏸周②!! plog :)' },
  },
  {
    id: 'w_photo2', type: 'widget', widget_type: 'photo-card', size: 'medium',
    data: { image: '', text1: '' },
  },
  {
    id: 'w_music', type: 'widget', widget_type: 'music-card', size: 'medium',
    data: { image: '', text1: 'iScreen Music', text2: 'iScreen' },
  },
  {
    id: 'w_photo3', type: 'widget', widget_type: 'photo-card', size: 'medium',
    data: { image: '', text1: '' },
  },
  {
    id: 'w_memo', type: 'widget', widget_type: 'memo-card', size: 'large',
    data: { image: '', text1: '🐱ooook啦❗', text2: '🐾宅家Day' },
  },
];

// ── 模块状态 ──
let layoutPage0 = [];
let layoutPage1 = [];
let wallpaperUrl = '';
let editModal = null;

// ================================================================
//初始化
// ================================================================
export async function initDesktop() {
  await loadDesktopData();
  renderPage(0, layoutPage0);
  renderPage(1, layoutPage1);
  applyWallpaper();
  startDateTimeTicker();
  console.log('[Desktop] ✅ 桌面渲染完成');
}

// ================================================================
//  数据加载 / 保存
// ================================================================
async function loadDesktopData() {
  const s0 = await db.user.get('desktop_layout_page0');
  const s1 = await db.user.get('desktop_layout_page1');
  const wp = await db.user.get('wallpaper');

  layoutPage0 = s0 || JSON.parse(JSON.stringify(DEFAULT_LAYOUT_PAGE0));
  layoutPage1 = s1 || JSON.parse(JSON.stringify(DEFAULT_LAYOUT_PAGE1));
  wallpaperUrl = wp || '';
}

async function saveLayouts() {
  await db.user.set('desktop_layout_page0', layoutPage0);
  await db.user.set('desktop_layout_page1', layoutPage1);
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

/**
 * 更换壁纸（支持 File 对象或 URL 字符串，传null 清除）
 */
export async function changeWallpaper(input) {
  if (input === null || input === undefined) {
    wallpaperUrl = '';
    await db.user.set('wallpaper', '');
    applyWallpaper();
    return '';
  }

  if (typeof input === 'string') {
    // URL 模式
    wallpaperUrl = input;
    await db.user.set('wallpaper', input);
    applyWallpaper();
    return input;
  }

  // File 对象模式
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      wallpaperUrl = e.target.result;
      await db.user.set('wallpaper', wallpaperUrl);
      applyWallpaper();
      resolve(wallpaperUrl);
    };
    reader.onerror = reject;
    reader.readAsDataURL(input);
  });
}

// ================================================================
//  渲染桌面页（混排）
// ================================================================
function renderPage(pageIndex, layout) {
  const grid = document.getElementById(`widget-grid-${pageIndex}`);
  if (!grid) return;
  grid.innerHTML = '';

  layout.forEach((item, idx) => {
    if (item.type === 'app') {
      grid.appendChild(createAppIconElement(item));
    } else {
      grid.appendChild(createWidgetElement(item, pageIndex, idx));
    }
  });
}

// ================================================================
//  App 图标
// ================================================================
function createAppIconElement(item) {
  const el = document.createElement('div');
  el.className = 'app-icon-item';
  el.dataset.app = item.appId;
  el.setAttribute('role', 'listitem');
  el.innerHTML = `
    <div class="app-icon-item__icon">${item.icon}</div>
    <span class="app-icon-item__label">${escHtml(item.label)}</span>
  `;
  el.addEventListener('click', () => {
    const router = window.__phoneRouter;
    if (router?.openApp) router.openApp(item.appId);
  });
  return el;
}

// ================================================================
//  Widget 元素
// ================================================================
function createWidgetElement(widget, pageIndex, idx) {
  const card = document.createElement('div');
  card.className = `widget-card widget-card--${widget.size} widget-type--${widget.widget_type}`;
  card.dataset.widgetId = widget.id;
  card.dataset.pageIndex = pageIndex;
  card.dataset.idx = idx;
  card.setAttribute('role', 'listitem');

  // 长按编辑
  let pressTimer = null;
  const startPress = (e) => {
    if (e.target.closest('.w-music-btn')) return; // 不拦截音乐按钮
    pressTimer = setTimeout(() => {
      openWidgetEditor(widget, pageIndex, idx);
    }, 600);
  };
  const cancelPress = () => { if (pressTimer) clearTimeout(pressTimer); };

  card.addEventListener('touchstart', startPress, { passive: true });
  card.addEventListener('touchend', cancelPress);
  card.addEventListener('touchmove', cancelPress);
  card.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    startPress(e);
  });
  card.addEventListener('mouseup', cancelPress);
  card.addEventListener('mouseleave', cancelPress);

  card.innerHTML = renderWidgetContent(widget);
  return card;
}

// ================================================================
//  Widget 内容渲染器
// ================================================================
function renderWidgetContent(w) {
  const d = w.data;
  switch (w.widget_type) {
    case 'avatar-card':  return renderAvatarCard(d);
    case 'photo-card':   return renderPhotoCard(d);
    case 'datetime-card':return renderDatetimeCard(d);
    case 'tag-card':     return renderTagCard(d);
    case 'profile-card': return renderProfileCard(d);
    case 'music-card':   return renderMusicCard(d);
    case 'memo-card':    return renderMemoCard(d);
    default:             return `<div class="widget-label">${w.widget_type}</div>`;
  }
}

function renderAvatarCard(d) {
  const src = d.image || generateDefaultAvatar(d.text1);
  return `
    <div class="w-avatar-card">
      <img class="w-avatar-img" src="${src}" alt="${escHtml(d.text1)}" />
      <p class="w-avatar-sig">${escHtml(d.text2)}</p>
      <div class="w-avatar-tag glass">${escHtml(d.text3)}</div>
    </div>`;
}

function renderPhotoCard(d) {
  if (d.image) {
    return `
      <div class="w-photo-card">
        <img class="w-photo-img" src="${d.image}" alt="${escHtml(d.text1)}" />
        ${d.text1 ? `<p class="w-photo-caption">${escHtml(d.text1)}</p>` : ''}
      </div>`;
  }
  return `
    <div class="w-photo-card w-photo-card--empty">
      <div class="w-photo-placeholder"><span>📷</span><span>长按添加图片</span></div>
    </div>`;
}

function renderDatetimeCard(d) {
  const now = new Date();
  const weeks = ['周日','周一','周二','周三','周四','周五','周六'];
  const m = now.getMonth() + 1, day = now.getDate(),wd = weeks[now.getDay()];
  const h = now.getHours();
  const temp = h< 6 ? 18 : h < 12 ? 22 : h < 18 ? 26 : 20;
  const src = d.image || generateDefaultAvatar('♡');
  return `
    <div class="w-datetime-card">
      <div class="w-datetime-top">
        <img class="w-datetime-avatar" src="${src}" alt="" />
        <div class="w-datetime-info">
          <p class="w-datetime-greeting">${escHtml(d.text1)}</p>
          <p class="w-datetime-date">${m}月${String(day).padStart(2,'0')}日 ${wd}</p>
        </div>
        <div class="w-datetime-temp">
          <span class="w-datetime-temp-num">${temp}</span>
          <span class="w-datetime-temp-deg">°</span>
        </div>
      </div>
      <p class="w-datetime-location">${escHtml(d.text2)}</p>
    </div>`;
}

function renderTagCard(d) {
  return `
    <div class="w-tag-card">
      <span class="w-tag-emoji">${escHtml(d.text1)}</span>
      <span class="w-tag-text">${escHtml(d.text2)}</span>
    </div>`;
}

function renderProfileCard(d) {
  const src = d.image || generateDefaultAvatar(d.text1);
  return `
    <div class="w-profile-card">
      <img class="w-profile-avatar" src="${src}" alt="" />
      <div class="w-profile-right">
        <p class="w-profile-plog">${escHtml(d.text2)}</p>
        <p class="w-profile-name">${escHtml(d.text1)}</p>
      </div>
    </div>`;
}

function renderMusicCard(d) {
  return `
    <div class="w-music-card">
      <p class="w-music-title">${escHtml(d.text1)}</p>
      <p class="w-music-artist">${escHtml(d.text2)}</p>
      <div class="w-music-controls">
        <button class="w-music-btn" aria-label="上一首">⏮</button>
        <button class="w-music-btn w-music-btn--play" aria-label="播放">▶</button>
        <button class="w-music-btn" aria-label="下一首">⏭</button>
      </div>
    </div>`;
}

function renderMemoCard(d) {
  return `
    <div class="w-memo-card">
      <div class="w-memo-item glass">${escHtml(d.text1)}</div>
      ${d.text2 ? `<div class="w-memo-item glass">${escHtml(d.text2)}</div>` : ''}
    </div>`;
}

// ================================================================
//  日期时间自动刷新
// ================================================================
function startDateTimeTicker() {
  setInterval(() => {
    [layoutPage0, layoutPage1].forEach(layout => {
      layout.forEach(item => {
        if (item.type === 'widget' && item.widget_type === 'datetime-card') {
          const card = document.querySelector(`[data-widget-id="${item.id}"]`);
          if (card) card.innerHTML = renderWidgetContent(item);
        }
      });
    });
  }, 60000);
}

// ================================================================
//  Widget 编辑器
// ================================================================
function openWidgetEditor(widget, pageIndex, idx) {
  if (navigator.vibrate) navigator.vibrate(30);
  closeWidgetEditor();

  const d = widget.data;
  // 收集所有 text 和 image 字段
  const fields = [];
  // image 字段
  fields.push({ key: 'image', label: '图片', type: 'image', value: d.image || '' });
  // text 字段（text1, text2, text3...）
  Object.keys(d).forEach(k => {
    if (k.startsWith('text')) {
      const num = k.replace('text', '');
      const labels = { '1': '文字1', '2': '文字 2', '3': '文字 3', '4': '文字 4' };
      fields.push({ key: k, label: labels[num] || `文字 ${num}`, type: 'text', value: d[k] || '' });
    }
  });

  const overlay = document.createElement('div');
  overlay.className = 'widget-editor-overlay';
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeWidgetEditor(); });

  const modal = document.createElement('div');
  modal.className = 'widget-editor-modal';

  const fieldsHtml = fields.map(f => {
    if (f.type === 'image') {
      return `
        <div class="we-field">
          <label class="we-label">${escHtml(f.label)}</label>
          <div class="we-image-picker" data-field="${f.key}">
            ${f.value ? `<img class="we-image-preview" src="${f.value}" alt="" />` : ''}
            <div class="we-image-actions">
              <button class="we-image-btn" data-field="${f.key}">📁选择文件</button>
              <button class="we-image-url-btn" data-field="${f.key}">🔗 输入URL</button>
              ${f.value ? `<button class="we-image-clear" data-field="${f.key}">✕ 清除</button>` : ''}
            </div>
          </div>
          <input type="file" accept="image/*" class="we-file-input" data-field="${f.key}" hidden />
        </div>`;
    }
    return `
      <div class="we-field">
        <label class="we-label">${escHtml(f.label)}</label>
        <input class="we-input" type="text" data-field="${f.key}" value="${escHtml(f.value)}" placeholder="${escHtml(f.label)}" />
      </div>`;
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
    </div>`;

  overlay.appendChild(modal);
  document.getElementById('phone-shell').appendChild(overlay);
  editModal = overlay;
  void overlay.offsetHeight;
  overlay.classList.add('we-overlay--show');

  //── 事件绑定 ──
  modal.querySelector('.we-close').addEventListener('click', closeWidgetEditor);

  // 文件选择
  modal.querySelectorAll('.we-image-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      modal.querySelector(`.we-file-input[data-field="${btn.dataset.field}"]`)?.click();
    });
  });

  // URL 输入
  modal.querySelectorAll('.we-image-url-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const url = prompt('请输入图片URL：', '');
      if (url !== null && url.trim()) {
        setImagePreview(modal, btn.dataset.field, url.trim());
      }
    });
  });

  // 清除图片
  modal.querySelectorAll('.we-image-clear').forEach(btn => {
    btn.addEventListener('click', () => {
      clearImagePreview(modal, btn.dataset.field);
    });
  });

  // 文件输入
  modal.querySelectorAll('.we-file-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(modal, input.dataset.field, ev.target.result);
      reader.readAsDataURL(file);
    });
  });

  // 保存
  modal.querySelector('.we-btn--save').addEventListener('click', async () => {
    const list = pageIndex === 0 ? layoutPage0 : layoutPage1;
    const w = list[idx];
    if (!w || w.type !== 'widget') return;

    // 收集文字字段
    modal.querySelectorAll('.we-input').forEach(input => {
      const key = input.dataset.field;
      if (key && w.data.hasOwnProperty(key)) w.data[key] = input.value;
    });

    // 收集图片字段
    modal.querySelectorAll('.we-image-picker').forEach(picker => {
      const key = picker.dataset.field;
      const preview = picker.querySelector('.we-image-preview');
      if (picker.dataset.cleared === 'true') {
        w.data[key] = '';
      } else if (preview?.src) {
        w.data[key] = preview.src;
      }
    });

    await saveLayouts();
    renderPage(pageIndex, list);
    closeWidgetEditor();
  });

  // 删除
  modal.querySelector('.we-btn--delete').addEventListener('click', async () => {
    if (!confirm('确定删除这个小组件吗？')) return;
    const list = pageIndex === 0 ? layoutPage0 : layoutPage1;
    list.splice(idx, 1);
    await saveLayouts();
    renderPage(pageIndex, list);
    closeWidgetEditor();
  });
}

function setImagePreview(modal, fieldKey, src) {
  const picker = modal.querySelector(`.we-image-picker[data-field="${fieldKey}"]`);
  if (!picker) return;
  let preview = picker.querySelector('.we-image-preview');
  if (!preview) {
    preview = document.createElement('img');
    preview.className = 'we-image-preview';
    picker.insertBefore(preview, picker.firstChild);
  }
  preview.src = src;
  picker.dataset.cleared = 'false';

  // 添加清除按钮（如果没有）
  if (!picker.querySelector('.we-image-clear')) {
    const clearBtn = document.createElement('button');
    clearBtn.className = 'we-image-clear';
    clearBtn.dataset.field = fieldKey;
    clearBtn.textContent = '✕ 清除';
    clearBtn.addEventListener('click', () => clearImagePreview(modal, fieldKey));
    picker.querySelector('.we-image-actions')?.appendChild(clearBtn);
  }
}

function clearImagePreview(modal, fieldKey) {
  const picker = modal.querySelector(`.we-image-picker[data-field="${fieldKey}"]`);
  if (!picker) return;
  const preview = picker.querySelector('.we-image-preview');
  if (preview) preview.remove();
  const clearBtn = picker.querySelector('.we-image-clear');
  if (clearBtn) clearBtn.remove();
  picker.dataset.cleared = 'true';
}

function closeWidgetEditor() {
  if (!editModal) return;
  editModal.classList.remove('we-overlay--show');
  editModal.classList.add('we-overlay--hide');
  setTimeout(() => { editModal?.remove(); editModal = null; }, 300);
}

// ================================================================
//  工具函数
// ================================================================
function escHtml(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function generateDefaultAvatar(name) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 128, 128);
  g.addColorStop(0, '#a8c5da'); g.addColorStop(1, '#e8b4cb');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(64, 64, 64, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 52px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText((name || '?').charAt(0), 64, 64);
  return c.toDataURL();
}
