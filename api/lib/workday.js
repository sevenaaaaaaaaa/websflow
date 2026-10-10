/* ============================================================
 * WebsFlow · 工作日/节假日与夜间窗口 (workday.js)
 * - isWorkday():周六日 + 法定节假日(holidays.json)不算工作日;调休补班的周末算工作日
 * - 后台运行限制(runtime-limits.json,可覆盖):
 *     background_workday_only  仅工作日执行非重要自动化任务(默认 true)
 *     background_start/end_hour 夜间执行窗口(北京时间,默认 0-6 点)
 *     background_deadline_hour  硬截止(默认 5.5,保证 6 点前结束)
 * ============================================================ */
const fs = require('fs');
const path = require('path');

const HOLIDAY_PATH = path.join(__dirname, '..', 'holidays.json');
const RUNTIME_PATH = path.join(__dirname, '..', 'runtime-limits.json');

function loadJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')) || fallback; } catch (e) { return fallback; }
}

function runtimeCfg() {
  const c = loadJson(RUNTIME_PATH, {});
  return Object.assign({
    daily_budget_cny: 5,          // 每日 Token 预算(元)
    user_daily_cap_cny: 2,        // 单用户每日后台任务 Token 上限(元)
    background_workday_only: true,
    background_start_hour: 0,
    background_end_hour: 6,
    background_deadline_hour: 5.5,
  }, c);
}

const pad = (n) => String(n).padStart(2, '0');

// 北京时间部件(数据库时区为 UTC,这里统一换算)
function bj(date) {
  const b = new Date((date || new Date()).getTime() + 8 * 3600 * 1000);
  return {
    y: b.getUTCFullYear(),
    m: b.getUTCMonth() + 1,
    d: b.getUTCDate(),
    hour: b.getUTCHours(),
    min: b.getUTCMinutes(),
    day: b.getUTCDay(), // 0=周日
    date: `${b.getUTCFullYear()}-${pad(b.getUTCMonth() + 1)}-${pad(b.getUTCDate())}`,
    hourFloat: b.getUTCHours() + b.getUTCMinutes() / 60,
  };
}

// 北京时区"今天 0 点"对应的 UTC 时间串(供 SQL created_at >= ? 比较)
function todayStartUtcIso(date) {
  const t = bj(date);
  const ms = Date.parse(`${t.date}T00:00:00+08:00`);
  return new Date(ms).toISOString().slice(0, 19).replace('T', ' ');
}

function nHoursAgoUtcIso(hours) {
  return new Date(Date.now() - hours * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ');
}

function isWorkday(dateStr) {
  const cfg = loadJson(HOLIDAY_PATH, {});
  const holidays = new Set(cfg.holidays || []);
  const makeup = new Set(cfg.workdays || []);
  const t = dateStr ? bj(new Date(Date.parse(`${dateStr}T12:00:00+08:00`))) : bj();
  if (makeup.has(t.date)) return true;    // 调休补班的周末
  if (holidays.has(t.date)) return false; // 法定节假日
  return t.day >= 1 && t.day <= 5;
}

// 非重要自动化任务是否允许执行(工作日 + 夜间窗口 + 未到硬截止)
function backgroundAllowed() {
  const cfg = runtimeCfg();
  if (cfg.background_workday_only && !isWorkday()) {
    return { allowed: false, reason: '非工作日(周六日/节假日不执行自动化任务)' };
  }
  const now = bj().hourFloat;
  if (now < cfg.background_start_hour || now >= cfg.background_end_hour) {
    return { allowed: false, reason: `不在夜间执行窗口(${cfg.background_start_hour}-${cfg.background_end_hour} 点)` };
  }
  if (now >= cfg.background_deadline_hour) {
    return { allowed: false, reason: `已过硬截止(${cfg.background_deadline_hour} 点,保证 6 点前结束)` };
  }
  return { allowed: true };
}

// 汇总信息(供接口/报告使用)
function info() {
  const t = bj();
  const work = isWorkday();
  return {
    date: t.date,
    weekday: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][t.day],
    is_workday: work,
    is_weekend: t.day === 0 || t.day === 6,
    bj_hour: t.hour,
    bj_time: `${pad(t.hour)}:${pad(t.min)}`,
    background: backgroundAllowed(),
    cfg: runtimeCfg(),
  };
}

module.exports = { bj, isWorkday, backgroundAllowed, info, runtimeCfg, todayStartUtcIso, nHoursAgoUtcIso };