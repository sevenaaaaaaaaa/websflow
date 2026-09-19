/* ============================================================
 * WebsFlow · 结构化补丁引擎 (patch.js)
 *
 * 目标:让「AI/自动化」对页面的改动是**可校验、可预览、可撤销**的,
 *       而不是把模型返回的 props 直接 Object.assign 进画布。
 *
 * 规则:
 *   - 只能改 schema 白名单里的字段;未知字段/未知模块一律拒绝
 *   - 按字段类型做类型转换与长度/选项/数量限制
 *   - 支持 variant(布局变体)与 hidden(显示隐藏)
 *   - 返回 diff 供预览;applyOps 返回快照用于撤销
 *
 * 同一份代码在浏览器与 Node 侧复用(避免两边校验规则漂移)。
 * ============================================================ */
window.WF = window.WF || {};

(function (WF) {
  "use strict";

  const LIMITS = { text: 300, textarea: 2400, url: 600, color: 40 };
  const MAX_LIST = 30;
  const BLOCK_FLAGS = ["variant", "hidden"];

  function clip(s, n) { return String(s == null ? "" : s).slice(0, n); }

  function fieldsOf(type) {
    const def = WF.Blocks[type];
    if (!def) return null;
    return def.fields || [];
  }

  // 按字段定义做类型转换;返回 {ok, value} 或 {ok:false, reason}
  function coerce(fd, value) {
    if (!fd) return { ok: false, reason: "字段不在白名单" };
    const t = fd.type;
    if (t === "number") {
      const n = Number(value);
      if (!isFinite(n)) return { ok: false, reason: "需要数字" };
      return { ok: true, value: n };
    }
    if (t === "toggle") return { ok: true, value: !!value };
    if (t === "select") {
      const opts = (fd.options || []).map((o) => String(o[0]));
      const v = String(value);
      if (opts.length && !opts.includes(v)) return { ok: false, reason: "不是合法选项: " + opts.slice(0, 6).join("/") };
      return { ok: true, value: v };
    }
    if (t === "list") {
      if (!Array.isArray(value)) return { ok: false, reason: "需要数组" };
      const itemFields = fd.itemFields || [];
      const keys = itemFields.map((x) => x.key);
      const items = [];
      for (const raw of value.slice(0, MAX_LIST)) {
        if (raw == null || typeof raw !== "object") return { ok: false, reason: "列表项需为对象" };
        const it = {};
        for (const k of Object.keys(raw)) {
          if (!keys.includes(k)) return { ok: false, reason: "列表项字段不在白名单: " + k };
          const ifd = itemFields.find((x) => x.key === k);
          const r = coerce(ifd, raw[k]);
          if (!r.ok) return { ok: false, reason: "列表项 " + k + ": " + r.reason };
          it[k] = r.value;
        }
        if (Object.keys(it).length) items.push(it);
      }
      return { ok: true, value: items };
    }
    // text / textarea / url / color / image / datetime
    const n = LIMITS[t] || LIMITS.text;
    return { ok: true, value: clip(value, n) };
  }

  // 校验一条 op;返回 {ok, op} 或 {ok:false, reason}
  function validateOp(project, op) {
    if (!op || typeof op !== "object") return { ok: false, reason: "不是对象" };
    const blocks = (project && project.blocks) || [];
    const find = (id) => blocks.find((b) => b.id === id);

    if (op.op === "remove") {
      if (!find(op.id)) return { ok: false, reason: "模块不存在: " + op.id };
      return { ok: true, op: { op: "remove", id: op.id } };
    }

    if (op.op === "add") {
      const type = op.type;
      const def = WF.Blocks[type];
      if (!def) return { ok: false, reason: "未知模块类型: " + type };
      if (def.container) return { ok: false, reason: "容器模块暂不支持自动新增" };
      const fields = fieldsOf(type) || [];
      const props = {};
      const src = op.props || {};
      for (const k of Object.keys(src)) {
        const fd = fields.find((f) => f.key === k);
        const r = coerce(fd, src[k]);
        if (!r.ok) return { ok: false, reason: "字段 " + k + ": " + r.reason };
        props[k] = r.value;
      }
      return { ok: true, op: { op: "add", type, props } };
    }

    if (op.op === "update" || op.op === "variant") {
      const b = find(op.id);
      if (!b) return { ok: false, reason: "模块不存在: " + op.id };
      const def = WF.Blocks[b.type];
      // 布局变体
      if (op.op === "variant") {
        const keys = (def.variants || []).map((v) => (Array.isArray(v) ? v[0] : v));
        if (!keys.length) return { ok: false, reason: b.type + " 没有布局变体" };
        if (!keys.includes(op.value)) return { ok: false, reason: "变体不在白名单: " + keys.join("/") };
        return { ok: true, op: { op: "variant", id: op.id, value: op.value } };
      }
      const fields = def.fields || [];
      const props = {};
      const src = op.props || {};
      const rejected = [];
      for (const k of Object.keys(src)) {
        if (BLOCK_FLAGS.includes(k)) continue;
        const fd = fields.find((f) => f.key === k);
        if (!fd) { rejected.push(k); continue; }
        const r = coerce(fd, src[k]);
        if (!r.ok) { rejected.push(k + "(" + r.reason + ")"); continue; }
        props[k] = r.value;
      }
      const out = { op: "update", id: op.id, props };
      if (op.hidden !== undefined) out.hidden = !!op.hidden;
      const vKeys = (def.variants || []).map((v) => (Array.isArray(v) ? v[0] : v));
      if (op.variant && vKeys.includes(op.variant)) out.variant = op.variant;
      if (!Object.keys(props).length && out.hidden === undefined && !out.variant) {
        return { ok: false, reason: "没有可应用的字段" + (rejected.length ? "(被拒: " + rejected.join(",") + ")" : "") };
      }
      out.rejectedFields = rejected;
      return { ok: true, op: out };
    }

    return { ok: false, reason: "未知操作: " + op.op };
  }

  // 批量校验
  WF.validateOps = function (project, ops) {
    const ok = [], rejected = [];
    (ops || []).forEach((op, i) => {
      const r = validateOp(project, op);
      if (r.ok) ok.push(r.op); else rejected.push({ index: i, op: op && op.op, reason: r.reason });
    });
    return { ops: ok, rejected };
  };

  // 生成预览差异(不修改项目)
  WF.diffOps = function (project, ops) {
    const blocks = (project && project.blocks) || [];
    const rows = [];
    (ops || []).forEach((op) => {
      if (op.op === "add") {
        const def = WF.Blocks[op.type];
        rows.push({ kind: "add", id: "-", type: def ? def.name : op.type, field: "新增模块", from: "", to: Object.values(op.props || {}).map((v) => (Array.isArray(v) ? v.length + " 项" : String(v))).join(" · ").slice(0, 80) });
      } else if (op.op === "remove") {
        const b = blocks.find((x) => x.id === op.id);
        const def = b && WF.Blocks[b.type];
        rows.push({ kind: "remove", id: op.id, type: def ? def.name : "", field: "删除模块", from: "", to: "" });
      } else if (op.op === "variant") {
        const b = blocks.find((x) => x.id === op.id);
        const def = b && WF.Blocks[b.type];
        rows.push({ kind: "variant", id: op.id, type: def ? def.name : "", field: "布局变体", from: (b && b.variant) || "-", to: op.value });
      } else {
        const b = blocks.find((x) => x.id === op.id);
        const def = b && WF.Blocks[b.type];
        const fds = (def && def.fields) || [];
        Object.keys(op.props || {}).forEach((k) => {
          const fd = fds.find((f) => f.key === k);
          const from = (b && b.props && b.props[k]);
          rows.push({
            kind: "update", id: op.id, type: def ? def.name : "", field: (fd && fd.label) || k,
            from: Array.isArray(from) ? from.length + " 项" : String(from == null ? "" : from).slice(0, 60),
            to: Array.isArray(op.props[k]) ? op.props[k].length + " 项" : String(op.props[k]).slice(0, 60),
          });
        });
        if (op.hidden !== undefined) rows.push({ kind: "update", id: op.id, type: def ? def.name : "", field: "显示", from: b && b.hidden ? "隐藏" : "显示", to: op.hidden ? "隐藏" : "显示" });
        if (op.variant) rows.push({ kind: "update", id: op.id, type: def ? def.name : "", field: "布局变体", from: (b && b.variant) || "-", to: op.variant });
      }
    });
    return rows;
  };

  // 应用(就地修改 project.blocks),返回 {applied, snapshot}
  WF.applyOps = function (project, ops) {
    const snapshot = JSON.parse(JSON.stringify((project && project.blocks) || []));
    let applied = 0;
    (ops || []).forEach((op) => {
      const blocks = project.blocks || (project.blocks = []);
      if (op.op === "add") {
        const nb = WF.newBlock(op.type);
        nb.props = Object.assign(nb.props, op.props || {});
        blocks.push(nb);
        applied++;
      } else if (op.op === "remove") {
        const i = blocks.findIndex((b) => b.id === op.id);
        if (i >= 0) { blocks.splice(i, 1); applied++; }
      } else if (op.op === "variant") {
        const b = blocks.find((x) => x.id === op.id);
        if (b) { b.variant = op.value; applied++; }
      } else if (op.op === "update") {
        const b = blocks.find((x) => x.id === op.id);
        if (b) {
          b.props = Object.assign({}, b.props, op.props || {});
          if (op.hidden !== undefined) b.hidden = !!op.hidden;
          if (op.variant) b.variant = op.variant;
          applied++;
        }
      }
    });
    return { applied, snapshot };
  };

  // 用快照回滚
  WF.revertOps = function (project, snapshot) {
    if (!project || !Array.isArray(snapshot)) return 0;
    project.blocks = JSON.parse(JSON.stringify(snapshot));
    return snapshot.length;
  };
})(window.WF);
