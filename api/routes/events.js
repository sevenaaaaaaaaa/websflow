/* ============================================================
 * WebsFlow · 转化事件路由 (events.js)
 * POST /api/events  公开上报(sendBeacon)
 * GET  /api/events  需登录,按目标聚合统计
 * ============================================================ */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, verifyToken } = require('../auth');

// 公开上报(sendBeacon 从访客浏览器发出,无登录态)
router.post('/', (req, res) => {
  try {
    const { goal_id, type, url, project_id, seg, vid, src, uid, trace_id } = req.body || {};
    if (!goal_id) {
      return res.status(400).json({ error: 'goal_id 必填' });
    }
    if (String(goal_id).length > 64) {
      return res.status(400).json({ error: 'goal_id 过长' });
    }
    const ev = db.addEvent(String(goal_id), String(type || 'cta_click').slice(0, 32), String(url || '').slice(0, 300), project_id ? String(project_id) : null, seg ? String(seg) : null, vid ? String(vid) : null, src ? String(src) : null, { uid, traceId: trace_id || req.headers['x-trace-id'] });
    res.status(201).json({ ok: true, event: ev });
  } catch (error) {
    console.error('事件上报失败:', error);
    res.status(500).json({ error: '上报失败' });
  }
});

// 统计查询(需登录)
router.get('/', authMiddleware, (req, res) => {
  try {
    const events = db.getEvents({
      goal_id: req.query.goal_id,
      project_id: req.query.project_id,
    });
    res.json({ events });
  } catch (error) {
    console.error('查询事件失败:', error);
    res.status(500).json({ error: '查询失败' });
  }
});

// 实时指标(需登录):分钟级序列 + 1/5/15 分钟窗口 + 最近事件
router.get('/realtime', authMiddleware, (req, res) => {
  try {
    res.json({ realtime: db.getRealtimeMetrics(req.query.project_id, req.query.minutes) });
  } catch (e) {
    console.error('实时指标失败:', e);
    res.status(500).json({ error: '获取失败' });
  }
});

// SSE 实时流(EventSource 不能带 header → token 走 query)
router.get('/realtime/stream', (req, res) => {
  const token = String(req.query.token || '');
  const decoded = token ? verifyToken(token) : null;
  if (!decoded || !db.findUserById(decoded.id)) return res.status(401).end();
  const projectId = req.query.project_id || null;

  res.set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders && res.flushHeaders();

  const push = () => {
    try {
      const data = db.getRealtimeMetrics(projectId, 30);
      res.write('data: ' + JSON.stringify(data) + '\n\n');
    } catch (e) { /* 忽略单次错误 */ }
  };
  push();
  const timer = setInterval(push, 3000);
  req.on('close', () => clearInterval(timer));
});

// 转化看板聚合统计(需登录):总量 / 按目标 / 每日趋势 / 最近事件
router.get('/stats', authMiddleware, (req, res) => {
  try {
    const stats = db.getEventStats({
      days: req.query.days ? Number(req.query.days) : undefined,
      project_id: req.query.project_id,
    });
    stats.bySeg = db.getEventStatsBySeg(req.query.project_id);
    res.json({ stats });
  } catch (error) {
    console.error('查询统计失败:', error);
    res.status(500).json({ error: '查询失败' });
  }
});

module.exports = router;
