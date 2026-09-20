/* ============================================================
 * WebsFlow · 通知中心 (notifications.js)
 * GET  /api/notifications          列表 + 未读数
 * POST /api/notifications/read     全部标记已读
 * ============================================================ */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware } = require('../auth');

router.get('/', authMiddleware, (req, res) => {
  try {
    res.json({ notifications: db.getNotifications(req.user.id), unread: db.getUnreadCount(req.user.id) });
  } catch (e) {
    res.status(500).json({ error: '获取通知失败' });
  }
});

router.post('/read', authMiddleware, (req, res) => {
  try {
    db.markAllRead(req.user.id);
    res.json({ message: '已全部标记已读' });
  } catch (e) {
    res.status(500).json({ error: '操作失败' });
  }
});

module.exports = router;
