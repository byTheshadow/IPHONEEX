// core/logger.js
// ============================================
// Error Logger
// ============================================

const Logger = (() => {
    const MAX_LOGS = 500;
    const logs = [];

    function createEntry(level, message, detail = '') {
        return {
            timestamp: Date.now(),
            time: new Date().toISOString(),
            level,
            message: String(message),
            detail: String(detail)
        };
    }

    async function save(entry) {
        logs.push(entry);
        if (logs.length > MAX_LOGS) logs.shift();
        try {
            await Store.put(Store.STORES.logs, {entry,
                id: `log_${entry.timestamp}_${Math.random().toString(36).slice(2, 8)}`
            });
        } catch (e) {
            console.error('Logger save failed:', e);
        }
    }

    function info(message, detail) {
        const entry = createEntry('INFO', message, detail);
        console.log(`[INFO] ${message}`, detail || '');
        save(entry);
    }

    function warn(message, detail) {
        const entry = createEntry('WARN', message, detail);
        console.warn(`[WARN] ${message}`, detail || '');
        save(entry);
    }

    function error(message, detail) {
        const entry = createEntry('ERROR', message, detail);
        console.error(`[ERROR] ${message}`, detail || '');
        save(entry);
    }

    async function getAll() {
        try {
            return await Store.getAll(Store.STORES.logs);
        } catch {
            return [...logs];
        }
    }

    async function clearAll() {
        logs.length = 0;
        try {
            await Store.clear(Store.STORES.logs);
        } catch (e) {
            console.error('Logger clear failed:', e);
        }
    }

    // Global error handler
    window.addEventListener('error', (e) => {
        error(`Uncaught: ${e.message}`, `${e.filename}:${e.lineno}:${e.colno}\n${e.error?.stack || ''}`);
    });

    window.addEventListener('unhandledrejection', (e) => {
        error(`Unhandled Promise: ${e.reason}`, e.reason?.stack || '');
    });

    return { info, warn, error, getAll, clearAll };
})();
