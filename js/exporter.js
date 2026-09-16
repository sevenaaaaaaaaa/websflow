/* ============================================================
 * WebsFlow · 导出与发布 (exporter.js)
 *
 * 理念来源 — MFlow 发布适配器 + 无头 CMS:
 *   - 导出单文件 HTML:内容 + 样式 + 交互全部内联,
 *     上传任意静态空间即可访问(零依赖、零构建)
 *   - 导出 JSON:纯内容包(Sanity/Contentful 的 Portable
 *     Content 思路),可再导入继续编辑,也可喂给其他系统
 *   - 预览 = 以 Blob URL 打开导出产物,预览即真实效果
 * ============================================================ */
window.WF = window.WF || {};

(function (WF) {
  "use strict";

  function download(filename, text, mime) {
    const blob = new Blob([text], { type: mime || "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 400);
  }
  WF.download = download;

  const esc = (s) => WF.esc(s);
  const slug = (s) => String(s || "page").replace(/[^\w\u4e00-\u9fa5-]+/g, "-").slice(0, 40) || "page";

  // ---------- 单文件 HTML ----------
  WF.buildStandaloneHTML = function (project) {
    const g = project.global || {};
    const mode = project.mode;
    const body = WF.renderProject(project, { context: "live" });
    const themePreset = WF.getPreset(project.theme && project.theme.preset);
    const isDark = themePreset.key === "night";
    const title = g.title || project.name || "WebsFlow 页面";

    // PPT 需要 body 不滚动;H5 浅灰底;其余白底
    const bodyStyle = mode === "ppt"
      ? "margin:0;overflow:hidden;background:#0b1020;"
      : mode === "h5"
        ? "margin:0;background:#e2e8f0;"
        : `margin:0;background:${isDark ? "#0f172a" : (project.theme && project.theme.bg) || "#fff"};`;

    return `<!DOCTYPE html>
<html lang="zh-CN" style="scroll-behavior:smooth">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="${esc(g.description || title)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(g.description || "")}">
<title>${esc(title)}</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%234f46e5'/%3E%3Ctext x='16' y='22' font-size='16' fill='white' text-anchor='middle' font-family='sans-serif' font-weight='bold'%3EW%3C/text%3E%3C/svg%3E">
<style>${WF.runtimeCSS}</style>
<style>html,body{${mode === "ppt" ? "height:100%;" : ""}}</style>
</head>
<body style="${bodyStyle}">
${body}
<script>(${WF.runtimeFn.toString()})(document);</script>
</body>
</html>`;
  };

  // ---------- 动作 ----------
  WF.exportHTML = function (project) {
    const html = WF.buildStandaloneHTML(project);
    download(slug(project.name) + ".html", html, "text/html;charset=utf-8");
  };

  WF.exportJSON = function (project) {
    download(slug(project.name) + ".websflow.json", JSON.stringify(WF.exportData(project), null, 2), "application/json");
  };

  // 新窗口预览(用 Blob 保证与导出产物完全一致)
  WF.preview = function (project) {
    const html = WF.buildStandaloneHTML(project);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60 * 1000);
  };

  // 读取 .websflow.json 文件
  WF.readImportFile = function (file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => {
        try { resolve(JSON.parse(r.result)); }
        catch (e) { reject(new Error("文件不是有效的 JSON")); }
      };
      r.onerror = () => reject(new Error("读取文件失败"));
      r.readAsText(file);
    });
  };
})(window.WF);
