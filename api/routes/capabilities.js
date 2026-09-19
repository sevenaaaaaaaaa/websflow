/* ============================================================
 * WebsFlow · 平台能力目录路由 (capabilities.js)  —— G3
 * GET  /api/capabilities            能力列表(?system=&kind=&q=&status=)
 * GET  /api/capabilities/find       面向 Agent:按"需求"找能力(?need=&limit=)
 * GET  /api/capabilities/systems    系统总览(各系统能力数/活跃数)
 * GET  /api/capabilities/manifest   机器可读全量目录
 * POST /api/capabilities/register   外部系统自注册(API 密钥,scope: admin 或默认全权)
 * POST /api/capabilities/sync       重新同步内置能力(登录用户)
 * POST /api/capabilities/probe      探活已登记 HTTP 端点(登录用户)
 * ============================================================ */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, apiKeyAuth } = require('../auth');
const caps = require('../lib/capabilities');

// 列表:控制台用(登录)或外部 Agent 用(密钥)
function either(req, res, next) {
  const h = req.headers.authorization || '';
  if (h.startsWith('Bearer wfk_')) return apiKeyAuth(req, res, next);
  return authMiddleware(req, res, next);
}

router.get('/', either, (req, res) => {
  res.json({
    ...caps.versionInfo(),
    capabilities: db.listCapabilities({ system: req.query.system, kind: req.query.kind, q: req.query.q, status: req.query.status, limit: req.query.limit, includeDeprecated: req.query.include_deprecated === '1' }),
  });
});

router.get('/find', either, (req, res) => {
  const found = caps.findCapability(req.query.need, { limit: req.query.limit });
  res.json({
    need: req.query.need || '',
    count: found.length,
    capabilities: found,
    hint: found.length ? '按 endpoint + auth/scopes 调用;status=unreachable 的不要调用' : '目录中没有匹配能力,可先注册',
  });
});

router.get('/systems', either, (req, res) => {
  const all = db.listCapabilities({});
  const map = {};
  all.forEach((c) => {
    const m = map[c.system] || (map[c.system] = { system: c.system, label: caps.SYSTEM_LABELS[c.system] || c.system, total: 0, active: 0, kinds: {} });
    m.total++;
    if (c.status === 'active') m.active++;
    m.kinds[c.kind] = (m.kinds[c.kind] || 0) + 1;
  });
  res.json({ systems: Object.values(map) });
});

router.get('/manifest', either, (req, res) => {
  res.json(Object.assign({
    name: 'WebsFlow Platform Capabilities',
    description: '平台能力目录:各系统能做什么、怎么调、要什么权限',
    systems: caps.SYSTEM_LABELS,
    capabilities: db.listCapabilities({ includeDeprecated: req.query.include_deprecated === '1' }),
  }, caps.versionInfo()));
});

// 标记能力弃用(管理员/密钥)
router.post('/deprecate', either, (req, res) => {
  const scopes = Array.isArray(req.apiKey && req.apiKey.scopes) ? req.apiKey.scopes : [];
  if (req.apiKey && scopes.length && !scopes.includes('admin') && !scopes.includes('write')) {
    return res.status(403).json({ error: '该密钥没有标记弃用的权限(write/admin)' });
  }
  const { id, replaced_by } = req.body || {};
  if (!id) return res.status(400).json({ error: '缺少 id' });
  const cap = db.deprecateCapability(id, replaced_by);
  if (!cap) return res.status(404).json({ error: '能力不存在' });
  res.json({ ok: true, capability: cap });
});

router.post('/register', apiKeyAuth, (req, res) => {
  const scopes = Array.isArray(req.apiKey.scopes) ? req.apiKey.scopes : [];
  if (scopes.length && !scopes.includes('admin') && !scopes.includes('write')) {
    return res.status(403).json({ error: '该密钥没有注册能力权限(write/admin)' });
  }
  const body = req.body || {};
  const list = Array.isArray(body.capabilities) ? body.capabilities : (body.id ? [body] : []);
  if (!list.length) return res.status(400).json({ error: '缺少 capabilities 数组或 id' });
  let n = 0;
  list.forEach((c) => {
    const r = db.upsertCapability(Object.assign({ source: 'registered', owner_user_id: req.user.id }, c));
    if (r) n++;
  });
  res.json({ ok: true, registered: n });
});

router.post('/sync', authMiddleware, (req, res) => {
  const n = caps.syncBuiltin();
  res.json({ ok: true, synced: n, total: db.listCapabilities({}).length });
});

router.post('/probe', authMiddleware, async (req, res) => {
  const all = db.listCapabilities({ invoke: 'http' }).filter((c) => c.endpoint);
  const results = [];
  for (const c of all.slice(0, 40)) results.push(await caps.probeOne(c));
  res.json({ ok: true, probed: results.filter((r) => !r.skipped).length, skipped: results.filter((r) => r.skipped).length, results: results.filter((r) => !r.skipped) });
});

module.exports = router;
