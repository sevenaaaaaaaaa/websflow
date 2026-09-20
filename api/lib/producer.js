/* ============================================================
 * WebsFlow · 生产流水线 (producer.js)
 *
 * "Flow" 与普通建站工具的差别在这里:一次生产 = 一条可复现的流水线
 *   1) 故事线   —— 先把"对谁说什么、怎么递进"写清楚(scenes 有序,带角色)
 *   2) 模块编排 —— 每个场景映射到**现成模块**(带变体);目录里没有的,现场**造新模块**(插件)
 *   3) 视觉打磨 —— 素材库自动配图 + 版式令牌/变体/底色节奏
 *   4) A/B 版本 —— 按"假设"产出 A/B 两版,带独立 goalId,可直接进实验度量
 *   5) 自动质检 —— 空图位/alt/对比度/空文案/未知模块 全部过闸,能自动修的先修
 *   6) 成套交付 —— 交付包(故事线/假设/素材版权/页面 JSON/编辑入口/发布链接)
 *
 * 客户拿到的是"成品 + 可改":页面已在控制台,可在编辑器继续迭代,改动同样进 A/B 体系。
 * ============================================================ */
const fs = require('fs');
const path = require('path');
const db = require('../db');
const ai = require('./ai');
const assets = require('./asset-library');
const { loadWF } = require('./wf');
const { sanitizePluginHtml } = require('./sanitize');

const DELIVERY_DIR = path.join(__dirname, '..', '..', 'data', 'deliveries');

// LLM 调用必须有硬超时:供应商不可达时 TCP 连接可能永久挂起,流水线不能跟着卡死
function withTimeout(promise, ms, label) {
  let t = null;
  return Promise.race([
    promise,
    new Promise((_, rej) => { t = setTimeout(() => rej(new Error((label || 'LLM') + ' 超时(' + ms + 'ms)')), ms); }),
  ]).finally(() => { if (t) clearTimeout(t); });
}
const LLM_TIMEOUT = Number(process.env.WF_LLM_TIMEOUT_MS) || 25000;

function parseJSON(text) {
  if (!text) return null;
  const s2 = String(text).trim().replace(/^```(?:json)?/i, '').replace(/```$/, '');
  const i = s2.indexOf('{'), j = s2.lastIndexOf('}');
  if (i < 0 || j < 0) return null;
  try { return JSON.parse(s2.slice(i, j + 1)); } catch (e) { return null; }
}

// 模块范式库:借鉴知名站点/开源设计系统的**结构范式**(用引擎令牌自研实现,不复制代码)
let PATTERNS = { patterns: [] };
try { PATTERNS = require('./module-patterns.json'); } catch (e) { /* 无范式库时退回 AI 生成 */ }

// 场景角色 → 现成模块(类型 + 首选变体)。“造新模块”的角色单独标记 custom。
const ROLE_MODULE = {
  hero: { type: 'hero', variant: 'split' },
  proof: { type: 'proof', variant: 'band' },
  logos: { type: 'logo-wall', variant: 'cards' },
  problem: { type: 'cluster', variant: 'spotlight' },
  how: { type: 'journey', variant: 'split' },
  agenda: { type: 'timeline', variant: null },
  countdown: { type: 'countdown', variant: null },
  features: { type: 'features', variant: 'cards' },
  metrics: { type: 'stats', variant: 'cards' },
  testimonial: { type: 'testimonials', variant: 'masonry' },
  gallery: { type: 'gallery', variant: 'mosaic' },
  objection: { type: 'faq', variant: 'accordion' },
  offer: { type: 'pricing', variant: null },
  cta: { type: 'cta', variant: 'floating' },
  signup: { type: 'form', variant: 'grid' },
  community: { type: 'social', variant: 'tiles' },
  custom: { type: 'custom', variant: null },
};

const ROLE_LABEL = {
  hero: '首屏主张', proof: '信任背书', logos: '客户矩阵', problem: '痛点', how: '方法/步骤',
  agenda: '流程/日程', countdown: '开场倒计时', features: '能力', metrics: '数据', testimonial: '口碑', gallery: '现场/作品',
  objection: '疑虑解答', offer: '报价/权益', cta: '行动召唤', signup: '留资/报名', community: '关注',
  custom: '新模块',
};

// 自我进化:按历史胜率给范式加权(样本少时不放大波动)
function patternWeight(userId, key, statsMap) {
  try {
    const row = statsMap && statsMap[key];
    if (!row) return 1;
    const n = (row.wins || 0) + (row.losses || 0);
    if (n < 2) return 1;
    const rate = (row.wins || 0) / n;
    const qaPenalty = 1 - Math.min(0.3, 0.06 * (row.qa_issues || 0));
    return +(0.8 + rate * 0.5).toFixed(2) * qaPenalty;
  } catch (e) { return 1; }
}

function pickPattern(scene, brief) {
  const text = [scene.pattern, scene.moduleIdea, scene.heading, scene.sub, (scene.points || []).join(' '), brief.business, brief.product]
    .filter(Boolean).join(' ').toLowerCase();
  let best = null, bestN = 0;
  const statsMap = {};
  try {
    (require('../db').listPatternStats(brief.user_id) || []).forEach((r) => { statsMap[r.pattern_key] = r; });
  } catch (e) { /* 无统计时按 1.0 权重 */ }
  let pool = (PATTERNS.patterns || []).slice();
  try {
    const partner = require('./pattern-packs').asPatterns(brief.user_id);
    if (partner.length) pool = pool.concat(partner);      // 伙伴范式与内置同池竞争
  } catch (e) { /* 无伙伴包时忽略 */ }
  pool.forEach((pt) => {
    let n = 0;
    if (scene.pattern && scene.pattern === pt.key) n += 10;
    else if ((pt.roles || []).includes(scene.role)) n += 3;
    (pt.tags || []).forEach((t) => { if (t && text.includes(String(t).toLowerCase())) n += 2; });
    n *= patternWeight(brief.user_id, pt.key, statsMap);
    if (n > bestN) { bestN = n; best = pt; }
  });
  return bestN >= 3 ? best : null;
}

// 把范式 + 场景内容实例化成插件规范
function patternToSpec(pt, scene, brief) {
  const blockType = pt.block_type || ('pat_' + pt.key);
  const items = (scene.points || []).slice(0, 6).map((t, i) => ({ kicker: '', text: String(t).slice(0, 22), desc: '', span: i === 0 ? 'wide' : '' }));
  const props = {
    title: scene.heading || pt.name,
    lead: scene.sub || '',
    kicker: ROLE_LABEL[scene.role] || '',
    ctaText: scene.cta || brief.ctaText || '了解更多',
    items,
    cols: [{ name: '传统做法', desc: '' }, { name: brief.business || '我们', desc: '' }],
    rows: (scene.points || []).slice(0, 5).map((t, i) => ({ label: '维度 ' + (i + 1), a: '—', b: String(t).slice(0, 18) })),
    quotes: (scene.points || []).slice(0, 3).map((t) => ({ text: String(t), name: '客户', role: '' })),
    beforeLabel: '之前', before: (scene.points || [])[0] || '', afterLabel: '之后', after: (scene.points || [])[1] || '',
  };
  return { block_type: blockType, name: pt.name, description: '范式模块:' + pt.name + '(参考 ' + pt.ref + ')',
    fields: pt.fields, template: sanitizePluginHtml(pt.template), props, pattern: pt };
}

