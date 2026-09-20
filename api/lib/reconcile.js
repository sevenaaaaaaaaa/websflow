/* ============================================================
 * WebsFlow · 每日对账 (reconcile.js)
 * PayFlow(data/orders.json) ↔ WebsFlow(payflow_orders) 双向核对
 *   - 本地已记录但未入账 + 远端已支付 → 自动补入账(heal)
 *   - 金额不一致 → 记录并告警
 *   - 远端已支付但本地无记录(Webhook 丢失且未建映射) → 按 email 自动补建并入账,或标记人工
 * 结果:落库 + 通知管理员 + 邮件(配置可用时)
 * ============================================================ */
const fs = require('fs');
const db = require('../db');
const payflow = require('./payflow');
const { notifyAdmins } = require('./notify');
const mailer = require('./mailer');
const openflow = require('./openflow');
const { pushLark } = require('./notify');
const { applyPaidOrder } = require('./billing-apply');
const { notify } = require('./notify');

const AUTO_CORRECT_CAP_CENTS = 5000;  // 单笔自动冲正上限 ¥50,超出转人工

const ORDERS_PATH = '/www/wwwroot/payflow/data/orders.json';

// 降级:读取 PayFlow 的 JSON 文件(仅当 API 不可用;PayFlow 可能已切数据库)
function readPayflowOrdersFile() {
  try {
    const raw = JSON.parse(fs.readFileSync(ORDERS_PATH, 'utf8'));
    const recs = raw.records || raw;
    return Object.values(recs);
  } catch (e) {
    return null;
  }
}

// 权威来源:PayFlow 订单列表 API(跨 JSON/SQLite/MySQL 驱动一致)
// 收口后默认**不再读文件**(PayFlow 可能已切数据库,文件会误导对账);
// 如需离线降级,显式开启 commerce-config.json → allowFileFallback: true
async function fetchPayflowOrders() {
  try {
    const r = await payflow.request('GET', '/api/v1/orders', null, 'limit=1000');
    if (r && Array.isArray(r.orders)) return { source: 'api', orders: r.orders };
  } catch (e) {
    console.warn('[reconcile] 订单 API 不可用:', e.message);
  }
  const commerce = require('./commerce');
  if (commerce.config().allowFileFallback) {
    const file = readPayflowOrdersFile();
    if (file) return { source: 'file(显式降级)', orders: file };
  }
  return { source: 'none', orders: [] };
}

