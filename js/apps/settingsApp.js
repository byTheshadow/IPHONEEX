/**
 * settingsApp.js — 设置页面（重写版）
 * 用 DOM API 逐项构建，避免模板字符串中的隐藏错误
 */

import { db } from '../core/db.js';
import { eventBus } from '../core/eventBus.js';
import { engine } from '../core/engine.js';
import { changeWallpaper } from './desktopApp.js';

let initialized = false;

export async function initSettings() {
  const container = document.getElementById('settings-content');
  if (!container) return;

  // 每次打开都重新渲染，确保数据最新
  container.innerHTML = '';
  initialized = false;

  const user = (await db.user.get('profile')) || {};
  const wallpaper = (await db.user.get('wallpaper')) || '';
  const engineSettings = (await db.user.get('engine_settings')) || {};
  const knowledgeList = await db.knowledge.getAll();

  // ── 用户资料 ──
  addSectionTitle(container, '👤 用户资料');
  const profileGroup = addGroup(container);

  addAvatarItem(profileGroup, user);
  addItem(profileGroup, '用户名', user.name || 'User', 's-name', async () => {
    const u = await db.user.get('profile');
    const name = prompt('请输入用户名：', u.name || '');
    if (name !== null && name.trim()) {
      u.name = name.trim();
      await db.user.set('profile', u);
      document.getElementById('s-name')?.querySelector('.settings-item__value')
        ?.setText?.(u.name) || updateValue('s-name', u.name);
    }
  });
  addItem(profileGroup, '人设描述', user.persona ? '已设置 ✓' : '点击编辑', 's-persona', async () => {
    const u = await db.user.get('profile');
    openTextEditor('编辑人设描述', '描述你的角色设定，AI 会据此理解你…', u.persona || '', async (val) => {
      u.persona = val;
      await db.user.set('profile', u);
      updateValue('s-persona', val ? '已设置 ✓' : '点击编辑');
    });
  });
  addItem(profileGroup, '社交账号', user.social_name || '点击设置', 's-social', async () => {
    const u = await db.user.get('profile');
    openSocialEditor(u);
  });

  // ── 外观 ──
  addSectionTitle(container, '🎨 外观');
  const appearGroup = addGroup(container);

  addItem(appearGroup, '主题', user.theme === 'light' ? '☀️ 浅色' : '🌙 深色', 's-theme', async () => {
    const u = await db.user.get('profile');
    u.theme = u.theme === 'dark' ? 'light' : 'dark';
    await db.user.set('profile', u);
    updateValue('s-theme', u.theme === 'light' ? '☀️ 浅色' : '🌙 深色');
    eventBus.emit('theme:change', { theme: u.theme });
  });

  // 壁纸文件
  const wpFileInput = document.createElement('input');
  wpFileInput.type = 'file';
  wpFileInput.accept = 'image/*';
  wpFileInput.style.display = 'none';
  container.appendChild(wpFileInput);
  wpFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    await changeWallpaper(file);
    wpClearItem.style.display = '';
    wpFileInput.value = '';
  });

  addItem(appearGroup, '🖼️ 壁纸 · 选择文件', '📁', 's-wp-file', () => wpFileInput.click());
  addItem(appearGroup, '🔗 壁纸 · 输入 URL', '输入', 's-wp-url', async () => {
    const url = prompt('请输入壁纸图片 URL：', '');
    if (url !== null && url.trim()) {
      await changeWallpaper(url.trim());
      wpClearItem.style.display = '';
    }
  });
  const wpClearItem = addItem(appearGroup, '恢复默认壁纸', '🗑️', 's-wp-clear', async () => {
    await changeWallpaper(null);
    wpClearItem.style.display = 'none';
  });
  if (!wallpaper) wpClearItem.style.display = 'none';

  // ── AI 连接 ──
  addSectionTitle(container, '🤖 AI 连接');
  const apiGroup = addGroup(container);

  addItem(apiGroup, 'API Base URL', user.api_base || '未设置', 's-api-base', async () => {
    const u = await db.user.get('profile');
    const val = prompt('请输入 API Base URL\n例：https://api.openai.com/v1', u.api_base || '');
    if (val !== null) {
      u.api_base = val.trim().replace(/\/+$/, '');
      await db.user.set('profile', u);
      updateValue('s-api-base', u.api_base || '未设置');
    }
  });
  addItem(apiGroup, 'API Key', user.api_key ? '••••' + user.api_key.slice(-4) : '未设置', 's-api-key', async () => {
    const u = await db.user.get('profile');
    const val = prompt('请输入 API Key：', u.api_key || '');
    if (val !== null) {
      u.api_key = val.trim();
      await db.user.set('profile', u);
      updateValue('s-api-key', u.api_key ? '••••' + u.api_key.slice(-4) : '未设置');
    }
  });
  addItem(apiGroup, '模型', user.api_model || '未设置', 's-api-model', async () => {
    const u = await db.user.get('profile');
    const val = prompt('请输入模型名称\n例：gpt-4o', u.api_model || '');
    if (val !== null) {
      u.api_model = val.trim();
      await db.user.set('profile', u);
      updateValue('s-api-model', u.api_model || '未设置');
    }
  });

  // 测试连接
  const testItem = addItem(apiGroup, '🔌 测试连接', '点击测试', 's-api-test', async () => {
    const valEl = testItem.querySelector('.settings-item__value');
    const u = await db.user.get('profile');
    if (!u.api_base || !u.api_key) {
      valEl.textContent = '❌ 请先设置 URL 和 Key';
      valEl.style.color = '#ff6b6b';
      return;
    }
    valEl.textContent = '⏳ 连接中…';
    valEl.style.color = '';
    try {
      const resp = await fetch(u.api_base.replace(/\/+$/, '') + '/models', {
        headers: { 'Authorization': `Bearer ${u.api_key}` },
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      const count = data?.data?.length ?? 0;
      valEl.textContent = `✅ 成功，${count} 个模型`;
      valEl.style.color = '#4ade80';

      // 没有设置模型时，弹出选择
      if (!u.api_model && count > 0) {
        const names = data.data.map(m => m.id).slice(0, 20).join('\n');
        const pick = prompt(`检测到以下模型，请输入要使用的：\n\n${names}`, data.data[0]?.id || '');
        if (pick?.trim()) {
          u.api_model = pick.trim();
          await db.user.set('profile', u);
          updateValue('s-api-model', u.api_model);
        }
      }
    } catch (err) {
      valEl.textContent = `❌ ${err.message}`;
      valEl.style.color = '#ff6b6b';
    }
  });

  // ── AI 行为 ──
  addSectionTitle(container, '🧠 AI 行为');
  const aiGroup = addGroup(container);

  const toggleItem = document.createElement('div');
  toggleItem.className = 'settings-item';
  toggleItem.id = 's-ai-auto';

  const toggleLabel = document.createElement('span');
  toggleLabel.className = 'settings-item__label';
  toggleLabel.textContent = 'AI 自主发消息';

  const toggle = document.createElement('div');
  toggle.className = 'settings-toggle' + (engineSettings.aiAutoEnabled ? ' settings-toggle--on' : '');
  toggle.innerHTML = `<div class="settings-toggle__track"><div class="settings-toggle__thumb"></div></div>`;

  toggleItem.appendChild(toggleLabel);
  toggleItem.appendChild(toggle);
  toggleItem.addEventListener('click', async () => {
    const isOn = toggle.classList.contains('settings-toggle--on');
    toggle.classList.toggle('settings-toggle--on', !isOn);
    await engine.setAiAutoEnabled(!isOn);
  });
  aiGroup.appendChild(toggleItem);

  // ── 全局知识书 ──
  addSectionTitle(container, '📚 全局知识书');

  const hint = document.createElement('p');
  hint.className = 'settings-hint';
  hint.textContent = '添加全局背景知识，所有 AI 对话都会参考这些内容。';
  container.appendChild(hint);

  const kbGroup = addGroup(container);
  kbGroup.id = 's-knowledge-list';
  renderKnowledgeItems(kbGroup, knowledgeList);

  const kbAddGroup = addGroup(container);
  addItem(kbAddGroup, '➕ 添加知识条目', '', 's-kb-add', () => {
    openKnowledgeEditor(null, null, kbGroup);
  });

  // ── 数据 ──
  addSectionTitle(container, '🔧 数据');
  const dataGroup = addGroup(container);
  addItem(dataGroup, '重置桌面小组件', '恢复默认', 's-reset', async () => {
    if (!confirm('确定要重置所有桌面小组件为默认状态吗？')) return;
    await db.user.remove('desktop_layout_page0');
    await db.user.remove('desktop_layout_page1');
    location.reload();
  });

  // 底部留白
  const spacer = document.createElement('div');
  spacer.style.height = '40px';
  container.appendChild(spacer);

  initialized = true;
}

// ================================================================
//  DOM 构建辅助函数
// ================================================================

/** 添加分区标题 */
function addSectionTitle(parent, text) {
  const el = document.createElement('h3');
  el.className = 'settings-section-title';
  el.textContent = text;
  parent.appendChild(el);
  return el;
}

/** 添加设置组容器 */
function addGroup(parent) {
  const el = document.createElement('div');
  el.className = 'settings-group';
  parent.appendChild(el);
  return el;
}

/**
 * 添加普通设置项
 * @returns {HTMLElement} 该 item 元素
 */
function addItem(group, label, value, id, onClick) {
  const item = document.createElement('div');
  item.className = 'settings-item';
  if (id) item.id = id;

  const labelEl = document.createElement('span');
  labelEl.className = 'settings-item__label';
  labelEl.textContent = label;

  const valueEl = document.createElement('span');
  valueEl.className = 'settings-item__value';
  valueEl.textContent = value;

  item.appendChild(labelEl);
  item.appendChild(valueEl);
  if (onClick) item.addEventListener('click', onClick);
  group.appendChild(item);
  return item;
}

/** 添加头像设置项（带头像预览图） */
function addAvatarItem(group, user) {
  const item = document.createElement('div');
  item.className = 'settings-item';
  item.id = 's-avatar';

  const labelEl = document.createElement('span');
  labelEl.className = 'settings-item__label';
  labelEl.textContent = '头像';

  const right = document.createElement('div');
  right.className = 'settings-item__right';

  const preview = document.createElement('img');
  preview.className = 'settings-avatar-preview';
  preview.id = 's-avatar-preview';
  preview.alt = '头像';
  if (user.avatar) {
    preview.src = user.avatar;
  } else {
    preview.style.display = 'none';
  }

  const valueEl = document.createElement('span');
  valueEl.className = 'settings-item__value';
  valueEl.id = 's-avatar-value';
  valueEl.textContent = user.avatar ? '已设置' : '未设置';

  right.appendChild(preview);
  right.appendChild(valueEl);
  item.appendChild(labelEl);
  item.appendChild(right);
  item.addEventListener('click', showAvatarPicker);
  group.appendChild(item);
  return item;
}

/** 更新某个 item 的 value 文字 */
function updateValue(itemId, text) {
  const el = document.querySelector(`#${itemId} .settings-item__value`);
  if (el) el.textContent = text;
}

// ================================================================
//  知识书列表渲染
// ================================================================
function renderKnowledgeItems(group, list) {
  group.innerHTML = '';
  if (list.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'settings-item';
    empty.style.color = 'var(--text-muted)';
    empty.style.fontSize = 'var(--font-size-sm)';
    empty.style.justifyContent = 'center';
    empty.textContent = '暂无知识条目';
    group.appendChild(empty);
    return;
  }
  list.forEach(k => {
    const item = document.createElement('div');
    item.className = 'settings-item knowledge-item';
    item.dataset.key = k._key;

    const titleEl = document.createElement('span');
    titleEl.className = 'knowledge-title';
    titleEl.textContent = k.title || '未命名';

    const delBtn = document.createElement('span');
    delBtn.className = 'knowledge-delete';
    delBtn.textContent = '✕';
    delBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm('确定删除这条知识？')) return;
      await db.knowledge.remove(k._key);
      const updated = await db.knowledge.getAll();
      renderKnowledgeItems(group, updated);
    });

    item.appendChild(titleEl);
    item.appendChild(delBtn);
    item.addEventListener('click', (e) => {
      if (e.target === delBtn) return;
      openKnowledgeEditor(k, k._key, group);
    });
    group.appendChild(item);
  });
}

