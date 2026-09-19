/* ============================================================
 * WebsFlow · 模块布局变体注册表 (variants.js)
 *
 * 目标:让「一个模块 × 多种排版」可以增量扩展,而不改动既有渲染器。
 * 每个变体 = { name, render(props, ctx, block), css }
 *   - render 返回该变体的 HTML 片段(自带 __inner 包装,与外层 wb-inner 兼容)
 *   - css    为该变体所需样式字符串(内联进运行时样式,画布/导出/SSR 三端一致)
 *
 * 用法:
 *   WF.defineVariants("nav", {
 *     compact: { name: "紧凑单行", css: `.b-nav.is-compact ... { }`, render(p, ctx, b) { return `...`; } },
 *   });
 * 第一个定义的变体若模块尚无默认变体,则成为默认。
 * ============================================================ */
window.WF = window.WF || {};

(function (WF) {
  "use strict";

  WF.Variants = WF.Variants || {};
  const cssParts = [];   // [{ type, key, css }]

  // 注册一个模块的若干变体(可多次调用累加)
  WF.defineVariants = function (type, spec) {
    const def = WF.Blocks && WF.Blocks[type];
    if (!def) { console.warn("[WebsFlow] 变体注册失败:未知模块", type); return; }
    const isFirst = !WF.Variants[type];
    WF.Variants[type] = WF.Variants[type] || {};
    def.variants = def.variants || [];
    // 该模块原先没有变体时,保留"经典版式"(= 内置渲染器)作为默认选项:
    // 老项目里的块没有 variant 字段,依旧渲染成原来的样子。
    if (isFirst && !def.variants.length && WF.__baseRenderers && WF.__baseRenderers[type]) {
      WF.Variants[type].classic = {
        name: "经典版式",
        render: (p, ctx, b) => WF.__baseRenderers[type](p, ctx, b),
        css: "",
        isClassic: true,
      };
      def.variants.push(["classic", "经典版式"]);
      def.defaultVariant = "classic";
    }
    Object.keys(spec || {}).forEach((key) => {
      const v = spec[key];
      if (!v || typeof v.render !== "function") return;
      WF.Variants[type][key] = v;
      if (!def.variants.some(([k]) => k === key)) def.variants.push([key, v.name || key]);
      if (v.css) cssParts.push({ type, key, css: "/* " + type + ":" + key + " */\n" + (typeof v.css === "function" ? v.css() : v.css) });
    });
    if (!def.defaultVariant) def.defaultVariant = def.variants[0][0];
    // 已有模块记录(如已存在于画布)需要落到新变体时由 blockVariant 兜底
  };

  // 取某模块某变体的渲染器
  WF.variantRenderer = function (type, key) {
    const t = WF.Variants[type];
    return (t && key && t[key] && t[key].render) || null;
  };

  // 变体名称(供编辑器选择器使用,含默认变体)
  WF.variantLabel = function (type, key) {
    const t = WF.Variants[type];
    if (t && t[key] && t[key].name) return t[key].name;
    const def = WF.Blocks && WF.Blocks[type];
    const hit = ((def && def.variants) || []).find(([k]) => k === key);
    return hit ? hit[1] : key;
  };

  // 收集用到的变体(含容器子模块),用于按需内联样式
  function collectUsed(blocks, out) {
    (blocks || []).forEach((b) => {
      if (!b) return;
      const def = WF.Blocks[b.type];
      if (def && def.variants && b.variant) out.push({ type: b.type, key: b.variant });
      if (b.children && b.children.length) collectUsed(b.children, out);
    });
    return out;
  }

  // 运行时样式 = 基础样式 + 变体样式
  //  传入 project 或 blocks 时只内联用到的变体(导出/SSR 减小体积);不传则全量(编辑器画布需要切换)
  WF.allRuntimeCSS = function (target) {
    const blocks = Array.isArray(target) ? target : (target && target.blocks);
    if (!blocks) return (WF.runtimeCSS || "") + "\n" + cssParts.map((x) => x.css).join("\n");
    const used = collectUsed(blocks, []);
    const wanted = new Set(used.map((u) => u.type + "|" + u.key));
    // 容器/子块可能带变体但未被 collectUsed 覆盖到(插件等),保守加入
    const picked = cssParts.filter((x) => wanted.has(x.type + "|" + x.key));
    return (WF.runtimeCSS || "") + "\n" + picked.map((x) => x.css).join("\n");
  };
  WF.usedVariantCSS = function (blocks) {
    const used = collectUsed(blocks, []);
    const wanted = new Set(used.map((u) => u.type + "|" + u.key));
    return cssParts.filter((x) => wanted.has(x.type + "|" + x.key)).map((x) => x.css);
  };
})(window.WF);