const PATTERN_BRIEF = () => (PATTERNS.patterns || []).map((pt) => `- ${pt.key}(${pt.name},参考 ${pt.ref}):适用 ${pt.roles.join('/')} · ${pt.tags.slice(0, 5).join('、')}`).join('\n');

// 各形态的必备场景骨架:AI 漏掉的结构,这里按业务补齐(而不是让页面缺胳膊少腿)
const SKELETON = {
  site: ['hero', 'proof', 'problem', 'how', 'features', 'metrics', 'testimonial', 'objection', 'cta', 'signup'],
  h5: ['hero', 'countdown', 'agenda', 'gallery', 'testimonial', 'objection', 'signup', 'community'],
  ppt: ['hero', 'problem', 'features', 'metrics', 'cta'],
  story: ['hero', 'problem', 'how', 'proof', 'cta'],
};

function sceneFor(role, brief, existing) {
  const tags = brief.mediaTags || [];
  const base = { role, points: [], imageTags: tags };
  switch (role) {
    case 'countdown':
      return Object.assign(base, { heading: brief.countdownTitle || '距离开场还有', points: [], eventDate: brief.eventDate || '' });
    case 'agenda':
      return Object.assign(base, { heading: brief.agendaTitle || '流程安排', points: brief.agenda || ['签到入场', '主场开演', '现场环节', '压轴场'] });
    case 'gallery':
      return Object.assign(base, {
        heading: brief.galleryTitle || '现场/作品', points: [],
        galleryCaptions: brief.galleryCaptions || (tags.length >= 3 ? tags.slice(0, 4) : ['现场 01', '现场 02', '现场 03', '现场 04']),
      });
    case 'community':
      return Object.assign(base, { heading: '关注我们' });
    case 'logos':
      return Object.assign(base, { heading: '他们已经在用', points: brief.clients || ['客户 A', '客户 B', '客户 C', '客户 D'] });
    case 'metrics':
      return Object.assign(base, { heading: '结果口径', points: ['曝光→点击', '点击→线索', '线索成本', '决策周期'] });
    case 'objection':
      return Object.assign(base, { heading: '你可能想问', points: ['这和普通方案有什么区别', '需要我投入多少', '多久能看到结果'] });
    case 'testimonial':
      return Object.assign(base, { heading: '他们怎么说', quote: brief.testimonialQuote || '' });
    case 'signup':
      return Object.assign(base, { heading: '留下联系方式', sub: '我们会在 1 个工作日内联系你' });
    default:
      return Object.assign(base, { heading: ROLE_LABEL[role] || role, sub: '' });
  }
}

