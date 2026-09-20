/* ============================================================
 * WebsFlow · 增长 Agent(自主跑轮) (growth-agent.js)
 *
 * 一轮 = 读数据 → 提假设 → 建 A/B(两页发布) → 等显著 → 复盘 → 下一轮
 * 设计要点:
 *   - 全部在服务端跑,不依赖编辑器打开(可被调度器周期触发,也可手动 run 一次)
 *   - planner 可注入(默认走 AI;测试可 stub),保证状态机可单测
 *   - 护栏:最小曝光、轮次上限、冷却时间、观察上限、目标隔离(ai- 前缀)
 *   - 每轮结论都写库 + 通知,便于复盘
 * ============================================================ */
const db = require('../db');
const { loadWF } = require('./wf');
const { abStats } = require('./ab');
const { notify } = require('./notify');
const lessons = require('./growth-lessons');

const MIN_SAMPLE = 30;   // 单变体显著性所需最小样本(与前端一致)

// ---------- 工具 ----------
function deep(obj) { return JSON.parse(JSON.stringify(obj || {})); }

function blocksOf(data) {
  const d = data || {};
  if (Array.isArray(d.pages) && d.pages.length) return d.pages[0].blocks || [];
  return d.blocks || [];
}

function goalCounts() {
  const map = {};
  try {
    const stats = db.getEventStats({});
    (stats.goals || []).forEach((g) => { map[g.goal_id] = g.count; });
  } catch (e) { /* 静默 */ }
  return map;
}

const OBJECTIVES = {
  cta_click: { label: 'CTA 点击', field: 'clicks' },
  lead: { label: '表单线索', field: 'leads' },
};

function countsFor(variants, map, objective, leadMap) {
  const obj = OBJECTIVES[objective] ? objective : 'cta_click';
  return variants.map((v) => ({
    views: map['view:' + v.cloudId] || 0,
    clicks: obj === 'cta_click' ? (map[v.goalId] || 0) : 0,
    // 线索目标:按变体项目统计 leads 表
    leads: obj === 'lead' ? ((leadMap || {})[v.cloudId] || 0) : 0,
  }));
}

// 把 counts 映射成 abStats 需要的 {views, clicks} 形状(转换数即"点击")
function toStatsCounts(counts, objective) {
  const obj = OBJECTIVES[objective] ? objective : 'cta_click';
  return counts.map((c) => ({ views: c.views, clicks: obj === 'lead' ? c.leads : c.clicks }));
}

// 目标感知的落页处理:线索目标要保证有表单;点击目标要保证有 CTA
function stampObjective(data, goalId, objective) {
  const WF = loadWF();
  const blocks = blocksOf(data);
  const obj = OBJECTIVES[objective] ? objective : 'cta_click';
  if (obj === 'lead') {
    let forms = 0;
    blocks.forEach((b) => {
      if (b && b.type === 'form') {
        b.props = Object.assign({}, b.props, { goalId, formId: goalId });
        forms++;
      }
    });
    if (!forms) {
      const f = WF.newBlock('form');
      f.props = Object.assign({}, f.props, { goalId, formId: goalId });
      blocks.push(f);
    }
  } else {
    let hit = 0;
    blocks.forEach((b) => {
      if (b && b.type === 'cta') { b.props = Object.assign({}, b.props, { goalId, ctaGoal: goalId }); hit++; }
    });
    if (!hit) {
      const cta = WF.newBlock('cta');
      cta.props = Object.assign({}, cta.props, { goalId, ctaGoal: goalId });
      blocks.push(cta);
    }
  }
  if (Array.isArray(data.pages) && data.pages.length) data.pages[0].blocks = blocks;
  else data.blocks = blocks;
  return obj;
}

function slugGoal(s) {
  return String(s || '').replace(/^view:?/i, '').replace(/[^a-zA-Z0-9_-]/g, '').replace(/[-_]+$/, '').slice(0, 24);
}

