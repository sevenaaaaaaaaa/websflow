/* ============================================================
 * WebsFlow · 事件回传 (ingest.js 路由)  —— G1
 * POST /api/ingest   外部系统投递事实事件(需 API 密钥 + ingest 权限)
 * GET  /api/ingest/schema  字段说明(便于外部系统对接)
 * ============================================================ */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { apiKeyAuth } = require('../auth');
const { ingestEvents } = require('../lib/ingest');

router.get('/schema', apiKeyAuth, (req, res) => {
  res.json({
    endpoint: 'POST /webflow/api/ingest',
    auth: 'Authorization: Bearer wfk_...(scope: ingest)',
    body: {
      events: [{
        event_id: '外部系统内唯一(幂等必需,重复投递只落一条)',
        type: 'lead_quality | order_paid | refund | form_submit | ... (小写字母/数字/:_- ,≤40)',
        project_id: '可选;填了必须属于你这边的项目',
        goal_id: '可选;默认取 type(用于分群/转化计量)',
        value: '可选数字(如线索质量 0-1、订单金额)',
        uid: '可选;打通登录身份用',
        vid: '可选;访客标识',
        seg: '可选;分群标记',
        src: '可选;来源',
        url: '可选;发生页地址',
      }],
    },
    limits: { max_batch: 200 },
    notes: '投递后自动参与:实时看板 / 分群归因 / A/B 计量 / 增长 Agent 感知',
  });
});

router.post('/', apiKeyAuth, (req, res) => {
  const t0 = Date.now();
  try {
    const scopes = (req.apiKey && Array.isArray(req.apiKey.scopes)) ? req.apiKey.scopes : [];
    if (scopes.length && !scopes.includes('ingest')) {
      return res.status(403).json({ error: '该密钥没有 ingest 权限' });
    }
    const q = db.bumpApiQuota(req.apiKey.id);
    const quota = Number(req.apiKey.quota_per_day) || 2000;
    if (q.calls > quota) {
      db.addApiAudit({ key_id: req.apiKey.id, user_id: req.user.id, action: 'ingest', detail: 'quota exceeded', ok: 0, error: 'quota', ip: req.ip });
      return res.status(429).json({ error: `超出当日配额(${quota})` });
    }
    const result = ingestEvents(req.user, req.body || {});
    db.addApiAudit({
      key_id: req.apiKey.id, user_id: req.user.id, action: 'ingest',
      detail: `accepted=${result.accepted} deduped=${result.deduped} rejected=${result.rejected.length}`,
      ok: 1, ms: Date.now() - t0, ip: req.ip, trace_id: req.headers['x-trace-id'] || (req.body && req.body.trace_id) || null,
    });
    res.json(Object.assign({ ok: true }, result));
  } catch (e) {
    db.addApiAudit({ key_id: req.apiKey && req.apiKey.id, user_id: req.user && req.user.id, action: 'ingest', detail: '', ok: 0, error: e.message, ms: Date.now() - t0, ip: req.ip });
    console.error('[ingest] 失败:', e.message);
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
