// apps/settings/settings.js
// ============================================
// Settings App
// ============================================

const SettingsApp = (() => {
    let currentView = 'main';

    async function render() {
        currentView = 'main';
        return await renderMain();
    }

    async function renderMain() {
        const userName = await Store.getSetting('user_name','User');
        const userDesc = await Store.getSetting('user_desc', '点击设置个人资料');
        const userAvatar = await Store.getSetting('user_avatar', '');
        const theme = await Store.getSetting('theme', 'dark');
        const showStatusBar = await Store.getSetting('show_statusbar', true);
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
                    <!-- User Profile -->
                    <div class="settings-user-card glass" onclick="SettingsApp.navigate('profile')">
                        <div class="settings-avatar">
                            ${userAvatar ? `<img src="${userAvatar}" alt="">` : '👤'}
                        </div>
                        <div class="settings-user-info">
                            <div class="settings-user-name">${userName}</div>
                            <div class="settings-user-desc">${userDesc}</div>
                        </div><span style="color:var(--text-tertiary);font-size:20px">›</span>
                    </div>

                    <!-- API Config -->
                    <div class="settings-section">
                        <div class="settings-section-title">API 配置</div>
                        <div class="settings-group glass">
                            <div class="settings-item" onclick="SettingsApp.navigate('api')">
                                <div class="settings-item-left">
                                    <div class="settings-item-icon" style="background:#34C759">🔗</div>
                                    <span class="settings-item-label">API设置</span>
                                </div>
                                <div style="display:flex;align-items:center;gap:8px">
                                    ${apiUrl ? `<span class="api-status"><span class="api-status-dot"></span>${apiModel || '未选择模型'}</span>` : `<span class="api-status error"><span class="api-status-dot"></span>未配置</span>`}
                                <span style="color:var(--text-tertiary)">›</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Appearance -->
                    <div class="settings-section">
                        <div class="settings-section-title">外观</div>
                        <div class="settings-group glass">
                            <div class="settings-item">
                                <div class="settings-item-left">
                                    <div class="settings-item-icon" style="background:#5856D6">🌙</div>
                                    <span class="settings-item-label">深色模式</span>
                                </div>
                                <label class="toggle-switch">
                                    <input type="checkbox" ${theme === 'dark' ? 'checked' : ''} onchange="SettingsApp.toggleTheme(this.checked)">
                                    <span class="toggle-slider"></span>
                                </label>
                            </div>
                            <div class="settings-item" onclick="SettingsApp.navigate('accent')">
                                <div class="settings-item-left">
                                    <div class="settings-item-icon" style="background:#FF9500">🎨</div>
                                    <span class="settings-item-label">主题色</span>
                                </div>
                                <div style="display:flex;align-items:center;gap:8px">
                                    <div style="width:24px;height:24px;border-radius:50%;background:var(--accent)"></div>
                                    <span style="color:var(--text-tertiary)">›</span>
                                </div>
                            </div>
                            <div class="settings-item" onclick="SettingsApp.navigate('wallpaper')">
                                <div class="settings-item-left">
                                    <div class="settings-item-icon" style="background:#007AFF">🖼️</div>
                                    <span class="settings-item-label">壁纸</span>
                                </div>
                                <span style="color:var(--text-tertiary)">›</span>
                            </div><div class="settings-item">
                                <div class="settings-item-left">
                                    <div class="settings-item-icon" style="background:#FF3B30">📱</div>
                                    <span class="settings-item-label">状态栏</span>
                                </div>
                                <label class="toggle-switch">
                                    <input type="checkbox" ${showStatusBar ? 'checked' : ''} onchange="SettingsApp.toggleStatusBar(this.checked)">
                                    <span class="toggle-slider"></span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <!-- Features -->
                    <div class="settings-section">
                        <div class="settings-section-title">功能</div>
                        <div class="settings-group glass">
                            <div class="settings-item">
                                <div class="settings-item-left">
                                    <div class="settings-item-icon" style="background:#FF9500">🔔</div>
                                    <span class="settings-item-label">后台触发</span>
                                </div>
                                <label class="toggle-switch">
                                    <input type="checkbox" ${bgTrigger ? 'checked' : ''} onchange="SettingsApp.toggleBgTrigger(this.checked)">
                                    <span class="toggle-slider"></span>
                                </label>
                            </div>
                            <div class="settings-item" onclick="SettingsApp.navigate('knowledge')">
                                <div class="settings-item-left">
                                    <div class="settings-item-icon" style="background:#34C759">📖</div>
                                    <span class="settings-item-label">全局知识书</span>
                                </div>
                                <span style="color:var(--text-tertiary)">›</span>
                            </div>
                        </div>
                    </div>

                    <!-- System -->
                    <div class="settings-section">
                        <div class="settings-section-title">系统</div>
                        <div class="settings-group glass">
                            <div class="settings-item" onclick="SettingsApp.navigate('logs')">
                                <div class="settings-item-left">
                                    <div class="settings-item-icon" style="background:#8E8E93">📋</div>
                                    <span class="settings-item-label">报错日志</span>
                                </div>
                                <span style="color:var(--text-tertiary)">›</span>
                            </div>
                            <div class="settings-item" onclick="SettingsApp.navigate('data')">
                                <div class="settings-item-left">
                                    <div class="settings-item-icon" style="background:#FF3B30">💾</div>
                                    <span class="settings-item-label">数据管理</span>
                                </div>
                                <span style="color:var(--text-tertiary)">›</span>
                            </div>
                </div>
                    </div><div style="text-align:center;padding:20px;color:var(--text-tertiary);font-size:13px">
                        IPHONEEX v1.0.0<br>Made with 💜
                    </div>
                </div>
            </div>
        `;
    }

    async function navigate(view) {
        currentView = view;
        const appContent = document.getElementById('app-content');

        let html = '';
        switch (view) {
            case 'profile': html = await renderProfile(); break;
            case 'api': html = await renderAPI(); break;
            case 'accent': html = await renderAccent(); break;
            case 'wallpaper': html = await renderWallpaper(); break;
            case 'knowledge': html = await renderKnowledge(); break;
            case 'logs': html = await renderLogs(); break;
            case 'data': html = await renderData(); break;default: html = await renderMain();
        }

        appContent.innerHTML = html;

        // Post-render init
        if (view === 'api') initAPIView();
    }

    //---- Profile ----
    async function renderProfile() {
        const userName = await Store.getSetting('user_name', '');
        const userDesc = await Store.getSetting('user_desc', '');
        const userAvatar = await Store.getSetting('user_avatar', '');
        const userPersona = await Store.getSetting('user_persona', '');
        const userPrefs = await Store.getSetting('user_preferences', '');

        return `
            <div class="app-header">
                <button class="app-header-btn app-back-btn" onclick="SettingsApp.navigate('main')">设置</button>
                <span class="app-header-title">个人资料</span>
                <button class="app-header-btn" onclick="SettingsApp.saveProfile()">保存</button>
            </div>
            <div class="app-body">
                <div class="settings-list">
                    <!-- Avatar -->
                    <div style="display:flex;justify-content:center;padding:20px">
                        <div class="settings-avatar" style="width:90px;height:90px;font-size:40px;cursor:pointer" onclick="SettingsApp.changeAvatar()">
                            ${userAvatar ? `<img src="${userAvatar}" alt="">` : '👤'}
                        </div>
                    </div><div style="text-align:center;margin-bottom:20px">
                        <span style="font-size:13px;color:var(--accent);cursor:pointer" onclick="SettingsApp.changeAvatar()">更换头像</span>
                    </div>

                    <div class="settings-section">
                        <div class="settings-group glass" style="padding:16px">
                            <div class="form-group">
                                <label class="form-label">名称</label>
                                <input class="form-input" id="profile-name" value="${escapeHtml(userName)}" placeholder="你的名字">
                            </div>
                            <div class="form-group">
                                <label class="form-label">简介</label>
                                <input class="form-input" id="profile-desc" value="${escapeHtml(userDesc)}" placeholder="一句话介绍自己">
                            </div>
                            <div class="form-group">
                                <label class="form-label">身份设定(AI会看到)</label>
                                <textarea class="form-textarea" id="profile-persona" rows="4" placeholder="描述你的身份、背景、性格等...">${escapeHtml(userPersona)}</textarea>
                            </div>
                            <div class="form-group">
                                <label class="form-label">个人喜好 (AI 会参考)</label>
                                <textarea class="form-textarea" id="profile-prefs" rows="4" placeholder="你的兴趣、喜好、习惯等...">${escapeHtml(userPrefs)}</textarea>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async function saveProfile() {
        const name = document.getElementById('profile-name')?.value || 'User';
        const desc = document.getElementById('profile-desc')?.value || '';
        const persona = document.getElementById('profile-persona')?.value || '';
        const prefs = document.getElementById('profile-prefs')?.value || '';

        await Store.setSetting('user_name', name);
        await Store.setSetting('user_desc', desc);
        await Store.setSetting('user_persona', persona);
        await Store.setSetting('user_preferences', prefs);

        Logger.info('Profile saved');
        navigate('main');
    }

    async function changeAvatar() {
        Phone.showModal({
            title: '更换头像',
            content: `
                <div class="form-group">
                    <label class="form-label">图片 URL</label>
                    <input class="form-input" id="avatar-url" placeholder="https://...">
                </div>
                <div style="text-align:center;margin:12px 0;color:var(--text-secondary)">或</div>
                <div class="form-group">
                    <label class="form-label">上传文件</label>
                    <input type="file" id="avatar-file" accept="image/*" class="form-input" style="padding:8px">
                </div>
            `,
            actions: [
                { label: '取消', type: 'secondary' },
                {
                    label: '确定', type: 'primary', onClick: async () => {
                        const url = document.getElementById('avatar-url')?.value;
                        const file = document.getElementById('avatar-file')?.files[0];

                        if (url) {
                            await Store.setSetting('user_avatar', url);
                        } else if (file) {
                            const reader = new FileReader();
                            reader.onload = async (e) => {
                                await Store.setSetting('user_avatar', e.target.result);
                                navigate('profile');
                            };
                            reader.readAsDataURL(file);
                            return;
                        }navigate('profile');
                    }
                }
            ]
        });
    }

    // ---- API ----
    async function renderAPI() {
        const apiUrl = await Store.getSetting('api_base_url', '');
        const apiKey = await Store.getSetting('api_key', '');
        const apiModel = await Store.getSetting('api_model', '');

        return `
            <div class="app-header">
                <button class="app-header-btn app-back-btn" onclick="SettingsApp.navigate('main')">设置</button>
                <span class="app-header-title">API 设置</span>
                <button class="app-header-btn" onclick="SettingsApp.saveAPI()">保存</button>
            </div>
            <div class="app-body">
                <div class="settings-list"><div class="settings-section">
                        <div class="settings-group glass" style="padding:16px">
                            <div class="form-group">
                                <label class="form-label">Base URL</label>
                                <input class="form-input" id="api-url" value="${escapeHtml(apiUrl)}" placeholder="https://api.openai.com/v1">
                            </div>
                            <div class="form-group">
                                <label class="form-label">API Key</label>
                                <input class="form-input" id="api-key" type="password" value="${escapeHtml(apiKey)}" placeholder="sk-...">
                            </div>
                            <div class="form-group">
                                <label class="form-label">模型</label>
                                <div style="display:flex;gap:8px">
                                    <select class="form-select" id="api-model" style="flex:1">
                                        <option value="">点击刷新获取模型列表</option>
                                        ${apiModel ? `<option value="${apiModel}" selected>${apiModel}</option>` : ''}
                                    </select>
                                    <button class="modal-btn modal-btn-primary" style="flex:0 0 auto;padding:12px 16px" onclick="SettingsApp.refreshModels()">刷新</button>
                                </div>
                            </div>
                            <div id="api-status-msg" style="margin-top:8px"></div>
                        </div>
                    </div>

                    <div class="settings-section">
                        <div class="settings-section-title">测试</div>
                        <div class="settings-group glass" style="padding:16px">
                            <button class="modal-btn modal-btn-primary" style="width:100%" onclick="SettingsApp.testAPI()">测试连接</button>
                            <div id="api-test-result" style="margin-top:12px;font-size:13px;color:var(--text-secondary)"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function initAPIView() {
        // Load cached models into select
        const models = API.getCachedModels();
        if (models.length > 0) {
            populateModelSelect(models);
        }}

    async function refreshModels() {
        const statusEl = document.getElementById('api-status-msg');
        statusEl.innerHTML = '<span style="color:var(--accent)">正在获取模型列表...</span>';

        // Temporarily save current values
        const url = document.getElementById('api-url')?.value;
        const key = document.getElementById('api-key')?.value;
        if (url) await Store.setSetting('api_base_url', url);
        if (key) await Store.setSetting('api_key', key);

        try {
            const models = await API.fetchModels();
            populateModelSelect(models);
            statusEl.innerHTML = `<span style="color:var(--success)">✓ 获取到 ${models.length} 个模型</span>`;
        } catch (e) {
            statusEl.innerHTML = `<span style="color:var(--danger)">✗ ${e.message}</span>`;
        }
    }

    function populateModelSelect(models) {
        const select = document.getElementById('api-model');
        if (!select) return;
        const currentVal = select.value;
        select.innerHTML = '<option value="">选择模型...</option>';
        models.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.id;
            opt.textContent = m.name || m.id;
            if (m.id === currentVal) opt.selected = true;
            select.appendChild(opt);
        });
    }

    async function saveAPI() {
        const url = document.getElementById('api-url')?.value || '';
        const key = document.getElementById('api-key')?.value || '';
        const model = document.getElementById('api-model')?.value || '';

        await Store.setSetting('api_base_url', url);
        await Store.setSetting('api_key', key);
        await Store.setSetting('api_model', model);

        Logger.info('API settings saved', `URL: ${url}, Model: ${model}`);
        navigate('main');
    }

    async function testAPI() {
        const resultEl = document.getElementById('api-test-result');
        resultEl.innerHTML = '<span style="color:var(--accent)">测试中...</span>';

        // Save first
        const url = document.getElementById('api-url')?.value || '';
        const key = document.getElementById('api-key')?.value || '';
        const model = document.getElementById('api-model')?.value || '';
        await Store.setSetting('api_base_url', url);
        await Store.setSetting('api_key', key);
        await Store.setSetting('api_model', model);

        try {
            const response = await API.chat(
                [{ role: 'user', content: 'Say "Connection successful!" in exactly those words.' }],
                { stream: false, max_tokens: 20 }
            );
            resultEl.innerHTML = `<span style="color:var(--success)">✓ 连接成功: "${response}"</span>`;
        } catch (e) {
            resultEl.innerHTML = `<span style="color:var(--danger)">✗ 连接失败: ${e.message}</span>`;
        }
    }

    // ---- Accent Color ----
    async function renderAccent() {
        const current = await Store.getSetting('accent_color', '#007AFF');
        const colors = [
            '#007AFF', '#5856D6', '#AF52DE', '#FF2D55',
            '#FF3B30', '#FF9500', '#FFCC00', '#34C759',
            '#00C7BE', '#30B0C7', '#5AC8FA', '#64D2FF'
        ];

        return `
            <div class="app-header">
                <button class="app-header-btn app-back-btn" onclick="SettingsApp.navigate('main')">设置</button>
                <span class="app-header-title">主题色</span>
                <span style="width:60px"></span>
            </div>
            <div class="app-body">
                <div class="settings-list">
                    <div class="settings-section">
                        <div class="settings-section-title">选择颜色</div>
                        <div class="settings-group glass" style="padding:20px">
                            <div class="color-options">
                                ${colors.map(c => `
                                    <div class="color-option ${c === current ? 'active' : ''}"
                                         style="background:${c}"
                                         onclick="SettingsApp.setAccent('${c}')"></div>
                                `).join('')}
                            </div><div class="form-group" style="margin-top:16px;margin-bottom:0">
                                <label class="form-label">自定义颜色</label>
                                <input type="color" class="form-input" value="${current}"
                                       style="height:44px;padding:4px;cursor:pointer"
                                       onchange="SettingsApp.setAccent(this.value)">
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async function setAccent(color) {
        await Store.setSetting('accent_color', color);
        document.documentElement.style.setProperty('--accent', color);
        const rgb = hexToRgb(color);
        if (rgb) document.documentElement.style.setProperty('--accent-rgb', `${rgb.r},${rgb.g},${rgb.b}`);
        navigate('accent');
    }

    // ---- Wallpaper ----
    async function renderWallpaper() {
        return `
            <div class="app-header">
                <button class="app-header-btn app-back-btn" onclick="SettingsApp.navigate('main')">设置</button>
                <span class="app-header-title">壁纸</span>
                <span style="width:60px"></span>
            </div>
            <div class="app-body">
                <div class="settings-list">
                    <div class="settings-section">
                        <div class="settings-group glass" style="padding:16px">
                            <div class="form-group">
                                <label class="form-label">壁纸 URL</label>
                                <input class="form-input" id="wallpaper-url-input" placeholder="https://...">
                            </div>
                            <div class="form-group">
                                <label class="form-label">上传文件</label>
                                <input type="file" id="wallpaper-file-input" accept="image/*" class="form-input" style="padding:8px">
                            </div>
                            <div style="display:flex;gap:10px">
                                <button class="modal-btn modal-btn-primary" style="flex:1" onclick="SettingsApp.applyWallpaper()">应用</button>
                                <button class="modal-btn modal-btn-secondary" style="flex:1" onclick="SettingsApp.resetWallpaper()">恢复默认</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async function applyWallpaper() {
        const url = document.getElementById('wallpaper-url-input')?.value;
        const file = document.getElementById('wallpaper-file-input')?.files[0];

        const apply = async (src) => {
            await Store.setSetting('wallpaper_url', src);
            const img = document.getElementById('wallpaper-custom');
            img.src = src;
            img.classList.remove('hidden');
            document.getElementById('wallpaper-default').classList.add('hidden');
            Logger.info('Wallpaper applied');
        };

        if (url) {
            await apply(url);
        } else if (file) {
            const reader = new FileReader();
            reader.onload = (e) => apply(e.target.result);
            reader.readAsDataURL(file);
        }
    }

    async function resetWallpaper() {
        await Store.setSetting('wallpaper_url', '');
        document.getElementById('wallpaper-custom').classList.add('hidden');
        document.getElementById('wallpaper-default').classList.remove('hidden');
        Logger.info('Wallpaper reset to default');
    }

    // ---- Knowledge Books ----
    async function renderKnowledge() {
        const books = await Store.getAll(Store.STORES.knowledgeBooks);
        const globalBooks = books.filter(b => b.scope === 'global');

        return `
            <div class="app-header">
                <button class="app-header-btn app-back-btn" onclick="SettingsApp.navigate('main')">设置</button>
                <span class="app-header-title">全局知识书</span>
                <button class="app-header-btn" onclick="SettingsApp.addKnowledgeBook()">+新建</button>
            </div>
            <div class="app-body">
                <div class="settings-list">
                    <div class="settings-section">
                        <div class="settings-group glass" style="padding:16px">
                            <button class="modal-btn modal-btn-secondary" style="width:100%;margin-bottom:12px" onclick="SettingsApp.importKnowledgeBook()">📥 导入 JSON</button>
                        </div>
                    </div>

                    ${globalBooks.length === 0 ? `
                        <div style="text-align:center;padding:40px;color:var(--text-tertiary)">
                            <div style="font-size:48px;margin-bottom:12px">📖</div>
                            <div>暂无全局知识书</div>
                        </div>
                    ` : globalBooks.map(book => `
                        <div class="settings-section">
                            <div class="settings-group glass">
                                <div class="settings-item" onclick="SettingsApp.editKnowledgeBook('${book.id}')">
                                    <div class="settings-item-left">
                                        <span class="settings-item-label">${escapeHtml(book.name)}</span>
                                    </div>
                                    <div style="display:flex;align-items:center;gap:8px">
                                        <span style="font-size:13px;color:var(--text-tertiary)">${book.entries?.length || 0} 条</span>
                                        <span style="color:var(--text-tertiary)">›</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    async function addKnowledgeBook() {
        Phone.showModal({
            title: '新建知识书',
            content: `
                <div class="form-group">
                    <label class="form-label">名称</label>
                    <input class="form-input" id="kb-name" placeholder="知识书名称">
                </div>
                <div class="form-group">
                    <label class="form-label">内容</label>
                    <textarea class="form-textarea" id="kb-content" rows="6" placeholder="输入知识内容..."></textarea>
                </div>`,
            actions: [
                { label: '取消', type: 'secondary' },
                {
                    label: '创建', type: 'primary', onClick: async () => {
                        const name = document.getElementById('kb-name')?.value || '未命名';
                        const content = document.getElementById('kb-content')?.value || '';
                        await Store.put(Store.STORES.knowledgeBooks, {
                            id: 'kb_' + Date.now(),
                            name,
                            scope: 'global',
                            entries: [{ content, enabled: true }],
                            createdAt: Date.now()
                        });
                        navigate('knowledge');
                    }
                }
            ]
        });
    }

    async function importKnowledgeBook() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            try {
                const text = await file.text();
                const data = JSON.parse(text);
                const book = {
                    id: 'kb_' + Date.now(),
                    name: data.name || file.name.replace('.json', ''),
                    scope: 'global',
                    entries: Array.isArray(data.entries) ? data.entries :
                        Array.isArray(data) ? data.map(d => ({ content: typeof d === 'string' ? d : JSON.stringify(d), enabled: true })) :[{ content: JSON.stringify(data), enabled: true }],
                    createdAt: Date.now()
                };
                await Store.put(Store.STORES.knowledgeBooks, book);
                Logger.info('Knowledge book imported', book.name);
                navigate('knowledge');
            } catch (err) {
                Logger.error('Knowledge book import failed', err.message);
                Phone.showModal({
                    title: '导入失败',
                    content: `<div style="color:var(--danger)">${err.message}</div>`,
                    actions: [{ label: '确定', type: 'primary' }]
                });
            }
        };
        input.click();
    }

    async function editKnowledgeBook(id) {
        const book = await Store.get(Store.STORES.knowledgeBooks, id);
        if (!book) return;

        Phone.showModal({
            title: '编辑知识书',
            content: `
                <div class="form-group">
                    <label class="form-label">名称</label>
                    <input class="form-input" id="kb-edit-name" value="${escapeHtml(book.name)}">
                </div>
                <div class="form-group">
                    <label class="form-label">内容</label>
                    <textarea class="form-textarea" id="kb-edit-content" rows="8">${escapeHtml(book.entries?.map(e => e.content).join('\n---\n') || '')}</textarea>
                </div>
            `,
            actions: [
                { label: '删除', type: 'secondary', onClick: async () => { await Store.del(Store.STORES.knowledgeBooks, id); navigate('knowledge'); } },
                {
                    label: '保存', type: 'primary', onClick: async () => {
                        book.name = document.getElementById('kb-edit-name')?.value || book.name;
                        const content = document.getElementById('kb-edit-content')?.value || '';
                        book.entries = content.split('\n---\n').map(c => ({ content: c.trim(), enabled: true })).filter(e => e.content);
                        await Store.put(Store.STORES.knowledgeBooks, book);
                        navigate('knowledge');
                    }
                }
            ]
        });
    }

    // ---- Logs ----
    async function renderLogs() {
        const logs = await Logger.getAll();
        const sortedLogs = logs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        return `
            <div class="app-header">
                <button class="app-header-btn app-back-btn" onclick="SettingsApp.navigate('main')">设置</button>
                <span class="app-header-title">报错日志</span>
                <button class="app-header-btn" style="color:var(--danger)" onclick="SettingsApp.clearLogs()">清除</button>
            </div>
            <div class="app-body">
                ${sortedLogs.length === 0 ? `
                    <div style="text-align:center;padding:60px 20px;color:var(--text-tertiary)">
                        <div style="font-size:48px;margin-bottom:12px">📋</div>
                        <div>暂无日志</div>
                    </div>
                ` : `
                    <div style="padding:8px"><button class="modal-btn modal-btn-secondary" style="width:100%;margin-bottom:8px" onclick="SettingsApp.copyLogs()">📋 复制全部日志</button>
                    </div>
                    ${sortedLogs.map(log => `
                        <div class="log-entry">
                            <div class="log-entry-time">${log.time || new Date(log.timestamp).toISOString()}</div>
                            <span class="log-entry-level ${log.level}">${log.level}</span>
                            <span class="log-entry-message">${escapeHtml(log.message)}</span>
                            ${log.detail ? `<div class="log-entry-detail">${escapeHtml(log.detail)}</div>` : ''}
                        </div>
                    `).join('')}
                `}
            </div>
        `;
    }

    async function clearLogs() {
        await Logger.clearAll();
        navigate('logs');
    }

    async function copyLogs() {
        const logs = await Logger.getAll();
        const text = logs.map(l => `[${l.time}] [${l.level}] ${l.message}${l.detail ? '\n  ' + l.detail : ''}`).join('\n');
        try {
            await navigator.clipboard.writeText(text);
            Phone.showModal({
                title: '已复制',
                content: '<div style="text-align:center">日志已复制到剪贴板</div>',
                actions: [{ label: '确定', type: 'primary' }]
            });
        } catch {
            // Fallback
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
        }
    }

    // ---- Data Management ----
    async function renderData() {
        return `
            <div class="app-header">
                <button class="app-header-btn app-back-btn" onclick="SettingsApp.navigate('main')">设置</button>
                <span class="app-header-title">数据管理</span>
                <span style="width:60px"></span>
            </div>
            <div class="app-body">
                <div class="settings-list">
                    <div class="settings-section">
                        <div class="settings-section-title">导出</div>
                        <div class="settings-group glass">
                            <div class="settings-item" onclick="SettingsApp.exportAllData()">
                                <div class="settings-item-left">
                                    <div class="settings-item-icon" style="background:#34C759">📤</div>
                                    <span class="settings-item-label">导出全部数据</span>
                                </div>
                                <span style="color:var(--text-tertiary)">›</span>
                            </div></div>
                    </div>

                    <div class="settings-section">
                        <div class="settings-section-title">导入</div>
                        <div class="settings-group glass">
                            <div class="settings-item" onclick="SettingsApp.importAllData()">
                                <div class="settings-item-left">
                                    <div class="settings-item-icon" style="background:#007AFF">📥</div>
                                    <span class="settings-item-label">导入数据</span>
                                </div>
                                <span style="color:var(--text-tertiary)">›</span>
                            </div>
                        </div>
                    </div>

                    <div class="settings-section">
                        <div class="settings-section-title">危险操作</div>
                        <div class="settings-group glass">
                            <div class="settings-item" onclick="SettingsApp.clearAllData()">
                                <div class="settings-item-left">
                                    <div class="settings-item-icon" style="background:#FF3B30">🗑️</div>
                                    <span class="settings-item-label" style="color:var(--danger)">清除全部数据</span>
                                </div>
                                <span style="color:var(--text-tertiary)">›</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async function exportAllData() {
        try {
            const data = {};
            for (const [name, storeName] of Object.entries(Store.STORES)) {
                data[name] = await Store.getAll(storeName);
            }
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `iphoneex_backup_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            Logger.info('Data exported');
        } catch (e) {
            Logger.error('Export failed', e.message);}
    }

    async function importAllData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            Phone.showModal({
                title: '确认导入',
                content: '<div style="text-align:center">导入将覆盖现有数据，确定继续？</div>',
                actions: [
                    { label: '取消', type: 'secondary' },
                    {
                        label: '导入', type: 'primary', onClick: async () => {
                            try {
                                const text = await file.text();
                                const data = JSON.parse(text);
                                for (const [name, storeName] of Object.entries(Store.STORES)) {
                                    if (data[name] && Array.isArray(data[name])) {
                                        await Store.clear(storeName);
                                        for (const item of data[name]) {
                                            await Store.put(storeName, item);
                                        }
                                    }
                                }
                                Logger.info('Data imported');
                                location.reload();
                            } catch (err) {
                                Logger.error('Import failed', err.message);}
                        }
                    }
                ]
            });
        };
        input.click();
    }

    async function clearAllData() {
        Phone.showModal({
            title: '⚠️ 清除全部数据',
            content: '<div style="text-align:center;color:var(--danger)">此操作不可撤销！所有聊天记录、角色卡、设置都将被删除。</div>',
            actions: [
                { label: '取消', type: 'secondary' },
                {
                    label: '确认清除', type: 'primary', onClick: async () => {
                        for (const storeName of Object.values(Store.STORES)) {
                            await Store.clear(storeName);
                        }
                        Logger.info('All data cleared');
                        location.reload();
                    }
                }
            ]
        });
    }

    // ---- Toggle helpers ----
    async function toggleTheme(isDark) {
        const theme = isDark ? 'dark' : 'light';
        await Store.setSetting('theme', theme);
        document.documentElement.setAttribute('data-theme', theme);
    }

    async function toggleStatusBar(show) {
        await Store.setSetting('show_statusbar', show);
        const statusBar = document.getElementById('status-bar');
        if (show) statusBar.classList.remove('hidden-bar');
        else statusBar.classList.add('hidden-bar');
    }

    async function toggleBgTrigger(enabled) {
        Scheduler.setEnabled(enabled);
    }

    // ---- Utilities ----
    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    return {
        render,
        init: () => { },
        navigate,
        saveProfile,
        changeAvatar,
        saveAPI,
        refreshModels,
        testAPI,
        setAccent,
        applyWallpaper,
        resetWallpaper,
        addKnowledgeBook,
        importKnowledgeBook,
        editKnowledgeBook,
        clearLogs,
        copyLogs,
        exportAllData,
        importAllData,
        clearAllData,
        toggleTheme,
        toggleStatusBar,
        toggleBgTrigger
    };
})();
