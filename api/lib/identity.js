/* ============================================================
 * WebsFlow · 身份打通 (identity.js)  —— G2
 *
 * 目标:同一个人的多个标识(vid 访客 / uid 登录 / payflow_ref 支付 / email / phone)
 *       归并到一个 identity_id,任一系统给出任一标识都能查到"这个人"的完整轨迹。
 *
 * 规则:
 *   - 任一标识已存在于别的身份 → 自动合并(链接与历史数据一并迁移)
 *   - 合并方向:保留"先创建"的身份为主(稳定,避免 id 漂移);被合并方标记 merged_into
 *   - 解析是幂等的:同一组标识反复 resolve 得到同一 identity_id
 * ============================================================ */
const db = require('../db');

const KINDS = ['vid', 'uid', 'payflow_ref', 'email', 'phone'];

function normalize(kind, v) {
  if (!v) return null;
  let s = String(v).trim();
  if (!s || s.length > 120) return null;
  if (kind === 'email') s = s.toLowerCase();
  return s;
}

// 解析(必要时创建/合并并链接所有给出的标识)
function resolveIdentity(ids, traits) {
  const given = [];
  KINDS.forEach((k) => {
    const v = normalize(k, ids && ids[k]);
    if (v) given.push({ kind: k, value: v });
  });
  if (!given.length) return { error: '至少提供一个标识(vid/uid/payflow_ref/email/phone)' };

  // 1) 找出所有命中的身份
  const hits = [];
  given.forEach((g) => {
    const idn = db.findIdentity(g.kind, g.value);
    if (idn) hits.push(idn);
  });
  // 2) 选主:创建最早的那个(稳定)
  hits.sort((a, b) => String(a.first_seen_at).localeCompare(String(b.first_seen_at)));
  let primary = hits[0] || null;
  if (!primary) primary = db.createIdentity(traits);
  const merged = [];
  // 3) 同批命中的其它身份合并进来
  hits.slice(1).forEach((h) => {
    if (h.id !== primary.id) { db.mergeIdentities(primary.id, h.id); merged.push(h.id); }
  });
  // 4) 链接所有标识 + 记录 traits
  given.forEach((g) => db.linkIdentity(primary.id, g.kind, g.value));
  db.touchIdentity(primary.id);
  if (traits && Object.keys(traits).length) db.setIdentityTraits(primary.id, traits);

  const out = db.getIdentity(primary.id);
  return { identity: out, merged: merged.length ? merged : undefined, created: hits.length === 0 };
}

// 给事件/线索/订单补身份(写入路径调用)
function attachIdentity({ vid, uid, payflowRef, email, phone, traits }) {
  const ids = { vid, uid, payflow_ref: payflowRef, email, phone };
  if (!Object.keys(ids).some((k) => ids[k])) return null;
  const r = resolveIdentity(ids, traits);
  return r && r.identity ? r.identity.id : null;
}

module.exports = { resolveIdentity, attachIdentity, KINDS };
