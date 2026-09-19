/* ============================================================
 * WebsFlow · AI 生成服务 (ai.js)
 *
 * 供应商配置:与 OpenFlow 同生态复用 data/ai-config.json(默认 deepseek)
 * 关键设计:模块白名单/字段说明**从 schema 注册表实时派生**
 *   (OpenFlow 血泪教训:手抄白名单会导致 AI 生成整块被丢弃)
 * 输出校验:非白名单类型丢弃、props 与默认值合并、非法项剔除
 * ============================================================ */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { loadWF, FRONT } = require('./wf');

// ---------- 供应商配置 ----------
const CONFIG_PATHS = [
  '/www/wwwroot/nownexts_com/data/ai-config.json', // OpenFlow 同生态配置
  path.join(FRONT, 'api', 'ai-config.json'),       // 本地/独立配置覆盖
  path.join(FRONT, 'data', 'ai-config.json'),
];

const DEFAULT_PROVIDER = {
  api_url: 'https://api.deepseek.com/v1',
  model: 'deepseek-chat',
  api_key: process.env.WEBSFLOW_AI_KEY || '',
};

function loadProvider() {
  for (const p of CONFIG_PATHS) {
    try {
      if (!fs.existsSync(p)) continue;
      const cfg = JSON.parse(fs.readFileSync(p, 'utf8'));
      const list = Array.isArray(cfg.providers) ? cfg.providers : [];
      const wanted = cfg.default_provider
        ? list.find((x) => x.id === cfg.default_provider || x.name === cfg.default_provider || x.model === cfg.default_model)
        : null;
      const prov = wanted || list.find((x) => x.enabled && x.api_key) || list.find((x) => x.api_key);
      if (prov && prov.api_key) {
        return {
          api_url: (prov.api_url || DEFAULT_PROVIDER.api_url).replace(/\/$/, ''),
          model: prov.model || DEFAULT_PROVIDER.model,
          api_key: prov.api_key,
          source: p,
        };
      }
    } catch (e) {
      console.warn('[ai] 读取供应商配置失败:', p, e.message);
    }
  }
  return Object.assign({ source: 'fallback' }, DEFAULT_PROVIDER);
}

// ---------- HTTPS 请求(Node 16 无全局 fetch) ----------
function httpsPostJSON(url, headers, body, timeoutMs) {
  return new Promise((resolve, reject) => {
    let u;
    try { u = new URL(url); } catch (e) { return reject(new Error('AI 接口地址无效')); }
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: u.hostname,
      port: u.port || 443,
      path: u.pathname + u.search,
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }, headers),
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, text: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs || 90000, () => req.destroy(new Error('AI 请求超时(90s)')));
    req.write(data);
    req.end();
  });
}

// ---------- 从 schema 派生模块白名单与字段说明 ----------
function buildSchemaBrief(mode) {
  const WF = loadWF();
  const types = Object.keys(WF.Blocks).filter((t) => WF.Blocks[t].modes.includes(mode));
  const lines = types.map((t) => {
    const def = WF.Blocks[t];
    const fields = (def.fields || []).map((f) => {
      if (f.type === 'list') {
        const sub = (f.itemFields || []).map((sf) => sf.key).join('/');
        return `${f.key}[{${sub}}]`;
      }
      if (f.type === 'select') {
        const opts = (f.options || []).map(([v]) => v === '' ? '""' : v).join('|');
        return `${f.key}(${opts})`;
      }
      return f.key;
    }).join(', ');
    return `- ${t} (${def.name}): ${fields}`;
  }).join('\n');
  return { types, lines };
}

// ---------- Prompt ----------
function buildMessages(prompt, mode) {
  const WF = loadWF();
  const brief = buildSchemaBrief(mode);
  const modeInfo = WF.Modes[mode] || WF.Modes.site;
  const sys = `你是 WebsFlow(投放落地页工场)的内容架构师。把用户的需求变成一份**可直接投放的落地页区块清单**。

形态:${mode}(${modeInfo.name}) —— ${modeInfo.desc}

可用模块类型(只能从中选择,key 必须完全一致):
${brief.lines}

输出要求:
1. 只输出 JSON,结构:{"name":"页面名称","description":"一句话描述","blocks":[{"type":"模块key","props":{...}}]}
2. blocks 6-12 个,按投放叙事排序:主视觉 → 信任 → 痛点 → 方法 → 证明 → 行动(footer 若适用放最后)
3. props 只填模块字段说明里出现的 key;list 字段的值是对象数组(键取 {} 内的子键)
4. 文案必须成品级中文:具体、可信、有动词短语;禁止"示例""文案A"这类占位词
5. 数字类内容给具体量级(如 1000+ / 3.5× / 61%);评价类带姓名与身份
6. 不要输出 Markdown、注释或多余文字`;

  return [
    { role: 'system', content: sys },
    { role: 'user', content: String(prompt || '').slice(0, 1500) || '为一家精品咖啡品牌做新品上市的投放落地页' },
  ];
}

