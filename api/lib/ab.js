/* ============================================================
 * WebsFlow · A/B 统计(服务端) (ab.js)
 * 与前端 WF.abStats 同一套两比例 z 检验,避免前后端结论不一致。
 * ============================================================ */
function normCdf(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

// counts: [{views, clicks}, {views, clicks}]
function abStats(counts, minSample) {
  const [a, b] = counts || [];
  const va = (a && a.views) || 0, vb = (b && b.views) || 0;
  const ca = (a && a.clicks) || 0, cb = (b && b.clicks) || 0;
  const cvrA = va ? ca / va : 0, cvrB = vb ? cb / vb : 0;
  let z = 0, p = 1;
  if (va > 0 && vb > 0) {
    const pooled = (ca + cb) / (va + vb);
    const se = Math.sqrt(pooled * (1 - pooled) * (1 / va + 1 / vb));
    if (se > 0) { z = (cvrA - cvrB) / se; p = 2 * (1 - normCdf(Math.abs(z))); }
  }
  const min = minSample || 30;
  return { cvrA, cvrB, z, p, va, vb, ca, cb, significant: p < 0.05 && va >= min && vb >= min };
}

module.exports = { normCdf, abStats };
