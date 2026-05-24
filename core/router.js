// core/router.js
const Router = (() => {
    const apps = new Map();
    let currentApp = null;
    let history = [];

    function register(id, appModule) { apps.set(id, appModule); }
    function getApp(id) { return apps.get(id); }

    async function open(appId, params = {}) {
        const app = apps.get(appId);
        if (!app) { Logger.error(`App not found: ${appId}`); return; }

        const appLayer = document.getElementById('app-layer');
        const appContent = document.getElementById('app-content');

        if (currentApp) history.push(currentApp);
        currentApp = appId;

        appContent.innerHTML = '';
        if (app.render) {
            const content = await app.render(params);
            if (typeof content === 'string') appContent.innerHTML = content;
            else if (content instanceof HTMLElement) appContent.appendChild(content);
        }

        appLayer.classList.remove('hidden', 'closing');
        appLayer.classList.add('opening');
        setTimeout(() => appLayer.classList.remove('opening'), 400);

        if (app.init) await app.init(params);
        Logger.info(`App opened: ${appId}`);
    }

    function close() {
        const appLayer = document.getElementById('app-layer');
        appLayer.classList.add('closing');
        setTimeout(() => {
            appLayer.classList.add('hidden');
            appLayer.classList.remove('closing');
            document.getElementById('app-content').innerHTML = '';
            if (history.length > 0) {
                const prev = history.pop();
                currentApp = null;
                open(prev);
            } else {
                currentApp = null;
            }
        }, 300);
    }

    function closeAll() {
        const appLayer = document.getElementById('app-layer');
        history = [];
        currentApp = null;
        appLayer.classList.add('hidden');
        appLayer.classList.remove('opening', 'closing');
        document.getElementById('app-content').innerHTML = '';
    }

    function getCurrent() { return currentApp; }

    return { register, getApp, open, close, closeAll, getCurrent };
})();
