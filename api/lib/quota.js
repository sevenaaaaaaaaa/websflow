/* ============================================================
 * WebsFlow · 套餐配额 (quota.js)
 * 统一在路由层做配额判定,超限返回 403/429
 * ============================================================ */
const db = require('../db');

function checkProjectQuota(userId) {
  const plan = db.getUserPlan(userId);
  const usage = db.getUsage(userId);
  if (usage.cloudProjects >= plan.cloudProjects) {
    return { ok: false, code: 403, error: `云端项目已达 ${plan.cloudProjects} 个上限(当前${plan.name}),升级专业版解锁` };
  }
  return { ok: true, plan, usage };
}

function checkPublishQuota(userId, alreadyPublished) {
  const plan = db.getUserPlan(userId);
  const usage = db.getUsage(userId);
  if (!alreadyPublished && usage.publishedPages >= plan.publishedPages) {
    return { ok: false, code: 403, error: `发布额度已用尽(免费版 ${plan.publishedPages} 个页面),升级专业版解锁` };
  }
  return { ok: true, plan, usage };
}

function checkAiQuota(userId) {
  const plan = db.getUserPlan(userId);
  const usage = db.getUsage(userId);
  if (usage.aiToday >= plan.aiPerDay) {
    return { ok: false, code: 429, error: `今日 AI 生成已达上限(${plan.aiPerDay} 次,${plan.name}),升级专业版提升到 200 次` };
  }
  return { ok: true, plan, usage, remaining: plan.aiPerDay - usage.aiToday };
}

module.exports = { checkProjectQuota, checkPublishQuota, checkAiQuota };
