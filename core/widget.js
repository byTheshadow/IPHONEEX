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

        // ── 新增：标准音乐播放器 (参考图2) ──
        // 替换 music 的 render 方法里的 SVG 部分
music: {
    name: '音乐播放器',
    defaultSize: '4x2',
    render: (data) => {
        const coverUrl = data?.coverUrl || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&q=80&w=200';
        const title  = esc(data?.title  || 'iScreen Music');
        const artist = esc(data?.artist || 'iScreen');
        return `<div class="widget-content" style="flex-direction:row;padding:12px 16px;align-items:center;gap:16px;">
            <img src="${esc(coverUrl)}" style="width:72px;height:72px;border-radius:12px;object-fit:cover;box-shadow:0 4px 12px rgba(0,0,0,0.3);flex-shrink:0;">
            <div style="flex:1;display:flex;flex-direction:column;justify-content:center;min-width:0;">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
                    <div style="min-width:0;">
                        <div style="font-size:16px;font-weight:700;color:var(--text-primary);letter-spacing:-0.3px;margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${title}</div>
                        <div style="font-size:12px;color:var(--text-secondary);font-weight:500;">${artist}</div>
                    </div>
                    <div style="width:24px;height:24px;border-radius:50%;background:var(--glass-bg-heavy);display:flex;justify-content:center;align-items:center;font-size:12px;flex-shrink:0;margin-left:8px;">📡</div>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;padding:0 4px;">
                    <div style="width:20px;height:20px;display:flex;align-items:center;justify-content:center;color:var(--text-primary);font-size:16px;">⏮</div>
                    <div style="width:28px;height:28px;display:flex;align-items:center;justify-content:center;color:var(--text-primary);font-size:22px;">▶</div>
                    <div style="width:20px;height:20px;display:flex;align-items:center;justify-content:center;color:var(--text-primary);font-size:16px;">⏭</div>
                </div>
                <div style="width:100%;height:4px;background:rgba(128,128,128,0.3);border-radius:2px;position:relative;">
                    <div style="position:absolute;left:0;top:0;height:100%;width:30%;background:var(--text-primary);border-radius:2px;"></div>
                </div>
                <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-tertiary);margin-top:4px;font-weight:600;">
                    <span>0:01</span><span>-2:56</span>
                </div>
            </div>
        </div>`;
    }
},

