/* ============================================================
 * WebsFlow · 增长看板指标 (metrics.js)
 * GET /api/metrics/launch  出页时长 + 案例墙 + 周发布
 * ============================================================ */
const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const db = require('../db');
const { authMiddleware } = require('../auth');

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

module.exports = router;
