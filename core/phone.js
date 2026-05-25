// core/phone.js
const Phone = (() => {
    let currentPage = 0;
    let totalPages = 1;
    let touchStartX = 0;
    let touchDeltaX = 0;
    let isDragging = false;
    let isMouseDown = false;
    let touchStartY = 0;
    let touchStartY = 0;

    const defaultApps = [
        { id: 'chat',     name: '聊天',   icon: '💬', color: 'rgba(255,255,255,0.08)' },
        { id: 'calendar', name: '日历',   icon: '📅', color: 'rgba(255,255,255,0.08)' },
        { id: 'academic', name: '学术',   icon: '📚', color: 'rgba(255,255,255,0.08)' },
        { id: 'forum',    name: '论坛',   icon: '🏛️', color: 'rgba(255,255,255,0.08)' },
        { id: 'moments',  name: '朋友圈', icon: '◐',  color: 'rgba(255,255,255,0.08)' },
        { id: 'settings', name: '设置',   icon: '⚙️', color: 'rgba(255,255,255,0.08)' }
    ];

    const dockAppIds = ['chat', 'calendar', 'settings'];

    // ── 启动 ──────────────────────────────────────────────
    async function init() {
        Logger.info('Phone booting...');
        await Store.init();
        Logger.info('Database initialized');
        await Scheduler.init();
        await loadSettings();
        registerApps();
        await renderDesktop();
        setupSwipe();
        setupDesktopLongPress();
        Widget.startUpdates();
        updateStatusTime();
        setInterval(updateStatusTime, 1000);

        if ('serviceWorker' in navigator) {
            try {
                await navigator.serviceWorker.register('./sw.js');
            } catch (e) {
                Logger.warn('SW registration failed', e.message);
            }
        }
        Logger.info('Phone boot complete');
    }

    async function loadSettings() {
        const theme = await Store.getSetting('theme', 'dark');
        document.documentElement.setAttribute('data-theme', theme);

        const showSB = await Store.getSetting('show_statusbar', true);
        const sb = document.getElementById('status-bar');
        if (!showSB) sb.classList.add('hidden-bar');
        else sb.classList.remove('hidden-bar');

        const wpUrl = await Store.getSetting('wallpaper_url', '');
        if (wpUrl) {
            const img = document.getElementById('wallpaper-custom');
            img.src = wpUrl;
            img.classList.remove('hidden');
            document.getElementById('wallpaper-default').classList.add('hidden');
        }
    }

    function registerApps() {
        Router.register('settings', SettingsApp);
        Router.register('chat', ChatApp);

        ['calendar', 'academic', 'forum', 'moments'].forEach(id => {
            if (!Router.getApp(id)) {
                const info = defaultApps.find(a => a.id === id);
                Router.register(id, {
                    render: () => `
                        <div class="app-header">
                            <button class="app-header-btn app-back-btn" onclick="Router.close()">返回</button>
                            <span class="app-header-title">${info?.name || id}</span>
                            <span style="width:60px"></span>
                        </div>
                        <div class="app-body" style="display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px">
                            <div style="font-size:56px;opacity:0.3">${info?.icon || '📱'}</div>
                            <div style="font-size:16px;color:var(--text-secondary);font-weight:500">即将推出</div>
                            <div style="font-size:13px;color:var(--text-tertiary)">Phase 2+ 开发中</div>
                        </div>`,
                    init: () => {}
                });
            }
        });
    }

    // ── 桌面渲染 ──────────────────────────────────────────
        async function renderDesktop() {
        const pagesContainer = document.getElementById('desktop-pages');
        const dotsContainer  = document.getElementById('page-dots');
        const dockInner      = document.getElementById('dock-inner');

        let widgets = await Store.getAll(Store.STORES.widgets);

        if (widgets.length === 0) {
            const defaults = [
                { id: 'w_clock',  type: 'clock',    size: '2x2', page: 0, order: 0, data: {} },
                { id: 'w_cal',    type: 'calendar',  size: '2x2', page: 0, order: 1, data: {} },
                { id: 'w_status', type: 'status',    size: '4x2', page: 0, order: 2, data: { label: 'IPHONEEX', sub: '✦ AI Phone Simulator' } },
                { id: 'w_memo',   type: 'memo',      size: '4x2', page: 0, order: 3, data: { title: '📝 备忘录', text: '长按小组件可编辑，长按桌面空白处可添加组件' } }
            ];
            for (const w of defaults) await Store.put(Store.STORES.widgets, w);
            widgets = defaults;
        }

        // ── 把 widget 和 app icon 合并成统一的"桌面项目"列表 ──
        // widget 用 order 排序，app icons 作为一个整体行追加在最后
        const desktopApps = defaultApps.filter(a => !dockAppIds.includes(a.id));

        // 每页的 widget
        const pageWidgets = widgets
            .filter(w => (w.page || 0) === 0)
            .sort((a, b) => (a.order || 0) - (b.order || 0));

        totalPages = 1;
        pagesContainer.innerHTML = '';
        dotsContainer.innerHTML  = '';

        const pageEl = document.createElement('div');
        pageEl.className = 'desktop-page';

        // ── 混排：widget 按 size 分行，2x2 两个并排，4x2/4x4 独占一行 ──
        let i = 0;
        while (i < pageWidgets.length) {
            const w    = pageWidgets[i];
            const size = w.size || Widget.types[w.type]?.defaultSize || '2x2';
            const row  = document.createElement('div');
            row.className = 'desktop-row';

            if (size === '4x2' || size === '4x4') {
                const wEl = Widget.create(w);
                if (wEl) row.appendChild(wEl);
                pageEl.appendChild(row);
                i++;
            } else {
                // 2x2：尝试和下一个 2x2 并排
                const wEl = Widget.create(w);
                if (wEl) row.appendChild(wEl);

                if (i + 1 < pageWidgets.length) {
                    const next     = pageWidgets[i + 1];
                    const nextSize = next.size || Widget.types[next.type]?.defaultSize || '2x2';
                    if (nextSize === '2x2') {
                        const wEl2 = Widget.create(next);
                        if (wEl2) row.appendChild(wEl2);
                        i++;
                    }
                }
                pageEl.appendChild(row);
                i++;
            }
        }

        // ── App 图标混排在 widget 之后，每行最多 4 个 ──────────
        if (desktopApps.length > 0) {
            const ICONS_PER_ROW = 4;
            for (let r = 0; r < desktopApps.length; r += ICONS_PER_ROW) {
                const iconsRow = document.createElement('div');
                iconsRow.className = 'app-icons-row';
                desktopApps.slice(r, r + ICONS_PER_ROW).forEach(app => {
                    iconsRow.appendChild(createAppIcon(app));
                });
                pageEl.appendChild(iconsRow);
            }
        }

        pagesContainer.appendChild(pageEl);

        // Page dot
        const dot = document.createElement('div');
        dot.className = 'page-dot active';
        dot.addEventListener('click', () => goToPage(0));
        dotsContainer.appendChild(dot);

        // Dock
        dockInner.innerHTML = '';
        dockAppIds.forEach(id => {
            const info = defaultApps.find(a => a.id === id);
            if (info) dockInner.appendChild(createAppIcon(info));
        });

        updatePagePosition(false);
    }

    function createAppIcon(appInfo) {
        const wrapper = document.createElement('div');
        wrapper.className = 'app-icon-wrapper';

        wrapper.addEventListener('click', () => {
            if (wrapper._longPressed) { wrapper._longPressed = false; return; }
            Router.open(appInfo.id);
        });

        const icon = document.createElement('div');
        icon.className = 'app-icon';
        if (appInfo.customIcon) {
            const img = document.createElement('img');
            img.src = appInfo.customIcon;
            img.alt = appInfo.name;
            img.onerror = () => { img.remove(); icon.textContent = appInfo.icon || '📱'; };
            icon.appendChild(img);
        } else {
            icon.textContent = appInfo.icon || '📱';
        }

        const label = document.createElement('div');
        label.className = 'app-icon-label';
        label.textContent = appInfo.name;

        wrapper.appendChild(icon);
        wrapper.appendChild(label);

        let pressTimer;
        wrapper.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            wrapper._longPressed = true;
            showAppContextMenu(e, appInfo);
        });
        wrapper.addEventListener('pointerdown', (e) => {
            pressTimer = setTimeout(() => {
                wrapper._longPressed = true;
                showAppContextMenu(e, appInfo);
            }, 500);
        });
        wrapper.addEventListener('pointerup',    () => clearTimeout(pressTimer));
        wrapper.addEventListener('pointermove',  () => clearTimeout(pressTimer));
        wrapper.addEventListener('pointerleave', () => clearTimeout(pressTimer));

        return wrapper;
    }

    function showAppContextMenu(e, appInfo) {
        const phoneRect = document.getElementById('phone-container').getBoundingClientRect();
        const x = (e.clientX || e.pageX) - phoneRect.left;
        const y = (e.clientY || e.pageY) - phoneRect.top + 8;
        showContextMenu(x, y, [
            { label: '打开',     icon: '↗', onClick: () => Router.open(appInfo.id) },
            { type: 'separator' },
            { label: '编辑图标', icon: '✎', onClick: () => editAppIcon(appInfo) }
        ]);
    }

    async function editAppIcon(appInfo) {
        showModal({
            title: `编辑 ${appInfo.name}`,
            content: `
                <div class="form-group">
                    <label class="form-label">名称</label>
                    <input class="form-input" id="edit-app-name" value="${appInfo.name}">
                </div>
                <div class="form-group">
                    <label class="form-label">Emoji 图标</label>
                    <input class="form-input" id="edit-app-emoji" value="${appInfo.icon || ''}" placeholder="emoji">
                </div>
                <div class="form-group" style="margin-bottom:0">
                    <label class="form-label">自定义图标 URL</label>
                    <input class="form-input" id="edit-app-icon-url" value="${appInfo.customIcon || ''}" placeholder="https://...">
                </div>`,
            actions: [
                { label: '取消', type: 'secondary' },
                {
                    label: '保存', type: 'primary',
                    onClick: async () => {
                        appInfo.name = document.getElementById('edit-app-name').value || appInfo.name;
                        appInfo.icon = document.getElementById('edit-app-emoji').value || appInfo.icon;
                        const url = document.getElementById('edit-app-icon-url').value;
                        if (url) appInfo.customIcon = url; else delete appInfo.customIcon;
                        await renderDesktop();
                    }
                }
            ]
        });
    }

    // ── 桌面长按 → 添加小组件 ─────────────────────────────
    function setupDesktopLongPress() {
        const vp = document.getElementById('desktop-viewport');
        let pressTimer;
        let startX, startY;

        const start = (e) => {
            const t = e.touches?.[0] || e;
            startX = t.clientX; startY = t.clientY;
            pressTimer = setTimeout(() => {
                // 只在没有拖动的情况下触发
                showAddWidgetMenu();
            }, 700);
        };
        const cancel = (e) => {
            const t = e.touches?.[0] || e;
            if (t && (Math.abs(t.clientX - startX) > 8 || Math.abs(t.clientY - startY) > 8)) {
                clearTimeout(pressTimer);
            }
        };
        const end = () => clearTimeout(pressTimer);

        vp.addEventListener('touchstart',  start,  { passive: true });
        vp.addEventListener('touchmove',   cancel, { passive: true });
        vp.addEventListener('touchend',    end);
        vp.addEventListener('contextmenu', (e) => {
            // 桌面空白区域右键
            if (e.target.closest('.widget-wrapper') || e.target.closest('.app-icon-wrapper')) return;
            e.preventDefault();
            showAddWidgetMenu();
        });
    }

    function showAddWidgetMenu() {
        // 小组件类型列表
        const widgetTypes = [
    { type: 'circle_photo',   label: '⭕ 圆形照片',    size: '2x2' },
    { type: 'photo',          label: '🖼️ 方形照片',    size: '2x2' },
    { type: 'profile',        label: '👤 信息条',      size: '4x2' },
    { type: 'cute_player',    label: '🤍 心动播放器',  size: '4x2' },
    { type: 'music',          label: '🎵 音乐播放器',  size: '4x2' },
    { type: 'cute_pet',       label: '🦈 星空萌宠',    size: '2x2' },
    { type: 'cute_date',      label: '☁️ 云朵日期',    size: '2x2' },
    { type: 'cute_icons',     label: '✨ 可爱图标组',  size: '2x2' },
    { type: 'tag',            label: '🏷️ 标签条',      size: '2x2' },
    { type: 'clock',          label: '🕐 时钟',        size: '2x2' },
    { type: 'calendar',       label: '📅 日历',        size: '2x2' },
    { type: 'memo',           label: '📝 备忘录',      size: '4x2' },
    { type: 'custom',         label: '✦ 自定义文字',   size: '2x2' },
    { type: 'status',         label: '⚡ 状态条',      size: '4x2' },
    { type: 'control_center', label: '🎛️ 控制中心',    size: '2x2' },
];

        const listHtml = widgetTypes.map((w, i) =>
            `<div class="add-widget-item" data-idx="${i}">
                <span class="add-widget-label">${w.label}</span>
                <span class="add-widget-size">${w.size === '4x2' ? '宽' : '方'}</span>
            </div>`
        ).join('');

        showModal({
            title: '添加小组件',
            content: `<div class="add-widget-list">${listHtml}</div>`,
            actions: [{ label: '取消', type: 'secondary' }]
        });

        // 绑定点击
        document.querySelectorAll('.add-widget-item').forEach(el => {
            el.addEventListener('click', async () => {
                const idx  = parseInt(el.dataset.idx);
                const info = widgetTypes[idx];
                closeModal();

                // 生成唯一 id
                const id = 'w_' + Date.now();
                const allWidgets = await Store.getAll(Store.STORES.widgets);
                const maxOrder   = allWidgets.reduce((m, w) => Math.max(m, w.order || 0), -1);

                const newWidget = {
                    id,
                    type:  info.type,
                    size:  info.size,
                    page:  currentPage,
                    order: maxOrder + 1,
                    data:  {}
                };
                await Store.put(Store.STORES.widgets, newWidget);
                await renderDesktop();
                showToast('✓ 已添加，长按组件可编辑');
            });
        });
    }

    // ── Toast ─────────────────────────────────────────────
    function showToast(msg, type = 'success') {
        const existing = document.querySelector('.phone-toast');
        if (existing) existing.remove();

        const t = document.createElement('div');
        t.className = 'phone-toast';
        t.textContent = msg;
        if (type === 'error') t.style.background = 'var(--danger, #ff3b30)';
        document.getElementById('phone-container').appendChild(t);
        requestAnimationFrame(() => t.classList.add('phone-toast-show'));
        setTimeout(() => {
            t.classList.remove('phone-toast-show');
            setTimeout(() => t.remove(), 300);
        }, 2200);
    }

    // ── 滑动翻页 ──────────────────────────────────────────
   // ── 滑动翻页 ──────────────────────────────────────────
