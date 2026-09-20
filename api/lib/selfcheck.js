/* ============================================================
 * WebsFlow · 每日系统体检 (selfcheck.js)  —— 「越用越丝滑」
 *
 * 原则:凡是系统自己能判断、能安全修正的,就不要让用户再去别的入口配置。
 *   - 每个检查项给出:状态 / 影响 / 可执行动作(深链或一键修复)
 *   - 一键修复只做"确定安全"的动作(auto=true),危险动作只提示
 *
 * 检查项(持续扩充):
 *   setup.*      账号与配置就绪度(onboarding 用同一套)
 *   pipeline.*   生产流水线健康(滞留运行、失败重试、交付包缺失)
 *   experiment.* A/B 完整性与度量可用性
 *   data.*       埋点回传是否活着、数据保留与库体积
 *   asset.*      素材引用可达性(抽样)
 * ============================================================ */
const fs = require('fs');
const path = require('path');
const db = require('../db');

function item(o) {
  return Object.assign({ key: '', level: 'info', title: '', detail: '', fix: null, link: null, auto: false, group: 'general' }, o);
}

// ---------- setup:就绪度(同时供 onboarding 清单) ----------
function checkSetup(user) {
  const out = [];
  const cfg = (() => { try { return require('./payflow').loadConfig(); } catch (e) { return null; } })();
  const prodMap = (() => { try { return require('./payflow').productMap(); } catch (e) { return {}; } })();
  out.push(item({
    key: 'setup.provider', group: 'setup', level: cfg ? 'ok' : 'warn',
    title: '收款通道已配置', detail: cfg ? `已接入 PayFlow(${Object.keys(prodMap).length} 个商品映射)` : '未配置 PayFlow,页面无法收款',
    link: '#/console/settings',
  }));
  let provider = null;
  try { provider = require('./ai').loadProvider(); } catch (e) { provider = null; }
  out.push(item({
    key: 'setup.ai', group: 'setup', level: provider && provider.api_key ? 'ok' : 'warn',
    title: 'AI 供应商可用', detail: provider && provider.api_key ? `模型 ${provider.model}` : '未配置 AI 供应商,生产会退化为规则故事线',
    link: '#/console/settings',
  }));
  const keys = (() => { try { return db.listApiKeys(user.id) || []; } catch (e) { return []; } })();
  out.push(item({
    key: 'setup.apikey', group: 'setup', level: keys.length ? 'ok' : 'warn',
    title: '已创建 API 密钥', detail: keys.length ? `${keys.length} 个密钥(可给外部 Agent 调用)` : '没有密钥,外部系统/Agent 无法调用',
    link: '#/console/settings',
  }));
  const notify = (() => { try { const n = require('./notify').cfg(); return n; } catch (e) { return null; } })();
  const hasNotify = !!(notify && (notify.lark_webhook || notify.email));
  out.push(item({
    key: 'setup.notify', group: 'setup', level: hasNotify ? 'ok' : 'info',
    title: '通知通道', detail: hasNotify ? '已配置(异常会推送给你)' : '未配置,体检结果只在控制台可见',
    link: '#/console/settings',
  }));
  const yearlyOn = !!(prodMap && prodMap.pro_yearly);
  out.push(item({
    key: 'setup.yearly', group: 'setup', level: yearlyOn ? 'ok' : 'warn',
    title: '专业版年付已上架', detail: yearlyOn ? '目录含 ¥390/年,入账 365 天' : 'PayFlow 未映射 pro_yearly,年付不会出现在目录',
    link: '#/console/settings',
  }));
  const goals = (() => { try { return db.listGoals({ user_id: user.id }) || []; } catch (e) { return []; } })();
  const published = (() => { try { return (db.getUserProjects(user.id) || []).filter((p) => p.published).length; } catch (e) { return 0; } })();
  if (published && !goals.length) {
    out.push(item({
      key: 'setup.goals', group: 'setup', level: 'warn', auto: true,
      title: '还没有增长目标', detail: '已有发布页,可一键设立 3 个默认目标让编排器跑起来',
      fix: 'seed_launch_goals', link: '#/console/conversion',
    }));
  } else if (goals.length) {
    out.push(item({
      key: 'setup.goals', group: 'setup', level: 'ok',
      title: `${goals.length} 个增长目标在跑`, detail: '编排器每 30 分钟评估一次',
      link: '#/console/conversion',
    }));
  }
  return out;
}

