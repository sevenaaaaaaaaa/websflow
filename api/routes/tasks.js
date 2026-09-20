/* ============================================================
 * WebsFlow · 云端 Copilot 任务库 (tasks.js)
 * GET    /api/tasks            公开列表(已过审 + 自己的)
 * POST   /api/tasks            发布任务(需登录,进入审核)
 * POST   /api/tasks/:id/review 审核(管理员)
 * POST   /api/tasks/:id/use    使用计数
 * DELETE /api/tasks/:id        删除自己的
 * ============================================================ */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, optionalAuth, adminOnly } = require('../auth');
const { notify, notifyAdmins } = require('../lib/notify');

router.get('/', optionalAuth, (req, res) => {
  try {
    res.json({ tasks: db.getTasks(req.user && req.user.id) });
  } catch (e) {
    res.status(500).json({ error: '获取任务失败' });
  }
});

router.post('/', authMiddleware, (req, res) => {
  try {
    const { name, prompt, params } = req.body || {};
    if (!name || !prompt) return res.status(400).json({ error: '缺少任务名称或提示词' });
    const isAdmin = !!req.user.is_admin;
    const t = db.createTask(req.user.id, req.user.display_name || req.user.username,
      name, prompt, Array.isArray(params) ? params.slice(0, 6) : [], isAdmin ? 'approved' : 'pending');
    if (!isAdmin) notifyAdmins('review', '有新的 Copilot 任务待审核', `${req.user.display_name || req.user.username} 提交了「${t.name}」`, '#/console');
    res.status(201).json({ message: isAdmin ? '任务已上架' : '任务已提交,等待审核', task: t });
  } catch (e) {
    console.error('发布任务失败:', e);
    res.status(500).json({ error: '发布失败' });
  }
});

router.post('/:id/review', authMiddleware, adminOnly, (req, res) => {
  try {
    const { status, featured, note } = req.body || {};
    if (!['approved', 'rejected', 'pending'].includes(status)) return res.status(400).json({ error: '状态非法' });
    const target = db.getTasks(null).find((x) => x.id === req.params.id);
    db.reviewTask(req.params.id, status, featured, note);
    if (target && target.owner_id) {
      const label = status === 'approved' ? (featured ? '已上架并设为推荐' : '已通过审核') : status === 'rejected' ? '未通过审核' : '已打回修改';
      notify(target.owner_id, 'review', `你的任务「${target.name}」${label}`, note || '', '#/console');
    }
    res.json({ message: '已完成审核' });
  } catch (e) {
    res.status(500).json({ error: '审核失败' });
  }
});

router.post('/:id/use', optionalAuth, (req, res) => {
  try { db.incrementTaskUses(req.params.id); } catch (e) {}
  res.json({ ok: true });
});

router.delete('/:id', authMiddleware, (req, res) => {
  try {
    if (!db.deleteTask(req.params.id, req.user.id)) return res.status(404).json({ error: '任务不存在或无权删除' });
    res.json({ message: '任务已删除' });
  } catch (e) {
    res.status(500).json({ error: '删除失败' });
  }
});

module.exports = router;