// ---------- 校验与归一化(白名单过滤) ----------
function validateAndNormalize(raw, mode) {
  const WF = loadWF();
  const allowed = new Set(Object.keys(WF.Blocks).filter((t) => WF.Blocks[t].modes.includes(mode)));
  const warnings = [];
  let parsed = raw;
  if (typeof raw === 'string') {
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('AI 未返回 JSON');
    parsed = JSON.parse(m[0]);
  }
  const inBlocks = Array.isArray(parsed.blocks) ? parsed.blocks : [];
  const blocks = [];
  for (const b of inBlocks) {
    if (!b || !allowed.has(b.type)) {
      warnings.push('丢弃非白名单模块:' + (b && b.type));
      continue;
    }
    const def = WF.Blocks[b.type];
    const props = Object.assign(JSON.parse(JSON.stringify(def.defaults || {})), b.props || {});
    // 剔除字段说明里不存在的 key,避免脏数据
    const fieldKeys = new Set((def.fields || []).map((f) => f.key));
    Object.keys(props).forEach((k) => { if (!fieldKeys.has(k)) delete props[k]; });
    blocks.push({ type: b.type, props });
  }
  return {
    name: String(parsed.name || 'AI 生成页面').slice(0, 60),
    description: String(parsed.description || '').slice(0, 120),
    blocks,
    warnings,
  };
}

// ---------- 主入口 ----------
async function generatePage(userId, prompt, mode) {
  const WF = loadWF();
  if (!WF.Modes[mode]) throw new Error('未知形态:' + mode);
  const provider = loadProvider();
  if (!provider.api_key) throw new Error('未配置 AI 供应商密钥');

  const res = await httpsPostJSON(
    provider.api_url + '/chat/completions',
    { Authorization: 'Bearer ' + provider.api_key },
    {
      model: provider.model,
      messages: buildMessages(prompt, mode),
      temperature: 0.8,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    }
  );

  if (res.status !== 200) {
    let msg = 'AI 接口错误(HTTP ' + res.status + ')';
    try { msg += ':' + (JSON.parse(res.text).error && JSON.parse(res.text).error.message || ''); } catch (e) {}
    throw new Error(msg);
  }

  const data = JSON.parse(res.text);
  const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (!content) throw new Error('AI 返回为空');

  const result = validateAndNormalize(content, mode);
  if (!result.blocks.length) throw new Error('AI 未生成有效模块,请换个描述再试');
  result.model = provider.model;
  return result;
}

// ---------- Agent Copilot:对话 + 工具动作 ----------
function buildCopilotMessages(message, mode, blocks, selectedId) {
  const WF = loadWF();
  const brief = buildSchemaBrief(mode);
  const page = (blocks || []).map((b, i) => {
    const def = WF.Blocks[b.type];
    const sum = def && def.summary ? def.summary(b.props || {}) : '';
    return `${i + 1}. id=${b.id} type=${b.type}${sum ? ' 「' + String(sum).slice(0, 20) + '」' : ''}${b.id === selectedId ? ' ← 当前选中' : ''}`;
  }).join('\n') || '(画布为空)';

  const sys = `你是 WebsFlow 编辑器的 Agent Copilot,帮用户改页面。你既能回答问题,也能直接操作画布。

当前形态:${mode}
当前页面模块:
${page}

可用模块类型:
${brief.lines}

输出:只输出 JSON {"reply":"给用户的中文回复(1-3 句,可含 emoji)","actions":[...]}
actions 是数组,支持 1-5 步(多步任务按顺序执行),每步只能是:
- {"action":"add_block","type":"模块key","props":{...}}  追加到页面末尾
- {"action":"update_block","targetId":"模块id","props":{...}}  修改指定模块(只写要改的字段)
- {"action":"remove_block","targetId":"模块id"}  删除指定模块
如果用户只是提问,actions 为 []。文案要成品级中文、具体可信。
多步示例:用户说"做一个完整的产品发布页"→ actions 可包含连续多个 add_block(hero/features/proof/cta)。`;

  return [
    { role: 'system', content: sys },
    { role: 'user', content: String(message || '').slice(0, 800) },
  ];
}

