/* ============================================================
 * WebsFlow · 阈值告警与自动动作 (alerts.js)
 * 指标(views/clicks/cvr) × 窗口 → 触发动作(通知/下线/OpenFlow 待办)
 * 冷却期内不重复触发;支持立即评估
 * ============================================================ */
const db = require('../db');
const { notify, pushLark } = require('./notify');
const openflow = require('./openflow');

function metricOf(stats, rule) {
  const w = stats.windows || {};
  const win = rule.window_minutes <= 5 ? (w.m5 || w.m1 || {}) : (rule.window_minutes <= 15 ? (w.m15 || w.m5 || {}) : (w.m15 || {}));
  if (rule.metric === 'views') return win.views || 0;
  if (rule.metric === 'clicks') return win.clicks || 0;
  return win.cvr || 0;   // cvr:百分比
}

function breached(value, rule) {
  return rule.operator === '<' ? value < rule.threshold : value > rule.threshold;
}

function cooldownOk(rule) {
  if (!rule.last_fired_at) return true;
  const last = new Date(String(rule.last_fired_at).replace(' ', 'T') + 'Z').getTime();
  return Date.now() - last >= (Number(rule.cooldown_minutes) || 60) * 60000;
}

// 评估单条规则 → { fired, value, detail }
function evaluate(rule) {
  const stats = db.getRealtimeMetrics(rule.project_id, Math.max(rule.window_minutes, 30));
  const value = metricOf(stats, rule);
  const hit = breached(value, rule);
  if (!hit || !cooldownOk(rule)) return { fired: false, value, hit };
  fire(rule, value, stats);
  db.markAlertFired(rule.id, value);
  return { fired: true, value };
}

function fire(rule, value, stats) {
  const label = { views: '曝光', clicks: '点击', cvr: 'CVR' }[rule.metric] || rule.metric;
  const title = `⚠️ 告警触发:${rule.name || label}`;
  const body = `${label} 在近 ${rule.window_minutes} 分钟为 ${value}${rule.metric === 'cvr' ? '%' : ''}(阈值 ${rule.operator} ${rule.threshold})`;
  notify(rule.user_id, 'review', title, body, '#/console');
  pushLark(`[WebsFlow 告警] ${title} — ${body}`);

  if (rule.action === 'unpublish' && rule.project_id) {
    try {
      db.setPublished(rule.project_id, rule.user_id, false);
      notify(rule.user_id, 'review', '已自动下线页面(告警动作)', `项目 ${rule.project_id} 已取消发布,请检查投放`, '#/console');
    } catch (e) { /* 忽略 */ }
  }
  if (rule.action === 'task') {
    openflow.createTask(`WebsFlow 告警:${rule.name || label}`, `${body}\n\n建议:检查落地页素材/受众/竞价,必要时切换变体`, 'high', 'alert_' + rule.id)
      .then((r) => { if (r && r.ok) console.log('[alerts] 已写入 OpenFlow 待办'); });
  }
}

// 调度:评估全部启用规则
function tick() {
  let fired = 0;
  try {
    db.getAllEnabledAlertRules().forEach((rule) => {
      try { if (evaluate(rule).fired) fired++; } catch (e) { console.error('告警评估失败:', e.message); }
    });
  } catch (e) { console.error('告警调度失败:', e.message); }
  return fired;
}

module.exports = { tick, evaluate };
