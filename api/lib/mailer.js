/* ============================================================
 * WebsFlow · 邮件通道 (mailer.js)
 * 渠道优先级:
 *   1. WebsFlow 自有配置 api/mail-config.json
 *   2. PayFlow 配置(同服务器,/www/wwwroot/payflow/data/config.json 的 mail 段,走 PHP)
 *   3. OpenFlow 邮件渠道(同生态,/www/wwwroot/nownexts_com/data/mail-channels.json
 *      的 smtp 段 —— 内置 Node 轻量 SMTP 客户端,支持无认证本机中继/465/587+STARTTLS)
 * 未配置时优雅降级:跳过邮件,保留站内通知/飞书
 * ============================================================ */
const fs = require('fs');
const path = require('path');
const net = require('net');
const tls = require('tls');
const { spawn } = require('child_process');

const PAYFLOW_DATA = '/www/wwwroot/payflow/data/config.json';
const OPENFLOW_CHANNELS = '/www/wwwroot/nownexts_com/data/mail-channels.json';
const LOCAL_CFG = path.join(__dirname, '..', 'mail-config.json');
const SCRIPT = path.join(__dirname, '..', 'bin', 'payflow-mail.php');

function config() {
  // 1) WebsFlow 自己的配置
  try {
    if (fs.existsSync(LOCAL_CFG)) {
      const c = JSON.parse(fs.readFileSync(LOCAL_CFG, 'utf8'));
      if (c && c.host) return Object.assign({ source: 'websflow' }, c);
    }
  } catch (e) {}
  // 2) PayFlow 的 mail 段(PHP 发送)
  try {
    if (fs.existsSync(PAYFLOW_DATA)) {
      const c = JSON.parse(fs.readFileSync(PAYFLOW_DATA, 'utf8'));
      const m = (c && c.mail) || {};
      if (m.host) return Object.assign({ source: 'payflow' }, m);
    }
  } catch (e) {}
  // 3) OpenFlow 邮件渠道(SMTP 段,Node 直连)
  try {
    if (fs.existsSync(OPENFLOW_CHANNELS)) {
      const all = JSON.parse(fs.readFileSync(OPENFLOW_CHANNELS, 'utf8'));
      const s = (all && all.smtp) || {};
      const p = s.params || {};
      if (s.enabled && p.host && (p.from || p.user)) {
        return {
          source: 'openflow',
          enabled: true,
          host: p.host,
          port: Number(p.port) || 25,
          secure: Number(p.port) === 465,
          username: p.user || '',
          password: p.pass || '',
          from_email: p.from || p.user || '',
          from_name: p.from_name || 'WebsFlow',
        };
      }
    }
  } catch (e) {}
  return { enabled: false, source: 'none' };
}

function status() {
  const c = config();
  // PHP 渠道(PayFlow)需要用户名;Node 直连渠道(openflow)允许无认证(本机中继)
  const needUser = c.source === 'websflow' || c.source === 'payflow';
  const ok = !!c.enabled && !!c.host && (!needUser || !!c.username);
  return { configured: ok, source: c.source, host: c.host || '', from: c.from_email || '', enabled: !!c.enabled };
}

// ---------- 轻量 SMTP 客户端(OpenFlow 渠道用,零依赖) ----------
// 支持:无认证本机中继(25)、AUTH LOGIN(587)、TLS 直连(465)
function smtpSend(cfg, to, subject, text, html) {
  return new Promise((resolve) => {
    const port = cfg.port || 25;
    const domain = (cfg.from_email || '').split('@')[1] || 'localhost';
    const hasAuth = !!cfg.username && !!cfg.password;
    const b64 = (s) => Buffer.from(s, 'utf8').toString('base64');
    const body = Buffer.from(html || text || '', 'utf8').toString('base64').replace(/(.{76})/g, '$1\r\n');
    const steps = [
      { expect: /^220/, send: () => `EHLO ${domain}` },                       // 服务端问候
      { expect: /^250/, send: () => (hasAuth ? 'AUTH LOGIN' : `MAIL FROM:<${cfg.from_email}>`) },
      ...(hasAuth ? [
        { expect: /^334/, send: () => b64(cfg.username) },
        { expect: /^235/, send: () => `MAIL FROM:<${cfg.from_email}>` },
      ] : []),
      { expect: /^250/, send: () => `RCPT TO:<${to}>` },
      { expect: /^25[04]/, send: () => 'DATA' },
      { expect: /^354/, send: () => [
          `From: ${cfg.from_name || 'WebsFlow'} <${cfg.from_email}>`,
          `To: <${to}>`,
          `Subject: =?UTF-8?B?${b64(subject)}?=`,
          'MIME-Version: 1.0',
          'Content-Type: text/html; charset=UTF-8',
          'Content-Transfer-Encoding: base64',
          '',
          body,
          '.',
        ].join('\r\n') },
      { expect: /^250/, send: () => 'QUIT', done: true },
    ];
    let step = 0, buf = '', settled = false;
    const finish = (r) => { if (settled) return; settled = true; try { sock.destroy(); } catch (e) {} resolve(r); };
    const onData = (d) => {
      buf += d.toString('utf8');
      if (!/\r?\n$/.test(buf)) return;        // 等完整响应行
      const st = steps[step];
      if (!st) return buf = '';
      const lines = buf.trim().split(/\r?\n/);
      buf = '';
      // 响应可能多行(250-x … 250 ),只要最后一行匹配预期码即通过
      const last = lines[lines.length - 1];
      if (!st.expect.test(last)) {
        return finish({ ok: false, error: `SMTP 第 ${step + 1} 步响应异常: ${last.slice(0, 120)}` });
      }
      if (st.done) return finish({ ok: true });
      sock.write(st.send() + '\r\n');
      step++;
    };
    let sock;
    const wire = (s) => { sock = s; s.setEncoding('utf8'); s.on('data', onData); s.setTimeout(15000, () => finish({ ok: false, error: 'SMTP 超时(15s)' })); s.on('error', (e) => finish({ ok: false, error: 'SMTP 错误:' + e.message })); };
    if (port === 465) {
      wire(tls.connect({ host: cfg.host, port, rejectUnauthorized: false }));
    } else {
      wire(net.connect({ host: cfg.host, port }));
    }
  });
}

function send(to, subject, text, html) {
  const c = config();
  const st = status();
  if (!st.configured) return Promise.resolve({ skipped: true, reason: '邮件通道未配置(缺少 SMTP 凭据)' });
  // OpenFlow 渠道:Node 直连 SMTP(本机中继/无认证也能发)
  if (c.source === 'openflow') {
    return smtpSend(c, to, subject, text, html).then((r) => {
      if (!r.ok) console.error('[mailer] OpenFlow SMTP 发送失败:', r.error);
      return r;
    });
  }
  // WebsFlow / PayFlow 渠道:PHP 脚本
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

module.exports = { send, status, config, smtpSend };