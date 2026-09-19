/* ============================================================
 * WebsFlow · 通知分发 (notify.js)
 * 站内通知入库 + 可选飞书 webhook 推送(WEBSFLOW_LARK_WEBHOOK)
 * ============================================================ */
const https = require('https');
const fs = require('fs');
const path = require('path');
const db = require('../db');

const CFG_PATH = path.join(__dirname, '..', 'notify-config.json');

function cfg() {
  try {
    if (fs.existsSync(CFG_PATH)) return JSON.parse(fs.readFileSync(CFG_PATH, 'utf8')) || {};
  } catch (e) {}
  return {};
}

function setConfig(patch) {
  const next = Object.assign(cfg(), patch || {});
  try { fs.writeFileSync(CFG_PATH, JSON.stringify(next, null, 2)); } catch (e) {}
  return next;
}

function larkUrl() {
  return process.env.WEBSFLOW_LARK_WEBHOOK || cfg().lark_webhook || '';
}

function pushLark(text) {
  const url = larkUrl();
  if (!url) return;
  try {
    const u = new URL(url);
    const data = JSON.stringify({ msg_type: 'text', content: { text } });
    const req = https.request({
      hostname: u.hostname, port: u.port || 443, path: u.pathname + u.search, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    }, (res) => res.resume());
    req.on('error', () => {});
    req.setTimeout(8000, () => req.destroy());
    req.write(data);
    req.end();
  } catch (e) { /* 忽略推送失败,不影响主流程 */ }
}

function notify(userId, kind, title, body, link) {
  try {
    db.createNotification(userId, kind, title, body, link);
    if (kind === 'review' || kind === 'sale') pushLark(`[WebsFlow] ${title}\n${body || ''}`);
  } catch (e) {
    console.error('通知写入失败:', e.message);
  }
}

function notifyAdmins(kind, title, body, link) {
  try {
    db.adminIds().forEach((id) => notify(id, kind, title, body, link));
  } catch (e) { /* 忽略 */ }
}

module.exports = { notify, notifyAdmins, pushLark, cfg, setConfig, larkUrl };
