/* ============================================================
 * WebsFlow · 模块范式路由 (patterns.js)  —— 面向伙伴/开发者/AI 爱好者
 * GET  /api/patterns          内置 + 伙伴范式(含参考来源与许可)
 * POST /api/patterns          提交范式包(校验 → 注册为模块 → 进入生产选型池)
 * ============================================================ */
const express = require('express');
const router = express.Router();
const { authMiddleware, apiKeyAuth } = require('../auth');
const packs = require('../lib/pattern-packs');

function either(req, res, next) {
  const h = req.headers.authorization || '';
  if (h.startsWith('wfk_') || h.startsWith('Bearer wfk_')) return apiKeyAuth(req, res, next);
  return authMiddleware(req, res, next);
}

router.get('/', either, (req, res) => {
  let builtin = [];
  try { builtin = require('../lib/module-patterns.json').patterns || []; } catch (e) {}
  const partner = packs.asPatterns(req.user.id).map((p) => ({ key: p.key, name: p.name, ref: p.ref, roles: p.roles, tags: p.tags, block_type: p.block_type, fields: p.fields, template: p.template }));
  res.json({
    builtin: builtin.map((p) => ({ key: p.key, name: p.name, ref: p.ref, license: p.license, roles: p.roles, tags: p.tags })),
    partner,
    schema: {
      pack: { name: 'string ≤60', author: 'string', version: 'string', patterns: '[{key,name,ref,roles[],tags[],fields[],template}]' },
      rules: ['template 仅限安全 HTML + {{字段}} 占位符', 'key 为小写字母/数字/下划线', '提交后自动注册为模块并进入生产选型池'],
    },
  });
});

router.post('/', either, (req, res) => {
  const pack = (req.body && req.body.pack) || req.body;
  const r = packs.submit(req.user, pack);
  if (!r.ok) return res.status(400).json(r);
  res.status(201).json(r);
});

module.exports = router;