async function run() {
  const report = {
    at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    readable: true, checked: 0, healed: 0, ok: 0, source: 'api',
    missingRemote: [], amountMismatch: [], orphans: [],
  };
  const fetched = await fetchPayflowOrders();
  report.source = fetched.source;
  const pf = fetched.orders;
  if (!pf || !pf.length && fetched.source === 'none') {
    report.readable = false;
    report.note = 'PayFlow 订单来源不可用(API 与文件均失败)';
    db.saveReconcileReport(report);
    notifyAdmins('review', '每日对账异常', report.note, '#/console');
    return report;
  }
  const byNo = new Map(pf.map((o) => [o.order_no, o]));
  const map = payflow.productMap();
  const ourProducts = new Set(Object.values(map).filter(Boolean));
  const locals = db.getAllPayflowOrders();
  const localNos = new Set(locals.map((r) => r.order_no));

  // 1) 本地记录逐笔核对
  for (const row of locals) {
    report.checked++;
    const remote = byNo.get(row.order_no);
    if (!remote) {
      report.missingRemote.push({ order_no: row.order_no, local_status: row.status });
      continue;
    }
    const remotePaid = remote.status === 'paid' || remote.status === 'delivered';
    if (remotePaid && row.status !== 'paid') {
      const r = applyPaidOrder(row.order_no);
      if (r && !r.already) { report.healed++; continue; }
    }
    if (Number(remote.amount_cents || 0) !== Number(row.amount_cents || 0)) {
      report.amountMismatch.push({ order_no: row.order_no, local: row.amount_cents, remote: remote.amount_cents });
      continue;
    }
    report.ok++;
  }

  // 2) 远端有、本地无:我们的商品且已支付 → 补建映射并入账
  for (const o of pf) {
    if (localNos.has(o.order_no)) continue;
    if (!ourProducts.has(o.product_id)) continue;
    if (o.status !== 'paid' && o.status !== 'delivered') continue;
    const u = db.findUserByEmail(String(o.email || '').trim().toLowerCase());
    if (!u) {
      report.orphans.push({ order_no: o.order_no, email: o.email, product_id: o.product_id, action: 'manual(未找到用户)' });
      continue;
    }
    const kind = o.product_id === map.pro_monthly ? 'pro' : 'balance';
    db.createPayflowOrder(o.order_no, u.id, kind, o.product_id, o.amount_cents, '');
    const r = applyPaidOrder(o.order_no);
    report.healed++;
    report.orphans.push({ order_no: o.order_no, email: o.email, action: 'auto-applied' });
  }

  // 3) 自动冲正(以 PayFlow 实收金额为准)
  report.corrections = [];
  for (const m of report.amountMismatch) {
    const diff = Number(m.remote || 0) - Number(m.local || 0);
    const row = db.getPayflowOrder(m.order_no);
    if (!row) { m.action = '需人工(订单映射缺失)'; continue; }
    if (Math.abs(diff) > AUTO_CORRECT_CAP_CENTS) { m.action = `需人工(差额 ¥${(diff / 100).toFixed(2)} 超过自动冲正上限)`; continue; }
    db.updatePayflowOrderAmount(m.order_no, m.remote);
    if (row.status === 'paid' && row.kind === 'balance') {
      db.addBalance(row.user_id, diff / 100);
      db.createOrder('adjustment', row.user_id, null, diff / 100, 0, 0, m.order_no);
      notify(row.user_id, 'sale', `订单金额已更正(${diff >= 0 ? '+' : ''}¥${(diff / 100).toFixed(2)})`, `对账以支付平台实收金额为准 · 订单 ${m.order_no}`, '#/console');
    }
    m.action = `已按实收金额更正(差额 ${diff >= 0 ? '+' : ''}¥${(diff / 100).toFixed(2)})`;
    report.corrections.push({ order_no: m.order_no, from: m.local, to: m.remote, delta: diff });
  }
  // 本地有、远端无:未支付的直接作废;已支付的转人工
  for (const x of report.missingRemote) {
    const row = db.getPayflowOrder(x.order_no);
    if (row && row.status === 'created') { db.markPayflowOrderVoid(x.order_no); x.action = '已作废本地未支付记录'; }
    else x.action = '需人工(PayFlow 缺失但本地已支付)';
  }
  report.corrected = report.corrections.length;

  db.saveReconcileReport(report);
  const summary = `检查 ${report.checked} 笔 · 补入账 ${report.healed} · 自动冲正 ${report.corrected} · 需人工 ${report.amountMismatch.filter((x) => x.action && x.action.startsWith('需人工')).length} · 孤儿 ${report.orphans.length} · 正常 ${report.ok}`;
  notifyAdmins('review', '每日对账完成', summary, '#/console');
  const needAttention = report.amountMismatch.some((x) => x.action && x.action.startsWith('需人工')) ||
    report.missingRemote.some((x) => x.action === '需人工(PayFlow 缺失但本地已支付)') ||
    report.orphans.some((x) => x.action !== 'auto-applied');
  if (needAttention) {
    const text = `WebsFlow 每日对账(需关注)\n${summary}\n\n金额不一致:${JSON.stringify(report.amountMismatch)}\n孤儿订单:${JSON.stringify(report.orphans)}\n本地缺远端:${JSON.stringify(report.missingRemote)}`;
    mailer.send('ops@nownexts.com', 'WebsFlow 每日对账告警', text);
    pushLark(`[WebsFlow 对账告警] ${summary}`);
    // 写入 OpenFlow 待办,纳入其行动主线
    openflow.createTask(
      `WebsFlow 对账异常:${summary.split('·').filter((x) => x.includes('不一致') || x.includes('孤儿') || x.includes('缺')).join(' /') || '需人工核对'}`,
      text,
      'high',
      'reconcile_' + report.at
    ).then((r) => { if (r && r.ok) console.log('[reconcile] 已写入 OpenFlow 待办'); });
  } else {
    pushLark(`[WebsFlow 对账正常] ${summary}`);
  }
  return report;
}

module.exports = { run, fetchPayflowOrders, readPayflowOrdersFile };
