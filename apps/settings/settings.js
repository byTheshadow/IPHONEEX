// apps/settings/settings.js
constSettingsApp = (() => {
    function escapeHtml(str) {
        if (!str) return '';
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

    async function render() { return await renderMain(); }

    async function renderMain() {
        const userName = await Store.getSetting('user_name','User');
        const userDesc = await Store.getSetting('user_desc', '点击设置个人资料');
        const userAvatar = await Store.getSetting('user_avatar', '');
        const theme = await Store.getSetting('theme', 'dark');
        const showSB = await Store.getSetting('show_statusbar', true);
        const bgTrigger = await Store.getSetting('background_trigger', false);
        const apiUrl = await Store.getSetting('api_base_url', '');
        const apiModel = await Store.getSetting('api_model', '');

        return `
            <div class="app-header">
                <button class="app-header-btn app-back-btn" onclick="Router.close()">返回</button>
                <span class="app-header-title">设置</span>
                <span style="width:60px"></span>
            </div>
            <div class="app-body">
                <div class="settings-list">
                    <div class="settings-user-card glass" onclick="SettingsApp.nav('profile')">
                        <div class="settings-avatar">
                            ${userAvatar ? `<img src="${escapeHtml(userAvatar)}" alt="">` : '👤'}
                        </div>
                        <div class="settings-user-info">
                            <div class="settings-user-name">${escapeHtml(userName)}</div>
                            <div class="settings-user-desc">${escapeHtml(userDesc)}</div>
                        </div>
                        <span style="color:var(--text-tertiary);font-size:18px">›</span>
                    </div>

                    <div class="settings-section">
                        <div class="settings-section-title">API</div>
                        <div class="settings-group glass">
                            <div class="settings-item" onclick="SettingsApp.nav('api')">
                                <div class="settings-item-left">
                                    <div class="settings-item-icon" style="background:var(--glass-bg-heavy)">🔗</div>
                                    <span class="settings-item-label">API设置</span>
                                </div>
                                <div style="display:flex;align-items:center;gap:8px">
                                    ${apiUrl
                                        ? `<span class="api-status connected"><span class="api-status-dot"></span>${apiModel || '未选模型'}</span>`
                                        : `<span class="api-status error"><span class="api-status-dot"></span>未配置</span>`}
                                <span style="color:var(--text-tertiary)">›</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="settings-section">
                        <div class="settings-section-title">外观</div>
                        <div class="settings-group glass">
                            <div class="settings-item">
                                <div class="settings-item-left">
                                    <div class="settings-item-icon" style="background:var(--glass-bg-heavy)">🌙</div>
                                    <span class="settings-item-label">深色模式</span>
                                </div>
                                <label class="toggle-switch">
                                    <input type="checkbox" ${theme === 'dark' ? 'checked' : ''} onchange="SettingsApp.toggleTheme(this.checked)">
                                    <span class="toggle-slider"></span>
                                </label>
                            </div>
                            <div class="settings-item" onclick="SettingsApp.nav('wallpaper')">
                                <div class="settings-item-left">
                                    <div class="settings-item-icon" style="background:var(--glass-bg-heavy)">🖼️</div>
                                    <span class="settings-item-label">壁纸</span>
                                </div>
                                <span style="color:var(--text-tertiary)">›</span>
                            </div>
                            <div class="settings-item">
                                <div class="settings-item-left">
                                    <div class="settings-item-icon" style="background:var(--glass-bg-heavy)">📱</div>
                                    <span class="settings-item-label">状态栏</span>
                                </div>
                                <label class="toggle-switch">
                                    <input type="checkbox" ${showSB ? 'checked' : ''} onchange="SettingsApp.toggleStatusBar(this.checked)">
                                    <span class="toggle-slider"></span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div class="settings-section">
                        <div class="settings-section-title">功能</div>
                        <div class="settings-group glass">
                            <div class="settings-item">
                                <div class="settings-item-left">
                                    <div class="settings-item-icon" style="background:var(--glass-bg-heavy)">🔔</div>
                                    <span class="settings-item-label">后台触发</span>
                                </div>
                                <label class="toggle-switch">
                                    <input type="checkbox" ${bgTrigger ? 'checked' : ''} onchange="SettingsApp.toggleBg(this.checked)">
                                    <span class="toggle-slider"></span>
                                </label>
                            </div>
                            <div class="settings-item" onclick="SettingsApp.nav('knowledge')">
                                <div class="settings-item-left">
                                    <div class="settings-item-icon" style="background:var(--glass-bg-heavy)">📖</div>
                                    <span class="settings-item-label">全局知识书</span>
                                </div>
                                <span style="color:var(--text-tertiary)">›</span>
                            </div>
                        </div>
                    </div>

                    <div class="settings-section">
                        <div class="settings-section-title">系统</div>
                        <div class="settings-group glass">
                            <div class="settings-item" onclick="SettingsApp.nav('logs')">
                                <div class="settings-item-left">
                                    <div class="settings-item-icon" style="background:var(--glass-bg-heavy)">📋</div>
                                    <span class="settings-item-label">报错日志</span>
                                </div>
                                <span style="color:var(--text-tertiary)">›</span>
                            </div>
                            <div class="settings-item" onclick="SettingsApp.nav('data')">
                                <div class="settings-item-left">
                                    <div class="settings-item-icon" style="background:var(--glass-bg-heavy)">💾</div>
                                    <span class="settings-item-label">数据管理</span>
                                </div>
                                <span style="color:var(--text-tertiary)">›</span>
                            </div>
                </div>
                    </div>

                    <div style="text-align:center;padding:24px;color:var(--text-tertiary);font-size:12px;letter-spacing:0.5px">IPHONEEX v1.0
                    </div>
                </div>
            </div>`;
    }

    async function nav(view) {
        const el = document.getElementById('app-content');
        let html = '';
        switch (view) {
            case 'main': html = await renderMain(); break;
            case 'profile': html = await renderProfile(); break;
            case 'api': html = await renderAPI(); break;
            case 'wallpaper': html = await renderWallpaper(); break;
            case 'knowledge': html = await renderKnowledge(); break;
            case 'logs': html = await renderLogs(); break;
            case 'data': html = await renderData(); break;default: html = await renderMain();
        }
        el.innerHTML = html;
        if (view === 'api') initAPIView();
    }

    // ---- Profile ----
    async function renderProfile() {
        const n = await Store.getSetting('user_name', '');
        const d = await Store.getSetting('user_desc', '');
        const a = await Store.getSetting('user_avatar', '');
        const p = await Store.getSetting('user_persona', '');
        const pr = await Store.getSetting('user_preferences', '');

        return `
            <div class="app-header">
                <button class="app-header-btn app-back-btn" onclick="SettingsApp.nav('main')">设置</button>
                <span class="app-header-title">个人资料</span>
                <button class="app-header-btn" onclick="SettingsApp.saveProfile()">保存</button>
            </div>
            <div class="app-body">
                <div class="settings-list">
                    <div style="display:flex;flex-direction:column;align-items:center;padding:24px 0 8px">
                        <div class="settings-avatar" style="width:88px;height:88px;font-size:38px;cursor:pointer" onclick="SettingsApp.changeAvatar()">
                            ${a ? `<img src="${escapeHtml(a)}" alt="">` : '👤'}
                        </div>
                        <div style="margin-top:10px;font-size:13px;color:var(--text-secondary);cursor:pointer" onclick="SettingsApp.changeAvatar()">更换头像</div>
                    </div>
                    <div class="settings-section">
                        <div class="settings-group glass" style="padding:16px">
                            <div class="form-group">
                                <label class="form-label">名称</label>
                                <input class="form-input" id="pf-name" value="${escapeHtml(n)}" placeholder="你的名字">
                            </div>
                            <div class="form-group">
                                <label class="form-label">简介</label>
                                <input class="form-input" id="pf-desc" value="${escapeHtml(d)}" placeholder="一句话介绍">
                            </div>
                            <div class="form-group">
                                <label class="form-label">身份设定(AI可见)</label>
                                <textarea class="form-textarea" id="pf-persona" rows="4" placeholder="你的身份、背景...">${escapeHtml(p)}</textarea>
                            </div>
                            <div class="form-group" style="margin-bottom:0">
                                <label class="form-label">个人喜好 (AI参考)</label>
                                <textarea class="form-textarea" id="pf-prefs" rows="4" placeholder="兴趣、习惯...">${escapeHtml(pr)}</textarea>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
    }

    async function saveProfile() {
        await Store.setSetting('user_name', document.getElementById('pf-name')?.value || 'User');
        await Store.setSetting('user_desc', document.getElementById('pf-desc')?.value || '');
        await Store.setSetting('user_persona', document.getElementById('pf-persona')?.value || '');
        await Store.setSetting('user_preferences', document.getElementById('pf-prefs')?.value || '');
        Logger.info('Profile saved');
        nav('main');
    }

    async function changeAvatar() {
        Phone.showModal({
            title: '更换头像',
            content: `
                <div class="form-group">
                    <label class="form-label">图片 URL</label>
                    <input class="form-input" id="av-url" placeholder="https://...">
                </div>
                <div style="text-align:center;margin:10px 0;color:var(--text-tertiary);font-size:13px">— 或 —</div>
                <div class="form-group" style="margin-bottom:0">
                    <label class="form-label">上传文件</label>
                    <input type="file" id="av-file" accept="image/*" class="form-input" style="padding:8px">
                </div>`,
            actions: [
                { label: '取消', type: 'secondary' },
                {
                    label: '确定', type: 'primary', onClick: async () => {
                        const url = document.getElementById('av-url')?.value;
                        const file = document.getElementById('av-file')?.files[0];
                        if (url) {
                            await Store.setSetting('user_avatar', url);
                            nav('profile');
                        } else if (file) {
                            const reader = new FileReader();
                            reader.onload = async (e) => {
                                await Store.setSetting('user_avatar', e.target.result);
                                nav('profile');
                            };
                            reader.readAsDataURL(file);
                        }
                    }
                }
            ]
        });
    }

    // ---- API ----
    async function renderAPI() {
        const url = await Store.getSetting('api_base_url', '');
        const key = await Store.getSetting('api_key', '');
        const model = await Store.getSetting('api_model', '');

        return `
            <div class="app-header">
                <button class="app-header-btn app-back-btn" onclick="SettingsApp.nav('main')">设置</button>
                <span class="app-header-title">API 设置</span>
                <button class="app-header-btn" onclick="SettingsApp.saveAPI()">保存</button>
            </div>
            <div class="app-body">
                <div class="settings-list">
                    <div class="settings-section">
                        <div class="settings-group glass" style="padding:16px">
                            <div class="form-group">
                                <label class="form-label">Base URL</label>
                                <input class="form-input" id="api-url" value="${escapeHtml(url)}" placeholder="https://api.openai.com/v1">
                            </div>
                            <div class="form-group">
                                <label class="form-label">API Key</label>
                                <input class="form-input" id="api-key" type="password" value="${escapeHtml(key)}" placeholder="sk-...">
                            </div>
                            <div class="form-group" style="margin-bottom:0">
                                <label class="form-label">模型</label>
                                <div style="display:flex;gap:8px">
                                    <select class="form-select" id="api-model" style="flex:1">
                                        <option value="">点击刷新获取列表</option>
                                        ${model ? `<option value="${escapeHtml(model)}" selected>${escapeHtml(model)}</option>` : ''}
                                    </select>
                                    <button class="modal-btn modal-btn-primary" style="flex:0 0 auto;padding:12px 16px;border-radius:var(--glass-radius-xs)" onclick="SettingsApp.refreshModels()">刷新</button>
                                </div>
                            </div>
                <div id="api-msg" style="margin-top:10px;font-size:13px"></div>
                        </div>
                    </div>
                <div class="settings-section">
                        <div class="settings-group glass" style="padding:16px">
                            <button class="modal-btn modal-btn-secondary" style="width:100%;border:1px solid var(--glass-border)" onclick="SettingsApp.testAPI()">测试连接</button>
                            <div id="api-test" style="margin-top:10px;font-size:13px;text-align:center"></div>
                        </div>
                    </div>
                </div>
            </div>`;
    }

    function initAPIView() {
        const models = API.getCachedModels();
        if (models.length > 0) populateModels(models);
    }

    async function refreshModels() {
        const msg = document.getElementById('api-msg');
        msg.innerHTML = '<span style="color:var(--text-secondary)">获取中...</span>';
        const url = document.getElementById('api-url')?.value;
        const key = document.getElementById('api-key')?.value;
        if (url) await Store.setSetting('api_base_url', url);
        if (key) await Store.setSetting('api_key', key);
        try {
            const models = await API.fetchModels();
            populateModels(models);
            msg.innerHTML = `<span style="color:var(--success)">✓ ${models.length} 个模型</span>`;
        } catch (e) {
            msg.innerHTML = `<span style="color:var(--danger)">✗ ${e.message}</span>`;
        }
    }

    function populateModels(models) {
        const sel = document.getElementById('api-model');
        if (!sel) return;
        const cur = sel.value;
        sel.innerHTML = '<option value="">选择模型...</option>';
        models.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.id;
            opt.textContent = m.name;
            if (m.id === cur) opt.selected = true;
            sel.appendChild(opt);
        });
    }

    async function saveAPI() {
        await Store.setSetting('api_base_url', document.getElementById('api-url')?.value || '');
        await Store.setSetting('api_key', document.getElementById('api-key')?.value || '');
        await Store.setSetting('api_model', document.getElementById('api-model')?.value || '');
        Logger.info('API settings saved');
        nav('main');
    }

    async function testAPI() {
        const el = document.getElementById('api-test');
        el.innerHTML = '<span style="color:var(--text-secondary)">测试中...</span>';
        await Store.setSetting('api_base_url', document.getElementById('api-url')?.value || '');
        await Store.setSetting('api_key', document.getElementById('api-key')?.value || '');
        await Store.setSetting('api_model', document.getElementById('api-model')?.value || '');
        try {
            const res = await API.chat(
                [{ role: 'user', content: 'Say "OK" only.' }],
                { stream: false, max_tokens: 10 }
            );
            el.innerHTML = `<span style="color:var(--success)">✓ ${res}</span>`;
        } catch (e) {
            el.innerHTML = `<span style="color:var(--danger)">✗ ${e.message}</span>`;
        }
    }

    // ---- Wallpaper ----
    async function renderWallpaper() {
        return `
            <div class="app-header">
                <button class="app-header-btn app-back-btn" onclick="SettingsApp.nav('main')">设置</button>
                <span class="app-header-title">壁纸</span>
                <span style="width:60px"></span>
            </div>
            <div class="app-body">
                <div class="settings-list">
                    <div class="settings-section">
                        <div class="settings-group glass" style="padding:16px">
                            <div class="form-group">
                                <label class="form-label">壁纸 URL</label>
                                <input class="form-input" id="wp-url" placeholder="https://...">
                            </div>
                            <div class="form-group">
                                <label class="form-label">上传文件</label>
                                <input type="file" id="wp-file" accept="image/*" class="form-input" style="padding:8px">
                            </div>
                            <div style="display:flex;gap:10px">
                                <button class="modal-btn modal-btn-primary" style="flex:1" onclick="SettingsApp.applyWP()">应用</button>
                                <button class="modal-btn modal-btn-secondary" style="flex:1;border:1px solid var(--glass-border)" onclick="SettingsApp.resetWP()">恢复默认</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
    }

    async function applyWP() {
        const url = document.getElementById('wp-url')?.value;
        const file = document.getElementById('wp-file')?.files[0];
        const apply = async (src) => {
            await Store.setSetting('wallpaper_url', src);
            const img = document.getElementById('wallpaper-custom');
            img.src = src;
            img.classList.remove('hidden');
            document.getElementById('wallpaper-default').classList.add('hidden');};
        if (url) await apply(url);
        else if (file) {
            const reader = new FileReader();
            reader.onload = (e) => apply(e.target.result);
            reader.readAsDataURL(file);
        }
    }

    async function resetWP() {
        await Store.setSetting('wallpaper_url', '');
        document.getElementById('wallpaper-custom').classList.add('hidden');
        document.getElementById('wallpaper-default').classList.remove('hidden');
    }

    // ---- Knowledge ----
    async function renderKnowledge() {
        const books = (await Store.getAll(Store.STORES.knowledgeBooks)).filter(b => b.scope === 'global');
        return `
            <div class="app-header">
                <button class="app-header-btn app-back-btn" onclick="SettingsApp.nav('main')">设置</button>
                <span class="app-header-title">全局知识书</span>
                <button class="app-header-btn" onclick="SettingsApp.addKB()">+ 新建</button>
            </div>
            <div class="app-body">
                <div class="settings-list">
                    <div class="settings-section">
                        <div class="settings-group glass" style="padding:16px">
                            <button class="modal-btn modal-btn-secondary" style="width:100%;border:1px solid var(--glass-border)" onclick="SettingsApp.importKB()">📥 导入 JSON</button>
                        </div>
                    </div>
                    ${books.length === 0 ? `
                        <div style="text-align:center;padding:48px 20px;color:var(--text-tertiary)">
                            <div style="font-size:40px;margin-bottom:12px;opacity:0.3">📖</div>
                            <div style="font-size:14px">暂无全局知识书</div>
                        </div>` : books.map(b => `
                        <div class="settings-section">
                            <div class="settings-group glass">
                                <div class="settings-item" onclick="SettingsApp.editKB('${b.id}')">
                                    <div class="settings-item-left">
                                        <span class="settings-item-label">${escapeHtml(b.name)}</span>
                                    </div>
                                    <div style="display:flex;align-items:center;gap:8px">
                                        <span style="font-size:12px;color:var(--text-tertiary)">${b.entries?.length || 0} 条</span>
                                        <span style="color:var(--text-tertiary)">›</span>
                                    </div>
                                </div>
                            </div>
                        </div>`).join('')}
                </div>
            </div>`;
    }

    async function addKB() {
        Phone.showModal({
            title: '新建知识书',
            content: `
                <div class="form-group"><label class="form-label">名称</label><input class="form-input" id="kb-n" placeholder="名称"></div>
                <div class="form-group" style="margin-bottom:0"><label class="form-label">内容</label><textarea class="form-textarea" id="kb-c" rows="6" placeholder="知识内容..."></textarea></div>`,
            actions: [
                { label: '取消', type: 'secondary' },
                { label: '创建', type: 'primary', onClick: async () => {
                    await Store.put(Store.STORES.knowledgeBooks, {
                        id: 'kb_' + Date.now(), name: document.getElementById('kb-n')?.value || '未命名',
                        scope: 'global', entries: [{ content: document.getElementById('kb-c')?.value || '', enabled: true }], createdAt: Date.now()
                    });
                    nav('knowledge');
                }}
            ]
        });
    }

    async function importKB() {
        const input = document.createElement('input');
        input.type = 'file'; input.accept = '.json';
        input.onchange = async (e) => {
            const file = e.target.files[0]; if (!file) return;
            try {
                const data = JSON.parse(await file.text());
                await Store.put(Store.STORES.knowledgeBooks, {
                    id: 'kb_' + Date.now(), name: data.name || file.name.replace('.json', ''),
                    scope: 'global',
                    entries: Array.isArray(data.entries) ? data.entries :
                        Array.isArray(data) ? data.map(d => ({ content: typeof d === 'string' ? d : JSON.stringify(d), enabled: true })) :
                        [{ content: JSON.stringify(data), enabled: true }],
                    createdAt: Date.now()
                });
                nav('knowledge');
            } catch (err) {
                Phone.showModal({ title: '导入失败', content: `<div style="color:var(--danger)">${err.message}</div>`, actions: [{ label: '确定', type: 'primary' }] });
            }
        };
        input.click();
    }

    async function editKB(id) {
        const book = await Store.get(Store.STORES.knowledgeBooks, id);
        if (!book) return;
        Phone.showModal({
            title: '编辑知识书',
            content: `
                <div class="form-group"><label class="form-label">名称</label><input class="form-input" id="kb-en" value="${escapeHtml(book.name)}"></div>
                <div class="form-group" style="margin-bottom:0"><label class="form-label">内容</label><textarea class="form-textarea" id="kb-ec" rows="8">${escapeHtml(book.entries?.map(e => e.content).join('\n---\n') || '')}</textarea></div>`,
            actions: [
                { label: '删除', type: 'secondary', onClick: async () => { await Store.del(Store.STORES.knowledgeBooks, id); nav('knowledge'); } },
                { label: '保存', type: 'primary', onClick: async () => {
                    book.name = document.getElementById('kb-en')?.value || book.name;
                    const c = document.getElementById('kb-ec')?.value || '';
                    book.entries = c.split('\n---\n').map(s => ({ content: s.trim(), enabled: true })).filter(e => e.content);
                    await Store.put(Store.STORES.knowledgeBooks, book);
                    nav('knowledge');
                }}
            ]
        });
    }

    // ---- Logs ----
    async function renderLogs() {
        const logs = (await Logger.getAll()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        return `
            <div class="app-header">
                <button class="app-header-btn app-back-btn" onclick="SettingsApp.nav('main')">设置</button>
                <span class="app-header-title">日志</span>
                <button class="app-header-btn" style="color:var(--danger)" onclick="SettingsApp.clearLogs()">清除</button>
            </div>
            <div class="app-body">
                ${logs.length === 0 ? `
                    <div style="text-align:center;padding:60px 20px;color:var(--text-tertiary)">
                        <div style="font-size:40px;margin-bottom:12px;opacity:0.3">📋</div>
                        <div>暂无日志</div>
                    </div>` : `
                    <div style="padding:8px 16px">
                        <button class="modal-btn modal-btn-secondary" style="width:100%;border:1px solid var(--glass-border);font-size:13px" onclick="SettingsApp.copyLogs()">📋 复制全部</button>
                    </div>
                    ${logs.map(l => `
                        <div class="log-entry">
                            <div class="log-entry-time">${l.time || new Date(l.timestamp).toISOString()}</div>
                            <span class="log-entry-level ${l.level}">${l.level}</span>
                            <span class="log-entry-message">${escapeHtml(l.message)}</span>
                            ${l.detail ? `<div class="log-entry-detail">${escapeHtml(l.detail)}</div>` : ''}
                        </div>`).join('')}`}
            </div>`;
    }

    async function clearLogs() { await Logger.clearAll(); nav('logs'); }

    async function copyLogs() {
        const logs = await Logger.getAll();
        const text = logs.map(l => `[${l.time}] [${l.level}] ${l.message}${l.detail ? '\n  ' + l.detail : ''}`).join('\n');
        try { await navigator.clipboard.writeText(text); } catch {
            const ta = document.createElement('textarea'); ta.value = text;
            document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
        }
    }

    // ---- Data ----
    async function renderData() {
        return `
            <div class="app-header">
                <button class="app-header-btn app-back-btn" onclick="SettingsApp.nav('main')">设置</button>
                <span class="app-header-title">数据管理</span>
                <span style="width:60px"></span>
            </div>
            <div class="app-body">
                <div class="settings-list">
                    <div class="settings-section">
                        <div class="settings-section-title">导出 / 导入</div>
                        <div class="settings-group glass">
                            <div class="settings-item" onclick="SettingsApp.exportAll()">
                                <div class="settings-item-left">
                                    <div class="settings-item-icon" style="background:var(--glass-bg-heavy)">📤</div>
                                    <span class="settings-item-label">导出全部数据</span>
                                </div>
                                <span style="color:var(--text-tertiary)">›</span>
                            </div>
                            <div class="settings-item" onclick="SettingsApp.importAll()">
                                <div class="settings-item-left">
                                    <div class="settings-item-icon" style="background:var(--glass-bg-heavy)">📥</div>
                                    <span class="settings-item-label">导入数据</span>
                                </div>
                                <span style="color:var(--text-tertiary)">›</span>
                            </div>
                        </div>
                    </div>
                    <div class="settings-section">
                        <div class="settings-section-title">危险操作</div>
                        <div class="settings-group glass">
                            <div class="settings-item" onclick="SettingsApp.clearAll()">
                                <div class="settings-item-left">
                                    <div class="settings-item-icon" style="background:rgba(255,69,58,0.15)">🗑️</div>
                                    <span class="settings-item-label" style="color:var(--danger)">清除全部数据</span>
                                </div>
                                <span style="color:var(--text-tertiary)">›</span>
                            </div></div>
                    </div>
                </div>
            </div>`;
    }

    async function exportAll() {
        try {
            const data = {};
            for (const [k, v] of Object.entries(Store.STORES)) data[k] = await Store.getAll(v);
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `iphoneex_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(a.href);
        } catch (e) { Logger.error('Export failed', e.message); }
    }

    async function importAll() {
        const input = document.createElement('input');
        input.type = 'file'; input.accept = '.json';
        input.onchange = async (e) => {
            const file = e.target.files[0]; if (!file) return;
            Phone.showModal({
                title: '确认导入',
                content: '<div style="text-align:center;color:var(--text-secondary)">将覆盖现有数据</div>',
                actions: [
                    { label: '取消', type: 'secondary' },
                    { label: '导入', type: 'primary', onClick: async () => {
                        try {
                            const data = JSON.parse(await file.text());
                            for (const [k, v] of Object.entries(Store.STORES)) {
                                if (data[k] && Array.isArray(data[k])) {
                                    await Store.clear(v);
                                    for (const item of data[k]) await Store.put(v, item);
                                }
                            }
                            location.reload();
                        } catch (err) { Logger.error('Import failed', err.message); }
                    }}
                ]
            });
        };
        input.click();
    }

    async function clearAll() {
        Phone.showModal({
            title: '⚠️ 清除全部数据',
            content: '<div style="text-align:center;color:var(--danger);font-size:14px">此操作不可撤销</div>',
            actions: [
                { label: '取消', type: 'secondary' },
                { label: '确认清除', type: 'primary', onClick: async () => {
                    for (const v of Object.values(Store.STORES)) await Store.clear(v);
                    location.reload();
                }}
            ]
        });
    }

    // ---- Toggles ----
    async function toggleTheme(dark) {
        const t = dark ? 'dark' : 'light';
        await Store.setSetting('theme', t);
        document.documentElement.setAttribute('data-theme', t);
    }

    async function toggleStatusBar(show) {
        await Store.setSetting('show_statusbar', show);
        const sb = document.getElementById('status-bar');
        if (show) sb.classList.remove('hidden-bar'); else sb.classList.add('hidden-bar');
    }

    async function toggleBg(on) { Scheduler.setEnabled(on); }

    return {
        render, init: () => {}, nav, saveProfile, changeAvatar,
        saveAPI, refreshModels, testAPI,
        applyWP, resetWP,
        addKB, importKB, editKB,
        clearLogs, copyLogs,
        exportAll, importAll, clearAll,
        toggleTheme, toggleStatusBar, toggleBg
    };
})();

