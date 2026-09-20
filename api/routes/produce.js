/* ============================================================
 * WebsFlow · 生产流水线路由 (produce.js)
 * POST /api/produce           提交 brief → 启动生产(异步),返回 id
 * GET  /api/produce           历史生产列表
 * GET  /api/produce/:id       步骤/结果(轮询用)
 * GET  /api/produce/:id/pack  交付包文件列表与内容
 * ============================================================ */
const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const db = require('../db');
const { authMiddleware } = require('../auth');
const producer = require('../lib/producer');

router.post('/', authMiddleware, (req, res) => {
  const brief = req.body && req.body.brief ? req.body.brief : (req.body || {});
  if (!brief.business && !brief.product) return res.status(400).json({ error: '请至少填写业务/品牌或产品' });
  const prod = db.addProduction({ user_id: req.user.id, brief: JSON.stringify(brief), status: 'running' });
  // 异步执行:前端轮询步骤,避免网关超时
  producer.run(req.user.id, brief, { productionId: prod.id })
    .catch((e) => { console.error('[produce] 失败:', e.message); });
  res.status(202).json({ ok: true, id: prod.id, status: 'running' });
});

router.get('/', authMiddleware, (req, res) => {
  const rows = db.listProductions(req.user.id, req.query.limit);
  res.json({ productions: rows.map((r) => ({ id: r.id, status: r.status, created_at: r.created_at, brief: safe(r.brief), steps: safe(r.steps, []) })) });
});

router.get('/industries', authMiddleware, (req, res) => {
  res.json({ industries: require('../lib/asset-library').industryList() });
});

router.get('/:id', authMiddleware, (req, res) => {
  const r = db.getProduction(req.params.id);
  if (!r || r.user_id !== req.user.id) return res.status(404).json({ error: '生产记录不存在' });
  res.json({ id: r.id, status: r.status, created_at: r.created_at, brief: safe(r.brief), steps: safe(r.steps, []), result: safe(r.result, null) });
});

router.get('/:id/pack', authMiddleware, (req, res) => {
  const r = db.getProduction(req.params.id);
  if (!r || r.user_id !== req.user.id) return res.status(404).json({ error: '生产记录不存在' });
  const dir = path.join(producer.DELIVERY_DIR, r.id);
  if (!fs.existsSync(dir)) return res.status(404).json({ error: '交付包尚未生成' });
  const files = fs.readdirSync(dir).map((name) => {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    const isText = /\.(md|json|txt|html)$/i.test(name) && stat.size < 512 * 1024;
    return { name, size: stat.size, content: isText ? fs.readFileSync(full, 'utf8') : null };
  });
  res.json({ id: r.id, dir, files });
});

function safe(json, fallback) {
  try { return json ? JSON.parse(json) : fallback; } catch (e) { return fallback; }
}

module.exports = router;
