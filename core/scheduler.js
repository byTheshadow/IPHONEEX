// core/scheduler.js
// ============================================
// Background Task Scheduler
// ============================================

const Scheduler = (() => {
    const tasks = new Map();
    let enabled = false;

    async function init() {
        enabled = await Store.getSetting('background_trigger', false);
    }

    function register(id, intervalMs, callback) {
        if (tasks.has(id)) {
            clearInterval(tasks.get(id).timer);
        }
        const timer = setInterval(() => {
            if (enabled) {
                try { callback(); } catch (e) {
                    Logger.error(`Scheduler task [${id}] failed`, e.message);
                }
            }
        }, intervalMs);
        tasks.set(id, { timer, interval: intervalMs, callback });
    }

    function unregister(id) {
        if (tasks.has(id)) {
            clearInterval(tasks.get(id).timer);
            tasks.delete(id);
        }
    }

    function setEnabled(val) {
        enabled = val;
        Store.setSetting('background_trigger', val);
    }

    function isEnabled() {
        return enabled;
    }

    return { init, register, unregister, setEnabled, isEnabled };
})();