function ensureSkeleton(storyline, brief) {
  const mode = brief.mode || 'site';
  const need = SKELETON[mode] || SKELETON.site;
  const have = new Set((storyline.scenes || []).map((x) => x.role));
  const added = [];
  const order = ['hero', 'countdown', 'proof', 'logos', 'problem', 'how', 'agenda', 'gallery', 'features', 'metrics', 'testimonial', 'objection', 'custom', 'offer', 'cta', 'signup', 'community'];
  const insertAfter = (role, list) => {
    const idx = order.indexOf(role);
    let at = list.length;
    for (let i = list.length - 1; i >= 0; i--) {
      if (order.indexOf(list[i].role) <= idx) { at = i + 1; break; }
      at = i;
    }
    list.splice(Math.max(1, Math.min(at, list.length)), 0, sceneFor(role, brief, have));
    have.add(role);
    added.push(role);
  };
  need.forEach((role) => { if (!have.has(role)) insertAfter(role, storyline.scenes); });
  storyline.scenes.sort((a, b) => {
    const ia = order.indexOf(a.role), ib = order.indexOf(b.role);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  storyline._addedScenes = added;
  return storyline;
}

// 范式增强:brief/故事线里出现表格、对比、指标墙、客户矩阵等诉求时,
// 用范式库(内置 + 伙伴)现造一个「新模块」场景,结构来自成熟范式而不是硬编
function enrichWithPatterns(storyline, brief) {
  const text = [brief.business, brief.product, brief.audience, brief.goal, brief.offer,
    (brief.mustHave || []).join(' '), (brief.mediaTags || []).join(' '),
    storyline.angle, storyline.promise, (storyline.scenes || []).map((x) => x.heading + ' ' + (x.sub || '')).join(' ')]
    .filter(Boolean).join(' ').toLowerCase();
  const used = (storyline.scenes || []).map((x) => x.pattern).filter(Boolean);
  let pool = (PATTERNS.patterns || []).slice();
  try {
    const partner = require('./pattern-packs').asPatterns(brief.user_id);
    if (partner.length) pool = pool.concat(partner);   // 伙伴范式同样可以补齐故事线
  } catch (e) {}
  const scored = [];
  pool.forEach((pt) => {
    if (used.includes(pt.key)) return;
    let n = 0;
    (pt.tags || []).forEach((t) => { if (t && text.includes(String(t).toLowerCase())) n += 1; });
    if (n >= (pt.partner ? 2 : 1)) scored.push({ pt, n });
  });
  scored.sort((a, b) => b.n - a.n);            // 匹配度高的先进(伙伴/内置同池竞争)
  const adds = scored.slice(0, 2).map((x) => x.pt);
  if (!adds.length) return storyline;
  adds.forEach((pt) => {
    const pts = (storyline.scenes.find((x) => x.role === 'features' || x.role === 'metrics') || {}).points || [];
    const scene = {
      role: 'custom', pattern: pt.key, moduleIdea: `${pt.name}(参考 ${pt.ref})`,
      heading: pt.name, sub: '来自成熟范式,自动补齐这一屏',
      points: pts.length ? pts.slice(0, 4) : ['要点一', '要点二', '要点三'],
      _patternAdded: true,
    };
    const list = storyline.scenes;
    const order = ['hero', 'countdown', 'proof', 'logos', 'problem', 'how', 'agenda', 'gallery', 'features', 'metrics', 'testimonial', 'objection', 'custom', 'offer', 'cta', 'signup', 'community'];
    let at = list.length - 1;
    for (let i = list.length - 1; i >= 0; i--) { if (order.indexOf(list[i].role) <= order.indexOf('custom')) { at = i + 1; break; } }
    list.splice(Math.max(1, Math.min(at, list.length - 1)), 0, scene);
  });
  storyline._patterns = adds.map((x) => x.key);
  return storyline;
}

const STORY_SYS = `你是转化叙事设计师(不是文案机器)。请先设计**故事线**,再写文案。
要求:
- 故事线必须"先信任 → 再痛点 → 再方法 → 最后行动",避免一上来就推销
- 每个场景要有明确角色(role),只能从这些里选:hero, proof, logos, problem, how, agenda, features, metrics, testimonial, gallery, objection, offer, cta, signup, community, custom
- "custom" 表示现有模块表达不了、需要现造一个新模块的角色(最多 1 个),要在 moduleIdea 里说明这个模块长什么样
- 数据/承诺必须克制可信,不要编造绝对化承诺
输出严格 JSON:
{"title":"页面标题(用于 SEO/分享)","angle":"一句话切入角度","audience":"受众","promise":"核心承诺",
 "scenes":[{"role":"hero","heading":"主标题","sub":"副标题/说明","points":["要点1","要点2"],"quote":"(可选)引用","cta":"(可选)按钮文案","imageTags":["用于配图的关键词"]}],
 "hypotheses":[{"key":"A","statement":"对照版假设"},{"key":"B","statement":"B 版假设(改动哪一处、为什么可能更好)"}]}
场景数量 6-9 个;points 每条不超过 24 字;文案用简体中文,短句,不用"赋能/闭环/生态"这类空话。`;

function heuristicStoryline(brief) {
  const brand = brief.brand || brief.business || '我们';
  const audience = brief.audience || '目标客户';
  const offer = brief.offer || brief.product || '核心服务';
  return {
    title: `${brand} · ${offer}`,
    angle: '先建立信任,再给可执行的下一步',
    audience,
    promise: brief.goal || '把流量变成可衡量的结果',
    scenes: [
      { role: 'hero', heading: brief.headline || `${offer},让每一分投入看得见结果`, sub: brief.subheadline || `面向${audience},${brief.goal || '用数据把转化做扎实'}。`, points: [], cta: brief.ctaText || '立即咨询', imageTags: brief.mediaTags || [] },
      { role: 'proof', heading: '他们已经在用', sub: '同一套方法,可复制的交付', points: [], imageTags: [] },
      { role: 'problem', heading: '常见的三个卡点', sub: '不是不够努力,是链路有洞', points: ['有流量没转化', '不知道哪版更好', '触点口径不一致'] },
      { role: 'how', heading: '我们怎么做', sub: '四步,把想法变成可投放的页面', points: ['诊断', '开方', '落地', '放大'] },
      { role: 'features', heading: '你得到的四件事', sub: '每一件都对应一个抓手', points: ['模块化出页', '按人换内容', '实时看转化', '自动择优'] },
      { role: 'metrics', heading: '结果口径', sub: '只用可验证的指标说话', points: ['曝光→点击', '点击→线索', '线索成本', '决策周期'] },
      { role: 'testimonial', heading: '他们怎么说', sub: '', points: [], quote: brief.testimonialQuote || '' },
      { role: 'objection', heading: '你可能想问', sub: '', points: [] },
      { role: 'cta', heading: '下一步很简单', sub: brief.ctaSub || '留下联系方式,1 个工作日内给你一份诊断结论', points: [], cta: brief.ctaText || '立即咨询' },
      { role: 'signup', heading: '留下联系方式', sub: '我们会在 1 个工作日内联系你', points: [] },
    ],
    hypotheses: [
      { key: 'A', statement: '原始叙事顺序作为对照' },
      { key: 'B', statement: '把首屏承诺改成"具体结果 + 低风险下一步",并提前社会证明' },
    ],
  };
}

async function planStoryline(brief) {
  let plan = null;
  try {
    const msg = [
      { role: 'system', content: STORY_SYS },
      { role: 'user', content: `业务/品牌:${brief.business || brief.brand || ''}
产品/服务:${brief.product || brief.offer || ''}
受众:${brief.audience || ''}
目标:${brief.goal || ''}
语气:${brief.tone || '务实、清晰'}
形态:${brief.mode || 'site'}
必须出现的信息:${(brief.mustHave || []).join(';') || '(无)'}
素材线索:${(brief.mediaTags || []).join('、') || '(无)'}` },
    ];
    const out = await withTimeout(ai.chatOnce(msg, { temperature: 0.5, maxTokens: 2600 }), LLM_TIMEOUT, '故事线');
    plan = parseJSON(out);
  } catch (e) { plan = null; }
  if (!plan || !Array.isArray(plan.scenes) || !plan.scenes.length) {
    plan = heuristicStoryline(brief);
    plan._fallback = true;
  }
  plan.scenes.forEach((s) => {
    if (!String(s.heading || '').trim()) {
      const d = sceneFor(ROLE_MODULE[s.role] ? s.role : 'features', brief, null);
      s.heading = d.heading || (ROLE_LABEL[s.role] || '');
    }
    if (!String(s.sub || '').trim() && Array.isArray(s.points) && s.points.length) s.sub = s.points.slice(0, 2).join('、');
  });
  plan.scenes = plan.scenes.slice(0, 10).map((s, i) => Object.assign({}, s, {
    role: ROLE_MODULE[s.role] ? s.role : 'features',
    points: Array.isArray(s.points) ? s.points.slice(0, 6) : [],
    imageTags: Array.isArray(s.imageTags) ? s.imageTags : [],
    _i: i,
  }));
  if (!Array.isArray(plan.hypotheses) || plan.hypotheses.length < 2) plan.hypotheses = heuristicStoryline(brief).hypotheses;
  return plan;
}

// ---------- 2) 模块编排(含现场造新模块) ----------
const NEW_MODULE_SYS = `你在给一个页面引擎"现造一个新模块"。输出严格 JSON:
{"block_type":"custom_<小写英文标识>","name":"中文模块名","description":"一句话说明","fields":[{"key":"title","label":"标题","type":"text"}],"template":"HTML 模板"}
规则:
- template 只能用简单 HTML(div/h2/h3/p/ul/li/span/strong/img),可用 {{title}} 这类字段占位;列表用 {{#items}}...{{/items}} 且子键为 {{text}}
- 不允许 <script>/<style>/on* 事件/iframe;不要外链图片
- 结构里必须包含一个标题和一个要点列表;视觉交给引擎的 --wf-* 变量,不要写死颜色
- block_type 必须以 custom_ 开头;template 长度 < 2500 字`;

async function createNewModule(scene, brief) {
  const wf = loadWF();
  // ① 先看有没有可复用的「范式模块」——新模块来自知名站点的成熟结构,而不是现编
  const pt = pickPattern(scene, brief);
  if (pt) {
    const spec = patternToSpec(pt, scene, brief);
    try { db.bumpPatternStat(brief.user_id, pt.key, { uses: 1 }); } catch (e) {}
    if (!wf.Blocks[spec.block_type]) {
      try { db.createPlugin(brief.user_id, spec.name, spec.block_type, spec.description, spec.fields, spec.template, 0); } catch (e) {}
      wf.registerPluginBlocks([{ block_type: spec.block_type, name: spec.name, description: spec.description, fields: spec.fields, template: spec.template }]);
    }
    return { type: spec.block_type, created: true, template: spec.template, fields: spec.fields, ai: false, pattern: pt.key, ref: pt.ref };
  }
  // ② 范式库里没有 → 让 AI 生成,但要求它**遵循列出的范式**而不是凭空发挥
  const slug = 'custom_' + String(scene.role === 'custom' ? (scene.moduleIdea || 'scene') : scene.role)
    .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 24) + '_' + Math.abs(hash(String(scene.heading || '') + scene._i)).toString(36).slice(0, 4);
  if (wf.Blocks[slug]) return { type: slug, created: false, template: null, fields: null };
  const fallbackTpl = `<div class="wb-inner" style="display:grid;gap:14px">
  <div style="display:inline-flex;align-items:center;gap:8px;font-size:.85em;font-weight:700;color:var(--wf-primary);letter-spacing:.08em;text-transform:uppercase">{{kicker}}</div>
  <h2 style="margin:0;font-size:1.6em;line-height:1.25">{{title}}</h2>
  <p style="margin:0;color:var(--wf-muted)">{{lead}}</p>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-top:6px">
    {{#items}}<div style="padding:16px;border:1px solid var(--wf-border);border-radius:calc(var(--wf-radius,14px));background:var(--wf-surface)"><strong>{{text}}</strong>{{desc}}</div>{{/items}}
  </div>
</div>`;
  let spec = null;
  try {
    const out = await withTimeout(ai.chatOnce([
      { role: 'system', content: NEW_MODULE_SYS + '\n\n可参考的成熟范式(必须贴近其中之一,不要另创风格):\n' + PATTERN_BRIEF() },
      { role: 'user', content: `场景角色:${scene.role}(${ROLE_LABEL[scene.role] || ''})
模块设想:${scene.moduleIdea || scene.heading || ''}
内容:标题「${scene.heading || ''}」说明「${scene.sub || ''}」要点:${(scene.points || []).join(' / ') || '(无)'}
业务:${brief.business || ''} | 受众:${brief.audience || ''}` },
    ], { temperature: 0.3, maxTokens: 1400 }), Math.min(LLM_TIMEOUT, 20000), '新模块');
    spec = parseJSON(out);
  } catch (e) { spec = null; }
  const ok = spec && typeof spec.template === 'string' && spec.template.length > 40
    && spec.template.length < 4000 && !/<script|on\w+\s*=|javascript:/i.test(spec.template);
  const blockType = ok && /^custom_[a-z0-9_]{3,40}$/.test(String(spec.block_type || '')) ? spec.block_type : slug;
  if (wf.Blocks[blockType]) return { type: blockType, created: false, template: null, fields: null };
  const fields = ok && Array.isArray(spec.fields) && spec.fields.length ? spec.fields : [
    { key: 'kicker', label: '标签', type: 'text' },
    { key: 'title', label: '标题', type: 'text' },
    { key: 'lead', label: '说明', type: 'textarea' },
    { key: 'items', label: '要点', type: 'list', itemFields: [{ key: 'text', label: '要点', type: 'text' }, { key: 'desc', label: '补充', type: 'text' }] },
  ];
  const template = sanitizePluginHtml(ok ? spec.template : fallbackTpl);
  const name = (spec && spec.name) || (ROLE_LABEL[scene.role] || '新模块');
  const description = (spec && spec.description) || '由生产流水线生成(参考范式库)';
  try { db.createPlugin(brief.user_id, name, blockType, description, fields, template, 0); } catch (e) {}
  const spec2 = { block_type: blockType, name, description, fields, template };
  wf.registerPluginBlocks([spec2]);
  return { type: blockType, created: true, template, fields, ai: !!ok, spec: spec2, pattern: (spec && spec.pattern) || null };
}

function blockOf(wf, role, scene, brief, idx) {
  const map = ROLE_MODULE[role] || ROLE_MODULE.features;
  const b = (wf.Blocks[map.type] ? wf.newBlock(map.type) : null) || { id: 'b' + idx, type: map.type, props: {}, style: {}, hidden: false };
  if (map.variant) b.variant = map.variant;
  b.style = Object.assign({}, b.style, { anim: idx === 0 ? 'none' : 'up' });
  const p = b.props = b.props || {};
  const pts = scene.points || [];
  switch (role) {
    case 'hero':
      p.badge = scene.badge || brief.badge || '';
      p.title = scene.heading || brief.headline || '';
      p.subtitle = [scene.sub, pts.slice(0, 2).join('、')].filter(Boolean).join(' ');
      p.btnText = scene.cta || brief.ctaText || '立即咨询';
      p.btnLink = '#signup';
      p.btn2Text = scene.secondaryCta || '';
      p.btn2Link = '#how';
      p.bgType = 'gradient';
      p.gradient = brief.heroGradient || 'indigo';
      p.align = 'left';
      break;
    case 'proof':
      p.cols = '3';
      p.items = (scene.values && scene.values.length ? scene.values.slice(0, 3) : (pts.length ? pts : []).slice(0, 3).map((t, i) => ({ value: '', label: t })))
        .map((it, i) => {
          if (it && typeof it === 'object') return { value: String(it.value || ''), label: String(it.label || '') };
          return { value: '', label: String(it) };
        });
      // 数值缺失时用业务自身的关键信息兜底(B 端用交付口径,活动页用天数/组数/票量)
      if (!p.items.length || p.items.every((x) => !x.label)) {
        const isEvent = ['h5', 'story'].includes(brief.mode) || /节|演出|活动|发布会|市集|课程|训练营/.test(brief.business || '');
        p.items = isEvent
          ? [{ value: brief.eventDays || '2 天', label: '活动时长' }, { value: brief.lineupCount || '12 组', label: '演出阵容' }, { value: brief.ticketTarget || '限 800 张', label: '票量' }]
          : [{ value: brief.proofA || '30 分钟', label: '免费诊断' }, { value: brief.proofB || '7 天', label: '出具方案' }, { value: brief.proofC || '全程可查', label: '数据留痕' }];
      }
      p.note = scene.sub || '';
      break;
    case 'logos':
      p.title = scene.heading || ''; p.subtitle = scene.sub || '';
      p.items = (pts.length ? pts : ['客户 A', '客户 B', '客户 C', '客户 D', '客户 E', '客户 F']).slice(0, 8).map((n) => ({ name: n }));
      break;
    case 'problem':
      p.title = scene.heading; p.subtitle = scene.sub || ''; p.cols = String(Math.min(3, Math.max(2, pts.length || 2)));
      p.items = (pts.length ? pts : ['卡点一', '卡点二', '卡点三']).filter((t) => t && typeof t === 'object' || true).slice(0, 3)
        .map((t, i) => (t && typeof t === 'object') ? t : { icon: ['📉', '🎯', '🔗'][i] || '•', title: String(t).slice(0, 14), desc: '' });
      break;
    case 'how':
      p.title = scene.heading; p.align = 'center';
      p.items = pts.slice(0, 6).map((t) => ({ title: t, desc: '' }));
      break;
    case 'agenda':
      p.title = scene.heading;
      p.items = pts.slice(0, 6).map((t, i) => ({ time: '', title: t, desc: '' , _i: i }));
      break;
    case 'features':
      p.title = scene.heading; p.subtitle = scene.sub || ''; p.cols = '3';
      p.items = pts.slice(0, 6).map((t, i) => ({ icon: ['🧩', '👥', '📈', '⚡', '🛡️', '🧾'][i] || '•', title: String(t).slice(0, 16), desc: '' }));
      break;
    case 'metrics':
      p.cols = '4';
      p.items = pts.slice(0, 4).map((t) => ({ value: '', suffix: '', label: String(t) }));
      break;
    case 'testimonial':
      p.title = scene.heading; p.cols = '3';
      p.items = (Array.isArray(scene.quotes) && scene.quotes.length ? scene.quotes : [{ quote: scene.quote || scene.sub || '', name: '客户', role: '' }])
        .slice(0, 3).map((q) => ({ quote: q.quote || String(q), name: q.name || '客户', role: q.role || '' }));
      break;
    case 'gallery':
      p.title = scene.heading; p.cols = '2';
      p.items = (scene.galleryCaptions || ['现场 01', '现场 02', '现场 03', '现场 04']).map((c) => ({ image: '', caption: String(c).slice(0, 14) }));
      break;
    case 'countdown':
      p.title = scene.heading || '倒计时';
      p.target = brief.eventDate || scene.eventDate || '';
      p.note = brief.countdownNote || '';
      break;
    case 'objection':
      p.title = scene.heading || '你可能想问';
      p.items = (Array.isArray(scene.points) && scene.points.length ? scene.points : ['这和普通方案有什么区别?', '需要我投入多少时间?', '多久能看到结果?'])
        .slice(0, 5).map((q) => ({ q: String(q).replace(/[?？]$/, '') + '?', a: '我们会在诊断后按你的情况给出明确答复。' }));
      break;
    case 'offer': {
      p.title = scene.heading || brief.offerTitle || '报价/权益';
      p.subtitle = scene.sub || '';
      p.align = 'center'; p.cols = '3';
      const plans = Array.isArray(scene.plans) && scene.plans.length ? scene.plans : null;
      if (plans) {
        p.items = plans.slice(0, 3).map((pl, i) => ({
          name: pl.name || '方案' + (i + 1), price: String(pl.price || ''), unit: pl.unit || '',
          desc: pl.desc || '', feats: Array.isArray(pl.feats) ? pl.feats.join('\n') : String(pl.feats || ''),
          badge: pl.badge || '', featured: pl.featured ? 'featured' : '', btnText: pl.btnText || (scene.cta || brief.ctaText || '选择'),
        }));
      } else {
        // 从 brief 的报价信息生成档位(早鸟/常规 或 单档)
        const price = brief.price || '¥299';
        const price2 = brief.price2 || '';
        p.items = [
          { name: brief.offerName || '早鸟票', price: String(price).replace(/[^0-9¥￥.]/g, '') || '¥299', unit: brief.priceUnit || '', desc: brief.offerDesc || '限时发售,售完即止', feats: (pts.length ? pts : ['两天全场通票', '市集入场', '限定周边']).slice(0, 4).join('\n'), badge: '早鸟', featured: 'featured', btnText: scene.cta || brief.ctaText || '立即抢票' },
        ];
        if (price2) p.items.push({ name: brief.offerName2 || '常规票', price: String(price2).replace(/[^0-9¥￥.]/g, ''), unit: brief.priceUnit || '', desc: '正式开售价', feats: ['两天全场通票', '市集入场'].join('\n'), badge: '', featured: '', btnText: '购票' });
        else p.items.push({ name: brief.offerName2 || '双人套票', price: '¥' + (parseInt(String(price).replace(/[^0-9]/g, ''), 10) * 2 - 50 || 548), unit: '', desc: '两人同行更划算', feats: ['两天全场通票 ×2', '限定周边 ×2'].join('\n'), badge: '划算', featured: '', btnText: '抢双人票' });
      }
      break;
    }
    case 'cta':
      p.title = scene.heading; p.subtitle = scene.sub || ''; p.style = 'gradient';
      p.btnText = scene.cta || brief.ctaText || '立即咨询'; p.btnLink = '#signup';
      p.goalId = brief.goalId || 'produce-cta';
      break;
    case 'signup':
      p.title = scene.heading || '留下联系方式'; p.subtitle = scene.sub || ''; p.align = 'center';
      p.fields = [
        { label: '姓名', type: 'text', required: 'true', placeholder: '请输入姓名' },
        { label: '手机号', type: 'tel', required: 'true', placeholder: '请输入手机号' },
        { label: '需求备注', type: 'textarea', required: '', placeholder: '想解决的问题' },
      ];
      p.submitText = '提交'; p.successMessage = '提交成功,我们会尽快联系你。';
      p.goalId = brief.goalId || 'produce-lead'; p.formId = p.goalId;
      break;
    case 'community':
      p.title = scene.heading || '关注我们'; p.align = 'center';
      p.items = [
        { platform: 'wechat', label: '微信公众号', url: '', qr: '' },
        { platform: 'xiaohongshu', label: '小红书', url: '' },
        { platform: 'douyin', label: '抖音', url: '' },
      ];
      break;
    default:
      p.title = scene.heading; p.subtitle = scene.sub || '';
      p.items = pts.slice(0, 5).map((t) => ({ text: String(t), desc: '' }));
  }
  scene._blockId = b.id;
  return b;
}

// ---------- 3) 视觉打磨:自动配图 + 令牌 ----------
function collectImageSlots(blocks) {
  const slots = [];
  (blocks || []).forEach((b) => {
    const p = b.props || {};
    if (b.type === 'hero' && b.variant === 'split' && !p.image) slots.push({ block: b, key: 'image', role: 'hero', tags: [] });
    if (b.type === 'hero' && p.bgType === 'image' && !p.image) slots.push({ block: b, key: 'image', role: 'hero', tags: [] });
    if (b.type === 'gallery') (p.items || []).forEach((it) => { if (!it.image) slots.push({ block: b, item: it, key: 'image', role: 'gallery', tags: [it.caption] }); });
    if (b.type === 'testimonials') (p.items || []).forEach((it) => { if (!it.avatar && b.variant === 'cards') slots.push({ block: b, item: it, key: 'avatar', role: 'testimonial', tags: [] }); });
    if (b.type === 'team') (p.items || []).forEach((it) => { if (!it.avatar) slots.push({ block: b, item: it, key: 'avatar', role: 'testimonial', tags: [it.name] }); });
    if (b.type === 'showcase' || b.type === 'portfolio' || b.type === 'blog') (p.items || []).forEach((it) => { if (!it.image) slots.push({ block: b, item: it, key: 'image', role: 'gallery', tags: [it.title] }); });
    if (b.type === 'hotspot' && !p.image) slots.push({ block: b, key: 'image', role: 'gallery', tags: [] });
  });
  return slots;
}

function autofillImages(blocks, brief, seed) {
  const used = [];
  const industry = brief.industry || assets.guessIndustry(brief);
  const slots = collectImageSlots(blocks);
  // 图集/多图场景:优先成组取图,保证一张张不重复
  const galleryBlocks = (blocks || []).filter((b) => b.type === 'gallery' && (b.props.items || []).some((it) => !it.image));
  galleryBlocks.forEach((gb, gi) => {
    const tags = (brief.mediaTags || []).concat((gb.props.items || []).map((it) => it.caption).filter(Boolean));
    const picks = assets.pickMany('gallery', tags, (gb.props.items || []).length || 4, seed + '-g' + gi, used.map((u) => u.id), industry);
    (gb.props.items || []).forEach((it, i) => {
      if (it.image) return;
      const a = picks[i % picks.length];
      it.image = a ? a.url : assets.fallbackVisual(it.caption || brief.business || '现场', 232 + i * 12);
      if (a) used.push(a);
    });
  });
  slots.filter((s) => s.block.type !== 'gallery').forEach((s, i) => {
    const tags = (brief.mediaTags || []).concat(s.tags || []);
    const a = assets.pick(s.role, tags, seed + '-' + s.role + i, industry);
    const url = a ? a.url : assets.fallbackVisual(s.tags[0] || brief.business || s.role, 220 + i * 16);
    if (s.item) s.item[s.key] = url; else s.block.props[s.key] = url;
    if (a) used.push(a);
  });
  return used;
}

function polish(page, brief) {
  const theme = page.data.theme = Object.assign({}, page.data.theme || {});
  theme.preset = theme.preset || brief.preset || 'indigo';
  theme.fontScale = theme.fontScale || 1.06;
  theme.radius = theme.radius || 16;
  theme.layout = Object.assign({ sectionY: 76, gutter: 26, gap: 20, cardPad: 28, container: 1160, shadow: 'medium' }, theme.layout || {});
  // 底色节奏:每隔两个模块给一层浅底,避免"一白到底"
  page.data.blocks.forEach((b, i) => {
    if (!b.style) b.style = {};
    if (i > 0 && i % 3 === 0 && !b.style.bg) b.style.bg = 'linear-gradient(180deg,#f8fafc,#ffffff)';
  });
  // 首屏用深色底 + 浅字更抓人(有配图则交给配图)
  const hero = page.data.blocks.find((b) => b.type === 'hero');
  if (hero && (!hero.props.image || hero.variant !== 'split')) hero.props.gradient = brief.heroGradient || 'night';
  return page;
}

// ---------- 4) A/B ----------
function stampObjective(data, goalId, objective) {
  data.global = Object.assign({}, data.global || {}, { tracking: Object.assign({}, (data.global || {}).tracking || {}, { objective, goalId }) });
  (data.blocks || []).forEach((b) => {
    if (b.type === 'cta') b.props = Object.assign({}, b.props, { goalId, ctaGoal: goalId });
    if (b.type === 'form') b.props = Object.assign({}, b.props, { goalId, formId: goalId });
  });
  return data;
}

// B 版:把"承诺"改成具体结果 + 低风险下一步,并把信任证据提前
function applyHypothesisBlocks(blocks, hyp) {
  const hero = blocks.find((b) => b.type === 'hero');
  const proofIdx = blocks.findIndex((b) => b.type === 'proof' || b.type === 'logos');
  if (hero) {
    const p = hero.props;
    p.badge = p.badge || '限 30 分钟';
    p.btnText = /免费|诊断|试用|领取/.test(p.btnText || '') ? p.btnText : '免费领取诊断结论';
    p.subtitle = (p.subtitle ? p.subtitle.replace(/[。;]$/, '') + '。' : '') + '先给结论,再决定要不要合作。';
    p._hypothesis = hyp && hyp.statement;
  }
  if (proofIdx > 1) {
    const [proof] = blocks.splice(proofIdx, 1);
    blocks.splice(1, 0, proof);
  }
  const cta = blocks.find((b) => b.type === 'cta');
  if (cta) {
    cta.props.title = cta.props.title || '下一步很简单';
    cta.props.subtitle = '留下联系方式,先拿到一份针对你的诊断结论(不收费)。';
  }
  return blocks;
}

// ---------- 5) 质检闸门 ----------
function luminance(hex) {
  const h = String(hex || '').replace('#', '');
  if (h.length !== 3 && h.length !== 6) return null;
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const rgb = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}
function contrast(a, b) {
  const la = luminance(a), lb = luminance(b);
  if (la == null || lb == null) return null;
  const hi = Math.max(la, lb), lo = Math.min(la, lb);
  return +((hi + 0.05) / (lo + 0.05)).toFixed(2);
}

function qaGate(page) {
  const wf = loadWF();
  const issues = [], autofixes = [];
  const blocks = page.data.blocks || [];
  // a) 空图位 → 自动补
  const emptySlots = collectImageSlots(blocks);
  if (emptySlots.length) {
    const used = autofillImages(blocks, page.brief, page.seed + '-qa');
    used.forEach((u) => { if (!page.assetsUsed.some((x) => x.id === u.id)) page.assetsUsed.push(u); });
    autofixes.push({ code: 'image.autofill', n: emptySlots.length, msg: `补齐 ${emptySlots.length} 个空图位(素材库/渐变视觉)` });
    const left = collectImageSlots(blocks).length;
    if (left) issues.push({ level: 'error', code: 'image.empty', msg: `仍有 ${left} 个空图位` });
  }
  // b) 未知模块(渲染器缺失)
  blocks.forEach((b) => {
    const has = !!(wf.Blocks[b.type] || (wf.Plugins && wf.Plugins[b.type]));
    if (!has) issues.push({ level: 'error', code: 'module.unknown', msg: `模块类型未注册:${b.type}`, path: b.id });
  });
  // c) 空文案
  blocks.forEach((b) => {
    const p = b.props || {};
    if (b.type === 'hero' && !String(p.title || '').trim()) issues.push({ level: 'error', code: 'copy.empty', msg: '首屏缺少主标题', path: b.id });
    if (['cta', 'hero', 'signup'].includes(b.type)) {
      const ctaText = p.btnText || p.submitText;
      if (!String(ctaText || '').trim()) { p.btnText = p.btnText || '立即咨询'; autofixes.push({ code: 'copy.cta', msg: '补默认按钮文案' }); }
    }
  });
  // d) SEO
  if (!String((page.data.global || {}).title || '').trim()) {
    page.data.global = Object.assign({}, page.data.global || {}, { title: page.storyline.title || page.data.blocks[0] && page.data.blocks[0].props.title || '页面' });
    autofixes.push({ code: 'seo.title', msg: '补页面标题' });
  }
  if (!String((page.data.global || {}).description || '').trim()) {
    page.data.global.description = (page.storyline.angle || page.storyline.promise || '').slice(0, 120);
    autofixes.push({ code: 'seo.description', msg: '补页面描述' });
  }
  // e) 对比度(正文与底)
  const preset = (wf.ThemePresets || []).find((t) => t.key === page.data.theme.preset) || {};
  const text = page.data.theme.text || preset.text || '#111827';
  const bg = page.data.theme.bg || preset.bg || '#ffffff';
  const ratio = contrast(text, bg);
  if (ratio && ratio < 4.5) {
    page.data.theme.muted = page.data.theme.muted || preset.muted;
    autofixes.push({ code: 'a11y.contrast', msg: `正文对比度 ${ratio}:1,已保留主题但建议人工确认` });
    issues.push({ level: 'warn', code: 'a11y.contrast', msg: `正文/底色对比度 ${ratio}:1` });
  }
  const errors = issues.filter((i) => i.level === 'error');
  return { ok: errors.length === 0, issues, autofixes, checks: 5 };
}

// ---------- 编排 ----------
function emptyProject(name, mode) {
  return {
    name, mode: mode || 'site',
    data: { theme: {}, global: {}, blocks: [], pages: [{ id: 'main', name: '首页', slug: '', blocks: [] }] },
  };
}

function syncAlias(data) {
  if (Array.isArray(data.pages) && data.pages.length) data.blocks = data.pages[0].blocks;
  return data;
}

async function composePage(userId, brief, storyline, opts) {
  const wf = loadWF();
  opts = opts || {};
  const data = { theme: {}, global: {}, blocks: [], pages: [{ id: 'main', name: '首页', slug: '', blocks: [] }], automations: [] };
  data.global.brand = brief.brand || brief.business || '';
  data.global.title = storyline.title || brief.business || '页面';
  data.global.description = storyline.promise || brief.goal || '';
  if (brief.brandColor) data.theme.primary = brief.brandColor;

  const blocks = [];
  const newModules = [];
  for (let i = 0; i < storyline.scenes.length; i++) {
    const scene = storyline.scenes[i];
    if (scene.role === 'custom') {
      const made = await createNewModule(scene, Object.assign({ user_id: userId }, brief));
      const b = (wf.Blocks[made.type] ? wf.newBlock(made.type) : null) || { id: 'c' + i, type: made.type, props: {}, style: {}, hidden: false };
      b.props = Object.assign({}, b.props, {
        kicker: ROLE_LABEL.custom, title: scene.heading || '', lead: scene.sub || '',
        items: (scene.points || []).slice(0, 4).map((t) => ({ kicker: '', text: String(t).slice(0, 20), desc: '', span: '' })),
        quote: scene.quote || '',
        ctaText: scene.cta || brief.ctaText || '了解更多',
      }, (made.props || {}));
      if (made.props && made.props.items && made.props.items.length) b.props.items = made.props.items;
      b.props.title = scene.heading || b.props.title;
      b.style = Object.assign({}, b.style, { anim: 'up' });
      blocks.push(b);
      newModules.push({ block_type: made.type, created: made.created, ai: made.ai, role: scene.role, idea: scene.moduleIdea || '', pattern: made.pattern || null, ref: made.ref || null });
      continue;
    }
    blocks.push(blockOf(wf, scene.role, scene, Object.assign({ goalId: 'produce-' + (brief.slug || Date.now().toString(36)) }, brief), i));
  }
  // 必备收尾:导航 + 页脚
  const nav = (wf.Blocks.nav ? wf.newBlock('nav') : null) || { id: 'nav', type: 'nav', props: {}, style: {}, hidden: false };
  nav.props = Object.assign({}, nav.props, { brand: data.global.brand, links: [{ label: '怎么做', href: '#how' }, { label: '常见问题', href: '#objection' }], btnText: brief.ctaText || '立即咨询', btnLink: '#signup' });
  const footer = (wf.Blocks.footer ? wf.newBlock('footer') : null) || { id: 'ft', type: 'footer', props: {}, style: {}, hidden: false };
  footer.props = Object.assign({}, footer.props, { brand: data.global.brand, desc: storyline.angle || '', links: [{ label: '联系我们', href: '#signup' }], copyright: '© ' + new Date().getFullYear() + ' ' + data.global.brand });
  data.pages[0].blocks = [nav].concat(blocks).concat([footer]);
  syncAlias(data);
  // 项目内自带的新模块(SSR/编辑器按项目注册,不依赖插件市场审核)
  data.customModules = newModules.map((m) => m.spec).filter(Boolean);
  return { data, newModules };
}

async function run(userId, brief, opts) {
  console.log('[produce] run 开始', JSON.stringify({ user: userId, business: (brief || {}).business }));
  try { loadWF(); } catch (e) { console.error('[produce] loadWF 失败:', e.message); }
  const wf = loadWF();
  console.log('[produce] WF 就绪,模块数', Object.keys(wf.Blocks || {}).length);
  const prodId = (opts && opts.productionId) || db.addProduction({ user_id: userId, brief: JSON.stringify(brief || {}), status: 'running' }).id;
  const prod = { id: prodId };
  const steps = [];
  const record = (key, detail, extra) => {
    steps.push(Object.assign({ key, at: new Date().toISOString(), detail }, extra || {}));
    db.updateProduction(prod.id, { steps: JSON.stringify(steps) });
  };
  const brief2 = Object.assign({ mode: 'site' }, brief || {}, { user_id: userId });
  if (!brief2.industry) { try { brief2.industry = assets.guessIndustry(brief2) || null; } catch (e) { brief2.industry = null; } }
  const asciiSlug = String(brief2.business || brief2.product || 'page').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 20);
  brief2.slug = brief2.slug || asciiSlug || ('page-' + Math.abs(hash(String(brief2.business || brief2.product || Date.now()))).toString(36).slice(0, 5));
  const seed = brief2.slug + '-' + Date.now().toString(36);
  const result = { brief: brief2, newModules: [], assets: [], qa: null, variants: [], delivery: null };

  try {
    // 1) 故事线
    console.log('[produce] 开始故事线…');
    const storyline = enrichWithPatterns(ensureSkeleton(await planStoryline(brief2), brief2), brief2);
    console.log('[produce] 故事线完成 fallback=', !!storyline._fallback, 'scenes=', storyline.scenes.length);
    result.storyline = storyline;
    if (storyline._addedScenes && storyline._addedScenes.length) record('storyline.skeleton', `按形态补齐必备场景:${storyline._addedScenes.join(', ')}`);
    if (storyline._patterns && storyline._patterns.length) record('storyline.pattern', `范式增强:注入新模块场景 ${storyline._patterns.join(', ')}(结构来自知名站点范式)`);
    record('storyline', `${storyline._fallback ? '(规则兜底)' : 'AI 生成'} ${storyline.scenes.length} 个场景:${storyline.scenes.map((s) => ROLE_LABEL[s.role] || s.role).join(' → ')}`, { fallback: !!storyline._fallback });

    // 2) 模块编排(+ 现场造新模块)
    console.log('[produce] 开始模块编排…');
    const composed = await composePage(userId, brief2, storyline, opts);
    console.log('[produce] 模块编排完成 blocks=', composed.data.blocks.length, 'newModules=', composed.newModules.length);
    result.newModules = composed.newModules;
    record('modules', `编排 ${composed.data.blocks.length} 个模块` + (composed.newModules.length ? `,其中现场新增 ${composed.newModules.length} 个新模块(${composed.newModules.map((m) => m.block_type).join(', ')})` : ',全部复用现有模块'), { newModules: composed.newModules });

    // 3) 视觉打磨
    const pageA = { name: `${brief2.business || '页面'} · A 版`, mode: brief2.mode || 'site', data: composed.data, brief: brief2, seed, assetsUsed: [], storyline };
    const used = autofillImages(pageA.data.blocks, brief2, seed);
    used.forEach((u) => pageA.assetsUsed.push(u));
    polish(pageA, brief2);
    syncAlias(pageA.data);
    const imgCount = pageA.data.blocks.reduce((n, b) => n + ((b.props.items || []).filter((i) => i.image).length) + (b.props.image ? 1 : 0), 0);
    record('visual', `自动配图 ${imgCount} 处(行业:${brief2.industry || '通用'}) + 版式令牌(预设 ${pageA.data.theme.preset} / 变体已定)`, { images: imgCount, industry: brief2.industry || null });

    // 4) A/B
    const hypB = (storyline.hypotheses || []).find((h) => h.key === 'B') || { statement: 'B 版:承诺更具体 + 信任前置' };
    const pageB = JSON.parse(JSON.stringify(Object.assign({}, pageA)));
    pageB.name = pageA.name.replace('A 版', 'B 版');
    applyHypothesisBlocks(pageB.data.blocks, hypB);
    syncAlias(pageB.data);
    const objective = brief2.objective || 'cta_click';
    const baseGoal = 'produce-' + brief2.slug;
    const variants = [];
    for (const [key, pg] of [['A', pageA], ['B', pageB]]) {
      const goalId = baseGoal + '-' + key;
      stampObjective(pg.data, goalId, objective);
      pg.data.global.title = `${storyline.title || brief2.business}${key === 'B' ? '(B)' : ''}`;
      const created = db.createProject(userId, pg.name, pg.mode, pg.data, '生产流水线产物' + (key === 'B' ? ' · 假设版' : ''));
      db.setPublished(created.id, userId, true);
      variants.push({ key, goalId, cloudId: created.id, token: created.share_token, url: '/webflow/p/' + created.share_token, name: pg.name });
    }
    const usedPatterns = result.newModules.map((m) => m.pattern).filter(Boolean);
    variants.forEach((v) => { v.patterns = usedPatterns; });
    const runRec = db.addGrowthRun({
      project_id: variants[0].cloudId, user_id: userId, round: 1,
      hypothesis: hypB.statement, reason: storyline.angle || '',
      base_goal: baseGoal, ops: [], variants,
      stats_before: null, categories: ['produce'], theme: 'produce', agent_context: '生产流水线',
    });
    result.variants = variants;
    result.experiment_id = runRec && runRec.id;
    record('variants', `A/B 已上线:A「${hypB.key === 'A' ? '' : '对照'}」/ B「${hypB.statement}」`, { experiment_id: result.experiment_id });

    // 5) 质检闸门
    const qaA = qaGate(pageA); syncAlias(pageA.data);
    const qaB = qaGate(pageB); syncAlias(pageB.data);
    result.qa = { A: qaA, B: qaB };
    // 把自动修复结果写回项目
    [['A', pageA, qaA], ['B', pageB, qaB]].forEach(([key, pg, qa]) => {
      const v = variants.find((x) => x.key === key);
      if (!v) return;
      db.updateProject(v.cloudId, userId, { data: pg.data });
      db.setPublished(v.cloudId, userId, true);
    });
    record('qa', `质检 A ${qaA.ok ? '通过' : '有阻塞'}(${qaA.autofixes.length} 项自动修) · B ${qaB.ok ? '通过' : '有阻塞'}(${qaB.autofixes.length} 项自动修)`, { A: qaA.issues, B: qaB.issues });

    // 6) 交付包
    result.assets = Array.from(new Map(pageA.assetsUsed.map((a) => [a.id, a])).values());
    const pack = writePack(prod.id, brief2, storyline, result, pageA, pageB);
    result.delivery = pack;
    record('delivery', `交付包已生成:${pack.files.length} 个文件(${pack.dir})`, { dir: pack.dir });

    const ok = qaA.ok && qaB.ok;
    db.updateProduction(prod.id, { status: ok ? 'done' : 'done_with_issues', steps: JSON.stringify(steps), result: JSON.stringify(result) });
    try {
      require('./notify').notify(userId, 'review', '🏭 生产流水线完成',
        `${brief2.business || '页面'}:A/B 已上线 + 质检${ok ? '通过' : '有告警'}\nA: ${variants[0].url}\nB: ${variants[1].url}`, '#/console');
    } catch (e) { /* 通知失败不影响交付 */ }
    return Object.assign({ id: prod.id, status: ok ? 'done' : 'done_with_issues' }, result);
  } catch (e) {
    console.error('[produce] 流水线失败:', e && e.stack || e);
    record('error', e.message);
    db.updateProduction(prod.id, { status: 'failed', steps: JSON.stringify(steps), result: JSON.stringify({ error: e.message }) });
    throw e;
  }
}