// 给页面写入目标:所有 cta 用同一个 goalId;若没有 cta 就补一个
function stampGoal(data, goalId) {
  const blocks = blocksOf(data);
  let hit = 0;
  blocks.forEach((b) => {
    if (b && b.type === 'cta') { b.props = Object.assign({}, b.props, { goalId, ctaGoal: goalId }); hit++; }
  });
  if (!hit) {
    const WF = loadWF();
    const cta = WF.newBlock('cta');
    cta.props = Object.assign({}, cta.props, { goalId, ctaGoal: goalId });
    blocks.push(cta);
  }
  if (Array.isArray(data.pages) && data.pages.length) data.pages[0].blocks = blocks;
  else data.blocks = blocks;
  return hit;
}

// 自我进化:把这一轮的胜负归因到用到的范式上(胜者 +1 胜,败者 +1 负)
function creditPatterns(run, winnerKey) {
  if (!run) return;
  let variants = [];
  try { variants = typeof run.variants === 'string' ? JSON.parse(run.variants) : (run.variants || []); } catch (e) { variants = []; }
  variants.forEach((v) => {
    (v.patterns || []).forEach((k) => {
      const patch = winnerKey ? (v.key === winnerKey ? { wins: 1 } : { losses: 1 }) : {};
      if (Object.keys(patch).length) { try { db.bumpPatternStat(run.user_id, k, patch); } catch (e) {} }
    });
  });
}

// ---------- 起一轮(自动模式与人审通过后共用) ----------
function startRound(cfg, project, plan, stats, round, lessonsText) {
  const data = project.data || {};
  const objective = OBJECTIVES[cfg.objective] ? cfg.objective : 'cta_click';
  const ops = (plan && plan.ops) || [];
  if (!ops.length) return { skip: 'no-usable-ops' };
  // 审批路径会带上已算好的 baseGoal,避免重复加前缀/轮次
  const slug = slugGoal(plan.goal) || Date.now().toString(36);
  const baseGoal = (plan.baseGoal || ('ai-' + slug + '-r' + round)).replace(/-+/g, '-').replace(/[-_]+$/, '');
  const variants = [];
  for (const key of ['A', 'B']) {
    const copy = deep(data);
    const goalId = baseGoal + '-' + key;
    if (key === 'B') loadWF().applyOps({ blocks: blocksOf(copy) }, ops);
    stampObjective(copy, goalId, objective);
    const created = db.createProject(cfg.user_id, `${project.name} · AI轮${round}${key}`, project.mode, copy, 'AI 增长实验变体');
    db.setPublished(created.id, cfg.user_id, true);
    variants.push({ key, goalId, cloudId: created.id, token: created.share_token, url: '/webflow/p/' + created.share_token });
  }
  const run = db.addGrowthRun({
    project_id: cfg.project_id, user_id: cfg.user_id, round,
    hypothesis: plan.hypothesis || '', reason: plan.reply || '',
    base_goal: baseGoal, ops, variants, stats_before: stats,
    categories: lessons.classifyOps(ops),
    theme: lessons.normalizeTheme(plan.theme),
    agent_context: String(lessonsText || '').slice(0, 900),
  });
  notify(cfg.user_id, 'review', `增长 Agent:第 ${round} 轮已上线`,
    `${plan.hypothesis || '已生成新实验'}\nA: /webflow/p/${variants[0].token}\nB: /webflow/p/${variants[1].token}`, '#/console');
  return { phase: 'started', round, baseGoal, variants, hypothesis: plan.hypothesis, run_id: run.id };
}

