/* ============================================================
 * WebsFlow · 审核台 (review.js, 管理员)
 * GET  /api/review/queue        待审/全部 插件 + 模板
 * ============================================================ */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, adminOnly } = require('../auth');

router.get('/queue', authMiddleware, adminOnly, (req, res) => {
  try {
    res.json({ templates: db.getTemplatesForReview(), plugins: db.getPluginsForReview(), tasks: db.getTasksForReview() });
  } catch (e) {
    console.error('审核队列失败:', e);
    res.status(500).json({ error: '获取失败' });
  }
});

module.exports = router;
