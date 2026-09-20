/* ============================================================
 * WebsFlow · 托管页服务端渲染 (pagerender.js)
 *
 * 复用前端同一套渲染引擎(schema/themes/runtime-css/render),
 * 在 Node 里直出完整 HTML —— 与导出单文件同源同像素,
 * 但带 SEO/OG/结构化数据且首屏无需额外请求。
 * ============================================================ */

const { loadWF } = require('./wf');

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// 内存缓存:按 token + 内容指纹,内容变更自动重渲染
const cache = new Map();

function pickPages(data) {
  if (Array.isArray(data.pages) && data.pages.length) return data.pages;
  return [{ id: 'main', name: '首页', slug: '', blocks: data.blocks || [] }];
}

// slug 为空 → 首页;返回 null 表示该页不存在
// 由请求推导访问者环境(设备/UTM/登录态/国家),用于 SSR 千人千面
function buildVisitor(req) {
  if (!req) return null;
  const ua = String(req.headers["user-agent"] || "");
  const q = req.url && req.url.indexOf("?") >= 0 ? req.url.slice(req.url.indexOf("?")) : "";
  const utmMatch = q.match(/utm_[a-z]+=[^&]*/gi) || [];
  return {
    device: /Mobi|Android|iPhone|iPad|iPod/i.test(ua) ? "mobile" : "desktop",
    utm: utmMatch.join("&"),
    country: String(req.headers["cf-ipcountry"] || ""),
    hour: new Date().getHours(),
    visitor: "new",
    login: "out",
  };
}

function renderPage(project, slug, req, opts) {
  const wf = loadWF();
  const data = project.data || {};
  // 页面自带的新模块(生产流水线现场生成的)→ 渲染前注册
  try {
    if (Array.isArray(data.customModules) && data.customModules.length && wf.registerPluginBlocks) {
      wf.registerPluginBlocks(data.customModules);
    }
  } catch (e) { /* 注册失败则按缺失模块处理 */ }
  const pages = pickPages(data);
  const page = slug ? pages.find((p) => p.slug === slug) : pages[0];
  if (!page) return null;

  // 千人千面:缓存键必须包含访客维度(设备/UTM/国家/时段),否则会串内容
  const visitor = buildVisitor(req);
  const vSig = visitor
    ? [visitor.device, visitor.utm, visitor.country, visitor.hour].join('~')
    : 'default';
  const hasPersonal = (data.segments && data.segments.length) ||
    (page.blocks || []).some((b) => (b.audience && (b.audience.device || b.audience.utm || b.audience.hours || b.audience.segmentId)) || (b.personalize && b.personalize.length));
  const key = project.share_token + '|' + (slug || '') + (hasPersonal ? '|' + vSig : '') + (opts && opts.noAnim ? '|static' : '');
  const proActive = project.owner_plan === 'pro' && (!project.owner_plan_expires ||
    new Date(String(project.owner_plan_expires).replace(' ', 'T') + 'Z').getTime() > Date.now());
  const stamp = [project.id, project.updated_at || '', JSON.stringify(data).length, page.id, proActive ? 'pro' : 'free'].join('|');
  const hit = cache.get(key);
  if (hit && hit.stamp === stamp) return hit.html;

  const html = build(wf, project, data, page, proActive, visitor, opts);
  cache.set(key, { stamp, html });
  if (cache.size > 400) cache.delete(cache.keys().next().value);
  return html;
}

function listPageSlugs(project) {
  const pages = pickPages(project.data || {});
  return pages.map((p) => p.slug || '');
}

