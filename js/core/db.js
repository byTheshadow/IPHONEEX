/**
 * db.js — 基于 localForage 的数据表CRUD 封装
 * 每个数据表对应一个独立的 localForage 实例（独立 IndexedDB store）
 */

// localForage 由index.html 中<script> 标签全局加载
const lf = window.localforage;

/**
 * 创建一个数据表操作对象
 * @param {string} storeName 表名
 */
function createStore(storeName) {
  const store = lf.createInstance({
    name:'IPHONEEX',          // 数据库名（仓库名）
    storeName: storeName,});

  return {
    /** 获取单条记录 */
    async get(key) {
      return store.getItem(key);
    },

    /** 写入/更新单条记录 */
    async set(key, value) {
      return store.setItem(key, value);
    },

    /** 删除单条记录 */
    async remove(key) {
      return store.removeItem(key);
    },

    /** 获取所有记录（返回数组） */
    async getAll() {
      const items = [];
      await store.iterate((value, key) => {
        items.push({ _key: key, ...value });
      });
      return items;
    },

    /** 获取所有 key */
    async keys() {
      return store.keys();
    },

    /** 清空整个表 */
    async clear() {
      return store.clear();
    },

    /** 记录条数 */
    async count() {
      return store.length();
    },

    /** 原始localForage 实例（高级用法） */
    raw: store,
  };
}

//── 导出各数据表 ──
export const db = {
  user:createStore('user'),
  characters: createStore('characters'),
  chats:      createStore('chats'),
  events:     createStore('events'),
  moments:    createStore('moments'),
};
