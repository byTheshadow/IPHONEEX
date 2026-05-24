// core/phone.js
const Phone = (() => {
    let currentPage = 0;
    let totalPages = 1;
    let touchStartX = 0;
    let touchDeltaX = 0;
    let isDragging = false;
    let isMouseDown = false;

    const defaultApps = [
        { id: 'chat', name: '聊天', icon: '💬', color: 'rgba(255,255,255,0.08)' },
        { id: 'calendar', name: '日历', icon: '📅', color: 'rgba(255,255,255,0.08)' },
        { id: 'academic', name: '学术', icon: '📚', color: 'rgba(255,255,255,0.08)' },
        { id: 'forum', name: '论坛', icon: '🏛️', color: 'rgba(255,255,255,0.08)' },
        { id: 'moments', name: '朋友圈', icon: '◐', color: 'rgba(255,255,255,0.08)' },
        { id: 'settings', name: '设置', icon: '⚙️', color: 'rgba(255,255,255,0.08)' }
    ];

    const dockAppIds = ['chat', 'calendar', 'settings'];

    async function init() {
        Logger.info('Phone booting...');
        await Store.init();
        Logger.info('Database initialized');
        await Scheduler.init();
        await loadSettings();
        registerApps();
        await renderDesktop();
        setupSwipe();
        Widget.startUpdates();
        updateStatusTime();
        setInterval(updateStatusTime, 1000);

        // Register service worker
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
            img.classList.remove('hidden');document.getElementById('wallpaper-default').classList.add('hidden');
        }
    }

    function registerApps() {
        // Settings is already defined globally
        Router.register('settings', SettingsApp);
        Router.register('chat', ChatApp);


        // Placeholder apps for Phase 2+
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

    async function renderDesktop() {
        const pagesContainer = document.getElementById('desktop-pages');
        const dotsContainer = document.getElementById('page-dots');
        const dockInner = document.getElementById('dock-inner');

        let widgets = await Store.getAll(Store.STORES.widgets);

        // Default widgets on first run
        if (widgets.length === 0) {
            const defaults = [
                { id: 'w_clock', type: 'clock', size: '2x2', page: 0, order: 0, data: {} },
                { id: 'w_cal', type: 'calendar', size: '2x2', page: 0, order: 1, data: {} },
                { id: 'w_status', type: 'status', size: '4x2', page: 0, order: 2, data: { label: 'IPHONEEX', sub: '✦ AI Phone Simulator' } },
                { id: 'w_memo', type: 'memo', size: '4x2', page: 0, order: 3, data: { title: '📝 备忘录', text: '长按小组件可以编辑内容' } }
            ];
            for (const w of defaults) {
                await Store.put(Store.STORES.widgets, w);
            }widgets = defaults;
        }

        // Get non-dock apps for desktop
        const desktopApps = defaultApps.filter(a => !dockAppIds.includes(a.id));

        // Build pages
        const pages = [{ widgets: widgets.filter(w => (w.page || 0) === 0), apps: desktopApps }];
        totalPages = pages.length;

        pagesContainer.innerHTML = '';
        dotsContainer.innerHTML = '';

        pages.forEach((page, pageIndex) => {
            const pageEl = document.createElement('div');
            pageEl.className = 'desktop-page';

            // Sort widgets by order
            const sortedWidgets = [...page.widgets].sort((a, b) => (a.order || 0) - (b.order || 0));

            // Render widgets in rows
            let i = 0;
            while (i < sortedWidgets.length) {
                const w = sortedWidgets[i];
                const size = w.size || Widget.types[w.type]?.defaultSize || '2x2';

                if (size === '4x2' || size === '4x4') {
                    // Full width row
                    const row = document.createElement('div');
                    row.className = 'desktop-row';
                    const wEl = Widget.create(w);
                    if (wEl) row.appendChild(wEl);
                    pageEl.appendChild(row);i++;
                } else {
                    // 2x2: pair two widgets side by side
                    const row = document.createElement('div');
                    row.className = 'desktop-row';
                    const wEl = Widget.create(w);
                    if (wEl) row.appendChild(wEl);

                    if (i + 1 < sortedWidgets.length) {
                        const next = sortedWidgets[i + 1];
                        const nextSize = next.size || Widget.types[next.type]?.defaultSize || '2x2';
                        if (nextSize === '2x2') {
                            const wEl2 = Widget.create(next);
                            if (wEl2) row.appendChild(wEl2);
                            i++;
                        }
                    }
                    pageEl.appendChild(row);i++;
                }
            }

            // App icons row
            if (page.apps && page.apps.length > 0) {
                const iconsRow = document.createElement('div');
                iconsRow.className = 'app-icons-row';
                page.apps.forEach(app => {
                    iconsRow.appendChild(createAppIcon(app));
                });
                pageEl.appendChild(iconsRow);
            }

            pagesContainer.appendChild(pageEl);

            // Page dot
            const dot = document.createElement('div');
            dot.className = `page-dot ${pageIndex === currentPage ? 'active' : ''}`;
            dot.addEventListener('click', () => goToPage(pageIndex));
            dotsContainer.appendChild(dot);
        });

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
        wrapper.addEventListener('click', (e) => {
            // Don't open if we just finished a long press
            if (wrapper._longPressed) {
                wrapper._longPressed = false;
                return;
            }
            Router.open(appInfo.id);
        });

        const icon = document.createElement('div');
        icon.className = 'app-icon';

        if (appInfo.customIcon) {
            const img = document.createElement('img');
            img.src = appInfo.customIcon;
            img.alt = appInfo.name;
            img.onerror = () => {
                img.remove();
                icon.textContent = appInfo.icon || '📱';
            };
            icon.appendChild(img);
        } else {
            icon.textContent = appInfo.icon || '📱';
        }

        const label = document.createElement('div');
        label.className = 'app-icon-label';
        label.textContent = appInfo.name;

        wrapper.appendChild(icon);
        wrapper.appendChild(label);

        // Context menu on long press / right click
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
        wrapper.addEventListener('pointerup', () => clearTimeout(pressTimer));
        wrapper.addEventListener('pointermove', () => clearTimeout(pressTimer));
        wrapper.addEventListener('pointerleave', () => clearTimeout(pressTimer));

        return wrapper;
    }

    function showAppContextMenu(e, appInfo) {
        const phoneRect = document.getElementById('phone-container').getBoundingClientRect();
        const x = (e.clientX || e.pageX) - phoneRect.left;
        const y = (e.clientY || e.pageY) - phoneRect.top + 8;

        showContextMenu(x, y, [
            { label: '打开', icon: '↗', onClick: () => Router.open(appInfo.id) },
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
                    label: '保存', type: 'primary', onClick: async () => {
                        appInfo.name = document.getElementById('edit-app-name').value || appInfo.name;
                        appInfo.icon = document.getElementById('edit-app-emoji').value || appInfo.icon;
                        const url = document.getElementById('edit-app-icon-url').value;
                        if (url) appInfo.customIcon = url;
                        else delete appInfo.customIcon;
                        await renderDesktop();
                    }
                }
            ]
        });
    }

    //---- Swipe ----
    function setupSwipe() {
        const vp = document.getElementById('desktop-viewport');

        // Touch events
        vp.addEventListener('touchstart', onSwipeStart, { passive: true });
        vp.addEventListener('touchmove', onSwipeMove, { passive: false });
        vp.addEventListener('touchend', onSwipeEnd);

        // Mouse events for desktop
        vp.addEventListener('mousedown', (e) => {
            isMouseDown = true;
            onSwipeStart({ touches: [{ clientX: e.clientX }] });
        });
        vp.addEventListener('mousemove', (e) => {
            if (!isMouseDown) return;
            onSwipeMove({
                touches: [{ clientX: e.clientX }],
                preventDefault: () => e.preventDefault()
            });
        });
        vp.addEventListener('mouseup', () => {
            if (isMouseDown) {
                isMouseDown = false;
                onSwipeEnd();
            }
        });
        vp.addEventListener('mouseleave', () => {
            if (isMouseDown) {
                isMouseDown = false;
                onSwipeEnd();
            }
        });
    }

    function onSwipeStart(e) {
        touchStartX = e.touches[0].clientX;
        touchDeltaX = 0;
        isDragging = false;
        document.getElementById('desktop-pages').style.transition = 'none';
    }

    function onSwipeMove(e) {
        const dx = e.touches[0].clientX - touchStartX;
        if (!isDragging && Math.abs(dx) > 10) isDragging = true;
        if (isDragging) {
            if (e.preventDefault) e.preventDefault();
            touchDeltaX = dx;
            const vpWidth = document.getElementById('desktop-viewport').offsetWidth;
            const offset = -(currentPage * 100) + (dx / vpWidth) * 100;
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
        pages.style.transform = `translateX(-${currentPage * 100}%)`;
        document.querySelectorAll('.page-dot').forEach((d, i) => {
            d.classList.toggle('active', i === currentPage);
        });
    }

    function updateStatusTime() {
        const el = document.getElementById('status-time');
        if (el) {
            el.textContent = new Date().toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    }

    // ---- Modal ----
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

        // Bind action buttons
        layer.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = actions[parseInt(btn.dataset.action)];
                if (action?.onClick) action.onClick();
                closeModal();
            });
        });

        // Click backdrop to close
        layer.addEventListener('click', (e) => {
            if (e.target === layer) closeModal();
        });
    }

    function closeModal() {
        const layer = document.getElementById('modal-layer');
        layer.classList.add('hidden');layer.innerHTML = '';
    }

    // ---- Context Menu ----
    function showContextMenu(x, y, items) {
        const layer = document.getElementById('context-menu-layer');
        layer.classList.remove('hidden');

        const pc = document.getElementById('phone-container');
        const maxX = pc.offsetWidth - 220;
        const maxY = pc.offsetHeight - (items.length * 44+ 20);
        const sx = Math.min(Math.max(x, 10), maxX);
        const sy = Math.min(Math.max(y, 10), maxY);

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
        layer.classList.add('hidden');layer.innerHTML = '';
    }

    async function refreshDesktop() {
        await renderDesktop();
    }

    return {
        init,
        showModal,
        closeModal,
        showContextMenu,
        closeContextMenu,
        refreshDesktop,
        loadSettings
    };
})();

