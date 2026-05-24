// core/store.js
const Store = (() => {
    const DB_NAME = 'IPHONEEX_DB';
    const DB_VERSION = 1;
    let db = null;
    let initPromise = null;

    const STORES = {
        settings: 'settings',
        characters: 'characters',
        chats: 'chats',
        messages: 'messages',
        summaries: 'summaries',
        knowledgeBooks: 'knowledgeBooks',
        calendarEvents: 'calendarEvents',
        forumPosts: 'forumPosts',
        moments: 'moments',
        widgets: 'widgets',
        desktopLayout: 'desktopLayout',
        logs: 'logs',
        diaries: 'diaries'
    };

    function init() {
        if (initPromise) return initPromise;
        initPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = (e) => {
                const d = e.target.result;
                if (!d.objectStoreNames.contains(STORES.settings))
                    d.createObjectStore(STORES.settings, { keyPath: 'key' });
                if (!d.objectStoreNames.contains(STORES.characters))
                    d.createObjectStore(STORES.characters, { keyPath: 'id' });
                if (!d.objectStoreNames.contains(STORES.chats)) {
                    const s = d.createObjectStore(STORES.chats, { keyPath: 'id' });
                    s.createIndex('updatedAt', 'updatedAt');
                }
                if (!d.objectStoreNames.contains(STORES.messages)) {
                    const s = d.createObjectStore(STORES.messages, { keyPath: 'id' });
                    s.createIndex('chatId', 'chatId');
                    s.createIndex('chatId_timestamp', ['chatId', 'timestamp']);
                }
                if (!d.objectStoreNames.contains(STORES.summaries)) {
                    const s = d.createObjectStore(STORES.summaries, { keyPath: 'id' });
                    s.createIndex('chatId', 'chatId');
                }
                if (!d.objectStoreNames.contains(STORES.knowledgeBooks))
                    d.createObjectStore(STORES.knowledgeBooks, { keyPath: 'id' });
                if (!d.objectStoreNames.contains(STORES.calendarEvents)) {
                    const s = d.createObjectStore(STORES.calendarEvents, { keyPath: 'id' });
                    s.createIndex('date', 'date');
                }
                if (!d.objectStoreNames.contains(STORES.forumPosts)) {
                    const s = d.createObjectStore(STORES.forumPosts, { keyPath: 'id' });
                    s.createIndex('createdAt', 'createdAt');
                }
                if (!d.objectStoreNames.contains(STORES.moments)) {
                    const s = d.createObjectStore(STORES.moments, { keyPath: 'id' });
                    s.createIndex('createdAt', 'createdAt');
                }
                if (!d.objectStoreNames.contains(STORES.widgets))
                    d.createObjectStore(STORES.widgets, { keyPath: 'id' });
                if (!d.objectStoreNames.contains(STORES.desktopLayout))
                    d.createObjectStore(STORES.desktopLayout, { keyPath: 'key' });
                if (!d.objectStoreNames.contains(STORES.logs))
                    d.createObjectStore(STORES.logs, { keyPath: 'id', autoIncrement: true });
                if (!d.objectStoreNames.contains(STORES.diaries)) {
                    const s = d.createObjectStore(STORES.diaries, { keyPath: 'id' });
                    s.createIndex('charId', 'charId');
                }
            };
            request.onsuccess = (e) => { db = e.target.result; resolve(db); };
            request.onerror = (e) => reject(e.target.error);
        });return initPromise;
    }

    function getDB() {
        if (!db) throw new Error('Database not initialized');
        return db;
    }

    function isReady() { return db !== null; }

    async function put(storeName, data) {
        if (!db) await init();
        return new Promise((resolve, reject) => {
            const tx = getDB().transaction(storeName, 'readwrite');
            const req = tx.objectStore(storeName).put(data);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    async function get(storeName, key) {
        if (!db) await init();
        return new Promise((resolve, reject) => {
            const tx = getDB().transaction(storeName, 'readonly');
            const req = tx.objectStore(storeName).get(key);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    async function getAll(storeName) {
        if (!db) await init();
        return new Promise((resolve, reject) => {
            const tx = getDB().transaction(storeName, 'readonly');
            const req = tx.objectStore(storeName).getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    async function del(storeName, key) {
        if (!db) await init();
        return new Promise((resolve, reject) => {
            const tx = getDB().transaction(storeName, 'readwrite');
            const req = tx.objectStore(storeName).delete(key);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }

    async function clear(storeName) {
        if (!db) await init();
        return new Promise((resolve, reject) => {
            const tx = getDB().transaction(storeName, 'readwrite');
            const req = tx.objectStore(storeName).clear();
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }

    async function getAllByIndex(storeName, indexName, value) {
        if (!db) await init();
        return new Promise((resolve, reject) => {
            const tx = getDB().transaction(storeName, 'readonly');
            const req = tx.objectStore(storeName).index(indexName).getAll(value);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    async function count(storeName) {
        if (!db) await init();
        return new Promise((resolve, reject) => {
            const tx = getDB().transaction(storeName, 'readonly');
            const req = tx.objectStore(storeName).count();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    async function getSetting(key, defaultValue = null) {
        try {
            const result = await get(STORES.settings, key);
            return result ? result.value : defaultValue;
        } catch {
            return defaultValue;
        }
    }

    async function setSetting(key, value) {
        return put(STORES.settings, { key, value });
    }

    return { init, isReady, STORES, put, get, getAll, del, clear, getAllByIndex, count, getSetting, setSetting };
})();

