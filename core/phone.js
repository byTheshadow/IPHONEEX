// core/phone.js
// ============================================
// Phone Core — Desktop, Swipe, App Management
// ============================================

const Phone = (() => {
    let currentPage = 0;
    let totalPages = 1;
    let touchStartX = 0;
    let touchStartY = 0;
    let touchDeltaX = 0;
    let isDragging = false;
    let isMouseDown = false;

    // Default desktop layout
    const defaultApps = [
        { id: 'chat', name: '聊天', icon: '💬', color: '#34C759' },
        { id: 'calendar', name: '日历', icon: '📅', color: '#FF3B30' },
        { id: 'academic', name: '学术', icon: '📚', color: '#5856D6' },
        { id: 'forum', name: '论坛', icon: '🏛️', color: '#FF9500' },
        { id: 'moments', name: '朋友圈', icon: '🌟', color: '#007AFF' },
        { id: 'settings', name: '设置', icon: '⚙️', color: '#8E8E93' }
    ];

    const dockApps = ['chat', 'calendar', 'settings'];

    async function init() {
        Logger.info('Phone booting...');

        // Init database
        await Store.init();
        Logger.info('Database initialized');

        // Init scheduler
        await Scheduler.init();

        // Load settings
        await loadSettings();

        // Register apps
        registerApps();

        // Render desktop
        await renderDesktop();

        // Setup swipe
        setupSwipe();

        // Start widget updates
        Widget.startUpdates();

        // Update status bar time
        updateStatusTime();
        setInterval(updateStatusTime, 1000);

        Logger.info('Phone boot complete');
    }

    async function loadSettings() {
        // Theme
        const theme = await Store.getSetting('theme', 'dark');
        document.documentElement.setAttribute('data-theme', theme);

        // Accent color
        const accent = await Store.getSetting('accent_color', '#007AFF');
        document.documentElement.style.setProperty('--accent', accent);
        const rgb = hexToRgb(accent);
        if (rgb) document.documentElement.style.setProperty('--accent-rgb', `${rgb.r},${rgb.g},${rgb.b}`);

        // Status bar
        const showStatusBar = await Store.getSetting('show_statusbar', true);
        const statusBar = document.getElementById('status-bar');
        if (!showStatusBar) statusBar.classList.add('hidden-bar');
        else statusBar.classList.remove('hidden-bar');

        // Wallpaper
        const wallpaperUrl = await Store.getSetting('wallpaper_url', '');
        if (wallpaperUrl) {
            const img = document.getElementById('wallpaper-custom');
            img.src = wallpaperUrl;
            img.classList.remove('hidden');
            document.getElementById('wallpaper-default').classList.add('hidden');
        }
    }

    function registerApps() {
        // Settings app
        Router.register('settings', SettingsApp);

        // Placeholder apps for Phase 1
        ['chat', 'calendar', 'academic', 'forum', 'moments'].forEach(id => {
            if (!Router.getApp(id)) {
                Router.register(id, {
                    render: () => {
                        const appInfo = defaultApps.find(a => a.id === id);
                        return `
                            <div class="app-header">
                                <button class="app-header-btn app-back-btn" onclick="Router.close()">返回</button>
                                <span class="app-header-title">${appInfo?.name || id}</span>
                                <span style="width:60px"></span>
                            </div>
                            <div class="app-body" style="display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;">
                                <div style="font-size:64px">${appInfo?.icon || '📱'}</div>
                                <div style="font-size:18px;color:var(--text-secondary)">即将推出</div>
                <div style="font-size:14px;color:var(--text-tertiary)">Phase 2+ 开发中</div>
                            </div>
                        `;
                    }
                });
            }
        });
    }

    async function renderDesktop() {
        const pagesContainer = document.getElementById('desktop-pages');
        const dotsContainer = document.getElementById('page-dots');
        const dock = document.getElementById('dock');

        // Load custom layout or use default
        let layout = await Store.get(Store.STORES.desktopLayout, 'main');
        if (!layout) {
            layout = {
                key: 'main',
                pages: [
                    {
                        items: defaultApps.filter(a => !dockApps.includes(a.id))
                            .map(a => ({ type: 'app', ...a }))
                    }
                ],
                widgets: []
            };
        }

        // Load widgets
        const widgets = await Store.getAll(Store.STORES.widgets);

        // Ensure at least one page
        if (!layout.pages || layout.pages.length === 0) {
            layout.pages = [{ items: [] }];
        }

        // Add default widgets if none exist
        if (widgets.length === 0) {
            const defaultWidgets = [
                { id: 'w_clock', type: 'clock', size: 'small', page: 0, data: {} },
                { id: 'w_calendar', type: 'calendar', size: 'small', page: 0, data: {} }
            ];
            for (const w of defaultWidgets) {
                await Store.put(Store.STORES.widgets, w);
                widgets.push(w);
            }
        }

        totalPages = Math.max(layout.pages.length, 1);
        pagesContainer.innerHTML = '';
        dotsContainer.innerHTML = '';

        // Render pages
        layout.pages.forEach((page, pageIndex) => {
            const pageEl = document.createElement('div');
            pageEl.className = 'desktop-page';

            // Add widgets for this page
            widgets.filter(w => (w.page || 0) === pageIndex).forEach(w => {
                const widgetEl = Widget.createWidgetElement(w);
                if (widgetEl) pageEl.appendChild(widgetEl);
            });

            // Add app icons
            const pageApps = page.items || defaultApps.filter(a => !dockApps.includes(a.id));
            pageApps.forEach(item => {
                if (item.type === 'widget') return; // handled above
                const iconEl = createAppIcon(item);
                pageEl.appendChild(iconEl);
            });

            pagesContainer.appendChild(pageEl);

            // Dot
            const dot = document.createElement('div');
            dot.className = `page-dot ${pageIndex === currentPage ? 'active' : ''}`;
            dot.addEventListener('click', () => goToPage(pageIndex));
            dotsContainer.appendChild(dot);
        });

        // Render dock
        dock.innerHTML = '';
        dockApps.forEach(appId => {
            const appInfo = defaultApps.find(a => a.id === appId);
            if (appInfo) {
                const iconEl = createAppIcon(appInfo);
                dock.appendChild(iconEl);
            }
        });

        updatePagePosition(false);
    }

    function createAppIcon(appInfo) {
        const wrapper = document.createElement('div');
        wrapper.className = 'app-icon-wrapper';
        wrapper.addEventListener('click', () => Router.open(appInfo.id));

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
            if (appInfo.color) {
                icon.style.background = `linear-gradient(135deg, ${appInfo.color}88, ${appInfo.color}44)`;
            }
        }

        const label = document.createElement('div');
        label.className = 'app-icon-label';
        label.textContent = appInfo.name;

        wrapper.appendChild(icon);
        wrapper.appendChild(label);

        // Context menu (long press / right click)
        let pressTimer;
        wrapper.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showAppContextMenu(e, appInfo);
        });
        wrapper.addEventListener('pointerdown', (e) => {
            pressTimer = setTimeout(() => {
                showAppContextMenu(e, appInfo);
            }, 500);
        });
        wrapper.addEventListener('pointerup', () => clearTimeout(pressTimer));
        wrapper.addEventListener('pointermove', () => clearTimeout(pressTimer));

        return wrapper;
    }

    function showAppContextMenu(e, appInfo) {
        const rect = e.target.closest('.app-icon-wrapper')?.getBoundingClientRect();
        const phoneRect = document.getElementById('phone-container').getBoundingClientRect();

        const x = (rect?.left || e.clientX) - phoneRect.left;
        const y = (rect?.bottom || e.clientY) - phoneRect.top + 8;

        showContextMenu(x, y, [
            { label: '打开', icon: '📱', onClick: () => Router.open(appInfo.id) },
            { type: 'separator' },
            { label: '编辑图标', icon: '🎨', onClick: () => editAppIcon(appInfo) },
        ]);
    }

    async function editAppIcon(appInfo) {
        showModal({
            title: `编辑 ${appInfo.name}`,
            content: `
                <div class="form-group">
                    <label class="form-label">App名称</label>
                    <input class="form-input" id="edit-app-name" value="${appInfo.name}">
                </div>
                <div class="form-group">
                    <label class="form-label">图标 (Emoji)</label>
                    <input class="form-input" id="edit-app-emoji" value="${appInfo.icon || ''}" placeholder="输入 emoji">
                </div>
                <div class="form-group">
                    <label class="form-label">自定义图标 URL</label>
                    <input class="form-input" id="edit-app-icon-url" value="${appInfo.customIcon || ''}" placeholder="https://...">
                </div>
            `,
            actions: [
                { label: '取消', type: 'secondary' },
                {
                    label: '保存', type: 'primary', onClick: async () => {
                        appInfo.name = document.getElementById('edit-app-name').value || appInfo.name;
                        appInfo.icon = document.getElementById('edit-app-emoji').value || appInfo.icon;
                        const iconUrl = document.getElementById('edit-app-icon-url').value;
                        if (iconUrl) appInfo.customIcon = iconUrl;
                        else delete appInfo.customIcon;
                        await renderDesktop();
                    }
                }
            ]
        });
    }

    // Swipe handling
    function setupSwipe() {
        const viewport = document.getElementById('desktop-viewport');

        // Touch events
        viewport.addEventListener('touchstart', onTouchStart, { passive: true });
        viewport.addEventListener('touchmove', onTouchMove, { passive: false });
        viewport.addEventListener('touchend', onTouchEnd);

        // Mouse events (desktop compatibility)
        viewport.addEventListener('mousedown', (e) => {
            isMouseDown = true;
            onTouchStart({ touches: [{ clientX: e.clientX, clientY: e.clientY }] });
        });
        viewport.addEventListener('mousemove', (e) => {
            if (!isMouseDown) return;
            onTouchMove({
                touches: [{ clientX: e.clientX, clientY: e.clientY }],
                preventDefault: () => e.preventDefault()
            });
        });
        viewport.addEventListener('mouseup', () => {
            if (!isMouseDown) return;
            isMouseDown = false;
            onTouchEnd();
        });
        viewport.addEventListener('mouseleave', () => {
            if (isMouseDown) {
                isMouseDown = false;
                onTouchEnd();
            }
        });
    }

    function onTouchStart(e) {
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        touchDeltaX = 0;
        isDragging = false;

        const pages = document.getElementById('desktop-pages');
        pages.style.transition = 'none';
    }

    function onTouchMove(e) {
        const touch = e.touches[0];
        const dx = touch.clientX - touchStartX;
        const dy = touch.clientY - touchStartY;

        if (!isDragging && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
            isDragging = true;
        }

        if (isDragging) {
            if (e.preventDefault) e.preventDefault();
            touchDeltaX = dx;
            const offset = -(currentPage * 100) + (dx / window.innerWidth) * 100;
            const pages = document.getElementById('desktop-pages');
            pages.style.transform = `translateX(${offset}%)`;
        }
    }

    function onTouchEnd() {
        if (!isDragging) return;
        isDragging = false;

        const threshold = window.innerWidth * 0.2;

        if (touchDeltaX < -threshold && currentPage < totalPages - 1) {
            currentPage++;
        } else if (touchDeltaX > threshold && currentPage > 0) {
            currentPage--;
        }

        updatePagePosition(true);
    }

    function goToPage(index) {
        currentPage = Math.max(0, Math.min(index, totalPages - 1));
        updatePagePosition(true);
    }

    function updatePagePosition(animate) {
        const pages = document.getElementById('desktop-pages');
        if (animate) {
            pages.style.transition = 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        }
        pages.style.transform = `translateX(-${currentPage * 100}%)`;

        // Update dots
        document.querySelectorAll('.page-dot').forEach((dot, i) => {
            dot.classList.toggle('active', i === currentPage);
        });
    }

    function updateStatusTime() {
        const el = document.getElementById('status-time');
        if (el) {
            el.textContent = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        }
    }

    // Modal system
    function showModal({ title, content, actions = [] }) {
        const layer = document.getElementById('modal-layer');
        layer.classList.remove('hidden');

        const actionsHtml = actions.map((a, i) =>
            `<button class="modal-btn modal-btn-${a.type || 'secondary'}" data-action="${i}">${a.label}</button>`
        ).join('');

        layer.innerHTML = `
            <div class="modal-box glass-heavy">
                ${title ? `<div class="modal-title">${title}</div>` : ''}
                <div class="modal-content">${content}</div>
                ${actionsHtml ? `<div class="modal-actions">${actionsHtml}</div>` : ''}
            </div>
        `;

        // Bind actions
        layer.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.action);
                const action = actions[idx];
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
        layer.classList.add('hidden');
        layer.innerHTML = '';
    }

    // Context menu system
    function showContextMenu(x, y, items) {
        const layer = document.getElementById('context-menu-layer');
        layer.classList.remove('hidden');

        const phoneContainer = document.getElementById('phone-container');
        const maxX = phoneContainer.offsetWidth - 220;
        const maxY = phoneContainer.offsetHeight - (items.length * 44+ 20);
        const safeX = Math.min(Math.max(x, 10), maxX);
        const safeY = Math.min(Math.max(y, 10), maxY);

        const itemsHtml = items.map((item, i) => {
            if (item.type === 'separator') return '<div class="context-menu-separator"></div>';
            return `<div class="context-menu-item ${item.danger ? 'danger' : ''}" data-action="${i}">
                <span>${item.label}</span>
                <span>${item.icon || ''}</span>
            </div>`;
        }).join('');

        layer.innerHTML = `
            <div class="context-menu-backdrop"></div>
            <div class="context-menu glass-heavy" style="left:${safeX}px;top:${safeY}px">
                ${itemsHtml}
            </div>
        `;

        // Bind actions
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

    // Utility
    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
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