// ---------- pipeline:生产流水线健康 ----------
function checkPipeline(user) {
  const out = [];
  const rows = (() => { try { return db.listProductions(user.id, 50) || []; } catch (e) { return []; } })();
  const running = rows.filter((r) => r.status === 'running');
  const stuck = running.filter((r) => {
    const t = new Date(String(r.created_at).replace(' ', 'T') + 'Z').getTime();
    return Date.now() - t > 10 * 60 * 1000;
  });
  if (stuck.length) {
    out.push(item({
      key: 'pipeline.stuck', group: 'pipeline', level: 'warn', auto: true,
      title: `有 ${stuck.length} 个生产卡住`, detail: '超过 10 分钟没进展(通常是外部接口挂起)',
      fix: 'mark_stuck_failed',
    }));
  }
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const failed = rows.filter((r) => r.status === 'failed' &&
    new Date(String(r.created_at).replace(' ', 'T') + 'Z').getTime() > dayAgo);
  if (failed.length) {
    out.push(item({
      key: 'pipeline.failed', group: 'pipeline', level: 'warn', auto: true,
      title: `${failed.length} 次生产失败(近 24h)`, detail: '可一键重跑:重新生成 A/B 并质检',
      fix: 'retry_failed', link: '#/console/produce',
    }));
  }
  const withIssues = rows.filter((r) => r.status === 'done_with_issues');
  if (withIssues.length) {
    out.push(item({
      key: 'pipeline.qa', group: 'pipeline', level: 'info',
      title: `${withIssues.length} 次生产质检有告警(历史记录)`, detail: '多为素材/文案缺项,已在交付包里标注;可忽略',
      link: '#/console/produce',
    }));
  }
  if (!rows.length) {
    out.push(item({
      key: 'pipeline.none', group: 'pipeline', level: 'info',
      title: '还没跑过生产流水线', detail: '在「生产」里填一句 brief,即可得到 A/B 两版 + 交付包',
      link: '#/console/produce',
    }));
  }
  const dir = path.join(__dirname, '..', '..', 'data', 'deliveries');
  try {
    const gone = rows.filter((r) => r.status === 'done' && !fs.existsSync(path.join(dir, r.id)));
    if (gone.length) {
      out.push(item({
        key: 'pipeline.pack_missing', group: 'pipeline', level: 'warn', auto: true,
        title: `${gone.length} 个交付包缺失`, detail: '记录在但文件不在(磁盘清理/迁移),将标记为需重跑',
        fix: 'mark_pack_missing',
      }));
    }
  } catch (e) { /* 忽略 */ }
  return out;
}

// ---------- experiment:A/B 完整性 ----------
function checkExperiments(user) {
  const out = [];
  let runs = [];
  try { runs = db.listGrowthRunsForUser(user.id, 20) || []; } catch (e) { runs = []; }
  const incomplete = [];
  runs.forEach((r) => {
    let vs = [];
    try { vs = typeof r.variants === 'string' ? JSON.parse(r.variants) : (r.variants || []); } catch (e) { vs = []; }
    vs.forEach((v) => {
      const p = db.getProject(v.cloudId, user.id);
      if (p && !p.published) incomplete.push({ run: r.id, key: v.key, id: v.cloudId, token: v.share_token });
    });
  });
  if (incomplete.length) {
    out.push(item({
      key: 'experiment.unpublished', group: 'experiment', level: 'warn', auto: true,
      title: `${incomplete.length} 个实验变体未发布`, detail: '变体没上线会导致 A/B 数据不完整',
      fix: 'publish_variants',
    }));
  }
  const pending = (() => { try { return db.getPendingProposal ? null : null; } catch (e) { return null; } })();
  const proposals = (() => { try { return db.listProposals ? (db.listProposals(user.id) || []).length : 0; } catch (e) { return 0; } })();
  if (proposals) {
    out.push(item({
      key: 'experiment.proposals', group: 'experiment', level: 'info',
      title: `${proposals} 个提案待审`, detail: 'AI 出方案,你点头才发布', link: '#/console/conversion',
    }));
  }
  return out;
}