// 人审:只建提案,不发布
function createProposal(cfg, project, plan, stats, round, lessonsText) {
  const ops = (plan && plan.ops) || [];
  if (!ops.length) return { skip: 'no-usable-ops' };
  const objective = OBJECTIVES[cfg.objective] ? cfg.objective : 'cta_click';
  const slug = slugGoal(plan.goal) || Date.now().toString(36);
  const baseGoal = ('ai-' + slug + '-r' + round).replace(/-+/g, '-').replace(/[-_]+$/, '');
  const p = db.addGrowthProposal({
    project_id: cfg.project_id, user_id: cfg.user_id, round, objective,
    hypothesis: plan.hypothesis || '', reason: plan.reply || '',
    theme: lessons.normalizeTheme(plan.theme), categories: lessons.classifyOps(ops),
    ops, stats_before: stats, base_goal: baseGoal, agent_context: String(lessonsText || '').slice(0, 900),
  });
  // 并排可视化预览:A = 原页,B = 应用补丁后的页(均为未发布预览,凭 token 访问)
  try {
    const dataA = deep(project.data || {});
    const dataB = deep(project.data || {});
    loadWF().applyOps({ blocks: blocksOf(dataB) }, ops);
    stampObjective(dataA, baseGoal + '-A', OBJECTIVES[objective] ? objective : 'cta_click');
    stampObjective(dataB, baseGoal + '-B', OBJECTIVES[objective] ? objective : 'cta_click');
    const tokA = db.addPreviewPage({ user_id: cfg.user_id, project_id: cfg.project_id, proposal_id: p.id, side: 'a', data: dataA, ttlHours: 720 });
    const tokB = db.addPreviewPage({ user_id: cfg.user_id, project_id: cfg.project_id, proposal_id: p.id, side: 'b', data: dataB, ttlHours: 720 });
    db.setProposalPreviews(p.id, tokA, tokB);
  } catch (e) { console.warn('[growth] 预览生成失败:', e.message); }
  notify(cfg.user_id, 'review', `📝 增长 Agent 提交方案待确认(第 ${round} 轮)`,
    `${plan.hypothesis || '新实验方案'}\n请在控制台「转化 → 待审提案」确认后发布`, '#/console');
  try {
    require('./openflow').createTask(
      `增长方案待审:${project.name} 第 ${round} 轮`,
      [plan.hypothesis || '', '', `假设:${plan.reply || ''}`, `改动 ${ops.length} 处`, '', '到控制台「转化 → 待审提案」通过或驳回'].filter(Boolean).join('\n'),
      'normal', 'growth_proposal_' + p.id
    ).then((r) => { if (r && r.ok) console.log('[growth] 方案已写入 OpenFlow 待办'); });
  } catch (e) { /* 静默 */ }
  return { phase: 'proposed', round, proposal_id: p.id, hypothesis: plan.hypothesis };
}

// ---------- 风险闸门:自动暂停保护 ----------
// 三类触发:
//   1) zero_conversion  窗口内曝光够多但转化=0(页面可能坏了 / 目标未生效)
//   2) traffic_drop     本窗口曝光较上一窗口骤降(投放被限流/页面被拒)
//   3) inconclusive_streak 连续多轮不显著(避免白烧 AI 与流量)
function checkGuards(cfg, project, runs) {
  if (!cfg || cfg.guard_enabled === 0 || cfg.guard_enabled === false) return null;
  const projectId = cfg.project_id || (project && project.id);
  const objective = OBJECTIVES[cfg.objective] ? cfg.objective : 'cta_click';
  const winH = Number(cfg.guard_window_hours) || 6;
  const minViews = Number(cfg.guard_min_views) || 50;

  // 1) 零转化
  const views = db.viewsInWindow(projectId, winH, 0);
  const conv = db.conversionsInWindow(projectId, objective, winH);
  if (views >= minViews && conv === 0) {
    return { kind: 'zero_conversion', detail: `近 ${winH} 小时曝光 ${views} 次但${OBJECTIVES[objective].label}为 0(阈值:曝光≥${minViews}),页面或目标可能异常` };
  }

  // 2) 流量骤降
  const prevViews = db.viewsInWindow(projectId, winH, winH);
  const dropPct = Number(cfg.guard_drop_pct) || 60;
  if (prevViews >= minViews) {
    const drop = Math.round((1 - views / prevViews) * 100);
    if (drop >= dropPct) {
      return { kind: 'traffic_drop', detail: `曝光从上一个 ${winH} 小时的 ${prevViews} 次降到 ${views} 次(下降 ${drop}%,阈值 ${dropPct}%)` };
    }
  }

  // 3) 连续不显著
  const maxInc = Number(cfg.guard_max_inconclusive) || 3;
  const finished = (runs || []).filter((r) => r.status === 'concluded' && r.decision !== 'promoted' && r.decision !== 'stopped');
  let streak = 0;
  for (const r of finished) { if (r.decision === 'inconclusive') streak++; else break; }
  if (streak >= maxInc) {
    return { kind: 'inconclusive_streak', detail: `连续 ${streak} 轮未达显著(阈值 ${maxInc} 轮),建议人工介入换策略` };
  }
  return null;
}