async function copilot(userId, message, mode, blocks, selectedId) {
  const WF = loadWF();
  if (!WF.Modes[mode]) throw new Error('未知形态:' + mode);
  const provider = loadProvider();
  if (!provider.api_key) throw new Error('未配置 AI 供应商密钥');

  const res = await httpsPostJSON(
    provider.api_url + '/chat/completions',
    { Authorization: 'Bearer ' + provider.api_key },
    {
      model: provider.model,
      messages: buildCopilotMessages(message, mode, blocks, selectedId),
      temperature: 0.7,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    }
  );
  if (res.status !== 200) throw new Error('AI 接口错误(HTTP ' + res.status + ')');
  const data = JSON.parse(res.text);
  const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (!content) throw new Error('AI 返回为空');

  const out = JSON.parse(content);
  const allowed = new Set(Object.keys(WF.Blocks).filter((t) => WF.Blocks[t].modes.includes(mode)));
  const result = { reply: String(out.reply || '').slice(0, 600), actions: [] };

  let list = Array.isArray(out.actions) ? out.actions : (out.action ? [out.action] : []);
  list = list.slice(0, 5);

  for (const act of list) {
    if (!act || !act.action) continue;
    if (act.action === 'add_block' && allowed.has(act.type)) {
      const def = WF.Blocks[act.type];
      const fieldKeys = new Set((def.fields || []).map((f) => f.key));
      const props = Object.assign(JSON.parse(JSON.stringify(def.defaults || {})), act.props || {});
      Object.keys(props).forEach((k) => { if (!fieldKeys.has(k)) delete props[k]; });
      result.actions.push({ action: 'add_block', type: act.type, props });
    } else if (act.action === 'update_block') {
      const target = (blocks || []).find((b) => b.id === act.targetId);
      if (!target) continue;
      const def = WF.Blocks[target.type];
      const fieldKeys = new Set((def.fields || []).map((f) => f.key));
      const props = {};
      Object.keys(act.props || {}).forEach((k) => { if (fieldKeys.has(k)) props[k] = act.props[k]; });
      if (Object.keys(props).length) result.actions.push({ action: 'update_block', targetId: target.id, props });
    } else if (act.action === 'remove_block') {
      const target = (blocks || []).find((b) => b.id === act.targetId);
      if (target) result.actions.push({ action: 'remove_block', targetId: target.id });
    }
  }
  return result;
}

// 单轮对话(供定时巡检等使用)
async function chatOnce(messages, opts) {
  opts = opts || {};
  const provider = loadProvider();
  if (!provider.api_key) throw new Error('未配置 AI 供应商密钥');
  const res = await httpsPostJSON(
    provider.api_url + '/chat/completions',
    { Authorization: 'Bearer ' + provider.api_key },
    { model: provider.model, messages, temperature: opts.temperature != null ? opts.temperature : 0.6, max_tokens: opts.maxTokens || 1200 }
  );
  if (res.status !== 200) throw new Error('AI 接口错误(HTTP ' + res.status + ')');
  const data = JSON.parse(res.text);
  return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
}


