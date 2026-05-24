/**
 * settingsApp.js — 设置页面
 *
 * 包含：
 * - 用户资料（名字、人设、社交账号、头像）
 * - 壁纸更换（文件 + URL）
 * - 主题切换
 * - API 连接配置（Base URL + Key +模型，用/models 测试连接）
 * - AI 自主发消息开关
 * - 全局知识书
 * - 重置桌面
 */

import { db } from '../core/db.js';
import { eventBus } from '../core/eventBus.js';
import { engine } from '../core/engine.js';
import { changeWallpaper } from './desktopApp.js';

let initialized = false;

export async function initSettings() {
  if (initialized) {
    //刷新动态数据
    await refreshDynamicValues();
    return;
  }
  initialized = true;

  const container = document.getElementById('settings-content');
  if (!container) return;

  const user = await db.user.get('profile') || {};
  const wallpaper = await db.user.get('wallpaper') || '';
  const engineSettings = await db.user.get('engine_settings') || {};
  const knowledgeList = await db.knowledge.getAll();

  container.innerHTML = `
    <!--═══════ 用户资料 ═══════ -->
    <h3 class="settings-section-title">👤 用户资料</h3>
    <div class="settings-group">
      <div class="settings-item" id="s-avatar">
        <span class="settings-item__label">头像</span>
        <div class="settings-item__right">
          <img class="settings-avatar-preview" id="s-avatar-preview"
               src="${user.avatar || ''}"
               alt="" style="${user.avatar ? '' : 'display:none'}" />
          <span class="settings-item__value" id="s-avatar-value">${user.avatar ? '已设置' : '未设置'}</span>
        </div>
      </div>
      <input type="file" id="s-avatar-file" accept="image/*" hidden />

      <div class="settings-item" id="s-name">
        <span class="settings-item__label">用户名</span>
        <span class="settings-item__value" id="s-name-value">${escHtml(user.name ||'User')}</span>
      </div>

      <div class="settings-item" id="s-persona">
        <span class="settings-item__label">人设描述</span>
        <span class="settings-item__value" id="s-persona-value">${user.persona ? '已设置 ✓' : '点击编辑'}</span>
      </div>

      <div class="settings-item" id="s-social">
        <span class="settings-item__label">社交账号</span>
        <span class="settings-item__value" id="s-social-value">${user.social_name ? escHtml(user.social_name) : '点击设置'}</span>
      </div>
    </div>

    <!-- ═══════ 外观 ═══════ -->
    <h3 class="settings-section-title">🎨 外观</h3>
    <div class="settings-group">
      <div class="settings-item" id="s-theme">
        <span class="settings-item__label">主题</span>
        <span class="settings-item__value" id="s-theme-value">${user.theme === 'light' ? '☀️ 浅色' : '🌙 深色'}</span>
      </div>

      <div class="settings-item" id="s-wallpaper-file">
        <span class="settings-item__label">壁纸 · 选择文件</span>
        <span class="settings-item__value">📁</span>
      </div>
      <input type="file" id="s-wallpaper-file-input" accept="image/*" hidden />

      <div class="settings-item" id="s-wallpaper-url">
        <span class="settings-item__label">壁纸 · 输入 URL</span>
        <span class="settings-item__value">🔗</span>
      </div>

      <div class="settings-item" id="s-wallpaper-clear" style="${wallpaper ? '' : 'display:none'}">
        <span class="settings-item__label">恢复默认壁纸</span>
        <span class="settings-item__value">🗑️</span>
      </div>
    </div>

    <!-- ═══════ AI 连接 ═══════ -->
    <h3 class="settings-section-title">🤖 AI 连接</h3>
    <div class="settings-group">
      <div class="settings-item" id="s-api-base">
        <span class="settings-item__label">API Base URL</span>
        <span class="settings-item__value" id="s-api-base-value">${escHtml(user.api_base || '未设置')}</span>
      </div>

      <div class="settings-item" id="s-api-key">
        <span class="settings-item__label">API Key</span>
        <span class="settings-item__value" id="s-api-key-value">${user.api_key ? '••••' + user.api_key.slice(-4) : '未设置'}</span>
      </div>

      <div class="settings-item" id="s-api-model">
        <span class="settings-item__label">模型</span>
        <span class="settings-item__value" id="s-api-model-value">${escHtml(user.api_model || '未设置')}</span>
      </div>

      <div class="settings-item" id="s-api-test">
        <span class="settings-item__label">🔌 测试连接</span>
        <span class="settings-item__value" id="s-api-test-value">点击测试</span>
      </div>
    </div>

    <!-- ═══════ AI 行为 ═══════ -->
    <h3 class="settings-section-title">🧠 AI 行为</h3>
    <div class="settings-group">
      <div class="settings-item" id="s-ai-auto">
        <span class="settings-item__label">AI 自主发消息</span>
        <div class="settings-toggle ${engineSettings.aiAutoEnabled ? 'settings-toggle--on' : ''}" id="s-ai-auto-toggle">
          <div class="settings-toggle__track">
            <div class="settings-toggle__thumb"></div>
          </div></div>
      </div></div>

    <!-- ═══════ 知识书 ═══════ -->
    <h3 class="settings-section-title">📚 全局知识书</h3>
    <p class="settings-hint">添加全局背景知识，所有 AI 对话都会参考这些内容。</p>
    <div class="settings-group" id="s-knowledge-list">
      ${knowledgeList.map(k => `
        <div class="settings-item knowledge-item" data-key="${escHtml(k._key)}">
          <div class="settings-item__label knowledge-title">${escHtml(k.title || '未命名')}</div>
          <span class="settings-item__value knowledge-delete" data-key="${escHtml(k._key)}">✕</span>
        </div>
      `).join('')}
    </div><div class="settings-group">
      <div class="settings-item" id="s-knowledge-add">
        <span class="settings-item__label">➕ 添加知识条目</span>
        <span class="settings-item__value"></span>
      </div>
    </div>

    <!-- ═══════ 数据 ═══════ -->
    <h3 class="settings-section-title">🔧 数据</h3>
    <div class="settings-group">
      <div class="settings-item" id="s-reset-widgets">
        <span class="settings-item__label">重置桌面小组件</span>
        <span class="settings-item__value">恢复默认</span>
      </div>
    </div>

    <div style="height: 40px;"></div>
  `;

  bindSettingsEvents(container);
}

