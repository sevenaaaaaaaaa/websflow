/* ============================================================
 * WebsFlow · 页面自动化后端 (automation.js)
 * 边界:页面侧触发与内容在 WebsFlow;券/收款 → PayFlow;线索/旅程 → OpenFlow
 *   POST /api/automation/lead    表单提交 → 存线索 + 写 OpenFlow 待办
 *   GET  /api/automation/coupon  券试算(代理 PayFlow coupon validate)
 * ============================================================ */
const express = require('express');
const router = express.Router();
const db = require('../db');
const payflow = require('../lib/payflow');
const openflow = require('../lib/openflow');
const { notifyAdmins } = require('../lib/notify');

// 线索:存本地 + 交 OpenFlow 跟进
router.post('/lead', (req, res) => {
  try {
    const { project_id, project_name, url, seg, fields, form_id, trace_id, vid } = req.body || {};
    const f = fields && typeof fields === 'object' ? fields : {};
    const summary = Object.keys(f).slice(0, 8).map((k) => `${k}: ${String(f[k]).slice(0, 60)}`).join('\n');
    const id = db.addLead({
      trace_id: trace_id || req.headers['x-trace-id'] || null,
      vid: vid || null,
      project_id: project_id || null,
      project_name: project_name || '',
      url: url || '',
      seg: seg || '',
      form_id: form_id || '',
      data: f,
    });
    // 交 OpenFlow 承接(其 CRM/旅程为该域所有者)
    const who = f['姓名'] || f['name'] || f['邮箱'] || f['email'] || '访客';
    openflow.createTask(
      `新线索:${who}(${project_name || '落地页'})`,
      [summary, '', `来源:${url || '-'}`, seg ? `分群:${seg}` : '', `线索ID:${id}`].filter(Boolean).join('\n'),
      'high',
      'lead_' + id
    ).then((r) => { if (r && r.ok) console.log('[lead] 已写入 OpenFlow 待办'); });
    notifyAdmins('review', '收到新线索', `${who} · ${project_name || ''}`, '#/console');
    res.status(201).json({ ok: true, lead_id: id });
  } catch (e) {
    console.error('线索入库失败:', e);
    res.status(500).json({ error: '提交失败' });
  }
});

// 券试算(代理 PayFlow;券的真实定义/核销在 PayFlow)
router.get('/coupon', async (req, res) => {
  try {
    const { code, product, email } = req.query;
    if (!code) return res.status(400).json({ error: '缺少券码' });
    const qs = 'code=' + encodeURIComponent(code)
      + '&product=' + encodeURIComponent(product || '')
      + (email ? '&email=' + encodeURIComponent(email) : '');
    const r = await payflow.request('GET', '/api/v1/coupons/validate', null, qs);
    res.json({ ok: true, result: r });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
