/* ============================================================
 * WebsFlow · 增长看板指标 (metrics.js)
 * GET  /api/metrics/launch                出页时长 + 案例墙 + 周发布
 * GET  /api/metrics/automation            自动化任务/Token 用量总览(管理员)
 * POST /api/metrics/automation/budget     单日调额(管理员,次日自动失效)
 * POST /api/metrics/automation/report-test 立即发送一封日报(管理员)
 * ============================================================ */
const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const db = require('../db');
const { authMiddleware, adminOnly } = require('../auth');
const workday = require('../lib/workday');
const budget = require('../lib/budget');
const runner = require('../lib/runner');
const dailyReport = require('../lib/daily-report');

const CASES_PATH = path.join(__dirname, '..', '..', 'deliverables', 'cases.json');
const TARGET_MINUTES = 10;

function parseTs(v) {
  if (!v) return NaN;
  const s = String(v).trim();
  const t = Date.parse(s.includes('T') ? s : s.replace(' ', 'T') + 'Z');
  return Number.isFinite(t) ? t : NaN;
}

function median(nums) {
  if (!nums.length) return null;
  const a = nums.slice().sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : +((a[mid - 1] + a[mid]) / 2).toFixed(1);
}

function loadCases() {
  try {
    const raw = JSON.parse(fs.readFileSync(CASES_PATH, 'utf8'));
    return raw.cases || [];
  } catch (e) { return []; }
}

router.get('/launch', authMiddleware, (req, res) => {
  const users = (() => { try { return db.listUsers ? db.listUsers() : []; } catch (e) { return []; } })();
  const mine = db.getUserProjects(req.user.id) || [];
  const published = mine.filter((p) => p.published);
  const me = db.findUserById(req.user.id);
  const firstPub = published.slice().sort((a, b) => parseTs(a.published_at) - parseTs(b.published_at))[0];
  const myMinutes = (me && firstPub)
    ? Math.round((parseTs(firstPub.published_at) - parseTs(me.created_at)) / 60000)
    : null;

  const weekAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
  let weeklyPublished = 0;
  let allMinutes = [];
  try { weeklyPublished = db.countPublishedSince(weekAgoIso); } catch (e) { weeklyPublished = 0; }
  try {
    (db.launchFunnel() || []).forEach((row) => {
      const start = parseTs(row.user_at);
      const end = parseTs(row.first_pub);
      if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
        allMinutes.push(Math.max(0, Math.round((end - start) / 60000)));
      }
    });
  } catch (e) { /* 忽略 */ }
  if (!allMinutes.length && Number.isFinite(myMinutes) && myMinutes >= 0) allMinutes = [myMinutes];

  const liveCases = published.slice(0, 8).map((p) => ({
    id: p.id,
    title: p.name,
    mode: p.mode,
    url: p.share_token ? ('https://nownexts.com/webflow/p/' + p.share_token) : '',
    source: 'live',
    published_at: p.published_at,
  }));

  res.json({
    target_minutes: TARGET_MINUTES,
    my_minutes: Number.isFinite(myMinutes) && myMinutes >= 0 ? myMinutes : null,
    median_minutes: median(allMinutes),
    sample: allMinutes.length,
    weekly_published: weeklyPublished || published.filter((p) => parseTs(p.published_at) >= weekAgo).length,
    published: published.length,
    users: Array.isArray(users) ? users.length : 0,
    cases: loadCases(),
    live: liveCases,
  });
});

// ---------- 自动化任务与 Token 用量(管理员) ----------
router.get('/automation', authMiddleware, adminOnly, (req, res) => {
  try {
    const since7d = workday.nHoursAgoUtcIso(7 * 24);
    const wd = workday.info();
    res.json({
      workday: wd,
      running: runner.runningSnapshot(),
      recent: runner.recent(20),
      budget: budget.overview(),
      hourly: db.aiUsageHourly(24),
      daily: db.aiUsageDaily(14),
      traffic12h: db.countEventsSince(workday.nHoursAgoUtcIso(12)),
      leads12h: db.countLeadsSince(workday.nHoursAgoUtcIso(12)),
      top_scenes: db.aiUsageTop('scene', since7d, 8),
      top_users: db.aiUsageTop('user_id', since7d, 8),
    });
  } catch (e) {
    console.error('自动化总览失败:', e);
    res.status(500).json({ error: '获取自动化总览失败' });
  }
});

// 管理员单日调额:key 带日期,次日自动失效回到默认
router.post('/automation/budget', authMiddleware, adminOnly, (req, res) => {
  try {
    const limit = Number((req.body || {}).limit_cny);
    if (!Number.isFinite(limit) || limit < 0) return res.status(400).json({ error: '请输入有效的预算金额(元)' });
    const applied = budget.setOverrideToday(limit);
    res.json({ message: `今日预算已调整为 ¥${applied},次日自动恢复默认 ¥${workday.runtimeCfg().daily_budget_cny}`, limit_cny: applied });
  } catch (e) {
    res.status(500).json({ error: '调整预算失败' });
  }
});

// 立即发送一封日报(测试/补发)
router.post('/automation/report-test', authMiddleware, adminOnly, async (req, res) => {
  try {
    const r = await dailyReport.send('instant');
    res.json({ message: r.skipped ? `已生成报告,但邮件通道未配置(站内通知已发,收件人 ${r.to.join(', ')})` : `报告已发送给 ${r.sent} 位管理员`, data: { today: r.data.today } });
  } catch (e) {
    console.error('测试报告失败:', e);
    res.status(500).json({ error: '发送报告失败:' + e.message });
  }
});

module.exports = router;