// ---------- data:埋点与数据健康 ----------
function checkData(user) {
  const out = [];
  let stats = null;
  try { stats = db.getEventStats({}); } catch (e) { stats = null; }
  const n = stats ? (stats.total || (stats.views || 0) + (stats.clicks || 0)) : 0;
  const published = (() => { try { return (db.getUserProjects(user.id) || []).filter((p) => p.published).length; } catch (e) { return 0; } })();
  if (published > 0 && n === 0) {
    out.push(item({
      key: 'data.no_events', group: 'data', level: 'warn',
      title: '已发布页面但近 24h 没有事件', detail: '可能没投放、或页面 CTA 没设置转化目标(goalId)',
      link: '#/console/conversion',
    }));
  } else if (n > 0) {
    out.push(item({
      key: 'data.alive', group: 'data', level: 'ok',
      title: '埋点在回传', detail: `近 24h ${n} 个事件`, link: '#/console/conversion',
    }));
  }
  try {
    const f = path.join(__dirname, '..', '..', 'api', 'websflow.db.journal');
    if (fs.existsSync(f)) {
      const mb = fs.statSync(f).size / 1024 / 1024;
      if (mb > 8) {
        out.push(item({
          key: 'data.journal', group: 'data', level: 'info', auto: true,
          title: `写入日志偏大(${mb.toFixed(1)}MB)`, detail: '合并进主库可保持写入速度', fix: 'compact_db',
        }));
      }
    }
  } catch (e) { /* 忽略 */ }
  return out;
}

// ---------- asset:素材可达性(抽样) ----------
async function checkAssets(user, sample) {
  const out = [];
  let assets = [];
  try { assets = require('./asset-library').list(); } catch (e) { assets = []; }
  const n = Math.min(Number(sample) || 0, assets.length);
  if (!n) return out;
  const step = Math.max(1, Math.floor(assets.length / n));
  const pick = assets.filter((_, i) => i % step === 0).slice(0, n);
  const WEB_ROOT = path.join(__dirname, '..', '..');
  const bad = [];
  await Promise.all(pick.map((a) => new Promise((resolve) => {
    // 自托管素材直接查文件(同机走 CF 探活会误报);外部素材才发 HEAD
    const own = String(a.url).match(/^https?:\/\/[^/]+\/webflow\/assets\/(.+)$/);
    if (own) {
      const local = path.join(WEB_ROOT, 'assets', own[1].split("?")[0]);   // 去掉 ?v= 版本号
      if (!fs.existsSync(local) || fs.statSync(local).size < 1024) bad.push(a.id);
      return resolve();
    }
    try {
      const https = require('https');
      const req = https.request(a.url, { method: 'HEAD', timeout: 6000, headers: { Referer: 'https://nownexts.com/webflow/', 'User-Agent': 'WebsFlow-SelfCheck/1.0' } }, (r) => { if (r.statusCode >= 400) bad.push(a.id); resolve(); });
      req.on('error', () => { bad.push(a.id); resolve(); });
      req.on('timeout', () => { req.destroy(); bad.push(a.id); resolve(); });
      req.end();
    } catch (e) { resolve(); }
  })));
  if (bad.length) {
    out.push(item({
      key: 'asset.unreachable', group: 'asset', level: 'warn',
      title: `${bad.length} 个素材不可用`, detail: `抽样 ${pick.length} 个:${bad.slice(0, 5).join(', ')}`, link: '#/console/settings',
    }));
  } else if (pick.length) {
    out.push(item({ key: 'asset.ok', group: 'asset', level: 'ok', title: `素材抽样可用(${pick.length} 个)`, detail: '' }));
  }
  return out;
}

