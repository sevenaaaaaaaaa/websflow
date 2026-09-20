/* ============================================================
 * WebsFlow · API 服务器 (server.js)
 * 轻量级后端服务，支持用户系统和云端存储
 * ============================================================ */

const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const { renderPage } = require('./lib/pagerender');

// 导入路由
const usersRouter = require('./routes/users');
const projectsRouter = require('./routes/projects');
const eventsRouter = require('./routes/events');
const aiRouter = require('./routes/ai');
const templatesRouter = require('./routes/templates');
const billingRouter = require('./routes/billing');
const pluginsRouter = require('./routes/plugins');
const reviewRouter = require('./routes/review');
const notificationsRouter = require('./routes/notifications');
const tasksRouter = require('./routes/tasks');
const scheduledRouter = require('./routes/scheduled');
const alertsRouter = require('./routes/alerts');
const automationRouter = require('./routes/automation');
const scheduler = require('./lib/scheduler');
const webhooksRouter = require('./routes/webhooks');
const referralRouter = require('./routes/referral');
const layoutPresetsRouter = require('./routes/layout-presets');
const growthRouter = require('./routes/growth');
const toolsRouter = require('./routes/tools');
const ingestRouter = require('./routes/ingest');
const identityRouter = require('./routes/identity');
const capabilitiesRouter = require('./routes/capabilities');
const lessonsRouter = require('./routes/lessons');
const goalsRouter = require('./routes/goals');
const actionsRouter = require('./routes/actions');
const produceRouter = require('./routes/produce');
const selfcheckRouter = require('./routes/selfcheck');
const patternsRouter = require('./routes/patterns');
const metricsRouter = require('./routes/metrics');

// 创建 Express 应用
const app = express();
const PORT = process.env.PORT || 3001;

// ============================================================
//  中间件配置
// ============================================================

// CORS 配置
app.use(cors({
  origin: ['http://localhost:8080', 'https://www.nownexts.com', 'https://nownexts.com'],
  credentials: true,
}));

// 支付回调(需原始 body 验签,必须在 json 解析之前)
app.use('/api/webhooks', webhooksRouter);

// 解析 JSON 请求体
app.use(express.json({ limit: '10mb' }));

// 解析 URL 编码的请求体
app.use(express.urlencoded({ extended: true }));

// 静态文件服务（用于分享页面）
app.use('/static', express.static(path.join(__dirname, '..', 'public')));

// ============================================================
//  路由配置
// ============================================================

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '0.5.0',
    timestamp: new Date().toISOString(),
  });
});

function notFoundPage(res, note) {
  return res.status(404).send(`<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>页面不存在 · WebsFlow</title></head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f1f5f9;font-family:-apple-system,'PingFang SC',sans-serif">
<div style="text-align:center;color:#64748b">
<div style="font-size:44px">🫥</div>
<p style="margin:12px 0 0">${note || '页面不存在或作者已取消发布'}</p>
<a href="/webflow/" style="display:inline-block;margin-top:16px;padding:9px 18px;background:#4f46e5;color:#fff;border-radius:10px;text-decoration:none;font-size:13px;font-weight:600">打开 WebsFlow</a>
</div></body></html>`);
}

// 托管页直出(SSR):/p/<token> 与 /p/<token>/<slug>
function serveHosted(req, res) {
  try {
    const project = db.getPublishedProject(req.params.token);
    if (!project) return notFoundPage(res);
    const html = renderPage(project, req.params.slug || '', req);
    if (html === null) return notFoundPage(res, '该页面不存在(站点可能只有首页)');
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=30, s-maxage=30');
    res.send(html);
  } catch (error) {
    console.error('托管页渲染失败:', error);
    res.status(500).send('页面渲染失败');
  }
}
// 提案预览页(未发布,凭不可猜 token 访问;需在 /p/:token/:slug 之前)
function servePreview(req, res) {
  try {
    const row = db.getPreviewPage(req.params.token);
    if (!row) return notFoundPage(res, '预览已过期或不存在');
    const project = { name: '预览', mode: row.data && row.data.mode, data: row.data, share_token: 'pv-' + row.token };
    const proj = db.getProject(row.project_id, row.user_id);
    if (proj) { project.name = proj.name; project.mode = proj.mode || project.mode; }
    const html = renderPage(project, '', req, { noAnim: true });
    if (html === null) return notFoundPage(res, '预览页面为空');
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.set('Cache-Control', 'no-store, max-age=0');
    res.set('X-Robots-Tag', 'noindex, nofollow');
    res.send(html);
  } catch (e) {
    console.error('预览渲染失败:', e.message);
    res.status(500).send('预览渲染失败');
  }
}
app.get('/p/preview/:token', servePreview);

app.get('/p/:token', serveHosted);
app.get('/p/:token/:slug', serveHosted);

// 用户路由
app.use('/api/users', usersRouter);

// 项目路由
app.use('/api/projects', projectsRouter);

// 转化事件路由
app.use('/api/events', eventsRouter);

// AI 生成路由
app.use('/api/ai', aiRouter);

// 云端模板路由
app.use('/api/templates', templatesRouter);

// 计费路由
app.use('/api/billing', billingRouter);

// 插件路由
app.use('/api/plugins', pluginsRouter);

// 审核台(管理员)
app.use('/api/review', reviewRouter);

// 通知中心
app.use('/api/notifications', notificationsRouter);

// 邀请返佣
app.use('/api/referral', referralRouter);
app.use('/api/layout-presets', layoutPresetsRouter);
app.use('/api/growth', growthRouter);
app.use('/api/tools', toolsRouter);
app.use('/api/ingest', ingestRouter);
app.use('/api/identity', identityRouter);
app.use('/api/capabilities', capabilitiesRouter);
app.use('/api/lessons', lessonsRouter);
app.use('/api/goals', goalsRouter);
app.use('/api/actions', actionsRouter);
app.use('/api/produce', produceRouter);
app.use('/api/selfcheck', selfcheckRouter);
app.use('/api/patterns', patternsRouter);
app.use('/api/metrics', metricsRouter);
app.use('/api/trace', goalsRouter.traceRouter);

// 云端 Copilot 任务库
app.use('/api/tasks', tasksRouter);

// 定时巡检
app.use('/api/scheduled', scheduledRouter);

// 阈值告警
app.use('/api/alerts', alertsRouter);

// 页面自动化(线索/券)
app.use('/api/automation', automationRouter);

// ============================================================
//  错误处理
// ============================================================

// 404 处理
app.use((req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

// 全局错误处理
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ error: '服务器内部错误' });
});

// ============================================================
//  启动服务器
// ============================================================

async function start() {
  // 初始化数据库
  await db.initDatabase();
  
  app.listen(PORT, () => {
    console.log(`WebsFlow API 服务器已启动: http://localhost:${PORT}`);
    console.log(`健康检查: http://localhost:${PORT}/api/health`);
    scheduler.start(); // 每日巡检调度器
    // 能力目录自同步:能力随代码走,不在文档里过期
    try {
      const n = require('./lib/capabilities').syncBuiltin();
      console.log('[caps] 已同步能力目录:', n, '条');
    } catch (e) { console.error('[caps] 同步失败:', e.message); }
  });
}

start().catch(console.error);

module.exports = app;
