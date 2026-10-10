/* ============================================================
 * WebsFlow · 任务运行台账 (runner.js)
 * 后台每个自动化任务(巡检/增长 Agent/目标编排/体检/周报…)起跑时登记,
 * 结束时落状态。首页"正在跑的自动化任务"直接读 running 快照。
 * ============================================================ */
const db = require('../db');

// 开始一个任务,返回 runId
function start(kind, name, opts) {
  opts = opts || {};
  try {
    return db.addTaskRun(kind, name, opts.ref || null, opts.userId || null);
  } catch (e) {
    console.error('[runner] 登记失败:', e.message);
    return null;
  }
}

// 结束:status ∈ succeeded / failed / skipped
function finish(runId, status, note) {
  if (!runId) return;
  try { db.finishTaskRun(runId, status, String(note || '').slice(0, 500)); } catch (e) { /* 忽略 */ }
}

// 包装异步任务:自动登记起止与结果
async function run(kind, name, opts, fn) {
  const id = start(kind, name, opts);
  const t0 = Date.now();
  try {
    const r = await fn(id);
    finish(id, 'succeeded', `${Math.round((Date.now() - t0) / 1000)}s`);
    return r;
  } catch (e) {
    finish(id, 'failed', e.message);
    throw e;
  }
}

// 正在跑的任务快照(先把超过 30 分钟还挂着标成 timeout,再返回 running)
function runningSnapshot() {
  try { return db.runningTaskRuns(30); } catch (e) { return []; }
}

function recent(limit) {
  try { return db.recentTaskRuns(limit || 30); } catch (e) { return []; }
}

module.exports = { start, finish, run, runningSnapshot, recent };