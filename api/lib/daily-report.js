/* ============================================================
 * WebsFlow · 每日晨/暮邮件报告 (daily-report.js)
 * 每天清晨(07:30)与傍晚(18:30)北京时间,向管理员发送邮件:
 *  - 过去 12 小时:任务执行基本情况、流量、转化
 *  - 当日:任务执行次数、Token 消耗与预算余量
 *  - 近 7 天消耗大户(场景/用户)+ 建议
 * 由 scheduler 每 30 分钟调用 maybeSend(),窗口内去重发送。
 * ============================================================ */
const db = require('../db');
const workday = require('./workday');
const budget = require('./budget');
const runner = require('./runner');
const mailer = require('./mailer');
const { notifyAdmins } = require('./notify');

const SLOTS = { morning: { at: 7 * 60 + 30, label: '清晨报告' }, evening: { at: 18 * 60 + 30, label: '傍晚报告' } };
const WINDOW_MIN = 45; // 调度粒度 30 分钟,给 45 分钟落点窗口

const escHtml = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function collect() {
  const h12 = workday.nHoursAgoUtcIso(12);
  const todayStart = workday.todayStartUtcIso();
  const since7d = workday.nHoursAgoUtcIso(7 * 24);

  // 任务执行
  const runs12 = db.taskRunsSince(h12);
  const runsToday = db.taskRunsSince(todayStart);
  const countBy = (rows) => {
    const c = { succeeded: 0, failed: 0, timeout: 0, skipped: 0, running: 0 };
    rows.forEach((r) => { c[r.status] = (c[r.status] || 0) + 1; });
    return c;
  };
  const running = runner.runningSnapshot();
  const recentFails = runs12.filter((r) => r.status === 'failed' || r.status === 'timeout').slice(0, 5);

  // 流量与转化(过去 12h / 今日)
  const traffic12 = db.countEventsSince(h12);
  const trafficToday = db.countEventsSince(todayStart);
  const leads12 = db.countLeadsSince(h12);
  const leadsToday = db.countLeadsSince(todayStart);

  // Token
  const usage12 = db.aiUsageSummary(h12);
  const today = budget.overview();
  const hourly = db.aiUsageHourly(24);
  const daily = db.aiUsageDaily(7);

  // 消耗大户(近 7 天)
  const topScenes = db.aiUsageTop('scene', since7d, 5);
  const topUsers = db.aiUsageTop('user_id', since7d, 5);

  return {
    at: workday.bj().date + ' ' + workday.info().bj_time,
    runs12: countBy(runs12), runs12Total: runs12.length,
    runsToday: countBy(runsToday), runsTodayTotal: runsToday.length,
    running, recentFails,
    traffic12, trafficToday, leads12, leadsToday,
    usage12: { calls: usage12.n, tokens: usage12.pt + usage12.ct, cost: usage12.cost },
    today, hourly, daily, topScenes, topUsers,
  };
}

