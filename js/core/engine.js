/**
 * engine.js — 虚拟时间轴引擎（骨架）
 *
 * 职责：
 *  - 每分钟检测一次，判断是否触发 AI 主动打招呼
 *  - 每天固定时间触发朋友圈自动生成
 *  - 后续阶段填充完整逻辑
 */

import { eventBus } from './eventBus.js';

const ENGINE_TICK_MS = 60_000; // 1 分钟

class Engine {
  constructor() {
    this._timer= null;
    this._running = false;
  }

  /**
   * 启动引擎
   */
  start() {
    if (this._running) return;
    this._running = true;

    console.log('[Engine] 🚀 虚拟时间轴引擎已启动');

    // 立即执行一次
    this._tick();

    // 每分钟循环
    this._timer = setInterval(() => this._tick(), ENGINE_TICK_MS);
  }

  /**
   * 停止引擎
   */
  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    this._running = false;
    console.log('[Engine] ⏹ 引擎已停止');
  }

  /**
   * 每分钟执行的核心逻辑
   */
  async _tick() {
    const now = new Date();

    try {
      // TODO: 阶段二实现 —— 检测用户空闲时间，触发 AI 主动打招呼
      // await this._checkProactiveGreeting(now);

      // TODO: 阶段二实现 —— 检测是否到达朋友圈自动发布时间
      // await this._checkAutoMoments(now);

      // TODO: 阶段二实现 —— 检测即将到来的日历事件，推送提醒
      // await this._checkUpcomingEvents(now);

    } catch (err) {
      console.error('[Engine] tick 出错:', err);
    }
  }

  /**
   * 获取引擎运行状态
   */
  get isRunning() {
    return this._running;
  }
}

export const engine = new Engine();
