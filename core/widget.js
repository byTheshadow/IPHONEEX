// core/widget.js
const Widget = (() => {
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
                return `
                    <div class="widget-content">
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
                return `
                    <div class="widget-content">
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
                const text = data?.text || '点击编辑...';
                const title = data?.title || '📝 备忘录';
                return `
                    <div class="widget-content">
                        <div class="widget-title">${title}</div>
                        <div class="widget-body">
                            <div style="font-size:14px;color:var(--text-primary);line-height:1.5;word-break:break-word;overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;">${text}</div>
                        </div>
                    </div>`;
            }
        },
        custom: {
            name: '自定义',
            defaultSize: '2x2',
            render: (data) => {
                const title = data?.title || '✦';
                const text = data?.text || '';
                const emoji = data?.emoji || '';
                return `
                    <div class="widget-content" style="justify-content:center;align-items:center;text-align:center">
                        ${emoji ? `<div style="font-size:32px;margin-bottom:8px">${emoji}</div>` : ''}
                        <div style="font-size:13px;color:var(--text-secondary);font-weight:600;letter-spacing:0.5px">${title}</div>
                        ${text ? `<div style="font-size:12px;color:var(--text-tertiary);margin-top:4px">${text}</div>` : ''}
                    </div>`;
            }
        },
        status: {
            name: '状态',
            defaultSize: '4x2',
            render: (data) => {
                const label = data?.label || 'IPHONEEX';
                const sub = data?.sub || '✦ Ready';
                return `
                    <div class="widget-content">
                        <div class="widget-body" style="flex-direction:row;align-items:center;justify-content:space-between">
                            <div>
                                <div style="font-size:16px;font-weight:700;letter-spacing:-0.3px">${label}</div>
                                <div style="font-size:12px;color:var(--text-tertiary);margin-top:4px">${sub}</div>
                            </div>
                            <div style="font-size:28px;opacity:0.4">⚡</div>
                        </div>
                    </div>`;
            }
        }
    };

    function create(widgetData) {
        const type = types[widgetData.type];
        if (!type) return null;

        const el = document.createElement('div');
        const size = widgetData.size || type.defaultSize;
        el.className = `widget-wrapper widget-${size} glass`;
        el.dataset.widgetId = widgetData.id;
        el.dataset.widgetType = widgetData.type;
        el.innerHTML = type.render(widgetData.data || {});

        // Long press to edit
        let pressTimer;
        const startPress = (e) => {
            pressTimer = setTimeout(() => {
                e.preventDefault();
                editWidget(widgetData);
            }, 600);
        };
        const cancelPress = () => clearTimeout(pressTimer);

        el.addEventListener('pointerdown', startPress);
        el.addEventListener('pointerup', cancelPress);
        el.addEventListener('pointerleave', cancelPress);
        el.addEventListener('pointermove', cancelPress);

        el.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            editWidget(widgetData);
        });

        // Click to open associated app
        el.addEventListener('click', () => {
            if (widgetData.type === 'calendar') Router.open('calendar');});

        return el;
    }

    async function editWidget(widgetData) {
        const type = types[widgetData.type];
        if (!type) return;

        let fields = '';
        if (widgetData.type === 'custom') {
            fields = `
                <div class="form-group">
                    <label class="form-label">Emoji</label>
                    <input class="form-input" id="w-emoji" value="${widgetData.data?.emoji || ''}" placeholder="✦">
                </div>
                <div class="form-group">
                    <label class="form-label">标题</label>
                    <input class="form-input" id="w-title" value="${widgetData.data?.title || ''}" placeholder="标题">
                </div>
                <div class="form-group">
                    <label class="form-label">内容</label>
                    <textarea class="form-textarea" id="w-text" rows="3" placeholder="内容...">${widgetData.data?.text || ''}</textarea>
                </div>`;
        } else if (widgetData.type === 'memo') {
            fields = `
                <div class="form-group">
                    <label class="form-label">标题</label>
                    <input class="form-input" id="w-title" value="${widgetData.data?.title || ''}" placeholder="📝 备忘录">
                </div>
                <div class="form-group">
                    <label class="form-label">内容</label>
                    <textarea class="form-textarea" id="w-text" rows="4" placeholder="写点什么...">${widgetData.data?.text || ''}</textarea>
                </div>`;
        } else if (widgetData.type === 'status') {
            fields = `
                <div class="form-group">
                    <label class="form-label">标签</label>
                    <input class="form-input" id="w-label" value="${widgetData.data?.label || ''}" placeholder="IPHONEEX">
                </div>
                <div class="form-group">
                    <label class="form-label">副标题</label>
                    <input class="form-input" id="w-sub" value="${widgetData.data?.sub || ''}" placeholder="✦ Ready">
                </div>`;
        } else {
            fields = `<div style="text-align:center;color:var(--text-secondary);padding:12px">此组件不可编辑</div>`;
        }

        Phone.showModal({
            title: `编辑 ${type.name}`,
            content: fields,
            actions: [
                {
                    label: '删除', type: 'secondary', onClick: async () => {
                        await Store.del(Store.STORES.widgets, widgetData.id);
                        Phone.refreshDesktop();
                    }
                },
                {
                    label: '保存', type: 'primary', onClick: async () => {
                        const d = widgetData.data || {};
                        const title = document.getElementById('w-title')?.value;
                        const text = document.getElementById('w-text')?.value;
                        const emoji = document.getElementById('w-emoji')?.value;
                        const label = document.getElementById('w-label')?.value;
                        const sub = document.getElementById('w-sub')?.value;
                        if (title !== undefined) d.title = title;
                        if (text !== undefined) d.text = text;
                        if (emoji !== undefined) d.emoji = emoji;
                        if (label !== undefined) d.label = label;
                        if (sub !== undefined) d.sub = sub;
                        widgetData.data = d;
                        await Store.put(Store.STORES.widgets, widgetData);
                        Phone.refreshDesktop();
                    }
                }
            ]
        });
    }

    function startUpdates() {
        setInterval(() => {
            document.querySelectorAll('[data-widget-type="clock"]').forEach(el => {
                types.clock.update(el);
            });
        }, 1000);}

    return { types, create, startUpdates };
})();
