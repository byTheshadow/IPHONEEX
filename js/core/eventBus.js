/**
 * eventBus.js — 发布-订阅事件总线
 *替代 Vuex/Redux，实现跨模块通讯
 */

class EventBus {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this._listeners = new Map();
  }

  /**
   * 订阅事件
   * @param {string}   event事件名
   * @param {Function} callback 回调函数
   * @returns {Function} 取消订阅的函数
   */
  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(callback);

    // 返回 unsubscribe 函数
    return () => this.off(event, callback);
  }

  /**
   * 仅订阅一次
   */
  once(event, callback) {
    const wrapper = (data) => {
      callback(data);
      this.off(event, wrapper);
    };
    this.on(event, wrapper);
  }

  /**
   * 取消订阅
   */
  off(event, callback) {
    const set = this._listeners.get(event);
    if (set) {
      set.delete(callback);
      if (set.size === 0) this._listeners.delete(event);
    }
  }

  /**
   * 发布事件
   * @param {string} event 事件名
   * @param {*}      data  携带数据
   */
  emit(event, data) {
    const set = this._listeners.get(event);
    if (!set) return;
    set.forEach(cb => {
      try {
        cb(data);
      } catch (err) {
        console.error(`[EventBus] 事件 "${event}" 回调出错:`, err);
      }
    });
  }

  /**
   * 清除某事件的所有监听，或清除全部
   */
  clear(event) {
    if (event) {
      this._listeners.delete(event);
    } else {
      this._listeners.clear();
    }
  }
}

export const eventBus = new EventBus();
