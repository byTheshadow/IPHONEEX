// apps/chat/chat.js
const ChatApp = (() => {
    /*======== 工具 ======== */
    function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
    function escapeHtml(s) { if (!s) return ''; const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
    function fmtTime(ts) { return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }); }
    function fmtDate(ts) {
        const d = new Date(ts), now = new Date();
        if (d.toDateString() === now.toDateString()) return '今天';
        if (d.toDateString() === new Date(now.getTime() - 86400000).toDateString()) return '昨天';
        return `${d.getMonth() + 1}/${d.getDate()}`;
    }

    /* ======== 状态 ======== */
    let currentChatId = null;
    let replyTo = null;
    let abortCtrl = null;
    let stickerPanelOpen = false;

    /* ======== 主入口 ======== */
    async function render(params) {
        if (params && params.chatId) return await renderChatView(params.chatId);
        return await renderList();
    }

    async function init(params) {
        if (params && params.chatId) await initChatView(params.chatId);
        else await initList();
    }

    /* ============================================会话列表
       ============================================ */
    async function renderList() {
        return `<div class="chat-list-container">
            <div class="app-header">
                <button class="app-header-btn app-back-btn" onclick="Router.closeAll()">返回</button>
                <span class="app-header-title">聊天</span>
                <span style="width:60px"></span>
            </div>
            <div class="chat-search-bar">
                <input class="chat-search-input" placeholder="搜索会话..." id="chat-search"></div>
            <div class="chat-contact-list" id="chat-list-body"><div style="display:flex;justify-content:center;padding:40px"><div class="chat-spinner"></div></div>
            </div>
            <button class="chat-fab" id="chat-fab" title="新建">＋</button>
        </div>`;
    }

    async function initList() {
        const searchInput = document.getElementById('chat-search');
        let searchTimer;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => refreshListBody(searchInput.value), 200);
        });
        document.getElementById('chat-fab').addEventListener('click', () => showFabMenu());
        await refreshListBody();
    }

    async function refreshListBody(search = '') {
        const body = document.getElementById('chat-list-body');
        if (!body) return;
        body.innerHTML = '<div style="display:flex;justify-content:center;padding:40px"><div class="chat-spinner"></div></div>';
        try {
            await renderChatsList(body, search);
        } catch (e) {
            body.innerHTML = `<div class="chat-empty-state"><div class="chat-empty-icon">⚠️</div><div class="chat-empty-text">加载失败: ${escapeHtml(e.message)}</div></div>`;
        }
    }

    async function renderChatsList(container, search) {
        const chats = await Store.getAll(Store.STORES.chats);
        const chars = await Store.getAll(Store.STORES.characters);
        const charMap = {};
        chars.forEach(c => { charMap[c.id] = c; });

        let filtered = chats.sort((a, b) => (b.updatedAt ||0) - (a.updatedAt || 0));
        if (search) {
            const q = search.toLowerCase();
            filtered = filtered.filter(c => c.name?.toLowerCase().includes(q));
        }

        if (filtered.length === 0) {
            container.innerHTML = `<div class="chat-empty-state"><div class="chat-empty-icon">💬</div><div class="chat-empty-text">暂无会话，点击 ＋ 新建聊天</div></div>`;
            return;
        }

        container.innerHTML = filtered.map(chat => {
            const firstChar = chat.characterIds?.[0] ? charMap[chat.characterIds[0]] : null;
            const avatar = firstChar?.avatar
                ? `<img src="${escapeHtml(firstChar.avatar)}" alt="">`
                : (firstChar?.name?.[0] || chat.name?.[0] || '💬');
            const typeLabel = chat.type === 'group' ? '👥 ' : chat.type === 'model' ? '🤖 ' : '';
            return `
            <div class="chat-contact-item" data-chat-id="${chat.id}">
                <div class="chat-contact-avatar">${avatar}</div>
                <div class="chat-contact-info">
                    <div class="chat-contact-name">${typeLabel}${escapeHtml(chat.name)}</div>
                    <div class="chat-contact-preview">${escapeHtml(chat.lastMessage || '暂无消息')}</div>
                </div>
                <div class="chat-contact-meta">
                    <span class="chat-contact-time">${chat.updatedAt ? fmtDate(chat.updatedAt) : ''}</span>
                </div>
            </div>`;
        }).join('');

        container.querySelectorAll('.chat-contact-item').forEach(el => {
            el.addEventListener('click', () => Router.open('chat', { chatId: el.dataset.chatId }));
            let pressTimer;
            el.addEventListener('contextmenu', e => { e.preventDefault(); showChatContextMenu(e, el.dataset.chatId); });
            el.addEventListener('pointerdown', e => { pressTimer = setTimeout(() => showChatContextMenu(e, el.dataset.chatId), 500); });
            el.addEventListener('pointerup', () => clearTimeout(pressTimer));
            el.addEventListener('pointermove', () => clearTimeout(pressTimer));
        });
    }

    function showChatContextMenu(e, chatId) {
        const phoneRect = document.getElementById('phone-container').getBoundingClientRect();
        Phone.showContextMenu(
            (e.clientX || e.pageX) - phoneRect.left,
            (e.clientY || e.pageY) - phoneRect.top,
            [
                { label: '打开', icon: '↗', onClick: () => Router.open('chat', { chatId }) },
                { type: 'separator' },
                { label: '删除会话及角色', icon: '🗑', danger: true, onClick: () => confirmDeleteChat(chatId, true) },
                { label: '仅删除会话', icon: '✕', danger: true, onClick: () => confirmDeleteChat(chatId, false) }
            ]
        );
    }

    async function confirmDeleteChat(chatId, deleteChars) {
        const chat = await Store.get(Store.STORES.chats, chatId);
        const msg = deleteChars
            ? '确定删除此会话、所有消息以及关联的角色卡？此操作不可恢复。'
            : '确定删除此会话及所有消息？角色卡将保留。';
        Phone.showModal({
            title: '删除会话',
            content: `<div style="font-size:14px;color:var(--text-secondary);text-align:center">${msg}</div>`,
            actions: [
                { label: '取消', type: 'secondary' },
                { label: '删除', type: 'primary', onClick: async () => {
                    showToast('正在删除...');
                    try {
                        const msgs = await Store.getAllByIndex(Store.STORES.messages, 'chatId', chatId);
                        for (const m of msgs) await Store.del(Store.STORES.messages, m.id);
                        const sums = await Store.getAllByIndex(Store.STORES.summaries, 'chatId', chatId);
                        for (const s of sums) await Store.del(Store.STORES.summaries, s.id);
                        if (deleteChars && chat) {
                            for (const cid of (chat.characterIds || [])) {
                                // Check if char is used in other chats
                                const allChats = await Store.getAll(Store.STORES.chats);
                                const usedElsewhere = allChats.some(c => c.id !== chatId && c.characterIds?.includes(cid));
                                if (!usedElsewhere) {
                                    await Store.del(Store.STORES.characters, cid);
                                    // Also delete diary
                                    const diaries = await Store.getAllByIndex(Store.STORES.diaries, 'charId', cid);
                                    for (const d of diaries) await Store.del(Store.STORES.diaries, d.id);
                                }
                            }
                        }
                        await Store.del(Store.STORES.chats, chatId);
                        showToast('已删除');
                        await refreshListBody();
                    } catch (e) { showToast('删除失败: ' + e.message); }
                }}
            ]
        });
    }

    /* ---- FAB 菜单 ---- */
    function showFabMenu() {
        const fab = document.getElementById('chat-fab');
        const rect = fab.getBoundingClientRect();
        const phoneRect = document.getElementById('phone-container').getBoundingClientRect();
        Phone.showContextMenu(rect.left - phoneRect.left, rect.top - phoneRect.top - 10, [
            { label: '新建聊天', icon: '💬', onClick: () => createNewChat('single') },
            { label: '新建群聊', icon: '👥', onClick: () => createNewChat('group') },
            { label: '模型本体对话', icon: '🤖', onClick: () => createModelChat() },
            { type: 'separator' },
            { label: '管理表情包', icon: '🎨', onClick: () => openStickerManager() },
            { label: '管理知识书', icon: '📖', onClick: () => openKnowledgeManager() },
            { label: '提示词设置', icon: '⚙', onClick: () => openPromptSettings() },
        ]);
    }

    /* ============================================
       创建会话
       ============================================ */
    function createNewChat(type) {
        if (type === 'single') {
            openCharCreatorForChat();
        } else if (type === 'group') {
            openGroupCreator();
        }
    }

    function openCharCreatorForChat() {
        Phone.showModal({
            title: '新建聊天',
            content: `<div class="char-form">
                <div class="char-avatar-picker">
                    <div class="char-avatar-preview" id="char-avatar-preview">👤</div>
                    <div style="flex:1">
                        <div class="form-group" style="margin-bottom:0">
                            <label class="form-label">头像 URL</label>
                            <input class="form-input" id="char-avatar" placeholder="https://...">
                        </div></div>
                </div>
                <div class="form-group">
                    <label class="form-label">角色名称</label>
                    <input class="form-input" id="char-name" placeholder="角色名称">
                </div>
                <div class="form-group">
                    <label class="form-label">人设描述</label>
                    <textarea class="form-textarea" id="char-persona" rows="4" placeholder="描述角色的性格、背景、说话方式..."></textarea>
                </div>
                <div class="form-group" style="margin-bottom:0">
                    <label class="form-label">角色专属提示词（可选）</label>
                    <textarea class="form-textarea" id="char-prompt" rows="2" placeholder="额外的系统指令..."></textarea>
                </div>
            </div>`,
            actions: [
                { label: '取消', type: 'secondary' },
                { label: '创建并开始聊天', type: 'primary', onClick: async () => {
                    const name = document.getElementById('char-name').value.trim();
                    if (!name) { showToast('请输入角色名称'); return; }
                    showToast('正在创建...');
                    const char = {
                        id: 'char_' + uid(), name,
                        avatar: document.getElementById('char-avatar').value.trim(),
                        persona: document.getElementById('char-persona').value.trim(),
                        globalPrompt: document.getElementById('char-prompt').value.trim(),
                        knowledgeBooks: [], customCSS: '',
                        socialProfile: { bio: '' }, createdAt: Date.now()
                    };
                    await Store.put(Store.STORES.characters, char);
                    const chat = {
                        id: 'chat_' + uid(), type: 'single', name: char.name,
                        characterIds: [char.id], messageCount: 0, lastMessage: '',
                        updatedAt: Date.now(), createdAt: Date.now()
                    };
                    await Store.put(Store.STORES.chats, chat);
                    showToast('聊天已创建');
                    Router.open('chat', { chatId: chat.id });
                }}
            ]
        });

        // Live avatar preview
        setTimeout(() => {
            const avatarInput = document.getElementById('char-avatar');
            const preview = document.getElementById('char-avatar-preview');
            if (avatarInput && preview) {
                avatarInput.addEventListener('input', () => {
                    const url = avatarInput.value.trim();
                    if (url) {
                        preview.innerHTML = `<img src="${escapeHtml(url)}" alt="" style="width:100%;height:100%;object-fit:cover" onerror="this.parentElement.textContent='👤'">`;
                    } else {
                        preview.textContent = '👤';
                    }
                });
            }
        }, 100);
    }

    async function openGroupCreator() {
        const chars = await Store.getAll(Store.STORES.characters);
        if (chars.length < 2) {
            showToast('请先至少创建2个角色（通过新建聊天）');
            return;
        }
        const charChecks = chars.map(c => `
            <label style="display:flex;align-items:center;gap:10px;padding:10px 0;font-size:14px;color:var(--text-primary);cursor:pointer;border-bottom:1px solid var(--glass-border-light)">
                <input type="checkbox" value="${c.id}">
                <div style="width:32px;height:32px;border-radius:50%;background:var(--glass-bg-heavy);display:flex;align-items:center;justify-content:center;font-size:14px;overflow:hidden;flex-shrink:0;border:1px solid var(--glass-border-light)">${c.avatar ? `<img src="${escapeHtml(c.avatar)}" style="width:100%;height:100%;object-fit:cover">` : (c.name?.[0] || '👤')}</div>
                <span>${escapeHtml(c.name)}</span>
            </label>`).join('');

        Phone.showModal({
            title: '新建群聊',
            content: `
                <div class="form-group">
                    <label class="form-label">群名称</label>
                    <input class="form-input" id="group-name" placeholder="群聊名称">
                </div>
                <div class="form-group" style="margin-bottom:0">
                    <label class="form-label">选择成员（至少2个）</label>
                    <div id="group-members" style="max-height:200px;overflow-y:auto">${charChecks}</div>
                </div>`,
            actions: [
                { label: '取消', type: 'secondary' },
                { label: '创建', type: 'primary', onClick: async () => {
                    const name = document.getElementById('group-name').value.trim();
                    const selected = [];
                    document.querySelectorAll('#group-members input:checked').forEach(cb => selected.push(cb.value));
                    if (selected.length < 2) { showToast('请至少选择2个角色'); return; }
                    const chat = {
                        id: 'chat_' + uid(), type: 'group', name: name || '群聊',
                        characterIds: selected, messageCount: 0, lastMessage: '',
                        updatedAt: Date.now(), createdAt: Date.now()
                    };
                    await Store.put(Store.STORES.chats, chat);
                    showToast('群聊已创建');
                    Router.open('chat', { chatId: chat.id });
                }}
            ]
        });
    }

    async function createModelChat() {
        const chat = {
            id: 'chat_' + uid(), type: 'model', name: '模型本体',
            characterIds: [], messageCount: 0, lastMessage: '',
            updatedAt: Date.now(), createdAt: Date.now()
        };
        await Store.put(Store.STORES.chats, chat);
        Router.open('chat', { chatId: chat.id });
    }

    /* ============================================
       表情包管理
       ============================================ */
    async function openStickerManager() {
        const stickers = await Store.getSetting('sticker_packs', []);
        const appContent = document.getElementById('app-content');
        let html = `<div class="chat-panel-page">
            <div class="app-header">
                <button class="app-header-btn app-back-btn" onclick="ChatApp.backToList()">返回</button>
                <span class="app-header-title">表情包管理</span>
                <button class="app-header-btn" onclick="ChatApp.addSticker()">＋</button>
            </div>
            <div class="chat-panel-body" id="sticker-manage-body">`;

        if (stickers.length === 0) {
            html += `<div class="chat-empty-state"><div class="chat-empty-icon">🎨</div><div class="chat-empty-text">暂无表情包，点击 ＋ 添加</div></div>`;
        } else {
            html += '<div class="sticker-manage-grid">';
            stickers.forEach((s, i) => {
                html += `<div class="sticker-manage-item" data-sticker-idx="${i}">
                    <img src="${escapeHtml(s.url)}" alt="${escapeHtml(s.desc)}" onerror="this.style.display='none'">
                    <div class="sticker-manage-desc">${escapeHtml(s.desc)}</div>
                </div>`;
            });
            html += '</div>';
        }
        html += '</div></div>';
        appContent.innerHTML = html;

        document.querySelectorAll('.sticker-manage-item').forEach(el => {
            let pressTimer;
            el.addEventListener('contextmenu', e => { e.preventDefault(); showStickerContextMenu(e, parseInt(el.dataset.stickerIdx)); });
            el.addEventListener('pointerdown', e => { pressTimer = setTimeout(() => showStickerContextMenu(e, parseInt(el.dataset.stickerIdx)), 500); });
            el.addEventListener('pointerup', () => clearTimeout(pressTimer));
            el.addEventListener('pointermove', () => clearTimeout(pressTimer));
            el.addEventListener('click', () => editSticker(parseInt(el.dataset.stickerIdx)));
        });
    }

    function showStickerContextMenu(e, idx) {
        const phoneRect = document.getElementById('phone-container').getBoundingClientRect();
        Phone.showContextMenu(
            (e.clientX || e.pageX) - phoneRect.left,
            (e.clientY || e.pageY) - phoneRect.top,
            [
                { label: '编辑', icon: '✎', onClick: () => editSticker(idx) },
                { label: '删除', icon: '🗑', danger: true, onClick: async () => {
                    const stickers = await Store.getSetting('sticker_packs', []);
                    stickers.splice(idx, 1);
                    await Store.setSetting('sticker_packs', stickers);
                    showToast('已删除');
                    openStickerManager();
                }}
            ]
        );
    }

    async function editSticker(idx) {
        const stickers = await Store.getSetting('sticker_packs', []);
        const s = stickers[idx];
        if (!s) return;
        Phone.showModal({
            title: '编辑表情',
            content: `
                <div class="form-group">
                    <label class="form-label">图片 URL</label>
                    <input class="form-input" id="sticker-edit-url" value="${escapeHtml(s.url)}">
                </div>
                <div class="form-group" style="margin-bottom:0">
                    <label class="form-label">描述（AI用来理解表情含义）</label>
                    <input class="form-input" id="sticker-edit-desc" value="${escapeHtml(s.desc)}" placeholder="例：开心的猫猫表情">
                </div>`,
            actions: [
                { label: '取消', type: 'secondary' },
                { label: '保存', type: 'primary', onClick: async () => {
                    stickers[idx] = {
                        url: document.getElementById('sticker-edit-url').value.trim(),
                        desc: document.getElementById('sticker-edit-desc').value.trim()
                    };
                    await Store.setSetting('sticker_packs', stickers);
                    showToast('已保存');
                    openStickerManager();
                }}
            ]
        });
    }

    function addSticker() {
        Phone.showModal({
            title: '添加表情包',
            content: `
                <div class="form-group">
                    <label class="form-label">图片 URL</label>
                    <input class="form-input" id="sticker-new-url" placeholder="https://...">
                </div>
                <div class="form-group" style="margin-bottom:0">
                    <label class="form-label">描述（AI 用来理解表情含义）</label>
                    <input class="form-input" id="sticker-new-desc" placeholder="例：开心的猫猫表情">
                </div>`,
            actions: [
                { label: '取消', type: 'secondary' },
                { label: '添加', type: 'primary', onClick: async () => {
                    const url = document.getElementById('sticker-new-url').value.trim();
                    const desc = document.getElementById('sticker-new-desc').value.trim();
                    if (!url) { showToast('请输入图片 URL'); return; }
                    if (!desc) { showToast('请输入描述'); return; }
                    const stickers = await Store.getSetting('sticker_packs', []);
                    stickers.push({ url, desc });
                    await Store.setSetting('sticker_packs', stickers);
                    showToast('表情已添加');
                    openStickerManager();
                }}
            ]
        });
    }

    /* ============================================
       知识书管理
       ============================================ */
    async function openKnowledgeManager() {
        const books = await Store.getAll(Store.STORES.knowledgeBooks);
        const appContent = document.getElementById('app-content');
        let html = `<div class="chat-panel-page">
            <div class="app-header">
                <button class="app-header-btn app-back-btn" onclick="ChatApp.backToList()">返回</button>
                <span class="app-header-title">知识书</span>
                <button class="app-header-btn" onclick="ChatApp.createKnowledgeBook()">＋</button>
            </div>
            <div class="chat-panel-body">`;

        if (books.length === 0) {
            html += `<div class="chat-empty-state"><div class="chat-empty-icon">📖</div><div class="chat-empty-text">暂无知识书，点击 ＋ 创建</div></div>`;
        } else {
            books.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            books.forEach(b => {
                html += `<div class="chat-contact-item" data-kb-id="${b.id}">
                    <div class="chat-contact-avatar" style="font-size:20px">📖</div>
                    <div class="chat-contact-info">
                        <div class="chat-contact-name">${escapeHtml(b.name)}</div>
                        <div class="chat-contact-preview">${b.entries?.length || 0} 条目</div>
                    </div>
                    <div class="chat-contact-meta">
                        <span style="color:var(--text-tertiary);font-size:18px">›</span>
                    </div>
                </div>`;
            });
        }
        html += '</div></div>';
        appContent.innerHTML = html;

        document.querySelectorAll('[data-kb-id]').forEach(el => {
            el.addEventListener('click', () => openKnowledgeEditor(el.dataset.kbId));
        });
    }

    function createKnowledgeBook() {
        Phone.showModal({
            title: '新建知识书',
            content: `<div class="form-group" style="margin-bottom:0">
                <label class="form-label">名称</label>
                <input class="form-input" id="kb-new-name" placeholder="知识书名称">
            </div>`,
            actions: [
                { label: '取消', type: 'secondary' },
                { label: '创建', type: 'primary', onClick: async () => {
                    const name = document.getElementById('kb-new-name').value.trim();
                    if (!name) { showToast('请输入名称'); return; }
                    const kb = {
                        id: 'kb_' + uid(), name, scope: 'global',
                        entries: [{ content: '', enabled: true }], createdAt: Date.now()
                    };
                    await Store.put(Store.STORES.knowledgeBooks, kb);
                    showToast('知识书已创建');
                    openKnowledgeEditor(kb.id);
                }}
            ]
        });
    }

    async function openKnowledgeEditor(kbId) {
        const kb = await Store.get(Store.STORES.knowledgeBooks, kbId);
        if (!kb) return;
        const appContent = document.getElementById('app-content');
        appContent.innerHTML = `<div class="chat-panel-page">
            <div class="app-header">
                <button class="app-header-btn app-back-btn" onclick="ChatApp.openKnowledgeManager()">返回</button>
                <span class="app-header-title">${escapeHtml(kb.name)}</span>
                <button class="app-header-btn" onclick="ChatApp.addKBEntry('${kbId}')">＋</button>
            </div>
            <div class="chat-panel-body" id="kb-entries-body"></div>
        </div>`;
        await renderKBEntries(kbId);
    }

    async function renderKBEntries(kbId) {
        const kb = await Store.get(Store.STORES.knowledgeBooks, kbId);
        if (!kb) return;
        const body = document.getElementById('kb-entries-body');
        if (!body) return;
        if (!kb.entries || kb.entries.length === 0) {
            body.innerHTML = `<div class="chat-empty-state"><div class="chat-empty-icon">📝</div><div class="chat-empty-text">暂无条目，点击 ＋ 添加</div></div>`;
            return;
        }
        body.innerHTML = kb.entries.map((entry, i) => `
            <div class="kb-entry" data-idx="${i}">
                <div class="kb-entry-header">
                    <div class="kb-entry-toggle">
                        <label class="toggle-switch" style="transform:scale(0.75)">
                            <input type="checkbox" ${entry.enabled ? 'checked' : ''} onchange="ChatApp.toggleKBEntry('${kbId}',${i},this.checked)">
                            <span class="toggle-slider"></span>
                        </label><span>条目 ${i + 1}</span>
                    </div>
                    <button class="summary-action-btn" onclick="ChatApp.removeKBEntry('${kbId}',${i})" style="color:var(--danger)">删除</button>
                </div>
                <textarea class="kb-entry-content" onblur="ChatApp.saveKBEntry('${kbId}',${i},this.value)" placeholder="输入知识内容...">${escapeHtml(entry.content)}</textarea>
            </div>`).join('');
    }

    async function addKBEntry(kbId) {
        const kb = await Store.get(Store.STORES.knowledgeBooks, kbId);
        if (!kb) return;
        if (!kb.entries) kb.entries = [];
        kb.entries.push({ content: '', enabled: true });
        await Store.put(Store.STORES.knowledgeBooks, kb);
        showToast('已添加条目');
        await renderKBEntries(kbId);
    }

    async function removeKBEntry(kbId, idx) {
        const kb = await Store.get(Store.STORES.knowledgeBooks, kbId);
        if (!kb) return;
        kb.entries.splice(idx, 1);
        await Store.put(Store.STORES.knowledgeBooks, kb);
        showToast('已删除');
        await renderKBEntries(kbId);
    }

    async function toggleKBEntry(kbId, idx, enabled) {
        const kb = await Store.get(Store.STORES.knowledgeBooks, kbId);
        if (!kb || !kb.entries[idx]) return;
        kb.entries[idx].enabled = enabled;
        await Store.put(Store.STORES.knowledgeBooks, kb);
    }

    async function saveKBEntry(kbId, idx, content) {
        const kb = await Store.get(Store.STORES.knowledgeBooks, kbId);
        if (!kb || !kb.entries[idx]) return;
        kb.entries[idx].content = content;
        await Store.put(Store.STORES.knowledgeBooks, kb);
    }

    /* ============================================
       提示词设置
       ============================================ */
    async function openPromptSettings() {
        const summaryPrompt = await Store.getSetting('prompt_summary',
            '请将以下对话总结为简洁的摘要，保留关键信息、情感变化和重要事件。用中文回复。');
        const diaryPrompt = await Store.getSetting('prompt_diary',
            '你可以在回复末尾写日记来记录你对用户的观察和感受，用户看不到这部分内容。格式：[DIARY]日记内容[/DIARY]');
        const responseFormatPrompt = await Store.getSetting('prompt_response_format',
            '你可以一次回复多条消息，用---MSG_SPLIT--- 分隔。每条消息就是一个独立的聊天气泡。\n如果要引用某条消息，在消息开头加[quote:消息内容的前10个字]\n如果要使用表情包，单独一条消息写[sticker:序号]');

        Phone.showModal({
            title: '提示词设置',
            content: `<div style="max-height:400px;overflow-y:auto;padding:4px">
                <div class="prompt-editor-section">
                    <div class="prompt-editor-label">回复格式指令</div>
                    <textarea class="prompt-editor-textarea" id="prompt-response" rows="6">${escapeHtml(responseFormatPrompt)}</textarea><div class="prompt-editor-hint">控制 AI 如何分割多气泡、引用、使用表情包</div>
                </div>
                <div class="prompt-editor-section">
                    <div class="prompt-editor-label">总结提示词</div>
                    <textarea class="prompt-editor-textarea" id="prompt-summary" rows="3">${escapeHtml(summaryPrompt)}</textarea>
                    <div class="prompt-editor-hint">每30条消息自动触发总结时使用</div>
                </div>
                <div class="prompt-editor-section" style="margin-bottom:0">
                    <div class="prompt-editor-label">日记提示词</div>
                    <textarea class="prompt-editor-textarea" id="prompt-diary" rows="3">${escapeHtml(diaryPrompt)}</textarea>
                    <div class="prompt-editor-hint">告诉 AI 如何写日记（用户不可见区域）</div>
                </div>
            </div>`,
            actions: [
                { label: '取消', type: 'secondary' },
                { label: '保存', type: 'primary', onClick: async () => {
                    await Store.setSetting('prompt_summary', document.getElementById('prompt-summary').value);
                    await Store.setSetting('prompt_diary', document.getElementById('prompt-diary').value);
                    await Store.setSetting('prompt_response_format', document.getElementById('prompt-response').value);
                    showToast('提示词已保存');
                }}
            ]
        });
    }

    function backToList() {
        Router.open('chat');
    }

    /* ============================================
       聊天界面
       ============================================ */
    async function renderChatView(chatId) {
        const chat = await Store.get(Store.STORES.chats, chatId);
        if (!chat) return '<div class="app-body" style="display:flex;align-items:center;justify-content:center;color:var(--text-tertiary)">会话不存在</div>';

        const chars = [];
        for (const cid of (chat.characterIds || [])) {
            const c = await Store.get(Store.STORES.characters, cid);
            if (c) chars.push(c);
        }
        const mainChar = chars[0];
        const chatName = chat.name || mainChar?.name || '对话';
        const avatar = mainChar?.avatar
            ? `<img src="${escapeHtml(mainChar.avatar)}" alt="">`
            : (mainChar?.name?.[0] || '🤖');

        return `
        <div class="chat-view" id="chat-view">
            <div class="chat-header">
                <button class="app-header-btn app-back-btn" onclick="ChatApp.exitChat()">返回</button>
                <div class="chat-header-avatar">${avatar}</div>
                <div class="chat-header-info">
                    <div class="chat-header-name">${escapeHtml(chatName)}</div>
                    <div class="chat-header-status" id="chat-status">${chat.type === 'group' ? chars.length + ' 位成员' : '在线'}</div>
                </div>
                <div class="chat-header-actions">
                    <button class="chat-header-btn" onclick="ChatApp.openChatMenu()" title="菜单">☰</button>
                </div>
            </div>
            <div class="chat-messages" id="chat-messages">
                <div style="display:flex;justify-content:center;padding:40px"><div class="chat-spinner"></div></div>
            </div>
            <div id="chat-reply-bar-container"></div>
            <div class="chat-input-area" id="chat-input-area">
                <div class="chat-input-toolbar">
                    <button class="chat-toolbar-btn" onclick="ChatApp.toggleStickerPanel()" title="表情包">😀</button>
                    <button class="chat-toolbar-btn" onclick="ChatApp.sendSpecialMsg('image')" title="图片">🖼</button>
                    <button class="chat-toolbar-btn" onclick="ChatApp.sendSpecialMsg('voice')" title="语音">🎤</button>
                    <button class="chat-toolbar-btn" onclick="ChatApp.sendSpecialMsg('transfer')" title="转账">💰</button>
                    <button class="chat-toolbar-btn" onclick="ChatApp.sendSpecialMsg('location')" title="位置">📍</button>
                    <button class="chat-toolbar-btn" onclick="ChatApp.sendSpecialMsg('gift')" title="礼物">🎁</button>
                </div>
                <div class="chat-input-row">
                    <div class="chat-input-wrapper">
                        <textarea class="chat-input" id="chat-input" placeholder="输入消息..." rows="1"></textarea>
                    </div>
                    <div class="chat-send-btns">
                        <button class="chat-send-btn chat-send-silent" id="btn-send-silent" onclick="ChatApp.sendSilent()" title="发送（AI不回复）">↑</button>
                        <button class="chat-send-btn chat-send-trigger" id="btn-send-trigger" onclick="ChatApp.sendAndTrigger()" title="发送并触发AI回复">⟩</button>
                    </div>
                </div>
            </div>
        </div>`;
    }

    async function initChatView(chatId) {
        currentChatId = chatId;
        replyTo = null;
        stickerPanelOpen = false;

        const input = document.getElementById('chat-input');
        if (input) {
            input.addEventListener('input', () => {
                input.style.height = 'auto';
                input.style.height = Math.min(input.scrollHeight, 120) + 'px';
            });
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendAndTrigger();
                }
            });
        }

        const chat = await Store.get(Store.STORES.chats, chatId);
        if (chat) {
            for (const cid of (chat.characterIds || [])) {
                const c = await Store.get(Store.STORES.characters, cid);
                if (c?.customCSS) {
                    const style = document.createElement('style');
                    style.id = 'custom-css-' + cid;
                    style.textContent = c.customCSS;
                    document.head.appendChild(style);
                }
            }
        }await loadMessages();
    }

    function exitChat() {
        if (abortCtrl) { abortCtrl.abort(); abortCtrl = null; }
        document.querySelectorAll('[id^="custom-css-"]').forEach(el => el.remove());
        currentChatId = null;
        replyTo = null;
        stickerPanelOpen = false;
        // Use closeAll + reopen to avoid history loop
        Router.closeAll();
        Router.open('chat');
    }

    /* ---- 消息加载与渲染 ---- */
    async function loadMessages() {
        const container = document.getElementById('chat-messages');
        if (!container) return;
        try {
            const msgs = await Store.getAllByIndex(Store.STORES.messages, 'chatId', currentChatId);
            msgs.sort((a, b) => a.timestamp - b.timestamp);

            const chat = await Store.get(Store.STORES.chats, currentChatId);
            const chars = {};
            for (const cid of (chat?.characterIds || [])) {
                const c = await Store.get(Store.STORES.characters, cid);
                if (c) chars[c.id] = c;
            }

            if (msgs.length === 0) {
                container.innerHTML = `<div class="chat-empty-state" style="flex:1"><div class="chat-empty-icon">💬</div><div class="chat-empty-text">发送第一条消息开始对话</div></div>`;
                return;
            }

            let html = '';
            let lastDate = '';
            let lastRole = '';
            let lastCharId = '';

            msgs.forEach(msg => {
                if (msg.isDeleted) return;
                const msgDate = new Date(msg.timestamp).toDateString();
                if (msgDate !== lastDate) {
                    html += `<div class="chat-date-divider"><span>${fmtDate(msg.timestamp)}</span></div>`;
                    lastDate = msgDate;
                    lastRole = '';
                    lastCharId = '';
                }
                const isUser = msg.role === 'user';
                const char = msg.characterId ? chars[msg.characterId] : null;
                const consecutive = msg.role === lastRole && msg.characterId === lastCharId;
                html += renderMsgBubble(msg, char, isUser, consecutive, msgs, chars);
                lastRole = msg.role;
                lastCharId = msg.characterId || '';
            });

            container.innerHTML = html;
            scrollToBottom();
            bindMsgEvents(container);
        } catch (e) {
            container.innerHTML = `<div class="chat-empty-state"><div class="chat-empty-icon">⚠️</div><div class="chat-empty-text">加载消息失败: ${escapeHtml(e.message)}</div></div>`;
        }
    }

    function renderMsgBubble(msg, char, isUser, consecutive, allMsgs, charsMap) {
        const roleClass = isUser ? 'user' : 'assistant';
        const consClass = consecutive ? ' consecutive' : '';
        const userAvatar = '👤';
        const avatar = isUser ? userAvatar : (char?.avatar ? `<img src="${escapeHtml(char.avatar)}" alt="">` : (char?.name?.[0] || '🤖'));
        const senderName = isUser ? '' : (char?.name || '助手');

        // Quote
        let quoteHtml = '';
        if (msg.replyToId) {
            const quoted = allMsgs.find(m => m.id === msg.replyToId);
            if (quoted) {
                const qChar = quoted.characterId && charsMap ? charsMap[quoted.characterId] : null;
                const qName = quoted.role === 'user' ? '你' : (qChar?.name || '助手');
                quoteHtml = `<div class="chat-quote" data-msg-id="${quoted.id}">
                    <div class="chat-quote-sender">${escapeHtml(qName)}</div>
                    <div>${escapeHtml(quoted.content?.slice(0, 60) || '')}</div>
                </div>`;
            }
        }

        let bubbleContent = '';
        let bubbleClass = 'chat-bubble';
        const type = msg.type || 'text';

        switch (type) {
            case 'sticker':
                bubbleClass += ' sticker-bubble';
                bubbleContent = `<img class="chat-sticker-img" src="${escapeHtml(msg.typeData?.url || '')}" alt="${escapeHtml(msg.typeData?.description || '')}" onerror="this.alt='表情加载失败';this.style.padding='20px';this.style.fontSize='12px';this.style.color='var(--text-tertiary)'">`;
                break;
            case 'image':
                bubbleClass += ' image-bubble';
                bubbleContent = `<div class="chat-image-content"><img src="${escapeHtml(msg.typeData?.url || '')}" alt="" onerror="this.parentElement.innerHTML='<div style=\\'padding:20px;text-align:center;color:var(--text-tertiary);font-size:12px\\'>图片加载失败</div>'"></div>${msg.typeData?.description ? `<div class="chat-image-desc">${escapeHtml(msg.typeData.description)}</div>` : ''}`;
                break;
            case 'voice':
                bubbleClass += ' voice-bubble';
                bubbleContent = `<div class="chat-voice-content">
                    <div class="chat-voice-play"></div>
                    <div class="chat-voice-waves"><div class="chat-voice-wave"></div><div class="chat-voice-wave"></div><div class="chat-voice-wave"></div><div class="chat-voice-wave"></div><div class="chat-voice-wave"></div><div class="chat-voice-wave"></div><div class="chat-voice-wave"></div><div class="chat-voice-wave"></div></div>
                    <span class="chat-voice-duration">${escapeHtml(msg.typeData?.duration || '0:03')}</span>
                </div>`;
                break;
            case 'transfer':
                bubbleClass += ' transfer-bubble';
                bubbleContent = `
                    <div class="chat-transfer-header">
                        <div class="chat-transfer-icon-wrap"></div>
                        <div class="chat-transfer-info">
                            <div class="chat-transfer-amount">${escapeHtml(msg.typeData?.amount || '¥0')}</div>
                            <div class="chat-transfer-note">${escapeHtml(msg.content || '转账')}</div>
                        </div>
                    </div><div class="chat-transfer-footer">
                        <span class="chat-transfer-label">转账</span>
                        <span class="chat-transfer-status">已收款</span>
                    </div>`;
                break;
            case 'location':
                bubbleClass += ' location-bubble';
                bubbleContent = `
                    <div class="chat-location-map">
                        <div class="chat-location-pin"></div>
                    </div>
                    <div class="chat-location-info">
                        <div class="chat-location-text">
                            <div class="chat-location-name">${escapeHtml(msg.typeData?.address || msg.content || '位置')}</div>
                            <div class="chat-location-addr">点击查看详情</div>
                        </div>
                        <span class="chat-location-arrow">›</span>
                    </div>`;
                break;
            case 'gift':
                bubbleClass += ' gift-bubble';
                bubbleContent = `
                    <div class="chat-gift-header">
                        <div class="chat-gift-icon-wrap">🎁</div>
                        <div class="chat-gift-label">${escapeHtml(msg.content || '礼物')}</div>
                    </div>
                    <div class="chat-gift-footer">已拆开</div>`;
                break;
            case 'article':
                bubbleClass += ' article-bubble';
                bubbleContent = `
                    <div class="chat-article-body">
                        <div class="chat-article-title">${escapeHtml(msg.typeData?.title || '文章')}</div>
                        <div class="chat-article-desc">${escapeHtml(msg.content || '')}</div>
                    </div>
                    <div class="chat-article-footer"><div class="chat-article-icon"></div><span>公众号文章</span></div>`;
                break;
            default:
                bubbleContent = formatTextContent(msg.content || '');
        }

        return `
        <div class="chat-msg-row ${roleClass}${consClass}" data-msg-id="${msg.id}">
            <div class="chat-msg-avatar">${avatar}</div>
            <div class="chat-msg-body">
                ${!isUser && !consecutive ? `<div class="chat-msg-sender">${escapeHtml(senderName)}</div>` : ''}
                ${quoteHtml}
                <div class="${bubbleClass}">${bubbleContent}</div>
                <div class="chat-msg-meta">
                    ${isUser ? '<span class="chat-msg-read">已读</span>' : ''}
                    <span class="chat-msg-time">${fmtTime(msg.timestamp)}</span>
                </div>
            </div>
        </div>`;
    }

    function formatTextContent(text) {
        let html = escapeHtml(text);
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
        html = html.replace(/\n/g, '<br>');
        return html;
    }

    function bindMsgEvents(container) {
        container.querySelectorAll('.chat-msg-row').forEach(row => {
            let pressTimer;
            row.addEventListener('contextmenu', e => { e.preventDefault(); showMsgContextMenu(e, row.dataset.msgId); });
            row.addEventListener('pointerdown', e => { pressTimer = setTimeout(() => showMsgContextMenu(e, row.dataset.msgId), 500); });
            row.addEventListener('pointerup', () => clearTimeout(pressTimer));
            row.addEventListener('pointermove', () => clearTimeout(pressTimer));
        });
        container.querySelectorAll('.chat-quote').forEach(q => {
            q.addEventListener('click', () => {
                const target = container.querySelector(`[data-msg-id="${q.dataset.msgId}"]`);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    target.style.background = 'var(--glass-bg-light)';
                    setTimeout(() => target.style.background = '', 1000);
                }
            });
        });
    }

    function showMsgContextMenu(e, msgId) {
        const phoneRect = document.getElementById('phone-container').getBoundingClientRect();
        Phone.showContextMenu(
            (e.clientX || e.pageX) - phoneRect.left,
            (e.clientY || e.pageY) - phoneRect.top,
            [
                { label: '引用', icon: '↩', onClick: () => setReplyTo(msgId) },
                { label: '重新生成', icon: '🔄', onClick: () => rerollMsg(msgId) },
                { type: 'separator' },
                { label: '删除', icon: '🗑', danger: true, onClick: () => deleteMsg(msgId) }
            ]
        );
    }

    async function setReplyTo(msgId) {
        const msg = await Store.get(Store.STORES.messages, msgId);
        if (!msg) return;
        replyTo = msg;
        const chat = await Store.get(Store.STORES.chats, currentChatId);
        const chars = {};
        for (const cid of (chat?.characterIds || [])) {
            const c = await Store.get(Store.STORES.characters, cid);
            if (c) chars[c.id] = c;
        }
        const senderName = msg.role === 'user' ? '你' : (chars[msg.characterId]?.name || '助手');
        const container = document.getElementById('chat-reply-bar-container');
        container.innerHTML = `
            <div class="chat-reply-bar">
                <div class="chat-reply-content">
                    <div class="chat-reply-name">${escapeHtml(senderName)}</div>
                    <div class="chat-reply-text">${escapeHtml(msg.content?.slice(0, 80) || '消息')}</div>
                </div>
                <button class="chat-reply-close" onclick="ChatApp.clearReply()">✕</button>
            </div>`;
        document.getElementById('chat-input')?.focus();
    }

    function clearReply() {
        replyTo = null;
        const container = document.getElementById('chat-reply-bar-container');
        if (container) container.innerHTML = '';
    }

    async function deleteMsg(msgId) {
        const msg = await Store.get(Store.STORES.messages, msgId);
        if (!msg) return;
        msg.isDeleted = true;
        await Store.put(Store.STORES.messages, msg);
        showToast('消息已删除');
        await loadMessages();
    }

    async function rerollMsg(msgId) {
        const msg = await Store.get(Store.STORES.messages, msgId);
        if (!msg || msg.role !== 'assistant') {
            showToast('只能重新生成 AI 消息');
            return;
        }
        msg.isDeleted = true;
        await Store.put(Store.STORES.messages, msg);
        await triggerAIResponse();}

    /* ---- 发送消息 ---- */
    async function sendSilent() {
        const input = document.getElementById('chat-input');
        const text = input?.value?.trim();
        if (!text) return;
        await saveUserMessage(text);
        input.value = '';
        input.style.height = 'auto';
        clearReply();
        await loadMessages();showToast('已发送（AI 未回复）');
    }

    async function sendAndTrigger() {
        const input = document.getElementById('chat-input');
        const text = input?.value?.trim();
        if (text) {
            await saveUserMessage(text);
            input.value = '';
            input.style.height = 'auto';
            clearReply();
        }
        await loadMessages();
        await triggerAIResponse();
    }

    async function saveUserMessage(text) {
        const msg = {
            id: 'msg_' + uid(), chatId: currentChatId, role: 'user',
            characterId: null, content: text, type: 'text', typeData: null,
            replyToId: replyTo?.id || null, timestamp: Date.now(), isDeleted: false
        };
        await Store.put(Store.STORES.messages, msg);const chat = await Store.get(Store.STORES.chats, currentChatId);
        if (chat) {
            chat.messageCount = (chat.messageCount || 0) + 1;
            chat.lastMessage = text.slice(0, 50);
            chat.updatedAt = Date.now();
            await Store.put(Store.STORES.chats, chat);
        }
    }

    /* ---- AI 回复 ---- */
    async function triggerAIResponse() {
        const chat = await Store.get(Store.STORES.chats, currentChatId);
        if (!chat) return;
        const statusEl = document.getElementById('chat-status');

        try {
            if (statusEl) statusEl.textContent = '正在输入...';
            showTypingIndicator();

            const apiMessages = await buildAPIMessages(chat);

            let respondChar = null;
            if (chat.type === 'single' && chat.characterIds[0]) {
                respondChar = await Store.get(Store.STORES.characters, chat.characterIds[0]);
            }

            abortCtrl = new AbortController();
            let fullText = '';

            removeTypingIndicator();

            const tempId = 'streaming_' + uid();
            appendStreamingBubble(tempId, respondChar, chat.type === 'model');

            await API.chat(apiMessages, {
                stream: true,
                onToken: (token, text) => {
                    fullText = text;
                    updateStreamingBubble(tempId, text);
                },
                onDone: async (text) => {
                    fullText = text;
                    removeStreamingBubble(tempId);
                    await processAIResponse(fullText, chat, respondChar);
                },
                signal: abortCtrl.signal
            });
        } catch (e) {
            removeTypingIndicator();
            if (e.name === 'AbortError') {
                showToast('生成已取消');
            } else {
                showErrorBubble(e.message);
                Logger.error('AI response error', e.message);
            }
        } finally {
            abortCtrl = null;
            if (statusEl) {
                const charCount = (chat.characterIds || []).length;
                statusEl.textContent = chat.type === 'group' ? charCount + ' 位成员' : '在线';
            }
        }
    }

    async function buildAPIMessages(chat) {
        const messages = [];
        let systemPrompt = '';

        if (chat.type === 'model') {
            systemPrompt = '你是一个有帮助的 AI 助手。';
        } else {
            const chars = [];
            for (const cid of (chat.characterIds || [])) {
                const c = await Store.get(Store.STORES.characters, cid);
                if (c) chars.push(c);
            }

            const userName = await Store.getSetting('user_name', 'User');
            const userDesc = await Store.getSetting('user_desc', '');
            const userPersona = await Store.getSetting('user_persona', '');
            const userPrefs = await Store.getSetting('user_preferences', '');

            systemPrompt = `你正在进行角色扮演聊天。用户名为"${userName}"。`;
            if (userDesc) systemPrompt += `\n用户简介: ${userDesc}`;
            if (userPersona) systemPrompt += `\n用户身份设定: ${userPersona}`;
            if (userPrefs) systemPrompt += `\n用户喜好: ${userPrefs}`;

            chars.forEach(c => {
                systemPrompt += `\n\n【角色: ${c.name}】\n${c.persona || '无特殊人设'}`;
                if (c.globalPrompt) systemPrompt += `\n${c.globalPrompt}`;
            });

            // Knowledge books
            const allKB = await Store.getAll(Store.STORES.knowledgeBooks);
            const relevantKB = allKB.filter(kb => {
                if (kb.scope === 'global') return true;
                return chars.some(c => c.knowledgeBooks?.includes(kb.id));
            });
            if (relevantKB.length > 0) {
                systemPrompt += '\n\n【知识库】';
                relevantKB.forEach(kb => {
                    const entries = kb.entries?.filter(e => e.enabled).map(e => e.content).filter(Boolean);
                    if (entries?.length) systemPrompt += `\n[${kb.name}]\n${entries.join('\n')}`;
                });
            }

            // Stickers
            const stickers = await Store.getSetting('sticker_packs', []);
            if (stickers.length > 0) {
                systemPrompt += '\n\n【可用表情包】\n你可以在回复中使用表情包。格式: [sticker:序号]\n';
                stickers.forEach((s, i) => { systemPrompt += `${i}: ${s.desc}\n`; });
            }

            // Diary — AI can read its own diary
            for (const c of chars) {
                const diaries = await Store.getAllByIndex(Store.STORES.diaries, 'charId', c.id);
                if (diaries.length > 0) {
                    systemPrompt += `\n\n【${c.name}的日记/记忆（只有你自己能看到，用户看不到）】\n${diaries.map(d => d.content).join('\n')}`;
                }
            }

            // Diary prompt (user-editable)
            const diaryPrompt = await Store.getSetting('prompt_diary',
                '你可以在回复末尾写日记来记录你对用户的观察和感受，用户看不到这部分内容。格式：[DIARY]日记内容[/DIARY]');
            systemPrompt += `\n\n${diaryPrompt}`;
        }

        messages.push({ role: 'system', content: systemPrompt });

        // Summaries
        const summaries = await Store.getAllByIndex(Store.STORES.summaries, 'chatId', chat.id);
        summaries.sort((a, b) => (a.messageRange?.from || 0) - (b.messageRange?.from || 0));
        if (summaries.length > 0) {
            messages.push({ role: 'system', content: `【之前的对话总结】\n${summaries.map(s => s.content).join('\n---\n')}` });
        }

        // Recent messages
        const allMsgs = await Store.getAllByIndex(Store.STORES.messages, 'chatId', chat.id);
        allMsgs.sort((a, b) => a.timestamp - b.timestamp);
        const activeMsgs = allMsgs.filter(m => !m.isDeleted);

        const lastSummary = summaries[summaries.length - 1];
        const lastSumTo = lastSummary?.messageRange?.to || 0;
        const recentMsgs = activeMsgs.slice(lastSumTo);

        recentMsgs.forEach(m => {
            let content = m.content || '';
            if (m.type === 'sticker') content = `[发送了表情包: ${m.typeData?.description || '表情'}]`;
            else if (m.type === 'image') content = `[发送了图片${m.typeData?.description ? ': ' + m.typeData.description : ''}]`;
            else if (m.type === 'voice') content = `[发送了语音消息, 时长${m.typeData?.duration || '未知'}]: ${m.content || ''}`;
            else if (m.type === 'transfer') content = `[转账${m.typeData?.amount || ''}]: ${m.content || ''}`;
            else if (m.type === 'location') content = `[分享了位置: ${m.typeData?.address || m.content || ''}]`;
            else if (m.type === 'gift') content = `[送了礼物]: ${m.content || ''}`;
            else if (m.type === 'article') content = `[分享了文章: ${m.typeData?.title || ''}] ${m.content || ''}`;

            if (m.replyToId) {
                const quoted = activeMsgs.find(q => q.id === m.replyToId);
                if (quoted) content = `[引用: "${quoted.content?.slice(0, 30) || '...'}"] ${content}`;
            }

            if (m.role === 'assistant' && m.characterId && chat.characterIds?.length > 1) {
                messages.push({ role: 'assistant', content: `[${m.characterId}] ${content}` });
            } else {
                messages.push({ role: m.role, content });
            }
        });

        // Response format instruction (user-editable)
        const responseFormatPrompt = await Store.getSetting('prompt_response_format',
            '你可以一次回复多条消息，用---MSG_SPLIT--- 分隔。每条消息就是一个独立的聊天气泡。\n如果要引用某条消息，在消息开头加 [quote:消息内容的前10个字]\n如果要使用表情包，单独一条消息写[sticker:序号]');

        let formatInstruction = responseFormatPrompt;
        if (chat.type === 'group') {
            formatInstruction += '\n\n你正在群聊中。请在回复最开头标注角色名，格式: [CHAR:角色名]\n例如:\n[CHAR:小明]你好呀！\n---MSG_SPLIT---\n[CHAR:小红]嗨嗨~';
        }

        messages.push({ role: 'system', content: formatInstruction });

        // Check if summary needed
        if (recentMsgs.length >= 30) {
            triggerSummary(chat, activeMsgs, summaries);
        }

        return messages;
    }

    /* ---- 流式气泡 ---- */
    function appendStreamingBubble(tempId, char, isModel) {
        const container = document.getElementById('chat-messages');
        if (!container) return;
        const avatar = isModel ? '🤖' : (char?.avatar ? `<img src="${escapeHtml(char.avatar)}" alt="">` : (char?.name?.[0] || '🤖'));
        const name = isModel ? '模型' : (char?.name || '助手');
        const row = document.createElement('div');
        row.className = 'chat-msg-row assistant';
        row.id = tempId;
        row.innerHTML = `
            <div class="chat-msg-avatar">${avatar}</div>
            <div class="chat-msg-body">
                <div class="chat-msg-sender">${escapeHtml(name)}</div>
                <div class="chat-bubble"><span class="streaming-text"></span><span style="display:inline-block;width:2px;height:14px;background:var(--text-primary);margin-left:2px;animation:blink 1s infinite"></span></div>
            </div>`;
        container.appendChild(row);
        scrollToBottom();
    }

    function updateStreamingBubble(tempId, text) {
        const el = document.getElementById(tempId);
        if (!el) return;
        const textEl = el.querySelector('.streaming-text');
        if (textEl) textEl.innerHTML = formatTextContent(text);
        scrollToBottom();
    }

    function removeStreamingBubble(tempId) {
        document.getElementById(tempId)?.remove();
    }

    function showTypingIndicator() {
        const container = document.getElementById('chat-messages');
        if (!container) return;
        removeTypingIndicator();
        const indicator = document.createElement('div');
        indicator.className = 'chat-typing-indicator';
        indicator.id = 'typing-indicator';
        indicator.innerHTML = `
            <div class="chat-msg-avatar" style="width:30px;height:30px;font-size:14px">💭</div>
            <div class="chat-typing-dots">
                <div class="chat-typing-dot"></div>
                <div class="chat-typing-dot"></div>
                <div class="chat-typing-dot"></div>
            </div>`;
        container.appendChild(indicator);scrollToBottom();
    }

    function removeTypingIndicator() {
        document.getElementById('typing-indicator')?.remove();
    }

    function showErrorBubble(errorMsg) {
        const container = document.getElementById('chat-messages');
        if (!container) return;
        const errEl = document.createElement('div');
        errEl.className = 'chat-msg-row assistant';
        errEl.innerHTML = `
            <div class="chat-msg-avatar">⚠️</div>
            <div class="chat-msg-body">
                <div class="chat-error-bubble">
                    <span style="flex:1">生成失败: ${escapeHtml(errorMsg)}</span>
                    <button class="chat-error-retry" onclick="ChatApp.retryLastResponse()">重试</button>
                </div>
            </div>`;
        container.appendChild(errEl);
        scrollToBottom();
    }

    async function retryLastResponse() {
        const container = document.getElementById('chat-messages');
        const lastRow = container?.lastElementChild;
        if (lastRow?.querySelector('.chat-error-bubble')) lastRow.remove();
        await triggerAIResponse();
    }

    /* ---- 处理 AI 回复 ---- */
    async function processAIResponse(fullText, chat, respondChar) {
        let diary = null;
        const diaryMatch = fullText.match(/\[DIARY\]([\s\S]*?)\[\/DIARY\]/);
        if (diaryMatch) {
            diary = diaryMatch[1].trim();
            fullText = fullText.replace(/\[DIARY\][\s\S]*?\[\/DIARY\]/, '').trim();
        }

        const parts = fullText.split(/---MSG_SPLIT---/).map(p => p.trim()).filter(Boolean);
        const stickers = await Store.getSetting('sticker_packs', []);
        const allMsgs = await Store.getAllByIndex(Store.STORES.messages, 'chatId', chat.id);
        const activeMsgs = allMsgs.filter(m => !m.isDeleted).sort((a, b) => a.timestamp - b.timestamp);

        for (let i = 0; i < parts.length; i++) {
            let part = parts[i];
            let charId = respondChar?.id || null;

            const charMatch = part.match(/^\[CHAR:(.+?)\]/);
            if (charMatch) {
                const charName = charMatch[1].trim();
                part = part.replace(/^\[CHAR:.+?\]/, '').trim();
                for (const cid of (chat.characterIds || [])) {
                    const c = await Store.get(Store.STORES.characters, cid);
                    if (c && c.name === charName) { charId = c.id; break; }
                }
            }

            let replyToId = null;
            const quoteMatch = part.match(/^\[quote:(.+?)\]/);
            if (quoteMatch) {
                const quoteText = quoteMatch[1];
                part = part.replace(/^\[quote:.+?\]/, '').trim();
                const found = activeMsgs.find(m => m.content?.startsWith(quoteText));
                if (found) replyToId = found.id;
            }

            let msgType = 'text';
            let typeData = null;
            const stickerMatch = part.match(/^\[sticker:(\d+)\]$/);
            if (stickerMatch) {
                const idx = parseInt(stickerMatch[1]);
                if (stickers[idx]) {
                    msgType = 'sticker';
                    typeData = { url: stickers[idx].url, description: stickers[idx].desc };
                    part = stickers[idx].desc || '表情';
                }
            }

            const msg = {
                id: 'msg_' + uid(), chatId: chat.id, role: 'assistant',
                characterId: charId, content: part, type: msgType, typeData,
                replyToId, timestamp: Date.now() + i, isDeleted: false
            };
            await Store.put(Store.STORES.messages, msg);
        }

        const lastPart = parts[parts.length - 1] || '';
        chat.messageCount = (chat.messageCount || 0) + parts.length;
        chat.lastMessage = lastPart.replace(/^\[CHAR:.+?\]/, '').replace(/^\[quote:.+?\]/, '').slice(0, 50);
        chat.updatedAt = Date.now();
        await Store.put(Store.STORES.chats, chat);

        // Save diary (append)
        if (diary && respondChar) {
            const existing = await Store.getAllByIndex(Store.STORES.diaries, 'charId', respondChar.id);
            const existingDiary = existing[0];
            if (existingDiary) {
                existingDiary.content = existingDiary.content + '\n---\n' + diary;
                existingDiary.updatedAt = Date.now();
                await Store.put(Store.STORES.diaries, existingDiary);
            } else {
                await Store.put(Store.STORES.diaries, {
                    id: 'diary_' + respondChar.id, charId: respondChar.id,
                    content: diary, updatedAt: Date.now()
                });
            }
        }

        await loadMessages();}

    /* ---- 总结 ---- */
    async function triggerSummary(chat, activeMsgs, existingSummaries) {
        const lastSummary = existingSummaries[existingSummaries.length - 1];
        const fromIdx = lastSummary ? (lastSummary.messageRange?.to || 0) : 0;
        const toIdx = fromIdx + 30;
        const toSummarize = activeMsgs.slice(fromIdx, toIdx);
        if (toSummarize.length< 30) return;

        try {
            const summaryText = toSummarize.map(m => {
                const prefix = m.role === 'user' ? 'User' : (m.characterId ||'AI');
                return `${prefix}: ${m.content || '[特殊消息]'}`;
            }).join('\n');

            const summaryPrompt = await Store.getSetting('prompt_summary',
                '请将以下对话总结为简洁的摘要，保留关键信息、情感变化和重要事件。用中文回复。');

            const result = await API.chat([
                { role: 'system', content: summaryPrompt },
                { role: 'user', content: summaryText }
            ], { stream: false, temperature: 0.3, max_tokens: 1024 });

            await Store.put(Store.STORES.summaries, {
                id: 'sum_' + uid(), chatId: chat.id, content: result,
                messageRange: { from: fromIdx, to: toIdx },
                createdAt: Date.now(), editedAt: null
            });Logger.info('Summary created', `Messages ${fromIdx}-${toIdx}`);
        } catch (e) {
            Logger.error('Summary failed', e.message);
        }
    }

    /* ---- 特殊消息发送 ---- */
    function sendSpecialMsg(type) {
        switch (type) {
            case 'image':
                Phone.showModal({
                    title: '发送图片',
                    content: `
                        <div class="form-group">
                            <label class="form-label">图片 URL</label>
                            <input class="form-input" id="special-img-url" placeholder="https://...">
                        </div>
                        <div class="form-group" style="margin-bottom:0">
                            <label class="form-label">描述（可选）</label>
                            <input class="form-input" id="special-img-desc" placeholder="图片描述">
                        </div>`,
                    actions: [
                        { label: '取消', type: 'secondary' },
                        { label: '发送', type: 'primary', onClick: async () => {
                            const url = document.getElementById('special-img-url').value.trim();
                            if (!url) { showToast('请输入图片URL'); return; }
                            await saveSpecialMessage('image', '[图片]', { url, description: document.getElementById('special-img-desc').value.trim() });
                        }}
                    ]
                });
                break;
            case 'voice':
                Phone.showModal({
                    title: '发送语音',
                    content: `
                        <div class="form-group">
                            <label class="form-label">语音内容（文字描述）</label>
                            <textarea class="form-textarea" id="special-voice-text" rows="3" placeholder="语音说的内容..."></textarea>
                        </div>
                        <div class="form-group" style="margin-bottom:0">
                            <label class="form-label">时长</label>
                            <input class="form-input" id="special-voice-dur" value="0:15" placeholder="0:15">
                        </div>`,
                    actions: [
                        { label: '取消', type: 'secondary' },
                        { label: '发送', type: 'primary', onClick: async () => {
                            const text = document.getElementById('special-voice-text').value.trim();
                            if (!text) { showToast('请输入语音内容'); return; }
                            await saveSpecialMessage('voice', text, { duration: document.getElementById('special-voice-dur').value.trim() || '0:15' });
                        }}
                    ]
                });
                break;
            case 'transfer':
                Phone.showModal({
                    title: '转账',
                    content: `
                        <div class="form-group">
                            <label class="form-label">金额</label>
                            <input class="form-input" id="special-transfer-amount" placeholder="¥100">
                        </div>
                        <div class="form-group" style="margin-bottom:0">
                            <label class="form-label">备注</label>
                            <input class="form-input" id="special-transfer-note" placeholder="转账备注">
                        </div>`,
                    actions: [
                        { label: '取消', type: 'secondary' },
                        { label: '转账', type: 'primary', onClick: async () => {
                            const amount = document.getElementById('special-transfer-amount').value.trim();
                            if (!amount) { showToast('请输入金额'); return; }
                            await saveSpecialMessage('transfer', document.getElementById('special-transfer-note').value.trim() || '转账', { amount });
                        }}
                    ]
                });
                break;
            case 'location':
                Phone.showModal({
                    title: '分享位置',
                    content: `<div class="form-group" style="margin-bottom:0">
                        <label class="form-label">地址</label>
                        <input class="form-input" id="special-location" placeholder="输入地址...">
                    </div>`,
                    actions: [
                        { label: '取消', type: 'secondary' },
                        { label: '发送', type: 'primary', onClick: async () => {
                            const addr = document.getElementById('special-location').value.trim();
                            if (!addr) { showToast('请输入地址'); return; }
                            await saveSpecialMessage('location', addr, { address: addr });
                        }}
                    ]
                });
                break;
            case 'gift':
                Phone.showModal({
                    title: '送礼物',
                    content: `<div class="form-group" style="margin-bottom:0">
                        <label class="form-label">礼物描述</label>
                        <input class="form-input" id="special-gift" placeholder="一束花">
                    </div>`,
                    actions: [
                        { label: '取消', type: 'secondary' },
                        { label: '发送', type: 'primary', onClick: async () => {
                            const desc = document.getElementById('special-gift').value.trim();
                            if (!desc) { showToast('请输入礼物描述'); return; }
                            await saveSpecialMessage('gift', desc, {});
                        }}
                    ]
                });
                break;}
    }

    async function saveSpecialMessage(type, content, typeData) {
        const msg = {
            id: 'msg_' + uid(), chatId: currentChatId, role: 'user',
            characterId: null, content, type, typeData,
            replyToId: replyTo?.id || null, timestamp: Date.now(), isDeleted: false
        };
        await Store.put(Store.STORES.messages, msg);
        const chat = await Store.get(Store.STORES.chats, currentChatId);
        if (chat) {
            chat.messageCount = (chat.messageCount || 0) + 1;
            chat.lastMessage = `[${type}]`;
            chat.updatedAt = Date.now();
            await Store.put(Store.STORES.chats, chat);
        }
        clearReply();
        await loadMessages();showToast('已发送');
    }

    /* ---- 表情包面板（聊天内） ---- */
    async function toggleStickerPanel() {
        const inputArea = document.getElementById('chat-input-area');
        if (!inputArea) return;

        const existing = inputArea.querySelector('.sticker-panel');
        if (existing) {
            existing.remove();
            stickerPanelOpen = false;
            return;
        }

        stickerPanelOpen = true;
        const stickers = await Store.getSetting('sticker_packs', []);

        const panel = document.createElement('div');
        panel.className = 'sticker-panel';

        let panelHtml = `<div class="sticker-panel-header">
            <span class="sticker-panel-title">表情包</span>
            <button class="sticker-panel-close" onclick="ChatApp.toggleStickerPanel()">✕</button>
        </div>`;

        if (stickers.length === 0) {
            panelHtml += '<div class="sticker-panel-grid"><div class="sticker-panel-empty">暂无表情包<br>在＋菜单中管理表情包</div></div>';
        } else {
            panelHtml += '<div class="sticker-panel-grid">';
            stickers.forEach((s, i) => {
                panelHtml += `<div class="sticker-panel-item" data-sticker-send="${i}">
                    <img src="${escapeHtml(s.url)}" alt="${escapeHtml(s.desc)}" onerror="this.style.display='none'">
                </div>`;
            });
            panelHtml += '</div>';
        }

        panel.innerHTML = panelHtml;
        inputArea.appendChild(panel);

        panel.querySelectorAll('[data-sticker-send]').forEach(el => {
            el.addEventListener('click', async () => {
                const idx = parseInt(el.dataset.stickerSend);
                const s = stickers[idx];
                if (!s) return;
                await saveSpecialMessage('sticker', s.desc, { url: s.url, description: s.desc });
                stickerPanelOpen = false;
                panel.remove();
            });
        });
    }

    /* ---- 聊天菜单 ---- */
    function openChatMenu() {
        const phoneRect = document.getElementById('phone-container').getBoundingClientRect();
        Phone.showContextMenu(phoneRect.width - 60, 50, [
            { label: '查看总结', icon: '📋', onClick: () => openSummaryView() },
            { label: 'AI 日记', icon: '📔', onClick: () => openDiaryView() },
            { label: '角色信息', icon: '👤', onClick: () => openCharInfoFromChat() },
            { type: 'separator' },
            { label: '删除角色', icon: '🗑', danger: true, onClick: () => confirmDeleteCharFromChat() },
            { label: '清空消息', icon: '✕', danger: true, onClick: () => clearChatMessages() }
        ]);
    }

    async function confirmDeleteCharFromChat() {
        const chat = await Store.get(Store.STORES.chats, currentChatId);
        if (!chat || !chat.characterIds?.length) {
            showToast('此会话无角色');
            return;
        }

        if (chat.type === 'group') {
            // For group, let user pick which char to remove
            const chars = [];
            for (const cid of chat.characterIds) {
                const c = await Store.get(Store.STORES.characters, cid);
                if (c) chars.push(c);
            }
            const charList = chars.map(c => `
                <div class="chat-contact-item" data-del-char="${c.id}" style="cursor:pointer">
                    <div class="chat-contact-avatar" style="width:36px;height:36px;font-size:16px">${c.avatar ? `<img src="${escapeHtml(c.avatar)}" alt="">` : (c.name?.[0] || '👤')}</div>
                    <div class="chat-contact-info">
                        <div class="chat-contact-name">${escapeHtml(c.name)}</div>
                    </div>
                </div>`).join('');

            Phone.showModal({
                title: '选择要删除的角色',
                content: `<div style="max-height:300px;overflow-y:auto">${charList}</div>`,
                actions: [{ label: '取消', type: 'secondary' }]
            });

            setTimeout(() => {
                document.querySelectorAll('[data-del-char]').forEach(el => {
                    el.addEventListener('click', () => {
                        Phone.closeModal();
                        doDeleteChar(el.dataset.delChar);
                    });
                });
            }, 100);
        } else {
            // Single chat — delete the one char
            const charId = chat.characterIds[0];
            const char = await Store.get(Store.STORES.characters, charId);
            Phone.showModal({
                title: '删除角色',
                content: `<div style="font-size:14px;color:var(--text-secondary);text-align:center">确定删除角色"${escapeHtml(char?.name || '')}"？此操作不可恢复。</div>`,
                actions: [
                    { label: '取消', type: 'secondary' },
                    { label: '删除', type: 'primary', onClick: () => doDeleteChar(charId) }
                ]
            });
        }
    }

    async function doDeleteChar(charId) {
        try {
            // Remove from current chat
            const chat = await Store.get(Store.STORES.chats, currentChatId);
            if (chat) {
                chat.characterIds = (chat.characterIds || []).filter(id => id !== charId);
                await Store.put(Store.STORES.chats, chat);
            }

            // Check if used in other chats
            const allChats = await Store.getAll(Store.STORES.chats);
            const usedElsewhere = allChats.some(c => c.id !== currentChatId && c.characterIds?.includes(charId));
            if (!usedElsewhere) {
                await Store.del(Store.STORES.characters, charId);
                const diaries = await Store.getAllByIndex(Store.STORES.diaries, 'charId', charId);
                for (const d of diaries) await Store.del(Store.STORES.diaries, d.id);
            }

            showToast('角色已删除');
        } catch (e) {
            showToast('删除失败: ' + e.message);
        }
    }

    async function openSummaryView() {
        const summaries = await Store.getAllByIndex(Store.STORES.summaries, 'chatId', currentChatId);
        summaries.sort((a, b) => (a.messageRange?.from || 0) - (b.messageRange?.from || 0));

        let content = '';
        if (summaries.length === 0) {
            content = '<div style="text-align:center;color:var(--text-tertiary);padding:20px">暂无总结（每30条消息自动生成）</div>';
        } else {
            content = summaries.map(s => `
                <div class="summary-card">
                    <div class="summary-header">
                        <span class="summary-range">消息 ${s.messageRange?.from || 0} - ${s.messageRange?.to || 0}</span>
                        <div class="summary-actions">
                            <button class="summary-action-btn" onclick="ChatApp.editSummary('${s.id}')">编辑</button>
                        </div>
                    </div>
                    <div class="summary-content">${escapeHtml(s.content)}</div>
                </div>`).join('');
        }

        Phone.showModal({
            title: '对话总结',
            content: `<div style="max-height:400px;overflow-y:auto">${content}</div>`,
            actions: [{ label: '关闭', type: 'secondary' }]
        });
    }

    async function editSummary(sumId) {
        const sum = await Store.get(Store.STORES.summaries, sumId);
        if (!sum) return;
        Phone.closeModal();
        setTimeout(() => {
            Phone.showModal({
                title: '编辑总结',
                content: `<textarea class="form-textarea" id="sum-edit-content" rows="10" style="min-height:200px">${escapeHtml(sum.content)}</textarea>`,
                actions: [
                    { label: '取消', type: 'secondary', onClick: () => openSummaryView() },
                    { label: '保存', type: 'primary', onClick: async () => {
                        sum.content = document.getElementById('sum-edit-content').value;
                        sum.editedAt = Date.now();
                        await Store.put(Store.STORES.summaries, sum);
                        showToast('总结已保存');openSummaryView();
                    }}
                ]
            });
        }, 350);
    }

    async function openDiaryView() {
        const chat = await Store.get(Store.STORES.chats, currentChatId);
        if (!chat) return;

        let content = '';
        for (const cid of (chat.characterIds || [])) {
            const c = await Store.get(Store.STORES.characters, cid);
            const diaries = await Store.getAllByIndex(Store.STORES.diaries, 'charId', cid);
            const diary = diaries[0];
            content += `
                <div class="summary-card">
                    <div class="summary-header">
                        <span style="font-weight:600;color:var(--text-primary)">${escapeHtml(c?.name || '角色')} 的日记</span>
                        <div class="summary-actions">
                            <button class="summary-action-btn" onclick="ChatApp.editDiary('${cid}')">编辑</button>
                        </div>
                    </div>
                    <div class="summary-content">${diary ? escapeHtml(diary.content) : '<span style="color:var(--text-tertiary)">暂无日记（AI 会在聊天中自动记录）</span>'}</div>
                </div>`;
        }

        if (!content) content = '<div style="text-align:center;color:var(--text-tertiary);padding:20px">无角色日记</div>';

        Phone.showModal({
            title: 'AI 日记',
            content: `<div style="max-height:400px;overflow-y:auto">${content}</div>`,
            actions: [{ label: '关闭', type: 'secondary' }]
        });
    }

    async function editDiary(charId) {
        const diaries = await Store.getAllByIndex(Store.STORES.diaries, 'charId', charId);
        const diary = diaries[0];
        Phone.closeModal();
        setTimeout(() => {
            Phone.showModal({
                title: '编辑日记',
                content: `<textarea class="form-textarea" id="diary-edit-content" rows="10" style="min-height:200px">${escapeHtml(diary?.content || '')}</textarea>`,
                actions: [
                    { label: '取消', type: 'secondary', onClick: () => openDiaryView() },
                    { label: '保存', type: 'primary', onClick: async () => {
                        const content = document.getElementById('diary-edit-content').value;
                        if (diary) {
                            diary.content = content;
                            diary.updatedAt = Date.now();
                            await Store.put(Store.STORES.diaries, diary);
                        } else {
                            await Store.put(Store.STORES.diaries, {
                                id: 'diary_' + charId, charId, content, updatedAt: Date.now()
                            });
                        }
                        showToast('日记已保存');
                        openDiaryView();
                    }}
                ]
            });
        }, 350);
    }

    async function openCharInfoFromChat() {
        const chat = await Store.get(Store.STORES.chats, currentChatId);
        if (!chat || !chat.characterIds?.length) {
            showToast('此会话无角色');
            return;
        }
        const charId = chat.characterIds[0];
        const char = await Store.get(Store.STORES.characters, charId);
        if (!char) return;

        const allKB = await Store.getAll(Store.STORES.knowledgeBooks);

        Phone.showModal({
            title: '编辑角色',
            content: `<div class="char-form">
                <div class="char-avatar-picker">
                    <div class="char-avatar-preview" id="char-avatar-preview">
                        ${char.avatar ? `<img src="${escapeHtml(char.avatar)}" alt="" style="width:100%;height:100%;object-fit:cover">` : '👤'}
                    </div>
                    <div style="flex:1">
                        <div class="form-group" style="margin-bottom:0">
                            <label class="form-label">头像 URL</label>
                            <input class="form-input" id="char-avatar" value="${escapeHtml(char.avatar)}" placeholder="https://...">
                        </div></div>
                </div>
                <div class="form-group">
                    <label class="form-label">名称</label>
                    <input class="form-input" id="char-name" value="${escapeHtml(char.name)}">
                </div>
                <div class="form-group">
                    <label class="form-label">人设描述</label>
                    <textarea class="form-textarea" id="char-persona" rows="5">${escapeHtml(char.persona)}</textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">角色专属提示词</label>
                    <textarea class="form-textarea" id="char-prompt" rows="3">${escapeHtml(char.globalPrompt)}</textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">绑定知识书</label>
                    <div id="char-kb-list" style="display:flex;flex-direction:column;gap:6px">
                        ${allKB.map(kb => `
                            <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text-secondary)">
                                <input type="checkbox" value="${kb.id}" ${char.knowledgeBooks?.includes(kb.id) ? 'checked' : ''}>
                                ${escapeHtml(kb.name)}
                            </label>`).join('') || '<div style="font-size:12px;color:var(--text-tertiary)">暂无知识书</div>'}
                    </div>
                </div>
                <div class="form-group" style="margin-bottom:0">
                    <label class="form-label">自定义气泡 CSS</label>
                    <textarea class="form-textarea" id="char-css" rows="3" placeholder=".chat-bubble { background:}">${escapeHtml(char.customCSS)}</textarea>
                </div></div>`,
            actions: [
                { label: '取消', type: 'secondary' },
                { label: '保存', type: 'primary', onClick: async () => {
                    char.name = document.getElementById('char-name').value.trim() || char.name;
                    char.avatar = document.getElementById('char-avatar').value.trim();
                    char.persona = document.getElementById('char-persona').value.trim();
                    char.globalPrompt = document.getElementById('char-prompt').value.trim();
                    char.customCSS = document.getElementById('char-css').value.trim();
                    char.knowledgeBooks = [];
                    document.querySelectorAll('#char-kb-list input[type="checkbox"]:checked').forEach(cb => {
                        char.knowledgeBooks.push(cb.value);
                    });
                    await Store.put(Store.STORES.characters, char);
                    const chat = await Store.get(Store.STORES.chats, currentChatId);
                    if (chat && chat.type === 'single') {
                        chat.name = char.name;
                        await Store.put(Store.STORES.chats, chat);
                    }
                    showToast('角色已保存');
                }}
            ]
        });

        // Live avatar preview
        setTimeout(() => {
            const avatarInput = document.getElementById('char-avatar');
            const preview = document.getElementById('char-avatar-preview');
            if (avatarInput && preview) {
                avatarInput.addEventListener('input', () => {
                    const url = avatarInput.value.trim();
                    if (url) {
                        preview.innerHTML = `<img src="${escapeHtml(url)}" alt="" style="width:100%;height:100%;object-fit:cover" onerror="this.parentElement.textContent='👤'">`;
                    } else {
                        preview.textContent = '👤';
                    }
                });
            }
        }, 100);
    }

    async function clearChatMessages() {
        Phone.showModal({
            title: '清空消息',
            content: '<div style="font-size:14px;color:var(--text-secondary);text-align:center">确定清空所有消息？此操作不可恢复。</div>',
            actions: [
                { label: '取消', type: 'secondary' },
                { label: '清空', type: 'primary', onClick: async () => {
                    showToast('正在清空...');
                    const msgs = await Store.getAllByIndex(Store.STORES.messages, 'chatId', currentChatId);
                    for (const m of msgs) await Store.del(Store.STORES.messages, m.id);
                    const sums = await Store.getAllByIndex(Store.STORES.summaries, 'chatId', currentChatId);
                    for (const s of sums) await Store.del(Store.STORES.summaries, s.id);
                    const chat = await Store.get(Store.STORES.chats, currentChatId);
                    if (chat) {
                        chat.messageCount = 0;
                        chat.lastMessage = '';
                        chat.updatedAt = Date.now();
                        await Store.put(Store.STORES.chats, chat);
                    }
                    showToast('消息已清空');
                    await loadMessages();
                }}
            ]
        });
    }

    /* ---- 工具 ---- */
    function scrollToBottom() {
        const container = document.getElementById('chat-messages');
        if (container) requestAnimationFrame(() => { container.scrollTop = container.scrollHeight; });
    }

    function showToast(text) {
        const view = document.getElementById('chat-view') || document.querySelector('.chat-list-container');
        if (!view) return;
        const existing = view.querySelector('.chat-toast');
        if (existing) existing.remove();
        const toast = document.createElement('div');
        toast.className = 'chat-toast';
        toast.textContent = text;
        view.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
    }

    /* ======== 公开API ======== */
    return {
        render, init,
        backToList, addSticker, createKnowledgeBook, openKnowledgeManager, openStickerManager,
        exitChat, sendSilent, sendAndTrigger, sendSpecialMsg, toggleStickerPanel, openChatMenu, clearReply, retryLastResponse,
        addKBEntry, removeKBEntry, toggleKBEntry, saveKBEntry,
        editSummary, editDiary, openPromptSettings
    };
})();

