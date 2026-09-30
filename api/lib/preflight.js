/* ============================================================
 * WebsFlow · 发布前质检 (preflight.js)
 *
 * BLOCK 语义:error 级问题默认拦截发布(BLOCK=0 才可发布),
 * warn 级仅提示不拦截。供 /projects/:id/publish 与生产流水线共用;
 * 与 ai/lib/producer.js 的 qaGate 区分:qaGate 面向流水线(带自动修复),
 * preflight 面向发布动作(只读检查,不改动内容)。
 * ============================================================ */

const { loadWF } = require('./wf');

function parseData(raw) {
  if (raw && typeof raw === 'object') return raw;
  try { return JSON.parse(String(raw || '{}')); } catch (e) { return {}; }
}

function collectBlocks(data) {
  const out = [];
  const pushAll = (blocks) => (blocks || []).forEach((b) => {
    if (!b) return;
    out.push(b);
    if (Array.isArray(b.children) && b.children.length) pushAll(b.children);
  });
  if (Array.isArray(data.pages) && data.pages.length) data.pages.forEach((p) => pushAll(p && p.blocks));
  else pushAll(data.blocks);
  return out;
}

function preflight(data) {
  const d = parseData(data);
  const wf = loadWF();
  const errors = [], warns = [];
  // 项目自带的新模块(流水线现场生成)在渲染路径注册,这里同样视为已知
  const own = Array.isArray(d.customModules) ? d.customModules : [];
  const known = (type) => !!(wf.Blocks[type] || (wf.Plugins && wf.Plugins[type]) ||
    own.some((m) => m && m.block_type === type));

  const blocks = collectBlocks(d);
  blocks.forEach((b) => {
    if (!known(b.type)) errors.push({ code: 'module.unknown', msg: `模块类型未注册:${b.type}`, path: b.id });
  });

  const hero = blocks.find((b) => b.type === 'hero');
  if (hero && !(hero.props && String(hero.props.title || '').trim())) {
    errors.push({ code: 'copy.heroTitle', msg: '首屏缺少主标题', path: hero.id });
  }

  const g = d.global || {};
  if (!String(g.title || '').trim()) errors.push({ code: 'seo.title', msg: '页面标题(global.title)为空' });
  else if (String(g.title).trim().length > 80) warns.push({ code: 'seo.title.length', msg: `页面标题 ${String(g.title).trim().length} 字符,建议 ≤60` });
  if (!String(g.description || '').trim()) warns.push({ code: 'seo.description', msg: '页面描述为空,搜索引擎将自行截取正文' });
  else if (String(g.description).trim().length > 200) warns.push({ code: 'seo.description.length', msg: `页面描述 ${String(g.description).trim().length} 字符,建议 ≤155` });

  return { ok: errors.length === 0, errors, warns, checked: blocks.length };
}

module.exports = { preflight };