// ================================================================
//  头像选择器
// ================================================================
function showAvatarPicker() {
  const shell = document.getElementById('phone-shell');
  const { overlay, modal, remove } = createModal('👤 设置头像');

  const body = modal.querySelector('.we-body');
  let newAvatarData = null;

  // 预览区
  const previewWrap = document.createElement('div');
  previewWrap.className = 'we-field';
  previewWrap.style.alignItems = 'center';

  const preview = document.createElement('img');
  preview.className = 'settings-avatar-large';
  preview.alt = '头像预览';
  preview.style.display = 'none';
  previewWrap.appendChild(preview);
  body.appendChild(previewWrap);

  // 加载当前头像
  db.user.get('profile').then(u => {
    if (u?.avatar) {
      preview.src = u.avatar;
      preview.style.display = 'block';
      newAvatarData = u.avatar;
    }
  });

  // 文件选择
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';
  body.appendChild(fileInput);

  const fileBtn = createModalBtn('📁 从文件选择', 'secondary');
  fileBtn.addEventListener('click', () => fileInput.click());
  body.appendChild(wrapField(fileBtn));

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      newAvatarData = ev.target.result;
      preview.src = newAvatarData;
      preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
  });

  // URL 输入
  const urlBtn = createModalBtn('🔗 输入图片 URL', 'secondary');
  urlBtn.addEventListener('click', () => {
    const url = prompt('请输入头像图片 URL：', '');
    if (url?.trim()) {
      newAvatarData = url.trim();
      preview.src = newAvatarData;
      preview.style.display = 'block';
    }
  });
  body.appendChild(wrapField(urlBtn));

  // 底部按钮
  const footer = modal.querySelector('.we-footer');

  const clearBtn = createModalBtn('🗑️ 清除头像', 'delete');
  clearBtn.addEventListener('click', () => {
    newAvatarData = '';
    preview.style.display = 'none';
    preview.src = '';
  });

  const saveBtn = createModalBtn('💾 保存', 'save');
  saveBtn.addEventListener('click', async () => {
    const u = await db.user.get('profile');
    u.avatar = newAvatarData || '';
    await db.user.set('profile', u);

    const p = document.getElementById('s-avatar-preview');
    const v = document.getElementById('s-avatar-value');
    if (p) { p.src = u.avatar; p.style.display = u.avatar ? '' : 'none'; }
    if (v) v.textContent = u.avatar ? '已设置' : '未设置';
    remove();
  });

  footer.appendChild(clearBtn);
  footer.appendChild(saveBtn);
  shell.appendChild(overlay);
  void overlay.offsetHeight;
  overlay.classList.add('we-overlay--show');
}

