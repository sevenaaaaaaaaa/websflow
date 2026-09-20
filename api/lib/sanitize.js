/* ============================================================
 * WebsFlow · 插件 HTML 沙箱净化 (sanitize.js)
 *
 * 插件允许自定义 HTML,因此必须在**服务端**做净化(客户端净化不构成安全边界)。
 * 策略:白名单式思路 + 危险构造黑名单剥离
 *   - 整段移除:<script> <style> <iframe> <object> <embed> <link> <meta> <base> <form> <svg onload>
 *   - 属性级:on* 事件属性、javascript:/vbscript: 协议、expression()、data:text/html
 *   - 保留 {{字段}} 占位符,不影响渲染
 * ============================================================ */

function sanitizePluginHtml(html) {
  let s = String(html == null ? '' : html);

  // 1) 移除危险标签及其内容(script/style 等)
  const dropWithContent = ['script', 'style', 'iframe', 'object', 'embed', 'form', 'template', 'noscript'];
  dropWithContent.forEach((tag) => {
    s = s.replace(new RegExp('<' + tag + '\\b[^>]*>[\\s\\S]*?<\\/' + tag + '>', 'gi'), '');
    s = s.replace(new RegExp('<' + tag + '\\b[^>]*\\/?>', 'gi'), '');
  });
  // 单标签类
  ['link', 'meta', 'base'].forEach((tag) => {
    s = s.replace(new RegExp('<' + tag + '\\b[^>]*>', 'gi'), '');
  });

  // 2) 移除 on* 事件属性(onclick/onerror/onload...)
  s = s.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  // 3) 危险协议与表达式
  s = s.replace(/(href|src|xlink:href|action)\s*=\s*("|')?\s*(javascript|vbscript|data:text\/html)[^"'>\s]*("|')?/gi, '$1="#"');
  s = s.replace(/expression\s*\(/gi, 'blocked(');
  s = s.replace(/url\s*\(\s*("|')?\s*javascript:[^)]*\)/gi, 'none');

  // 4) 清理 style 里的 position:fixed 全屏遮挡(插件不应覆盖整站)
  s = s.replace(/position\s*:\s*fixed/gi, 'position:relative');

  return s.trim();
}

function sanitizeFields(fields) {
  return (Array.isArray(fields) ? fields : []).map((f) => ({
    key: String(f && f.key || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32),
    label: String((f && f.label) || '').slice(0, 40),
    type: ['text', 'textarea', 'image', 'url'].includes(f && f.type) ? f.type : 'text',
    itemFields: Array.isArray(f && f.itemFields) ? f.itemFields.slice(0, 8) : [],
  })).filter((f) => f.key);
}

module.exports = { sanitizePluginHtml, sanitizeFields };
