/* ============================================================
 * WebsFlow · 邀请返佣 (referral.js)
 * 规则:被邀请人付费 → 邀请人获得佣金(入余额,可提现/消费)
 *   - Pro 订阅 / 余额充值:10%
 *   - 模板 / 插件购买:5%
 * ============================================================ */
const db = require('../db');
const { notify } = require('./notify');
const commerce = require('./commerce');

// 阶梯返佣:按「已邀请人数」升级
const TIERS = [
  { key: 't1', min: 0, pro: 0.10, other: 0.05, name: { zh: '铜牌', en: 'Bronze' } },
  { key: 't2', min: 5, pro: 0.12, other: 0.06, name: { zh: '银牌', en: 'Silver' } },
  { key: 't3', min: 20, pro: 0.15, other: 0.08, name: { zh: '金牌', en: 'Gold' } },
];

function tierOf(invitedCount) {
  let cur = TIERS[0];
  for (const t of TIERS) if (invitedCount >= t.min) cur = t;
  const next = TIERS.find((t) => t.min > invitedCount) || null;
  return { tier: cur, next, need: next ? next.min - invitedCount : 0 };
}

// buyerId 产生一笔支出时,给其邀请人记佣金(按邀请人等级计算比例)
function creditReferral(buyerId, amountCents, sourceKind, sourceRef) {
  // 委派模式:佣金由 PayFlow 按 referral 自动计提,本地不再记账
  if (commerce.isDelegated()) return { delegated: true };
  try {
    const buyer = db.findUserById(buyerId);
    if (!buyer || !buyer.referred_by) return null;
    const referrerId = buyer.referred_by;
    if (referrerId === buyerId) return null;
    // 等级:按邀请人当前已邀请人数
    const invited = db.getReferredUsers(referrerId).length;
    const { tier, next } = tierOf(invited);
    const rate = (sourceKind === 'pro' || sourceKind === 'balance') ? tier.pro : tier.other;
    if (rate <= 0) return null;
    const commission = Math.round(amountCents * rate) / 100; // 元
    if (commission <= 0) return null;
    db.addBalance(referrerId, commission);
    db.createOrder('commission', buyerId, referrerId, amountCents / 100, commission, 0, sourceRef || null);
    notify(referrerId, 'sale', `邀请佣金 +¥${commission.toFixed(2)}`, `${buyer.username || ''} 的${sourceKind === 'pro' ? '订阅' : sourceKind === 'balance' ? '充值' : sourceKind === 'template' ? '模板购买' : '插件购买'}产生佣金(${tier.name.zh} ${(rate * 100).toFixed(0)}%)`, '#/console');
    // 等级升级提醒
    if (next && invited >= next.min) {
      notify(referrerId, 'sale', `邀请等级提升:${next.name.zh}`, `返佣比例提升至 ${(next.pro * 100).toFixed(0)}%(订阅/充值)`, '#/console');
    }
    return { referrerId, commission, rate };
  } catch (e) {
    console.error('佣金入账失败:', e.message);
    return null;
  }
}

module.exports = { creditReferral, TIERS, tierOf };
