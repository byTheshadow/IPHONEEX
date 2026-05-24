// core/widget.js
const Widget = (() => {

    function esc(str) {
        if (!str) return '';
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

    // ── 小组件类型定义 ────────────────────────────────────
    const types = {

        clock: {
            name: '时钟',
            defaultSize: '2x2',
            render: () => {
                const now = new Date();
                const h = now.getHours().toString().padStart(2, '0');
                const m = now.getMinutes().toString().padStart(2, '0');
                const dateStr = now.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
                const weekday = now.toLocaleDateString('zh-CN', { weekday: 'short' });
                return `<div class="widget-content">
                    <div class="widget-title">时钟</div>
                    <div class="widget-body" style="align-items:flex-start">
                        <div class="widget-value-large">${h}:${m}</div>
                        <div class="widget-value-sub">${dateStr} ${weekday}</div>
                    </div>
                </div>`;
            },
            update: (el) => {
                const now = new Date();
                const h = now.getHours().toString().padStart(2, '0');
                const m = now.getMinutes().toString().padStart(2, '0');
                const v = el.querySelector('.widget-value-large');
                if (v) v.textContent = `${h}:${m}`;
                const s = el.querySelector('.widget-value-sub');
                if (s) {
                    const dateStr = now.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
                    const weekday = now.toLocaleDateString('zh-CN', { weekday: 'short' });
                    s.textContent = `${dateStr} ${weekday}`;
                }
            }
        },

        calendar: {
            name: '日历',
            defaultSize: '2x2',
            render: () => {
                const now = new Date();
                const day = now.getDate();
                const month = now.toLocaleDateString('zh-CN', { month: 'long' });
                const weekday = now.toLocaleDateString('zh-CN', { weekday: 'long' });
                return `<div class="widget-content">
                    <div class="widget-title" style="color:var(--danger);font-weight:800">${weekday}</div>
                    <div class="widget-body" style="align-items:flex-start">
                        <div style="font-size:13px;color:var(--text-secondary);font-weight:600">${month}</div>
                        <div class="widget-value-large" style="font-size:56px;font-weight:300;letter-spacing:-3px;margin-top:-4px">${day}</div>
                    </div>
                </div>`;
            }
        },

        memo: {
            name: '备忘录',
            defaultSize: '4x2',
            render: (data) => {
                const text  = esc(data?.text  || '点击编辑...');
                const title = esc(data?.title || '📝 备忘录');
                return `<div class="widget-content">
                    <div class="widget-title">${title}</div>
                    <div class="widget-body">
                        <div style="font-size:14px;color:var(--text-primary);line-height:1.5;word-break:break-word;overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;">${text}</div>
                    </div>
                </div>`;
            }
        },

        custom: {
            name: '自定义文字',
            defaultSize: '2x2',
            render: (data) => {
                const title = esc(data?.title || '✦');
                const text  = esc(data?.text  || '');
                const emoji = esc(data?.emoji || '');
                return `<div class="widget-content" style="justify-content:center;align-items:center;text-align:center">
                    ${emoji ? `<div style="font-size:32px;margin-bottom:8px">${emoji}</div>` : ''}
                    <div style="font-size:13px;color:var(--text-secondary);font-weight:600;letter-spacing:0.5px">${title}</div>
                    ${text ? `<div style="font-size:12px;color:var(--text-tertiary);margin-top:4px">${text}</div>` : ''}
                </div>`;
            }
        },

        status: {
            name: '状态条',
            defaultSize: '4x2',
            render: (data) => {
                const label = esc(data?.label || 'IPHONEEX');
                const sub   = esc(data?.sub   || '✦ Ready');
                return `<div class="widget-content">
                    <div class="widget-body" style="flex-direction:row;align-items:center;justify-content:space-between">
                        <div>
                            <div style="font-size:16px;font-weight:700;letter-spacing:-0.3px">${label}</div>
                            <div style="font-size:12px;color:var(--text-tertiary);margin-top:4px">${sub}</div>
                        </div>
                        <div style="font-size:28px;opacity:0.4">⚡</div>
                    </div>
                </div>`;
            }
        },

        // 照片小组件
        photo: {
            name: '照片',
            defaultSize: '2x2',
            render: (data) => {
                const url   = data?.url   || '';
                const label = esc(data?.label || '');
                const shape = data?.shape || 'round';

                if (!url) {
                    return `<div class="widget-content widget-photo-empty">
                        <div class="widget-photo-placeholder">＋</div>
                        <div style="font-size:11px;color:var(--text-tertiary);margin-top:8px">长按添加照片</div>
                    </div>`;
                }
                if (shape === 'square') {
                    return `<div class="widget-photo-square">
                        <img src="${esc(url)}" alt="" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'">
                        ${label ? `<div class="widget-photo-label">${label}</div>` : ''}
                    </div>`;
                }
                return `<div class="widget-content widget-photo-round">
                    <img src="${esc(url)}" alt="" style="width:80%;aspect-ratio:1;border-radius:50%;object-fit:cover;" onerror="this.style.display='none'">
                    ${label ? `<div class="widget-photo-label-round">${label}</div>` : ''}
                </div>`;
            }
        },

        // 信息条小组件
        profile: {
            name: '信息条',
            defaultSize: '4x2',
            render: (data) => {
                const avatarUrl = data?.avatarUrl || '';
                const name      = esc(data?.name     || '昵称');
                const sub       = esc(data?.sub      || '今天也要加油哦');
                const right     = esc(data?.right    || '');
                const rightSub  = esc(data?.rightSub || '');
                const avatarHtml = avatarUrl
                    ? `<img src="${esc(avatarUrl)}" alt="" class="widget-profile-avatar" onerror="this.style.display='none'">`
                    : `<div class="widget-profile-avatar widget-profile-avatar-placeholder">${esc((data?.name || '?')[0])}</div>`;
                return `<div class="widget-content widget-profile-content">
                    <div class="widget-profile-left">
                        ${avatarHtml}
                        <div class="widget-profile-info">
                            <div class="widget-profile-name">${name}</div>
                            <div class="widget-profile-sub">${sub}</div>
                        </div>
                    </div>
                    ${(right || rightSub) ? `<div class="widget-profile-right">
                        ${right    ? `<div class="widget-profile-right-main">${right}</div>`    : ''}
                        ${rightSub ? `<div class="widget-profile-right-sub">${rightSub}</div>` : ''}
                    </div>` : ''}
                </div>`;
            }
        },

        // 标签条小组件
        tag: {
            name: '标签条',
            defaultSize: '2x2',
            render: (data) => {
                const icon = esc(data?.icon || '#');
                const text = esc(data?.text || '标签文字');
                const sub  = esc(data?.sub  || '');
                return `<div class="widget-content widget-tag-content">
                    <div class="widget-tag-row">
                        <span class="widget-tag-icon">${icon}</span>
                        <div class="widget-tag-texts">
                            <div class="widget-tag-text">${text}</div>
                            ${sub ? `<div class="widget-tag-sub">${sub}</div>` : ''}
                        </div>
                    </div>
                </div>`;
            }
        }
    };

    // ── 创建小组件 DOM ────────────────────────────────────
    function create(widgetData) {
        const type = types[widgetData.type];
        if (!type) return null;

        const el   = document.createElement('div');
        const size = widgetData.size || type.defaultSize;
        el.className = `widget-wrapper widget-${size} glass`;
        el.dataset.widgetId   = widgetData.id;
        el.dataset.widgetType = widgetData.type;
        el.innerHTML = type.render(widgetData.data || {});

        if (widgetData.type === 'photo' && widgetData.data?.shape === 'square' && widgetData.data?.url) {
            el.classList.add('widget-photo-mode');
        }

        // ── 长按：先弹操作菜单，再按需弹编辑表单 ──────────
        let pressTimer;
        let pressing = false;

        const startPress = (e) => {
            pressing = false;
            pressTimer = setTimeout(() => {
                pressing = true;
                e.preventDefault?.();
                showWidgetActionMenu(widgetData);
            }, 600);
        };
        const cancelPress = () => clearTimeout(pressTimer);

        el.addEventListener('pointerdown',  startPress);
        el.addEventListener('pointerup',    cancelPress);
        el.addEventListener('pointerleave', cancelPress);
        el.addEventListener('pointermove',  cancelPress);
        el.addEventListener('contextmenu',  (e) => {
            e.preventDefault();
            showWidgetActionMenu(widgetData);
        });

        // 点击跳转
        el.addEventListener('click', () => {
            if (pressing) { pressing = false; return; }
            if (widgetData.type === 'calendar') Router.open('calendar');
        });

        return el;
    }

    // ── 第一层：操作菜单（编辑 / 删除）─────────────────────
    // 用 contextMenu 而不是 modal，避免两层 modal 叠加
    function showWidgetActionMenu(widgetData) {
        const type = types[widgetData.type];
        const canEdit = ['custom', 'memo', 'status', 'photo', 'profile', 'tag'].includes(widgetData.type);

        const items = [];
        if (canEdit) {
            items.push({ label: '编辑', icon: '✎', onClick: () => openEditModal(widgetData) });
            items.push({ type: 'separator' });
        }
        items.push({
            label: '删除组件', icon: '✕', danger: true,
            onClick: async () => {
                try {
                    await Store.del(Store.STORES.widgets, widgetData.id);
                    await Phone.refreshDesktop();
                    Phone.showToast('已删除');
                } catch (e) {
                    Phone.showToast('删除失败', 'error');
                }
            }
        });

        // 在组件中心位置弹出菜单
        const el = document.querySelector(`[data-widget-id="${widgetData.id}"]`);
        const pc = document.getElementById('phone-container');
        let x = 40, y = 100;
        if (el && pc) {
            const r  = el.getBoundingClientRect();
            const pr = pc.getBoundingClientRect();
            x = r.left - pr.left + 16;
            y = r.top  - pr.top  + 16;
        }
        Phone.showContextMenu(x, y, items);
    }

    // ── 第二层：编辑表单 modal ────────────────────────────
    function openEditModal(widgetData) {
        const type = types[widgetData.type];
        const d    = widgetData.data || {};
        let fields = '';

        switch (widgetData.type) {
            case 'custom':
                fields = `
                    <div class="form-group">
                        <label class="form-label">Emoji</label>
                        <input class="form-input" id="w-emoji" value="${esc(d.emoji || '')}" placeholder="✦">
                    </div>
                    <div class="form-group">
                        <label class="form-label">标题</label>
                        <input class="form-input" id="w-title" value="${esc(d.title || '')}" placeholder="标题">
                    </div>
                    <div class="form-group">
                        <label class="form-label">内容</label>
                        <textarea class="form-textarea" id="w-text" rows="3">${esc(d.text || '')}</textarea>
                    </div>`;
                break;
            case 'memo':
                fields = `
                    <div class="form-group">
                        <label class="form-label">标题</label>
                        <input class="form-input" id="w-title" value="${esc(d.title || '')}" placeholder="📝 备忘录">
                    </div>
                    <div class="form-group">
                        <label class="form-label">内容</label>
                        <textarea class="form-textarea" id="w-text" rows="4">${esc(d.text || '')}</textarea>
                    </div>`;
                break;
            case 'status':
                fields = `
                    <div class="form-group">
                        <label class="form-label">标签</label>
                        <input class="form-input" id="w-label" value="${esc(d.label || '')}" placeholder="IPHONEEX">
                    </div>
                    <div class="form-group">
                        <label class="form-label">副标题</label>
                        <input class="form-input" id="w-sub" value="${esc(d.sub || '')}" placeholder="✦ Ready">
                    </div>`;
                break;
            case 'photo':
                fields = `
                    <div class="form-group">
                        <label class="form-label">图片 URL</label>
                        <input class="form-input" id="w-url" value="${esc(d.url || '')}" placeholder="https://...">
                    </div>
                    <div class="form-group">
                        <label class="form-label">底部文字（可选）</label>
                        <input class="form-input" id="w-label" value="${esc(d.label || '')}" placeholder="我的照片">
                    </div>
                    <div class="form-group">
                        <label class="form-label">形状</label>
                        <select class="form-select" id="w-shape">
                            <option value="round"  ${(d.shape||'round')==='round'  ? 'selected':''}>圆形头像</option>
                            <option value="square" ${d.shape==='square' ? 'selected':''}>方形大图</option>
                        </select>
                    </div>`;
                break;
            case 'profile':
                fields = `
                    <div class="form-group">
                        <label class="form-label">头像 URL</label>
                        <input class="form-input" id="w-avatarUrl" value="${esc(d.avatarUrl || '')}" placeholder="https://...">
                    </div>
                    <div class="form-group">
                        <label class="form-label">昵称</label>
                        <input class="form-input" id="w-name" value="${esc(d.name || '')}" placeholder="昵称">
                    </div>
                    <div class="form-group">
                        <label class="form-label">副标题</label>
                        <input class="form-input" id="w-sub" value="${esc(d.sub || '')}" placeholder="今天也要加油哦">
                    </div>
                    <div class="form-group">
                        <label class="form-label">右侧主文字（可选）</label>
                        <input class="form-input" id="w-right" value="${esc(d.right || '')}" placeholder="24°">
                    </div>
                    <div class="form-group">
                        <label class="form-label">右侧副文字（可选）</label>
                        <input class="form-input" id="w-rightSub" value="${esc(d.rightSub || '')}" placeholder="北京·晴天">
                    </div>`;
                break;
            case 'tag':
                fields = `
                    <div class="form-group">
                        <label class="form-label">图标（emoji）</label>
                        <input class="form-input" id="w-icon" value="${esc(d.icon || '')}" placeholder="🎵">
                    </div>
                    <div class="form-group">
                        <label class="form-label">主文字</label>
                        <input class="form-input" id="w-text" value="${esc(d.text || '')}" placeholder="标签文字">
                    </div>
                    <div class="form-group">
                        <label class="form-label">副文字（可选）</label>
                        <input class="form-input" id="w-sub" value="${esc(d.sub || '')}" placeholder="副标题">
                    </div>`;
                break;
            default:
                fields = `<div style="text-align:center;color:var(--text-secondary);padding:12px">此组件不可编辑</div>`;
        }

        Phone.showModal({
            title: `编辑 ${type.name}`,
            content: fields,
            actions: [
                { label: '取消', type: 'secondary' },
                {
                    label: '保存', type: 'primary',
                    onClick: async () => {
                        const saveBtn = document.querySelector('.modal-btn-primary');
                        if (saveBtn) { saveBtn.textContent = '保存中…'; saveBtn.disabled = true; }

                        const newData = { ...d };
                        const fieldMap = {
                            'w-title': 'title', 'w-text': 'text', 'w-emoji': 'emoji',
                            'w-label': 'label', 'w-sub': 'sub', 'w-url': 'url',
                            'w-shape': 'shape', 'w-avatarUrl': 'avatarUrl',
                            'w-name': 'name', 'w-right': 'right',
                            'w-rightSub': 'rightSub', 'w-icon': 'icon'
                        };
                        for (const [elId, key] of Object.entries(fieldMap)) {
                            const el = document.getElementById(elId);
                            if (el) newData[key] = el.value;
                        }

                        try {
                            widgetData.data = newData;
                            await Store.put(Store.STORES.widgets, widgetData);
                            Phone.closeModal();
                            await Phone.refreshDesktop();
                            Phone.showToast('✓ 已保存');
                        } catch (e) {
                            if (saveBtn) { saveBtn.textContent = '保存'; saveBtn.disabled = false; }
                            Phone.showToast('保存失败，请重试', 'error');
                        }
                    }
                }
            ]
        });
    }

    // ── 时钟自动更新 ──────────────────────────────────────
    function startUpdates() {
        setInterval(() => {
            document.querySelectorAll('[data-widget-type="clock"]').forEach(el => {
                types.clock.update(el);
            });
        }, 1000);
    }

    return { types, create, startUpdates };
})();
// [END Widget]