// ================================================================
//  社交账号编辑器
// ================================================================
async function openSocialEditor(user) {
  const shell = document.getElementById('phone-shell');
  const { overlay, modal, remove } = createModal('📱 社交账号');
  const body = modal.querySelector('.we-body');

  const fields = [
    { id: 'social-name', label: '显示名称（朋友圈/论坛）', value: user.social_name || '', placeholder: '你的社交昵称' },
    { id: 'social-bio',  label: '个性签名', value: user.social_bio  || '', placeholder: '一句话介绍自己' },
    { id: 'social-id',   label: 'ID / 账号', value: user.social_id   || '', placeholder: '@your_id' },
  ];

  fields.forEach(f => {
    const wrap = document.createElement('div');
    wrap.className = 'we-field';
    const label = document.createElement('label');
    label.className = 'we-label';
    label.textContent = f.label;
    const input = document.createElement('input');
    input.className = 'we-input';
    input.id = f.id;
    input.value = f.value;
    input.placeholder = f.placeholder;
    wrap.appendChild(label);
    wrap.appendChild(input);
    body.appendChild(wrap);
  });

  const footer = modal.querySelector('.we-footer');
  footer.appendChild(document.createElement('div'));
  const saveBtn = createModalBtn('💾 保存', 'save');
  saveBtn.addEventListener('click', async () => {
    const u = await db.user.get('profile');
    u.social_name = modal.querySelector('#social-name').value.trim();
    u.social_bio  = modal.querySelector('#social-bio').value.trim();
    u.social_id   = modal.querySelector('#social-id').value.trim();
    await db.user.set('profile', u);
    updateValue('s-social', u.social_name || '点击设置');
    remove();
  });
  footer.appendChild(saveBtn);

  shell.appendChild(overlay);
  void overlay.offsetHeight;
  overlay.classList.add('we-overlay--show');
}

