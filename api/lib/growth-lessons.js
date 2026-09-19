/* ============================================================
 * WebsFlow · 增长经验库 (growth-lessons.js)
 *
 * 目的:让 Agent 越跑越准 —— 把每轮改动归类,按「变体 B 是否胜出」统计胜率,
 *       形成"哪些方向更常赢"的先验,反哺下一轮的假设生成(跨项目汇总)。
 *
 * 语义约定(A/B 的定义很重要):
 *   - ops 描述的是「变体 B 相对 A 的改动」
 *   - result.winner = 'B' → 这类改动**赢**  |  'A' → **输**  |  不显著 → 只计次数不计胜负
 *   - 胜率用贝叶斯平滑(wins+α)/(trials+α+β),α=β=2(先验≈50%),避免小样本过信
 * ============================================================ */
const CATEGORY_LABELS = {
  title: '标题/价值主张',
  subtitle: '副标题/补充说明',
  cta_text: '行动按钮文字',
  badge: '胶囊标签/眉题',
  content_items: '要点/清单内容',
  trust: '信任要素(数据/评价/背书/FAQ)',
  structure: '模块增删',
  layout: '布局变体',
  offer: '优惠/价格门槛',
  other: '其他',
};

const THEMES = ['specificity', 'urgency', 'trust', 'risk_reversal', 'offer', 'clarity', 'layout', 'other'];
const THEME_LABELS = {
  specificity: '更具体的价值主张',
  urgency: '时间/名额紧迫感',
  trust: '信任与社会证明',
  risk_reversal: '降低行动门槛/风险',
  offer: '优惠与价格',
  clarity: '更清晰的结构与说明',
  layout: '版式与信息层级',
  other: '其他',
};

const TRUST_TYPES = ['proof', 'stats', 'testimonials', 'logo-wall', 'faq', 'team'];

// 把一轮的 ops 归类(纯规则,不依赖模型)
function classifyOps(ops) {
  const out = new Set();
  (ops || []).forEach((op) => {
    const t = op && op.op;
    if (t === 'variant') { out.add('layout'); return; }
    if (t === 'remove') { out.add('structure'); return; }
    if (t === 'add') {
      out.add(TRUST_TYPES.includes(op.type) ? 'trust' : 'structure');
      return;
    }
    if (t === 'update') {
      const keys = Object.keys(op.props || {});
      keys.forEach((k) => {
        if (k === 'title') out.add('title');
        else if (k === 'subtitle') out.add('subtitle');
        else if (k === 'btnText' || k === 'btn2Text' || k === 'linkText' || k === 'text') out.add('cta_text');
        else if (k === 'badge' || k === 'eyebrow' || k === 'kicker') out.add('badge');
        else if (k === 'items') out.add('content_items');
        else if (k === 'price' || k === 'offer' || k === 'coupon' || k === 'discount') out.add('offer');
        else if (k === 'variant') out.add('layout');
        else out.add('other');
      });
      if (op.variant) out.add('layout');
      if (!keys.length && op.hidden !== undefined) out.add('structure');
    }
  });
  return Array.from(out);
}

function normalizeTheme(t) {
  const s = String(t || '').toLowerCase().trim();
  return THEMES.includes(s) ? s : 'other';
}

// 汇总:runs 为该用户(或全体)的增长轮次
function summarize(runs) {
  const cats = {}, themes = {};
  let concluded = 0, wins = 0;
  (runs || []).forEach((r) => {
    const res = r.result || {};
    const sig = !!res.sig;
    const winner = res.winner;
    const catsOfRun = Array.isArray(r.categories) && r.categories.length ? r.categories : classifyOps(r.ops || []);
    const theme = normalizeTheme(r.theme);
    const bump = (bag, key) => {
      const b = bag[key] || (bag[key] = { trials: 0, wins: 0, losses: 0, decided: 0, lift: 0 });
      b.trials++;
      if (sig && winner) {
        b.decided++;
        if (winner === 'B') { b.wins++; } else { b.losses++; }
        if (res.cvrA != null && res.cvrB != null) b.lift += (res.cvrB - res.cvrA);
      }
    };
    if (r.status === 'concluded' && r.decision !== 'stopped') concluded++;
    if (sig && winner === 'B') wins++;
    catsOfRun.forEach((c) => bump(cats, c));
    bump(themes, theme);
  });
  const ALPHA = 2, BETA = 2;   // 先验 ≈50%
  const rate = (b) => (b.wins + ALPHA) / (b.decided + ALPHA + BETA);
  const shape = (bag, labels) => Object.keys(bag).map((k) => ({
    key: k, label: (labels && labels[k]) || k,
    trials: bag[k].trials, decided: bag[k].decided, wins: bag[k].wins, losses: bag[k].losses,
    winRate: +rate(bag[k]).toFixed(3),
    avgLift: bag[k].decided ? +(bag[k].lift / bag[k].decided).toFixed(4) : null,
  })).sort((a, b) => (b.winRate - a.winRate) || (b.decided - a.decided));
  return {
    concludedRounds: concluded, variantWins: wins,
    categories: shape(cats, CATEGORY_LABELS),
    themes: shape(themes, THEME_LABELS),
  };
}

