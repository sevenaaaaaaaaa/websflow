/* ============================================================
 * WebsFlow · 素材库 (asset-library.js)
 *
 * 目的:让"生成页面"这一步**永远不留空图位**。
 *   - 内置精选素材(自托管,避免外链失效/国内外可达性问题)
 *   - 按"场景角色 + 标签"检索,可被故事线步骤直接调用
 *   - 找不到合适素材时,用确定性渐变视觉兜底(不再是灰框)
 *
 * 版权:照片来自 Wikimedia Commons(CC/公有领域),credit 随交付包输出。
 * ============================================================ */

const BASE = 'https://nownexts.com/webflow/assets/media';

// 行业精品库(数据化清单,按行业扩充无需改代码)
let MANIFEST = { industries: {} };
try { MANIFEST = require('./asset-manifest.json'); } catch (e) { /* 清单缺失时退回内置 */ }

// 内置原创/活动素材(自托管)
const CURATED = [
  { id: 'festival.stage_night', kind: 'photo', url: `${BASE}/festival/night_stage.jpg?v=1`, ratio: '16:9',
    roles: ['hero', 'gallery', 'proof'], industries: ['event'],
    tags: ['festival', 'music', 'stage', 'night', 'concert', '现场', '音乐节', '舞台', '夜'],
    credit: 'Wikimedia Commons · CC BY 2.0' },
  { id: 'festival.stage_sunset', kind: 'photo', url: `${BASE}/festival/sunset_stage.jpg?v=1`, ratio: '4:3',
    roles: ['hero', 'gallery'], industries: ['event'], tags: ['festival', 'music', 'sunset', 'concert', '落日', '现场', '演出'],
    credit: 'Wikimedia Commons · CC BY 2.0' },
  { id: 'festival.crowd', kind: 'photo', url: `${BASE}/festival/live_stage.jpg?v=1`, ratio: '4:3',
    roles: ['gallery', 'testimonial'], industries: ['event'], tags: ['crowd', 'concert', 'live', '人群', '观众', '乐手'],
    credit: 'Wikimedia Commons · CC BY 2.0' },
  { id: 'festival.market', kind: 'photo', url: `${BASE}/festival/seaside_market.jpg?v=1`, ratio: '3:2',
    roles: ['gallery'], industries: ['event', 'food'], tags: ['market', 'seaside', 'food', '市集', '海边', '摊位'],
    credit: 'Wikimedia Commons · CC BY-SA 4.0' },
  { id: 'festival.camp', kind: 'photo', url: `${BASE}/festival/night_camp.jpg?v=1`, ratio: '3:2',
    roles: ['gallery'], industries: ['event', 'travel'], tags: ['camp', 'tent', 'night', 'stars', '露营', '帐篷', '星空'],
    credit: 'Wikimedia Commons · Public domain' },
  { id: 'product.dashboard', kind: 'visual', url: `${BASE}/product/hero-growth.svg?v=1`, ratio: '4:3',
    roles: ['hero', 'showcase'], industries: ['saas'],
    tags: ['saas', 'product', 'dashboard', 'analytics', 'growth', '增长', '数据', '看板', '后台', '工具'],
    credit: 'WebsFlow 原创' },
];

// 行业清单 → 扁平素材表(带 industries 标记)
const INDUSTRY_ASSETS = [];
Object.keys(MANIFEST.industries || {}).forEach((key) => {
  const ind = MANIFEST.industries[key];
  (ind.assets || []).forEach((a) => {
    INDUSTRY_ASSETS.push(Object.assign({}, a, {
      industries: [key],
      tags: (a.tags || []).concat([ind.label || '']),
      credit: a.credit || 'Unsplash(unsplash.com/license)',
    }));
  });
});

const ASSETS = CURATED.concat(INDUSTRY_ASSETS);

