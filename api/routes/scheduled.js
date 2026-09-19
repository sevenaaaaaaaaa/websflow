/* ============================================================
 * WebsFlow · 定时巡检 (scheduled.js)
 * GET    /api/scheduled            列表
 * POST   /api/scheduled            新建(绑定云端项目)
 * POST   /api/scheduled/:id/run    立即巡检
 * POST   /api/scheduled/:id/toggle 启停
 * DELETE /api/scheduled/:id        删除
 * ============================================================ */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware } = require('../auth');
const { runInspect, tick } = require('../lib/scheduler');
const { notify } = require('../lib/notify');

router.get('/', authMiddleware, (req, res) => {
  try {
    res.json({ tasks: db.getScheduledTasks(req.user.id) });
  } catch (e) {
    res.status(500).json({ error: '获取失败' });
  }
});

// 最近一次巡检结果(供编辑器一键采纳)
router.get('/latest', authMiddleware, (req, res) => {
  try {
    const list = db.getScheduledTasks(req.user.id).filter((t) => t.last_result);
    if (!list.length) return res.json({ latest: null });
    const projectId = req.query.project_id || null;
    const pick = (projectId && list.find((t) => t.project_id === projectId)) || list[0];
    res.json({ latest: { name: pick.name, project_id: pick.project_id, last_run_at: pick.last_run_at, result: pick.last_result } });
  } catch (e) {
    res.status(500).json({ error: '查询失败' });
  }
});

router.post('/', authMiddleware, (req, res) => {
  try {
    const { name, project_id, prompt } = req.body || {};
    if (!name || !project_id) return res.status(400).json({ error: '缺少名称或项目' });
    const p = db.getProject(project_id, req.user.id);
    if (!p) return res.status(404).json({ error: '项目不存在或无权访问' });
    const t = db.createScheduledTask(req.user.id, name, project_id, prompt);
    res.status(201).json({ message: '已创建每日巡检', task: t });
  } catch (e) {
    console.error('创建定时任务失败:', e);
    res.status(500).json({ error: '创建失败' });
  }
});

router.post('/:id/run', authMiddleware, async (req, res) => {
  try {
    const list = db.getScheduledTasks(req.user.id);
    const t = list.find((x) => x.id === req.params.id);
    if (!t) return res.status(404).json({ error: '任务不存在' });
    const result = await runInspect({ ...t, user_id: req.user.id });
    db.updateScheduledRun(t.id, result);
    notify(req.user.id, 'review', `巡检完成:${t.name}`, String(result).slice(0, 300), '#/console');
    res.json({ message: '巡检完成', result });
  } catch (e) {
    console.error('巡检失败:', e.message);
    res.status(400).json({ error: e.message });
  }
});

router.post('/:id/toggle', authMiddleware, (req, res) => {
  try {
    const { enabled } = req.body || {};
    if (!db.setScheduledEnabled(req.params.id, req.user.id, !!enabled)) {
      return res.status(404).json({ error: '任务不存在' });
    }
    res.json({ message: enabled ? '已启用' : '已暂停' });
  } catch (e) {
    res.status(500).json({ error: '操作失败' });
  }
});

router.delete('/:id', authMiddleware, (req, res) => {
  try {
    if (!db.deleteScheduledTask(req.params.id, req.user.id)) return res.status(404).json({ error: '任务不存在' });
    res.json({ message: '已删除' });
  } catch (e) {
    res.status(500).json({ error: '删除失败' });
  }
});

module.exports = router;
