/* ============================================================
 * WebsFlow · 布局变体 · 批次 5
 * showcase / changelog / countdown / quiz / hotspot
 * slide-title / slide-bullets / slide-quote / slide-end
 * 约定:render(p, ctx, b) 返回模块内部 HTML;样式以 .b-xxx.is-v-<key> 作用域书写。
 * ============================================================ */
window.WF = window.WF || {};

(function (WF) {
  "use strict";
  const esc = (s) => WF.esc(s);
  const nl2br = (s) => WF.nl2br(s);
  const headHTML = (...a) => WF.headHTML(...a);
  const imgOrPh = (...a) => WF.imgOrPh(...a);
  const delay = (i) => WF.delay(i);
  const nz = (v, d) => { const n = Number(v); return isFinite(n) ? n : d; };

  const quizOpts = (p) => {
    const letters = "ABCD";
    return (p.options || []).map((o, i) =>
      `<button class="b-quiz__opt" type="button" data-correct="${o.correct ? "1" : "0"}"><span class="b-quiz__key">${letters[i] || "•"}</span><span class="b-quiz__txt">${esc(o.text || "")}</span></button>`).join("");
  };

  const hotDots = (items, numbered) => (items || []).map((it, i) =>
    `<button class="b-hotspot__dot${numbered ? " is-num" : ""}" type="button" style="left:${nz(it.x, 50)}%;top:${nz(it.y, 50)}%">${numbered ? i + 1 : "●"}</button>
     <div class="b-hotspot__tip"><strong>${esc(it.label || "")}</strong>${nl2br(it.desc)}</div>`).join("");
  const hotStage = (p, numbered) =>
    `<div class="b-hotspot__stage">${p.image ? `<img src="${esc(p.image)}" alt="">` : `<div class="wf-ph" data-label="放置一张产品图"></div>`}${hotDots(p.items, numbered)}</div>`;
  const hotRows = (items) => (items || []).map((it, i) =>
    `<div class="b-hotspot__row"><span class="b-hotspot__idx">${i + 1}</span><div><div class="b-hotspot__label">${esc(it.label || "")}</div>${it.desc ? `<div class="b-hotspot__desc">${nl2br(it.desc)}</div>` : ""}</div></div>`).join("");

  const countdownDigits = (p) => `<div class="b-countdown__digits" data-target="${esc(p.target || "")}">
    <div class="b-countdown__cell"><div class="b-countdown__num" data-cd="d">--</div><div class="b-countdown__unit">天</div></div>
    <div class="b-countdown__cell"><div class="b-countdown__num" data-cd="h">--</div><div class="b-countdown__unit">时</div></div>
    <div class="b-countdown__cell"><div class="b-countdown__num" data-cd="m">--</div><div class="b-countdown__unit">分</div></div>
    <div class="b-countdown__cell"><div class="b-countdown__num" data-cd="s">--</div><div class="b-countdown__unit">秒</div></div>
  </div>`;

  /* ============================ 编号展示 ============================ */
  WF.defineVariants("showcase", {
    steps: {
      name: "编号卡片",
      render(p, ctx) {
        const cards = (p.items || []).map((it, i) => `<div class="wb-card is-lift b-showcase__card"${delay(i)}>
          <span class="b-showcase__step">${String(i + 1).padStart(2, "0")}</span>
          <div class="wb-media" data-ratio="4x3">${imgOrPh(it.image, it.title || "配图", "", ctx && ctx.lazy)}</div>
          <div class="wb-card__title">${esc(it.title || "")}</div>
          ${it.desc ? `<div class="wb-card__body">${nl2br(it.desc)}</div>` : ""}
        </div>`).join("");
        return `<div class="wb-inner">
          ${headHTML(p, p.align === "center")}
          <div class="wb-grid" data-cols="3">${cards}</div>
        </div>`;
      },
      css: `
.b-showcase.is-v-steps .b-showcase__card { position: relative; display: flex; flex-direction: column; gap: var(--wb-space-3); }
.b-showcase.is-v-steps .b-showcase__step {
  position: absolute; top: 14px; left: 16px; z-index: 2; width: 34px; height: 34px; border-radius: 999px;
  background: var(--wf-primary); color: #fff; font-weight: 800; font-size: .86em; font-variant-numeric: tabular-nums;
  display: inline-flex; align-items: center; justify-content: center; box-shadow: var(--wb-shadow-sm);
}
.b-showcase.is-v-steps .wb-media { border-radius: var(--wb-radius-md); }
.b-showcase.is-v-steps .wb-card__title { font-size: var(--wf-fs-h2); }
@media (max-width: 560px) { .b-showcase.is-v-steps .wb-grid { grid-template-columns: 1fr !important; } }
`,
    },

    timeline: {
      name: "竖向时间轴",
      render(p, ctx) {
        const rows = (p.items || []).map((it, i) => `<div class="b-showcase__node"${delay(i)}>
          <div class="b-showcase__dot">${i + 1}</div>
          <div class="b-showcase__panel">
            <div class="b-showcase__t">${esc(it.title || "")}</div>
            ${it.desc ? `<div class="b-showcase__d">${nl2br(it.desc)}</div>` : ""}
          </div>
          <div class="b-showcase__thumb">${imgOrPh(it.image, it.title || "配图", "", ctx && ctx.lazy)}</div>
        </div>`).join("");
        return `<div class="wb-inner">
          ${headHTML(p, p.align === "center")}
          <div class="b-showcase__time">${rows}</div>
        </div>`;
      },
      css: `
.b-showcase.is-v-timeline .b-showcase__time { position: relative; max-width: 900px; margin: 0 auto; display: grid; gap: var(--wb-space-4); }
.b-showcase.is-v-timeline .b-showcase__time::before { content: ""; position: absolute; left: 17px; top: 12px; bottom: 12px; width: 2px; background: var(--wb-line); }
.b-showcase.is-v-timeline .b-showcase__node { position: relative; display: grid; grid-template-columns: 36px 1fr 220px; gap: var(--wb-space-4); align-items: center; }
.b-showcase.is-v-timeline .b-showcase__dot {
  width: 36px; height: 36px; border-radius: 999px; background: var(--wf-bg); border: 2px solid var(--wf-primary);
  color: var(--wf-primary); font-weight: 800; display: flex; align-items: center; justify-content: center; z-index: 1;
}
.b-showcase.is-v-timeline .b-showcase__panel { background: var(--wf-surface); border: 1px solid var(--wb-line); border-radius: var(--wb-radius-lg); padding: var(--wb-card-pad); }
.b-showcase.is-v-timeline .b-showcase__thumb { aspect-ratio: 16 / 10; border-radius: var(--wb-radius-md); overflow: hidden; background: var(--wf-surface); }
.b-showcase.is-v-timeline .b-showcase__thumb img, .b-showcase.is-v-timeline .b-showcase__thumb .wf-ph { width: 100%; height: 100%; }
@media (max-width: 860px) {
  .b-showcase.is-v-timeline .b-showcase__node { grid-template-columns: 36px 1fr; }
  .b-showcase.is-v-timeline .b-showcase__thumb { grid-column: 2; }
}
`,
    },

    spotlight: {
      name: "首项聚焦",
      render(p, ctx) {
        const items = p.items || [];
        if (!items.length) {
          return `<div class="wb-inner">${headHTML(p, p.align === "center")}<div class="wf-ph" data-label="暂无内容"></div></div>`;
        }
        const first = items[0];
        const rest = items.slice(1).map((it) => `<div class="wb-card is-flat b-showcase__mini">
          <div class="wb-card__title">${esc(it.title || "")}</div>
          ${it.desc ? `<div class="wb-card__body">${nl2br(it.desc)}</div>` : ""}
        </div>`).join("");
        return `<div class="wb-inner">
          ${headHTML(p, p.align === "center")}
          <div class="b-showcase__spot">
            <div class="wb-media is-soft" data-ratio="4x3">${imgOrPh(first.image, first.title || "配图", "", ctx && ctx.lazy)}</div>
            <div class="b-showcase__spot-txt">
              <span class="wb-pill is-primary">01</span>
              <h3 class="b-showcase__t">${esc(first.title || "")}</h3>
              ${first.desc ? `<div class="b-showcase__d">${nl2br(first.desc)}</div>` : ""}
            </div>
          </div>
          ${rest ? `<div class="wb-grid" data-cols="2">${rest}</div>` : ""}
        </div>`;
      },
      css: `
.b-showcase.is-v-spotlight .b-showcase__spot { display: grid; grid-template-columns: 1.1fr .9fr; gap: clamp(24px, 4vw, 48px); align-items: center; margin-bottom: var(--wb-space-5); }
.b-showcase.is-v-spotlight .b-showcase__spot-txt { display: flex; flex-direction: column; align-items: flex-start; gap: var(--wb-space-2); }
.b-showcase.is-v-spotlight .b-showcase__t { font-size: var(--wf-fs-h2); font-weight: 800; letter-spacing: -.02em; }
.b-showcase.is-v-spotlight .b-showcase__d { color: var(--wf-muted); line-height: 1.7; }
.b-showcase.is-v-spotlight .b-showcase__mini { display: flex; flex-direction: column; gap: 6px; }
@media (max-width: 860px) { .b-showcase.is-v-spotlight .b-showcase__spot { grid-template-columns: 1fr; } }
`,
    },
  });

  /* ============================ 更新日志 ============================ */
  WF.defineVariants("changelog", {
    timeline: {
      name: "竖向时间线",
      render(p) {
        const rows = (p.items || []).map((it, i) => `<div class="b-chlog__node"${delay(i)}>
          <div class="b-chlog__when"><span class="b-chlog__tag">${esc(it.tag || "")}</span>${it.date ? `<span class="b-chlog__date">${esc(it.date)}</span>` : ""}</div>
          <div class="b-chlog__body">
            <div class="b-chlog__t">${esc(it.title || "")}</div>
            ${it.desc ? `<div class="b-chlog__d">${nl2br(it.desc)}</div>` : ""}
          </div>
        </div>`).join("");
        return `<div class="wb-inner">
          ${headHTML(p, p.align === "center")}
          <div class="b-chlog__timeline">${rows}</div>
        </div>`;
      },
      css: `
.b-changelog.is-v-timeline .b-chlog__timeline { position: relative; max-width: 840px; margin: 0 auto; display: grid; gap: var(--wb-space-4); padding-left: 28px; }
.b-changelog.is-v-timeline .b-chlog__timeline::before { content: ""; position: absolute; left: 7px; top: 14px; bottom: 14px; width: 2px; background: var(--wb-line); }
.b-changelog.is-v-timeline .b-chlog__node { position: relative; display: grid; grid-template-columns: 180px 1fr; gap: var(--wb-space-4); }
.b-changelog.is-v-timeline .b-chlog__node::before { content: ""; position: absolute; left: -28px; top: 6px; width: 12px; height: 12px; border-radius: 999px; background: var(--wf-primary); box-shadow: 0 0 0 3px var(--wf-bg); }
.b-changelog.is-v-timeline .b-chlog__when { display: flex; flex-direction: column; gap: 6px; align-items: flex-start; }
.b-changelog.is-v-timeline .b-chlog__body { background: var(--wf-surface); border: 1px solid var(--wb-line); border-radius: var(--wb-radius-lg); padding: var(--wb-card-pad); }
.b-changelog.is-v-timeline .b-chlog__t { margin-top: 0; }
@media (max-width: 560px) {
  .b-changelog.is-v-timeline .b-chlog__node { grid-template-columns: 1fr; gap: var(--wb-gap-xs); }
  .b-changelog.is-v-timeline .b-chlog__when { flex-direction: row; align-items: center; }
}
`,
    },

    cards: {
      name: "双列卡片",
      render(p) {
        const cards = (p.items || []).map((it, i) => `<div class="wb-card is-lift b-chlog__card"${delay(i)}>
          <div class="b-chlog__head"><span class="b-chlog__tag">${esc(it.tag || "")}</span>${it.date ? `<span class="b-chlog__date">${esc(it.date)}</span>` : ""}</div>
          <div class="wb-card__title">${esc(it.title || "")}</div>
          ${it.desc ? `<div class="wb-card__body">${nl2br(it.desc)}</div>` : ""}
        </div>`).join("");
        return `<div class="wb-inner">
          ${headHTML(p, p.align === "center")}
          <div class="wb-grid" data-cols="2">${cards}</div>
        </div>`;
      },
      css: `
.b-changelog.is-v-cards .b-chlog__card { display: flex; flex-direction: column; gap: var(--wb-gap-xs); height: 100%; }
.b-changelog.is-v-cards .b-chlog__head { margin-bottom: 2px; }
.b-changelog.is-v-cards .wb-card__title { margin-top: 0; }
@media (max-width: 560px) { .b-changelog.is-v-cards .wb-grid { grid-template-columns: 1fr !important; } }
`,
    },

    sticky: {
      name: "左题右列",
      render(p) {
        const rows = (p.items || []).map((it, i) => `<div class="b-chlog__item"${delay(i)}>
          <div class="b-chlog__head"><span class="b-chlog__tag">${esc(it.tag || "")}</span>${it.date ? `<span class="b-chlog__date">${esc(it.date)}</span>` : ""}</div>
          <div class="b-chlog__t">${esc(it.title || "")}</div>
          ${it.desc ? `<div class="b-chlog__d">${nl2br(it.desc)}</div>` : ""}
        </div>`).join("");
        return `<div class="wb-inner"><div class="wb-split2 b-chlog__split">
          <div class="b-chlog__side">
            <h2 class="wb-title">${esc(p.title || "")}</h2>
            ${p.subtitle ? `<p class="wb-subtitle">${nl2br(p.subtitle)}</p>` : ""}
          </div>
          <div class="b-chlog__feed">${rows}</div>
        </div></div>`;
      },
      css: `
.b-changelog.is-v-sticky .b-chlog__split { align-items: start; }
.b-changelog.is-v-sticky .b-chlog__side { position: sticky; top: 88px; }
.b-changelog.is-v-sticky .b-chlog__feed { display: grid; gap: var(--wb-space-3); }
.b-changelog.is-v-sticky .b-chlog__item { background: transparent; border: 0; border-left: 2px solid var(--wb-line); border-radius: 0; padding: 4px 0 4px 20px; transition: border-color .2s var(--wb-ease); }
.b-changelog.is-v-sticky .b-chlog__item:hover { border-left-color: var(--wf-primary); }
@media (max-width: 860px) { .b-changelog.is-v-sticky .b-chlog__side { position: static; } }
`,
    },
  });

  /* ============================ 倒计时 ============================ */
  WF.defineVariants("countdown", {
    flip: {
      name: "翻牌格子",
      render(p) {
        return `<div class="wb-inner"><div class="b-countdown__flip">
          ${p.title ? `<div class="b-countdown__title">${esc(p.title)}</div>` : ""}
          ${countdownDigits(p)}
          ${p.note ? `<div class="b-countdown__note">${esc(p.note)}</div>` : ""}
        </div></div>`;
      },
      css: `
.b-countdown.is-v-flip .b-countdown__flip { max-width: 720px; margin: 0 auto; text-align: center; }
.b-countdown.is-v-flip .b-countdown__digits { gap: 0; align-items: stretch; }
.b-countdown.is-v-flip .b-countdown__cell { min-width: 0; flex: 1 1 0; border-radius: 0; border-right: 0; background: var(--wf-surface); padding: 22px 8px; }
.b-countdown.is-v-flip .b-countdown__cell:first-child { border-radius: var(--wb-radius-lg) 0 0 var(--wb-radius-lg); }
.b-countdown.is-v-flip .b-countdown__cell:last-child { border-radius: 0 var(--wb-radius-lg) var(--wb-radius-lg) 0; border-right: 1px solid var(--wb-border); }
.b-countdown.is-v-flip .b-countdown__num { font-size: var(--wf-fs-num); }
.b-countdown.is-v-flip .b-countdown__note { margin-top: 18px; }
@media (max-width: 560px) {
  .b-countdown.is-v-flip .b-countdown__digits { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--wb-gap-sm); }
  .b-countdown.is-v-flip .b-countdown__cell { border-radius: var(--wb-radius-md) !important; border-right: 1px solid var(--wf-border); }
}
`,
    },

    bar: {
      name: "横条横幅",
      render(p) {
        return `<div class="wb-inner is-tight"><div class="b-countdown__bar">
          <div class="b-countdown__lead">
            ${p.title ? `<div class="b-countdown__title">${esc(p.title)}</div>` : ""}
            ${p.note ? `<div class="b-countdown__note">${esc(p.note)}</div>` : ""}
          </div>
          ${countdownDigits(p)}
        </div></div>`;
      },
      css: `
.b-countdown.is-v-bar .b-countdown__bar {
  max-width: 1040px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: var(--wb-space-4); flex-wrap: wrap;
  padding: clamp(20px, 3vw, 34px) clamp(22px, 4vw, 46px); border-radius: var(--wb-radius-lg);
  background: linear-gradient(120deg, var(--wf-primary), color-mix(in srgb, var(--wf-primary) 55%, #0b1220)); color: #fff; box-shadow: var(--wb-shadow-md);
}
.b-countdown.is-v-bar .b-countdown__title { font-size: var(--wf-fs-h2); font-weight: 800; text-align: left; }
.b-countdown.is-v-bar .b-countdown__note { margin-top: 6px; font-size: var(--wf-fs-meta); opacity: .85; }
.b-countdown.is-v-bar .b-countdown__digits { margin-top: 0; justify-content: flex-end; gap: var(--wb-gap-sm); }
.b-countdown.is-v-bar .b-countdown__cell { min-width: 68px; padding: 10px 6px; background: rgba(255, 255, 255, .14); border-color: rgba(255, 255, 255, .26); }
.b-countdown.is-v-bar .b-countdown__num { color: #fff; font-size: var(--wf-fs-num); }
.b-countdown.is-v-bar .b-countdown__unit { color: rgba(255, 255, 255, .82); }
@media (max-width: 560px) {
  .b-countdown.is-v-bar .b-countdown__bar { flex-direction: column; align-items: flex-start; }
  .b-countdown.is-v-bar .b-countdown__digits { justify-content: flex-start; }
}
`,
    },

    split: {
      name: "左右分置",
      render(p) {
        return `<div class="wb-inner"><div class="b-countdown__split">
          <div class="b-countdown__side">
            ${p.title ? `<div class="b-countdown__title">${esc(p.title)}</div>` : ""}
            ${p.note ? `<div class="b-countdown__note">${esc(p.note)}</div>` : ""}
          </div>
          ${countdownDigits(p)}
        </div></div>`;
      },
      css: `
.b-countdown.is-v-split .b-countdown__split { display: grid; grid-template-columns: .85fr 1.15fr; gap: var(--wb-space-5); align-items: center; max-width: 980px; margin: 0 auto; }
.b-countdown.is-v-split .b-countdown__title { font-size: var(--wf-fs-h2); text-align: left; }
.b-countdown.is-v-split .b-countdown__note { text-align: left; }
.b-countdown.is-v-split .b-countdown__digits { margin-top: 0; justify-content: flex-start; }
@media (max-width: 860px) { .b-countdown.is-v-split .b-countdown__split { grid-template-columns: 1fr; } }
`,
    },
  });

  /* ============================ 互动问答 ============================ */
  WF.defineVariants("quiz", {
    minimal: {
      name: "极简线条",
      render(p) {
        return `<div class="wb-inner"><div class="b-quiz__panel b-quiz">
          <div class="b-quiz__q">${nl2br(p.question)}</div>
          <div class="b-quiz__opts">${quizOpts(p)}</div>
          ${p.explanation ? `<div class="b-quiz__explain">💡 ${nl2br(p.explanation)}</div>` : ""}
        </div></div>`;
      },
      css: `
.b-quiz.is-v-minimal .b-quiz__panel { max-width: 720px; background: transparent; border: 0; border-top: 3px solid var(--wf-primary); border-radius: 0; padding: 28px 0 0; }
.b-quiz.is-v-minimal .b-quiz__q { font-size: 1.5em; }
.b-quiz.is-v-minimal .b-quiz__opts { gap: 0; margin-top: 18px; }
.b-quiz.is-v-minimal .b-quiz__opt { border: 0; border-bottom: 1px solid var(--wb-line); border-radius: 0; background: transparent; padding: 16px 4px; }
.b-quiz.is-v-minimal .b-quiz__opt:hover { border-color: var(--wf-primary); transform: none; }
.b-quiz.is-v-minimal .b-quiz__key { background: transparent; }
.b-quiz.is-v-minimal .b-quiz__opt.is-right { background: transparent; border-bottom-color: #16a34a; }
.b-quiz.is-v-minimal .b-quiz__opt.is-wrong { background: transparent; border-bottom-color: #dc2626; }
`,
    },

    cards: {
      name: "卡片选项",
      render(p) {
        return `<div class="wb-inner"><div class="b-quiz__panel b-quiz">
          <div class="b-quiz__q">${nl2br(p.question)}</div>
          <div class="b-quiz__opts">${quizOpts(p)}</div>
          ${p.explanation ? `<div class="b-quiz__explain">💡 ${nl2br(p.explanation)}</div>` : ""}
        </div></div>`;
      },
      css: `
.b-quiz.is-v-cards .b-quiz__panel { max-width: 780px; }
.b-quiz.is-v-cards .b-quiz__opts { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.b-quiz.is-v-cards .b-quiz__opt { flex-direction: column; align-items: flex-start; gap: var(--wb-gap-sm); padding: var(--wb-card-pad); min-height: 104px; }
.b-quiz.is-v-cards .b-quiz__key { width: 34px; height: 34px; }
@media (max-width: 560px) { .b-quiz.is-v-cards .b-quiz__opts { grid-template-columns: 1fr; } }
`,
    },

    split: {
      name: "左右分置",
      render(p) {
        return `<div class="wb-inner"><div class="b-quiz__panel b-quiz">
          <div class="b-quiz__q">${nl2br(p.question)}</div>
          <div class="b-quiz__opts">${quizOpts(p)}</div>
          ${p.explanation ? `<div class="b-quiz__explain">💡 ${nl2br(p.explanation)}</div>` : ""}
        </div></div>`;
      },
      css: `
.b-quiz.is-v-split .b-quiz__panel { max-width: 980px; display: grid; grid-template-columns: .9fr 1.1fr; gap: var(--wb-space-5); align-items: center; }
.b-quiz.is-v-split .b-quiz__q { font-size: 1.4em; }
.b-quiz.is-v-split .b-quiz__opts { margin-top: 0; }
.b-quiz.is-v-split .b-quiz__explain { grid-column: 1 / -1; }
@media (max-width: 860px) {
  .b-quiz.is-v-split .b-quiz__panel { grid-template-columns: 1fr; }
  .b-quiz.is-v-split .b-quiz__opts { margin-top: 4px; }
}
`,
    },
  });

  /* ============================ 图片热点 ============================ */
  WF.defineVariants("hotspot", {
    side: {
      name: "左图右清单",
      render(p) {
        const list = hotRows(p.items);
        return `<div class="wb-inner"><div class="wb-split2 b-hotspot__side">
          ${hotStage(p)}
          <div class="b-hotspot__list">${list || `<div class="wf-ph" data-label="暂无热点"></div>`}</div>
        </div></div>`;
      },
      css: `
.b-hotspot.is-v-side .b-hotspot__stage { border-radius: var(--wb-radius-lg); box-shadow: var(--wb-shadow-md); }
.b-hotspot.is-v-side .b-hotspot__list { display: grid; gap: var(--wb-space-3); }
.b-hotspot.is-v-side .b-hotspot__row { display: flex; gap: var(--wb-gap-sm); align-items: flex-start; padding-bottom: var(--wb-space-3); border-bottom: 1px solid var(--wb-line); }
.b-hotspot.is-v-side .b-hotspot__row:last-child { border-bottom: 0; padding-bottom: 0; }
.b-hotspot.is-v-side .b-hotspot__idx { width: 28px; height: 28px; flex: 0 0 auto; border-radius: 999px; background: var(--wf-primary-soft); color: var(--wf-primary); font-weight: 800; font-size: .84em; display: inline-flex; align-items: center; justify-content: center; }
.b-hotspot.is-v-side .b-hotspot__label { font-weight: 700; }
.b-hotspot.is-v-side .b-hotspot__desc { color: var(--wf-muted); font-size: var(--wf-fs-body); margin-top: 2px; line-height: 1.7; }
`,
    },

    numbered: {
      name: "编号标注",
      render(p) {
        const items = p.items || [];
        const cards = items.map((it, i) => `<div class="wb-card is-flat b-hotspot__card">
          <span class="b-hotspot__idx">${i + 1}</span>
          <div><div class="b-hotspot__label">${esc(it.label || "")}</div>${it.desc ? `<div class="b-hotspot__desc">${nl2br(it.desc)}</div>` : ""}</div>
        </div>`).join("");
        return `<div class="wb-inner">
          ${hotStage(p, true)}
          ${cards ? `<div class="wb-grid b-hotspot__cards" data-cols="2">${cards}</div>` : ""}
        </div>`;
      },
      css: `
.b-hotspot.is-v-numbered .b-hotspot__dot.is-num { width: 30px; height: 30px; color: #fff; background: var(--wf-primary); font-size: .82em; }
.b-hotspot.is-v-numbered .b-hotspot__cards { margin-top: var(--wb-space-4); }
.b-hotspot.is-v-numbered .b-hotspot__card { display: flex; gap: var(--wb-gap-sm); align-items: flex-start; }
.b-hotspot.is-v-numbered .b-hotspot__idx { width: 28px; height: 28px; flex: 0 0 auto; border-radius: 999px; background: var(--wf-primary-soft); color: var(--wf-primary); font-weight: 800; font-size: .84em; display: inline-flex; align-items: center; justify-content: center; }
.b-hotspot.is-v-numbered .b-hotspot__label { font-weight: 700; }
.b-hotspot.is-v-numbered .b-hotspot__desc { color: var(--wf-muted); font-size: var(--wf-fs-body); margin-top: 2px; line-height: 1.7; }
@media (max-width: 560px) { .b-hotspot.is-v-numbered .b-hotspot__cards { grid-template-columns: 1fr !important; } }
`,
    },

    focus: {
      name: "深色聚焦",
      render(p) {
        const chips = (p.items || []).map((it) => `<span class="b-hotspot__chip">${esc(it.label || "")}</span>`).join("");
        return `<div class="wb-inner"><div class="b-hotspot__frame">
          ${hotStage(p)}
          ${chips ? `<div class="b-hotspot__cap">${chips}</div>` : ""}
        </div></div>`;
      },
      css: `
.b-hotspot.is-v-focus .b-hotspot__frame {
  max-width: 1000px; margin: 0 auto; padding: clamp(16px, 2.4vw, 28px);
  border-radius: calc(var(--wb-radius-lg) + 8px);
  background: radial-gradient(120% 120% at 20% 0%, color-mix(in srgb, var(--wf-primary) 24%, #0b1220), #0b1220);
  box-shadow: var(--wb-shadow-lg);
}
.b-hotspot.is-v-focus .b-hotspot__stage { border-radius: var(--wb-radius-md); }
.b-hotspot.is-v-focus .b-hotspot__cap { display: flex; flex-wrap: wrap; gap: var(--wb-gap-xs); margin-top: 16px; }
.b-hotspot.is-v-focus .b-hotspot__chip { padding: 5px 12px; border-radius: 999px; background: rgba(255, 255, 255, .1); color: rgba(255, 255, 255, .9); font-size: .78em; }
`,
    },
  });

  /* ============================ 幻灯:封面页 ============================ */
  WF.defineVariants("slide-title", {
    center: {
      name: "居中大字",
      render(p) {
        return `${p.badge ? `<span class="b-s-title__badge">${esc(p.badge)}</span>` : ""}
          <h1 class="wf-slide__title">${esc(p.title || "")}</h1>
          ${p.subtitle ? `<p class="wf-slide__subtitle">${nl2br(p.subtitle)}</p>` : ""}
          <div class="b-s-title__meta">${p.speaker ? `<span>${esc(p.speaker)}</span>` : ""}${p.date ? `<span>${esc(p.date)}</span>` : ""}</div>`;
      },
      css: `
.b-s-title.is-v-center { align-items: center; text-align: center; background: radial-gradient(120% 120% at 50% 0%, var(--wf-primary-soft), var(--wf-bg) 66%); }
.b-s-title.is-v-center .wf-slide__title { font-size: var(--wf-fs-h2); }
.b-s-title.is-v-center .wf-slide__subtitle { max-width: 24em; }
.b-s-title.is-v-center .b-s-title__badge { align-self: center; }
.b-s-title.is-v-center .b-s-title__meta { justify-content: center; }
@media (max-width: 560px) { .b-s-title.is-v-center .wf-slide__title { font-size: var(--wf-fs-h2); } }
`,
    },

    rule: {
      name: "左对齐分隔线",
      render(p) {
        return `${p.badge ? `<span class="b-s-title__badge">${esc(p.badge)}</span>` : ""}
          <h1 class="wf-slide__title">${esc(p.title || "")}</h1>
          <span class="b-s-title__line"></span>
          ${p.subtitle ? `<p class="wf-slide__subtitle">${nl2br(p.subtitle)}</p>` : ""}
          <div class="b-s-title__meta">${p.speaker ? `<span>${esc(p.speaker)}</span>` : ""}${p.date ? `<span>${esc(p.date)}</span>` : ""}</div>`;
      },
      css: `
.b-s-title.is-v-rule { align-items: flex-start; text-align: left; }
.b-s-title.is-v-rule .b-s-title__badge { align-self: flex-start; background: transparent; color: var(--wf-primary); border: 1px solid color-mix(in srgb, var(--wf-primary) 42%, transparent); }
.b-s-title.is-v-rule .wf-slide__title { max-width: 16em; }
.b-s-title.is-v-rule .b-s-title__line { display: block; width: 4em; height: .18em; border-radius: 999px; background: var(--wf-primary); margin: 1.2em 0; }
.b-s-title.is-v-rule .wf-slide__subtitle { margin-top: 0; max-width: 22em; }
.b-s-title.is-v-rule .b-s-title__meta { justify-content: flex-start; margin-top: 1.6em; }
@media (max-width: 560px) { .b-s-title.is-v-rule .wf-slide__title { font-size: var(--wf-fs-h2); } }
`,
    },

    split: {
      name: "双栏版式",
      render(p) {
        return `<div class="b-s-title__split">
          <div class="b-s-title__main">
            ${p.badge ? `<span class="b-s-title__badge">${esc(p.badge)}</span>` : ""}
            <h1 class="wf-slide__title">${esc(p.title || "")}</h1>
          </div>
          <div class="b-s-title__aside">
            ${p.subtitle ? `<p class="wf-slide__subtitle">${nl2br(p.subtitle)}</p>` : ""}
            <div class="b-s-title__meta">${p.speaker ? `<span>${esc(p.speaker)}</span>` : ""}${p.date ? `<span>${esc(p.date)}</span>` : ""}</div>
          </div>
        </div>`;
      },
      css: `
.b-s-title.is-v-split .b-s-title__split { width: 100%; display: grid; grid-template-columns: 1.25fr .75fr; gap: 3em; align-items: center; }
.b-s-title.is-v-split .b-s-title__aside { border-left: 1px solid var(--wb-line); padding-left: 2.4em; }
.b-s-title.is-v-split .wf-slide__title { font-size: var(--wf-fs-h2); }
.b-s-title.is-v-split .wf-slide__subtitle { margin-top: 0; }
.b-s-title.is-v-split .b-s-title__meta { margin-top: 1.4em; flex-direction: column; gap: .6em; }
@media (max-width: 560px) {
  .b-s-title.is-v-split .b-s-title__split { grid-template-columns: 1fr; gap: 1.6em; }
  .b-s-title.is-v-split .b-s-title__aside { border-left: 0; padding-left: 0; }
}
`,
    },
  });

  /* ============================ 幻灯:要点页 ============================ */
  WF.defineVariants("slide-bullets", {
    cards: {
      name: "双列卡片",
      render(p) {
        const cards = (p.items || []).map((it, i) => `<div class="b-s-bullet-card">
          <span class="b-s-bullet__no">${i + 1}</span>
          <div class="b-s-bullet__t">${esc(it.title || "")}</div>
          ${it.desc ? `<div class="b-s-bullet__d">${esc(it.desc)}</div>` : ""}
        </div>`).join("");
        return `${p.kicker ? `<div class="wf-slide__kicker">${esc(p.kicker)}</div>` : ""}
          ${p.title ? `<h2 class="wf-slide__title">${esc(p.title)}</h2>` : ""}
          <div class="b-s-bullets__grid">${cards}</div>`;
      },
      css: `
.b-s-bullets.is-v-cards .b-s-bullets__grid { margin-top: 1.6em; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1em; }
.b-s-bullets.is-v-cards .b-s-bullet-card { background: var(--wf-surface); border: 1px solid var(--wb-line); border-radius: var(--wf-radius); padding: 1.1em 1.2em; }
.b-s-bullets.is-v-cards .b-s-bullet-card .b-s-bullet__no { display: inline-flex; margin-bottom: .5em; }
.b-s-bullets.is-v-cards .b-s-bullet__t { font-weight: 700; }
@media (max-width: 560px) { .b-s-bullets.is-v-cards .b-s-bullets__grid { grid-template-columns: 1fr; } }
`,
    },

    side: {
      name: "左题右列",
      render(p) {
        const rows = (p.items || []).map((it, i) => `<div class="b-s-bullet">
          <span class="b-s-bullet__no">${i + 1}</span>
          <div><div class="b-s-bullet__t">${esc(it.title || "")}</div>${it.desc ? `<div class="b-s-bullet__d">${esc(it.desc)}</div>` : ""}</div>
        </div>`).join("");
        return `<div class="b-s-bullets__side">
          <div class="b-s-bullets__lead">
            ${p.kicker ? `<div class="wf-slide__kicker">${esc(p.kicker)}</div>` : ""}
            ${p.title ? `<h2 class="wf-slide__title">${esc(p.title)}</h2>` : ""}
          </div>
          <div class="b-s-bullets__list">${rows}</div>
        </div>`;
      },
      css: `
.b-s-bullets.is-v-side .b-s-bullets__side { width: 100%; display: grid; grid-template-columns: .8fr 1.2fr; gap: 3em; align-items: center; }
.b-s-bullets.is-v-side .wf-slide__title { font-size: var(--wf-fs-h2); }
.b-s-bullets.is-v-side .b-s-bullets__list { margin-top: 0; }
.b-s-bullets.is-v-side .b-s-bullet { background: transparent; border: 0; border-left: 2px solid var(--wf-primary); border-radius: 0; padding: .3em 0 .3em 1.2em; }
@media (max-width: 560px) { .b-s-bullets.is-v-side .b-s-bullets__side { grid-template-columns: 1fr; gap: 1.4em; } }
`,
    },

    strip: {
      name: "横条大字",
      render(p) {
        const rows = (p.items || []).map((it, i) => `<div class="b-s-strip">
          <span class="b-s-strip__no">${String(i + 1).padStart(2, "0")}</span>
          <span class="b-s-strip__t">${esc(it.title || "")}</span>
          ${it.desc ? `<span class="b-s-strip__d">${esc(it.desc)}</span>` : ""}
        </div>`).join("");
        return `${p.kicker ? `<div class="wf-slide__kicker">${esc(p.kicker)}</div>` : ""}
          ${p.title ? `<h2 class="wf-slide__title">${esc(p.title)}</h2>` : ""}
          <div class="b-s-bullets__strips">${rows}</div>`;
      },
      css: `
.b-s-bullets.is-v-strip .b-s-bullets__strips { margin-top: 1.4em; display: grid; gap: .6em; }
.b-s-bullets.is-v-strip .b-s-strip { display: grid; grid-template-columns: 3em 1fr 1.3fr; gap: 1em; align-items: baseline; padding: .7em 0; border-bottom: 1px solid var(--wb-line); }
.b-s-bullets.is-v-strip .b-s-strip__no { font-size: var(--wf-fs-num); font-weight: 800; color: var(--wf-primary); font-variant-numeric: tabular-nums; }
.b-s-bullets.is-v-strip .b-s-strip__t { font-weight: 700; font-size: var(--wf-fs-h2); }
.b-s-bullets.is-v-strip .b-s-strip__d { color: var(--wf-muted); font-size: var(--wf-fs-body); }
@media (max-width: 560px) {
  .b-s-bullets.is-v-strip .b-s-strip { grid-template-columns: 2.4em 1fr; }
  .b-s-bullets.is-v-strip .b-s-strip__d { grid-column: 2; }
}
`,
    },
  });

  /* ============================ 幻灯:金句页 ============================ */
  WF.defineVariants("slide-quote", {
    boxed: {
      name: "描边框选",
      render(p) {
        return `<div class="b-s-quote__box">
          <p class="b-s-quote__text">${nl2br(p.quote)}</p>
          ${p.author ? `<div class="b-s-quote__author">${esc(p.author)}</div>` : ""}
        </div>`;
      },
      css: `
.b-s-quote.is-v-boxed { background: var(--wf-bg); color: var(--wf-text); }
.b-s-quote.is-v-boxed .b-s-quote__box { width: 100%; max-width: 40em; margin: 0 auto; border: 2px solid color-mix(in srgb, var(--wf-primary) 45%, transparent); border-radius: var(--wf-radius-lg); padding: 2.2em; text-align: center; }
.b-s-quote.is-v-boxed .b-s-quote__text { font-size: var(--wf-fs-body); margin: .4em auto 0; }
.b-s-quote.is-v-boxed .b-s-quote__author { color: var(--wf-muted); opacity: 1; }
`,
    },

    left: {
      name: "左对齐引用",
      render(p) {
        return `<div class="b-s-quote__left">
          <span class="b-s-quote__rule"></span>
          <p class="b-s-quote__text">${nl2br(p.quote)}</p>
          ${p.author ? `<div class="b-s-quote__author">${esc(p.author)}</div>` : ""}
        </div>`;
      },
      css: `
.b-s-quote.is-v-left { background: var(--wf-bg); color: var(--wf-text); text-align: left; align-items: flex-start; }
.b-s-quote.is-v-left .b-s-quote__left { width: 100%; }
.b-s-quote.is-v-left .b-s-quote__rule { display: block; width: 3em; height: .22em; border-radius: 999px; background: var(--wf-primary); margin-bottom: 1.4em; }
.b-s-quote.is-v-left .b-s-quote__text { font-size: var(--wf-fs-body); margin: 0; max-width: 22em; }
.b-s-quote.is-v-left .b-s-quote__author { margin-top: 1.6em; color: var(--wf-muted); opacity: 1; }
`,
    },

    split: {
      name: "双栏署名",
      render(p) {
        return `<div class="b-s-quote__split">
          <p class="b-s-quote__text">${nl2br(p.quote)}</p>
          <div class="b-s-quote__sign">
            <span class="b-s-quote__mark">“</span>
            ${p.author ? `<div class="b-s-quote__author">${esc(p.author)}</div>` : ""}
          </div>
        </div>`;
      },
      css: `
.b-s-quote.is-v-split { text-align: left; align-items: stretch; }
.b-s-quote.is-v-split .b-s-quote__split { width: 100%; display: grid; grid-template-columns: 1.4fr .6fr; gap: 3em; align-items: center; }
.b-s-quote.is-v-split .b-s-quote__text { margin: 0; max-width: none; }
.b-s-quote.is-v-split .b-s-quote__sign { border-left: 1px solid rgba(255, 255, 255, .28); padding-left: 2em; }
.b-s-quote.is-v-split .b-s-quote__mark { font-size: 3em; line-height: .6; opacity: .5; font-family: Georgia, serif; }
.b-s-quote.is-v-split .b-s-quote__author { margin-top: .8em; opacity: .85; }
@media (max-width: 560px) {
  .b-s-quote.is-v-split .b-s-quote__split { grid-template-columns: 1fr; gap: 1.4em; }
  .b-s-quote.is-v-split .b-s-quote__sign { border-left: 0; padding-left: 0; }
}
`,
    },
  });

  /* ============================ 幻灯:结尾页 ============================ */
  WF.defineVariants("slide-end", {
    card: {
      name: "卡片聚焦",
      render(p) {
        return `<div class="b-s-end__card">
          <h1 class="wf-slide__title">${esc(p.title || "")}</h1>
          ${p.subtitle ? `<p class="wf-slide__subtitle">${nl2br(p.subtitle)}</p>` : ""}
          <span class="b-s-end__line"></span>
          ${p.contact ? `<p class="b-s-end__contact">${nl2br(p.contact)}</p>` : ""}
          ${p.qr ? `<div class="b-s-end__qr"><img src="${esc(p.qr)}" alt="二维码"></div>` : ""}
        </div>`;
      },
      css: `
.b-s-end.is-v-card .b-s-end__card { width: min(100%, 34em); margin: 0 auto; background: var(--wf-surface); border: 1px solid var(--wb-line); border-radius: var(--wf-radius-lg); padding: 2.6em 2.4em; box-shadow: var(--wb-shadow-lg); text-align: center; }
.b-s-end.is-v-card .b-s-end__line { display: block; width: 3em; height: .18em; border-radius: 999px; background: var(--wf-primary); margin: 1.4em auto; }
.b-s-end.is-v-card .b-s-end__contact { margin-top: 0; }
.b-s-end.is-v-card .b-s-end__qr { margin-top: 1.4em; }
`,
    },

    split: {
      name: "图文分置",
      render(p) {
        return `<div class="b-s-end__split">
          <div class="b-s-end__copy">
            <h1 class="wf-slide__title">${esc(p.title || "")}</h1>
            ${p.subtitle ? `<p class="wf-slide__subtitle">${nl2br(p.subtitle)}</p>` : ""}
            ${p.contact ? `<p class="b-s-end__contact">${nl2br(p.contact)}</p>` : ""}
          </div>
          ${p.qr ? `<div class="b-s-end__qr"><img src="${esc(p.qr)}" alt="二维码"></div>` : ""}
        </div>`;
      },
      css: `
.b-s-end.is-v-split { text-align: left; align-items: stretch; }
.b-s-end.is-v-split .b-s-end__split { width: 100%; display: grid; grid-template-columns: 1fr auto; gap: 3em; align-items: center; }
.b-s-end.is-v-split .b-s-end__contact { margin-top: 1.2em; text-align: left; }
.b-s-end.is-v-split .b-s-end__qr { margin: 0; width: 9em; height: 9em; }
@media (max-width: 560px) {
  .b-s-end.is-v-split .b-s-end__split { grid-template-columns: 1fr; }
  .b-s-end.is-v-split .b-s-end__qr { margin: 0 auto; }
}
`,
    },

    minimal: {
      name: "极简单行",
      render(p) {
        const hasFoot = p.contact || p.qr;
        return `<div class="b-s-end__min">
          <h1 class="wf-slide__title">${esc(p.title || "")}</h1>
          ${p.subtitle ? `<p class="wf-slide__subtitle">${nl2br(p.subtitle)}</p>` : ""}
          ${hasFoot ? `<div class="b-s-end__minrow">
            ${p.qr ? `<div class="b-s-end__qr"><img src="${esc(p.qr)}" alt="二维码"></div>` : ""}
            ${p.contact ? `<p class="b-s-end__contact">${nl2br(p.contact)}</p>` : ""}
          </div>` : ""}
        </div>`;
      },
      css: `
.b-s-end.is-v-minimal .b-s-end__min { width: 100%; display: flex; flex-direction: column; align-items: center; text-align: center; }
.b-s-end.is-v-minimal .wf-slide__title { font-size: var(--wf-fs-h2); letter-spacing: -.03em; }
.b-s-end.is-v-minimal .b-s-end__minrow { display: flex; align-items: center; gap: 1.4em; margin-top: 2em; text-align: left; }
.b-s-end.is-v-minimal .b-s-end__qr { margin: 0; width: 6em; height: 6em; }
.b-s-end.is-v-minimal .b-s-end__contact { margin-top: 0; }
@media (max-width: 560px) {
  .b-s-end.is-v-minimal .wf-slide__title { font-size: var(--wf-fs-h2); }
  .b-s-end.is-v-minimal .b-s-end__minrow { flex-direction: column; text-align: center; }
}
`,
    },
  });
})(window.WF);
