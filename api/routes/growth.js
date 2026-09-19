/* ============================================================
 * WebsFlow · 增长 Agent 路由 (growth.js)
 * GET    /api/growth/agent?project_id=   配置 + 轮次历史 + 当前轮
 * GET    /api/growth/agents              我启用的所有 Agent(控制台总览)
 * POST   /api/growth/agent               启用/配置(阈值)
 * POST   /api/growth/agent/run           立即推进一步(手动)
 * ============================================================ */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware } = require('../auth');
const agent = require('../lib/growth-agent');
const lessons = require('../lib/growth-lessons');

// 旧轮次(归类列上线前创建的)在返回时即时回填,便于界面展示
function enrichRun(r) {
  if (!r) return r;
  const cats = Array.isArray(r.categories) && r.categories.length ? r.categories : lessons.classifyOps(r.ops || []);
  return Object.assign({}, r, { categories: cats, theme: r.theme || 'other' });
}

function withProjectName(cfg, userId) {
  const p = db.getProject(cfg.project_id, userId);
  return Object.assign({}, cfg, { project_name: p ? p.name : '(已删除)', mode: p ? p.mode : null });
}

router.get('/agent', authMiddleware, (req, res) => {
  try {
    const projectId = req.query.project_id;
    if (!projectId) return res.status(400).json({ error: '缺少 project_id' });
    const project = db.getProject(projectId, req.user.id);
    if (!project) return res.status(404).json({ error: '项目不存在或无权访问' });
    const cfg = db.getGrowthConfig(projectId);
    res.json({
      config: cfg,
      runs: db.listGrowthRuns(projectId, 20).map(enrichRun),
      active: enrichRun(db.getActiveGrowthRun(projectId)),
      guards: (db.listGuardEvents ? db.listGuardEvents(projectId, 10) : []),
      proposals: (db.listGrowthProposals ? db.listGrowthProposals(projectId, 10) : []),
    });
  } catch (e) {
    console.error('读取增长 Agent 失败:', e.message);
    res.status(500).json({ error: '读取失败' });
  }
});

router.get('/agents', authMiddleware, (req, res) => {
  try {
    const cfgs = db.listGrowthConfigs(false).filter((c) => c.user_id === req.user.id);
    res.json({
      agents: cfgs.map((c) => {
        const active = db.getActiveGrowthRun(c.project_id);
        const runs = db.listGrowthRuns(c.project_id, 5).map(enrichRun);
        const finished = runs.filter((r) => r.status !== 'running').length;
        return withProjectName(Object.assign({}, c, { active, recent: runs, finished_rounds: finished }), req.user.id);
      }),
    });
  } catch (e) {
    console.error('增长 Agent 总览失败:', e.message);
    res.status(500).json({ error: '读取失败' });
  }
});

router.post('/agent', authMiddleware, (req, res) => {
  try {
    const { project_id, ...patch } = req.body || {};
    if (!project_id) return res.status(400).json({ error: '缺少 project_id' });
    const project = db.getProject(project_id, req.user.id);
    if (!project) return res.status(404).json({ error: '项目不存在或无权访问' });
    const cfg = db.upsertGrowthConfig(project_id, req.user.id, patch);
    // 暂停时收尾:进行中的轮次标记为中正,避免状态一直挂在进行中
    if (patch && patch.enabled === false) {
      const active = db.getActiveGrowthRun(project_id);
      if (active) db.concludeGrowthRun(active.id, 'concluded', Object.assign({}, active.result || {}, { stopped: true }), 'stopped');
    }
    res.json({ message: cfg.enabled ? '已启用' : '已更新', config: cfg });
  } catch (e) {
    console.error('保存增长 Agent 配置失败:', e.message);
    res.status(500).json({ error: '保存失败' });
  }
});

// 待审提案(人审模式)
router.get('/proposals', authMiddleware, (req, res) => {
  try {
    const projectId = req.query.project_id;
    if (projectId) {
      const project = db.getProject(projectId, req.user.id);
      if (!project) return res.status(404).json({ error: '项目不存在或无权访问' });
      return res.json({ proposals: db.listGrowthProposals(projectId, 20) });
    }
    res.json({ proposals: db.listPendingProposalsForUser(req.user.id) });
  } catch (e) {
    console.error('读取提案失败:', e.message);
    res.status(500).json({ error: '读取失败' });
  }
});

router.post('/proposals/:id/approve', authMiddleware, (req, res) => {
  try {
    const r = agent.approveProposal(req.params.id, req.user.id);
    if (r.error) return res.status(400).json({ error: r.error });
    res.json({ message: '已通过并发布', result: r });
  } catch (e) {
    console.error('通过提案失败:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.post('/proposals/:id/reject', authMiddleware, (req, res) => {
  try {
    const r = agent.rejectProposal(req.params.id, req.user.id, (req.body || {}).reason);
    if (r.error) return res.status(400).json({ error: r.error });
    res.json({ message: '已驳回', result: r });
  } catch (e) {
    console.error('驳回提案失败:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// 跨项目经验库(假设库):用于展示"哪些方向更常赢"
router.get('/lessons', authMiddleware, (req, res) => {
  try {
    const runs = db.listGrowthRunsForUser(req.user.id, 200);
    const summary = lessons.summarize(runs);
    res.json({ summary, brief: lessons.brief(runs, { projectRuns: runs }), rounds: runs.length });
  } catch (e) {
    console.error('经验库读取失败:', e.message);
    res.status(500).json({ error: '读取失败' });
  }
});

router.post('/agent/run', authMiddleware, async (req, res) => {
  try {
    const { project_id, mock } = req.body || {};
    if (!project_id) return res.status(400).json({ error: '缺少 project_id' });
    const project = db.getProject(project_id, req.user.id);
    if (!project) return res.status(404).json({ error: '项目不存在或无权访问' });
    const cfg = db.getGrowthConfig(project_id) || db.upsertGrowthConfig(project_id, req.user.id, { enabled: 0 });
    const deps = mock ? {
      planner: async () => ({
        hypothesis: '(自检)把标题改得更具体,预期提升 CTA 点击',
        goal: 'selfcheck',
        reply: '自检用补丁',
        ops: [{ op: 'update', id: (agent.blocksOf(project.data)[0] || {}).id, props: { title: '自检:更具体的标题' } }],
      }),
    } : null;
    const result = await agent.tickProject(cfg, deps);
    db.touchGrowthTick(project_id);
    res.json({ result });
  } catch (e) {
    console.error('增长 Agent 手动运行失败:', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