// 生成给 planner 的经验提示词(样本少时明确说明,避免模型过度解读)
function brief(runs, opts) {
  const o = opts || {};
  const s = summarize(runs || []);
  const projectRuns = o.projectRuns || runs || [];
  const recentHypotheses = projectRuns
    .filter((r) => r.hypothesis)
    .slice(0, 6)
    .map((r) => {
      let tag = '不显著';
      if (r.status === 'running') tag = '进行中';
      else if (r.decision === 'stopped') tag = '已中止(未判定)';
      else if (r.result && r.result.sig) tag = r.result.winner === 'B' ? '改动获胜' : '基线获胜';
      return `- 第${r.round}轮(${tag}):${String(r.hypothesis).slice(0, 48)}`;
    });

  const lines = [];
  const decided = s.categories.reduce((a, c) => a + c.decided, 0);
  if (decided >= 3) {
    // 互斥:一个方向不能同时出现在"常赢"和"常输";并要求至少 2 次可判定样本
    const eligible = s.categories.filter((c) => c.decided >= 2);
    const win = eligible.filter((c) => c.winRate >= 0.55).slice(0, 3)
      .map((c) => `${c.label} ${(c.winRate * 100).toFixed(0)}%(${c.wins}/${c.decided})`);
    const lose = eligible.filter((c) => c.winRate <= 0.45).slice(-3).reverse()
      .map((c) => `${c.label} ${(c.winRate * 100).toFixed(0)}%(${c.wins}/${c.decided})`);
    lines.push('本账号历史经验(改动方向 → 变体胜率,已按小样本平滑):');
    if (win.length) lines.push('  较常赢:' + win.join('、'));
    if (lose.length) lines.push('  较常输:' + lose.join('、'));
    if (!win.length && !lose.length) lines.push('  目前各方向胜率接近,暂无明确优劣,按转化常识选择。');
    else lines.push('  优先选择"较常赢"的方向;明确走低的方向换新角度或避开。');
  } else {
    lines.push(`本账号历史样本还很少(已结轮 ${s.concludedRounds} 轮,可判定胜负 ${decided} 次),不要过度依赖历史,按转化常识选择改动方向。`);
  }
  if (recentHypotheses.length) {
    lines.push('本项目近期假设(必须换新角度,不要重复):');
    lines.push(...recentHypotheses.slice(0, 6));
  }
  // G4:并入平台经验契约(跨系统共用一份记忆;WebsFlow 自己的轮次也在其中)
  try {
    const platform = require('./lessons').summarize({ scene: o.platformScene || undefined });
    const decidedP = platform.reduce((a, r) => a + r.decided, 0);
    if (decidedP >= 3) {
      const top = platform.filter((r) => r.decided >= 2 && r.winRate >= 0.55).slice(0, 3)
        .map((r) => `${r.action_label} ${(r.winRate * 100).toFixed(0)}%(${r.wins}/${r.decided})`);
      const low = platform.filter((r) => r.decided >= 2 && r.winRate <= 0.45).slice(-3).reverse()
        .map((r) => `${r.action_label} ${(r.winRate * 100).toFixed(0)}%(${r.wins}/${r.decided})`);
      lines.push('平台经验库(跨系统,含其它系统的同类结论):');
      if (top.length) lines.push('  较常赢:' + top.join('、'));
      if (low.length) lines.push('  较常输:' + low.join('、'));
    }
  } catch (e) { /* 平台经验不可用时忽略 */ }

  const rejected = (o.rejectedProposals || []).slice(0, 3);
  if (rejected.length) {
    lines.push('人工已驳回的方案(方向或措辞被否,不要重提):');
    rejected.forEach((r) => lines.push(`- ${String(r.hypothesis || '').slice(0, 40)}${r.reject_reason ? '(原因:' + String(r.reject_reason).slice(0, 30) + ')' : ''}`));
  }
  return lines.join('\n');
}

// 粗略相似度(token 集合 Jaccard),用于"避免重复同一假设"
// 中文按二元组切分(整句做单一 token 会导致中文相似度恒为 0),英文按单词
function tokenize(t) {
  const str = String(t || '');
  const out = new Set();
  const latin = str.match(/[a-zA-Z0-9]{2,}/g) || [];
  latin.forEach((w) => out.add(w.toLowerCase()));
  const cjk = str.replace(/[^\u4e00-\u9fa5]/g, ' ');
  cjk.split(/\s+/).forEach((seg) => {
    for (let i = 0; i < seg.length - 1; i++) out.add('zh:' + seg.slice(i, i + 2));
    if (seg.length === 1) out.add('zh1:' + seg);
  });
  return out;
}

function similarity(a, b) {
  const A = tokenize(a), B = tokenize(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  A.forEach((x) => { if (B.has(x)) inter++; });
  return inter / (A.size + B.size - inter);
}

module.exports = { similarity, classifyOps, normalizeTheme, summarize, brief, CATEGORY_LABELS, THEME_LABELS, THEMES };