// ---------- 结构化补丁:把自然语言/数据变成可校验的 ops ----------
const PATCH_SYS = (mode, pageBrief, schemaLines, statsText, lessons) => {
  const base = `你是落地页增长工程师。请把用户的指令转成**结构化补丁 ops**(JSON),不要返回完整页面。

当前形态:${mode}
页面模块(按顺序,id 必须原样使用):
${pageBrief}

可改字段白名单(只能用这些 key):
${schemaLines}`;
  const dataPart = statsText ? `

页面真实数据(近窗口聚合,可能稀疏;稀疏时以转化常识判断,不要编造数字):
${statsText}` : "";
  const lessonPart = lessons ? `

历史经验(来自本账号已结轮的实验,务必参考):
${lessons}` : "";
  return base + dataPart + lessonPart + `

输出严格 JSON:
{"reply":"给用户的中文说明(1-3 句)",
 "hypothesis":"(可选)一句话假设,例如 缩短首屏副标题能提升 CTA 点击",
 "theme":"(可选)本改动的主方向,只能是: specificity | urgency | trust | risk_reversal | offer | clarity | layout | other",
 "goal":"(可选)建议度量的转化目标 id",
 "ops":[
   {"op":"update","id":"模块id","props":{"字段key":"新值"}},
   {"op":"variant","id":"模块id","value":"变体key"},
   {"op":"add","type":"模块类型","props":{...}},
   {"op":"remove","id":"模块id"}
 ]}

硬性要求:
- ops 最多 6 条,只改真正影响转化的地方(标题/副标题/按钮文字/CTA/顺序/信任要素),不要重排整个页面
- 只能使用上面列出的 id 与字段 key;不确定就少改
- 文案要具体、可信、成品级中文,避免"赋能/闭环"这类空话,也不要编造绝对化承诺
- 不要把页面改成另一个主题
- 若给了"历史经验":优先选择胜率高的方向;近期已试过的假设不要重复(换新角度)`;
};

function pageBrief(WF, blocks) {
  return (blocks || []).map((b, i) => {
    const def = WF.Blocks[b.type];
    const sum = def && def.summary ? def.summary(b.props || {}) : "";
    return `${i + 1}. id=${b.id} type=${b.type}${sum ? " 「" + String(sum).slice(0, 24) + "」" : ""}`;
  }).join("\n") || "(页面为空)";
}

function statsText(stats) {
  if (!stats) return "";
  const lines = [];
  lines.push(`近 ${stats.days} 天:曝光 ${stats.views} / 点击 ${stats.clicks}` + (stats.cvr == null ? "" : ` / CVR ${stats.cvr}%`) + ` / 线索 ${stats.leads}`);
  if ((stats.byGoal || []).length) lines.push("目标点击:" + stats.byGoal.map((g) => `${g.goal_id}×${g.n}`).join(", "));
  if ((stats.bySeg || []).length) lines.push("分群表现:" + stats.bySeg.map((s) => `${s.seg} 曝光${s.views}/点击${s.clicks}`).join("; "));
  if ((stats.bySrc || []).length) lines.push("来源表现:" + stats.bySrc.map((s) => `${s.src} 曝光${s.views}/点击${s.clicks}`).join("; "));
  return lines.join("\n");
}

async function patchOps(userId, opts) {
  const WF = loadWF();
  const mode = opts && opts.mode;
  if (!WF.Modes[mode]) throw new Error("未知形态:" + mode);
  const provider = loadProvider();
  if (!provider.api_key) throw new Error("未配置 AI 供应商密钥");
  const brief = buildSchemaBrief(mode);
  const sys = PATCH_SYS(mode, pageBrief(WF, opts.blocks), brief.lines, opts.stats ? statsText(opts.stats) : "", opts.lessons || "");
  const res = await httpsPostJSON(
    provider.api_url + "/chat/completions",
    { Authorization: "Bearer " + provider.api_key },
    {
      model: provider.model,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: String((opts && opts.instruction) || "").slice(0, 900) || "帮我提升这个页面的转化率" },
      ],
      temperature: 0.6,
      max_tokens: 1600,
      response_format: { type: "json_object" },
    }
  );
  const data = JSON.parse(res.text);
  const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (!content) throw new Error("AI 返回为空");
  let parsed;
  try { parsed = JSON.parse(content); } catch (e) { throw new Error("AI 未返回合法 JSON"); }
  const checked = WF.validateOps({ blocks: opts.blocks || [] }, parsed.ops || []);
  const THEMES = ["specificity", "urgency", "trust", "risk_reversal", "offer", "clarity", "layout", "other"];
  const theme = String(parsed.theme || "").toLowerCase().trim();
  return {
    reply: String(parsed.reply || "").slice(0, 400),
    hypothesis: parsed.hypothesis ? String(parsed.hypothesis).slice(0, 200) : "",
    theme: THEMES.includes(theme) ? theme : "other",
    goal: parsed.goal ? String(parsed.goal).slice(0, 60) : "",
    ops: checked.ops,
    rejected: checked.rejected,
    model: provider.model,
  };
}

module.exports = { generatePage, copilot, chatOnce, loadProvider, buildSchemaBrief, patchOps };
