/* ============================================================
 * WebsFlow · AI Token 用量台账 (usage.js)
 * 每次模型调用记录:场景/用户/模型/prompt/completion tokens/成本(元)
 * 成本单价来自 cost-rates.json(按模型匹配,未命中走 default)
 * ============================================================ */
const db = require('../db');
const fs = require('fs');
const path = require('path');

const COST_PATH = path.join(__dirname, '..', 'cost-rates.json');

function rates(model) {
  let cfg = {};
  try { cfg = JSON.parse(fs.readFileSync(COST_PATH, 'utf8')) || {}; } catch (e) { /* 用默认 */ }
  const r = (cfg && cfg[String(model || '').toLowerCase()]) || cfg.default || {};
  return { input: Number(r.input_per_m_cny) || 2.0, output: Number(r.output_per_m_cny) || 8.0 };
}

function costOf(model, promptTokens, completionTokens) {
  const r = rates(model);
  return +(((promptTokens || 0) / 1e6) * r.input + ((completionTokens || 0) / 1e6) * r.output).toFixed(6);
}

// 调用前粗估(中文约 2 字符/token):输入按消息长度,输出按 max_tokens 上限
function estimateBefore(model, messagesChars, maxTokens) {
  const pt = Math.ceil((messagesChars || 0) / 2);
  return costOf(model, pt, maxTokens || 1200);
}

function record(o) {
  try {
    const cost = costOf(o.model, o.promptTokens, o.completionTokens);
    db.addAiUsage({
      user_id: o.userId || null,
      scene: o.scene || 'chat',
      kind: o.kind || 'chat',
      model: o.model || '',
      prompt_tokens: o.promptTokens || 0,
      completion_tokens: o.completionTokens || 0,
      cost_cny: cost,
      meta: o.meta ? JSON.stringify(o.meta).slice(0, 500) : null,
    });
    return cost;
  } catch (e) {
    console.error('[usage] 记账失败:', e.message);
    return 0;
  }
}

module.exports = { record, costOf, estimateBefore, rates };