// 确定性渐变视觉兜底:任何空图位都能得到一个"像设计过的"图,而不是灰框
function fallbackVisual(label, hue) {
  const h = Number.isFinite(hue) ? hue : 232;
  const text = String(label || 'WebsFlow').slice(0, 12)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800">
<defs>
<linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="hsl(${h},78%,96%)"/><stop offset=".55" stop-color="hsl(${h},72%,88%)"/><stop offset="1" stop-color="hsl(${h + 18},70%,94%)"/>
</linearGradient>
<pattern id="p" width="48" height="48" patternUnits="userSpaceOnUse">
<path d="M48 0H0V48" fill="none" stroke="hsl(${h},60%,72%)" stroke-opacity=".35" stroke-width="1.4"/>
</pattern>
</defs>
<rect width="1200" height="800" fill="url(#g)"/><rect width="1200" height="800" fill="url(#p)"/>
<circle cx="980" cy="180" r="170" fill="hsl(${h},80%,70%)" opacity=".22"/>
<circle cx="200" cy="660" r="150" fill="hsl(${h + 30},80%,66%)" opacity=".18"/>
<g transform="translate(96,600)">
<rect x="0" y="0" width="360" height="88" rx="44" fill="#fff" opacity=".82"/>
<text x="180" y="56" text-anchor="middle" font-family="ui-sans-serif,-apple-system,'PingFang SC',sans-serif" font-size="30" font-weight="700" fill="hsl(${h},60%,32%)">${text}</text>
</g></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

// 按角色 + 关键词挑素材(确定性:同 seed 同结果,便于复现与 A/B 对照)
function pick(role, keywords, seed, industry) {
  const kw = (keywords || []).map((k) => String(k).toLowerCase());
  const score = (a) => {
    let n = 0;
    if (industry && (a.industries || []).includes(industry)) n += 4;   // 行业命中优先
    else if (industry && (a.industries || []).length) n -= 2;          // 别的行业素材降权
    if (role && a.roles.includes(role)) n += 3;
    kw.forEach((k) => { if (k && a.tags.some((t) => t.includes(k) || k.includes(t.toLowerCase()))) n += 2; });
    return n;
  };
  const ranked = ASSETS.map((a) => ({ a, n: score(a) })).filter((x) => x.n > 0).sort((x, y) => y.n - x.n);
  if (!ranked.length) return null;
  const top = ranked.filter((x) => x.n === ranked[0].n);
  const i = Math.abs(hash(String(seed || ''))) % top.length;
  return top[i].a;
}

// 一组素材(图集用):优先命中标签,不足则用兜底视觉补满
function pickMany(role, keywords, count, seed, exclude, industry) {
  const kw = (keywords || []).map((k) => String(k).toLowerCase());
  const ex = new Set(exclude || []);
  const matchKw = (a) => kw.some((k) => k && a.tags.some((t) => t.includes(k) || k.includes(String(t).toLowerCase())));
  const rank = (a) => (role && a.roles.includes(role) ? 2 : 0) + (matchKw(a) ? 1 : 0);
  const sorted = (arr) => arr.slice().sort((a, b) => rank(b) - rank(a));
  let pool = [];
  if (industry) pool = sorted(ASSETS.filter((a) => !ex.has(a.id) && (a.industries || []).includes(industry)));
  if (pool.length < count) {
    const more = sorted(ASSETS.filter((a) => !ex.has(a.id) && !pool.includes(a) && (role ? a.roles.includes(role) : true) && matchKw(a)));
    pool = pool.concat(more);
  }
  if (pool.length < count) {
    pool = pool.concat(sorted(ASSETS.filter((a) => !ex.has(a.id) && !pool.includes(a) && (role ? a.roles.includes(role) : true))));
  }
  if (!pool.length) pool = ASSETS.filter((a) => !ex.has(a.id));
  const base = pool.length ? pool : ASSETS;
  const res = [];
  for (let i = 0; i < count; i++) res.push(base[(Math.abs(hash(String(seed || ''))) + i) % base.length]);
  return res;
}

function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; }
  return h;
}

// 从 brief 文本推断行业(供流水线选图)
function guessIndustry(brief) {
  const text = [brief && brief.industry, brief && brief.business, brief && brief.product, brief && brief.audience, brief && brief.goal]
    .concat((brief && brief.mediaTags) || []).filter(Boolean).join(' ').toLowerCase();
  if (!text) return null;
  if (brief && brief.industry && MANIFEST.industries[brief.industry]) return brief.industry;
  let best = null, bestN = 0;
  Object.keys(MANIFEST.industries || {}).forEach((key) => {
    const ind = MANIFEST.industries[key];
    let n = 0;
    (ind.tags || []).forEach((t) => { if (t && text.includes(String(t).toLowerCase())) n += 1; });
    if (n > bestN) { bestN = n; best = key; }
  });
  return bestN >= 1 ? best : null;
}

function industryList() {
  return Object.keys(MANIFEST.industries || {}).map((k) => ({ key: k, label: MANIFEST.industries[k].label, count: (MANIFEST.industries[k].assets || []).length }));
}

function list() { return ASSETS; }
function credits(used) {
  const ids = new Set((used || []).map((u) => (u && u.id) || u));
  return ASSETS.filter((a) => ids.has(a.id)).map((a) => `- ${a.id} — ${a.credit} (${a.url})`);
}

module.exports = { ASSETS, list, pick, pickMany, fallbackVisual, credits, guessIndustry, industryList, MANIFEST };