function renderText(d) {
  const L = [];
  const wd = workday.info();
  L.push(`【WebsFlow 自动化日报】${d.at}(北京时间)· ${wd.is_workday ? '工作日' : '休息日(' + wd.weekday + ')'}`);
  L.push('');
  L.push(`■ 过去 12 小时任务执行(共 ${d.runs12Total} 次):成功 ${d.runs12.succeeded} · 失败 ${d.runs12.failed} · 超时 ${d.runs12.timeout} · 跳过 ${d.runs12.skipped} · 进行中 ${d.runs12.running}`);
  L.push(`■ 过去 12 小时流量:曝光 ${d.traffic12.views} · 点击 ${d.traffic12.clicks} · CVR ${d.traffic12.cvr}% · 线索 ${d.leads12}`);
  L.push(`■ 过去 12 小时 Token:调用 ${d.usage12.calls} 次 · ${(d.usage12.tokens || 0).toLocaleString()} tokens · ¥${(+d.usage12.cost).toFixed(2)}`);
  L.push('');
  L.push(`■ 今日任务执行(共 ${d.runsTodayTotal} 次):成功 ${d.runsToday.succeeded} · 失败 ${d.runsToday.failed} · 超时 ${d.runsToday.timeout}`);
  L.push(`■ 今日流量:曝光 ${d.trafficToday.views} · 点击 ${d.trafficToday.clicks} · CVR ${d.trafficToday.cvr}% · 线索 ${d.leadsToday}`);
  L.push(`■ 今日 Token:¥${d.today.spent_cny.toFixed(2)} / 预算 ¥${d.today.limit_cny}(${d.today.override_applied ? '管理员已单日调额' : '默认预算'}) · 余 ¥${d.today.remaining_cny.toFixed(2)} · 调用 ${d.today.calls} 次`);
  L.push(`■ 当前状态:${wd.background.allowed ? '后台任务执行窗口内' : '后台任务暂停(' + wd.background.reason + ')'} · 正在跑 ${d.running.length} 个任务`);
  if (d.recentFails.length) {
    L.push('');
    L.push('■ 近 12 小时失败/超时任务:');
    d.recentFails.forEach((r) => L.push(`  - [${r.kind}] ${r.name}(${r.status}):${String(r.note || '').slice(0, 80)}`));
  }
  if (d.topScenes.length || d.topUsers.length) {
    L.push('');
    L.push('■ 近 7 天消耗大户(优化建议:夜间窗口已熔断后台任务;若某场景持续超标,可在 cost-rates.json 调价或下调 max_tokens):');
    d.topScenes.forEach((s) => L.push(`  - 场景 ${s.label}:${s.n} 次 · ¥${(+s.cost).toFixed(2)}`));
    d.topUsers.forEach((u) => L.push(`  - 用户 ${u.label}:${u.n} 次 · ¥${(+u.cost).toFixed(2)}`));
  }
  L.push('');
  L.push('后台入口:https://nownexts.com/webflow/#/console(首页「自动化与Token」)');
  return L.join('\n');
}

