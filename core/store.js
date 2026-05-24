// core/store.js
// ============================================
// IndexedDB Wrapper — Data Persistence Layer
// ============================================

const Store = (() => {
    const DB_NAME = 'IPHONEEX_DB';
    const DB_VERSION = 1;
    let db = null;

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

    async function init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (e) => {
                const db = e.target.result;

                // Settings (key-value)
                if (!db.objectStoreNames.contains(STORES.settings)) {
                    db.createObjectStore(STORES.settings, { keyPath: 'key' });
                }

                // Characters
                if (!db.objectStoreNames.contains(STORES.characters)) {
                    db.createObjectStore(STORES.characters, { keyPath: 'id' });
                }

                // Chats
                if (!db.objectStoreNames.contains(STORES.chats)) {
                    const store = db.createObjectStore(STORES.chats, { keyPath: 'id' });
                    store.createIndex('updatedAt', 'updatedAt', { unique: false });
                }

                // Messages
                if (!db.objectStoreNames.contains(STORES.messages)) {
                    const store = db.createObjectStore(STORES.messages, { keyPath: 'id' });
                    store.createIndex('chatId', 'chatId', { unique: false });
                    store.createIndex('chatId_timestamp', ['chatId', 'timestamp'], { unique: false });
                }

                // Summaries
                if (!db.objectStoreNames.contains(STORES.summaries)) {
                    const store = db.createObjectStore(STORES.summaries, { keyPath: 'id' });
                    store.createIndex('chatId', 'chatId', { unique: false });
                }

                // Knowledge Books
                if (!db.objectStoreNames.contains(STORES.knowledgeBooks)) {
                    db.createObjectStore(STORES.knowledgeBooks, { keyPath: 'id' });
                }

                // Calendar Events
                if (!db.objectStoreNames.contains(STORES.calendarEvents)) {
                    const store = db.createObjectStore(STORES.calendarEvents, { keyPath: 'id' });
                    store.createIndex('date', 'date', { unique: false });
                }

                // Forum Posts
                if (!db.objectStoreNames.contains(STORES.forumPosts)) {
                    const store = db.createObjectStore(STORES.forumPosts, { keyPath: 'id' });
                    store.createIndex('createdAt', 'createdAt', { unique: false });
                }

                // Moments
                if (!db.objectStoreNames.contains(STORES.moments)) {
                    const store = db.createObjectStore(STORES.moments, { keyPath: 'id' });
                    store.createIndex('createdAt', 'createdAt', { unique: false });
                }

                // Widgets
                if (!db.objectStoreNames.contains(STORES.widgets)) {
                    db.createObjectStore(STORES.widgets, { keyPath: 'id' });
                }

                // Desktop Layout
                if (!db.objectStoreNames.contains(STORES.desktopLayout)) {
                    db.createObjectStore(STORES.desktopLayout, { keyPath: 'key' });
                }

                // Logs
                if (!db.objectStoreNames.contains(STORES.logs)) {
                    const store = db.createObjectStore(STORES.logs, { keyPath: 'id', autoIncrement: true });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }

                // Diaries (AI's secret diary per character)
                if (!db.objectStoreNames.contains(STORES.diaries)) {
                    const store = db.createObjectStore(STORES.diaries, { keyPath: 'id' });
                    store.createIndex('charId', 'charId', { unique: false });
                }
            };

            request.onsuccess = (e) => {
                db = e.target.result;
                resolve(db);
            };

            request.onerror = (e) => {
                reject(e.target.error);
            };
        });
    }

    function getDB() {
        if (!db) throw new Error('Database not initialized');
        return db;
    }

    async function put(storeName, data) {
        return new Promise((resolve, reject) => {
            const tx = getDB().transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.put(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async function get(storeName, key) {
        return new Promise((resolve, reject) => {
            const tx = getDB().transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async function getAll(storeName) {
        return new Promise((resolve, reject) => {
            const tx = getDB().transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async function del(storeName, key) {
        return new Promise((resolve, reject) => {
            const tx = getDB().transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.delete(key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async function clear(storeName) {
        return new Promise((resolve, reject) => {
            const tx = getDB().transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async function getAllByIndex(storeName, indexName, value) {
        return new Promise((resolve, reject) => {
            const tx = getDB().transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(value);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async function count(storeName) {
        return new Promise((resolve, reject) => {
            const tx = getDB().transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.count();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Settings helpers
    async function getSetting(key, defaultValue = null) {
        const result = await get(STORES.settings, key);
        return result ? result.value : defaultValue;
    }

    async function setSetting(key, value) {
        return put(STORES.settings, { key, value });
    }

    return {
        init,
        STORES,
        put,
        get,
        getAll,
        del,
        clear,
        getAllByIndex,
        count,
        getSetting,
        setSetting
    };
})();
