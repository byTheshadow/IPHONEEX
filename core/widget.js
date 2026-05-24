// core/widget.js
// ============================================
// Widget System
// ============================================

const Widget = (() => {
    const widgetTypes = {
        clock: {
            name: '时钟',
            size: 'small',
            render: () => {
                const now = new Date();
                const time = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
                const date = now.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });
                return `
                    <div class="widget-content">
                        <div class="widget-title">时钟</div>
                        <div class="widget-body" style="flex-direction:column;gap:4px;">
                            <div class="widget-value">${time}</div>
                            <div style="font-size:13px;color:var(--text-secondary)">${date}</div>
                        </div>
                    </div>
                `;
            },
            update: (el) => {
                const now = new Date();
                const timeEl = el.querySelector('.widget-value');
                const dateEl = el.querySelector('.widget-body div:last-child');
                if (timeEl) timeEl.textContent = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
                if (dateEl) dateEl.textContent = now.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });
            }
        },
        calendar: {
            name: '日历预览',
            size: 'small',
            render: () => {
                const now = new Date();
                const day = now.getDate();
                const month = now.toLocaleDateString('zh-CN', { month: 'long' });
                const weekday = now.toLocaleDateString('zh-CN', { weekday: 'long' });
                return `
                    <div class="widget-content">
                        <div class="widget-title">${weekday}</div>
                        <div class="widget-body" style="flex-direction:column;">
                            <div style="font-size:13px;color:var(--accent)">${month}</div>
                            <div class="widget-value" style="font-size:52px;line-height:1">${day}</div>
                        </div>
                    </div>
                `;
            }
        },
        memo: {
            name: '备忘录',
            size: 'small',
            render: (data) => {
                const text = data?.text || '点击编辑备忘录...';
                return `
                    <div class="widget-content">
                        <div class="widget-title">📝 备忘录</div>
                        <div class="widget-body">
                            <div style="font-size:14px;color:var(--text-primary);word-break:break-word;overflow:hidden;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;">${text}</div>
                        </div>
                    </div>
                `;
            }
        },
        custom: {
            name: '自定义文字',
            size: 'small',
            render: (data) => {
                const title = data?.title || '自定义';
                const text = data?.text || '点击编辑...';
                return `
                    <div class="widget-content">
                        <div class="widget-title">${title}</div>
                        <div class="widget-body">
                            <div style="font-size:14px;color:var(--text-primary);word-break:break-word;overflow:hidden;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;">${text}</div>
                        </div>
                    </div>
                `;
            }
        }
    };

    function createWidgetElement(widgetData) {
        const type = widgetTypes[widgetData.type];
        if (!type) return null;

        const wrapper = document.createElement('div');
        wrapper.className = `widget-wrapper widget-${widgetData.size || type.size} glass`;
        wrapper.dataset.widgetId = widgetData.id;
        wrapper.dataset.widgetType = widgetData.type;
        wrapper.innerHTML = type.render(widgetData.data);

        // Long press to edit
        let pressTimer;
        wrapper.addEventListener('pointerdown', () => {
            pressTimer = setTimeout(() => {
                editWidget(widgetData);
            }, 600);
        });
        wrapper.addEventListener('pointerup', () => clearTimeout(pressTimer));
        wrapper.addEventListener('pointerleave', () => clearTimeout(pressTimer));

        // Click to open associated app
        wrapper.addEventListener('click', () => {
            if (widgetData.type === 'calendar') {
                Router.open('calendar');
            }
        });

        return wrapper;
    }

    async function editWidget(widgetData) {
        const type = widgetTypes[widgetData.type];
        if (!type) return;

        Phone.showModal({
            title: `编辑 ${type.name}`,
            content: `
                ${widgetData.type === 'custom' ? `
                    <div class="form-group">
                        <label class="form-label">标题</label>
                        <input class="form-input" id="widget-edit-title" value="${widgetData.data?.title || ''}" placeholder="标题">
                    </div>` : ''}
                <div class="form-group">
                    <label class="form-label">内容</label>
                    <textarea class="form-textarea" id="widget-edit-text" placeholder="输入内容...">${widgetData.data?.text || ''}</textarea>
                </div>
            `,
            actions: [
                { label: '取消', type: 'secondary' },
                {
                    label: '保存', type: 'primary', onClick: async () => {
                        const text = document.getElementById('widget-edit-text')?.value || '';
                        const title = document.getElementById('widget-edit-title')?.value || widgetData.data?.title;
                        widgetData.data = { ...widgetData.data, text, title };
                        await Store.put(Store.STORES.widgets, widgetData);
                        Phone.refreshDesktop();
                    }
                }
            ]
        });
    }

    function startUpdates() {
        // Update clock widget every second
        setInterval(() => {
            document.querySelectorAll('[data-widget-type="clock"]').forEach(el => {
                const type = widgetTypes.clock;
                if (type.update) type.update(el);
            });
        }, 1000);
    }

    return { widgetTypes, createWidgetElement, startUpdates };
})();
