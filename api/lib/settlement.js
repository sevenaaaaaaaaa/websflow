/* ============================================================
 * WebsFlow · 返佣月度结算单 (settlement.js)
 * 每月为有佣金收入的邀请人生成结算单 → 站内通知 + 飞书推送
 * ============================================================ */
const db = require('../db');
const { notify, pushLark } = require('./notify');
const mailer = require('./mailer');
const { tierOf } = require('./referral');
const commerce = require('./commerce');

function lastMonthPeriod() {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCDate(0);                      // 上月最后一天
  d.setUTCDate(1);                      // 上月 1 号
  return d.toISOString().slice(0, 7);   // YYYY-MM
}

function renderStatement(user, period, data) {
  return [
    `WebsFlow 返佣结算单 · ${period}`,
    `账号:${user.username || ''}(${user.email || ''})`,
    `邀请等级:${data.tierName}(${Math.round(data.tierPro * 100)}% / ${Math.round(data.tierOther * 100)}%)`,
    `累计邀请:${data.invited} 人`,
    `本月成交:${data.orders} 笔,佣金合计 ¥${Number(data.commission).toFixed(2)}`,
    `站内额度:¥${Number(data.balance).toFixed(2)}(用于购买模板/插件)`,
    ...(data.payflow ? [`PayFlow 佣金:${JSON.stringify(data.payflow)}`] : []),
    `生成时间:${new Date().toISOString().slice(0, 19).replace('T', ' ')} UTC`,
    '',
    '佣金每月 1 日结算入账,可在后台「邀请返佣」申请提现(最低 ¥10)。',
  ].join('\n');
}

// 生成某月结算单(幂等:已生成则跳过)
async function generateSettlements(period) {
  const p = period || lastMonthPeriod();
  if (db.hasSettlement(p)) return { period: p, created: 0, skipped: true };
  const rows = db.getMonthlyCommission(p);
  let created = 0;
  for (const r of rows) {
    const user = db.findUserById(r.user_id);
    if (!user) continue;
    const invited = db.getReferredCountByUser(r.user_id);
    const { tier } = tierOf(invited);
    let payflowSummary = null;
    if (commerce.isDelegated()) {
      try {
        const dash = await commerce.dashboard(user);
        payflowSummary = dash && dash.summary ? dash.summary : null;
      } catch (e) {}
    }
    const data = {
      orders: r.orders, commission: r.commission, invited, payflow: payflowSummary,
      tierName: tier.name.zh, tierPro: tier.pro, tierOther: tier.other,
      balance: user.balance || 0,
    };
    db.createSettlement(r.user_id, p, data);
    const statement = renderStatement(user, p, data);
    notify(r.user_id, 'sale', `${p} 返佣结算单已生成`, `本月佣金 ¥${Number(r.commission).toFixed(2)},共 ${r.orders} 笔;可在后台查看与提现`, '#/console');
    pushLark(`[WebsFlow 结算单] ${user.username} ${p} 佣金 ¥${Number(r.commission).toFixed(2)} (${r.orders} 笔)`);
    // 邮件通道(配置可用则发,否则静默降级)
    mailer.send(user.email, `WebsFlow 返佣结算单 · ${p}`, statement).then((res) => {
      if (res && res.ok) console.log(`[settlement] 结算单邮件已发送 → ${user.email}`);
      else if (res && res.skipped) console.log('[settlement] 邮件通道未配置,跳过:', res.reason);
      else console.warn('[settlement] 邮件发送失败:', res && (res.detail || res.error));
    }).catch(() => {});
    created++;
  }
  return { period: p, created, skipped: false };
}

module.exports = { generateSettlements, lastMonthPeriod, renderStatement };
