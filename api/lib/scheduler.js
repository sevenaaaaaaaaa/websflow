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
const alerts = require('./alerts');
const growthAgent = require('./growth-agent');
const selfcheck = require('./selfcheck');

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
async function weeklyTick() {
  if (Date.now() - lastWeeklyAt < 12 * 3600 * 1000) return;
  lastWeeklyAt = Date.now();
  try {
    const day = new Date().getUTCDay();   // 1 = 周一
    if (day !== 1) return;
    const r = await weeklyReport.generate();
    console.log(`[weekly] ${r.period} ${r.skipped ? '已存在' : '已生成并推送'}`);
  } catch (e) {
    console.error('周报生成失败:', e.message);
  }
}

let lastReconcileAt = 0;

// 每日对账(PayFlow ↔ WebsFlow),24 小时一次
let lastAlertCheck = 0;
let lastPruneAt = 0;

// 事件归档:每天一次(原始事件保留 120 天,过期预览一并清理)
async function pruneTick() {
  if (Date.now() - lastPruneAt < 20 * 3600 * 1000) return;
  lastPruneAt = Date.now();
  try {
    const r = db.pruneOldEvents();
    if (r.removed) console.log(`[prune] 清理 ${r.removed} 条过期事件(保留 ${r.days} 天)`);
  } catch (e) { console.error('事件清理失败:', e.message); }
}

let lastGoalAt = 0;
// 目标驱动编排:每 30 分钟评估一次(内部按目标自身状态决定是否动作)
async function goalTick() {
  if (Date.now() - lastGoalAt < 25 * 60 * 1000) return;
  lastGoalAt = Date.now();
  try {
    const out = require('./orchestrator').tickAll ? await require('./orchestrator').tickAll() : [];
    const active = out.filter((x) => ['start_round', 'propose', 'met', 'expired'].includes(x.action));
    if (active.length) console.log('[goal] 编排:', active.map((x) => `${x.action}(${x.value}→${x.target})`).join(', '));
  } catch (e) { console.error('目标编排失败:', e.message); }
}

let lastProbeAt = 0;
// 能力目录探活:每天一次,标记 unreachable(Agent 不应调用已挂能力)
async function probeTick() {
  if (Date.now() - lastProbeAt < 20 * 3600 * 1000) return;
  lastProbeAt = Date.now();
  try {
    const caps = require('./capabilities');
    const all = db.listCapabilities({ invoke: 'http' }).filter((c) => c.endpoint);
    let ok = 0, bad = 0, skip = 0;
    for (const c of all.slice(0, 30)) {
      const r = await caps.probeOne(c);
      if (r.skipped) skip++; else if (r.ok) ok++; else bad++;
    }
    if (ok || bad) console.log(`[caps] 探活:可用 ${ok} · 不可达 ${bad} · 跳过 ${skip}`);
  } catch (e) { console.error('能力探活失败:', e.message); }
}

// 告警评估:每 10 分钟
function alertTick() {
  if (Date.now() - lastAlertCheck < 10 * 60 * 1000) return;
  lastAlertCheck = Date.now();
  const fired = alerts.tick();
  if (fired) console.log(`[alerts] 触发 ${fired} 条告警`);
}

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
async function settlementTick() {
  if (Date.now() - lastSettlementCheck < 12 * 3600 * 1000) return;
  lastSettlementCheck = Date.now();
  try {
    const day = new Date().getUTCDate();
    if (day > 3) return;
    const r = await generateSettlements(lastMonthPeriod());
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
    await settlementTick();
    await reconcileTick();
    alertTick();
    await weeklyTick();
    await pruneTick();
    await probeTick();
    await goalTick();
    // 增长 Agent:自主跑轮(每 30 分钟检查,内部按冷却/观察期自我节流)
    try {
      const g = await growthAgent.tickAll();
      const moved = g.filter((x) => x.phase || x.skip === 'insufficient-traffic' || x.skip === 'max-rounds');
      if (moved.length) console.log('[growth] 推进:', moved.map((x) => `${x.project_id.slice(0, 8)} ${x.phase || x.skip}`).join(', '));
    } catch (e) { console.error('增长 Agent 调度失败:', e.message); }

    const due = db.getDueScheduledTasks(20);
    for (const t of due) {
      try {
        const result = await runInspect(t);
    try { await dailySelfCheck(); } catch (e) { /* 每日一次,失败不阻塞 */ }
    // ↑ 每个 tick(30 分钟)调用,内部按天去重
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

// 每日系统体检:自动修掉"系统能修"的问题,并把摘要推给人(用户不用去别的入口配)
let lastSelfCheckDate = '';
async function dailySelfCheck() {
  const today = new Date().toISOString().slice(0, 10);
  if (lastSelfCheckDate === today) return null;
  lastSelfCheckDate = today;
  try {
    const users = db.listUsers ? db.listUsers() : [];
    const done = [];
    for (const u of users) {
      const report = await selfcheck.run(u, { deep: false, applyFixes: true });
      try { db.addSelfCheck({ user_id: u.id, ok: report.ok ? 1 : 0, warns: report.warns, report: JSON.stringify(report) }); } catch (e) {}
      const fixed = (report.fixes || []).filter((f) => f.ok).length;
      if (report.warns || fixed) {
        const lines = (report.items || []).filter((i) => i.level === 'warn').map((i) => `- ${i.title}:${i.detail}`);
        try {
          require('./notify').notify(u.id, 'review', '🩺 今日系统体检', [`自动处理 ${fixed} 项`, ...lines].slice(0, 6).join('\n'), '#/console');
        } catch (e) {}
      }
      done.push({ user: u.id, warns: report.warns, fixed });
    }
    if (done.length) console.log('[selfcheck] 每日体检完成:', JSON.stringify(done));
    return done;
  } catch (e) { console.error('[selfcheck] 体检失败:', e.message); return null; }
}

function start() {
  if (timer) return;
  setTimeout(() => { tick(); }, 60 * 1000);      // 启动 1 分钟后首次检查
  setTimeout(() => { dailySelfCheck().catch(() => {}); }, 90 * 1000);   // 启动 1.5 分钟后跑一次体检
  timer = setInterval(tick, 30 * 60 * 1000);      // 每 30 分钟检查一次
  console.log('定时巡检调度器已启动');
}

module.exports = { start, tick, runInspect, dailySelfCheck };
