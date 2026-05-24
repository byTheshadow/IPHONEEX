/**
 * db.js — 基于 localForage 的数据表CRUD 封装
 */

const lf = window.localforage;

function createStore(storeName) {
  const store = lf.createInstance({
    name: 'IPHONEEX',
    storeName: storeName,
  });

  return {
    async get(key) { return store.getItem(key); },
    async set(key, value) { return store.setItem(key, value); },
    async remove(key) { return store.removeItem(key); },
    async getAll() {
      const items = [];
      await store.iterate((value, key) => {
        items.push({ _key: key, ...value });
      });
      return items;
    },
    async keys() { return store.keys(); },
    async clear() { return store.clear(); },async count() { return store.length(); },
    raw: store,
  };
}

export const db = {
  user:createStore('user'),       // 玩家偏好 & 设置
  characters: createStore('characters'), // 角色卡片
  chats:      createStore('chats'),      // 对话存档
  events:     createStore('events'),     // 日历事件
  moments:    createStore('moments'),    // 朋友圈动态
  knowledge:  createStore('knowledge'),  // 全局知识书
};
