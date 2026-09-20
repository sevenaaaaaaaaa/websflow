/* ============================================================
 * WebsFlow · 目标与编排路由 (goals.js)  —— 阶段三
 * GET    /api/goals                目标列表(含进度与最近周期)
 * POST   /api/goals                创建目标(指标/方向/目标值/窗口/截止)
 * POST   /api/goals/:id/run        立即评估并推进一次
 * POST   /api/goals/:id/pause      暂停/恢复
 * GET    /api/trace/:id            端到端轨迹(与目标/接口调用串联)
 * ============================================================ */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, apiKeyAuth } = require('../auth');
const orch = require('../lib/orchestrator');

function either(req, res, next) {
  const h = req.headers.authorization || '';
  if (h.startsWith('wfk_')) return apiKeyAuth(req, res, next);
  if (h.startsWith('Bearer wfk_')) return apiKeyAuth(req, res, next);
  return authMiddleware(req, res, next);
}

router.get('/', either, (req, res) => {
  const goals = db.listGoals({ user_id: req.user.id, project_id: req.query.project_id, status: req.query.status });
  res.json({
    metrics: Object.keys(orch.METRICS).map((k) => ({ key: k, label: orch.METRICS[k].label, unit: orch.METRICS[k].unit })),
    goals: goals.map((g) => {
      const m = orch.metricOf(g, db.projectGrowthSnapshot(g.project_id, g.window_days || 7));
      return Object.assign({}, g, {
        current: m.value, metric_label: m.label, unit: m.unit,
        reached: orch.reached(g, m.value),
        cycles: db.listGoalCycles(g.id, 5),
      });
    }),
  });
});

router.post('/seed-defaults', either, (req, res) => {
  const existing = (db.listGoals({ user_id: req.user.id }) || []).filter((g) => String(g.name || '').indexOf('[launch]') === 0);
  if (existing.length >= 3) return res.json({ ok: true, seeded: 0, goals: existing.slice(0, 3) });
  const pages = (db.getUserProjects(req.user.id) || []).filter((p) => p.published);
  const picks = pages.slice(0, 3);
  const specs = [
    { name: '[launch] 落地页点击率', metric: 'cvr', target: 3, window_days: 7 },
    { name: '[launch] 表单线索', metric: 'leads', target: 10, window_days: 14 },
    { name: '[launch] CTA 点击', metric: 'clicks', target: 30, window_days: 7 },
  ];
  const created = existing.slice();
  specs.forEach((spec, i) => {
    if (created.length >= 3) return;
    const page = picks[i] || picks[0] || null;
    created.push(db.createGoal(Object.assign({ user_id: req.user.id, project_id: page ? page.id : null }, spec)));
  });
  res.status(201).json({ ok: true, seeded: created.length - existing.length, goals: created });
});

router.post('/', either, (req, res) => {
  const b = req.body || {};
  if (!b.metric || b.target === undefined) return res.status(400).json({ error: '缺少 metric / target' });
  if (!orch.METRICS[b.metric]) return res.status(400).json({ error: 'metric 仅支持:' + Object.keys(orch.METRICS).join('/') });
  if (b.project_id) {
    const p = db.getProject(b.project_id, req.user.id);
    if (!p) return res.status(404).json({ error: '项目不存在或无权访问' });
  }
  const goal = db.createGoal(Object.assign({ user_id: req.user.id }, b));
  res.status(201).json({ ok: true, goal });
});

router.post('/:id/run', either, async (req, res) => {
  const goal = db.getGoal(req.params.id);
  if (!goal || goal.user_id !== req.user.id) return res.status(404).json({ error: '目标不存在或无权访问' });
  const result = await orch.tickGoal(goal);
  res.json({ ok: true, result });
});

router.post('/:id/pause', either, (req, res) => {
  const goal = db.getGoal(req.params.id);
  if (!goal || goal.user_id !== req.user.id) return res.status(404).json({ error: '目标不存在或无权访问' });
  const enable = req.body && req.body.enabled === false ? false : true;
  db.updateGoalState(goal.id, { enabled: enable, status: enable ? 'active' : 'paused' });
  res.json({ ok: true, goal: db.getGoal(goal.id) });
});

module.exports = router;

/* 轨迹路由单独导出,便于 server 挂载在 /api/trace */
module.exports.traceRouter = (() => {
  const r = express.Router();
  r.get('/:id', either, (req, res) => {
    const timeline = db.traceTimeline(req.params.id, req.query.limit);
    res.json({ trace_id: req.params.id, count: timeline.length, timeline });
  });
  return r;
})();
