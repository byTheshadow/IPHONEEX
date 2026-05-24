// core/logger.js
const Logger = (() => {
    const MAX_LOGS = 500;
    const logs = [];
    let pendingSaves = [];

    function createEntry(level, message, detail = '') {
        return {
            id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            timestamp: Date.now(),
            time: new Date().toISOString(),
            level,
            message: String(message),
            detail: String(detail || '')
        };
    }

    async function save(entry) {
        logs.push(entry);
        if (logs.length > MAX_LOGS) logs.shift();
        if (Store.isReady()) {
            try {
                // Flush any pending saves
                while (pendingSaves.length > 0) {
                    const p = pendingSaves.shift();
                    await Store.put(Store.STORES.logs, p);
                }
                await Store.put(Store.STORES.logs, entry);
            } catch (e) {
                console.warn('Logger save failed:', e);
            }
        } else {
            pendingSaves.push(entry);
        }
    }

    function info(msg, detail) {
        const entry = createEntry('INFO', msg, detail);
        console.log(`%c[INFO]%c ${msg}`, 'color:#888;font-weight:bold','color:inherit', detail || '');
        save(entry);
    }

    function warn(msg, detail) {
        const entry = createEntry('WARN', msg, detail);
        console.warn(`[WARN] ${msg}`, detail || '');
        save(entry);
    }

    function error(msg, detail) {
        const entry = createEntry('ERROR', msg, detail);
        console.error(`[ERROR] ${msg}`, detail || '');
        save(entry);
    }

    async function getAll() {
        try {
            if (Store.isReady()) return await Store.getAll(Store.STORES.logs);
        } catch {}
        return [...logs];
    }

    async function clearAll() {
        logs.length = 0;
        pendingSaves.length = 0;
        try { await Store.clear(Store.STORES.logs); } catch {}
    }

    window.addEventListener('error', (e) => {
        error(`Uncaught: ${e.message}`, `${e.filename}:${e.lineno}:${e.colno}\n${e.error?.stack || ''}`);
    });

    window.addEventListener('unhandledrejection', (e) => {
        error(`Unhandled Promise: ${e.reason}`, e.reason?.stack || '');
    });

    return { info, warn, error, getAll, clearAll };
})();