// 触发闸门 → 暂停 + 记录 + 通知
function tripGuard(cfg, trip, project) {
  try { db.pauseGrowthAgent(cfg.project_id, trip.detail); } catch (e) { db.upsertGrowthConfig(cfg.project_id, cfg.user_id, { enabled: 0 }); }
  try { db.addGuardEvent({ project_id: cfg.project_id, user_id: cfg.user_id, kind: trip.kind, detail: trip.detail }); } catch (e) {}
  notify(cfg.user_id, 'review', '🛑 增长 Agent 因风险自动暂停',
    `「${(project && project.name) || cfg.project_id}」已暂停:${trip.detail}`, '#/console');
  return trip;
}

// ---------- 决策:评估当前轮 ----------
async function evaluateRound(cfg, run) {
  const objective = OBJECTIVES[cfg.objective] ? cfg.objective : 'cta_click';
  const map = goalCounts();
  const leadMap = objective === 'lead' ? db.leadCountsFor(run.variants.map((v) => v.cloudId)) : {};
  const counts = countsFor(run.variants, map, objective, leadMap);
  const st = abStats(toStatsCounts(counts, objective), MIN_SAMPLE);
  const ageH = (Date.now() - new Date(run.started_at + 'Z').getTime()) / 3600e3;
  if (st.significant) {
    const winner = st.cvrA >= st.cvrB ? run.variants[0] : run.variants[1];
    const loser = st.cvrA >= st.cvrB ? run.variants[1] : run.variants[0];
    let promoted = false;
    if (cfg.auto_promote) {
      try { db.setPublished(loser.cloudId, cfg.user_id, false); promoted = true; } catch (e) { /* 静默 */ }
    }
    db.concludeGrowthRun(run.id, 'concluded', { sig: true, objective, metric: OBJECTIVES[objective].label, cvrA: st.cvrA, cvrB: st.cvrB, p: st.p, views: st.va + st.vb, clicks: st.ca + st.cb, winner: winner.key }, promoted ? 'promoted' : 'significant');
    try { creditPatterns(run, winner.key); } catch (e) { /* 归因失败不影响结轮 */ }
    // G4:结果写进平台经验契约(统一记忆,供生态复用)
    try { require('./lessons').recordGrowthRun(Object.assign({}, run, { objective, result: { sig: true, winner: winner.key, cvrA: st.cvrA, cvrB: st.cvrB, views: st.va + st.vb } }), run.categories || [], run.theme); } catch (e) { console.error('[g4] 写入平台经验失败:', e.message); }
    notify(cfg.user_id, 'review', `增长 Agent:第 ${run.round} 轮出结果`, `胜出版本 ${winner.key}(CVR ${(Math.max(st.cvrA, st.cvrB) * 100).toFixed(1)}% vs ${(Math.min(st.cvrA, st.cvrB) * 100).toFixed(1)}%, p=${st.p.toFixed(3)})${promoted ? ',已下线落后版本' : ''}`, '#/console');
    return { closed: true, significant: true, st };
  }
  if (ageH >= cfg.hold_hours) {
    db.concludeGrowthRun(run.id, 'concluded', { sig: false, objective, metric: OBJECTIVES[objective].label, cvrA: st.cvrA, cvrB: st.cvrB, p: st.p, views: st.va + st.vb, clicks: st.ca + st.cb }, 'inconclusive');
    try { creditPatterns(run, null); } catch (e) {}
    try { require('./lessons').recordGrowthRun(Object.assign({}, run, { objective, result: { sig: false, views: st.va + st.vb } }), run.categories || [], run.theme); } catch (e) { console.error('[g4] 写入平台经验失败(不显著):', e.message); }
    notify(cfg.user_id, 'review', `增长 Agent:第 ${run.round} 轮未达显著`, `观察 ${Math.round(ageH)} 小时仍不显著(${st.va + st.vb} 次曝光),按不显著结轮,准备下一个假设`, '#/console');
    return { closed: true, significant: false, st };
  }
  return { closed: false, waiting: true, st, ageH: Math.round(ageH) };
}

