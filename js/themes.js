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
  WF.themeVars = function (theme) {
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
    return Object.entries(v).map(([k, val]) => `${k}:${val};`).join("");
  };

  WF.defaultTheme = function () { return { preset: "indigo", fontScale: 1 }; };

  // 深色背景 hero 判定:夜晚渐变需要反白文字
  WF.isDarkGradient = (g) => g === "night";
})(window.WF);
