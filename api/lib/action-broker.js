/* ============================================================
 * WebsFlow · 跨系统动作编排 (action-broker.js)  —— 阶段三最后一层
 *
 * 目标:把"决策"翻译成"对其它系统能力的调用",默认全部走人审。
 *   决策(goal_cycle / growth proposal) → 规则匹配能力目录(capabilities) → 生成待审动作(cross_actions)
 *   人批准 → 执行器分发(openflow / payflow / lark / websflow 内部) → 落库结果,可复盘
 *
 * 硬约束:
 *   - 默认 requires_approval=1(人审),不允许静默跨系统副作用
 *   - 能力目录里标 unverified / invoke=internal 的,批准后若执行器不可用 → 标记 manual,给出人工步骤
 *   - 所有动作带 trace_id,与端到端轨迹对齐
 * ============================================================ */
const db = require('../db');

// 决策 → 需要的能力(能力 id 必须存在于 capabilities 或为生态占位 id)
const RULES = [
  {
    when: (c) => c.action === 'expired',
    capability_id: 'openflow.lead.create',
    title: (c) => `目标未达成,需人工复盘:${c.goal_name || c.metric || ''}`,
    reason: (c) => `目标「${c.goal_name || c.metric}」到期仍未达成(当前 ${c.value}${c.unit || ''},目标 ${c.target}${c.unit || ''}),编排器已停机,建议人工介入调整目标或策略。`,
    payload: (c) => ({ kind: 'goal_review', goal_id: c.goal_id, project_id: c.project_id, value: c.value, target: c.target, metric: c.metric }),
  },
  {
    when: (c) => c.action === 'blocked',
    capability_id: 'openflow.lead.create',
    title: () => '增长实验被风险闸门暂停,需人工裁决',
    reason: (c) => `风险闸门触发(${c.detail || ''}),自动推进已停止。请确认是恢复实验还是回滚改动。`,
    payload: (c) => ({ kind: 'risk_review', goal_id: c.goal_id, project_id: c.project_id, detail: c.detail }),
  },
  {
    when: (c) => c.action === 'propose' && c.risk_flagged,
    capability_id: 'websflow.growth.agent',
    title: () => '高风险提案待人类审批(已同步通知)',
    reason: (c) => `本轮提案触及风险项(${c.detail || ''}),默认人审,请在控制台确认后再发布。`,
    payload: (c) => ({ kind: 'proposal_review', goal_id: c.goal_id, project_id: c.project_id, ref: c.ref }),
  },
  {
    when: (c) => c.action === 'met' && c.payout_due,
    capability_id: 'payflow.payout.request',
    title: (c) => `目标达成,可发起佣金提现 ¥${c.payout_amount || 0}`,
    reason: (c) => `目标「${c.goal_name || c.metric}」已达成,收益达到提现门槛;按边界约定由 PayFlow 执行提现。`,
    payload: (c) => ({ kind: 'payout', amount: c.payout_amount, goal_id: c.goal_id }),
  },
];

// 找到第一条匹配规则
function matchRule(ctx) {
  for (const r of RULES) {
    try { if (r.when(ctx)) return r; } catch (e) { /* ignore */ }
  }
  return null;
}

// 生成待审动作(默认人审)。同 goal + capability 已有 pending 则不再重复堆叠。
function propose(ctx) {
  const rule = matchRule(ctx || {});
  if (!rule) return null;
  const existing = db.listCrossActions({ status: 'pending', limit: 200 })
    .find((a) => a.goal_id === (ctx.goal_id || null) && a.capability_id === rule.capability_id);
  if (existing) return existing;
  const cap = (() => { try { return require('./capabilities').findCapability(rule.capability_id); } catch (e) { return null; } })();
  const row = db.addCrossAction({
    user_id: ctx.user_id,
    project_id: ctx.project_id,
    goal_id: ctx.goal_id || null,
    trace_id: ctx.trace_id || null,
    capability_id: rule.capability_id,
    system: (cap && cap.system) || String(rule.capability_id).split('.')[0],
    kind: (cap && cap.kind) || 'action',
    title: typeof rule.title === 'function' ? rule.title(ctx) : rule.title,
    reason: typeof rule.reason === 'function' ? rule.reason(ctx) : rule.reason,
    payload: typeof rule.payload === 'function' ? rule.payload(ctx) : ctx,
    status: 'pending',
    requires_approval: 1,
  });
  require('./notify').notify(ctx.user_id, 'review', '🧭 有跨系统动作待你审批',
    `${row.title}(${rule.capability_id})`, '#/console');
  return row;
}

// ---- 执行器:只做"已明确可用"的分发,其余标 manual ----
async function dispatch(action) {
  const capId = action.capability_id;
  const payload = action.payload ? JSON.parse(action.payload) : {};
  try {
    if (capId === 'openflow.lead.create') {
      const r = await require('./openflow').createTask(
        action.title,
        `${action.reason}\n\n[来自 WebsFlow 目标编排 · 动作 ${action.id}]`,
        'medium', action.trace_id || action.id);
      return r.ok ? { ok: true, via: 'openflow', detail: r.detail } : { ok: false, via: 'openflow', error: r.error || r.detail };
    }
    if (capId === 'notify.lark' || capId === 'openflow.notify') {
      const r = await require('./notify').pushLark(`🧭 ${action.title}\n${action.reason}`);
      return { ok: true, via: 'lark', detail: String(r && r.code || 'sent') };
    }
    if (capId === 'payflow.payout.request') {
      const payflow = require('./payflow');
      const r = await payflow.request('POST', '/api/payout/request', {
        amount: payload.amount, source: 'websflow-goal', ref: action.goal_id || action.id,
      });
      return { ok: true, via: 'payflow', detail: JSON.stringify(r).slice(0, 200) };
    }
    if (capId.startsWith('websflow.')) {
      // WebsFlow 自身能力:动作本身已由内部流程完成(如提案已在控制台待审),此处仅归档
      return { ok: true, via: 'websflow', detail: '已归档为内部动作,请在控制台对应页面处理' };
    }
  } catch (e) {
    return { ok: false, error: e.message };
  }
  return { ok: false, manual: true, error: '该能力尚无可自动执行器(对方系统未注册/未验证),请按能力目录人工执行' };
}

// 人批准 → 执行并落库
async function approve(id, decider) {
  const action = db.getCrossAction(id);
  if (!action) return { ok: false, error: '动作不存在' };
  if (action.status !== 'pending') return { ok: false, error: `动作已是 ${action.status} 状态` };
  const result = await dispatch(action);
  const status = result.ok ? 'executed' : (result.manual ? 'manual' : 'failed');
  return { ok: true, action: db.decideCrossAction(id, { status, decided_by: decider || 'user', result }), result };
}

function reject(id, decider, note) {
  const action = db.getCrossAction(id);
  if (!action) return { ok: false, error: '动作不存在' };
  if (action.status !== 'pending') return { ok: false, error: `动作已是 ${action.status} 状态` };
  return { ok: true, action: db.decideCrossAction(id, { status: 'rejected', decided_by: decider || 'user', result: { note: note || '' } }) };
}

module.exports = { propose, approve, reject, dispatch, matchRule, RULES };