function renderHtml(d) {
  const bar = (v, max, color) => `<div style="height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden"><div style="height:100%;width:${max ? Math.min(100, Math.round(v / max * 100)) : 0}%;background:${color || '#4f46e5'}"></div></div>`;
  const maxHour = Math.max(0.0001, ...d.hourly.map((h) => +h.cost || 0));
  const rows = (arr, fn) => arr.map(fn).join('');
  return `<div style="font-family:-apple-system,'PingFang SC',sans-serif;max-width:640px;margin:0 auto;color:#0f172a">
  <h2 style="font-size:16px">🤖 WebsFlow 自动化日报 <span style="color:#64748b;font-size:12px">${escHtml(d.at)}(北京时间)</span></h2>
  <table style="width:100%;border-collapse:collapse;font-size:13px">
    <tr><td style="padding:6px 0;color:#64748b;width:120px">过去 12h 任务</td><td>共 ${d.runs12Total} 次:✅ ${d.runs12.succeeded} · ❌ ${d.runs12.failed} · ⏱ ${d.runs12.timeout} · ⏭ ${d.runs12.skipped} · ▶ ${d.runs12.running}</td></tr>
    <tr><td style="padding:6px 0;color:#64748b">过去 12h 流量</td><td>曝光 <b>${d.traffic12.views}</b> · 点击 <b>${d.traffic12.clicks}</b> · CVR <b>${d.traffic12.cvr}%</b> · 线索 <b>${d.leads12}</b></td></tr>
    <tr><td style="padding:6px 0;color:#64748b">过去 12h Token</td><td>调用 ${d.usage12.calls} 次 · ¥${(+d.usage12.cost).toFixed(2)}</td></tr>
    <tr><td style="padding:6px 0;color:#64748b">今日任务</td><td>共 ${d.runsTodayTotal} 次:✅ ${d.runsToday.succeeded} · ❌ ${d.runsToday.failed} · ⏱ ${d.runsToday.timeout}</td></tr>
    <tr><td style="padding:6px 0;color:#64748b">今日流量/转化</td><td>曝光 <b>${d.trafficToday.views}</b> · 点击 <b>${d.trafficToday.clicks}</b> · CVR <b>${d.trafficToday.cvr}%</b> · 线索 <b>${d.leadsToday}</b></td></tr>
    <tr><td style="padding:6px 0;color:#64748b">今日 Token</td><td>¥<b>${d.today.spent_cny.toFixed(2)}</b> / ¥${d.today.limit_cny} ${d.today.override_applied ? '(已单日调额)' : ''} · 余 ¥${d.today.remaining_cny.toFixed(2)}${bar(d.today.spent_cny, d.today.limit_cny, d.today.pct >= 100 ? '#dc2626' : '#4f46e5')}</td></tr>
    <tr><td style="padding:6px 0;color:#64748b">执行窗口</td><td>${workday.info().background.allowed ? '🟢 后台任务窗口内' : '🔴 后台任务暂停(' + escHtml(workday.info().background.reason) + ')'}</td></tr>
  </table>
  ${d.hourly.length ? `<h3 style="font-size:13px;margin:14px 0 6px">近 24 小时每小时消耗(元)</h3>
  <table style="width:100%;border-collapse:collapse;font-size:12px">
    ${rows(d.hourly.slice(-12), (h) => `<tr><td style="color:#64748b;padding:3px 0">${escHtml(h.bucket)}</td><td>${bar(+h.cost, maxHour)}</td><td style="text-align:right;width:70px">¥${(+h.cost).toFixed(3)}</td></tr>`)}
  </table>` : ''}
  ${(d.topScenes.length || d.topUsers.length) ? `<h3 style="font-size:13px;margin:14px 0 6px">近 7 天消耗大户</h3>
  <table style="width:100%;border-collapse:collapse;font-size:12px">
    ${rows(d.topScenes, (s) => `<tr><td style="padding:3px 0">场景 ${escHtml(s.label)}</td><td style="text-align:right">${s.n} 次 · ¥${(+s.cost).toFixed(2)}</td></tr>`)}
    ${rows(d.topUsers, (u) => `<tr><td style="padding:3px 0">用户 ${escHtml(u.label)}</td><td style="text-align:right">${u.n} 次 · ¥${(+u.cost).toFixed(2)}</td></tr>`)}
  </table>` : ''}
  <p style="color:#94a3b8;font-size:11px;margin-top:14px">清晨/傍晚各一封 · 预算、工作日窗口可在 api/runtime-limits.json 调整 · 后台首页可单日调额</p>
</div>`;
}

async function send(slot) {
  const d = collect();
  const label = (SLOTS[slot] || { label: '即时报告' }).label;
  const text = renderText(d);
  const html = renderHtml(d);
  const to = budget.adminEmails();
  const results = [];
  for (const addr of to) {
    try { results.push(await mailer.send(addr, `[WebsFlow] ${label} · ${d.at}`, text, html)); } catch (e) { results.push({ ok: false, error: e.message }); }
  }
  // 站内也给管理员一份,邮件通道未配置时至少后台可见
  notifyAdmins('review', `📨 ${label}`, text.split('\n').slice(1, 9).join('\n'), '#/console');
  return { sent: results.filter((r) => r.ok).length, skipped: results.filter((r) => r.skipped).length, to, data: d };
}

// scheduler 每 30 分钟调用:落在晨/暮窗口内且今天未发过则发送
async function maybeSend() {
  const t = workday.bj();
  const nowMin = t.hour * 60 + t.min;
  for (const [slot, cfg] of Object.entries(SLOTS)) {
    if (nowMin < cfg.at || nowMin > cfg.at + WINDOW_MIN) continue;
    const key = `report:${slot}:${t.date}`;
    if (db.opsGet(key)) continue;
    db.opsSet(key, new Date().toISOString());
    try {
      const r = await send(slot);
      console.log(`[daily-report] ${cfg.label}已发送:${r.sent} 成功 / ${r.skipped} 跳过(未配置SMTP)`);
    } catch (e) {
      console.error('[daily-report] 发送失败:', e.message);
    }
    break; // 同一 tick 只发一个时段
  }
}

module.exports = { collect, send, maybeSend, renderText };