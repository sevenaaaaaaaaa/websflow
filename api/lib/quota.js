/* ============================================================
 * WebsFlow · 套餐配额 (quota.js)
 * 统一在路由层做配额判定,超限返回 403/429 + 可核验升级要约
 * ============================================================ */
const db = require('../db');
const { deny } = require('./upgrade');

function checkProjectQuota(userId) {
  const plan = db.getUserPlan(userId);
  const usage = db.getUsage(userId);
  if (usage.cloudProjects >= plan.cloudProjects) {
    return Object.assign(deny(403, `云端项目已达 ${plan.cloudProjects} 个上限(当前${plan.name}),升级专业版解锁`, 'cloud_projects'), { plan, usage });
  }
  return { ok: true, plan, usage };
}

function checkPublishQuota(userId, alreadyPublished) {
  const plan = db.getUserPlan(userId);
  const usage = db.getUsage(userId);
  if (!alreadyPublished && usage.publishedPages >= plan.publishedPages) {
    return Object.assign(deny(403, `发布额度已用尽(免费版 ${plan.publishedPages} 个页面),年付 ¥390 一次付清全年投放不断档`, 'publish_limit'), { plan, usage });
  }
  return { ok: true, plan, usage };
}

function checkAiQuota(userId) {
  const plan = db.getUserPlan(userId);
  const usage = db.getUsage(userId);
  if (usage.aiToday >= plan.aiPerDay) {
    return Object.assign(deny(429, `今日 AI 生成已达上限(${plan.aiPerDay} 次,${plan.name}),升级专业版提升到 200 次`, 'ai_limit'), { plan, usage, remaining: 0 });
  }
  return { ok: true, plan, usage, remaining: plan.aiPerDay - usage.aiToday };
}

module.exports = { checkProjectQuota, checkPublishQuota, checkAiQuota };
