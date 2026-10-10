/* ============================================================
 * WebsFlow · 每日预算闸门 (budget.js)
 * - 每日 Token 预算默认 ¥5(runtime-limits.json 可改)
 * - 超过预算:后台(非重要)任务直接熔断跳过;用户主动操作放行但当天提醒管理员
 * - 管理员可单日调高预算(ops_config 按日期存 key),次日自动失效回到默认
 * - 单用户每日后台消耗上限,防止个别账号吃掉全部预算
 * ============================================================ */
const db = require('../db');
const workday = require('./workday');
const mailer = require('./mailer');
const { notifyAdmins } = require('./notify');

// 这些场景属于"自动化后台任务",预算耗尽时直接跳过
const BACKGROUND_SCENES = new Set(['inspect', 'growth', 'orchestrator', 'selfcheck', 'patch-auto', 'goal']);

function overrideKey(date) { return `budget:override:${date || workday.bj().date}`; }
function alertedKey(date) { return `budget:alerted:${date || workday.bj().date}`; }

// 当日有效预算:单日覆盖 > 默认
function limitCny(date) {
  const o = db.opsGet(overrideKey(date));
  if (o != null && Number(o) > 0) return Number(o);
  return Number(workday.runtimeCfg().daily_budget_cny) || 5;
}

// 管理员单日调额(写入今天,key 带日期,次日自然失效)
function setOverrideToday(limitCny) {
  const n = Math.max(0, Number(limitCny) || 0);
  db.opsSet(overrideKey(), String(n));
  db.opsPruneStale('budget:override:'); // 清掉历史日期的覆盖值
  return n;
}

function spentSince(sinceIso, userId) {
  const s = db.aiUsageSummary(sinceIso, userId);
  return { calls: s.n, tokens: s.pt + s.ct, cost: Math.round(s.cost * 1000) / 1000 };
}

function spentToday(userId) { return spentSince(workday.todayStartUtcIso(), userId); }

function isBackground(scene) { return BACKGROUND_SCENES.has(String(scene || '')); }

// 调用前检查。返回 { allowed, reason, spent, limit }
function check(o) {
  const scene = o.scene || 'chat';
  const est = Math.max(0, Number(o.estCny) || 0);
  const userId = o.userId || null;
  const today = spentToday();
  const limit = limitCny();
  const base = { spent: today, limit };

  // 已超预算:先补一次提醒(每天最多一次),后台场景熔断
  if (today.cost + est > limit || today.cost >= limit) {
    alertOnce(today, limit, est);
    if (isBackground(scene)) {
      return Object.assign({ allowed: false, reason: `今日 Token 预算已用尽(¥${today.cost.toFixed(2)}/¥${limit})` }, base);
    }
  }

  // 单用户后台消耗上限
  const cap = Number(workday.runtimeCfg().user_daily_cap_cny) || 0;
  if (userId && isBackground(scene) && cap > 0) {
    const mine = spentToday(userId);
    if (mine.cost + est > cap) {
      return Object.assign({ allowed: false, reason: `该用户今日后台消耗已达上限(¥${mine.cost.toFixed(2)}/¥${cap})` }, base);
    }
  }
  return Object.assign({ allowed: true }, base);
}

// 超预算邮件 + 站内提醒(每天一次)
function alertOnce(today, limit, est) {
  const key = alertedKey();
  if (db.opsGet(key)) return;
  db.opsSet(key, new Date().toISOString());
  const txt = `今日 Token 消耗 ¥${today.cost.toFixed(2)} 已达预算 ¥${limit}(本次调用预估 ¥${(+est).toFixed(3)})。` +
    `后台自动化任务将熔断跳过;可在后台「自动化与Token」单日调高预算,次日自动恢复默认。`;
  notifyAdmins('review', '💸 Token 日预算已用尽', txt, '#/console');
  adminEmails().forEach((to) => {
    mailer.send(to, `[WebsFlow] Token 日预算告警 ¥${today.cost.toFixed(2)}/¥${limit}`, txt).catch(() => {});
  });
}

// 收件人优先级:WebsFlow is_admin 用户邮箱 > OpenFlow 站点 admin_email > 运维邮箱
function adminEmails() {
  try {
    const list = (db.adminIds() || [])
      .map((id) => db.findUserById(id))
      .filter(Boolean)
      .map((u) => u.email)
      .filter(Boolean);
    // OpenFlow 同生态兜底:/www/wwwroot/nownexts_com/data/settings.json 的 admin_email
    try {
      const fs = require('fs');
      const OF_SETTINGS = '/www/wwwroot/nownexts_com/data/settings.json';
      if (fs.existsSync(OF_SETTINGS)) {
        const em = (JSON.parse(fs.readFileSync(OF_SETTINGS, 'utf8')) || {}).admin_email;
        if (em && !list.includes(em)) list.push(String(em).trim());
      }
    } catch (e) {}
    return list.length ? list : ['ops@nownexts.com'];
  } catch (e) { return ['ops@nownexts.com']; }
}

// 管理员可用预算概览(供报告/接口)
function overview() {
  const today = spentToday();
  const limit = limitCny();
  return {
    spent_cny: Math.round(today.cost * 100) / 100,
    calls: today.calls,
    tokens: today.tokens,
    limit_cny: limit,
    remaining_cny: Math.max(0, Math.round((limit - today.cost) * 100) / 100),
    pct: limit ? Math.min(100, Math.round(today.cost / limit * 100)) : 0,
    override_applied: db.opsGet(overrideKey()) != null,
    is_workday: workday.isWorkday(),
    background: workday.backgroundAllowed(),
  };
}

module.exports = { check, limitCny, setOverrideToday, spentToday, spentSince, overview, adminEmails, isBackground, BACKGROUND_SCENES };