// ---------- 一键修复(只做安全动作) ----------
async function applyFix(user, action, ctx) {
  const out = { action, ok: true, detail: '' };
  try {
    if (action === 'mark_stuck_failed') {
      const rows = db.listProductions(user.id, 50) || [];
      let n = 0;
      rows.filter((r) => r.status === 'running').forEach((r) => {
        const t = new Date(String(r.created_at).replace(' ', 'T') + 'Z').getTime();
        if (Date.now() - t > 10 * 60 * 1000) { db.updateProduction(r.id, { status: 'failed', result: JSON.stringify({ error: '超时未完成,已由体检自动标记' }) }); n++; }
      });
      out.detail = `标记 ${n} 个滞留生产`;
    } else if (action === 'retry_failed') {
      const rows = (db.listProductions(user.id, 10) || []).filter((r) => r.status === 'failed');
      const target = rows[0];
      if (target) {
        const brief = JSON.parse(target.brief || '{}');
        require('./producer').run(user.id, brief).catch(() => {});
        db.updateProduction(target.id, { status: 'retried' });
        out.detail = `已重跑(${(brief.business || '')})`;
      } else out.detail = '没有可重跑的记录';
    } else if (action === 'publish_variants') {
      let n = 0;
      (db.listGrowthRunsForUser(user.id, 20) || []).forEach((r) => {
        let vs = [];
        try { vs = typeof r.variants === 'string' ? JSON.parse(r.variants) : (r.variants || []); } catch (e) { vs = []; }
        vs.forEach((v) => {
          const p = db.getProject(v.cloudId, user.id);
          if (p && !p.published) { db.setPublished(p.id, user.id, true); n++; }
        });
      });
      out.detail = `已发布 ${n} 个变体`;
    } else if (action === 'compact_db') {
      if (db.compactDatabase) db.compactDatabase();
      out.detail = '已合并写入日志';
    } else if (action === 'seed_launch_goals') {
      const existing = (db.listGoals({ user_id: user.id }) || []).filter((g) => String(g.name || '').indexOf('[launch]') === 0);
      if (existing.length >= 3) { out.detail = '默认目标已存在'; return out; }
      const pages = (db.getUserProjects(user.id) || []).filter((p) => p.published);
      const specs = [
        { name: '[launch] 落地页点击率', metric: 'cvr', target: 3, window_days: 7 },
        { name: '[launch] 表单线索', metric: 'leads', target: 10, window_days: 14 },
        { name: '[launch] CTA 点击', metric: 'clicks', target: 30, window_days: 7 },
      ];
      let n = 0;
      specs.forEach((spec, i) => {
        const page = pages[i] || pages[0] || null;
        db.createGoal(Object.assign({ user_id: user.id, project_id: page ? page.id : null }, spec));
        n++;
      });
      out.detail = `已设立 ${n} 个增长目标`;
    } else if (action === 'mark_pack_missing') {
      const dir = path.join(__dirname, '..', '..', 'data', 'deliveries');
      let n = 0;
      (db.listProductions(user.id, 50) || []).forEach((r) => {
        if (r.status === 'done' && !fs.existsSync(path.join(dir, r.id))) { db.updateProduction(r.id, { status: 'failed', result: JSON.stringify({ error: '交付包缺失,已由体检标记为需重跑' }) }); n++; }
      });
      out.detail = `标记 ${n} 条交付包缺失`;
    } else {
      out.ok = false; out.detail = '未知修复动作';
    }
  } catch (e) { out.ok = false; out.detail = e.message; }
  return out;
}

// ---------- 运行体检 ----------
async function run(user, opts) {
  const o = opts || {};
  const checks = [].concat(
    checkSetup(user), checkPipeline(user), checkExperiments(user), checkData(user)
  );
  if (o.deep) checks.push(...(await checkAssets(user, o.sample || 6)));
  const errors = checks.filter((c) => c.level === 'warn');
  const fixes = [];
  if (o.applyFixes) {
    for (const c of checks) {
      if (c.auto && c.fix) fixes.push(await applyFix(user, c.fix, c));
    }
  }
  return {
    at: new Date().toISOString(),
    ok: errors.length === 0,
    total: checks.length,
    warns: errors.length,
    items: checks,
    fixes,
  };
}

// 让「越用越丝滑」可度量:自动处理 / 需要人工 的比例
function smoothness(report) {
  const auto = (report.items || []).filter((x) => x.auto).length;
  const manual = (report.items || []).filter((x) => x.level === 'warn' && !x.auto).length;
  const total = auto + manual;
  return { auto, manual, ratio: total ? +(auto / total).toFixed(2) : 1 };
}

module.exports = { run, applyFix, smoothness, checkSetup, checkPipeline, checkExperiments, checkData, checkAssets };