function setupSwipe() {
    const vp = document.getElementById('desktop-viewport');

    vp.addEventListener('touchstart', onSwipeStart, { passive: true });
    vp.addEventListener('touchmove',  onSwipeMove,  { passive: false });
    vp.addEventListener('touchend',   onSwipeEnd);

    vp.addEventListener('mousedown', (e) => {
        isMouseDown = true;
        onSwipeStart({ touches: [{ clientX: e.clientX, clientY: e.clientY }] });
    });
    vp.addEventListener('mousemove', (e) => {
        if (!isMouseDown) return;
        onSwipeMove({ touches: [{ clientX: e.clientX, clientY: e.clientY }], preventDefault: () => e.preventDefault() });
    });
    vp.addEventListener('mouseup',    () => { if (isMouseDown) { isMouseDown = false; onSwipeEnd(); } });
    vp.addEventListener('mouseleave', () => { if (isMouseDown) { isMouseDown = false; onSwipeEnd(); } });
}

function onSwipeStart(e) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchDeltaX = 0;
    isDragging  = false;
    document.getElementById('desktop-pages').style.transition = 'none';
}

function onSwipeMove(e) {
    const dx = e.touches[0].clientX - touchStartX;
    const dy = e.touches[0].clientY - touchStartY;

    if (!isDragging) {
        if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.5) {
            isDragging = true;
        } else if (Math.abs(dy) > 10) {
            // 垂直方向先动，放弃横滑，让浏览器处理滚动
            return;
        }
    }

    if (isDragging) {
        if (e.cancelable) e.preventDefault();
        touchDeltaX = dx;
        const vpWidth = document.getElementById('desktop-viewport').offsetWidth;
        const offset  = -(currentPage * 100) + (dx / vpWidth) * 100;
        document.getElementById('desktop-pages').style.transform = `translateX(${offset}%)`;
    }
}