// ================================================================
//  通用文本编辑器
// ================================================================
function openTextEditor(title, placeholder, value, onSave) {
  const shell = document.getElementById('phone-shell');
  const { overlay, modal, remove } = createModal(title);
  const body = modal.querySelector('.we-body');

  const wrap = document.createElement('div');
  wrap.className = 'we-field';
  const textarea = document.createElement('textarea');
  textarea.className = 'we-input we-textarea';
  textarea.placeholder = placeholder;
  textarea.value = value;
  textarea.style.minHeight = '160px';
  wrap.appendChild(textarea);
  body.appendChild(wrap);

  const footer = modal.querySelector('.we-footer');
  footer.appendChild(document.createElement('div'));
  const saveBtn = createModalBtn('💾 保存', 'save');
  saveBtn.addEventListener('click', () => {
    onSave(textarea.value);
    remove();
  });
  footer.appendChild(saveBtn);

  shell.appendChild(overlay);
  void overlay.offsetHeight;
  overlay.classList.add('we-overlay--show');
  setTimeout(() => textarea.focus(), 350);
}

// ================================================================
//  知识书编辑器
// ================================================================
function openKnowledgeEditor(entry, key, listGroup) {
  const shell = document.getElementById('phone-shell');
  const isNew = !entry;
  const { overlay, modal, remove } = createModal(isNew ? '📖 添加知识' : '📖 编辑知识');
  const body = modal.querySelector('.we-body');

  // 标题
  const titleWrap = document.createElement('div');
  titleWrap.className = 'we-field';
  const titleLabel = document.createElement('label');
  titleLabel.className = 'we-label';
  titleLabel.textContent = '标题';
  const titleInput = document.createElement('input');
  titleInput.className = 'we-input';
  titleInput.value = entry?.title || '';
  titleInput.placeholder = '知识条目标题';
  titleWrap.appendChild(titleLabel);
  titleWrap.appendChild(titleInput);
  body.appendChild(titleWrap);

  // 内容
  const contentWrap = document.createElement('div');
  contentWrap.className = 'we-field';
  const contentLabel = document.createElement('label');
  contentLabel.className = 'we-label';
  contentLabel.textContent = '内容';
  const contentArea = document.createElement('textarea');
  contentArea.className = 'we-input we-textarea';
  contentArea.value = entry?.content || '';
  contentArea.placeholder = '输入知识内容，AI 对话时会参考…';
  contentArea.style.minHeight = '200px';
  contentWrap.appendChild(contentLabel);
  contentWrap.appendChild(contentArea);
  body.appendChild(contentWrap);

  const footer = modal.querySelector('.we-footer');

  if (!isNew) {
    const delBtn = createModalBtn('🗑️ 删除', 'delete');
    delBtn.addEventListener('click', async () => {
      if (!confirm('确定删除？')) return;
      await db.knowledge.remove(key);
      const updated = await db.knowledge.getAll();
      renderKnowledgeItems(listGroup, updated);
      remove();
    });
    footer.appendChild(delBtn);
  } else {
    footer.appendChild(document.createElement('div'));
  }

  const saveBtn = createModalBtn('💾 保存', 'save');
  saveBtn.addEventListener('click', async () => {
    const t = titleInput.value.trim();
    const c = contentArea.value.trim();
    if (!t && !c) { remove(); return; }
    const saveKey = key || 'kb_' + Date.now().toString(36);
    await db.knowledge.set(saveKey, { title: t, content: c });
    const updated = await db.knowledge.getAll();
    renderKnowledgeItems(listGroup, updated);
    remove();
  });
  footer.appendChild(saveBtn);

  shell.appendChild(overlay);
  void overlay.offsetHeight;
  overlay.classList.add('we-overlay--show');
}

