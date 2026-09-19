/* ============================================================
 * WebsFlow · Copilot 任务模板库 (copilot-tasks.js)
 *
 * 把常见多步操作沉淀为一键任务,分两类:
 *   - kind: "rule"  本地确定性执行(零 AI 消耗、瞬时完成、可撤销)
 *   - kind: "ai"    固定提示词交给 Copilot 执行(多步动作、可撤销)
 * 自定义任务:用户把对话指令存为任务(localStorage)
 * ============================================================ */
window.WF = window.WF || {};

(function (WF) {
  "use strict";

  const uid = () => "b" + Math.random().toString(36).slice(2, 9);

  function make(type, props) {
    const def = WF.Blocks[type];
    if (!def) return null;
    return {
      id: uid(), type,
      props: Object.assign(JSON.parse(JSON.stringify(def.defaults)), props || {}),
      hidden: false,
      style: { bg: "", padding: "normal", anim: type === "nav" ? "none" : "up" },
    };
  }

  // 在页脚前插入(无页脚则追加末尾)
  function insertBeforeFooter(blocks, news) {
    const fi = blocks.findIndex((b) => b.type === "footer");
    const at = fi >= 0 ? fi : blocks.length;
    blocks.splice(at, 0, ...news);
  }

  const has = (blocks, type) => blocks.some((b) => b.type === type);

  function addMissing(proj, types) {
    const blocks = proj.blocks;
    const news = types.filter((t) => !has(blocks, t)).map((t) => make(t)).filter(Boolean);
    if (!news.length) return 0;
    insertBeforeFooter(blocks, news);
    return news.length;
  }

  // ============================================================
  //  内置任务
  // ============================================================
  WF.CopilotTasks = [
    /* ---------- 规则任务 ---------- */
    {
      id: "fill-funnel", icon: "🧲", kind: "rule",
      params: [{ key: "max", label: { zh: "最多补几个模块", en: "Max blocks to add" }, type: "number", def: 5 }],
      name: { zh: "补齐转化漏斗", en: "Complete the funnel" },
      desc: { zh: "按「信任→痛点→方法→证明→行动」补上缺失的模块", en: "Add missing blocks following trust → pain → method → proof → action" },
      run(proj, params) {
        const max = Math.max(1, Math.min(7, Number(params && params.max) || 5));
        const n = addMissing(proj, ["proof", "cluster", "journey", "features", "testimonials", "faq", "cta"].slice(0, max));
        return n ? { applied: n, summary: `补齐 ${n} 个模块` } : { applied: 0, summary: "漏斗已完整" };
      },
    },
    {
      id: "social-proof", icon: "🛡️", kind: "rule",
      name: { zh: "社交证明三件套", en: "Social proof trio" },
      desc: { zh: "一键补上信任数字条 + 用户评价 + 品牌背书墙", en: "Add trust bar + testimonials + logo wall" },
      run(proj) {
        const n = addMissing(proj, ["proof", "testimonials", "logo-wall"]);
        return n ? { applied: n, summary: `添加 ${n} 个证明模块` } : { applied: 0, summary: "已有社交证明" };
      },
    },
    {
      id: "closing-cta", icon: "📣", kind: "rule",
      name: { zh: "结尾转化组合", en: "Closing conversion" },
      desc: { zh: "末尾加上行动号召与联系表单;H5 同步开启底部悬浮按钮", en: "Append CTA + contact form; enable H5 sticky bar" },
      run(proj) {
        const n = addMissing(proj, ["cta", "form"]);
        if (proj.mode === "h5") {
          proj.global = proj.global || {};
          proj.global.h5 = proj.global.h5 || {};
          if (!proj.global.h5.ctaText) { proj.global.h5.ctaText = "立即报名"; proj.global.h5.ctaLink = "#"; }
        }
        return n ? { applied: n, summary: `添加 ${n} 个转化模块` } : { applied: 1, summary: "已开启转化组合" };
      },
    },
    {
      id: "seo-basic", icon: "🔍", kind: "rule",
      name: { zh: "SEO 一键填充", en: "Auto-fill SEO" },
      desc: { zh: "用主视觉文案生成标题/描述/关键词与 Open Graph", en: "Derive title / description / keywords / OG from the hero" },
      run(proj) {
        const g = proj.global || (proj.global = {});
        const hero = (proj.blocks || []).find((b) => b.type === "hero");
        const title = (hero && hero.props.title) || g.title || proj.name;
        const sub = (hero && hero.props.subtitle) || "";
        let n = 0;
        if (title && g.title !== title) { g.title = title; n++; }
        if (sub && g.description !== sub) { g.description = sub; n++; }
        if (!g.keywords) {
          const cats = Array.from(new Set((proj.blocks || []).map((b) => (WF.Blocks[b.type] || {}).category).filter(Boolean)));
          g.keywords = [g.brand, title].concat(cats).filter(Boolean).slice(0, 6).join(",");
          n++;
        }
        g.og = g.og || {};
        if (!g.og.title) { g.og.title = g.title || title; n++; }
        if (!g.og.description) { g.og.description = g.description || sub; n++; }
        return { applied: n, summary: n ? `填充 ${n} 项 SEO 字段` : "SEO 已就绪" };
      },
    },
    {
      id: "h5-fit", icon: "📱", kind: "rule",
      params: [{ key: "cols", label: { zh: "列数上限", en: "Max columns" }, type: "select", options: [["1", { zh: "1 列", en: "1 col" }], ["2", { zh: "2 列", en: "2 cols" }]], def: "2" }],
      name: { zh: "H5 适配优化", en: "H5 fit" },
      desc: { zh: "多列模块降为 1-2 列、收紧留白,移动端更顺", en: "Reduce columns and tighten spacing for mobile" },
      run(proj, params) {
        const maxCols = Number(params && params.cols) || 2;
        let n = 0;
        (proj.blocks || []).forEach((b) => {
          const p = b.props || {};
          if (typeof p.cols === "string" && Number(p.cols) > maxCols) { p.cols = String(maxCols); n++; }
          if (["features", "gallery", "cluster"].includes(b.type) && (b.style || {}).padding !== "tight") {
            b.style = b.style || {}; b.style.padding = "tight"; n++;
          }
        });
        return { applied: n, summary: n ? `调整 ${n} 处布局` : "布局已适配" };
      },
    },
    {
      id: "normalize", icon: "📐", kind: "rule",
      params: [{ key: "pad", label: { zh: "留白风格", en: "Spacing style" }, type: "select", options: [["normal", { zh: "标准", en: "Normal" }], ["loose", { zh: "宽松", en: "Loose" }]], def: "normal" }],
      name: { zh: "统一节奏", en: "Unify rhythm" },
      desc: { zh: "统一各模块留白与入场动画,避免忽快忽慢", en: "Normalize padding and entrance animation" },
      run(proj, params) {
        const basePad = (params && params.pad) === "loose" ? "loose" : "normal";
        let n = 0;
        (proj.blocks || []).forEach((b) => {
          b.style = b.style || {};
          const wantPad = ["hero", "cta"].includes(b.type) ? "loose" : basePad;
          if (b.style.padding !== wantPad) { b.style.padding = wantPad; n++; }
          const wantAnim = b.type === "nav" ? "none" : "up";
          if ((b.style.anim || "up") !== wantAnim) { b.style.anim = wantAnim; n++; }
        });
        return { applied: n, summary: n ? `统一 ${n} 处样式` : "节奏已统一" };
      },
    },

    /* ---------- AI 任务(固定提示词,走 Copilot 多步) ---------- */
    {
      id: "ai-cvr", icon: "📈", kind: "ai",
      params: [{ key: "count", label: { zh: "最多改动模块数", en: "Max blocks to change" }, type: "number", def: 3 }],
      name: { zh: "转化率优化", en: "Conversion boost" },
      desc: { zh: "重写主视觉与主要 CTA,让价值主张更具体", en: "Rewrite hero and CTAs to be more concrete" },
      prompt: "从转化率角度优化这个页面:把主视觉的标题改得更具体有力、副标题说清给谁带来什么结果、把各 CTA 文案改成动词短语。保持模块结构不变,只改必要的文本字段,最多改动 {{count}} 个模块。",
    },
    {
      id: "ai-polish", icon: "✨", kind: "ai",
      params: [{ key: "count", label: { zh: "最多改动模块数", en: "Max blocks to change" }, type: "number", def: 5 }],
      name: { zh: "全站文案润色", en: "Polish all copy" },
      desc: { zh: "逐块润色标题与描述,更具体、可信、有节奏", en: "Polish titles and descriptions block by block" },
      prompt: "润色这个页面的文案:标题更短更有力,描述更具体可信(加数字或场景),去掉空话套话。保持模块结构不变,只改文本字段,最多改动 {{count}} 个模块。",
    },
    {
      id: "ai-industry", icon: "🎯", kind: "ai",
      params: [{ key: "count", label: { zh: "最多改动模块数", en: "Max blocks to change" }, type: "number", def: 6 }],
      name: { zh: "贴合行业重写", en: "Industry rewrite" },
      desc: { zh: "推断行业后按该行业术语与信任点重写文案", en: "Infer the industry and rewrite with its language and trust points" },
      prompt: "根据当前页面内容判断所属行业,然后用该行业的专业术语、常见信任点与痛点重写文案。保持模块结构不变,最多改动 {{count}} 个模块。",
    },
  ];

  // ============================================================
  //  自定义任务(把对话指令存为任务)
  // ============================================================
  const KEY = "websflow.copilotTasks";

  WF.getCustomTasks = function () {
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { return []; }
  };

  WF.saveCustomTask = function (name, prompt) {
    const list = WF.getCustomTasks();
    list.unshift({ id: "ct" + Date.now().toString(36), icon: "⭐", kind: "ai", custom: true, name: { zh: name, en: name }, desc: { zh: prompt.slice(0, 40), en: prompt.slice(0, 40) }, prompt });
    try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, 20))); } catch (e) {}
    return list;
  };

  WF.removeCustomTask = function (id) {
    const list = WF.getCustomTasks().filter((x) => x.id !== id);
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {}
    return list;
  };

  // 参数默认值
  WF.taskDefaults = function (task) {
    const out = {};
    (task.params || []).forEach((p) => { out[p.key] = p.def != null ? p.def : ""; });
    return out;
  };

  // 提示词插值:{{key}} → 参数值
  WF.interpolateTaskPrompt = function (task, params) {
    return String(task.prompt || "").replace(/\{\{(\w+)\}\}/g, (m, k) => {
      const v = params && params[k];
      return v == null || v === "" ? (WF.taskDefaults(task)[k] || "") : String(v);
    });
  };

  // ---------- 执行历史(本地) ----------
  const RUN_KEY = "websflow.taskRuns";

  WF.getTaskRuns = function () {
    try { return JSON.parse(localStorage.getItem(RUN_KEY) || "[]"); } catch (e) { return []; }
  };

  WF.recordTaskRun = function (task, result, extra) {
    const list = WF.getTaskRuns();
    list.unshift({
      id: "r" + Date.now().toString(36),
      taskId: task.id,
      name: WF.taskLabel(task),
      kind: task.kind,
      at: Date.now(),
      applied: (result && result.applied) || 0,
      summary: (result && result.summary) || "",
      blocksAfter: (extra && extra.blocksAfter) || 0,
      clicksAt: (extra && extra.clicksAt != null) ? extra.clicksAt : null,
    });
    try { localStorage.setItem(RUN_KEY, JSON.stringify(list.slice(0, 30))); } catch (e) {}
    return list;
  };

  WF.taskParamLabel = function (p) {
    const lang = WF.getLang ? WF.getLang() : "zh";
    return (typeof p.label === "object" ? (p.label[lang] || p.label.zh) : p.label) || p.key;
  };
  WF.taskOptionLabel = function (n) {
    const lang = WF.getLang ? WF.getLang() : "zh";
    return (typeof n === "object" ? (n[lang] || n.zh) : n) || "";
  };

  // ---------- 自动提优 ----------
  // 对开启 autoOptimize 的实验:显著时把胜出版本设为默认(ref_variant)并下线落后版本
  WF.autoOptimizeExperiments = async function (fetchStats, unpublish, setRefVariant) {
    const st = await fetchStats();
    const map = {};
    (st.goals || []).forEach((g) => { map[g.goal_id] = g.count; });
    const done = [];
    const list = WF.getABExps() || [];   // 就地修改同一份列表,避免重新解析覆盖
    for (const exp of list) {
      if (!exp.autoOptimize) continue;
      const counts = exp.variants.map((v) => ({ views: map["view:" + v.cloudId] || 0, clicks: map[v.goalId] || 0 }));
      const s = WF.abStats(counts);
      if (!s.significant) continue;
      const winner = s.cvrA >= s.cvrB ? exp.variants[0] : exp.variants[1];
      const loser = s.cvrA >= s.cvrB ? exp.variants[1] : exp.variants[0];
      try { await unpublish(loser.cloudId); } catch (e) {}
      if (exp.refPage && setRefVariant) { try { await setRefVariant(winner.key, exp.id); } catch (e) {} }
      exp.promoted = { key: winner.key, at: Date.now(), cvrA: s.cvrA, cvrB: s.cvrB };
      exp.autoOptimize = false;
      done.push({ exp, winner: winner.key });
    }
    if (done.length) { try { localStorage.setItem(AB_KEY, JSON.stringify(list)); } catch (e) {} }
    return done;
  };

  // ---------- A/B 统计(共享:两比例 z 检验) ----------
  WF.normCdf = function (z) {
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp(-z * z / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return z > 0 ? 1 - p : p;
  };
  // counts: [{views, clicks}, {views, clicks}]
  WF.abStats = function (counts) {
    const [a, b] = counts;
    const va = (a && a.views) || 0, vb = (b && b.views) || 0;
    const ca = (a && a.clicks) || 0, cb = (b && b.clicks) || 0;
    const cvrA = va ? ca / va : 0, cvrB = vb ? cb / vb : 0;
    let z = 0, p = 1;
    if (va > 0 && vb > 0) {
      const pooled = (ca + cb) / (va + vb);
      const se = Math.sqrt(pooled * (1 - pooled) * (1 / va + 1 / vb));
      if (se > 0) { z = (cvrA - cvrB) / se; p = 2 * (1 - WF.normCdf(Math.abs(z))); }
    }
    return { cvrA, cvrB, z, p, significant: p < 0.05 && va >= 30 && vb >= 30, va, vb, ca, cb };
  };

  // ---------- A/B 实验(本地记录) ----------
  const AB_KEY = "websflow.abExps";

  WF.getABExps = function () {
    try { return JSON.parse(localStorage.getItem(AB_KEY) || "[]"); } catch (e) { return []; }
  };

  WF.saveABExp = function (exp) {
    const list = WF.getABExps();
    list.unshift(exp);
    try { localStorage.setItem(AB_KEY, JSON.stringify(list.slice(0, 20))); } catch (e) {}
    return list;
  };

  // 应用 Copilot 动作到指定项目(供 A/B 使用)
  WF.applyCopilotActions = function (proj, actions) {
    let applied = 0;
    (actions || []).forEach((a) => {
      if (a.action === "add_block" && WF.Blocks[a.type]) {
        const nb = WF.newBlock(a.type);
        nb.props = Object.assign(nb.props, a.props || {});
        proj.blocks.push(nb);
        applied++;
      } else if (a.action === "update_block") {
        const b = proj.blocks.find((x) => x.id === a.targetId);
        if (b) { b.props = Object.assign({}, b.props, a.props || {}); applied++; }
      } else if (a.action === "remove_block") {
        const i = proj.blocks.findIndex((x) => x.id === a.targetId);
        if (i >= 0) { proj.blocks.splice(i, 1); applied++; }
      }
    });
    return applied;
  };

  // 任务名/描述按当前语言取
  WF.taskLabel = function (task) {
    const lang = WF.getLang ? WF.getLang() : "zh";
    return (task.name && (task.name[lang] || task.name.zh)) || task.id;
  };
  WF.taskDesc = function (task) {
    const lang = WF.getLang ? WF.getLang() : "zh";
    return (task.desc && (task.desc[lang] || task.desc.zh)) || "";
  };
})(window.WF);
