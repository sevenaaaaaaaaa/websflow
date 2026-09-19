/* ============================================================
 * WebsFlow · 事件回传总线 (ingest.js)  —— G1
 *
 * 让外部系统(OpenFlow / PayFlow / 其它)把"事实事件"推进 WebsFlow:
 *   - 幂等:必须带 event_id,重复投递只落一条
 *   - 校验:type 必填;project_id 必须是该用户名下的项目(防越权写入别人页面)
 *   - 语义:可带 value(如线索质量分/订单金额)与 uid(身份打通用)
 *   - 落库后自动参与既有全部能力:实时看板 / 分群归因 / A/B 计量 / 增长 Agent 感知
 *
 * 入口:POST /api/ingest(external systems)· tools 的 ingest_events(agent)
 * ============================================================ */
const db = require('../db');

const MAX_BATCH = 200;
const TYPE_RE = /^[a-z][a-z0-9_:.-]{0,39}$/i;

function normalizeOne(user, raw, allowedProjects) {
  if (!raw || typeof raw !== 'object') return { error: '事件必须为对象' };
  const type = String(raw.type || '').trim();
  if (!type) return { error: '缺少 type' };
  if (!TYPE_RE.test(type)) return { error: 'type 命名不合法(小写字母/数字/:_- ,≤40字)' };
  const eventId = String(raw.event_id || '').trim();
  if (!eventId) return { error: '缺少 event_id(幂等必需)' };
  if (eventId.length > 80) return { error: 'event_id 过长' };

  let projectId = raw.project_id ? String(raw.project_id) : null;
  if (projectId) {
    if (allowedProjects && !allowedProjects.has(projectId)) return { error: '无权写入该项目:' + projectId };
  }
  const value = raw.value === undefined || raw.value === null ? null : Number(raw.value);
  if (value !== null && !isFinite(value)) return { error: 'value 需为数字' };

  return {
    event: {
      eventId,
      type,
      projectId,
      goalId: String(raw.goal_id || type).slice(0, 120),
      url: raw.url ? String(raw.url).slice(0, 300) : null,
      seg: raw.seg ? String(raw.seg).slice(0, 120) : null,
      vid: raw.vid ? String(raw.vid).slice(0, 40) : null,
      src: raw.src ? String(raw.src).slice(0, 60) : null,
      uid: raw.uid ? String(raw.uid).slice(0, 64) : null,
      payflowRef: raw.payflow_ref ? String(raw.payflow_ref).slice(0, 80) : null,
      traceId: raw.trace_id ? String(raw.trace_id).slice(0, 80) : null,
      email: raw.email ? String(raw.email).slice(0, 120) : null,
      phone: raw.phone ? String(raw.phone).slice(0, 40) : null,
      value,
    },
  };
}

// 返回 { accepted, deduped, rejected:[{index,reason}] }
function ingestEvents(user, payload) {
  const list = Array.isArray(payload && payload.events) ? payload.events
    : (payload && payload.type ? [payload] : []);
  if (!list.length) return { accepted: 0, deduped: 0, rejected: [{ index: -1, reason: '缺少 events 数组或 type 字段' }] };
  if (list.length > MAX_BATCH) return { accepted: 0, deduped: 0, rejected: [{ index: -1, reason: `单批最多 ${MAX_BATCH} 条` }] };

  // 一次取出该用户的项目 id 集合,避免逐条查库
  let allowed = null;
  try {
    allowed = new Set((db.getUserProjects(user.id) || []).map((p) => p.id));
  } catch (e) { allowed = null; }

  let accepted = 0, deduped = 0;
  const rejected = [];
  list.forEach((raw, i) => {
    const r = normalizeOne(user, raw, allowed);
    if (r.error) { rejected.push({ index: i, reason: r.error }); return; }
    const e = r.event;
    const res = db.addEvent(e.goalId, e.type, e.url, e.projectId, e.seg, e.vid, e.src,
      { eventId: e.eventId, uid: e.uid, value: e.value, payflowRef: e.payflowRef, email: e.email, phone: e.phone, traceId: e.traceId });
    if (res && res.deduped) deduped++; else accepted++;
  });
  return { accepted, deduped, rejected };
}

module.exports = { ingestEvents, MAX_BATCH };