// ---------- 主流程:推进一个项目 ----------
// planner: async ({project, stats, cfg}) => {ops, hypothesis, goal, reply}
async function tickProject(cfg, deps) {
  const planner = (deps && deps.planner) || defaultPlanner;
  const projectId = cfg.project_id;
  const project = db.getProject(projectId, cfg.user_id);
  if (!project) return { skip: 'project-missing' };
  const data = project.data || {};
  if (!blocksOf(data).length) return { skip: 'empty-page' };

  // 0) 风险闸门:最先执行 —— 进行中的轮次同样需要保护
  const runsAll = db.listGrowthRuns(projectId, 200);
  const trip = checkGuards(cfg, project, runsAll);
  if (trip) {
    const act = db.getActiveGrowthRun(projectId);
    if (act) {
      try { db.concludeGrowthRun(act.id, 'concluded', Object.assign({}, act.result || {}, { stopped: true, guard: trip.kind }), 'stopped'); } catch (e) {}
    }
    tripGuard(cfg, trip, project);
    return { skip: 'guard-tripped', kind: trip.kind, detail: trip.detail };
  }

  // 1) 有进行中的轮次 → 先评估
  const active = db.getActiveGrowthRun(projectId);
  if (active) {
    const ev = await evaluateRound(cfg, active);
    if (!ev.closed) return { phase: 'waiting', round: active.round, ageH: ev.ageH, stats: { va: ev.st.va, vb: ev.st.vb } };
  }

  // 2) 是否可以开新一轮
  const runs = db.listGrowthRuns(projectId, 200);
  const finished = runs.filter((r) => r.status !== 'running');
  if (finished.length >= cfg.max_rounds) {
    db.upsertGrowthConfig(projectId, cfg.user_id, { enabled: 0, note: '已达最大轮次' });
    notify(cfg.user_id, 'review', '增长 Agent 已停止', `「${project.name}」已跑满 ${cfg.max_rounds} 轮,自动停止。`, '#/console');
    return { skip: 'max-rounds', rounds: finished.length };
  }
  const last = finished[0];
  if (last && last.concluded_at) {
    const gapH = (Date.now() - new Date(last.concluded_at + 'Z').getTime()) / 3600e3;
    if (gapH < cfg.cooldown_hours) return { skip: 'cooldown', waitH: Math.round(cfg.cooldown_hours - gapH) };
  }

  // 人审模式:有待审提案就等;超时则作废后继续
  if (cfg.approval_mode) {
    db.expireGrowthProposals(projectId, cfg.proposal_ttl_hours || 48);
    const pending = db.getPendingProposal(projectId);
    if (pending) return { skip: 'awaiting-approval', proposal_id: pending.id, round: pending.round };
  }

  const stats = db.projectGrowthSnapshot(projectId, 7);
  if (stats.views < cfg.min_views) return { skip: 'insufficient-traffic', views: stats.views, need: cfg.min_views };

  // 3) 提假设:先组装"跨项目经验 + 本项目近期假设",再交给 planner
  let history = [];
  try { history = db.listGrowthRunsForUser(cfg.user_id, 200); } catch (e) { history = runs; }
  const projectRuns = runs.filter((r) => r.status !== 'running' || r.hypothesis);
  let rejectedProposals = [];
  try { rejectedProposals = (db.listGrowthProposals(projectId, 20) || []).filter((p) => p.status === 'rejected'); } catch (e) {}
  const lessonsText = lessons.brief(history, { projectRuns, rejectedProposals });
  let plan;
  try {
    plan = await planner({ project, stats, cfg, round: finished.length + 1, lessonsText, recent: projectRuns, objective: cfg.objective || 'cta_click' });
  } catch (e) {
    return { skip: 'planner-failed', error: e.message };
  }
  const ops = (plan && plan.ops) || [];
  if (!ops.length) return { skip: 'no-usable-ops' };

  // 4) 按模式落地:人审 → 出提案;自动 → 建变体并发布
  const round = finished.length + 1;
  if (cfg.approval_mode) return createProposal(cfg, project, plan, stats, round, lessonsText);
  return startRound(cfg, project, plan, stats, round, lessonsText);

}