// ================================================================
//  事件绑定
// ================================================================
function bindSettingsEvents(container) {
  const $ = (id) => container.querySelector(id);

  // ── 头像 ──
  $('#s-avatar').addEventListener('click', () => {
    showAvatarPicker();
  });

  // ── 用户名 ──
  $('#s-name').addEventListener('click', async () => {
    const u = await db.user.get('profile');
    const name = prompt('请输入用户名：', u.name || '');
    if (name !== null && name.trim()) {
      u.name = name.trim();
      await db.user.set('profile', u);
      $('#s-name-value').textContent = u.name;
    }
  });

  // ── 人设 ──
  $('#s-persona').addEventListener('click', async () => {
    const u = await db.user.get('profile');
    openTextEditor('编辑人设描述', '描述你的角色设定，AI 会据此理解你…', u.persona || '', async (val) => {
      u.persona = val;
      await db.user.set('profile', u);
      $('#s-persona-value').textContent = val ? '已设置 ✓' : '点击编辑';
    });
  });

  // ── 社交账号 ──
  $('#s-social').addEventListener('click', async () => {
    const u = await db.user.get('profile');
    openSocialEditor(u);
  });

  // ── 主题 ──
  $('#s-theme').addEventListener('click', async () => {
    const u = await db.user.get('profile');
    u.theme = u.theme === 'dark' ? 'light' : 'dark';
    await db.user.set('profile', u);
    $('#s-theme-value').textContent = u.theme === 'light' ? '☀️ 浅色' : '🌙 深色';
    eventBus.emit('theme:change', { theme: u.theme });
  });

  // ── 壁纸文件 ──
  const wpFileInput = $('#s-wallpaper-file-input');
  $('#s-wallpaper-file').addEventListener('click', () => wpFileInput.click());
  wpFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    await changeWallpaper(file);$('#s-wallpaper-clear').style.display = '';wpFileInput.value = '';
  });

  // ── 壁纸 URL ──
  $('#s-wallpaper-url').addEventListener('click', async () => {
    const url = prompt('请输入壁纸图片 URL：', '');
    if (url !== null && url.trim()) {
      await changeWallpaper(url.trim());
      $('#s-wallpaper-clear').style.display = '';
    }
  });

  // ── 清除壁纸 ──
  $('#s-wallpaper-clear').addEventListener('click', async () => {
    await changeWallpaper(null);
    $('#s-wallpaper-clear').style.display = 'none';
  });

  // ── API Base URL ──
  $('#s-api-base').addEventListener('click', async () => {
    const u = await db.user.get('profile');
    const val = prompt('请输入 API Base URL（如https://api.openai.com/v1）：', u.api_base || '');
    if (val !== null) {
      u.api_base = val.trim().replace(/\/+$/, ''); // 去掉末尾斜杠
      await db.user.set('profile', u);
      $('#s-api-base-value').textContent = u.api_base || '未设置';
    }
  });

  // ── API Key ──
  $('#s-api-key').addEventListener('click', async () => {
    const u = await db.user.get('profile');
    const val = prompt('请输入 API Key：', u.api_key || '');
    if (val !== null) {
      u.api_key = val.trim();
      await db.user.set('profile', u);
      $('#s-api-key-value').textContent = u.api_key ? '••••' + u.api_key.slice(-4) : '未设置';
    }
  });

  // ──模型 ──
  $('#s-api-model').addEventListener('click', async () => {
    const u = await db.user.get('profile');
    const val = prompt('请输入模型名称（如 gpt-4o）：', u.api_model || '');
    if (val !== null) {
      u.api_model = val.trim();
      await db.user.set('profile', u);
      $('#s-api-model-value').textContent = u.api_model || '未设置';
    }
  });

  // ── 测试连接（用/models 端点，不消耗 token） ──
  $('#s-api-test').addEventListener('click', async () => {
    const testEl = $('#s-api-test-value');
    const u = await db.user.get('profile');

    if (!u.api_base || !u.api_key) {
      testEl.textContent = '❌ 请先设置 Base URL 和 Key';
      testEl.style.color = '#ff6b6b';
      return;
    }

    testEl.textContent = '⏳ 连接中…';
    testEl.style.color = '';

    try {
      const url = u.api_base.replace(/\/+$/, '') + '/models';
      const resp = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${u.api_key}`,
        },
      });

      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
      }

      const data = await resp.json();
      const modelCount = data?.data?.length ?? 0;

      testEl.textContent = `✅ 连接成功！发现 ${modelCount} 个模型`;
      testEl.style.color = '#4ade80';

      // 如果用户还没设置模型，自动提示选择
      if (!u.api_model && modelCount > 0) {
        const modelNames = data.data.map(m => m.id).slice(0, 20).join('\n');
        const pick = prompt(`检测到以下模型，请输入要使用的模型名：\n\n${modelNames}`, data.data[0]?.id || '');
        if (pick !== null && pick.trim()) {
          u.api_model = pick.trim();
          await db.user.set('profile', u);
          $('#s-api-model-value').textContent = u.api_model;
        }
      }
    } catch (err) {
      console.error('[Settings] API 测试失败:', err);
      testEl.textContent = `❌ ${err.message}`;
      testEl.style.color = '#ff6b6b';
    }
  });

  // ── AI 自主发消息开关 ──
  $('#s-ai-auto').addEventListener('click', async () => {
    const toggle = $('#s-ai-auto-toggle');
    const isOn = toggle.classList.contains('settings-toggle--on');
    const newState = !isOn;
    toggle.classList.toggle('settings-toggle--on', newState);
    await engine.setAiAutoEnabled(newState);
  });

  // ── 知识书：删除 ──
  container.querySelectorAll('.knowledge-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const key = btn.dataset.key;
      if (!confirm('确定删除这条知识？')) return;
      await db.knowledge.remove(key);
      btn.closest('.knowledge-item')?.remove();
    });
  });

  // ── 知识书：查看/编辑 ──
  container.querySelectorAll('.knowledge-item').forEach(item => {
    item.addEventListener('click', async (e) => {
      if (e.target.closest('.knowledge-delete')) return;
      const key = item.dataset.key;
      const entry = await db.knowledge.get(key);
      if (!entry) return;
      openKnowledgeEditor(entry, key);
    });
  });

  // ── 知识书：添加 ──
  $('#s-knowledge-add').addEventListener('click', () => {
    openKnowledgeEditor(null, null);
  });

  // ── 重置桌面──
  $('#s-reset-widgets').addEventListener('click', async () => {
    if (!confirm('确定要重置所有桌面小组件为默认状态吗？')) return;
    await db.user.remove('desktop_layout_page0');
    await db.user.remove('desktop_layout_page1');
    location.reload();
  });
}

// ================================================================
//  头像选择器（文件 + URL）
// ================================================================
function showAvatarPicker() {
  const shell = document.getElementById('phone-shell');
  const overlay = document.createElement('div');
  overlay.className = 'widget-editor-overlay';
  overlay.addEventListener('click', (e) => { if (e.target === overlay) removeOverlay(); });

  const modal = document.createElement('div');
  modal.className = 'widget-editor-modal';
  modal.innerHTML = `
    <div class="we-header">
      <h3class="we-title">👤 设置头像</h3>
      <button class="we-close" aria-label="关闭">✕</button>
    </div>
    <div class="we-body">
      <div class="we-field" style="align-items:center;">
        <img class="settings-avatar-large" id="avatar-edit-preview" src="" alt="" style="display:none" />
      </div>
      <div class="we-field">
        <button class="we-btn" id="avatar-pick-file" style="width:100%;background:rgba(255,255,255,0.08);">📁 从文件选择</button>
        <input type="file" id="avatar-pick-file-input" accept="image/*" hidden />
      </div>
      <div class="we-field">
        <button class="we-btn" id="avatar-pick-url" style="width:100%;background:rgba(255,255,255,0.08);">🔗 输入图片 URL</button>
      </div>
    </div>
    <div class="we-footer">
      <button class="we-btn we-btn--delete" id="avatar-clear">🗑️ 清除头像</button>
      <button class="we-btn we-btn--save" id="avatar-save">💾 保存</button>
    </div>`;

  overlay.appendChild(modal);
  shell.appendChild(overlay);
  void overlay.offsetHeight;
  overlay.classList.add('we-overlay--show');

  let newAvatarData = null;

  // 加载当前头像
  (async () => {
    const u = await db.user.get('profile');
    if (u?.avatar) {
      modal.querySelector('#avatar-edit-preview').src = u.avatar;
      modal.querySelector('#avatar-edit-preview').style.display = '';newAvatarData = u.avatar;
    }
  })();

  const fileInput = modal.querySelector('#avatar-pick-file-input');

  modal.querySelector('#avatar-pick-file').addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      newAvatarData = ev.target.result;
      const preview = modal.querySelector('#avatar-edit-preview');
      preview.src = newAvatarData;
      preview.style.display = '';
    };
    reader.readAsDataURL(file);
  });

  modal.querySelector('#avatar-pick-url').addEventListener('click', () => {
    const url = prompt('请输入头像图片 URL：', '');
    if (url !== null && url.trim()) {
      newAvatarData = url.trim();
      const preview = modal.querySelector('#avatar-edit-preview');
      preview.src = newAvatarData;
      preview.style.display = '';
    }
  });

  modal.querySelector('#avatar-clear').addEventListener('click', () => {
    newAvatarData = '';
    const preview = modal.querySelector('#avatar-edit-preview');
    preview.style.display = 'none';preview.src = '';
  });

  modal.querySelector('#avatar-save').addEventListener('click', async () => {
    const u = await db.user.get('profile');
    u.avatar = newAvatarData || '';
    await db.user.set('profile', u);

    // 更新设置页预览
    const settingsPreview = document.getElementById('s-avatar-preview');
    const settingsValue = document.getElementById('s-avatar-value');
    if (settingsPreview) {
      settingsPreview.src = u.avatar;
      settingsPreview.style.display = u.avatar ? '' : 'none';
    }
    if (settingsValue) settingsValue.textContent = u.avatar ? '已设置' : '未设置';

    removeOverlay();
  });

  modal.querySelector('.we-close').addEventListener('click', removeOverlay);

  function removeOverlay() {
    overlay.classList.remove('we-overlay--show');
    overlay.classList.add('we-overlay--hide');
    setTimeout(() => overlay.remove(), 300);
  }
}

// ================================================================
//  社交账号编辑器
// ================================================================
async function openSocialEditor(user) {
  const shell = document.getElementById('phone-shell');
  const overlay = document.createElement('div');
  overlay.className = 'widget-editor-overlay';
  overlay.addEventListener('click', (e) => { if (e.target === overlay) removeOverlay(); });

  const modal = document.createElement('div');
  modal.className = 'widget-editor-modal';
  modal.innerHTML = `
    <div class="we-header">
      <h3 class="we-title">📱 社交账号</h3>
      <button class="we-close" aria-label="关闭">✕</button>
    </div>
    <div class="we-body">
      <div class="we-field">
        <label class="we-label">显示名称（朋友圈/论坛）</label>
        <input class="we-input" id="social-name" value="${escHtml(user.social_name || '')}" placeholder="你的社交昵称" />
      </div>
      <div class="we-field">
        <label class="we-label">个性签名</label>
        <input class="we-input" id="social-bio" value="${escHtml(user.social_bio || '')}" placeholder="一句话介绍自己" />
      </div>
      <div class="we-field">
        <label class="we-label">ID / 账号</label>
        <input class="we-input" id="social-id" value="${escHtml(user.social_id || '')}" placeholder="@your_id" />
      </div>
    </div>
    <div class="we-footer">
      <div></div>
      <button class="we-btn we-btn--save" id="social-save">💾 保存</button>
    </div>`;

  overlay.appendChild(modal);
  shell.appendChild(overlay);
  void overlay.offsetHeight;
  overlay.classList.add('we-overlay--show');

  modal.querySelector('.we-close').addEventListener('click', removeOverlay);

  modal.querySelector('#social-save').addEventListener('click', async () => {
    const u = await db.user.get('profile');
    u.social_name = modal.querySelector('#social-name').value.trim();
    u.social_bio = modal.querySelector('#social-bio').value.trim();
    u.social_id = modal.querySelector('#social-id').value.trim();
    await db.user.set('profile', u);

    const el = document.getElementById('s-social-value');
    if (el) el.textContent = u.social_name || '点击设置';
    removeOverlay();
  });

  function removeOverlay() {
    overlay.classList.remove('we-overlay--show');
    overlay.classList.add('we-overlay--hide');
    setTimeout(() => overlay.remove(), 300);
  }
}

// ================================================================
//  通用文本编辑器（人设等大段文字）
// ================================================================
function openTextEditor(title, placeholder, value, onSave) {
  const shell = document.getElementById('phone-shell');
  const overlay = document.createElement('div');
  overlay.className = 'widget-editor-overlay';
  overlay.addEventListener('click', (e) => { if (e.target === overlay) removeOverlay(); });

  const modal = document.createElement('div');
  modal.className = 'widget-editor-modal';
  modal.innerHTML = `
    <div class="we-header">
      <h3 class="we-title">${escHtml(title)}</h3>
      <button class="we-close" aria-label="关闭">✕</button>
    </div>
    <div class="we-body">
      <div class="we-field">
        <textarea class="we-input we-textarea" id="text-editor-area" placeholder="${escHtml(placeholder)}" style="min-height:160px;">${escHtml(value)}</textarea>
      </div>
    </div>
    <div class="we-footer">
      <div></div>
      <button class="we-btn we-btn--save" id="text-editor-save">💾 保存</button>
    </div>`;

  overlay.appendChild(modal);
  shell.appendChild(overlay);
  void overlay.offsetHeight;
  overlay.classList.add('we-overlay--show');

  modal.querySelector('.we-close').addEventListener('click', removeOverlay);
  modal.querySelector('#text-editor-save').addEventListener('click', () => {
    const val = modal.querySelector('#text-editor-area').value;
    onSave(val);
    removeOverlay();
  });

  // 自动聚焦
  setTimeout(() => modal.querySelector('#text-editor-area')?.focus(), 350);

  function removeOverlay() {
    overlay.classList.remove('we-overlay--show');
    overlay.classList.add('we-overlay--hide');
    setTimeout(() => overlay.remove(), 300);
  }
}

// ================================================================
//  知识书编辑器
// ================================================================
function openKnowledgeEditor(entry, key) {
  const shell = document.getElementById('phone-shell');
  const overlay = document.createElement('div');
  overlay.className = 'widget-editor-overlay';
  overlay.addEventListener('click', (e) => { if (e.target === overlay) removeOverlay(); });

  const isNew = !entry;
  const title = entry?.title || '';
  const content = entry?.content || '';

  const modal = document.createElement('div');
  modal.className = 'widget-editor-modal';
  modal.innerHTML = `
    <div class="we-header">
      <h3 class="we-title">📖 ${isNew ? '添加知识' : '编辑知识'}</h3>
      <button class="we-close" aria-label="关闭">✕</button>
    </div>
    <div class="we-body">
      <div class="we-field">
        <label class="we-label">标题</label>
        <input class="we-input" id="kb-title" value="${escHtml(title)}" placeholder="知识条目标题" />
      </div>
      <div class="we-field">
        <label class="we-label">内容</label>
        <textarea class="we-input we-textarea" id="kb-content" placeholder="输入知识内容，AI对话时会参考…" style="min-height:200px;">${escHtml(content)}</textarea>
      </div>
    </div>
    <div class="we-footer">
      ${isNew ? '<div></div>' : '<button class="we-btn we-btn--delete" id="kb-delete">🗑️ 删除</button>'}
      <button class="we-btn we-btn--save" id="kb-save">💾 保存</button>
    </div>`;

  overlay.appendChild(modal);
  shell.appendChild(overlay);
  void overlay.offsetHeight;
  overlay.classList.add('we-overlay--show');

  modal.querySelector('.we-close').addEventListener('click', removeOverlay);

  modal.querySelector('#kb-save').addEventListener('click', async () => {
    const t = modal.querySelector('#kb-title').value.trim();
    const c = modal.querySelector('#kb-content').value.trim();
    if (!t && !c) { removeOverlay(); return; }

    const saveKey = key || 'kb_' + Date.now().toString(36);
    await db.knowledge.set(saveKey, { title: t, content: c });

    //刷新列表
    await refreshKnowledgeList();
    removeOverlay();
  });

  if (!isNew) {
    modal.querySelector('#kb-delete')?.addEventListener('click', async () => {
      if (!confirm('确定删除？')) return;
      await db.knowledge.remove(key);
      await refreshKnowledgeList();
      removeOverlay();
    });
  }

  function removeOverlay() {
    overlay.classList.remove('we-overlay--show');
    overlay.classList.add('we-overlay--hide');
    setTimeout(() => overlay.remove(), 300);
  }
}

// ================================================================
//  刷新知识书列表
// ================================================================
async function refreshKnowledgeList() {
  const listEl = document.getElementById('s-knowledge-list');
  if (!listEl) return;

  const knowledgeList = await db.knowledge.getAll();
  listEl.innerHTML = knowledgeList.map(k => `
    <div class="settings-item knowledge-item" data-key="${escHtml(k._key)}">
      <div class="settings-item__label knowledge-title">${escHtml(k.title || '未命名')}</div>
      <span class="settings-item__value knowledge-delete" data-key="${escHtml(k._key)}">✕</span>
    </div>
  `).join('');

  // 重新绑定事件
  listEl.querySelectorAll('.knowledge-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm('确定删除？')) return;
      await db.knowledge.remove(btn.dataset.key);
      btn.closest('.knowledge-item')?.remove();
    });
  });

  listEl.querySelectorAll('.knowledge-item').forEach(item => {
    item.addEventListener('click', async (e) => {
      if (e.target.closest('.knowledge-delete')) return;
      const entry = await db.knowledge.get(item.dataset.key);
      if (entry) openKnowledgeEditor(entry, item.dataset.key);
    });
  });
}

// ================================================================
//  刷新动态值（设置页重新打开时）
// ================================================================
async function refreshDynamicValues() {
  const u = await db.user.get('profile') || {};
  const el = (id) => document.getElementById(id);

  if (el('s-name-value')) el('s-name-value').textContent = u.name || 'User';
  if (el('s-persona-value')) el('s-persona-value').textContent = u.persona ? '已设置 ✓' : '点击编辑';
  if (el('s-social-value')) el('s-social-value').textContent = u.social_name || '点击设置';
  if (el('s-theme-value')) el('s-theme-value').textContent = u.theme === 'light' ? '☀️ 浅色' : '🌙 深色';
  if (el('s-api-base-value')) el('s-api-base-value').textContent = u.api_base || '未设置';
  if (el('s-api-key-value')) el('s-api-key-value').textContent = u.api_key ? '••••' + u.api_key.slice(-4) : '未设置';
  if (el('s-api-model-value')) el('s-api-model-value').textContent = u.api_model || '未设置';

  if (el('s-avatar-preview')) {
    el('s-avatar-preview').src = u.avatar || '';
    el('s-avatar-preview').style.display = u.avatar ? '' : 'none';
  }
  if (el('s-avatar-value')) el('s-avatar-value').textContent = u.avatar ? '已设置' : '未设置';

  const toggle = el('s-ai-auto-toggle');
  if (toggle) {
    toggle.classList.toggle('settings-toggle--on', engine.aiAutoEnabled);
  }
}

// ================================================================
//  工具
// ================================================================
function escHtml(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