function onSwipeEnd() {
    if (!isDragging) return;
    isDragging = false;
    const threshold = document.getElementById('desktop-viewport').offsetWidth * 0.2;
    if (touchDeltaX < -threshold && currentPage < totalPages - 1) currentPage++;
    else if (touchDeltaX > threshold && currentPage > 0) currentPage--;
    updatePagePosition(true);
}

    function goToPage(i) {
        currentPage = Math.max(0, Math.min(i, totalPages - 1));
        updatePagePosition(true);
    }

    function updatePagePosition(animate) {
        const pages = document.getElementById('desktop-pages');
        pages.style.transition = animate ? 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)' : 'none';
        pages.style.transform  = `translateX(-${currentPage * 100}%)`;
        document.querySelectorAll('.page-dot').forEach((d, i) => {
            d.classList.toggle('active', i === currentPage);
        });
    }

    function updateStatusTime() {
        const el = document.getElementById('status-time');
        if (el) {
            el.textContent = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        }
    }

    // ── Modal ─────────────────────────────────────────────
    // 关键修复：onClick 执行完后才 closeModal，而不是无条件立刻关
    function showModal({ title, content, actions = [] }) {
        const layer = document.getElementById('modal-layer');
        layer.classList.remove('hidden');

        const actionsHtml = actions.map((a, i) =>
            `<button class="modal-btn modal-btn-${a.type || 'secondary'}" data-action="${i}">${a.label}</button>`
        ).join('');

        layer.innerHTML = `
            <div class="modal-box">
                ${title ? `<div class="modal-title">${title}</div>` : ''}
                <div class="modal-content">${content}</div>
                ${actionsHtml ? `<div class="modal-actions">${actionsHtml}</div>` : ''}
            </div>`;

        layer.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const action = actions[parseInt(btn.dataset.action)];
                if (action?.onClick) {
                    // 有 onClick 的按钮：执行 onClick，由 onClick 内部决定是否关闭
                    // （保存类操作需要先读取 DOM 值，所以不能提前关）
                    await action.onClick();
                } else {
                    // 没有 onClick（取消按钮）：直接关
                    closeModal();
                }
            });
        });

        layer.addEventListener('click', (e) => {
            if (e.target === layer) closeModal();
        });
    }

    function closeModal() {
        const layer = document.getElementById('modal-layer');
        layer.classList.add('hidden');
        layer.innerHTML = '';
    }

    // ── Context Menu ──────────────────────────────────────
    function showContextMenu(x, y, items) {
        const layer = document.getElementById('context-menu-layer');
        layer.classList.remove('hidden');

        const pc   = document.getElementById('phone-container');
        const maxX = pc.offsetWidth  - 220;
        const maxY = pc.offsetHeight - (items.length * 44 + 20);
        const sx   = Math.min(Math.max(x, 10), maxX);
        const sy   = Math.min(Math.max(y, 10), maxY);

        const itemsHtml = items.map((item, i) => {
            if (item.type === 'separator') return '<div class="context-menu-separator"></div>';
            return `<div class="context-menu-item ${item.danger ? 'danger' : ''}" data-action="${i}">
                <span>${item.label}</span>
                <span style="opacity:0.4">${item.icon || ''}</span>
            </div>`;
        }).join('');

        layer.innerHTML = `
            <div class="context-menu-backdrop"></div>
            <div class="context-menu" style="left:${sx}px;top:${sy}px">${itemsHtml}</div>`;

        layer.querySelectorAll('[data-action]').forEach(el => {
            el.addEventListener('click', () => {
                const idx = parseInt(el.dataset.action);
                if (items[idx]?.onClick) items[idx].onClick();
                closeContextMenu();
            });
        });

        layer.querySelector('.context-menu-backdrop').addEventListener('click', closeContextMenu);
    }

    function closeContextMenu() {
        const layer = document.getElementById('context-menu-layer');
        layer.classList.add('hidden');
        layer.innerHTML = '';
    }

    async function refreshDesktop() {
        await renderDesktop();
    }

    return {
        init,
        showModal,
        closeModal,
        showToast,
        showContextMenu,
        closeContextMenu,
        refreshDesktop,
        loadSettings
    };
})();


