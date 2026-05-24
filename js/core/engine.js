/**
 * engine.js — 虚拟时间轴引擎
 * 支持开关控制 AI 自主发消息
 */

import { db } from './db.js';
import { eventBus } from './eventBus.js';

const ENGINE_TICK_MS = 60_000;

class Engine {
  constructor() {
    this._timer = null;
    this._running = false;
    this._aiAutoEnabled = false;
  }

  async start() {
    if (this._running) return;
    this._running = true;

    const settings = await db.user.get('engine_settings');
    this._aiAutoEnabled = settings?.aiAutoEnabled ?? false;

    console.log('[Engine] 🚀 引擎已启动, AI自主消息:', this._aiAutoEnabled ? '开' : '关');

    this._tick();
    this._timer = setInterval(() => this._tick(), ENGINE_TICK_MS);
  }

  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    this._running = false;
    console.log('[Engine] ⏹ 引擎已停止');
  }

  get aiAutoEnabled() {
    return this._aiAutoEnabled;
  }

  async setAiAutoEnabled(enabled) {
    this._aiAutoEnabled = enabled;
    await db.user.set('engine_settings', { aiAutoEnabled: enabled });
    eventBus.emit('engine:aiAutoChanged', { enabled });
    console.log('[Engine] AI自主消息:', enabled ? '已开启' : '已关闭');
  }

  async _tick() {
    if (!this._aiAutoEnabled) return;
    const now = new Date();
    try {
      // TODO: 阶段三实现
      // await this._checkProactiveGreeting(now);
      // await this._checkAutoMoments(now);
      // await this._checkUpcomingEvents(now);
    } catch (err) {
      console.error('[Engine] tick 出错:', err);
    }
  }

  get isRunning() {
    return this._running;
  }
}

export const engine = new Engine();
