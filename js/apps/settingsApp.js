/**
 * settingsApp.js — 设置页面
 * 包含：壁纸更换、主题切换、API Key 配置
 */

import { db } from '../core/db.js';
import { eventBus } from '../core/eventBus.js';
import { changeWallpaper } from './desktopApp.js';

let initialized = false;

export async function initSettings() {
  if (initialized) return;
  initialized = true;

  const container = document.getElementById('settings-content');
  if (!container) return;

  const user = await db.user.get('profile');
  const wallpaper = await db.user.get('wallpaper');

  container.innerHTML = `
    <div class="settings-group">
      <div class="settings-item" id="setting-wallpaper">
        <span class="settings-item__label">🖼️ 更换壁纸</span>
        <span class="settings-item__value">点击选择</span>
      </div>
      <div class="settings-item" id="setting-clear-wallpaper" style="${wallpaper ? '' : 'display:none'}">
        <span class="settings-item__label">🗑️ 恢复默认壁纸</span>
        <span class="settings-item__value"></span>
      </div>
    </div>

    <div class="settings-group">
      <div class="settings-item" id="setting-theme">
        <span class="settings-item__label">🎨 主题</span>
        <span class="settings-item__value" id="theme-value">${user?.theme === 'dark' ? '深色' : '浅色'}</span>
      </div></div>

    <div class="settings-group">
      <div class="settings-item" id="setting-name">
        <span class="settings-item__label">👤 用户名</span>
        <span class="settings-item__value" id="name-value">${escHtml(user?.name ||'User')}</span>
      </div>
    </div>

    <div class="settings-group">
      <div class="settings-item" id="setting-apikey">
        <span class="settings-item__label">🔑 API Key</span>
        <span class="settings-item__value" id="apikey-value">${user?.api_key ? '已设置 ✓' : '未设置'}</span>
      </div>
    </div>

    <div class="settings-group">
      <div class="settings-item" id="setting-reset-widgets">
        <span class="settings-item__label">🔄 重置桌面小组件</span>
        <span class="settings-item__value">恢复默认</span>
      </div>
    </div>

    <input type="file" id="wallpaper-file-input" accept="image/*" hidden />`;

  //── 壁纸选择 ──
  const wpInput = container.querySelector('#wallpaper-file-input');

  container.querySelector('#setting-wallpaper').addEventListener('click', () => {
    wpInput.click();
  });

  wpInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    await changeWallpaper(file);container.querySelector('#setting-clear-wallpaper').style.display = '';wpInput.value = '';
  });

  container.querySelector('#setting-clear-wallpaper').addEventListener('click', async () => {
    await changeWallpaper(null);
    container.querySelector('#setting-clear-wallpaper').style.display = 'none';
  });

  // ── 主题切换 ──
  container.querySelector('#setting-theme').addEventListener('click', async () => {
    const u = await db.user.get('profile');
    const newTheme = u.theme === 'dark' ? 'light' : 'dark';
    u.theme = newTheme;
    await db.user.set('profile', u);
    document.getElementById('theme-value').textContent = newTheme === 'dark' ? '深色' : '浅色';
    eventBus.emit('theme:change', { theme: newTheme });
  });

  // ── 用户名编辑 ──
  container.querySelector('#setting-name').addEventListener('click', async () => {
    const u = await db.user.get('profile');
    const name = prompt('请输入用户名：', u.name || '');
    if (name !== null && name.trim()) {
      u.name = name.trim();
      await db.user.set('profile', u);
      document.getElementById('name-value').textContent = u.name;
    }
  });

  // ── API Key 设置 ──
  container.querySelector('#setting-apikey').addEventListener('click', async () => {
    const u = await db.user.get('profile');
    const key = prompt('请输入 API Key：', u.api_key || '');
    if (key !== null) {
      u.api_key = key.trim();
      await db.user.set('profile', u);
      document.getElementById('apikey-value').textContent = u.api_key ? '已设置 ✓' : '未设置';
    }
  });

  // ── 重置桌面──
  container.querySelector('#setting-reset-widgets').addEventListener('click', async () => {
    if (!confirm('确定要重置所有桌面小组件为默认状态吗？')) return;
    await db.user.remove('desktop_widgets_page0');
    await db.user.remove('desktop_widgets_page1');
    location.reload();
  });
}

function escHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
