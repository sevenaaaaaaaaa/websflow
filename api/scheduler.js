/* ============================================================
 * WebsFlow · 定时任务调度 (scheduler.js)
 * 每日自动巡检:分析页面模块与文案 → 生成改进建议 → 通知作者
 * 说明:进程内 setInterval(30 分钟)检查到期任务(>20h 未跑)
 * ============================================================ */
const db = require('./../db');
const { chatOnce } = require('./ai');
const { notify } = require('./notify');
const { generateSettlements, lastMonthPeriod } = require('./settlement');
const reconcile = require('./reconcile');
const weeklyReport = require('./weekly-report');

const INSPECT_PROMPT = (summary) => `你是投放落地页巡检员。以下是一个正在投放的落地的模块清单与关键文案:
${summary}

请按优先级给出 3-5 条**具体可执行**的改进建议,覆盖:主视觉价值主张是否具体、信任要素是否足够、CTA 是否有力、移动端观感、以及该补齐的模块。每条一行,格式「问题 → 建议」,不要套话,总字数 300 字以内。`;

let timer = null;
let lastPlanCheck = 0;

async function runInspect(task) {
  const project = db.getProject(task.project_id, task.user_id);
  if (!project || !project.data) return '项目不存在或未同步';
  const blocks = (project.data.pages && project.data.pages[0] && project.data.pages[0].blocks) || project.data.blocks || [];
  const summary = blocks.slice(0, 20).map((b, i) => {
    const p = b.props || {};
    const label = p.title || p.text || p.brand || p.question || '';
    return `${i + 1}. ${b.type}${label ? ' — ' + String(label).slice(0, 40) : ''}`;
  }).join('\n');
  const reply = await chatOnce([
    { role: 'system', content: '你只输出中文改进建议清单,不要 JSON,不要客套。' },
    { role: 'user', content: INSPECT_PROMPT(summary) },
  ], { temperature: 0.5, maxTokens: 900 });
  return reply;
}

// 套餐生命周期:到期前 7/3/1 天提醒 + 到期自动降级(每 6 小时检查一次)
let lastWeeklyAt = 0;

// 渠道周报:每周一生成上周(幂等)
function weeklyTick() {
  if (Date.now() - lastWeeklyAt < 12 * 3600 * 1000) return;
  lastWeeklyAt = Date.now();
  try {
    const day = new Date().getUTCDay();   // 1 = 周一
    if (day !== 1) return;
    const r = weeklyReport.generate();
    console.log(`[weekly] ${r.period} ${r.skipped ? '已存在' : '已生成并推送'}`);
  } catch (e) {
    console.error('周报生成失败:', e.message);
  }
}

let lastReconcileAt = 0;

// 每日对账(PayFlow ↔ WebsFlow),24 小时一次
async function reconcileTick() {
  if (Date.now() - lastReconcileAt < 24 * 3600 * 1000) return;
  lastReconcileAt = Date.now();
  try {
    const r = await reconcile.run();
    console.log(`[reconcile](${r.source}) 检查 ${r.checked} 笔 · 补入账 ${r.healed} · 冲正 ${r.corrected || 0} · 不一致 ${r.amountMismatch.length} · 孤儿 ${r.orphans.length}`);
  } catch (e) {
    console.error('对账失败:', e.message);
  }
}

let lastSettlementCheck = 0;

// 月度结算:每月 1-3 日生成上月结算单(幂等)
function settlementTick() {
  if (Date.now() - lastSettlementCheck < 12 * 3600 * 1000) return;
  lastSettlementCheck = Date.now();
  try {
    const day = new Date().getUTCDate();
    if (day > 3) return;
    const r = generateSettlements(lastMonthPeriod());
    if (!r.skipped && r.created) console.log(`[settlement] ${r.period} 生成 ${r.created} 份结算单`);
  } catch (e) {
    console.error('结算单生成失败:', e.message);
  }
}

function planLifecycle() {
  if (Date.now() - lastPlanCheck < 6 * 3600 * 1000) return;
  lastPlanCheck = Date.now();
  try {
    for (const days of [1, 3, 7]) {  // 由紧急到宽松:最近的到期日优先生效
      db.getExpiringPlans(days).forEach((u) => {
        notify(u.id, 'review', `专业版还有不到 ${days} 天到期`, `到期时间 ${String(u.plan_expires_at).slice(0, 10)},续费后权益不中断`, '#/console');
        db.markPlanNoticed(u.id);
      });
    }
    // 刚过期 → 进入 3 天宽限期(权益保留,提示续费)
    db.getPlansToGrace().forEach((u) => {
      db.startGrace(u.id, 3);
      notify(u.id, 'review', '专业版已到期,进入 3 天宽限期', `宽限期内权益不变,请尽快续费;${String(u.plan_expires_at).slice(0, 10)} 到期`, '#/console');
    });
    // 宽限期结束 → 降级
    db.getExpiredPlans().forEach((u) => {
      db.downgradePlan(u.id);
      db.clearGrace(u.id);
      notify(u.id, 'sale', '宽限期结束,已切回免费版', `原到期时间 ${String(u.plan_expires_at).slice(0, 10)},续费即可恢复(云端项目与页面不受影响)`, '#/console');
    });
  } catch (e) {
    console.error('套餐生命周期检查失败:', e.message);
  }
}

async function tick() {
  try {
    planLifecycle();
    settlementTick();
    await reconcileTick();
    weeklyTick();
    const due = db.getDueScheduledTasks(20);
    for (const t of due) {
      try {
        const result = await runInspect(t);
        db.updateScheduledRun(t.id, result);
        notify(t.user_id, 'review', `每日巡检完成:${t.name}`, String(result).slice(0, 300), '#/console');
      } catch (e) {
        db.updateScheduledRun(t.id, '巡检失败:' + e.message);
      }
    }
  } catch (e) {
    console.error('调度器异常:', e.message);
  }
}

function start() {
  if (timer) return;
  setTimeout(() => { tick(); }, 60 * 1000);      // 启动 1 分钟后首次检查
  timer = setInterval(tick, 30 * 60 * 1000);      // 每 30 分钟检查一次
  console.log('定时巡检调度器已启动');
}

module.exports = { start, tick, runInspect };