// 替换 cute_player 的 render 方法里的 SVG 部分
cute_player: {
    name: '心动播放器',
    defaultSize: '4x2',
    render: (data) => {
        const coverUrl = data?.coverUrl || 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?auto=format&fit=crop&q=80&w=200';
        const textTop = esc(data?.textTop || '☆ ✧:GOODNIGHT☽ ⋆');
        const textSub = esc(data?.textSub || '.. ♡ · ♡ ° ♡ · ♡ ..');
        return `<div class="widget-content" style="flex-direction:row;padding:16px;align-items:center;gap:16px;">
            <div style="position:relative;width:88px;height:88px;flex-shrink:0;">
                <img src="${esc(coverUrl)}" style="width:100%;height:100%;border-radius:18px;object-fit:cover;box-shadow:0 4px 16px rgba(0,0,0,0.2);">
                <div style="position:absolute;inset:0;border-radius:18px;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.2),inset 0 2px 4px rgba(255,255,255,0.3);pointer-events:none;"></div>
                <div style="position:absolute;top:-4px;left:-6px;font-size:16px;">✨</div>
                <div style="position:absolute;bottom:0;right:-6px;font-size:20px;">🤍</div>
            </div>
            <div style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;position:relative;">
                <div style="position:absolute;top:-4px;right:0;width:28px;height:28px;background:var(--glass-bg-heavy);border-radius:50%;display:flex;justify-content:center;align-items:center;font-size:14px;color:var(--text-primary);">♪</div>
                <div style="font-size:10px;font-weight:700;color:var(--text-primary);letter-spacing:1px;margin-bottom:14px;text-align:center;line-height:1.6;">
                    ${textTop}<br><span style="color:var(--text-secondary);font-size:9px;">${textSub}</span>
                </div>
                <div style="display:flex;justify-content:center;align-items:center;gap:24px;width:100%;margin-bottom:14px;color:var(--text-primary);">
                    <span style="font-size:18px;">⏮</span>
                    <span style="font-size:22px;">🤍</span>
                    <span style="font-size:18px;">⏭</span>
                </div>
                <div style="width:85%;height:4px;background:rgba(128,128,128,0.3);border-radius:2px;position:relative;">
                    <div style="position:absolute;left:0;top:0;height:100%;width:40%;background:var(--text-primary);border-radius:2px;"></div>
                </div>
            </div>
        </div>`;
    }
},
        // ── 新增：控制中心 (参考图2) ──
        control_center: {
            name: '控制中心',
            defaultSize: '2x2',
            render: () => {
                return `<div class="widget-content" style="padding:14px; justify-content:center;">
                    <div style="display:flex; flex-direction:column; gap:10px; height:100%;">
                        <div style="display:flex; gap:10px; flex:1;">
                            <div style="flex:1; background:var(--glass-bg-heavy); border-radius:50%; display:flex; justify-content:center; align-items:center; font-size:22px; box-shadow:inset 0 1px 2px rgba(255,255,255,0.1);">✈️</div>
                            <div style="flex:1; background:var(--glass-bg-heavy); border-radius:50%; display:flex; justify-content:center; align-items:center; font-size:22px; box-shadow:inset 0 1px 2px rgba(255,255,255,0.1);">📡</div>
                        </div>
                        <div style="display:flex; gap:10px; flex:1;">
                            <div style="flex:1; background:#007AFF; border-radius:50%; display:flex; justify-content:center; align-items:center; font-size:22px; box-shadow:0 2px 8px rgba(0,122,255,0.4);">📶</div>
                            <div style="flex:1; display:flex; flex-wrap:wrap; gap:4px; align-content:space-between;">
                                <div style="width:calc(50% - 2px); height:calc(50% - 2px); background:var(--glass-bg-heavy); border-radius:50%; display:flex; justify-content:center; align-items:center; font-size:12px;">📊</div>
                                <div style="width:calc(50% - 2px); height:calc(50% - 2px); background:var(--glass-bg-heavy); border-radius:50%; display:flex; justify-content:center; align-items:center; font-size:12px;">ᛒ</div>
                                <div style="width:calc(50% - 2px); height:calc(50% - 2px); background:var(--glass-bg-heavy); border-radius:50%; display:flex; justify-content:center; align-items:center; font-size:12px;">🔗</div>
                                <div style="width:calc(50% - 2px); height:calc(50% - 2px); background:var(--glass-bg-heavy); border-radius:50%; display:flex; justify-content:center; align-items:center; font-size:12px;">🌐</div>
                            </div>
                        </div>
                    </div>
                </div>`;
            }
        },

        // ── 新增：可爱图标组 (参考图2) ──
        cute_icons: {
            name: '可爱图标组',
            defaultSize: '2x2',
            render: (data) => {
                const text = esc(data?.text || 'ʕ•‘•ʔ ✩');
                return `<div class="widget-content" style="padding:0; display:flex; flex-direction:column; justify-content:space-between; background:transparent !important; border:none !important; box-shadow:none !important;">
                    <div style="background:var(--glass-bg); border:1px solid var(--glass-border); backdrop-filter:var(--glass-blur); -webkit-backdrop-filter:var(--glass-blur); border-radius:30px; padding:10px 16px 10px 10px; display:flex; align-items:center; gap:12px; box-shadow:var(--glass-shadow);">
                        <div style="background:var(--text-primary); color:var(--glass-bg-heavy); border-radius:50%; width:34px; height:34px; display:flex; justify-content:center; align-items:center; font-size:20px; flex-shrink:0; line-height:1;">♥</div>
                        <div style="font-size:14px; color:var(--text-primary); letter-spacing:1px; font-weight:600; white-space:nowrap; overflow:hidden;">${text}</div>
                    </div>
                    <div style="display:flex; justify-content:space-between; gap:12px;">
                        <div style="flex:1; aspect-ratio:1; background:var(--glass-bg); border:1px solid var(--glass-border); backdrop-filter:var(--glass-blur); -webkit-backdrop-filter:var(--glass-blur); border-radius:50%; display:flex; justify-content:center; align-items:center; font-size:24px; box-shadow:var(--glass-shadow);">✨</div>
                        <div style="flex:1; aspect-ratio:1; background:var(--glass-bg); border:1px solid var(--glass-border); backdrop-filter:var(--glass-blur); -webkit-backdrop-filter:var(--glass-blur); border-radius:50%; display:flex; justify-content:center; align-items:center; font-size:24px; box-shadow:var(--glass-shadow);">🎀</div>
                    </div>
                </div>`;
            }
        },

        // ── 新增：云朵日期 (参考图1) ──
        cute_date: {
            name: '云朵日期',
            defaultSize: '2x2',
            render: (data) => {
                const petEmoji = esc(data?.petEmoji || '🐰');
                const now = new Date();
                const day = now.getDate().toString().padStart(2, '0');
                const month = (now.getMonth() + 1).toString().padStart(2, '0');
                const weekday = now.toLocaleDateString('en-US', { weekday: 'long' });
                const dateStr = esc(data?.dateStr || `${month}/${day} ${weekday}`);
                
                return `<div class="widget-content" style="justify-content:flex-end; padding:16px;">
                    <div style="position:absolute; top:16px; left:16px; font-size:42px; filter:drop-shadow(0 4px 6px rgba(0,0,0,0.15));">${petEmoji}</div>
                    <div style="display:flex; align-items:center; gap:8px; font-size:18px; margin-bottom:6px;">
                        <span style="font-size:10px; color:var(--text-secondary);">❄</span> <span>☁️</span> <span style="font-size:12px; color:var(--text-secondary);">✦</span> <span>☁️</span>
                    </div>
                    <div style="font-size:11px; font-weight:600; color:var(--text-secondary); letter-spacing:0.5px;">${dateStr} ‧₊˚</div>
                </div>`;
            }
        },

        // ── 新增：星空萌宠 (参考图1) ──
        cute_pet: {
            name: '星空萌宠',
            defaultSize: '2x2',
            render: (data) => {
                const imageUrl = data?.imageUrl ? esc(data.imageUrl) : '';
                const topEmoji = esc(data?.topEmoji || '🐰');
                const text = esc(data?.text || 'ฅ^•ω•^ฅ 🤍 ☁️');
                
                const imageHtml = imageUrl 
                    ? `<img src="${imageUrl}" style="height:70px; object-fit:contain; margin-bottom:12px; filter:drop-shadow(0 8px 12px rgba(0,0,0,0.3));">`
                    : `<div style="font-size:56px; margin-bottom:12px; filter:drop-shadow(0 8px 12px rgba(0,0,0,0.2));">🦈</div>`;

                return `<div class="widget-content" style="justify-content:center; align-items:center; padding:16px; position:relative;">
                    <div style="position:absolute; top:12px; right:16px; display:flex; flex-direction:column; align-items:center; gap:4px; font-size:12px; color:var(--text-secondary);">
                        <div style="width:1px; height:12px; background:var(--text-secondary); opacity:0.5;"></div>
                        ⭐
                        <div style="width:1px; height:8px; background:var(--text-secondary); opacity:0.5;"></div>
                        ✨
                    </div>
                    ${imageHtml}
                    <div style="width:100%; text-align:center;">
                        <div style="font-size:14px; margin-bottom:6px; display:flex; justify-content:center; align-items:center; gap:6px;">
                            <span>${topEmoji}</span> 
                            <span style="font-size:10px; color:var(--text-secondary);">⁺ ✧ ⭐</span> 
                            <span style="font-size:12px; letter-spacing:1px; color:var(--text-primary); font-weight:600;">|||ılı|ılı| ♪</span>
                        </div>
                        <div style="font-size:11px; color:var(--text-secondary); font-weight:500;">${text}</div>
                    </div>
                </div>`;
            }
        },

        // ── 新增：圆形照片 (参考图1) ──
        circle_photo: {
            name: '圆形照片',
            defaultSize: '2x2',
            render: (data) => {
                const url   = data?.url   || 'https://images.unsplash.com/photo-1541426062085-74d2da6df993?auto=format&fit=crop&q=80&w=200';
                const text1 = esc(data?.text1 || 'Liquid');
                const text2 = esc(data?.text2 || 'Smooth');
                return `<div class="widget-content" style="padding:0; background:transparent !important; border:none !important; box-shadow:none !important;">
                    <div style="width:100%; height:100%; border-radius:50%; overflow:hidden; position:relative; box-shadow:var(--glass-shadow); border:1px solid var(--glass-border-light);">
                        <img src="${esc(url)}" style="width:100%; height:100%; object-fit:cover;">
                        <div style="position:absolute; inset:0; background:linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%); pointer-events:none;"></div>
                        <div style="position:absolute; top:18%; left:18%; font-size:11px; color:#fff; font-weight:700; letter-spacing:0.5px; text-shadow:0 1px 3px rgba(0,0,0,0.6); line-height:1.2;">
                            ${text1}<br>${text2}
                        </div>
                    </div>
                </div>`;
            }
        },

        // ── 照片小组件 (原版保留) ──
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

        // 对需要去底色的特殊小组件移除毛玻璃背景
        if (
            (widgetData.type === 'photo' && widgetData.data?.shape === 'square' && widgetData.data?.url) ||
            widgetData.type === 'cute_icons' ||
            widgetData.type === 'circle_photo'
        ) {
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
    function showWidgetActionMenu(widgetData) {
        const type = types[widgetData.type];
        const canEdit = ['custom', 'memo', 'status', 'photo', 'profile', 'tag', 'music', 'cute_player', 'cute_date', 'cute_pet', 'cute_icons', 'circle_photo'].includes(widgetData.type);

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
            case 'music':
                fields = `
                    <div class="form-group">
                        <label class="form-label">封面 URL</label>
                        <input class="form-input" id="w-coverUrl" value="${esc(d.coverUrl || '')}" placeholder="https://...">
                    </div>
                    <div class="form-group">
                        <label class="form-label">歌曲名</label>
                        <input class="form-input" id="w-title" value="${esc(d.title || '')}" placeholder="Fame">
                    </div>
                    <div class="form-group">
                        <label class="form-label">歌手/描述</label>
                        <input class="form-input" id="w-artist" value="${esc(d.artist || '')}" placeholder="RIIZE">
                    </div>`;
                break;
            case 'cute_player':
                fields = `
                    <div class="form-group">
                        <label class="form-label">封面 URL</label>
                        <input class="form-input" id="w-coverUrl" value="${esc(d.coverUrl || '')}" placeholder="https://...">
                    </div>
                    <div class="form-group">
                        <label class="form-label">顶部文字</label>
                        <input class="form-input" id="w-textTop" value="${esc(d.textTop || '')}" placeholder="☆ ✧:GOODNIGHT☽ ⋆">
                    </div>
                    <div class="form-group">
                        <label class="form-label">副标题</label>
                        <input class="form-input" id="w-textSub" value="${esc(d.textSub || '')}" placeholder=".. ♀ · ♀ ° ♀ · ♀ ..">
                    </div>`;
                break;
            case 'cute_date':
                fields = `
                    <div class="form-group">
                        <label class="form-label">萌宠 Emoji</label>
                        <input class="form-input" id="w-petEmoji" value="${esc(d.petEmoji || '')}" placeholder="🐰">
                    </div>
                    <div class="form-group">
                        <label class="form-label">日期文字</label>
                        <input class="form-input" id="w-dateStr" value="${esc(d.dateStr || '')}" placeholder="留空自动显示今天">
                    </div>`;
                break;
            case 'cute_pet':
                fields = `
                    <div class="form-group">
                        <label class="form-label">图片 URL</label>
                        <input class="form-input" id="w-imageUrl" value="${esc(d.imageUrl || '')}" placeholder="留空则显示 Emoji">
                    </div>
                    <div class="form-group">
                        <label class="form-label">中心 Emoji</label>
                        <input class="form-input" id="w-topEmoji" value="${esc(d.topEmoji || '')}" placeholder="🐰">
                    </div>
                    <div class="form-group">
                        <label class="form-label">底部文字</label>
                        <input class="form-input" id="w-text" value="${esc(d.text || '')}" placeholder="ฅ^•ω•^ฅ 🤍 ☁️">
                    </div>`;
                break;
            case 'cute_icons':
                fields = `
                    <div class="form-group">
                        <label class="form-label">气泡文字</label>
                        <input class="form-input" id="w-text" value="${esc(d.text || '')}" placeholder="ʕ•‘•ʔ ✩">
                    </div>`;
                break;
            case 'circle_photo':
                fields = `
                    <div class="form-group">
                        <label class="form-label">图片 URL</label>
                        <input class="form-input" id="w-url" value="${esc(d.url || '')}" placeholder="https://...">
                    </div>
                    <div class="form-group">
                        <label class="form-label">文字排版1</label>
                        <input class="form-input" id="w-text1" value="${esc(d.text1 || '')}" placeholder="Liquid">
                    </div>
                    <div class="form-group">
                        <label class="form-label">文字排版2</label>
                        <input class="form-input" id="w-text2" value="${esc(d.text2 || '')}" placeholder="Smooth">
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
                            'w-rightSub': 'rightSub', 'w-icon': 'icon',
                            'w-coverUrl': 'coverUrl', 'w-artist': 'artist',
                            'w-textTop': 'textTop', 'w-textSub': 'textSub',
                            'w-petEmoji': 'petEmoji', 'w-dateStr': 'dateStr',
                            'w-imageUrl': 'imageUrl', 'w-topEmoji': 'topEmoji',
                            'w-text1': 'text1', 'w-text2': 'text2'
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
