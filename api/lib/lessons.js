/* ============================================================
 * WebsFlow · 平台经验契约 (lessons.js)  —— G4
 *
 * 一条经验 = 场景(scene) + 动作(action) + 结果(outcome) + 度量(metric/delta) + 样本权重
 *   - 任何系统都能写(who/where/why 由 system/scope/ref 表达)
 *   - 汇总用贝叶斯平滑(wins+2)/(decided+4),与小样本友好的既有实现一致
 *   - brief():产出"给人/给模型看"的经验文本 → 任何系统的 AI 都能消费同一份记忆
 *
 * 自用示范:WebsFlow 的增长轮次结轮时会把结果写入这张表,
 *           `growth-lessons.brief()` 也会读取它 → 生态共用一份经验底座。
 * ============================================================ */
const db = require('../db');

const SCENES = {
  'landing-page-cvr': '落地页转化率',
  'content-engagement': '内容互动',
  'lead-quality': '线索质量',
  'checkout-completion': '结算完成率',
  'retention': '留存',
};

function record(list) {
  const rows = Array.isArray(list) ? list : [list];
  const out = [];
  rows.forEach((r) => { if (r && r.scene && r.action && r.outcome) out.push(db.addLesson(r)); });
  return out;
}

function summarize(f) { return db.aggregateLessons(f || {}); }

// 生成给模型/人看的经验文本(样本少时明确说明,避免过度解读)
function brief(f) {
  const o = f || {};
  const rows = summarize(o);
  const decided = rows.reduce((a, r) => a + r.decided, 0);
  const sceneLabel = SCENES[o.scene] || o.scene || '全部场景';
  const lines = [`平台经验(场景:${sceneLabel} · 可判定样本 ${decided} 次):`];
  if (decided < 3) {
    lines.push('  样本很少,不要过度依赖历史;按领域常识决策,并把本轮结果回写经验库。');
    return lines.join('\n');
  }
  const eligible = rows.filter((r) => r.decided >= 2);
  const win = eligible.filter((r) => r.winRate >= 0.55).slice(0, 4)
    .map((r) => `${r.action_label} ${(r.winRate * 100).toFixed(0)}%(${r.wins}/${r.decided}${r.avgDelta != null ? ' Δ' + r.avgDelta : ''})`);
  const lose = eligible.filter((r) => r.winRate <= 0.45).slice(-4).reverse()
    .map((r) => `${r.action_label} ${(r.winRate * 100).toFixed(0)}%(${r.wins}/${r.decided})`);
  if (win.length) lines.push('  较常赢:' + win.join('、'));
  if (lose.length) lines.push('  较常输:' + lose.join('、'));
  if (!win.length && !lose.length) lines.push('  各方向胜率接近,暂无明确优劣。');
  else lines.push('  优先选择"较常赢"的方向;明确走低的方向换角度或避开。');
  return lines.join('\n');
}

// 把一次增长轮次的结果写进平台经验(WebsFlow 自用示范)
function recordGrowthRun(run, categories, theme) {
  const res = run.result || {};
  if (!res.sig && run.decision !== 'inconclusive') return [];
  const outcome = res.sig ? (res.winner === 'B' ? 'win' : 'loss') : 'neutral';
  const delta = (res.cvrA != null && res.cvrB != null) ? +(res.cvrB - res.cvrA).toFixed(4) : null;
  const scene = run.objective === 'lead' ? 'lead-quality' : 'landing-page-cvr';
  const base = {
    system: 'websflow', scope: run.project_id, scene, outcome,
    metric: run.objective === 'lead' ? 'lead_rate' : 'cvr', delta,
    weight: Math.max(1, Math.round((res.views || 0) / 50)),   // 样本越多,权重越高
    source: 'observed', ref: run.id,
    detail: String(run.hypothesis || '').slice(0, 200),
  };
  const rows = (categories || []).map((c) => Object.assign({}, base, { action: c, action_label: c }));
  if (theme) rows.push(Object.assign({}, base, { action: 'theme:' + theme, action_label: '主题:' + theme }));
  return record(rows);
}

module.exports = { record, summarize, brief, recordGrowthRun, SCENES };
