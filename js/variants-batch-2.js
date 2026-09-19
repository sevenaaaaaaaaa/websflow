/* ============================================================
 * WebsFlow · 布局变体 · 批次 2(展示类)
 * hero / features / testimonials / cta / gallery / stats /
 * timeline / pricing / faq
 * 约定:render(p, ctx, b) 返回模块内部 HTML;样式以
 *   .<模块 b- 类>.is-v-<key> 作用域书写;仅使用各模块已有 props。
 * ============================================================ */
window.WF = window.WF || {};

(function (WF) {
  "use strict";
  const esc = (s) => WF.esc(s);
  const nl2br = (s) => WF.nl2br(s);
  const btn = (...a) => WF.btn(...a);
  const imgOrPh = (...a) => WF.imgOrPh(...a);
  const headHTML = (...a) => WF.headHTML(...a);
  const lines = (s) => String(s || "").split(/\n+/).map((x) => x.trim()).filter(Boolean);
  const emptyState = (label) => `<div class="wf-ph" data-label="${esc(label)}"></div>`;

  /* ------------------------------------------------------------
   * hero 公共片段:背景与按钮(不新增字段,只读已有 props)
   * ---------------------------------------------------------- */
  const heroBg = (p) => {
    if (p.bgType === "image" && p.image) {
      return { attr: ` style="--wb-hero-bg:url('${esc(p.image)}')"`, cls: " is-image", dark: true };
    }
    if (p.bgType === "gradient") {
      return { attr: ` style="--wb-hero-bg:${WF.gradCss(p.gradient)}"`, cls: "", dark: p.gradient === "night" };
    }
    return { attr: "", cls: "", dark: false };
  };
  const heroButtons = (p, light) =>
    `<div class="wf-btn-group b-hero__btns">
      ${btn(p.btnText, p.btnLink, light ? "is-light" : "is-primary")}
      ${btn(p.btn2Text, p.btn2Link, light ? "is-outline-light" : "is-ghost")}
    </div>`;

  /* ============================ 主视觉 ============================ */
  WF.defineVariants("hero", {
    compact: {
      name: "紧凑横排",
      render(p) {
        const bg = heroBg(p);
        return `<div class="b-hero__bg${bg.cls}"${bg.attr}></div>
          <div class="b-hero__inner is-compact${bg.dark ? " is-dark" : ""}">
            <div class="b-hero__compact">
              <div class="b-hero__copy">
                ${p.badge ? `<span class="b-hero__badge">${esc(p.badge)}</span>` : ""}
                <h1 class="b-hero__title">${esc(p.title)}</h1>
                ${p.subtitle ? `<p class="b-hero__subtitle">${nl2br(p.subtitle)}</p>` : ""}
              </div>
              ${heroButtons(p, bg.dark)}
            </div>
          </div>`;
      },
      css: `
.b-hero.is-v-compact .b-hero__inner { padding: 64px 24px; }
.b-hero.is-v-compact .b-hero__compact {
  display: flex; align-items: center; justify-content: space-between;
  gap: clamp(24px, 4vw, 56px);
}
.b-hero.is-v-compact .b-hero__copy { max-width: 640px; }
.b-hero.is-v-compact .b-hero__title { font-size: var(--wf-fs-h2); }
.b-hero.is-v-compact .b-hero__subtitle { max-width: 560px; }
.b-hero.is-v-compact .b-hero__btns {
  margin-top: 0; flex: 0 0 auto; flex-direction: column; align-items: stretch;
}
.b-hero.is-v-compact .b-hero__inner.is-dark { color: #fff; }
.b-hero.is-v-compact .b-hero__inner.is-dark .b-hero__subtitle { color: rgba(255,255,255,.85); }
.b-hero.is-v-compact .b-hero__inner.is-dark .b-hero__badge {
  background: rgba(255,255,255,.14); border-color: rgba(255,255,255,.3); color: #fff;
}
@media (max-width: 860px) {
  .b-hero.is-v-compact .b-hero__compact { flex-direction: column; align-items: flex-start; }
  .b-hero.is-v-compact .b-hero__btns { flex-direction: row; align-items: center; }
}
@media (max-width: 560px) {
  .b-hero.is-v-compact .b-hero__btns { flex-direction: column; align-items: stretch; width: 100%; }
}
`,
    },

    panel: {
      name: "画框悬浮",
      render(p) {
        const bg = heroBg(p);
        return `<div class="b-hero__bg${bg.cls}"${bg.attr}></div>
          <div class="b-hero__inner is-board${bg.dark ? " is-dark" : ""}">
            <div class="b-hero__board">
              ${p.badge ? `<span class="b-hero__badge">${esc(p.badge)}</span>` : ""}
              <h1 class="b-hero__title">${esc(p.title)}</h1>
              ${p.subtitle ? `<p class="b-hero__subtitle">${nl2br(p.subtitle)}</p>` : ""}
              ${heroButtons(p, bg.dark)}
            </div>
          </div>`;
      },
      css: `
.b-hero.is-v-panel .b-hero__inner { padding: 84px 24px; }
.b-hero.is-v-panel .b-hero__board {
  max-width: 820px; margin: 0 auto; text-align: center;
  background: var(--wf-bg); border: 1px solid var(--wb-line);
  border-radius: calc(var(--wf-radius) * 1.4);
  padding: clamp(32px, 5vw, 64px) clamp(24px, 4vw, 56px);
  box-shadow: var(--wb-shadow-lg);
}
.b-hero.is-v-panel .b-hero__inner.is-dark .b-hero__board {
  background: color-mix(in srgb, #0b1220 58%, transparent);
  border-color: rgba(255,255,255,.18); color: #fff; backdrop-filter: blur(12px);
}
.b-hero.is-v-panel .b-hero__inner.is-dark .b-hero__subtitle { color: rgba(255,255,255,.85); }
.b-hero.is-v-panel .b-hero__inner.is-dark .b-hero__badge {
  background: rgba(255,255,255,.14); border-color: rgba(255,255,255,.3); color: #fff;
}
.b-hero.is-v-panel .b-hero__btns { justify-content: center; }
@media (max-width: 560px) {
  .b-hero.is-v-panel .b-hero__inner { padding: 52px 20px; }
}
`,
    },
  });

  /* ============================ 特性网格 ============================ */
  WF.defineVariants("features", {
    spotlight: {
      name: "一大两小",
      render(p) {
        const items = p.items || [];
        if (!items.length) return `<div class="wb-inner">${headHTML(p, p.align === "center")}${emptyState("请添加特性项")}</div>`;
        const first = items[0];
        const rest = items.slice(1);
        const hero = `<div class="wb-card is-lift b-feat-spot__hero">
            <div class="b-feat-spot__icon">${esc(first.icon || "✦")}</div>
            <div class="b-feat-spot__t">${esc(first.title)}</div>
            ${first.desc ? `<p class="b-feat-spot__d">${nl2br(first.desc)}</p>` : ""}
          </div>`;
        const rows = rest.map((it) => `<div class="b-feat-spot__row">
            <span class="b-feat-spot__mini">${esc(it.icon || "✦")}</span>
            <div class="b-feat-spot__rowbox">
              <div class="b-feat-spot__rowt">${esc(it.title)}</div>
              ${it.desc ? `<p class="b-feat-spot__rowd">${nl2br(it.desc)}</p>` : ""}
            </div>
          </div>`).join("");
        return `<div class="wb-inner">
          ${headHTML(p, p.align === "center")}
          <div class="b-feat-spot${rest.length ? "" : " is-single"}">
            ${hero}
            <div class="b-feat-spot__side">${rows}</div>
          </div>
        </div>`;
      },
      css: `
.b-features.is-v-spotlight .b-feat-spot {
  display: grid; grid-template-columns: 1.15fr .85fr;
  gap: var(--wb-space-5); align-items: stretch;
}
.b-features.is-v-spotlight .b-feat-spot.is-single { grid-template-columns: 1fr; }
.b-features.is-v-spotlight .b-feat-spot__hero {
  display: flex; flex-direction: column; justify-content: center;
  padding: clamp(28px, 4vw, 48px);
}
.b-features.is-v-spotlight .b-feat-spot__icon {
  width: 64px; height: 64px; border-radius: var(--wb-radius-md); font-size: 30px;
  background: var(--wf-primary-soft); display: inline-flex; align-items: center; justify-content: center;
  margin-bottom: var(--wb-space-4);
}
.b-features.is-v-spotlight .b-feat-spot__t { font-size: var(--wf-fs-h2); font-weight: 750; letter-spacing: -.02em; }
.b-features.is-v-spotlight .b-feat-spot__d { margin-top: 10px; color: var(--wf-muted); line-height: 1.8; }
.b-features.is-v-spotlight .b-feat-spot__side { display: grid; gap: var(--wb-space-3); align-content: start; }
.b-features.is-v-spotlight .b-feat-spot__row {
  display: flex; gap: var(--wb-gap-sm); align-items: flex-start;
  padding: var(--wb-space-3) var(--wb-space-4);
  background: var(--wf-surface); border: 1px solid var(--wb-line); border-radius: var(--wb-radius-md);
  transition: border-color .2s var(--wb-ease);
}
.b-features.is-v-spotlight .b-feat-spot__row:hover { border-color: color-mix(in srgb, var(--wf-primary) 30%, var(--wb-line)); }
.b-features.is-v-spotlight .b-feat-spot__mini {
  flex: 0 0 auto; width: 38px; height: 38px; border-radius: 10px; font-size: 18px;
  background: var(--wf-primary-soft); color: var(--wf-primary);
  display: inline-flex; align-items: center; justify-content: center;
}
.b-features.is-v-spotlight .b-feat-spot__rowt { font-weight: 700; }
.b-features.is-v-spotlight .b-feat-spot__rowd { color: var(--wf-muted); font-size: .92em; margin-top: 4px; }
@media (max-width: 860px) {
  .b-features.is-v-spotlight .b-feat-spot { grid-template-columns: 1fr; }
}
`,
    },

    inline: {
      name: "横排图标",
      render(p) {
        const items = p.items || [];
        if (!items.length) return `<div class="wb-inner">${headHTML(p, p.align === "center")}${emptyState("请添加特性项")}</div>`;
        const cards = items.map((it) => `<div class="wb-card is-flat b-feat-inline__item">
            <span class="b-feat-inline__icon">${esc(it.icon || "✦")}</span>
            <div>
              <div class="wb-card__title">${esc(it.title)}</div>
              ${it.desc ? `<p class="wb-card__body">${nl2br(it.desc)}</p>` : ""}
            </div>
          </div>`).join("");
        return `<div class="wb-inner">
          ${headHTML(p, p.align === "center")}
          <div class="wb-grid b-feat-inline__grid" data-cols="2">${cards}</div>
        </div>`;
      },
      css: `
.b-features.is-v-inline .b-feat-inline__grid { gap: var(--wb-space-3); }
.b-features.is-v-inline .b-feat-inline__item { display: flex; gap: var(--wb-gap-sm); align-items: flex-start; }
.b-features.is-v-inline .b-feat-inline__icon {
  flex: 0 0 auto; width: 44px; height: 44px; border-radius: 999px; font-size: 20px;
  background: var(--wf-primary-soft); color: var(--wf-primary);
  display: inline-flex; align-items: center; justify-content: center;
}
.b-features.is-v-inline .wb-card__body { margin-top: 6px; }
@media (max-width: 560px) {
  .b-features.is-v-inline .b-feat-inline__grid { grid-template-columns: 1fr !important; }
}
`,
    },
  });

  /* ------------------------------------------------------------
   * testimonials 公共片段:作者行 / 头像
   * ---------------------------------------------------------- */
  const testiWho = (it) => `<div class="wb-row b-testi-who">
      <span class="wb-avatar b-testi-who__av">${it.avatar ? `<img src="${esc(it.avatar)}" alt="" loading="lazy">` : esc((it.name || "友").slice(0, 1))}</span>
      <div><div class="wb-name">${esc(it.name)}</div><div class="wb-role">${esc(it.role)}</div></div>
    </div>`;
  const testiWhoCss = (scope) => `
${scope} .b-testi-who__av {
  width: 40px; height: 40px; background: var(--wf-primary-soft); color: var(--wf-primary);
  font-weight: 700; display: inline-flex; align-items: center; justify-content: center;
}`;

  /* ============================ 用户评价 ============================ */
  WF.defineVariants("testimonials", {
    masonry: {
      name: "瀑布流",
      render(p) {
        const items = p.items || [];
        if (!items.length) return `<div class="wb-inner">${headHTML(p, p.align === "center")}${emptyState("请添加评价")}</div>`;
        const cards = items.map((it) => `<div class="b-testi-masonry__card">
            <p class="wb-quote b-testi-masonry__q">${esc(it.quote)}</p>
            ${testiWho(it)}
          </div>`).join("");
        return `<div class="wb-inner">
          ${headHTML(p, p.align === "center")}
          <div class="b-testi-masonry">${cards}</div>
        </div>`;
      },
      css: `
.b-testimonials.is-v-masonry .b-testi-masonry { column-count: 3; column-gap: var(--wb-space-4); }
.b-testimonials.is-v-masonry .b-testi-masonry__card {
  break-inside: avoid; -webkit-column-break-inside: avoid;
  background: var(--wf-bg); border: 1px solid var(--wb-line); border-radius: var(--wb-radius-lg);
  padding: var(--wb-space-4); margin: 0 0 var(--wb-space-4); box-shadow: var(--wb-shadow-sm);
}
.b-testimonials.is-v-masonry .b-testi-masonry__q { margin-bottom: var(--wb-space-4); }
${testiWhoCss(".b-testimonials.is-v-masonry")}
@media (max-width: 860px) { .b-testimonials.is-v-masonry .b-testi-masonry { column-count: 2; } }
@media (max-width: 560px) { .b-testimonials.is-v-masonry .b-testi-masonry { column-count: 1; } }
`,
    },

    rail: {
      name: "横向卡片",
      render(p) {
        const items = p.items || [];
        if (!items.length) return `<div class="wb-inner">${headHTML(p, p.align === "center")}${emptyState("请添加评价")}</div>`;
        const cards = items.map((it) => `<div class="wb-card is-lift b-testi-rail__card">
            <p class="wb-quote b-testi-rail__q">${esc(it.quote)}</p>
            ${testiWho(it)}
          </div>`).join("");
        return `<div class="wb-inner">
          ${headHTML(p, p.align === "center")}
          <div class="wb-rail b-testi-rail">${cards}</div>
        </div>`;
      },
      css: `
.b-testimonials.is-v-rail .wb-rail { grid-auto-columns: minmax(280px, 1fr); align-items: stretch; }
.b-testimonials.is-v-rail .b-testi-rail__card { display: flex; flex-direction: column; gap: var(--wb-space-4); }
.b-testimonials.is-v-rail .b-testi-rail__q { flex: 1; }
${testiWhoCss(".b-testimonials.is-v-rail")}
@media (max-width: 560px) { .b-testimonials.is-v-rail .wb-rail { grid-auto-columns: minmax(240px, 1fr); } }
`,
    },
  });

  /* ------------------------------------------------------------
   * cta 公共片段:带转化目标上报的按钮
   * ---------------------------------------------------------- */
  const ctaButton = (p, light) => {
    let b = btn(p.btnText, p.btnLink, light ? "is-light" : "is-primary");
    if (p.goalId && b) b = b.replace("<a ", `<a data-track-click="${esc(p.goalId)}" data-goal="${esc(p.goalId)}" `);
    return b;
  };

  /* ============================ 行动号召 ============================ */
  WF.defineVariants("cta", {
    minimal: {
      name: "极简通栏",
      render(p) {
        return `<div class="wb-inner is-tight">
          <div class="b-cta-min">
            <div class="b-cta-min__copy">
              <div class="b-cta__title">${esc(p.title)}</div>
              ${p.subtitle ? `<p class="b-cta__subtitle">${nl2br(p.subtitle)}</p>` : ""}
            </div>
            <div class="b-cta-min__btn">${ctaButton(p, false)}</div>
          </div>
        </div>`;
      },
      css: `
.b-cta.is-v-minimal .b-cta-min {
  display: flex; align-items: center; justify-content: space-between; gap: var(--wb-space-4);
  padding: var(--wb-space-4) 0; border-top: 1px solid var(--wb-line); border-bottom: 1px solid var(--wb-line);
}
.b-cta.is-v-minimal .b-cta__title { font-size: var(--wf-fs-h2); }
.b-cta.is-v-minimal .b-cta__subtitle { color: var(--wf-muted); font-size: var(--wf-fs-lead); }
.b-cta.is-v-minimal .b-cta-min__btn { flex: 0 0 auto; }
@media (max-width: 860px) {
  .b-cta.is-v-minimal .b-cta-min { flex-direction: column; align-items: flex-start; }
}
`,
    },

    floating: {
      name: "悬浮卡片",
      render(p) {
        const styleCls = p.style === "gradient" ? " is-gradient" : p.style === "surface" ? " is-surface" : "";
        const light = p.style !== "surface";
        return `<div class="wb-inner">
          <div class="b-cta-float${styleCls}"${p.goalId ? ` data-goal="${esc(p.goalId)}"` : ""}>
            <div class="b-cta__title">${esc(p.title)}</div>
            ${p.subtitle ? `<p class="b-cta__subtitle">${nl2br(p.subtitle)}</p>` : ""}
            <div class="wf-btn-group b-cta-float__btns">${ctaButton(p, light)}</div>
          </div>
        </div>`;
      },
      css: `
.b-cta.is-v-floating .b-cta-float {
  position: relative; overflow: hidden; max-width: 880px; margin: 0 auto; text-align: center;
  border-radius: calc(var(--wf-radius) * 1.5);
  padding: clamp(40px, 5vw, 68px) clamp(24px, 4vw, 56px);
  background: var(--wf-primary); color: #fff; box-shadow: var(--wb-shadow-lg);
}
.b-cta.is-v-floating .b-cta-float.is-gradient {
  background: linear-gradient(120deg, var(--wf-primary), color-mix(in srgb, var(--wf-primary) 55%, #9333ea));
}
.b-cta.is-v-floating .b-cta-float.is-surface {
  background: var(--wf-surface); color: var(--wf-text); border: 1px solid var(--wb-line);
}
.b-cta.is-v-floating .b-cta-float::before {
  content: ""; position: absolute; top: 0; left: 0; right: 0; height: 4px;
  background: rgba(255,255,255,.55);
}
.b-cta.is-v-floating .b-cta-float.is-surface::before { background: var(--wf-primary); }
.b-cta.is-v-floating .b-cta-float__btns { margin-top: var(--wb-space-4); justify-content: center; }
`,
    },
  });

  /* ============================ 图片墙 ============================ */
  WF.defineVariants("gallery", {
    grid: {
      name: "等距网格",
      render(p) {
        const items = p.items || [];
        if (!items.length) return `<div class="wb-inner">${headHTML(p, p.align === "center")}${emptyState("请添加图片")}</div>`;
        const cells = items.map((it) => `<figure class="wb-media b-gal-grid__cell" data-ratio="4x3">
            ${imgOrPh(it.image, "图片", 'loading="lazy"')}
            ${it.caption ? `<figcaption class="b-gal-grid__cap">${esc(it.caption)}</figcaption>` : ""}
          </figure>`).join("");
        return `<div class="wb-inner">
          ${headHTML(p, p.align === "center")}
          <div class="wb-grid" data-cols="${esc(p.cols || "3")}">${cells}</div>
        </div>`;
      },
      css: `
.b-gallery.is-v-grid .b-gal-grid__cell { margin: 0; aspect-ratio: 4 / 3; }
.b-gallery.is-v-grid .b-gal-grid__cap {
  position: absolute; left: 0; right: 0; bottom: 0; padding: 30px 14px 12px;
  color: #fff; font-size: var(--wf-fs-meta); background: linear-gradient(transparent, rgba(0,0,0,.6));
}
`,
    },

    mosaic: {
      name: "错落拼贴",
      render(p) {
        const items = p.items || [];
        if (!items.length) return `<div class="wb-inner">${headHTML(p, p.align === "center")}${emptyState("请添加图片")}</div>`;
        const cells = items.map((it, i) => `<figure class="wb-media b-gal-mosaic__cell${i === 0 ? " is-lead" : ""}">
            ${imgOrPh(it.image, "图片", 'loading="lazy"')}
            ${it.caption ? `<figcaption class="b-gal-mosaic__cap">${esc(it.caption)}</figcaption>` : ""}
          </figure>`).join("");
        return `<div class="wb-inner">
          ${headHTML(p, p.align === "center")}
          <div class="b-gal-mosaic">${cells}</div>
        </div>`;
      },
      css: `
.b-gallery.is-v-mosaic .b-gal-mosaic {
  display: grid; grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: minmax(130px, 1fr); gap: var(--wb-space-3);
}
.b-gallery.is-v-mosaic .b-gal-mosaic__cell { margin: 0; height: 100%; min-height: 130px; }
.b-gallery.is-v-mosaic .b-gal-mosaic__cell.is-lead { grid-column: span 2; grid-row: span 2; }
.b-gallery.is-v-mosaic .b-gal-mosaic__cap {
  position: absolute; left: 0; right: 0; bottom: 0; padding: 30px 14px 12px;
  color: #fff; font-size: var(--wf-fs-meta); background: linear-gradient(transparent, rgba(0,0,0,.6));
}
@media (max-width: 860px) {
  .b-gallery.is-v-mosaic .b-gal-mosaic { grid-template-columns: repeat(2, 1fr); grid-auto-rows: minmax(120px, 1fr); }
  .b-gallery.is-v-mosaic .b-gal-mosaic__cell.is-lead { grid-column: span 2; grid-row: span 1; }
}
`,
    },

    strip: {
      name: "横向胶卷",
      render(p) {
        const items = p.items || [];
        if (!items.length) return `<div class="wb-inner">${headHTML(p, p.align === "center")}${emptyState("请添加图片")}</div>`;
        const cells = items.map((it) => `<figure class="b-gal-strip__cell">
            <div class="wb-media" data-ratio="4x3">${imgOrPh(it.image, "图片", 'loading="lazy"')}</div>
            ${it.caption ? `<figcaption class="b-gal-strip__cap">${esc(it.caption)}</figcaption>` : ""}
          </figure>`).join("");
        return `<div class="wb-inner">
          ${headHTML(p, p.align === "center")}
          <div class="wb-rail b-gal-strip">${cells}</div>
        </div>`;
      },
      css: `
.b-gallery.is-v-strip .b-gal-strip { grid-auto-columns: minmax(260px, 1fr); align-items: start; }
.b-gallery.is-v-strip .b-gal-strip__cell { margin: 0; }
.b-gallery.is-v-strip .b-gal-strip__cap { display: block; margin-top: 10px; color: var(--wf-muted); font-size: var(--wf-fs-meta); }
@media (max-width: 560px) { .b-gallery.is-v-strip .b-gal-strip { grid-auto-columns: minmax(220px, 1fr); } }
`,
    },
  });

  /* ============================ 数据统计 ============================ */
  WF.defineVariants("stats", {
    row: {
      name: "等距数据",
      render(p) {
        const items = p.items || [];
        if (!items.length) return `<div class="wb-inner">${emptyState("请添加数据项")}</div>`;
        const alignCls = p.align === "left" ? " is-left" : "";
        const cells = items.map((it) => `<div class="b-stat-row__cell">
            <div class="wb-kpi b-stat-row__v">${esc(it.value)}<span class="b-stat-row__suf">${esc(it.suffix || "")}</span></div>
            <div class="wb-kpi__label">${esc(it.label)}</div>
          </div>`).join("");
        return `<div class="wb-inner">
          <div class="wb-grid b-stat-row${alignCls}" data-cols="${esc(p.cols || "4")}">${cells}</div>
        </div>`;
      },
      css: `
.b-stats.is-v-row .b-stat-row { text-align: center; }
.b-stats.is-v-row .b-stat-row.is-left { text-align: left; }
.b-stats.is-v-row .b-stat-row__v { color: var(--wf-primary); }
.b-stats.is-v-row .b-stat-row__suf { font-size: .55em; margin-left: 2px; }
`,
    },

    cards: {
      name: "数据卡片",
      render(p) {
        const items = p.items || [];
        if (!items.length) return `<div class="wb-inner">${emptyState("请添加数据项")}</div>`;
        const cells = items.map((it) => `<div class="wb-card is-flat b-stat-cards__cell">
            <div class="wb-kpi b-stat-cards__v">${esc(it.value)}<span class="b-stat-cards__suf">${esc(it.suffix || "")}</span></div>
            <div class="wb-kpi__label">${esc(it.label)}</div>
          </div>`).join("");
        return `<div class="wb-inner">
          <div class="wb-grid" data-cols="${esc(p.cols || "4")}">${cells}</div>
        </div>`;
      },
      css: `
.b-stats.is-v-cards .b-stat-cards__cell {
  text-align: center; border-top: 3px solid var(--wf-primary); padding: var(--wb-space-4);
}
.b-stats.is-v-cards .b-stat-cards__v { color: var(--wf-primary); }
.b-stats.is-v-cards .b-stat-cards__suf { font-size: .55em; margin-left: 2px; }
`,
    },

    inline: {
      name: "分隔横排",
      render(p) {
        const items = p.items || [];
        if (!items.length) return `<div class="wb-inner">${emptyState("请添加数据项")}</div>`;
        const cells = items.map((it) => `<div class="b-stat-inline__cell">
            <div class="wb-kpi b-stat-inline__v">${esc(it.value)}<span class="b-stat-inline__suf">${esc(it.suffix || "")}</span></div>
            <div class="wb-kpi__label">${esc(it.label)}</div>
          </div>`).join("");
        return `<div class="wb-inner">
          <div class="b-stat-inline" style="--wb-cols:${esc(p.cols || "4")}">${cells}</div>
        </div>`;
      },
      css: `
.b-stats.is-v-inline .b-stat-inline {
  display: grid; grid-template-columns: repeat(var(--wb-cols, 4), 1fr); align-items: center;
}
.b-stats.is-v-inline .b-stat-inline__cell {
  text-align: center; padding: 4px var(--wb-space-4); border-left: 1px solid var(--wb-line);
}
.b-stats.is-v-inline .b-stat-inline__cell:first-child { border-left: 0; }
.b-stats.is-v-inline .b-stat-inline__v { color: var(--wf-primary); }
.b-stats.is-v-inline .b-stat-inline__suf { font-size: .55em; margin-left: 2px; }
@media (max-width: 860px) {
  .b-stats.is-v-inline .b-stat-inline { grid-template-columns: repeat(2, 1fr); gap: var(--wb-space-4) 0; }
  .b-stats.is-v-inline .b-stat-inline__cell:nth-child(2n+1) { border-left: 0; }
}
@media (max-width: 560px) {
  .b-stats.is-v-inline .b-stat-inline { grid-template-columns: 1fr; gap: var(--wb-space-4); }
  .b-stats.is-v-inline .b-stat-inline__cell { border-left: 0; }
}
`,
    },
  });

  /* ============================ 时间线 / 流程 ============================ */
  WF.defineVariants("timeline", {
    line: {
      name: "纵向节点",
      render(p) {
        const items = p.items || [];
        if (!items.length) return `<div class="wb-inner">${headHTML(p, true)}${emptyState("请添加节点")}</div>`;
        const list = items.map((it) => `<div class="b-tl__item">
            <span class="b-tl__dot"></span>
            ${it.time ? `<div class="b-tl__time">${esc(it.time)}</div>` : ""}
            <div class="b-tl__title">${esc(it.title)}</div>
            ${it.desc ? `<p class="b-tl__desc">${nl2br(it.desc)}</p>` : ""}
          </div>`).join("");
        return `<div class="wb-inner">${headHTML(p, true)}
          <div class="b-timeline__list">${list}</div>
        </div>`;
      },
      css: `
.b-timeline.is-v-line .b-tl__title { margin-top: 4px; }
@media (max-width: 560px) { .b-timeline.is-v-line .b-timeline__list { max-width: 100%; } }
`,
    },

    cards: {
      name: "卡片时间轴",
      render(p) {
        const items = p.items || [];
        if (!items.length) return `<div class="wb-inner">${headHTML(p, true)}${emptyState("请添加节点")}</div>`;
        const rows = items.map((it) => `<div class="b-tl-cards__row">
            <div class="b-tl-cards__time">${it.time ? `<span class="wb-pill is-primary">${esc(it.time)}</span>` : ""}</div>
            <div class="wb-card is-flat b-tl-cards__body">
              <div class="b-tl-cards__t">${esc(it.title)}</div>
              ${it.desc ? `<p class="b-tl-cards__d">${nl2br(it.desc)}</p>` : ""}
            </div>
          </div>`).join("");
        return `<div class="wb-inner">${headHTML(p, true)}
          <div class="b-tl-cards">${rows}</div>
        </div>`;
      },
      css: `
.b-timeline.is-v-cards .b-tl-cards { display: grid; gap: var(--wb-space-4); }
.b-timeline.is-v-cards .b-tl-cards__row {
  display: grid; grid-template-columns: 132px 1fr; gap: var(--wb-space-4); align-items: start;
}
.b-timeline.is-v-cards .b-tl-cards__time { padding-top: 4px; }
.b-timeline.is-v-cards .b-tl-cards__body { border-left: 3px solid var(--wf-primary); }
.b-timeline.is-v-cards .b-tl-cards__t { font-weight: 700; font-size: var(--wf-fs-h2); }
.b-timeline.is-v-cards .b-tl-cards__d { color: var(--wf-muted); margin-top: 6px; }
@media (max-width: 560px) {
  .b-timeline.is-v-cards .b-tl-cards__row { grid-template-columns: 1fr; gap: var(--wb-space-2); }
}
`,
    },

    steps: {
      name: "横向步骤",
      render(p) {
        const items = p.items || [];
        if (!items.length) return `<div class="wb-inner">${headHTML(p, true)}${emptyState("请添加节点")}</div>`;
        const steps = items.map((it, i) => `<div class="b-tl-steps__item">
            <span class="b-tl-steps__no">${String(i + 1).padStart(2, "0")}</span>
            ${it.time ? `<div class="b-tl-steps__time">${esc(it.time)}</div>` : ""}
            <div class="b-tl-steps__t">${esc(it.title)}</div>
            ${it.desc ? `<p class="b-tl-steps__d">${nl2br(it.desc)}</p>` : ""}
          </div>`).join("");
        return `<div class="wb-inner">${headHTML(p, true)}
          <div class="b-tl-steps">${steps}</div>
        </div>`;
      },
      css: `
.b-timeline.is-v-steps .b-tl-steps {
  position: relative; display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: var(--wb-space-4);
}
.b-timeline.is-v-steps .b-tl-steps::before {
  content: ""; position: absolute; top: 19px; left: 0; right: 0; height: 2px; background: var(--wb-line);
}
.b-timeline.is-v-steps .b-tl-steps__item { position: relative; padding-top: 52px; text-align: center; }
.b-timeline.is-v-steps .b-tl-steps__no {
  position: absolute; top: 0; left: 50%; transform: translateX(-50%);
  width: 40px; height: 40px; border-radius: 999px; background: var(--wf-primary); color: #fff;
  display: inline-flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: var(--wf-fs-num); box-shadow: 0 0 0 6px var(--wf-bg);
}
.b-timeline.is-v-steps .b-tl-steps__time { color: var(--wf-primary); font-size: var(--wf-fs-meta); font-weight: 700; letter-spacing: .04em; }
.b-timeline.is-v-steps .b-tl-steps__t { font-weight: 700; margin-top: 4px; }
.b-timeline.is-v-steps .b-tl-steps__d { color: var(--wf-muted); font-size: var(--wf-fs-body); margin-top: 6px; }
@media (max-width: 860px) {
  .b-timeline.is-v-steps .b-tl-steps { grid-auto-flow: row; grid-auto-columns: auto; }
  .b-timeline.is-v-steps .b-tl-steps::before {
    top: 20px; bottom: 20px; left: 19px; right: auto; width: 2px; height: auto;
  }
  .b-timeline.is-v-steps .b-tl-steps__item { padding: 0 0 0 62px; text-align: left; min-height: 52px; }
  .b-timeline.is-v-steps .b-tl-steps__no { left: 0; top: 4px; transform: none; }
}
`,
    },
  });

  /* ------------------------------------------------------------
   * pricing 公共片段:功能清单 / 按钮
   * ---------------------------------------------------------- */
  const priceFeats = (it, cls) => `<ul class="${cls}">${lines(it.feats).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
  const priceBtn = (it, cls) => it.btnText
    ? `<a class="wf-btn ${it.featured ? "is-primary" : "is-ghost"} ${cls}" href="#">${esc(it.btnText)}</a>`
    : "";

  /* ============================ 价格表 ============================ */
  WF.defineVariants("pricing", {
    cards: {
      name: "价格卡片",
      render(p) {
        const items = p.items || [];
        if (!items.length) return `<div class="wb-inner">${headHTML(p, p.align === "center")}${emptyState("请添加价格档位")}</div>`;
        const cards = items.map((it) => `<div class="b-price${it.featured ? " is-featured" : ""}">
            ${it.badge ? `<span class="b-price__badge">${esc(it.badge)}</span>` : ""}
            <div class="b-price__name">${esc(it.name)}</div>
            <div class="b-price__amount">${esc(it.price)}<span class="b-price__unit">${esc(it.unit)}</span></div>
            ${it.desc ? `<p class="b-price__desc">${esc(it.desc)}</p>` : ""}
            ${priceFeats(it, "b-price__feats")}
            ${priceBtn(it, "b-price__btn")}
          </div>`).join("");
        return `<div class="wb-inner">${headHTML(p, p.align === "center")}
          <div class="b-pricing__grid" style="--wb-cols:${esc(p.cols || "3")}">${cards}</div>
        </div>`;
      },
      css: `
.b-pricing.is-v-cards .b-pricing__grid { align-items: stretch; }
`,
    },

    rows: {
      name: "横向条目",
      render(p) {
        const items = p.items || [];
        if (!items.length) return `<div class="wb-inner">${headHTML(p, p.align === "center")}${emptyState("请添加价格档位")}</div>`;
        const rows = items.map((it) => `<div class="b-price-row${it.featured ? " is-featured" : ""}">
            <div class="b-price-row__head">
              ${it.badge ? `<span class="wb-pill is-primary">${esc(it.badge)}</span>` : ""}
              <div class="b-price-row__name">${esc(it.name)}</div>
              ${it.desc ? `<div class="b-price-row__desc">${esc(it.desc)}</div>` : ""}
              <div class="b-price-row__amount">${esc(it.price)}<span class="b-price-row__unit">${esc(it.unit)}</span></div>
            </div>
            ${priceFeats(it, "b-price-row__feats")}
            <div class="b-price-row__cta">${priceBtn(it, "")}</div>
          </div>`).join("");
        return `<div class="wb-inner">${headHTML(p, p.align === "center")}
          <div class="b-price-rows">${rows}</div>
        </div>`;
      },
      css: `
.b-pricing.is-v-rows .b-price-rows { display: grid; gap: var(--wb-space-4); }
.b-pricing.is-v-rows .b-price-row {
  display: grid; grid-template-columns: minmax(180px, 1fr) 1.7fr auto;
  gap: var(--wb-space-5); align-items: center;
  background: var(--wf-bg); border: 1px solid var(--wb-line); border-radius: var(--wb-radius-lg);
  padding: var(--wb-space-4) var(--wb-space-5); box-shadow: var(--wb-shadow-sm);
}
.b-pricing.is-v-rows .b-price-row.is-featured { border-color: var(--wf-primary); box-shadow: var(--wb-shadow-md); }
.b-pricing.is-v-rows .b-price-row__name { font-weight: 700; font-size: 1.1em; }
.b-pricing.is-v-rows .b-price-row__desc { color: var(--wf-muted); font-size: var(--wf-fs-body); margin-top: 2px; }
.b-pricing.is-v-rows .b-price-row__amount {
  margin-top: 8px; font-size: var(--wf-fs-num); font-weight: 800; font-family: var(--wf-heading-font);
}
.b-pricing.is-v-rows .b-price-row__unit { font-size: var(--wf-fs-meta); font-weight: 500; color: var(--wf-muted); margin-left: 4px; }
.b-pricing.is-v-rows .b-price-row__feats {
  list-style: none; margin: 0; padding: 0; display: grid;
  grid-template-columns: repeat(2, 1fr); gap: var(--wb-gap-xs) 18px; font-size: .94em;
}
.b-pricing.is-v-rows .b-price-row__feats li { display: flex; gap: var(--wb-gap-xs); align-items: flex-start; color: var(--wf-muted); }
.b-pricing.is-v-rows .b-price-row__feats li::before { content: "✓"; color: var(--wf-primary); font-weight: 700; }
.b-pricing.is-v-rows .b-price-row__cta { text-align: right; }
.b-pricing.is-v-rows .b-price-row__cta .wf-btn { white-space: nowrap; }
@media (max-width: 860px) {
  .b-pricing.is-v-rows .b-price-row { grid-template-columns: 1fr; gap: var(--wb-space-3); align-items: start; }
  .b-pricing.is-v-rows .b-price-row__feats { grid-template-columns: 1fr; }
  .b-pricing.is-v-rows .b-price-row__cta { text-align: left; }
}
`,
    },

    columns: {
      name: "分栏价目",
      render(p) {
        const items = p.items || [];
        if (!items.length) return `<div class="wb-inner">${headHTML(p, p.align === "center")}${emptyState("请添加价格档位")}</div>`;
        const cols = items.map((it) => `<div class="b-price-col${it.featured ? " is-featured" : ""}">
            ${it.badge ? `<span class="wb-pill is-primary b-price-col__badge">${esc(it.badge)}</span>` : ""}
            <div class="b-price-col__name">${esc(it.name)}</div>
            <div class="b-price-col__amount">${esc(it.price)}<span class="b-price-col__unit">${esc(it.unit)}</span></div>
            ${it.desc ? `<p class="b-price-col__desc">${esc(it.desc)}</p>` : ""}
            ${priceFeats(it, "b-price-col__feats")}
            ${priceBtn(it, "b-price-col__btn")}
          </div>`).join("");
        return `<div class="wb-inner">${headHTML(p, p.align === "center")}
          <div class="b-price-cols" style="--wb-cols:${esc(p.cols || "3")}">${cols}</div>
        </div>`;
      },
      css: `
.b-pricing.is-v-columns .b-price-cols { display: grid; grid-template-columns: repeat(var(--wb-cols, 3), 1fr); }
.b-pricing.is-v-columns .b-price-col {
  display: flex; flex-direction: column; padding: 8px clamp(20px, 3vw, 40px);
  border-left: 1px solid var(--wb-line);
}
.b-pricing.is-v-columns .b-price-col:first-child { border-left: 0; }
.b-pricing.is-v-columns .b-price-col.is-featured {
  background: var(--wf-surface); border-left: 0;
  border-radius: var(--wb-radius-lg); padding: var(--wb-space-5) clamp(20px, 3vw, 40px);
}
.b-pricing.is-v-columns .b-price-col.is-featured + .b-price-col { border-left: 0; }
.b-pricing.is-v-columns .b-price-col__badge { margin-bottom: 10px; align-self: flex-start; }
.b-pricing.is-v-columns .b-price-col__name { font-weight: 700; font-size: 1.05em; }
.b-pricing.is-v-columns .b-price-col__amount {
  margin-top: 10px; font-size: var(--wf-fs-num); font-weight: 800; font-family: var(--wf-heading-font);
}
.b-pricing.is-v-columns .b-price-col__unit { font-size: var(--wf-fs-meta); font-weight: 500; color: var(--wf-muted); margin-left: 4px; }
.b-pricing.is-v-columns .b-price-col__desc { color: var(--wf-muted); font-size: var(--wf-fs-body); margin-top: 6px; }
.b-pricing.is-v-columns .b-price-col__feats {
  list-style: none; margin: var(--wb-space-3) 0; padding: 0; display: grid; gap: var(--wb-gap-sm);
  font-size: .95em; flex: 1; align-content: start;
}
.b-pricing.is-v-columns .b-price-col__feats li { display: flex; gap: var(--wb-gap-xs); align-items: flex-start; color: var(--wf-muted); }
.b-pricing.is-v-columns .b-price-col__feats li::before { content: "✓"; color: var(--wf-primary); font-weight: 700; }
.b-pricing.is-v-columns .b-price-col__btn { width: 100%; }
@media (max-width: 860px) {
  .b-pricing.is-v-columns .b-price-cols { grid-template-columns: 1fr; gap: var(--wb-space-5); }
  .b-pricing.is-v-columns .b-price-col { border-left: 0; border-top: 1px solid var(--wb-line); padding-top: var(--wb-space-5); }
  .b-pricing.is-v-columns .b-price-col:first-child { border-top: 0; padding-top: 0; }
  .b-pricing.is-v-columns .b-price-col.is-featured { padding: var(--wb-space-5) clamp(20px, 3vw, 40px); }
}
`,
    },
  });

  /* ------------------------------------------------------------
   * faq 公共片段:手风琴条目(保留 .b-faq__item 交互类)
   * ---------------------------------------------------------- */
  const faqItem = (it) => `<div class="b-faq__item">
      <button class="b-faq__q" type="button">${esc(it.q)}</button>
      <div class="b-faq__a"><div class="b-faq__a-inner">${nl2br(it.a)}</div></div>
    </div>`;

  /* ============================ 常见问题 ============================ */
  WF.defineVariants("faq", {
    accordion: {
      name: "手风琴",
      render(p) {
        const items = p.items || [];
        if (!items.length) return `<div class="wb-inner">${headHTML(p, p.align === "center")}${emptyState("请添加问答")}</div>`;
        return `<div class="wb-inner">${headHTML(p, p.align === "center")}
          <div class="b-faq__list">${items.map(faqItem).join("")}</div>
        </div>`;
      },
      css: `
.b-faq.is-v-accordion .b-faq__item { transition: border-color .2s var(--wb-ease); }
.b-faq.is-v-accordion .b-faq__item.is-open { border-color: color-mix(in srgb, var(--wf-primary) 30%, var(--wf-border)); }
`,
    },

    split: {
      name: "左题右答",
      render(p) {
        const items = p.items || [];
        if (!items.length) return `<div class="wb-inner">${headHTML(p, false)}${emptyState("请添加问答")}</div>`;
        return `<div class="wb-inner">
          <div class="wb-split2 b-faq-split">
            <div class="b-faq-split__side">${headHTML(p, false)}</div>
            <div class="b-faq__list b-faq-split__list">${items.map(faqItem).join("")}</div>
          </div>
        </div>`;
      },
      css: `
.b-faq.is-v-split .b-faq-split { align-items: start; }
.b-faq.is-v-split .b-faq-split__side { position: sticky; top: 88px; }
.b-faq.is-v-split .b-faq-split__list { max-width: none; margin: 0; }
@media (max-width: 860px) { .b-faq.is-v-split .b-faq-split__side { position: static; } }
`,
    },

    lines: {
      name: "线条列表",
      render(p) {
        const items = p.items || [];
        if (!items.length) return `<div class="wb-inner">${headHTML(p, p.align === "center")}${emptyState("请添加问答")}</div>`;
        const list = items.map((it, i) => `<div class="b-faq__item b-faq-lines__item">
            <button class="b-faq__q" type="button"><span class="b-faq-lines__no">${String(i + 1).padStart(2, "0")}</span><span class="b-faq-lines__q">${esc(it.q)}</span></button>
            <div class="b-faq__a"><div class="b-faq__a-inner">${nl2br(it.a)}</div></div>
          </div>`).join("");
        return `<div class="wb-inner">${headHTML(p, p.align === "center")}
          <div class="b-faq__list b-faq-lines">${list}</div>
        </div>`;
      },
      css: `
.b-faq.is-v-lines .b-faq__list { max-width: 860px; gap: 0; }
.b-faq.is-v-lines .b-faq-lines__item { background: transparent; border: 0; border-bottom: 1px solid var(--wb-line); border-radius: 0; }
.b-faq.is-v-lines .b-faq-lines__item:first-child { border-top: 1px solid var(--wb-line); }
.b-faq.is-v-lines .b-faq__q { justify-content: flex-start; gap: var(--wb-gap-sm); padding: 22px 4px; }
.b-faq.is-v-lines .b-faq__q::after { margin-left: auto; }
.b-faq.is-v-lines .b-faq-lines__no { color: var(--wf-primary); font-weight: 800; font-size: var(--wf-fs-num); letter-spacing: .06em; }
.b-faq.is-v-lines .b-faq__a-inner { padding: 0 4px 22px 42px; }
@media (max-width: 560px) { .b-faq.is-v-lines .b-faq__a-inner { padding-left: 4px; } }
`,
    },
  });
})(window.WF);
