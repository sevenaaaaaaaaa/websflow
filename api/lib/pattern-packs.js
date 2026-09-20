/* ============================================================
 * WebsFlow · 范式包 (pattern-packs.js)  —— 开放给伙伴/开发者/AI 爱好者
 *
 * 一个范式包 = 一份 JSON(可含多个范式),提交后:
 *   1) 结构校验(仅允许安全 HTML/占位符,禁止脚本)
 *   2) 每个范式注册成一个模块(插件表,owner 归属提交者)
 *   3) 该用户的后续生产会**自动优先用这些范式**(与内置范式同池竞争)
 *
 * 目标:生态伙伴把自己的行业模块沉淀成范式包,越用越准。
 * ============================================================ */
const db = require('../db');
const { sanitizePluginHtml } = require('./sanitize');

const STMT = /<script|on\w+\s*=|javascript:|<iframe/i;
const ALLOWED_ROLES = ['hero', 'proof', 'logos', 'problem', 'how', 'agenda', 'features', 'metrics', 'testimonial', 'gallery', 'objection', 'offer', 'cta', 'signup', 'community', 'custom'];

function validate(pack) {
  const errs = [];
  if (!pack || typeof pack !== 'object') return { ok: false, errs: ['包必须是 JSON 对象'] };
  if (!pack.name || String(pack.name).length > 60) errs.push('缺少包名(name,≤60 字)');
  const list = Array.isArray(pack.patterns) ? pack.patterns : [];
  if (!list.length) errs.push('patterns 至少 1 个');
  if (list.length > 20) errs.push('patterns 最多 20 个');
  list.forEach((pt, i) => {
    const at = `patterns[${i}]`;
    const key = String(pt.key || '').toLowerCase();
    if (!/^[a-z0-9_]{3,32}$/.test(key)) errs.push(`${at}.key 需为小写字母/数字/下划线(3-32)`);
    if (!pt.name) errs.push(`${at}.name 必填`);
    if (!pt.template || String(pt.template).length < 40) errs.push(`${at}.template 太短(<40)`);
    if (String(pt.template || '').length > 5000) errs.push(`${at}.template 太长(>5000)`);
    if (STMT.test(String(pt.template || ''))) errs.push(`${at}.template 含不允许的标签/事件(script/on*/iframe)`);
    if (!/\{\{[a-z_]+\}\}/i.test(String(pt.template || ''))) errs.push(`${at}.template 至少要有一个 {{字段}} 占位符`);
    if (pt.roles && (!Array.isArray(pt.roles) || pt.roles.some((r) => !ALLOWED_ROLES.includes(r)))) errs.push(`${at}.roles 只能是:${ALLOWED_ROLES.join('/')}`);
    if (pt.fields && !Array.isArray(pt.fields)) errs.push(`${at}.fields 必须是数组`);
  });
  if (!pack.author) errs.push('缺少作者(author,便于署名与生态展示)');
  return { ok: errs.length === 0, errs };
}

function submit(user, pack) {
  const v = validate(pack);
  if (!v.ok) return { ok: false, errors: v.errs };
  const created = [];
  (pack.patterns || []).forEach((pt) => {
    const blockType = 'patp_' + String(pt.key).toLowerCase();
    const fields = Array.isArray(pt.fields) && pt.fields.length ? pt.fields : [
      { key: 'title', label: '标题', type: 'text' },
      { key: 'lead', label: '说明', type: 'textarea' },
      { key: 'items', label: '要点', type: 'list', itemFields: [{ key: 'text', label: '要点', type: 'text' }] },
    ];
    const template = sanitizePluginHtml(pt.template);
    let pluginId = null;
    try {
      const row = db.createPlugin(user.id, pt.name, blockType, `${pt.description || '伙伴范式包'} · ${pack.name} · by ${pack.author}`, fields, template, 0);
      pluginId = row && row.id;
      try { db.reviewPlugin(pluginId, 'approved', '范式包自动收录'); } catch (e) {}
    } catch (e) { /* 已存在则复用 */ }
    created.push({ key: pt.key, block_type: blockType, name: pt.name, plugin_id: pluginId });
  });
  const packRow = { name: pack.name, author: pack.author, version: pack.version || '1', patterns: pack.patterns.length };
  try {
    db.addPatternPack({ owner_id: user.id, name: pack.name, author: pack.author, version: pack.version || '1', patterns: pack.patterns });
  } catch (e) { /* 存包失败不影响模块注册 */ }
  try {
    const b = db.getCapability ? null : null;
    if (db.upsertCapability) {
      db.upsertCapability({
        id: 'websflow.pattern_pack.' + String(pack.name).toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40),
        system: 'websflow', kind: 'data', name: '范式包:' + pack.name,
        description: `${pack.author} 提交的 ${pack.patterns.length} 个模块范式(可用于生产流水线)`,
        endpoint: 'POST /webflow/api/patterns', auth: 'api_key', scopes: ['read'], invoke: 'http',
        source: 'partner', status: 'available',
      });
    }
  } catch (e) {}
  return { ok: true, pack: packRow, created };
}

// 已提交的范式包(存了原文:tags/roles/ref 不丢)
function listPacks(userId) {
  try { return db.listPatternPacks(userId, 20) || []; } catch (e) { return []; }
}

// 转成与内置范式同构的结构,合并进选型池(按下层 key 去重,后提交的覆盖同名)
function asPatterns(userId) {
  const seen = new Map();
  listPacks(userId).forEach((pack) => {
    let list = [];
    try { list = typeof pack.patterns === 'string' ? JSON.parse(pack.patterns) : (pack.patterns || []); } catch (e) { list = []; }
    list.forEach((pt) => {
      const key = String(pt.key || '').toLowerCase();
      if (!key) return;
      seen.set(key, {
        key,
        name: pt.name || key,
        ref: (pt.ref || '伙伴原创') + ' · ' + (pack.author || '伙伴') + ' / ' + pack.name,
        license: 'partner',
        roles: Array.isArray(pt.roles) && pt.roles.length ? pt.roles : ['custom', 'features', 'proof'],
        tags: (Array.isArray(pt.tags) && pt.tags.length ? pt.tags : String(pt.name || '').split(/[\s/·]+/)).filter(Boolean),
        fields: Array.isArray(pt.fields) ? pt.fields : [],
        template: pt.template || '',
        block_type: 'patp_' + key,
        partner: true,
        pack: pack.name,
        author: pack.author,
      });
    });
  });
  return Array.from(seen.values());
}

module.exports = { validate, submit, listPacks, asPatterns, ALLOWED_ROLES };
