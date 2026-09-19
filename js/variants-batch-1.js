/* ============================================================
 * WebsFlow · 布局变体 · 批次 1(参考实现:结构类)
 * nav / text / split / footer / section / banner / marquee / logo-wall
 * 约定:render(p, ctx, b) 返回模块内部 HTML;样式以 .is-v-<key> 作用域书写。
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

  /* ============================ 导航栏 ============================ */
  WF.defineVariants("nav", {
    center: {
      name: "居中品牌",
      render(p, ctx) {
        const half = Math.ceil((p.links || []).length / 2);
        const link = (l) => {
          let href = l.href || "";
          if (href.indexOf("page:") === 0) href = ctx.multiBase ? ctx.multiBase + "/" + href.slice(5) : "#" + href.slice(5);
          else if (!href) href = (ctx.resolveAnchor && ctx.resolveAnchor(l.label)) || "#";
          return `<a href="${esc(href)}">${esc(l.label)}</a>`;
        };
        const L = (p.links || []).slice(0, half).map(link).join("");
        const Rr = (p.links || []).slice(half).map(link).join("");
        return `<div class="b-nav__inner is-center">
          <nav class="wb-nav__side is-left">${L}</nav>
          <span class="b-nav__brand"><span class="b-nav__logo">${esc((p.brand || "W").slice(0, 1))}</span>${esc(p.brand)}</span>
          <nav class="wb-nav__side is-right">${Rr}${p.btnText ? `<a class="wf-btn is-primary b-nav__cta" href="${esc(p.btnLink || "#")}">${esc(p.btnText)}</a>` : ""}</nav>
        </div>`;
      },
      css: `
.b-nav.is-v-center .b-nav__inner { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: var(--wb-gap); }
.b-nav.is-v-center .wb-nav__side { display: flex; align-items: center; gap: var(--wb-gap); font-size: .95em; color: var(--wf-muted); }
.b-nav.is-v-center .wb-nav__side a:hover { color: var(--wf-primary); }
.b-nav.is-v-center .wb-nav__side.is-right { justify-content: flex-end; }
.b-nav.is-v-center .b-nav__brand { justify-content: center; white-space: nowrap; }
@media (max-width: 860px) {
  .b-nav.is-v-center .b-nav__inner { grid-template-columns: auto 1fr; }
  .b-nav.is-v-center .wb-nav__side { display: none; }
}
`,
    },

    pill: {
      name: "胶囊悬浮",
      render(p, ctx) {
        const link = (l) => {
          let href = l.href || "";
          if (href.indexOf("page:") === 0) href = ctx.multiBase ? ctx.multiBase + "/" + href.slice(5) : "#" + href.slice(5);
          else if (!href) href = (ctx.resolveAnchor && ctx.resolveAnchor(l.label)) || "#";
          return `<a href="${esc(href)}">${esc(l.label)}</a>`;
        };
        const links = (p.links || []).map(link).join("");
        return `<div class="b-nav__inner is-pill">
          <span class="b-nav__brand"><span class="b-nav__logo">${esc((p.brand || "W").slice(0, 1))}</span>${esc(p.brand)}</span>
          <nav class="b-nav__links">${links}</nav>
          ${p.btnText ? `<a class="wf-btn is-primary b-nav__cta" href="${esc(p.btnLink || "#")}">${esc(p.btnText)}</a>` : ""}
        </div>`;
      },
      css: `
.b-nav.is-v-pill { position: sticky; top: 0; background: transparent; border-bottom: 0; backdrop-filter: none; padding: 14px 16px 0; }
.b-nav.is-v-pill .b-nav__inner {
  max-width: 1040px; border-radius: 999px; padding: 9px 10px 9px 20px;
  background: color-mix(in srgb, var(--wf-bg) 88%, transparent);
  backdrop-filter: blur(14px); border: 1px solid var(--wb-line); box-shadow: var(--wb-shadow-md);
}
.b-nav.is-v-pill .b-nav__links a { padding: 6px 10px; border-radius: 999px; transition: background .18s var(--wb-ease), color .18s var(--wb-ease); }
.b-nav.is-v-pill .b-nav__links a:hover { background: var(--wf-primary-soft); color: var(--wf-primary); }
.b-nav.is-v-pill .b-nav__cta { border-radius: 999px; }
`,
    },
  });

  /* ============================ 文字段落 ============================ */
  WF.defineVariants("text", {
    rule: {
      name: "强调竖线",
      render(p) {
        const align = p.align === "center" ? " is-center" : "";
        return `<div class="wb-inner is-tight">
          <div class="b-text__box${align}">
            ${p.title ? `<h2 class="b-text__title">${esc(p.title)}</h2>` : ""}
            ${p.body ? `<div class="b-text__body">${nl2br(p.body)}</div>` : ""}
          </div>
        </div>`;
      },
      css: `
.b-text.is-v-rule .b-text__box { border-left: 3px solid var(--wf-primary); padding-left: 26px; max-width: 780px; }
.b-text.is-v-rule .b-text__title { font-size: var(--wf-fs-h2); letter-spacing: -.02em; }
.b-text.is-v-rule .b-text__body { margin-top: 14px; font-size: var(--wf-fs-body); }
.b-text.is-v-rule .b-text__box.is-center { border-left: 0; border-top: 3px solid var(--wf-primary); padding: 24px 0 0; margin: 0 auto; text-align: center; }
`,
    },

    columns: {
      name: "双栏社论",
      render(p) {
        return `<div class="wb-inner">
          <div class="wb-split2 b-text__duo">
            <div>
              <h2 class="b-text__title">${esc(p.title)}</h2>
              <span class="wb-divider" style="margin:18px 0 0;display:block"></span>
            </div>
            <div class="wb-lead b-text__body">${nl2br(p.body)}</div>
          </div>
        </div>`;
      },
      css: `
.b-text.is-v-columns .b-text__duo { align-items: start; }
.b-text.is-v-columns .b-text__title { font-size: var(--wf-fs-h2); }
.b-text.is-v-columns .b-text__body { font-size: var(--wf-fs-body); line-height: 1.85; }
`,
    },
  });

  /* ============================ 图文分栏 ============================ */
  WF.defineVariants("split", {
    checklist: {
      name: "要点清单",
      render(p) {
        const points = lines(p.body);
        const list = points.length
          ? `<ul class="b-split__check">${points.map((t) => `<li><span class="wk-tick" aria-hidden="true">✓</span><span>${esc(t)}</span></li>`).join("")}</ul>`
          : `<p class="b-split__body">${nl2br(p.body)}</p>`;
        return `<div class="wb-inner"><div class="wb-split2${p.flip ? " is-flip" : ""}">
          <div class="wb-media" data-ratio="4x3">${imgOrPh(p.image, "配图", 'loading="lazy"')}</div>
          <div class="wb-stack">
            <h2 class="b-split__title">${esc(p.title)}</h2>
            ${list}
            ${p.btnText ? `<div class="b-split__btn">${btn(p.btnText, p.btnLink)}</div>` : ""}
          </div>
        </div></div>`;
      },
      css: `
.b-split.is-v-checklist .b-split__check { list-style: none; margin: 6px 0 0; padding: 0; display: grid; gap: var(--wb-gap-sm); }
.b-split.is-v-checklist .b-split__check li { display: flex; gap: var(--wb-gap-sm); align-items: flex-start; color: var(--wf-muted); line-height: 1.7; }
.b-split.is-v-checklist .wk-tick {
  flex: 0 0 auto; width: 22px; height: 22px; border-radius: 999px; margin-top: 2px;
  background: var(--wf-primary-soft); color: var(--wf-primary); font-size: .72em; font-weight: 800;
  display: inline-flex; align-items: center; justify-content: center;
}
`,
    },

    overlap: {
      name: "错位叠压",
      render(p) {
        return `<div class="wb-inner"><div class="b-split__over">
          <div class="wb-media is-soft b-split__shot" data-ratio="4x3">${imgOrPh(p.image, "配图", 'loading="lazy"')}
            <span class="wb-media__badge">${esc(p.badge || "案例")}</span></div>
          <div class="b-split__panel">
            <span class="wb-pill is-primary">亮点</span>
            <h2 class="b-split__title">${esc(p.title)}</h2>
            <p class="b-split__body">${nl2br(p.body)}</p>
            ${p.btnText ? `<div class="b-split__btn">${btn(p.btnText, p.btnLink)}</div>` : ""}
          </div>
        </div></div>`;
      },
      css: `
.b-split.is-v-overlap .b-split__over { display: grid; grid-template-columns: 1.1fr .9fr; align-items: center; }
.b-split.is-v-overlap .b-split__panel {
  background: var(--wf-bg); border: 1px solid var(--wb-line); border-radius: var(--wb-radius-lg);
  padding: clamp(24px, 3vw, 40px); box-shadow: var(--wb-shadow-lg); margin-left: -72px; position: relative; z-index: 1;
}
.b-split.is-v-overlap .b-split__title { margin-top: 14px; font-size: var(--wf-fs-h2); }
.b-split.is-v-overlap .b-split__body { margin-top: 14px; }
@media (max-width: 860px) {
  .b-split.is-v-overlap .b-split__over { grid-template-columns: 1fr; }
  .b-split.is-v-overlap .b-split__panel { margin: -40px 12px 0; }
}
`,
    },
  });

  /* ============================ 页脚 ============================ */
  WF.defineVariants("footer", {
    mega: {
      name: "多列导航",
      render(p) {
        const links = p.links || [];
        const per = Math.max(1, Math.ceil(links.length / 3));
        const groups = [0, 1, 2].map((g) => links.slice(g * per, g * per + per)).filter((g) => g.length);
        return `<div class="b-footer__inner">
          <div class="b-footer__mega">
            <div class="b-footer__about">
              <div class="b-footer__brand">${esc(p.brand)}</div>
              ${p.desc ? `<p class="b-footer__desc">${nl2br(p.desc)}</p>` : ""}
            </div>
            ${groups.map((g) => `<nav class="b-footer__group">${g.map((l) => `<a href="${esc(l.href || "#")}">${esc(l.label)}</a>`).join("")}</nav>`).join("")}
          </div>
          <div class="b-footer__copy"><span>${esc(p.copyright)}</span><span>由 WebsFlow 魔块搭建</span></div>
        </div>`;
      },
      css: `
.b-footer.is-v-mega .b-footer__mega { display: grid; grid-template-columns: 1.4fr repeat(3, 1fr); gap: var(--wb-gap-lg); }
.b-footer.is-v-mega .b-footer__group { display: grid; gap: var(--wb-gap-sm); align-content: start; font-size: .95em; }
.b-footer.is-v-mega .b-footer__group a { color: var(--wf-muted); transition: color .18s var(--wb-ease); }
.b-footer.is-v-mega .b-footer__group a:hover { color: var(--wf-primary); }
.b-footer.is-v-mega .b-footer__about { max-width: 34ch; }
@media (max-width: 860px) { .b-footer.is-v-mega .b-footer__mega { grid-template-columns: 1fr 1fr; } }
@media (max-width: 560px) { .b-footer.is-v-mega .b-footer__mega { grid-template-columns: 1fr; gap: var(--wb-gap); } }
`,
    },

    minimal: {
      name: "极简单行",
      render(p) {
        const links = (p.links || []).map((l) => `<a href="${esc(l.href || "#")}">${esc(l.label)}</a>`).join("");
        return `<div class="b-footer__inner is-slim">
          <div class="wb-row" style="justify-content:space-between;width:100%">
            <span class="b-footer__brand">${esc(p.brand)}</span>
            <nav class="b-footer__links">${links}</nav>
            <span class="wb-muted" style="font-size:.88em">${esc(p.copyright)}</span>
          </div>
        </div>`;
      },
      css: `
.b-footer.is-v-minimal .b-footer__inner { padding-top: 28px; padding-bottom: 28px; }
.b-footer.is-v-minimal .b-footer__links a { color: var(--wf-muted); }
.b-footer.is-v-minimal .b-footer__links a:hover { color: var(--wf-primary); }
@media (max-width: 860px) { .b-footer.is-v-minimal .wb-row { flex-direction: column; align-items: flex-start; } }
`,
    },
  });

  /* ============================ 分栏容器 ============================ */
  WF.defineVariants("section", {
    wideleft: {
      name: "左宽右窄",
      render(p, ctx, b) {
        const cols = Math.max(1, Math.min(3, Number(p.cols) || 2));
        let inner = "";
        for (let c = 0; c < cols; c++) inner += `<div class="b-section__col">${WF.renderChildren(b, ctx, c)}</div>`;
        return `<div class="wb-inner"><div class="b-section is-wide-left b-section--cols-${cols} b-section--gap-${esc(p.gap || "normal")}">${inner}</div></div>`;
      },
      css: `
.b-section.is-v-wideleft.is-wide-left.b-section--cols-2 { grid-template-columns: 1.7fr 1fr; }
.b-section.is-v-wideleft.is-wide-left.b-section--cols-3 { grid-template-columns: 1.8fr 1fr 1fr; }
@media (max-width: 860px) { .b-section.is-v-wideleft.is-wide-left { grid-template-columns: 1fr !important; } }
`,
    },

    cards: {
      name: "卡片分栏",
      render(p, ctx, b) {
        const cols = Math.max(1, Math.min(3, Number(p.cols) || 2));
        let inner = "";
        for (let c = 0; c < cols; c++) inner += `<div class="b-section__col">${WF.renderChildren(b, ctx, c)}</div>`;
        return `<div class="wb-inner"><div class="b-section b-section--cols-${cols} b-section--gap-${esc(p.gap || "normal")}">${inner}</div></div>`;
      },
      css: `
.b-section.is-v-cards .b-section__col {
  background: var(--wf-bg); border: 1px solid var(--wb-line); border-radius: var(--wb-radius-lg);
  padding: clamp(18px, 2.4vw, 30px); box-shadow: var(--wb-shadow-sm);
  transition: transform .25s var(--wb-ease), box-shadow .25s var(--wb-ease);
}
.b-section.is-v-cards .b-section__col:hover { transform: translateY(-3px); box-shadow: var(--wb-shadow-md); }
.b-section.is-v-cards .b-section__col > .wf-block > .wb-inner { padding-left: 0; padding-right: 0; }
.b-section.is-v-cards .b-section__col > .wf-block { position: static; }
`,
    },
  });

  /* ============================ 公告横条 ============================ */
  WF.defineVariants("banner", {
    soft: {
      name: "柔和提示",
      render(p) {
        return `<div class="b-banner__soft">
          <span class="wb-pill is-primary">公告</span>
          <span class="b-banner__text">${esc(p.text || "")}</span>
          ${p.linkText ? `<a class="b-banner__link" href="${esc(p.link || "#")}">${esc(p.linkText)}</a>` : ""}
        </div>`;
      },
      css: `
.b-banner.is-v-soft { background: color-mix(in srgb, var(--wf-primary) 7%, var(--wf-bg)); border-bottom: 1px solid var(--wb-line); }
.b-banner.is-v-soft .b-banner__soft {
  max-width: 1120px; margin: 0 auto; padding: 12px 24px;
  display: flex; align-items: center; justify-content: center; gap: var(--wb-gap-sm); flex-wrap: wrap;
}
.b-banner.is-v-soft .b-banner__text { font-size: var(--wf-fs-body); }
.b-banner.is-v-soft .b-banner__link { color: var(--wf-primary); font-weight: 700; }
`,
    },

    split: {
      name: "左右分置",
      render(p) {
        return `<div class="b-banner__split">
          <span class="b-banner__text">${esc(p.text || "")}</span>
          ${p.linkText ? `<a class="wf-btn is-primary" style="padding:7px 16px;font-size:.85em" href="${esc(p.link || "#")}">${esc(p.linkText)}</a>` : ""}
        </div>`;
      },
      css: `
.b-banner.is-v-split { background: var(--wf-surface); border-bottom: 1px solid var(--wb-line); }
.b-banner.is-v-split .b-banner__split {
  max-width: 1120px; margin: 0 auto; padding: 10px 24px;
  display: flex; align-items: center; justify-content: space-between; gap: var(--wb-gap-sm); flex-wrap: wrap;
}
.b-banner.is-v-split .b-banner__text { font-size: var(--wf-fs-body); color: var(--wf-muted); }
`,
    },
  });

  /* ============================ 滚动横幅 ============================ */
  WF.defineVariants("marquee", {
    display: {
      name: "大字强调",
      render(p) {
        const words = (p.items || []).map((it, i) => `<span class="b-marquee__word${i % 2 ? " is-accent" : ""}">${esc(it.text || "")}</span>`).join("");
        return `<div class="b-marquee"><div class="b-marquee__mask"><div class="b-marquee__track is-display">${words}${words}</div></div></div>`;
      },
      css: `
.b-marquee.is-v-display .b-marquee__track { gap: var(--wb-gap-xl); padding: 22px 0; }
.b-marquee.is-v-display .b-marquee__word { font-size: clamp(1.5em, 1.1em + 1.6vw, 2.2em); font-weight: 800; letter-spacing: -.02em; white-space: nowrap; }
.b-marquee.is-v-display .b-marquee__word.is-accent { color: var(--wf-primary); }
`,
    },

    pills: {
      name: "胶囊反向",
      render(p) {
        const items = (p.items || []).map((it) => `<span class="wb-pill b-marquee__pill">${esc(it.text || "")}</span>`).join("");
        return `<div class="b-marquee"><div class="b-marquee__mask"><div class="b-marquee__track is-pills">${items}${items}</div></div></div>`;
      },
      css: `
.b-marquee.is-v-pills { background: transparent; border: 0; }
.b-marquee.is-v-pills .b-marquee__track { gap: var(--wb-gap-sm); padding: 18px 0; animation-direction: reverse; animation-duration: 34s; }
.b-marquee.is-v-pills .b-marquee__pill { font-size: .9em; background: var(--wf-bg); }
`,
    },
  });

  /* ============================ 品牌背书墙 ============================ */
  WF.defineVariants("logo-wall", {
    cards: {
      name: "品牌卡片",
      render(p) {
        const chips = (p.items || []).map((it) => `<div class="wb-card is-lift b-logowall__card">
          <span class="b-logowall__mark">${esc(String(it.name || "?").slice(0, 1))}</span>
          <span class="b-logowall__name">${esc(it.name || "")}</span>
        </div>`).join("");
        return `<div class="wb-inner is-tight">
          ${headHTML(p, p.align === "center")}
          <div class="wb-grid is-auto">${chips}</div>
        </div>`;
      },
      css: `
.b-logo-wall.is-v-cards .b-logowall__card { display: flex; align-items: center; gap: var(--wb-gap-sm); padding: 16px 18px; }
.b-logo-wall.is-v-cards .b-logowall__mark {
  width: 34px; height: 34px; border-radius: 10px; flex: 0 0 auto;
  background: var(--wf-primary-soft); color: var(--wf-primary); font-weight: 800;
  display: inline-flex; align-items: center; justify-content: center;
}
.b-logo-wall.is-v-cards .b-logowall__name { font-weight: 700; letter-spacing: .02em; }
`,
    },

    rail: {
      name: "横向滚动",
      render(p) {
        const chips = (p.items || []).map((it) => `<span class="b-logowall__railword">${esc(it.name || "")}</span>`).join(`<span class="b-logowall__dot">·</span>`);
        return `<div class="wb-inner is-tight">
          ${headHTML(p, p.align === "center")}
          <div class="b-logowall__rail"><div class="b-logowall__railtrack">${chips}${chips}</div></div>
        </div>`;
      },
      css: `
.b-logo-wall.is-v-rail .b-logowall__rail { overflow: hidden; mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent); -webkit-mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent); }
.b-logo-wall.is-v-rail .b-logowall__railtrack { display: flex; align-items: center; gap: var(--wb-gap); width: max-content; animation: wf-marquee 30s linear infinite; }
.b-logo-wall.is-v-rail .b-logowall__railword { font-weight: 800; letter-spacing: .04em; color: var(--wf-muted); font-size: 1.14em; white-space: nowrap; }
.b-logo-wall.is-v-rail .b-logowall__dot { color: var(--wf-border); }
`,
    },
  });
})(window.WF);