function build(wf, project, data, page, proActive, visitor, opts) {
  const g = data.global || {};
  const mode = project.mode || 'site';
  const theme = data.theme || {};
  const multiBase = '/webflow/p/' + project.share_token;
  const projectLike = { name: project.name, mode, theme, global: g, blocks: (page && page.blocks) || [], segments: data.segments || [] };
  const body = wf.renderProject(projectLike, { context: 'live', multiBase, visitor, noAnim: !!(opts && opts.noAnim) });

  const title = g.title || project.name || 'WebsFlow 页面';
  const description = g.description || '';
  const keywords = g.keywords || '';
  const og = g.og || {};
  const twitter = g.twitter || {};
  const preset = wf.getPreset(theme.preset);
  const isDark = preset.key === 'night';

  const bodyStyle = mode === 'ppt'
    ? 'margin:0;overflow:hidden;background:#0b1020;'
    : mode === 'h5'
      ? 'margin:0;background:#e2e8f0;'
      : `margin:0;background:${isDark ? '#0f172a' : theme.bg || '#fff'};`;

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description,
  };
  if (og.image) structuredData.image = og.image;
  if (g.brand) structuredData.author = { '@type': 'Organization', name: g.brand };

  const lazy = `
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting) { var i = e.target; if (i.dataset.src) { i.src = i.dataset.src; i.removeAttribute('data-src'); } io.unobserve(i); }
        });
      }, { rootMargin: '200px' });
      document.querySelectorAll('img[data-src]').forEach(function (i) { io.observe(i); });
    }`;

  return `<!DOCTYPE html>
<html lang="zh-CN" style="scroll-behavior:smooth">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="${esc(description || title)}">
${keywords ? `<meta name="keywords" content="${esc(keywords)}">` : ''}
<meta property="og:title" content="${esc(og.title || title)}">
<meta property="og:description" content="${esc(og.description || description)}">
<meta property="og:type" content="website">
${og.image ? `<meta property="og:image" content="${esc(og.image)}">` : ''}
<meta property="og:site_name" content="${esc(g.brand || title)}">
<meta name="twitter:card" content="${esc(twitter.card || 'summary_large_image')}">
<meta name="twitter:title" content="${esc(og.title || title)}">
<meta name="twitter:description" content="${esc(og.description || description)}">
${og.image ? `<meta name="twitter:image" content="${esc(og.image)}">` : ''}
${twitter.site ? `<meta name="twitter:site" content="${esc(twitter.site)}">` : ''}
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%234f46e5'/%3E%3Ctext x='16' y='22' font-size='16' fill='white' text-anchor='middle' font-family='sans-serif' font-weight='bold'%3EW%3C/text%3E%3C/svg%3E">
<script type="application/ld+json">${JSON.stringify(structuredData)}</script>
${g.tracking && g.tracking.cdp ? `<script src="${esc(g.tracking.cdpSrc || '/assets/cdp-track.js')}" data-api="${esc(g.tracking.cdpApi || '/api/cdp.php')}" data-autotrack="1"${g.tracking.privacy ? ' data-privacy="none"' : ''}></script>` : ''}
${g.tracking && g.tracking.custom ? `<script>${g.tracking.custom}</script>` : ''}
<title>${esc(title)}</title>
<script>document.documentElement.classList.add("wf-anim")</script>
<style>${wf.allRuntimeCSS ? wf.allRuntimeCSS(data.blocks || []) : wf.runtimeCSS}</style>
<style>html,body{${mode === 'ppt' ? 'height:100%;' : ''}}
.wf-hosted-badge{position:fixed;right:12px;bottom:12px;z-index:99;font-size:11px;font-family:-apple-system,"PingFang SC",sans-serif}
.wf-hosted-badge a{color:#94a3b8;text-decoration:none;background:rgba(255,255,255,.82);padding:4px 10px;border-radius:999px;box-shadow:0 2px 10px rgba(15,23,42,.08)}
.wf-hosted-badge a:hover{color:#4f46e5}</style>
</head>
<body style="${bodyStyle}">
${body}
${proActive ? '' : '<div class="wf-hosted-badge"><a href="/webflow/" target="_blank" rel="noopener">⚡ WebsFlow 托管</a></div>'}
<script>window.__wfProjectId = ${JSON.stringify(project.id)};</script>
<script>window.__wfAutomation = ${JSON.stringify((data.automations || []).filter((r) => r.enabled).map((r) => ({ id: r.id, when: r.when, then: r.then })))};</script>
<script>window.__wfSegments = ${JSON.stringify((data.segments || []).map((sg) => ({ id: sg.id, name: sg.name, rules: sg.rules })))};</script>
<script>window.__wfPersonalize = ${JSON.stringify((projectLike.blocks || []).filter((b) => b.personalize && b.personalize.length).map((b) => ({ id: b.id, rules: b.personalize })))};</script>
<script>(${wf.runtimeFn.toString()})(document);</script>
<script>${lazy}</script>
</body>
</html>`;
}

module.exports = { renderPage, listPageSlugs };