function writePack(prodId, brief, storyline, result, pageA, pageB) {
  const dir = path.join(DELIVERY_DIR, prodId);
  fs.mkdirSync(dir, { recursive: true });
  const files = [];
  const w = (name, content) => { fs.writeFileSync(path.join(dir, name), content); files.push(name); };
  w('storyline.json', JSON.stringify({ brief, storyline, newModules: result.newModules }, null, 2));
  w('page-A.json', JSON.stringify(pageA.data, null, 2));
  w('page-B.json', JSON.stringify(pageB.data, null, 2));
  w('assets.md', ['# 素材清单', '', '照片来自 Wikimedia Commons(CC/公有领域);视觉为 WebsFlow 原创。', '', ...assets.credits(result.assets)].join('\n'));
  const vA = result.variants.find((v) => v.key === 'A'), vB = result.variants.find((v) => v.key === 'B');
  w('README.md', [
    `# 交付包 · ${brief.business || '页面'}`, '',
    `- 生成时间:${new Date().toISOString()}`,
    `- 形态:${brief.mode || 'site'}`,
    `- A 版(对照):https://nownexts.com${vA ? vA.url : ''}`,
    `- B 版(假设):https://nownexts.com${vB ? vB.url : ''}`,
    `- 实验目标:${brief.objective || 'cta_click'}`, '',
    '## 故事线',
    ...(storyline.scenes || []).map((s, i) => `${i + 1}. [${s.role}] ${s.heading || ''}${s.sub ? ' — ' + s.sub : ''}`),
    '', '## 假设',
    ...(storyline.hypotheses || []).map((h) => `- ${h.key}:${h.statement}`),
    '', '## 现场新增模块',
    ...(result.newModules.length ? result.newModules.map((m) => `- \`${m.block_type}\`(${m.pattern ? '范式库: ' + m.pattern + ' · 参考 ' + (m.ref || '') : (m.ai ? 'AI 生成' : '模板兜底')}) ${m.idea || ''}`) : ['(无,全部复用现有模块)']),
    '', '## 质检', '```json', JSON.stringify(result.qa, null, 2), '```',
    '', '## 怎么继续改', '页面已进入控制台「落地页」列表,打开编辑器即可改文案/换图/调版式;改动同样进 A/B 体系。',
  ].join('\n'));
  return { dir, files };
}

function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; }
  return h;
}

module.exports = { run, planStoryline, composePage, autofillImages, polish, qaGate, applyHypothesisBlocks, ROLE_MODULE, ROLE_LABEL, DELIVERY_DIR };
