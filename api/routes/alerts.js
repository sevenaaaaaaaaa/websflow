/* ============================================================
 * WebsFlow · 告警规则 (alerts.js)
 * GET    /api/alerts            我的规则
 * POST   /api/alerts            新建规则
 * POST   /api/alerts/:id/toggle 启停
 * POST   /api/alerts/:id/run    立即评估
 * DELETE /api/alerts/:id        删除
 * ============================================================ */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware } = require('../auth');
const alerts = require('../lib/alerts');

router.get('/', authMiddleware, (req, res) => {
  try { res.json({ rules: db.getAlertRules(req.user.id) }); } catch (e) { res.status(500).json({ error: '获取失败' }); }
});

router.post('/', authMiddleware, (req, res) => {
  try {
    const { name, project_id, metric, operator, threshold, window_minutes, action, cooldown_minutes } = req.body || {};
    if (!['views', 'clicks', 'cvr'].includes(metric)) return res.status(400).json({ error: 'metric 非法' });
    if (!['<', '>'].includes(operator)) return res.status(400).json({ error: 'operator 非法' });
    if (!['notify', 'unpublish', 'task'].includes(action || 'notify')) return res.status(400).json({ error: 'action 非法' });
    if (action === 'unpublish' && !project_id) return res.status(400).json({ error: '下线动作需要指定项目' });
    if (project_id && !db.getProject(project_id, req.user.id)) return res.status(404).json({ error: '项目不存在' });
    const r = db.createAlertRule(req.user.id, { name, project_id, metric, operator, threshold, window_minutes, action, cooldown_minutes });
    res.status(201).json({ message: '规则已创建', rule: r });
  } catch (e) {
    console.error('创建告警失败:', e);
    res.status(500).json({ error: '创建失败' });
  }
});

router.post('/:id/toggle', authMiddleware, (req, res) => {
  try {
    if (!db.setAlertEnabled(req.params.id, req.user.id, !!(req.body && req.body.enabled))) {
      return res.status(404).json({ error: '规则不存在' });
    }
    res.json({ message: '已更新' });
  } catch (e) { res.status(500).json({ error: '操作失败' }); }
});

router.post('/:id/run', authMiddleware, (req, res) => {
  try {
    const rule = db.getAlertRules(req.user.id).find((x) => x.id === req.params.id);
    if (!rule) return res.status(404).json({ error: '规则不存在' });
    const r = alerts.evaluate(rule);
    res.json({ result: r });
  } catch (e) { res.status(500).json({ error: '评估失败' }); }
});

router.delete('/:id', authMiddleware, (req, res) => {
  try {
    if (!db.deleteAlertRule(req.params.id, req.user.id)) return res.status(404).json({ error: '规则不存在' });
    res.json({ message: '已删除' });
  } catch (e) { res.status(500).json({ error: '删除失败' }); }
});

module.exports = router;
