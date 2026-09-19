/* ============================================================
 * WebsFlow · 平台能力目录 (capabilities.js)  —— G3
 *
 * 目标:让"谁能做什么"变成可查询的事实,而不是散落在各系统的文档里。
 *   - 自同步:WebsFlow 自身能力在启动时从工具注册表**自动派生**(能力随代码走,不会过期)
 *   - 自注册:外部系统(OpenFlow/PayFlow/其它)POST 自己的清单即可登记
 *   - 可发现:按系统/类型/关键词检索;find() 面向 Agent —— 给"需求"返回"该调谁"
 *   - 有活性:定期探活,标记 active / unreachable(Agent 不该调用已挂的能力)
 * ============================================================ */
const db = require('../db');

// 契约版本:外部依赖据此做兼容判断;破坏性变更必须提升 API_VERSION 并给出弃用期
const API_VERSION = '2026-09-01';
const MIN_SUPPORTED = '2026-09-01';
const DEPRECATION_POLICY = '工具/能力若要弃用,会先在 manifest 标记 deprecated 并给出 replaced_by 与 sunset_at,至少保留 90 天。';

function versionInfo() {
  return { api_version: API_VERSION, min_supported: MIN_SUPPORTED, deprecation_policy: DEPRECATION_POLICY };
}

const SYSTEM_LABELS = {
  websflow: 'WebsFlow(落地页与投放)',
  openflow: 'OpenFlow(内容/身份/CDP)',
  payflow: 'PayFlow(收款/结算)',
  userloop: 'UserLoop(用户回路)',
  inflow: 'inflow(流量/投放)',
};

// 内置:WebsFlow 自身 + 生态里"已知存在但由对方注册"的占位(便于发现)
const PLATFORM_BUILTIN = [
  {
    id: 'websflow.tools.call', system: 'websflow', kind: 'action',
    name: '调用 WebsFlow 工具', description: '统一入口:造页/改稿/发布/读数据/跑实验/提案审批(见 tools.manifest)',
    endpoint: 'POST /webflow/api/tools/call', auth: 'api_key', scopes: ['read'],
    invoke: 'http', returns: '{ok, tool, result}',
  },
  {
    id: 'websflow.ingest.events', system: 'websflow', kind: 'event',
    name: '回传事实事件', description: '外部系统把线索质量/订单/自定义事件推进 WebsFlow(幂等,参与分群与实验)',
    endpoint: 'POST /webflow/api/ingest', auth: 'api_key', scopes: ['ingest'],
    invoke: 'http', returns: '{accepted, deduped, rejected}',
  },
  {
    id: 'websflow.identity.resolve', system: 'websflow', kind: 'data',
    name: '身份解析与轨迹', description: '按任意标识(vid/uid/email/phone/payflow_ref)解析统一身份,并取跨系统时间线',
    endpoint: 'POST /webflow/api/identity/resolve · GET /webflow/api/identity/:id', auth: 'api_key', scopes: ['read'],
    invoke: 'http',
  },
  {
    id: 'websflow.growth.agent', system: 'websflow', kind: 'action',
    name: '增长 Agent(自主跑轮)', description: '读数据→提假设→人审→A/B→显著提优→经验沉淀;支持点击/线索多目标与风险闸门',
    endpoint: 'POST /webflow/api/growth/agent · /agent/run', auth: 'api_key', scopes: ['growth'],
    invoke: 'http',
  },
  {
    id: 'websflow.lessons.read', system: 'websflow', kind: 'data',
    name: '增长经验库', description: '跨项目/跨轮的改动胜率与人工驳回规避(供其它系统的决策复用)',
    endpoint: 'GET /webflow/api/growth/lessons', auth: 'api_key', scopes: ['read'],
    invoke: 'http',
  },
  {
    id: 'websflow.lessons.contract', system: 'websflow', kind: 'data',
    name: '平台经验库(契约)',
    description: '记录/复用/规避经验:场景→动作→结果 + 胜率与样本;任何系统都可写入与读取,供各自 AI 决策',
    endpoint: 'POST /webflow/api/lessons · GET /webflow/api/lessons/summary · /brief', auth: 'api_key', scopes: ['read'],
    invoke: 'http',
  },
  // 生态占位:对方注册前也能被"发现",注册后补全 endpoint/schema
  {
    id: 'openflow.cdp.track', system: 'openflow', kind: 'event',
    name: 'CDP 事件采集', description: '向 OpenFlow 上报页面/用户事件(现有站点统一埋点)',
    endpoint: '/api/cdp.php', auth: 'public', invoke: 'http', status: 'unverified',
  },
  {
    id: 'openflow.lead.create', system: 'openflow', kind: 'action',
    name: '写入待办/线索', description: '把线索或待办交给 OpenFlow 承接(CRM/旅程为该域所有者)',
    endpoint: 'OpenFlow 待办 API', auth: 'internal', invoke: 'internal', status: 'unverified',
  },
  {
    id: 'payflow.coupon.validate', system: 'payflow', kind: 'data',
    name: '券校验', description: '校验优惠券有效性与折扣(PayFlow 为价格真源)',
    endpoint: 'PayFlow validate(WebsFlow 已代理 /webflow/api/automation/coupon)', auth: 'internal', invoke: 'internal',
  },
  {
    id: 'payflow.order.events', system: 'payflow', kind: 'event',
    name: '订单事件回灌', description: 'order.paid / refunded / subscription.* → WebsFlow 对账与身份归并',
    endpoint: 'POST /webflow/api/webhooks/payflow(PayFlow 推送)', auth: 'hmac', invoke: 'webhook',
  },
  {
    id: 'payflow.payout.request', system: 'payflow', kind: 'action',
    name: '提现申请', description: '佣金提现(最低金额与审核由 PayFlow 决定)',
    endpoint: 'PayFlow payout API', auth: 'api_key', invoke: 'http', status: 'unverified',
  },
];

