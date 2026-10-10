/* ============================================================
 * WebsFlow · 定时任务调度 (scheduler.js)
 * 每日自动巡检:分析页面模块与文案 → 生成改进建议 → 通知作者
 * 说明:进程内 setInterval(30 分钟)检查到期任务(>20h 未跑)
 * ============================================================ */
const db = require('./../db');
const { chatOnce, setScene } = require('./ai');
const { notify } = require('./notify');
const { generateSettlements, lastMonthPeriod } = require('./settlement');
const reconcile = require('./reconcile');
const weeklyReport = require('./weekly-report');
const alerts = require('./alerts');
const growthAgent = require('./growth-agent');
const selfcheck = require('./selfcheck');
const workday = require('./workday');
const runner = require('./runner');
const dailyReport = require('./daily-report');

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
  ], { temperature: 0.5, maxTokens: 900, scene: 'inspect', userId: task.user_id });
  return reply;
}

// 巡检退避:连续失败 ≥3 次 → 24h 内不再重试(如 AI 余额不足,别每个 tick 傻傻重烧)
const INSPECT_BK = (id) => `inspect:backoff:${id}`;
function inspectBackedOff(id) {
  try {
    const raw = db.opsGet(INSPECT_BK(id));
    if (!raw) return false;
    const b = JSON.parse(raw);
    if (Date.now() - b.first >= 24 * 3600 * 1000) { db.opsDel(INSPECT_BK(id)); return false; }
    return true;
  } catch (e) { return false; }
}
function inspectRecordFail(id, msg) {
  try {
    const prev = JSON.parse(db.opsGet(INSPECT_BK(id)) || 'null');
    const n = (prev && prev.n ? prev.n : 0) + 1;
    if (n >= 3) db.opsSet(INSPECT_BK(id), JSON.stringify({ n, first: prev && prev.first ? prev.first : Date.now(), lastErr: String(msg).slice(0, 120) }));
  } catch (e) {}
}
function inspectRecordOk(id) { try { db.opsDel(INSPECT_BK(id)); } catch (e) {} }

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
// 目标驱动编排:每 30 分钟评估一次(内部按目标自身状态决定是否动作;夜间窗口内才被调度)
async function goalTick() {
  if (Date.now() - lastGoalAt < 25 * 60 * 1000) return;
  lastGoalAt = Date.now();
  try {
    const out = await runner.run('goal-orchestrator', '目标编排评估', {}, async () => {
      const orch = require('./orchestrator');
      return orch.tickAll ? await orch.tickAll() : [];
    });
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
    // ---- 重要任务:每天都在(告警/对账/结算/生命周期/周报/报告) ----
    planLifecycle();
    await settlementTick();
    await reconcileTick();
    alertTick();
    await weeklyTick();
    await pruneTick();
    await probeTick();
    // 晨(07:30)/暮(18:30)管理员邮件报告,窗口内去重发送(休息日也发)
    try { await dailyReport.maybeSend(); } catch (e) { console.error('日报发送失败:', e.message); }

    // ---- 收敛与评估(零 AI 消耗):全天运行,不占夜间窗口 ----
    // 1) 收敛孤儿轮:配置已删/评估无人认领、挂起超 72h 的 running 轮强制结束,防止永久堆积
    try {
      const stale = await growthAgent.concludeStaleRuns();
      if (stale.concluded && stale.concluded.length) console.log(`[growth] 孤儿轮清理:收敛 ${stale.concluded.length}/${stale.scanned} 个(id:${stale.concluded.slice(0, 5).map((x) => x.id.slice(0, 8)).join(',')}${stale.concluded.length > 5 ? '…' : ''})`);
    } catch (e) { console.error('孤儿轮清理失败:', e.message); }
    // 2) 只评估进行中的实验(判断是否已出结果),不提假设、不起新轮 —— 白天也能正常收官
    try {
      const g = await growthAgent.tickAll(null, { evaluateOnly: true });
      const waiting = g.filter((x) => x.phase === 'waiting');
      if (waiting.length) console.log(`[growth] 评估模式:${waiting.length} 个实验进行中(零 AI)`);
    } catch (e) { console.error('增长评估失败:', e.message); }

    // ---- 非重要(耗 Token)任务:仅工作日 + 夜间窗口(默认 00:00-06:00),6 点前必须结束 ----
    const bg = workday.backgroundAllowed();
    if (!bg.allowed) {
      console.log(`[scheduler] 后台任务跳过:${bg.reason}`);
      return;
    }
    setScene('orchestrator');

    // 每日体检:窗口内执行(内部按天去重),登记台账
    try {
      const done = await runner.run('selfcheck', '每日系统体检', {}, () => dailySelfCheck());
      if (done && done.length) console.log('[selfcheck] 完成:', JSON.stringify(done).slice(0, 200));
    } catch (e) { if (!/预算|窗口/.test(e.message)) console.error('每日体检失败:', e.message); }

    await goalTick();
    // 增长 Agent:自主跑轮(仅夜间窗口内,内部按冷却/观察期自我节流)
    try {
      const g = await runner.run('growth-agent', '增长 Agent 巡轮', {}, () => growthAgent.tickAll());
      const moved = g.filter((x) => x.phase || x.skip === 'insufficient-traffic' || x.skip === 'max-rounds');
      if (moved.length) console.log('[growth] 推进:', moved.map((x) => `${x.project_id.slice(0, 8)} ${x.phase || x.skip}`).join(', '));
    } catch (e) {
      if (!/预算|窗口/.test(e.message)) console.error('增长 Agent 调度失败:', e.message);
      else console.log('[growth] 已按限制跳过:', e.message);
    }

    // 用户定时巡检:每条任务登记台账;临近 6 点截止就停止起新任务
    const due = db.getDueScheduledTasks(20);
    for (const t of due) {
      if (!workday.backgroundAllowed().allowed) { console.log('[scheduler] 临近窗口截止,停止起跑新巡检'); break; }
      if (inspectBackedOff(t.id)) { console.log(`[scheduler] 巡检退避中,跳过:${t.name}`); continue; }
      const runId = runner.start('inspect', `巡检:${t.name}`, { ref: t.id, userId: t.user_id });
      try {
        const result = await runInspect(t);
        runner.finish(runId, 'succeeded');
        db.updateScheduledRun(t.id, result);
        inspectRecordOk(t.id);
        notify(t.user_id, 'review', `每日巡检完成:${t.name}`, String(result).slice(0, 300), '#/console');
      } catch (e) {
        runner.finish(runId, /预算|窗口/.test(e.message) ? 'skipped' : 'failed', e.message);
        db.updateScheduledRun(t.id, (/预算|窗口/.test(e.message) ? '已按限制跳过:' : '巡检失败:') + e.message);
        inspectRecordFail(t.id, e.message);   // 累计 3 次失败 → 24h 退避
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
