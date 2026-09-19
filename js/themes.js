/* ============================================================
 * WebsFlow · 主题系统 (themes.js)
 * Elementor 的"全局样式"理念:改一处,全站生效。
 * ============================================================ */
window.WF = window.WF || {};

(function (WF) {
  "use strict";

  // 字体名用单引号:themeVars 会以 style="..." 内联输出,双引号会截断属性
  const SANS = `-apple-system, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Segoe UI', sans-serif`;
  const SERIF = `'Songti SC', 'Noto Serif SC', 'STSong', Georgia, serif`;
  const ROUND = `'Yuanti SC', 'PingFang SC', 'Hiragino Maru Gothic ProN', sans-serif`;

  WF.Fonts = [
    ["sans", "无衬线 · 现代清晰", SANS],
    ["serif", "衬线 · 人文杂志", SERIF],
    ["round", "圆体 · 亲和可爱", ROUND],
  ];

  // 渐变方案(hero 背景)
  WF.Gradients = {
    indigo: "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 45%, #f8fafc 100%)",
    sunset: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 45%, #fef3c7 100%)",
    forest: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 45%, #f0fdfa 100%)",
    rose: "linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #faf5ff 100%)",
    night: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #312e81 100%)",
    aqua: "linear-gradient(135deg, #ecfeff 0%, #cffafe 45%, #f0f9ff 100%)",
  };

  // ---------- 版式令牌(边距/节奏/圆角/阴影) ----------
  // 默认值 = 版式系统 v2 的出厂值,保证「未调参」的页面与升级前完全一致。
  WF.LayoutDefault = { sectionY: 76, gutter: 24, gap: 22, cardPad: 26, container: 1120, shadow: "medium" };

  // 派生比例:一个"段间距"滑杆同时驱动紧凑/宽松/主视觉等档位,保持节奏成比例
  WF.LayoutRatios = {
    tight: 0.58, loose: 1.37, hero: 1.42, h5: 0.68,
    xs: 0.36, sm: 0.64, lg: 1.55, xl: 2.36,
    chip: 0.6, panel: 1.54, panelLg: 2.15,
  };

  // 密度快捷档(一键设定段间距/栏距/卡片内边距)
  WF.Densities = [
    ["tight", "紧凑", { sectionY: 56, gap: 18, cardPad: 22 }],
    ["normal", "标准", { sectionY: 76, gap: 22, cardPad: 26 }],
    ["loose", "宽松", { sectionY: 96, gap: 28, cardPad: 32 }],
  ];

  WF.ContainerOptions = [1040, 1120, 1200, 1280];

  WF.ShadowPresets = {
    none: { sm: "none", md: "none", lg: "none" },
    subtle: {
      sm: "0 1px 2px rgba(15,23,42,.04)",
      md: "0 4px 14px -8px rgba(15,23,42,.12)",
      lg: "0 14px 36px -18px rgba(15,23,42,.18)",
    },
    medium: {
      sm: "0 1px 2px rgba(15,23,42,.06), 0 1px 1px rgba(15,23,42,.04)",
      md: "0 8px 24px -12px rgba(15,23,42,.18), 0 2px 6px rgba(15,23,42,.05)",
      lg: "0 24px 60px -24px rgba(15,23,42,.28)",
    },
    strong: {
      sm: "0 2px 4px rgba(15,23,42,.12)",
      md: "0 14px 34px -10px rgba(15,23,42,.30), 0 3px 8px rgba(15,23,42,.10)",
      lg: "0 34px 80px -28px rgba(15,23,42,.42)",
    },
  };


  // ---------- 风格档(voice) ----------
  // 基础秩序(字阶/组件高度/间距刻度)恒定,风格只切换少数设计旋钮:
  // 元信息字体、阴影强度、圆角比例、卡片质感、交互位移、强调色阴影、眉题形态、标题字距。
  // 这样可以"换风格不换骨架",避免每次换风格都重新调排版。
  WF.Voices = {
    clean: {
      name: "清爽简洁",
      metaFont: "sans", shadow: null, radiusScale: 1, cardBg: "bg", cardBorder: "line",
      hoverLift: -3, accentShadow: true, kicker: "mono", headingWeight: 800, headingLetter: "-.02em",
    },
    engineer: {
      name: "极简工程",
      metaFont: "mono", shadow: "none", radiusScale: .5, cardBg: "surface", cardBorder: "line",
      hoverLift: 0, accentShadow: false, kicker: "mono", headingWeight: 700, headingLetter: "-.01em",
    },
    soft: {
      name: "柔和亲和",
      metaFont: "sans", shadow: "medium", radiusScale: 1.5, cardBg: "surface", cardBorder: "none",
      hoverLift: -4, accentShadow: true, kicker: "plain", headingWeight: 800, headingLetter: "-.01em",
    },
    editorial: {
      name: "杂志编辑",
      metaFont: "sans", shadow: "none", radiusScale: .28, cardBg: "transparent", cardBorder: "none",
      hoverLift: 0, accentShadow: false, kicker: "plain", headingWeight: 700, headingLetter: "0em",
    },
    bold: {
      name: "高对比宣言",
      metaFont: "mono", shadow: "strong", radiusScale: .85, cardBg: "surface", cardBorder: "line",
      hoverLift: -2, accentShadow: true, kicker: "mono", headingWeight: 900, headingLetter: "-.03em",
    },
  };

  WF.voiceOf = function (theme) {
    const key = (theme && theme.voice) || "clean";
    return Object.assign({ key }, WF.Voices[key] || WF.Voices.clean);
  };

  // 风格 → CSS 变量(基础秩序不动,只切旋钮)
  WF.voiceVars = function (theme) {
    const v = WF.voiceOf(theme);
    const S = WF.ShadowPresets[v.shadow] || null;
    const out = {
      "--wf-meta-font": v.metaFont === "mono" ? "var(--wf-mono)" : "var(--wf-font)",
      "--wf-radius-scale": String(v.radiusScale),
      "--wf-card-bg": v.cardBg === "transparent" ? "transparent" : (v.cardBg === "surface" ? "var(--wf-surface)" : "var(--wf-bg)"),
      "--wf-card-border": v.cardBorder === "none" ? "transparent" : "var(--wb-line)",
      "--wf-hover-lift": v.hoverLift + "px",
      "--wf-accent-shadow": v.accentShadow ? "var(--wb-shadow-action)" : "none",
      "--wf-accent-shadow-hover": v.accentShadow ? "var(--wb-shadow-action-hover)" : "none",
      "--wf-kicker-display": v.kicker === "hidden" ? "none" : "inline-block",
      "--wf-kicker-transform": v.kicker === "plain" ? "none" : "uppercase",
      "--wf-heading-weight": String(v.headingWeight),
      "--wf-heading-letter": v.headingLetter,
    };
    void S;
    return Object.entries(out).map(([k, val]) => `${k}:${val};`).join("");
  };

  // ---------- 分形态默认 ----------
  // 同一份内容在官网 / H5 / PPT / 互动故事下应有不同的呼吸感:
  // 手机屏更紧凑、幻灯更宽松(投影阅读距离远)、叙事页略宽松。
  WF.ModeLayoutDefaults = {
    site: {},
    h5: { sectionY: 46, gutter: 18, gap: 16, cardPad: 20, container: 720, shadow: "subtle" },
    ppt: { sectionY: 60, gutter: 28, gap: 30, cardPad: 34, shadow: "subtle" },
    story: { sectionY: 88, gutter: 24, gap: 24, cardPad: 28, shadow: "medium" },
  };

  // ---------- 内置版式库(团队可直接取用) ----------
  WF.BuiltinLayoutPresets = [
    { key: "bp-compact", name: "紧凑高效", layout: { sectionY: 52, gutter: 20, gap: 16, cardPad: 20, container: 1120, shadow: "subtle" } },
    { key: "bp-standard", name: "标准均衡", layout: { sectionY: 76, gutter: 24, gap: 22, cardPad: 26, container: 1120, shadow: "medium" } },
    { key: "bp-roomy", name: "宽松大气", layout: { sectionY: 104, gutter: 32, gap: 30, cardPad: 34, container: 1200, shadow: "medium" } },
    { key: "bp-showcase", name: "展示型(宽幕)", layout: { sectionY: 96, gutter: 40, gap: 34, cardPad: 36, container: 1280, shadow: "strong" } },
    { key: "bp-editorial", name: "杂志阅读", layout: { sectionY: 88, gutter: 28, gap: 26, cardPad: 24, container: 1040, shadow: "none" } },
    { key: "bp-flat", name: "极简扁平", layout: { sectionY: 64, gutter: 24, gap: 18, cardPad: 22, container: 1120, shadow: "none" } },
  ];

  // ---------- 本地版式库(未登录也可保存) ----------
  const LAYOUT_KEY = "websflow.layoutPresets";
  WF.localLayoutPresets = function () {
    try { return JSON.parse(localStorage.getItem(LAYOUT_KEY) || "[]"); } catch (e) { return []; }
  };
  WF.saveLocalLayoutPreset = function (name, layout) {
    const list = WF.localLayoutPresets().filter((x) => x.name !== name);
    list.unshift({ key: "local-" + Date.now().toString(36), name, layout, local: true });
    try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(list.slice(0, 40))); } catch (e) {}
    return list;
  };
  WF.deleteLocalLayoutPreset = function (key) {
    const list = WF.localLayoutPresets().filter((x) => x.key !== key);
    try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(list)); } catch (e) {}
    return list;
  };

  // 主题预设可自带 layout(个性覆盖);未指定则完全跟随形态默认

  WF.ThemePresets = [
    {
      key: "indigo", name: "靛蓝科技",
      primary: "#4f46e5", primarySoft: "#eef2ff", bg: "#ffffff", surface: "#f8fafc",
      text: "#111827", muted: "#64748b", border: "#e2e8f0", radius: 16, font: "sans",
    },
    {
      key: "sunset", name: "暖阳活力",
      primary: "#ea580c", primarySoft: "#fff7ed", bg: "#fffdf9", surface: "#fef3e7",
      text: "#1c1917", muted: "#78716c", border: "#f5e7d8", radius: 18, font: "round",
    },
    {
      key: "forest", name: "墨绿自然",
      primary: "#059669", primarySoft: "#ecfdf5", bg: "#ffffff", surface: "#f0fdf4",
      text: "#1a2e22", muted: "#6b7f74", border: "#d7e8dd", radius: 14, font: "serif",
    },
    {
      key: "rose", name: "樱花甜梦",
      primary: "#db2777", primarySoft: "#fdf2f8", bg: "#fffafa", surface: "#fdf2f8",
      text: "#3b1f2b", muted: "#97707f", border: "#f6dfe7", radius: 20, font: "round",
    },
    {
      key: "aqua", name: "水岸清爽",
      primary: "#0891b2", primarySoft: "#ecfeff", bg: "#ffffff", surface: "#f0f9ff",
      text: "#0c2430", muted: "#5f7d8c", border: "#d8ecf2", radius: 16, font: "sans",
    },
    {
      key: "ink", name: "极简黑白",
      primary: "#111827", primarySoft: "#f3f4f6", bg: "#ffffff", surface: "#f7f7f8",
      text: "#111827", muted: "#6b7280", border: "#e5e7eb", radius: 6, font: "serif",
      layout: { shadow: "none" },
    },
    {
      key: "night", name: "深空暗夜",
      primary: "#818cf8", primarySoft: "#312e81", bg: "#0f172a", surface: "#1e293b",
      text: "#f1f5f9", muted: "#94a3b8", border: "#334155", radius: 16, font: "sans",
    },
    {
      key: "gold", name: "典雅金棕",
      primary: "#b45309", primarySoft: "#fef3c7", bg: "#fffdf7", surface: "#faf3e3",
      text: "#292018", muted: "#857666", border: "#eadfc8", radius: 10, font: "serif",
    },
  ];

  WF.getPreset = (key) => WF.ThemePresets.find((t) => t.key === key) || WF.ThemePresets[0];
  WF.fontStack = (key) => (WF.Fonts.find((f) => f[0] === key) || WF.Fonts[0])[2];

  // project.theme → CSS 变量文本
  WF.themeVars = function (theme, mode) {
    const preset = WF.getPreset(theme && theme.preset);
    const v = {
      "--wf-primary": theme && theme.primary ? theme.primary : preset.primary,
      "--wf-primary-soft": theme && theme.primarySoft ? theme.primarySoft : preset.primarySoft,
      "--wf-bg": theme && theme.bg ? theme.bg : preset.bg,
      "--wf-surface": theme && theme.surface ? theme.surface : preset.surface,
      "--wf-text": theme && theme.text ? theme.text : preset.text,
      "--wf-muted": theme && theme.muted ? theme.muted : preset.muted,
      "--wf-border": theme && theme.border ? theme.border : preset.border,
      "--wf-radius": (theme && theme.radius != null ? theme.radius : preset.radius) + "px",
      "--wf-font": WF.fontStack(theme && theme.font ? theme.font : preset.font),
      "--wf-heading-font": (theme && theme.headingFont ? WF.fontStack(theme.headingFont) : null) || "var(--wf-font)",
      "--wf-font-scale": (theme && theme.fontScale ? theme.fontScale : 1) + "",
    };
    return Object.entries(v).map(([k, val]) => `${k}:${val};`).join("") + WF.layoutVars(theme, mode) + WF.voiceVars(theme);
  };

  // 解析项目实际生效的版式(出厂默认 ← 形态默认 ← 预设 ← 站点覆盖)
  WF.layoutOf = function (theme, mode) {
    const preset = WF.getPreset(theme && theme.preset);
    const m = mode || "site";
    const useMode = !(theme && theme.useModeLayout === false);
    const modeDefaults = useMode ? (WF.ModeLayoutDefaults[m] || {}) : {};
    const voice = WF.voiceOf(theme);
    const base = Object.assign({}, WF.LayoutDefault, modeDefaults, (preset && preset.layout) || {});
    // 阴影优先级:形态/预设默认 < 风格建议 < 用户显式设置
    if (voice.shadow) base.shadow = voice.shadow;
    const over = (theme && theme.layout) || {};
    const out = Object.assign(base, over);
    // 数值兜底 + 范围保护
    const num = (v, d, lo, hi) => { const n = Number(v); return isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
    return {
      sectionY: num(out.sectionY, 76, 24, 200),
      gutter: num(out.gutter, 24, 8, 72),
      gap: num(out.gap, 22, 6, 64),
      cardPad: num(out.cardPad, 26, 8, 64),
      container: num(out.container, 1120, 480, 1600),
      shadow: WF.ShadowPresets[out.shadow] ? out.shadow : "medium",
    };
  };

  // 流体值:桌面用设定值,窄屏按比例收窄(保持响应式,不会在手机端过大)
  const fluid = (px) => {
    const v = Math.round(px);
    return `clamp(${Math.round(v * 0.7)}px, ${(v / 12.8).toFixed(2)}vw, ${v}px)`;
  };

  // 版式令牌 → CSS 变量
  WF.layoutVars = function (theme, mode) {
    const L = WF.layoutOf(theme, mode);
    const R = WF.LayoutRatios;
    const S = WF.ShadowPresets[L.shadow];
    const px = (n) => Math.round(n) + "px";
    const v = {
      "--wb-container": px(L.container),
      "--wb-gutter": fluid(L.gutter),
      "--wb-section-y": fluid(L.sectionY),
      "--wb-section-y-tight": fluid(L.sectionY * R.tight),
      "--wb-section-y-loose": fluid(L.sectionY * R.loose),
      "--wb-section-y-hero": fluid(L.sectionY * R.hero),
      "--wb-section-y-h5": fluid(L.sectionY * R.h5),
      "--wb-gap": px(L.gap),
      "--wb-gap-xs": px(L.gap * R.xs),
      "--wb-gap-sm": px(L.gap * R.sm),
      "--wb-gap-lg": px(L.gap * R.lg),
      "--wb-gap-xl": px(L.gap * R.xl),
      "--wb-card-pad": fluid(L.cardPad),
      "--wb-chip-pad": px(L.cardPad * R.chip),
      "--wb-panel-pad": fluid(L.cardPad * R.panel),
      "--wb-panel-pad-lg": fluid(L.cardPad * R.panelLg),
      "--wb-head-gap": fluid(L.sectionY * 0.53),
      "--wb-shadow-sm": S.sm,
      "--wb-shadow-md": S.md,
      "--wb-shadow-lg": S.lg,
    };
    return Object.entries(v).map(([k, val]) => `${k}:${val};`).join("");
  };

  WF.defaultTheme = function () { return { preset: "indigo", fontScale: 1 }; };

  // 深色背景 hero 判定:夜晚渐变需要反白文字
  WF.isDarkGradient = (g) => g === "night";
})(window.WF);