// ================================================================
//  Modal 工厂（统一创建底部弹出层）
// ================================================================
function createModal(title) {
  const overlay = document.createElement('div');
  overlay.className = 'widget-editor-overlay';

  const modal = document.createElement('div');
  modal.className = 'widget-editor-modal';

  // Header
  const header = document.createElement('div');
  header.className = 'we-header';
  const titleEl = document.createElement('h3');
  titleEl.className = 'we-title';
  titleEl.textContent = title;
  const closeBtn = document.createElement('button');
  closeBtn.className = 'we-close';
  closeBtn.setAttribute('aria-label', '关闭');
  closeBtn.textContent = '✕';
  header.appendChild(titleEl);
  header.appendChild(closeBtn);

  // Body
  const body = document.createElement('div');
  body.className = 'we-body';

  // Footer
  const footer = document.createElement('div');
  footer.className = 'we-footer';

  modal.appendChild(header);
  modal.appendChild(body);
  modal.appendChild(footer);
  overlay.appendChild(modal);

  const remove = () => {
    overlay.classList.remove('we-overlay--show');
    overlay.classList.add('we-overlay--hide');
    setTimeout(() => overlay.remove(), 300);
  };

  closeBtn.addEventListener('click', remove);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) remove(); });

  return { overlay, modal, body, footer, remove };
}

/** 创建 Modal 内的按钮 */
function createModalBtn(text, type = 'secondary') {
  const btn = document.createElement('button');
  btn.className = 'we-btn';
  if (type === 'save')   btn.classList.add('we-btn--save');
  if (type === 'delete') btn.classList.add('we-btn--delete');
  btn.textContent = text;
  return btn;
}

/** 包裹成 we-field */
function wrapField(el) {
  const wrap = document.createElement('div');
  wrap.className = 'we-field';
  wrap.appendChild(el);
  return wrap;
}
