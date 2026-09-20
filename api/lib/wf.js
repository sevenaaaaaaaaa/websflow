/* ============================================================
 * WebsFlow · 前端引擎加载器 (wf.js)
 * 在 Node 中加载前端同一套渲染引擎,供 SSR 与 AI 共用
 * ============================================================ */
const path = require('path');

const FRONT = path.join(__dirname, '..', '..');
let WF = null;

let lastPluginSync = 0;

function loadWF() {
  if (!WF) {
    global.window = global.window || {};
    require(path.join(FRONT, 'js', 'schema.js'));
    global.WF = global.window.WF;
    ['themes.js', 'runtime-css.js', 'render.js', 'templates.js', 'patch.js', 'variants.js',
      'variants-batch-1.js', 'variants-batch-2.js', 'variants-batch-3.js',
      'variants-batch-4.js', 'variants-batch-5.js'].forEach((f) =>
      require(path.join(FRONT, 'js', f))
    );
    WF = global.window.WF;
  }
  // 插件区块:从 DB 注册(5s 节流),保证 SSR 与编辑器一致渲染
  if (Date.now() - lastPluginSync > 5000) {
    lastPluginSync = Date.now();
    try {
      const db = require('../db');
      const plugins = db.getPlugins();
      if (plugins.length && WF.registerPluginBlocks) WF.registerPluginBlocks(plugins);
    } catch (e) { /* DB 未就绪时静默 */ }
  }
  return WF;
}

module.exports = { loadWF, FRONT };
