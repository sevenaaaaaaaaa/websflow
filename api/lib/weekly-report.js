/* ============================================================
 * WebsFlow · 渠道周报 (weekly-report.js)
 * 上周 vs 上上周 环比 + Top 渠道 + 自动飞书推送
 * ============================================================ */
const db = require('../db');
const { pushLark, notifyAdmins } = require('./notify');
const mailer = require('./mailer');
const commerce = require('./commerce');
const payflow = require('./payflow');

function pct(cur, prev) {
  if (!prev) return cur ? 100 : 0;
  return Math.round((cur - prev) / prev * 1000) / 10;
}

// 委派模式:附 PayFlow 经营口径(其 analytics summary 为权威)
async function payflowSection() {
  if (!commerce.isDelegated()) return null;
  try {
    const r = await payflow.request('GET', '/api/v1/analytics/summary', null, 'days=7');
    return (r && r.summary) || null;
  } catch (e) { return null; }
}

function build(weekStart) {
  const thisWeek = db.getWeekStats(weekStart);
  const prevStart = db.weekKey(-1);                       // 相对当前周的上周
  // 传入 weekStart 时,上周应为其前一周
  const prevAnchor = (() => {
    const d = new Date(weekStart + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() - 7);
    return d.toISOString().slice(0, 10);
  })();
  const prevWeek = db.getWeekStats(prevAnchor);
  const channels = db.getWeekChannels(weekStart, 10).slice(0, 5);
  const prevChannels = new Map(db.getWeekChannels(prevAnchor, 20).map((c) => [c.id, c.revenue]));
  const topChannels = channels.map((c) => ({
    username: c.username, revenue: c.revenue,
    wow: pct(c.revenue, prevChannels.get(c.id) || 0),
  }));
  return {
    period: thisWeek.week,
    thisWeek, prevWeek, topChannels,
    wow: {
      revenue: pct(thisWeek.revenue, prevWeek.revenue),
      paidUsers: pct(thisWeek.paidUsers, prevWeek.paidUsers),
      signups: pct(thisWeek.signups, prevWeek.signups),
      commission: pct(thisWeek.commission, prevWeek.commission),
    },
  };
}

function render(report) {
  const w = report.thisWeek, p = report.prevWeek, d = report.wow;
  const sign = (x) => (x >= 0 ? '+' : '') + x + '%';
  const pf = report.payflow || null;
  const pfLines = pf ? ['', 'PayFlow 口径(其权威数据):', ...Object.entries(pf).slice(0, 6).map(([k, v]) => `  ${k}: ${v}`)] : [];
  return [
    `WebsFlow 渠道周报 · ${report.period} 起`,
    `收入 ¥${w.revenue.toFixed(2)}(环比 ${sign(d.revenue)};上周 ¥${p.revenue.toFixed(2)})`,
    `付费用户 ${w.paidUsers}(环比 ${sign(d.paidUsers)})`,
    `新增注册 ${w.signups}(环比 ${sign(d.signups)})`,
    `佣金支出 ¥${w.commission.toFixed(2)}(环比 ${sign(d.commission)})`,
    '',
    'Top 渠道:',
    ...(report.topChannels.length
      ? report.topChannels.map((c, i) => `  ${i + 1}. ${c.username} ¥${c.revenue.toFixed(2)} (环比 ${sign(c.wow)})`)
      : ['  (上周无渠道收入)']),
    ...pfLines,
  ].join('\n');
}

// 生成上周周报(幂等)+ 飞书推送 + 邮件(配置可用)
async function generate(period) {
  const anchor = period || db.weekKey(-1);   // 默认上一周(周一日期)
  if (db.hasWeeklyReport(anchor)) return { period: anchor, skipped: true };
  const report = build(anchor);
  report.payflow = await payflowSection();   // 委派模式:附 PayFlow 权威口径
  const text = render(report);
  db.saveWeeklyReport(anchor, report);
  pushLark('[WebsFlow 周报]\n' + text);
  notifyAdmins('review', `渠道周报已生成(${anchor} 起)`, `收入 ¥${report.thisWeek.revenue.toFixed(2)} · 环比 ${report.wow.revenue}%`, '#/console');
  mailer.send('ops@nownexts.com', `WebsFlow 渠道周报 · ${anchor}`, text);
  return { period: anchor, skipped: false, report, text };
}

module.exports = { build, render, generate };
