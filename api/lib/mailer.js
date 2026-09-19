/* ============================================================
 * WebsFlow · 邮件通道 (mailer.js)
 * 复用 PayFlow Mailer(PHP SMTP 客户端,同一服务器)发送事务邮件
 * 未配置 SMTP 时优雅降级:跳过邮件,保留站内通知/飞书
 * ============================================================ */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PAYFLOW_DATA = '/www/wwwroot/payflow/data/config.json';
const LOCAL_CFG = path.join(__dirname, '..', 'mail-config.json');
const SCRIPT = path.join(__dirname, '..', 'bin', 'payflow-mail.php');

function config() {
  // 优先 WebsFlow 自己的配置,其次复用 PayFlow 的 mail 段
  try {
    if (fs.existsSync(LOCAL_CFG)) {
      const c = JSON.parse(fs.readFileSync(LOCAL_CFG, 'utf8'));
      if (c && c.host) return Object.assign({ source: 'websflow' }, c);
    }
  } catch (e) {}
  try {
    if (fs.existsSync(PAYFLOW_DATA)) {
      const c = JSON.parse(fs.readFileSync(PAYFLOW_DATA, 'utf8'));
      const m = (c && c.mail) || {};
      if (m.host) return Object.assign({ source: 'payflow' }, m);
    }
  } catch (e) {}
  return { enabled: false, source: 'none' };
}

function status() {
  const c = config();
  const ok = !!c.enabled && !!c.host && !!c.username;
  return { configured: ok, source: c.source, host: c.host || '', from: c.from_email || '', enabled: !!c.enabled };
}

function send(to, subject, text, html) {
  const st = status();
  if (!st.configured) return Promise.resolve({ skipped: true, reason: '邮件通道未配置(缺少 SMTP 凭据)' });
  return new Promise((resolve) => {
    let out = '';
    const child = spawn('/usr/bin/php', [SCRIPT], { stdio: ['pipe', 'pipe', 'pipe'] });
    child.stdout.on('data', (d) => { out += d.toString(); });
    child.stderr.on('data', () => {});
    child.on('error', (e) => resolve({ ok: false, error: e.message }));
    child.on('close', () => {
      const s = out.trim();
      resolve({ ok: s === 'OK', detail: s.slice(0, 200) });
    });
    child.stdin.write(JSON.stringify({ to, subject, text: text || '', html: html || '' }));
    child.stdin.end();
  });
}

module.exports = { send, status, config };