// 从工具注册表派生 WebsFlow 能力(能力随代码走,永不outdated)
function syncBuiltin() {
  let n = 0;
  PLATFORM_BUILTIN.forEach((c) => { if (db.upsertCapability(Object.assign({ source: 'builtin' }, c))) n++; });
  try {
    const TOOLS = require('../routes/tools').TOOLS || {};
    Object.keys(TOOLS).forEach((name) => {
      const t = TOOLS[name];
      db.upsertCapability({
        id: 'websflow.tool.' + name,
        system: 'websflow',
        kind: 'action',
        name: name,
        description: t.desc,
        params: t.params,
        auth: 'api_key',
        scopes: [t.scope || 'read'],
        endpoint: 'POST /webflow/api/tools/call {name:"' + name + '"}',
        invoke: 'http',
        source: 'builtin',
      });
      n++;
    });
  } catch (e) { /* 工具表未就绪时忽略 */ }
  return n;
}

// 面向 Agent:给出"需求"→ 返回候选能力(附调用方式与权限)
function findCapability(need, opts) {
  const raw = String(need || '').trim().toLowerCase();
  const lim = Number((opts && opts.limit) || 8);
  // limit 是"打分后取前 N",不能当 SQL LIMIT 用(否则只有前几条参与打分)
  const all = db.listCapabilities({ limit: 500 });
  if (!raw) return all.slice(0, lim);

  // 中文用二元组匹配(整句单 token 会导致"回传线索质量"这类需求命中不到)
  const grams = new Set();
  raw.split(/\s+/).filter(Boolean).forEach((w) => {
    grams.add(w);
    const cjk = w.replace(/[^\u4e00-\u9fa5]/g, '');
    for (let i = 0; i < cjk.length - 1; i++) grams.add(cjk.slice(i, i + 2));
    if (/^[a-z0-9_-]+$/.test(w)) grams.add(w);
  });

  const scored = all.map((c) => {
    const hay = (c.id + ' ' + (c.name || '') + ' ' + (c.description || '') + ' ' + (c.system || '')).toLowerCase();
    let kw = 0;
    grams.forEach((g) => { if (g && hay.includes(g)) kw += g.length >= 2 ? 2 : 1; });
    if (c.id.toLowerCase().includes(raw)) kw += 6;
    if ((c.name || '').toLowerCase().includes(raw)) kw += 4;
    // 基础分只用于排序,不能让它把不相关的能力"垫"进候选
    let bonus = 0;
    if (c.status === 'active') bonus += 1;
    if (c.last_verified_at) bonus += 1;
    if (c.source === 'builtin') bonus += 0.5;
    return { cap: c, kw, s: kw + bonus };
  }).filter((x) => x.kw > 0);

  return scored.sort((a, b) => b.s - a.s).slice(0, lim).map((x) => Object.assign({}, x.cap, { _score: x.s }));
}

// 把 endpoint 描述解析成可探测的 URL(相对路径 → 本机 API;不含路径的跳过)
function probeTarget(endpoint) {
  const e = String(endpoint || '').trim();
  if (!e) return null;
  const abs = e.match(/https?:\/\/[^\s]+/);
  if (abs) return abs[0];
  const pathMatch = e.match(/(\/(?:webflow\/)?(?:api|p)\/[A-Za-z0-9_\/:.-]*)/);
  if (!pathMatch) return null;
  let path = pathMatch[1].replace(/^\/webflow/, '');   // Node 内部挂载不含 /webflow 前缀
  path = path.replace(/\/:([a-z_]+)/gi, '/probe');      // 路径参数替换成占位,便于探活
  return 'http://127.0.0.1:' + (process.env.PORT || 3001) + path;
}

// Node 16 没有全局 fetch → 用 http/https 原生实现
function httpStatus(url, timeoutMs) {
  return new Promise((resolve) => {
    let u;
    try { u = new URL(url); } catch (e) { return resolve({ ok: false, error: 'URL 无效' }); }
    const mod = u.protocol === 'https:' ? require('https') : require('http');
    const req = mod.request({
      hostname: u.hostname, port: u.port || (u.protocol === 'https:' ? 443 : 80),
      path: u.pathname + (u.search || ''), method: 'GET', timeout: timeoutMs || 5000,
    }, (res) => { res.resume(); resolve({ ok: res.statusCode < 500, status: res.statusCode }); });
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, error: 'timeout' }); });
    req.on('error', (e) => resolve({ ok: false, error: e.message }));
    req.end();
  });
}

// 探测一条能力:任何 <500 的 HTTP 响应都算存活(401/403 说明服务在)
async function probeOne(cap) {
  const url = probeTarget(cap.endpoint);
  if (!url) return { id: cap.id, skipped: true };
  const r = await httpStatus(url, 5000);
  const ok = !!r.ok;
  db.setCapabilityVerified(cap.id, ok ? 'active' : 'unreachable');
  return { id: cap.id, ok, status: r.status || 0, url, error: r.error };
}

module.exports = { API_VERSION, versionInfo, syncBuiltin, findCapability, probeTarget, probeOne, SYSTEM_LABELS, PLATFORM_BUILTIN };