// 默认 planner:走 AI(patchOps),注入跨项目历史经验 + 本项目近期假设
async function defaultPlanner({ project, stats, round, lessonsText, recent, objective }) {
  const { patchOps } = require('./ai');
  const data = project.data || {};
  const obj = OBJECTIVES[objective] ? objective : 'cta_click';
  const objLine = obj === 'lead'
    ? '本页的**主要转化目标是表单提交(线索)**,不是按钮点击。请围绕"降低填写门槛、说清提交后能得到什么、增加信任与承诺"来提假设(例如:减少字段、改按钮文案为"获取方案"、在表单旁加信任要素)。'
    : '本页的**主要转化目标是 CTA 点击**。请围绕首屏价值主张、按钮文案与紧迫感来提假设。';
  const base = `这是第 ${round} 轮增长实验。${objLine}基于页面真实数据,提出一个最可能提升该目标的假设,并用最少的改动落地。`;
  const plan = await patchOps(project.user_id, {
    instruction: base,
    mode: project.mode,
    blocks: blocksOf(data).slice(0, 60),
    stats,
    lessons: lessonsText || '',
  });
  // 防重复:与本项目最近 2 个假设过于相似时,要求换角度再想一次
  const prev = (recent || []).filter((r) => r.hypothesis).slice(0, 2).map((r) => r.hypothesis);
  const sim = Math.max(0, ...prev.map((h) => lessons.similarity(h, plan.hypothesis)));
  if (sim >= 0.5) {
    const retry = await patchOps(project.user_id, {
      instruction: base + `注意:你已经提过「${prev[0]}」这类假设且未能取胜,这次必须换一个完全不同的方向(例如改信任要素/降低门槛/调整版式层级)。`,
      mode: project.mode,
      blocks: blocksOf(data).slice(0, 60),
      stats,
      lessons: lessonsText || '',
    });
    if (retry.ops && retry.ops.length) return Object.assign(retry, { retried: true, similarity: +sim.toFixed(2) });
  }
  return plan;
}

// 调度入口:遍历所有启用的配置
async function tickAll(deps) {
  const cfgs = db.listGrowthConfigs(true);
  const out = [];
  for (const cfg of cfgs) {
    try {
      const r = await tickProject(cfg, deps);
      db.touchGrowthTick(cfg.project_id);
      if (r && !r.skip) out.push({ project_id: cfg.project_id, ...r });
    } catch (e) {
      out.push({ project_id: cfg.project_id, error: e.message });
    }
  }
  return out;
}

// 人工审批通过:用提案内容起一轮(发布变体)
function approveProposal(proposalId, userId) {
  const p = db.getGrowthProposal(proposalId);
  if (!p) return { error: '提案不存在' };
  if (p.status !== 'pending') return { error: '提案已处理(' + p.status + ')' };
  if (p.user_id && userId && p.user_id !== userId) return { error: '无权操作' };
  const cfg = db.getGrowthConfig(p.project_id);
  if (!cfg) return { error: 'Agent 配置不存在' };
  const project = db.getProject(p.project_id, cfg.user_id);
  if (!project) return { error: '项目不存在' };
  const plan = { ops: p.ops, hypothesis: p.hypothesis, reply: p.reason, theme: p.theme, baseGoal: p.base_goal };
  const res = startRound(cfg, project, plan, p.stats_before || {}, p.round, p.agent_context || '');
  if (res.skip) return { error: '无法发布:' + res.skip };
  db.decideGrowthProposal(proposalId, 'approved', { by: userId, run_id: res.run_id });
  return res;
}

// 人工驳回:记录原因(供经验库规避该方向)
function rejectProposal(proposalId, userId, reason) {
  const p = db.getGrowthProposal(proposalId);
  if (!p) return { error: '提案不存在' };
  if (p.status !== 'pending') return { error: '提案已处理(' + p.status + ')' };
  if (p.user_id && userId && p.user_id !== userId) return { error: '无权操作' };
  db.decideGrowthProposal(proposalId, 'rejected', { by: userId, reason: String(reason || '').slice(0, 200) });
  try { db.addGuardEvent({ project_id: p.project_id, user_id: userId, kind: 'proposal_rejected', detail: `驳回第 ${p.round} 轮方案:${String(reason || '').slice(0, 120)}` }); } catch (e) {}
  return { ok: true, status: 'rejected' };
}

module.exports = { tickProject, tickAll, defaultPlanner, approveProposal, rejectProposal, startRound, createProposal, checkGuards, evaluateRound, stampGoal, stampObjective, countsFor, toStatsCounts, checkGuards, OBJECTIVES, blocksOf, MIN_SAMPLE };
