#!/usr/bin/env node
/* ============================================================
 * WebsFlow · MCP 服务器 (websflow-mcp.js)
 *
 * 把 WebsFlow 的开放工具 API 包成 MCP(JSON-RPC 2.0 / stdio),
 * 任何 MCP 客户端(Claude Desktop、Cursor、自研 Agent)都能直接调用。
 *
 * 零依赖:手写 initialize / tools/list / tools/call。
 *
 * 用法(环境变量):
 *   WEBSFLOW_BASE_URL=https://nownexts.com/webflow   # 默认即此
 *   WEBSFLOW_API_KEY=wfk_xxx                         # 必填(控制台「设置 → API 密钥」创建)
 *
 * 配置示例(Claude Desktop / Cursor 的 mcpServers):
 *   "websflow": {
 *     "command": "node",
 *     "args": ["/绝对路径/mcp/websflow-mcp.js"],
 *     "env": { "WEBSFLOW_BASE_URL": "https://nownexts.com/webflow", "WEBSFLOW_API_KEY": "wfk_..." }
 *   }
 * ============================================================ */
const BASE = (process.env.WEBSFLOW_BASE_URL || 'https://nownexts.com/webflow').replace(/\/$/, '');
const KEY = process.env.WEBSFLOW_API_KEY || '';
const PROTOCOL = '2024-11-05';
const NAME = 'websflow';
const VERSION = '1.0.0';

function send(obj) { process.stdout.write(JSON.stringify(obj) + '\n'); }
function reply(id, result) { send({ jsonrpc: '2.0', id, result }); }
function fail(id, code, message) { send({ jsonrpc: '2.0', id, error: { code, message } }); }

async function api(path, options) {
  const res = await fetch(BASE + '/api/tools' + path, Object.assign({}, options, {
    headers: Object.assign({ 'Content-Type': 'application/json', Authorization: 'Bearer ' + KEY }, (options && options.headers) || {}),
  }));
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch (e) {}
  if (!res.ok) throw new Error((json && (json.error || json.message)) || ('HTTP ' + res.status));
  return json;
}

let toolsCache = null;
async function listTools() {
  if (!toolsCache) {
    const data = await api('/manifest');
    toolsCache = (data.tools || []).map((t) => ({ name: t.name, description: t.description, inputSchema: t.parameters || { type: 'object', properties: {} } }));
  }
  return toolsCache;
}

async function handle(msg) {
  const { id, method, params } = msg;
  try {
    if (method === 'initialize') {
      return reply(id, {
        protocolVersion: PROTOCOL,
        capabilities: { tools: {} },
        serverInfo: { name: NAME, version: VERSION },
      });
    }
    if (method === 'notifications/initialized' || method === 'initialized') return;   // 通知无需回复
    if (method === 'ping') return reply(id, {});
    if (method === 'tools/list') {
      const tools = await listTools();
      return reply(id, { tools });
    }
    if (method === 'tools/call') {
      const name = params && params.name;
      const args = (params && params.arguments) || {};
      if (!name) return fail(id, -32602, '缺少工具名');
      const r = await api('/call', { method: 'POST', body: JSON.stringify({ name, args }) });
      const text = r && r.ok ? JSON.stringify(r.result, null, 2) : JSON.stringify(r || {});
      return reply(id, { content: [{ type: 'text', text }], isError: !(r && r.ok) });
    }
    return fail(id, -32601, '未知方法:' + method);
  } catch (e) {
    if (id === undefined) return;
    return fail(id, -32603, e.message || String(e));
  }
}

let buf = '';
let pending = 0;
let queue = Promise.resolve();
let ended = false;

function schedule(msg) {
  pending++;
  queue = queue.then(() => handle(msg)).catch(() => {}).then(() => {
    pending--;
    if (ended && pending === 0) process.exit(0);
  });
}

process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buf += chunk;
  let idx;
  while ((idx = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, idx).trim();
    buf = buf.slice(idx + 1);
    if (!line) continue;
    let msg = null;
    try { msg = JSON.parse(line); } catch (e) { continue; }
    schedule(msg);   // 串行处理,保证顺序
  }
});
process.stdin.on('end', () => {
  ended = true;
  // 等在途请求完成后退出(之前直接 exit 会丢掉 tools/list 等异步响应)
  if (pending === 0) process.exit(0);
  setTimeout(() => process.exit(0), 15000).unref();
});
if (!KEY) {
  // 缺少密钥时仍然启动,但调用 tools/list 会报错并给出可读提示
  console.error('[websflow-mcp] 未设置 WEBSFLOW_API_KEY,请在客户端配置里提供');
}
