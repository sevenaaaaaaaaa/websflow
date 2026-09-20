/* ============================================================
 * WebsFlow · 目标驱动编排 (orchestrator.js)  —— 阶段三
 *
 * 与「增长 Agent」的区别:
 *   - Agent 优化的是"这一轮实验的胜负"
 *   - 编排器优化的是"业务 KPI"——给出目标(如 CVR ≥ 12%),它自己决定何时开新实验、何时等、
 *     何时向人求助;每一步都记录成 goal_cycles,可复盘、可干预、可停机。
 *
 * 决策优先级(风险优先):
 *   0. 目标已达成 → 标记 met 并通知
 *   1. 已过期未达成 → 暂停并通知(交由人来决定)
 *   2. 已被风险闸门暂停 → 记录 blocked,不动作
 *   3. 已有进行中的实验/提案 → 记录 waiting
 *   4. 未达标且可动 → 交给增长 Agent 起一轮(尊重其 approval_mode/门槛/冷却)
 * ============================================================ */
const db = require('../db');

const METRICS = {
  cvr: { label: '点击率(CVR)', unit: '%', from: (s) => (s.views ? (s.clicks / s.views) * 100 : 0) },
  lead_rate: { label: '线索率', unit: '%', from: (s) => (s.views ? (s.leads / s.views) * 100 : 0) },
  leads: { label: '线索数', unit: '', from: (s) => s.leads || 0 },
  clicks: { label: '点击数', unit: '', from: (s) => s.clicks || 0 },
};

function metricOf(goal, stats) {
  const m = METRICS[goal.metric] || METRICS.cvr;
  const value = m.from(stats || {});
  return { key: goal.metric, label: m.label, unit: m.unit, value: +(+value).toFixed(3) };
}

// 是否已达成(支持 up / down)
function reached(goal, value) {
  const target = Number(goal.target);
  return goal.direction === 'down' ? value <= target : value >= target;
}

async function tickGoal(goal, deps) {
  const agent = (deps && deps.agent) || require('./growth-agent');
  const project = goal.project_id ? db.getProject(goal.project_id, goal.user_id) : null;
  if (!project) return { goal_id: goal.id, action: 'blocked', detail: '项目不存在' };

  const stats = db.projectGrowthSnapshot(goal.project_id, goal.window_days || 7);
  const m = metricOf(goal, stats);
  const gap = +((Number(goal.target) - m.value) * (goal.direction === 'down' ? -1 : 1)).toFixed(3);
  // 每次决策后,尝试把它翻译成"对其它系统能力的调用"(默认人审,见 action-broker)
  const broker = () => { try { return require('./action-broker'); } catch (e) { return null; } };
  const proposeCross = (action, detail, ref, extra) => {
    const b = broker();
    if (!b) return null;
    try {
      return b.propose(Object.assign({
        action, detail, ref, goal_id: goal.id, goal_name: goal.name, project_id: goal.project_id,
        user_id: goal.user_id, metric: m.label, unit: m.unit, value: m.value, target: Number(goal.target),
      }, extra || {}));
    } catch (e) { return null; }
  };
  const log = (action, detail, ref) => {
    db.addGoalCycle({ goal_id: goal.id, value: m.value, target: Number(goal.target), gap, action, detail, ref });
    return { goal_id: goal.id, action, value: m.value, target: Number(goal.target), gap, metric: m.label, detail, ref };
  };

  // 0) 达成
  if (reached(goal, m.value)) {
    db.updateGoalState(goal.id, { status: 'met', last_value: m.value, enabled: 0 });
    require('./notify').notify(goal.user_id, 'sale', '🎯 目标达成', `「${goal.name || m.label}」已达 ${m.value}${m.unit}(目标 ${goal.target}${m.unit})`, '#/console');
    return log('met', `已达 ${m.value}${m.unit}`);
  }
  // 1) 过期
  if (goal.deadline && new Date(`${goal.deadline} 23:59:59`) < new Date()) {
    db.updateGoalState(goal.id, { status: 'expired', last_value: m.value, enabled: 0 });
    require('./notify').notify(goal.user_id, 'review', '⏰ 目标已过期未达成', `「${goal.name || m.label}」当前 ${m.value}${m.unit},目标 ${goal.target}${m.unit},已暂停等待人工决策`, '#/console');
    const cyc = log('expired', `当前 ${m.value}${m.unit} < 目标 ${goal.target}${m.unit}`);
    cyc.cross_action = proposeCross('expired', cyc.detail, null);
    return cyc;
  }

  const cfg = db.getGrowthConfig(goal.project_id);
  // 2) 风控暂停(只有"风险暂停"才 block;单纯没启用 Agent 不算——建了目标本身就是授权)
  if (cfg && cfg.paused_reason) {
    db.updateGoalState(goal.id, { last_value: m.value });
    const cyc = log('blocked', `增长 Agent 处于风险暂停:${String(cfg.paused_reason).slice(0, 60)}`);
    cyc.cross_action = proposeCross('blocked', cyc.detail, null);
    return cyc;
  }
  // 3) 进行中/待审
  const active = db.getActiveGrowthRun(goal.project_id);
  if (active) {
    db.updateGoalState(goal.id, { last_value: m.value });
    return log('waiting', `第 ${active.round} 轮实验中`, active.id);
  }
  const pending = db.getPendingProposal ? db.getPendingProposal(goal.project_id) : null;
  if (pending) {
    db.updateGoalState(goal.id, { last_value: m.value });
    return log('waiting', `第 ${pending.round} 轮方案待审`, pending.id);
  }
  // 4) 起一轮(交给增长 Agent,尊重其门槛/冷却/人审)
  let result;
  try {
    const effCfg = Object.assign({ min_views: 30, max_rounds: 20, cooldown_hours: 6, hold_hours: 48, auto_promote: 1, objective: 'cta_click', guard_enabled: 1 },
      cfg || {}, { project_id: goal.project_id, user_id: goal.user_id });
    result = await agent.tickProject(effCfg, deps);
  } catch (e) {
    db.updateGoalState(goal.id, { last_value: m.value });
    return log('error', e.message);
  }
  db.updateGoalState(goal.id, { last_value: m.value });
  if (result && (result.phase === 'started' || result.phase === 'proposed')) {
    const cyc = log(result.phase === 'started' ? 'start_round' : 'propose', `距目标还差 ${gap}${m.unit},已${result.phase === 'started' ? '开启第 ' + result.round + ' 轮实验' : '提交第 ' + result.round + ' 轮方案待审'}`, result.run_id || result.proposal_id);
    if (result.phase === 'proposed' && (result.risk_flagged || result.guard)) {
      cyc.cross_action = proposeCross('propose', cyc.detail, cyc.ref, { risk_flagged: true });
    }
    return cyc;
  }
  return log('waiting', `暂无法开新轮:${(result && (result.skip || result.phase)) || '未知'}`, null);
}

async function tickAll() {
  const goals = db.listGoals({ enabledOnly: true, status: 'active' });
  const out = [];
  for (const g of goals) {
    try { out.push(await tickGoal(g)); } catch (e) { out.push({ goal_id: g.id, action: 'error', detail: e.message }); }
  }
  return out;
}

module.exports = { tickGoal, tickAll, metricOf, reached, METRICS };
