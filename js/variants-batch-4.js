/* ============================================================
 * WebsFlow · 布局变体 · 批次 4(结构 / 展示类)
 * journey / cluster / bento / comparison / before-after
 * prompt / tool-grid / accordion / portrait
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
  const delay = (...a) => WF.delay(...a);
  const num = (i) => String(i + 1).padStart(2, "0");
  const empty = (label) => `<div class="wf-ph" data-label="${esc(label || "暂无内容")}"></div>`;
  const chips = (items, cls) => (items || []).map((it) => `<span class="${cls}">${esc(it.text || "")}</span>`).join("");

  /* ============================ 步骤旅程 ============================ */
  WF.defineVariants("journey", {
    timeline: {
      name: "交替时间轴",
      render(p) {
        const items = p.items || [];
        const rows = items.map((it, i) => `<div class="b-journey__tlrow">
          <div class="b-journey__tlcard">
            <div class="b-journey__tt">${esc(it.title || "")}</div>
            ${it.desc ? `<div class="b-journey__td">${nl2br(it.desc)}</div>` : ""}
          </div>
          <span class="b-journey__tldot">${num(i)}</span>
        </div>`).join("");
        return `<div class="wb-inner">
          ${headHTML(p, p.align === "center")}
          <div class="b-journey__tl">${rows || empty("暂无步骤")}</div>
        </div>`;
      },
      css: `
.b-journey.is-v-timeline .b-journey__tl { position: relative; max-width: 880px; margin: 0 auto; display: grid; gap: var(--wb-gap); }
.b-journey.is-v-timeline .b-journey__tl::before { content: ""; position: absolute; left: 50%; top: 6px; bottom: 6px; width: 2px; transform: translateX(-50%); background: var(--wb-line); }
.b-journey.is-v-timeline .b-journey__tlrow { display: grid; grid-template-columns: 1fr 64px 1fr; align-items: center; }
.b-journey.is-v-timeline .b-journey__tlcard { background: var(--wf-bg); border: 1px solid var(--wb-line); border-radius: var(--wb-radius-lg); padding: var(--wb-card-pad); box-shadow: var(--wb-shadow-sm); }
.b-journey.is-v-timeline .b-journey__tlrow:nth-child(odd) .b-journey__tlcard { grid-column: 1; grid-row: 1; text-align: right; }
.b-journey.is-v-timeline .b-journey__tlrow:nth-child(even) .b-journey__tlcard { grid-column: 3; grid-row: 1; }
.b-journey.is-v-timeline .b-journey__tldot { grid-column: 2; grid-row: 1; justify-self: center; width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--wf-primary); color: #fff; font-weight: 800; font-size: .85em; font-variant-numeric: tabular-nums; box-shadow: 0 0 0 6px var(--wf-bg); z-index: 1; }
.b-journey.is-v-timeline .b-journey__tt { font-weight: 700; font-size: 1.06em; }
.b-journey.is-v-timeline .b-journey__td { color: var(--wf-muted); font-size: .93em; margin-top: 5px; line-height: 1.65; }
@media (max-width: 860px) {
  .b-journey.is-v-timeline .b-journey__tl::before { left: 22px; transform: none; }
  .b-journey.is-v-timeline .b-journey__tlrow { grid-template-columns: 44px 1fr; gap: var(--wb-gap-sm); }
  .b-journey.is-v-timeline .b-journey__tldot { grid-column: 1; grid-row: 1; }
  .b-journey.is-v-timeline .b-journey__tlrow:nth-child(odd) .b-journey__tlcard,
  .b-journey.is-v-timeline .b-journey__tlrow:nth-child(even) .b-journey__tlcard { grid-column: 2; grid-row: 1; text-align: left; }
}
`,
    },

    rail: {
      name: "横向滑轨",
      render(p) {
        const items = p.items || [];
        const cards = items.map((it, i) => `<div class="wb-card is-lift b-journey__railcard">
          <span class="b-journey__railno">${num(i)}</span>
          <div class="b-journey__tt">${esc(it.title || "")}</div>
          ${it.desc ? `<div class="b-journey__td">${nl2br(it.desc)}</div>` : ""}
        </div>`).join("");
        return `<div class="wb-inner">
          ${headHTML(p, p.align === "center")}
          ${items.length ? `<div class="wb-rail b-journey__rail">${cards}</div>` : empty("暂无步骤")}
        </div>`;
      },
      css: `
.b-journey.is-v-rail .b-journey__rail { grid-auto-columns: minmax(270px, 1fr); }
.b-journey.is-v-rail .b-journey__railcard { position: relative; padding-top: 34px; }
.b-journey.is-v-rail .b-journey__railno { position: absolute; top: 16px; right: 20px; font-size: 1.7em; font-weight: 800; color: var(--wf-primary); opacity: .32; font-variant-numeric: tabular-nums; }
.b-journey.is-v-rail .b-journey__tt { font-weight: 700; font-size: 1.1em; }
.b-journey.is-v-rail .b-journey__td { color: var(--wf-muted); font-size: .93em; margin-top: 6px; line-height: 1.65; }
`,
    },

    split: {
      name: "左题右步骤",
      render(p) {
        const items = p.items || [];
        const list = items.map((it, i) => `<div class="b-journey__colsrow">
          <span class="b-journey__no">${num(i)}</span>
          <div>
            <div class="b-journey__t">${esc(it.title || "")}</div>
            ${it.desc ? `<div class="b-journey__d">${nl2br(it.desc)}</div>` : ""}
          </div>
        </div>`).join("");
        return `<div class="wb-inner"><div class="wb-split2 b-journey__split">
          ${headHTML(p, false)}
          <div class="b-journey__cols">${list || empty("暂无步骤")}</div>
        </div></div>`;
      },
      css: `
.b-journey.is-v-split .wb-head { margin-bottom: 0; }
.b-journey.is-v-split .b-journey__cols { display: grid; gap: var(--wb-gap-sm); }
.b-journey.is-v-split .b-journey__colsrow { display: flex; gap: var(--wb-gap-sm); align-items: flex-start; padding: var(--wb-chip-pad); border: 1px solid var(--wb-line); border-radius: var(--wb-radius-md); background: var(--wf-surface); }
.b-journey.is-v-split .b-journey__no { width: 40px; height: 40px; font-size: var(--wf-fs-num); }
`,
    },
  });

  /* ============================ 痛点小卡 ============================ */
  WF.defineVariants("cluster", {
    ledger: {
      name: "账目清单",
      render(p) {
        const items = p.items || [];
        const rows = items.map((it, i) => `<div class="b-cluster__row">
          <span class="b-cluster__idx">${num(i)}</span>
          <span class="b-cluster__rowicon">${esc(it.icon || "•")}</span>
          <div class="b-cluster__rowbody">
            <div class="b-cluster__t">${esc(it.title || "")}</div>
            ${it.desc ? `<div class="b-cluster__d">${nl2br(it.desc)}</div>` : ""}
          </div>
        </div>`).join("");
        return `<div class="wb-inner">
          ${headHTML(p, p.align === "center")}
          <div class="b-cluster__ledger">${rows || empty("暂无条目")}</div>
        </div>`;
      },
      css: `
.b-cluster.is-v-ledger .b-cluster__ledger { display: grid; max-width: 880px; margin: 0 auto; border-top: 1px solid var(--wb-line); }
.b-cluster.is-v-ledger .b-cluster__row { display: grid; grid-template-columns: 56px 44px 1fr; gap: var(--wb-gap-sm); align-items: start; padding: 22px 6px; border-bottom: 1px solid var(--wb-line); transition: background .2s var(--wb-ease); }
.b-cluster.is-v-ledger .b-cluster__row:hover { background: color-mix(in srgb, var(--wf-primary) 5%, transparent); }
.b-cluster.is-v-ledger .b-cluster__idx { font-size: 1.4em; font-weight: 800; color: var(--wf-primary); opacity: .5; font-variant-numeric: tabular-nums; line-height: 1.1; }
.b-cluster.is-v-ledger .b-cluster__rowicon { font-size: 1.5em; line-height: 1.2; }
.b-cluster.is-v-ledger .b-cluster__t { margin-top: 0; }
@media (max-width: 560px) {
  .b-cluster.is-v-ledger .b-cluster__row { grid-template-columns: 40px 1fr; }
  .b-cluster.is-v-ledger .b-cluster__rowicon { display: none; }
}
`,
    },

    spotlight: {
      name: "主卡优先",
      render(p) {
        const items = p.items || [];
        if (!items.length) return `<div class="wb-inner">${headHTML(p, p.align === "center")}${empty("暂无条目")}</div>`;
        const hero = items[0];
        const rest = items.slice(1);
        const restCards = rest.map((it) => `<div class="wb-card is-flat b-cluster__mini">
          ${it.icon ? `<span class="b-cluster__miniicon">${esc(it.icon)}</span>` : ""}
          <div class="b-cluster__t">${esc(it.title || "")}</div>
          ${it.desc ? `<div class="b-cluster__d">${nl2br(it.desc)}</div>` : ""}
        </div>`).join("");
        return `<div class="wb-inner">
          ${headHTML(p, p.align === "center")}
          <div class="b-cluster__spot">
            <div class="wb-card is-lift b-cluster__hero">
              <span class="b-cluster__heroic">${esc(hero.icon || "★")}</span>
              <div>
                <div class="b-cluster__t">${esc(hero.title || "")}</div>
                ${hero.desc ? `<div class="b-cluster__d">${nl2br(hero.desc)}</div>` : ""}
              </div>
            </div>
            ${restCards ? `<div class="wb-grid is-auto b-cluster__rest">${restCards}</div>` : ""}
          </div>
        </div>`;
      },
      css: `
.b-cluster.is-v-spotlight .b-cluster__spot { display: grid; gap: var(--wb-space-4); }
.b-cluster.is-v-spotlight .b-cluster__hero { display: flex; gap: var(--wb-gap); align-items: center; padding: clamp(24px, 3vw, 40px); border-left: 4px solid var(--wf-primary); }
.b-cluster.is-v-spotlight .b-cluster__heroic { flex: 0 0 auto; width: 72px; height: 72px; border-radius: var(--wb-radius-lg); background: var(--wf-primary-soft); display: flex; align-items: center; justify-content: center; font-size: 2.2em; }
.b-cluster.is-v-spotlight .b-cluster__hero .b-cluster__t { margin-top: 0; font-size: var(--wf-fs-h2); }
.b-cluster.is-v-spotlight .b-cluster__hero .b-cluster__d { font-size: var(--wf-fs-body); }
.b-cluster.is-v-spotlight .b-cluster__mini { display: flex; flex-direction: column; gap: 4px; }
.b-cluster.is-v-spotlight .b-cluster__miniicon { font-size: 1.5em; }
.b-cluster.is-v-spotlight .b-cluster__mini .b-cluster__t { margin-top: 4px; }
@media (max-width: 560px) {
  .b-cluster.is-v-spotlight .b-cluster__hero { flex-direction: column; align-items: flex-start; gap: var(--wb-gap-sm); }
}
`,
    },

    stair: {
      name: "阶梯错落",
      render(p) {
        const items = p.items || [];
        const n = Math.max(1, Number(p.cols) || 3);
        const cards = items.map((it, i) => `<div class="wb-card is-lift b-cluster__staircard" style="--stair:${(i % n) * 26}px">
          <span class="b-cluster__stairno">${num(i)}</span>
          ${it.icon ? `<span class="b-cluster__stairicon">${esc(it.icon)}</span>` : ""}
          <div class="b-cluster__t">${esc(it.title || "")}</div>
          ${it.desc ? `<div class="b-cluster__d">${nl2br(it.desc)}</div>` : ""}
        </div>`).join("");
        return `<div class="wb-inner">
          ${headHTML(p, p.align === "center")}
          <div class="wb-grid b-cluster__stair" data-cols="${esc(p.cols || 3)}">${cards || empty("暂无条目")}</div>
        </div>`;
      },
      css: `
.b-cluster.is-v-stair .b-cluster__stair { align-items: start; }
.b-cluster.is-v-stair .b-cluster__staircard { margin-top: var(--stair, 0); }
.b-cluster.is-v-stair .b-cluster__stairno { display: block; font-size: 1.5em; font-weight: 800; color: var(--wf-primary); opacity: .4; font-variant-numeric: tabular-nums; }
.b-cluster.is-v-stair .b-cluster__stairicon { font-size: 1.5em; }
.b-cluster.is-v-stair .b-cluster__t { margin-top: 8px; }
@media (max-width: 860px) {
  .b-cluster.is-v-stair .b-cluster__staircard { margin-top: calc(var(--stair, 0) / 2); }
}
@media (max-width: 560px) {
  .b-cluster.is-v-stair .b-cluster__staircard { margin-top: 0; }
}
`,
    },
  });

  /* ============================ Bento 网格 ============================ */
  WF.defineVariants("bento", {
    mosaic: {
      name: "六格拼贴",
      render(p) {
        const items = p.items || [];
        const tiles = items.map((it) => {
          const wide = it.span === "2";
          return `<div class="b-bento__tile${wide ? " is-wide" : ""}">
            ${it.image ? `<div class="wb-media b-bento__tileimg">${imgOrPh(it.image, it.title || "图片")}</div>` : ""}
            <div class="b-bento__tilebody">
              ${it.icon ? `<span class="b-bento__tileicon">${esc(it.icon)}</span>` : ""}
              <div class="b-bento__t">${esc(it.title || "")}</div>
              ${it.desc ? `<div class="b-bento__d">${nl2br(it.desc)}</div>` : ""}
            </div>
          </div>`;
        }).join("");
        return `<div class="wb-inner">
          ${headHTML(p, p.align === "center")}
          <div class="wb-mosaic b-bento__mosaic">${tiles || empty("暂无卡片")}</div>
        </div>`;
      },
      css: `
.b-bento.is-v-mosaic .b-bento__mosaic { align-items: stretch; }
.b-bento.is-v-mosaic .b-bento__tile { grid-column: span 2; display: flex; flex-direction: column; background: var(--wf-bg); border: 1px solid var(--wb-line); border-radius: var(--wb-radius-lg); overflow: hidden; box-shadow: var(--wb-shadow-sm); }
.b-bento.is-v-mosaic .b-bento__tile.is-wide { grid-column: span 4; }
.b-bento.is-v-mosaic .b-bento__tileimg { border-radius: 0; box-shadow: none; }
.b-bento.is-v-mosaic .b-bento__tilebody { padding: var(--wb-card-pad); display: flex; flex-direction: column; }
.b-bento.is-v-mosaic .b-bento__tileicon { font-size: 1.5em; }
.b-bento.is-v-mosaic .b-bento__t { margin-top: 6px; }
@media (max-width: 860px) {
  .b-bento.is-v-mosaic .b-bento__tile,
  .b-bento.is-v-mosaic .b-bento__tile.is-wide { grid-column: span 2; }
}
@media (max-width: 560px) {
  .b-bento.is-v-mosaic .b-bento__mosaic { grid-template-columns: 1fr !important; }
  .b-bento.is-v-mosaic .b-bento__tile,
  .b-bento.is-v-mosaic .b-bento__tile.is-wide { grid-column: 1 / -1 !important; }
}
`,
    },

    spotlight: {
      name: "主卡首屏",
      render(p) {
        const items = p.items || [];
        if (!items.length) return `<div class="wb-inner">${headHTML(p, p.align === "center")}${empty("暂无卡片")}</div>`;
        const hero = items[0];
        const rest = items.slice(1);
        const restCards = rest.map((it) => `<div class="wb-card is-flat b-bento__restcard">
          ${it.icon ? `<span class="b-bento__resticon">${esc(it.icon)}</span>` : ""}
          <div class="b-bento__t">${esc(it.title || "")}</div>
          ${it.desc ? `<div class="b-bento__d">${nl2br(it.desc)}</div>` : ""}
        </div>`).join("");
        return `<div class="wb-inner">
          ${headHTML(p, p.align === "center")}
          <div class="wb-card b-bento__hero${hero.image ? " has-media" : ""}">
            ${hero.image ? `<div class="wb-media b-bento__heroimg">${imgOrPh(hero.image, hero.title || "图片")}</div>` : ""}
            <div class="wb-stack b-bento__herobody">
              ${hero.icon ? `<span class="b-bento__heroicon">${esc(hero.icon)}</span>` : ""}
              <div class="b-bento__t b-bento__herot">${esc(hero.title || "")}</div>
              ${hero.desc ? `<div class="b-bento__d b-bento__herod">${nl2br(hero.desc)}</div>` : ""}
            </div>
          </div>
          ${restCards ? `<div class="wb-grid b-bento__rest" data-cols="${esc(p.cols || 3)}">${restCards}</div>` : ""}
        </div>`;
      },
      css: `
.b-bento.is-v-spotlight .b-bento__hero { display: grid; gap: clamp(26px, 4vw, 48px); align-items: center; padding: clamp(22px, 3vw, 38px); }
.b-bento.is-v-spotlight .b-bento__hero.has-media { grid-template-columns: 1.1fr .9fr; }
.b-bento.is-v-spotlight .b-bento__heroimg { box-shadow: none; }
.b-bento.is-v-spotlight .b-bento__heroicon { font-size: 1.8em; }
.b-bento.is-v-spotlight .b-bento__herot { margin-top: 0; font-size: clamp(1.3em, 1em + 1vw, 1.7em); }
.b-bento.is-v-spotlight .b-bento__herod { font-size: 1em; }
.b-bento.is-v-spotlight .b-bento__rest { margin-top: var(--wb-space-4); }
.b-bento.is-v-spotlight .b-bento__restcard { display: flex; flex-direction: column; gap: 4px; }
.b-bento.is-v-spotlight .b-bento__resticon { font-size: 1.5em; }
@media (max-width: 860px) {
  .b-bento.is-v-spotlight .b-bento__hero.has-media { grid-template-columns: 1fr; }
}
`,
    },

    rail: {
      name: "横向卡片",
      render(p) {
        const items = p.items || [];
        const cards = items.map((it) => `<div class="wb-card is-lift b-bento__railcard">
          ${it.image ? `<div class="wb-media b-bento__railimg">${imgOrPh(it.image, it.title || "图片")}</div>` : ""}
          ${it.icon ? `<span class="b-bento__tileicon">${esc(it.icon)}</span>` : ""}
          <div class="b-bento__t">${esc(it.title || "")}</div>
          ${it.desc ? `<div class="b-bento__d">${nl2br(it.desc)}</div>` : ""}
        </div>`).join("");
        return `<div class="wb-inner">
          ${headHTML(p, p.align === "center")}
          ${items.length ? `<div class="wb-rail b-bento__rail">${cards}</div>` : empty("暂无卡片")}
        </div>`;
      },
      css: `
.b-bento.is-v-rail .b-bento__rail { grid-auto-columns: minmax(290px, 1fr); }
.b-bento.is-v-rail .b-bento__railcard { display: flex; flex-direction: column; }
.b-bento.is-v-rail .b-bento__railimg { border-radius: var(--wb-radius-md); margin-bottom: 14px; }
.b-bento.is-v-rail .b-bento__tileicon { font-size: 1.5em; }
.b-bento.is-v-rail .b-bento__t { margin-top: 6px; }
`,
    },
  });

  /* ============================ 对比表 ============================ */
  WF.defineVariants("comparison", {
    cards: {
      name: "双卡对照",
      render(p) {
        const items = p.items || [];
        const col = (plan, valKey, isA) => `<div class="wb-card ${isA ? "is-a" : "is-b is-flat"} b-comparison__ccol">
          <div class="b-comparison__chead">
            <span class="wb-pill ${isA ? "is-primary" : ""}">${isA ? "推荐" : "对照"}</span>
            <div class="b-comparison__cplan">${esc(plan || "")}</div>
          </div>
          <div class="b-comparison__clist">
            ${items.map((it) => `<div class="b-comparison__crow">
              <span class="b-comparison__cmark">${isA ? "✓" : "·"}</span>
              <span class="b-comparison__cbody">
                <span class="b-comparison__cf">${esc(it.feature || "")}</span>
                <span class="b-comparison__cv">${esc(it[valKey] || "")}</span>
              </span>
            </div>`).join("")}
          </div>
        </div>`;
        return `<div class="wb-inner">
          ${headHTML(p, p.align === "center")}
          <div class="b-comparison__cards">
            ${col(p.planA, "a", true)}
            ${col(p.planB, "b", false)}
          </div>
        </div>`;
      },
      css: `
.b-comparison.is-v-cards .b-comparison__cards { display: grid; grid-template-columns: 1fr 1fr; gap: var(--wb-space-4); align-items: start; }
.b-comparison.is-v-cards .b-comparison__ccol { display: grid; gap: var(--wb-space-3); }
.b-comparison.is-v-cards .b-comparison__ccol.is-a { border-color: color-mix(in srgb, var(--wf-primary) 30%, var(--wb-line)); box-shadow: var(--wb-shadow-md); }
.b-comparison.is-v-cards .b-comparison__chead { display: flex; align-items: center; gap: var(--wb-gap-sm); flex-wrap: wrap; }
.b-comparison.is-v-cards .b-comparison__cplan { font-weight: 800; font-size: 1.15em; }
.b-comparison.is-v-cards .b-comparison__clist { display: grid; gap: var(--wb-gap-sm); }
.b-comparison.is-v-cards .b-comparison__crow { display: flex; gap: var(--wb-gap-sm); align-items: flex-start; }
.b-comparison.is-v-cards .b-comparison__cmark { flex: none; width: 22px; height: 22px; border-radius: 999px; display: flex; align-items: center; justify-content: center; background: var(--wf-primary-soft); color: var(--wf-primary); font-size: .8em; font-weight: 800; }
.b-comparison.is-v-cards .is-b .b-comparison__cmark { background: var(--wf-surface); color: var(--wf-muted); }
.b-comparison.is-v-cards .b-comparison__cbody { display: grid; gap: 2px; }
.b-comparison.is-v-cards .b-comparison__cf { color: var(--wf-muted); font-size: .8em; font-weight: 600; }
.b-comparison.is-v-cards .b-comparison__cv { font-size: .96em; line-height: 1.55; }
@media (max-width: 560px) {
  .b-comparison.is-v-cards .b-comparison__cards { grid-template-columns: 1fr; }
}
`,
    },

    duel: {
      name: "逐项对决",
      render(p) {
        const items = p.items || [];
        const rows = items.map((it) => `<div class="b-comparison__duelrow">
          <div class="b-comparison__duelf">${esc(it.feature || "")}</div>
          <div class="b-comparison__duelbox is-a">
            <span class="b-comparison__dueltag">${esc(p.planA || "")}</span>
            <span class="b-comparison__duelval">${esc(it.a || "")}</span>
          </div>
          <span class="b-comparison__vs">VS</span>
          <div class="b-comparison__duelbox is-b">
            <span class="b-comparison__dueltag">${esc(p.planB || "")}</span>
            <span class="b-comparison__duelval">${esc(it.b || "")}</span>
          </div>
        </div>`).join("");
        return `<div class="wb-inner">
          ${headHTML(p, p.align === "center")}
          <div class="b-comparison__duel">${rows || empty("暂无对比项")}</div>
        </div>`;
      },
      css: `
.b-comparison.is-v-duel .b-comparison__duel { display: grid; gap: var(--wb-gap-sm); max-width: 900px; margin: 0 auto; }
.b-comparison.is-v-duel .b-comparison__duelrow { display: grid; grid-template-columns: 130px 1fr 44px 1fr; gap: var(--wb-gap-sm); align-items: center; }
.b-comparison.is-v-duel .b-comparison__duelf { font-size: .85em; font-weight: 700; color: var(--wf-muted); }
.b-comparison.is-v-duel .b-comparison__duelbox { display: grid; gap: 3px; padding: 14px 16px; border-radius: var(--wb-radius-md); border: 1px solid var(--wb-line); background: var(--wf-bg); font-size: .95em; line-height: 1.5; }
.b-comparison.is-v-duel .b-comparison__duelbox.is-a { border-color: color-mix(in srgb, var(--wf-primary) 28%, var(--wb-line)); background: color-mix(in srgb, var(--wf-primary-soft) 45%, var(--wf-bg)); }
.b-comparison.is-v-duel .b-comparison__dueltag { font-size: .72em; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: var(--wf-muted); display: none; }
.b-comparison.is-v-duel .b-comparison__duelval { font-weight: 600; }
.b-comparison.is-v-duel .b-comparison__vs { text-align: center; font-size: .72em; font-weight: 800; color: var(--wf-muted); letter-spacing: .08em; }
@media (max-width: 560px) {
  .b-comparison.is-v-duel .b-comparison__duelrow { grid-template-columns: 1fr; gap: 6px; padding: 14px 0; border-bottom: 1px solid var(--wb-line); }
  .b-comparison.is-v-duel .b-comparison__duelf { font-size: .95em; color: var(--wf-text); }
  .b-comparison.is-v-duel .b-comparison__dueltag { display: block; }
  .b-comparison.is-v-duel .b-comparison__vs { text-align: left; }
}
`,
    },

    focus: {
      name: "主推方案",
      render(p) {
        const items = p.items || [];
        const rows = (valKey) => items.map((it) => `<div class="b-comparison__frow">
          <span class="b-comparison__ff">${esc(it.feature || "")}</span>
          <span class="b-comparison__fv">${esc(it[valKey] || "")}</span>
        </div>`).join("");
        return `<div class="wb-inner">
          ${headHTML(p, p.align === "center")}
          <div class="b-comparison__focus">
            <div class="wb-card b-comparison__fA">
              <div class="b-comparison__fhead"><span class="wb-pill is-primary">推荐</span><span class="b-comparison__fplan">${esc(p.planA || "")}</span></div>
              <div class="b-comparison__flist">${rows("a")}</div>
            </div>
            <div class="wb-card is-ghost b-comparison__fB">
              <div class="b-comparison__fhead"><span class="wb-pill">对照</span><span class="b-comparison__fplan">${esc(p.planB || "")}</span></div>
              <div class="b-comparison__flist">${rows("b")}</div>
            </div>
          </div>
        </div>`;
      },
      css: `
.b-comparison.is-v-focus .b-comparison__focus { display: grid; grid-template-columns: 1.45fr 1fr; gap: var(--wb-space-4); align-items: start; }
.b-comparison.is-v-focus .b-comparison__fhead { display: flex; align-items: center; gap: var(--wb-gap-sm); flex-wrap: wrap; padding-bottom: 14px; border-bottom: 1px solid var(--wb-line); }
.b-comparison.is-v-focus .b-comparison__fplan { font-weight: 800; font-size: 1.15em; }
.b-comparison.is-v-focus .b-comparison__flist { display: grid; }
.b-comparison.is-v-focus .b-comparison__frow { display: grid; gap: 4px; padding: 13px 0; border-bottom: 1px solid var(--wb-line); }
.b-comparison.is-v-focus .b-comparison__frow:last-child { border-bottom: 0; }
.b-comparison.is-v-focus .b-comparison__ff { font-size: .78em; font-weight: 700; color: var(--wf-muted); letter-spacing: .02em; }
.b-comparison.is-v-focus .b-comparison__fv { font-size: .96em; line-height: 1.55; }
.b-comparison.is-v-focus .b-comparison__fA .b-comparison__fv { font-weight: 650; }
.b-comparison.is-v-focus .b-comparison__fB .b-comparison__fv { color: var(--wf-muted); }
@media (max-width: 860px) {
  .b-comparison.is-v-focus .b-comparison__focus { grid-template-columns: 1fr; }
}
`,
    },
  });

  /* ============================ 前后对比 ============================ */
  WF.defineVariants("before-after", {
    stacked: {
      name: "上下递进",
      render(p) {
        const shot = (img, label, cls) => `<div class="b-ba__stackitem ${cls}">
          <div class="b-ba__stackhead"><span class="wb-pill ${cls === "is-after" ? "is-primary" : ""}">${esc(label || "")}</span></div>
          <div class="wb-media b-ba__shot" data-ratio="21x9">${imgOrPh(img, label || "图片")}</div>
        </div>`;
        return `<div class="wb-inner">
          ${headHTML(p, p.align === "center")}
          <div class="b-ba__stack">
            ${shot(p.beforeImage, p.beforeLabel || "改造前", "is-before")}
            <div class="b-ba__down" aria-hidden="true">↓</div>
            ${shot(p.afterImage, p.afterLabel || "改造后", "is-after")}
          </div>
          ${p.note ? `<div class="b-ba__note">${esc(p.note)}</div>` : ""}
        </div>`;
      },
      css: `
.b-before-after.is-v-stacked .b-ba__stack { display: grid; gap: var(--wb-space-3); max-width: 920px; margin: 0 auto; }
.b-before-after.is-v-stacked .b-ba__stackhead { margin-bottom: 10px; }
.b-before-after.is-v-stacked .b-ba__stackitem.is-before .b-ba__shot img { filter: saturate(.75) opacity(.92); }
.b-before-after.is-v-stacked .b-ba__stackitem.is-after .b-ba__shot { box-shadow: var(--wb-shadow-md); }
.b-before-after.is-v-stacked .b-ba__down { text-align: center; font-size: 1.4em; color: var(--wf-primary); }
`,
    },

    cards: {
      name: "变迁卡片",
      render(p) {
        const card = (img, label, isAfter) => `<div class="wb-card ${isAfter ? "is-lift" : "is-flat"} b-ba__card ${isAfter ? "is-after" : "is-before"}">
          <div class="b-ba__cardhead">
            <span class="wb-pill ${isAfter ? "is-primary" : ""}">${esc(label || "")}</span>
            ${isAfter ? `<span class="b-ba__up" aria-hidden="true">↑</span>` : ""}
          </div>
          <div class="wb-media b-ba__cardimg" data-ratio="4x3">${imgOrPh(img, label || "图片")}</div>
        </div>`;
        return `<div class="wb-inner">
          ${headHTML(p, p.align === "center")}
          <div class="b-ba__cards">
            ${card(p.beforeImage, p.beforeLabel || "改造前", false)}
            ${card(p.afterImage, p.afterLabel || "改造后", true)}
          </div>
          ${p.note ? `<div class="b-ba__note">${esc(p.note)}</div>` : ""}
        </div>`;
      },
      css: `
.b-before-after.is-v-cards .b-ba__cards { display: grid; grid-template-columns: 1fr 1fr; gap: var(--wb-space-4); align-items: start; }
.b-before-after.is-v-cards .b-ba__card { display: grid; gap: var(--wb-gap-sm); }
.b-before-after.is-v-cards .b-ba__cardhead { display: flex; align-items: center; justify-content: space-between; gap: var(--wb-gap-sm); }
.b-before-after.is-v-cards .b-ba__up { color: var(--wf-primary); font-weight: 800; }
.b-before-after.is-v-cards .b-ba__card.is-before .b-ba__cardimg img { filter: saturate(.75) opacity(.92); }
@media (max-width: 560px) {
  .b-before-after.is-v-cards .b-ba__cards { grid-template-columns: 1fr; }
}
`,
    },

    spotlight: {
      name: "后置放大",
      render(p) {
        const side = (img, label, cls) => `<div class="b-ba__spotitem ${cls}">
          <span class="wb-pill ${cls === "is-after" ? "is-primary" : ""}">${esc(label || "")}</span>
          <div class="wb-media b-ba__spotimg" data-ratio="4x3">${imgOrPh(img, label || "图片")}</div>
        </div>`;
        return `<div class="wb-inner">
          ${headHTML(p, p.align === "center")}
          <div class="b-ba__spot">
            ${side(p.beforeImage, p.beforeLabel || "改造前", "is-before")}
            <span class="b-ba__spotarrow" aria-hidden="true">→</span>
            ${side(p.afterImage, p.afterLabel || "改造后", "is-after")}
          </div>
          ${p.note ? `<div class="b-ba__note">${esc(p.note)}</div>` : ""}
        </div>`;
      },
      css: `
.b-before-after.is-v-spotlight .b-ba__spot { display: grid; grid-template-columns: .82fr auto 1.6fr; gap: var(--wb-space-4); align-items: center; }
.b-before-after.is-v-spotlight .b-ba__spotitem { display: grid; gap: var(--wb-gap-sm); }
.b-before-after.is-v-spotlight .b-ba__spotitem.is-before .b-ba__spotimg img { filter: saturate(.7) opacity(.9); }
.b-before-after.is-v-spotlight .b-ba__spotitem.is-after .b-ba__spotimg { box-shadow: var(--wb-shadow-md); }
.b-before-after.is-v-spotlight .b-ba__spotarrow { font-size: 1.5em; color: var(--wf-primary); text-align: center; }
@media (max-width: 860px) {
  .b-before-after.is-v-spotlight .b-ba__spot { grid-template-columns: 1fr; }
  .b-before-after.is-v-spotlight .b-ba__spotarrow { transform: rotate(90deg); }
}
`,
    },
  });

  /* ============================ 提示词启动器 ============================ */
  WF.defineVariants("prompt", {
    terminal: {
      name: "终端窗口",
      render(p) {
        const flags = chips(p.items, "b-prompt__flag");
        return `<div class="wb-inner is-tight">
          <div class="b-prompt__term">
            <div class="b-prompt__termbar">
              <span class="b-prompt__dot"></span><span class="b-prompt__dot"></span><span class="b-prompt__dot"></span>
              ${p.subtitle ? `<span class="b-prompt__termtitle">${esc(p.subtitle)}</span>` : ""}
            </div>
            <div class="b-prompt__termbody">
              <div class="b-prompt__cmd">
                <span class="b-prompt__sig">$</span>
                <div class="b-prompt__cmdtext">${nl2br(p.title || "")}</div>
              </div>
              ${flags ? `<div class="b-prompt__flags">${flags}</div>` : ""}
              ${p.btnText ? `<div class="b-prompt__termfoot">${btn(p.btnText, p.btnLink, "is-primary b-prompt__btn3")}</div>` : ""}
            </div>
          </div>
        </div>`;
      },
      css: `
.b-prompt.is-v-terminal .b-prompt__term { max-width: 780px; margin: 0 auto; background: #0b1020; border-radius: var(--wb-radius-lg); border: 1px solid rgba(148, 163, 184, .22); overflow: hidden; box-shadow: var(--wb-shadow-lg); }
.b-prompt.is-v-terminal .b-prompt__termbar { display: flex; align-items: center; gap: 7px; padding: 12px 16px; background: rgba(255, 255, 255, .04); border-bottom: 1px solid rgba(148, 163, 184, .16); }
.b-prompt.is-v-terminal .b-prompt__dot { width: 11px; height: 11px; border-radius: 50%; background: #475569; }
.b-prompt.is-v-terminal .b-prompt__dot:nth-child(1) { background: #f87171; }
.b-prompt.is-v-terminal .b-prompt__dot:nth-child(2) { background: #fbbf24; }
.b-prompt.is-v-terminal .b-prompt__dot:nth-child(3) { background: #34d399; }
.b-prompt.is-v-terminal .b-prompt__termtitle { margin-left: 8px; color: #94a3b8; font-size: .8em; letter-spacing: .08em; }
.b-prompt.is-v-terminal .b-prompt__termbody { padding: 26px 28px 28px; }
.b-prompt.is-v-terminal .b-prompt__cmd { display: flex; gap: var(--wb-gap-sm); align-items: flex-start; }
.b-prompt.is-v-terminal .b-prompt__sig { color: #34d399; font-weight: 800; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.b-prompt.is-v-terminal .b-prompt__cmdtext { color: #e2e8f0; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .98em; line-height: 1.8; white-space: pre-line; }
.b-prompt.is-v-terminal .b-prompt__flags { display: flex; flex-wrap: wrap; gap: var(--wb-gap-xs); margin-top: 20px; }
.b-prompt.is-v-terminal .b-prompt__flag { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .82em; color: #a5b4fc; background: rgba(99, 102, 241, .14); border: 1px solid rgba(129, 140, 248, .28); border-radius: 6px; padding: 4px 10px; }
.b-prompt.is-v-terminal .b-prompt__termfoot { margin-top: 22px; }
.b-prompt.is-v-terminal .b-prompt__btn3 { background: #6366f1; }
@media (max-width: 560px) {
  .b-prompt.is-v-terminal .b-prompt__termbody { padding: 20px 18px 22px; }
}
`,
    },

    split: {
      name: "左右分置",
      render(p) {
        const flags = chips(p.items, "b-prompt__chip");
        return `<div class="wb-inner"><div class="wb-split2 b-prompt__split">
          <div class="wb-stack b-prompt__splitintro">
            ${p.subtitle ? `<span class="wb-eyebrow">${esc(p.subtitle)}</span>` : ""}
            ${flags ? `<div class="b-prompt__chips b-prompt__chips--light">${flags}</div>` : ""}
            ${p.btnText ? btn(p.btnText, p.btnLink) : ""}
          </div>
          <div class="b-prompt__panel b-prompt__splitpanel">
            <div class="b-prompt__text">${nl2br(p.title || "")}</div>
          </div>
        </div></div>`;
      },
      css: `
.b-prompt.is-v-split .b-prompt__splitintro { align-items: flex-start; }
.b-prompt.is-v-split .b-prompt__splitpanel { margin: 0; }
.b-prompt.is-v-split .b-prompt__chips--light { margin-top: 0; }
.b-prompt.is-v-split .b-prompt__chips--light .b-prompt__chip { color: var(--wf-muted); border-color: var(--wb-line); background: var(--wf-surface); }
`,
    },

    bubble: {
      name: "对话气泡",
      render(p) {
        const flags = chips(p.items, "b-prompt__chip");
        return `<div class="wb-inner is-tight">
          <div class="b-prompt__chat">
            <div class="b-prompt__msg">
              <span class="b-prompt__avatar">AI</span>
              <div class="b-prompt__bubble">${nl2br(p.title || "")}</div>
            </div>
            <div class="b-prompt__chatfoot">
              ${flags ? `<div class="b-prompt__chips b-prompt__chips--light">${flags}</div>` : ""}
              ${p.btnText ? btn(p.btnText, p.btnLink) : ""}
            </div>
          </div>
        </div>`;
      },
      css: `
.b-prompt.is-v-bubble .b-prompt__chat { max-width: 720px; margin: 0 auto; }
.b-prompt.is-v-bubble .b-prompt__msg { display: flex; gap: var(--wb-gap-sm); align-items: flex-start; }
.b-prompt.is-v-bubble .b-prompt__avatar { flex: none; width: 44px; height: 44px; border-radius: 999px; background: var(--wf-primary); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: .78em; }
.b-prompt.is-v-bubble .b-prompt__bubble { background: var(--wf-surface); border: 1px solid var(--wb-line); border-radius: var(--wb-radius-lg); border-top-left-radius: 4px; padding: var(--wb-card-pad); line-height: 1.75; white-space: pre-line; }
.b-prompt.is-v-bubble .b-prompt__chatfoot { margin-top: 18px; padding-left: 58px; display: flex; flex-wrap: wrap; align-items: center; gap: var(--wb-gap-sm); }
.b-prompt.is-v-bubble .b-prompt__chips--light { margin-top: 0; }
.b-prompt.is-v-bubble .b-prompt__chips--light .b-prompt__chip { color: var(--wf-muted); border-color: var(--wb-line); background: var(--wf-bg); }
@media (max-width: 560px) {
  .b-prompt.is-v-bubble .b-prompt__chatfoot { padding-left: 0; }
}
`,
    },
  });

  /* ============================ 工具网格 ============================ */
  WF.defineVariants("tool-grid", {
    list: {
      name: "清单行",
      render(p) {
        const items = p.items || [];
        const rows = items.map((it) => `<div class="b-tool__row">
          <span class="b-tool__rowicon">${esc(it.icon || "•")}</span>
          <div class="b-tool__rowbody">
            <div class="b-tool__rowtitle">
              <span>${esc(it.title || "")}</span>
              ${it.tag ? `<span class="b-tool__rowtag">${esc(it.tag)}</span>` : ""}
            </div>
            ${it.desc ? `<div class="b-tool__rowdesc">${nl2br(it.desc)}</div>` : ""}
          </div>
          ${it.rating ? `<span class="b-tool__rowrating">★ ${esc(it.rating)}</span>` : ""}
        </div>`).join("");
        return `<div class="wb-inner">
          ${headHTML(p, p.align === "center")}
          <div class="b-tool__list">${rows || empty("暂无工具")}</div>
        </div>`;
      },
      css: `
.b-tool-grid.is-v-list .b-tool__list { max-width: 900px; margin: 0 auto; display: grid; }
.b-tool-grid.is-v-list .b-tool__row { display: grid; grid-template-columns: 46px 1fr auto; gap: var(--wb-gap-sm); align-items: center; padding: 18px 8px; border-bottom: 1px solid var(--wb-line); transition: background .2s var(--wb-ease); }
.b-tool-grid.is-v-list .b-tool__row:hover { background: color-mix(in srgb, var(--wf-primary) 5%, transparent); }
.b-tool-grid.is-v-list .b-tool__rowicon { font-size: 1.5em; text-align: center; }
.b-tool-grid.is-v-list .b-tool__rowtitle { display: flex; align-items: center; gap: var(--wb-gap-xs); font-weight: 700; font-size: 1.04em; }
.b-tool-grid.is-v-list .b-tool__rowtag { padding: 2px 9px; border-radius: 999px; background: var(--wf-primary-soft); color: var(--wf-primary); font-size: .7em; font-weight: 700; }
.b-tool-grid.is-v-list .b-tool__rowdesc { color: var(--wf-muted); font-size: .9em; margin-top: 5px; line-height: 1.6; }
.b-tool-grid.is-v-list .b-tool__rowrating { font-weight: 700; font-size: .9em; color: var(--wf-primary); white-space: nowrap; }
@media (max-width: 560px) {
  .b-tool-grid.is-v-list .b-tool__row { grid-template-columns: 40px 1fr; }
  .b-tool-grid.is-v-list .b-tool__rowrating { grid-column: 2; justify-self: start; }
}
`,
    },

    rank: {
      name: "排行榜",
      render(p) {
        const items = p.items || [];
        const ranked = items.map((it) => ({ it, r: parseFloat(it.rating) }))
          .sort((a, b) => (isFinite(b.r) ? b.r : -1) - (isFinite(a.r) ? a.r : -1));
        const rows = ranked.map((entry, idx) => {
          const it = entry.it;
          const r = entry.r;
          const pct = isFinite(r) ? Math.max(0, Math.min(100, Math.round((r / 5) * 100))) : 0;
          return `<div class="b-tool__rankrow">
            <span class="b-tool__rankno">${idx + 1}</span>
            <span class="b-tool__rankicon">${esc(it.icon || "•")}</span>
            <div class="b-tool__rankbody">
              <div class="b-tool__ranktitle">${esc(it.title || "")}${it.tag ? ` <span class="b-tool__rowtag">${esc(it.tag)}</span>` : ""}</div>
              ${isFinite(r) ? `<div class="wb-bar b-tool__rankbar"><span style="width:${pct}%"></span></div>` : ""}
            </div>
            ${isFinite(r) ? `<span class="b-tool__rankval">${esc(it.rating)}</span>` : ""}
          </div>`;
        }).join("");
        return `<div class="wb-inner">
          ${headHTML(p, p.align === "center")}
          <div class="b-tool__rank">${rows || empty("暂无工具")}</div>
        </div>`;
      },
      css: `
.b-tool-grid.is-v-rank .b-tool__rank { max-width: 820px; margin: 0 auto; display: grid; gap: var(--wb-gap); }
.b-tool-grid.is-v-rank .b-tool__rankrow { display: grid; grid-template-columns: 40px 40px 1fr auto; gap: var(--wb-gap-sm); align-items: center; }
.b-tool-grid.is-v-rank .b-tool__rankno { width: 30px; height: 30px; border-radius: 999px; background: var(--wf-primary-soft); color: var(--wf-primary); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: .85em; }
.b-tool-grid.is-v-rank .b-tool__rankrow:nth-child(1) .b-tool__rankno { background: var(--wf-primary); color: #fff; }
.b-tool-grid.is-v-rank .b-tool__rankicon { font-size: 1.4em; text-align: center; }
.b-tool-grid.is-v-rank .b-tool__ranktitle { font-weight: 700; font-size: 1.02em; display: flex; align-items: center; gap: var(--wb-gap-xs); }
.b-tool-grid.is-v-rank .b-tool__rowtag { padding: 2px 9px; border-radius: 999px; background: var(--wf-primary-soft); color: var(--wf-primary); font-size: .68em; font-weight: 700; }
.b-tool-grid.is-v-rank .b-tool__rankbar { margin-top: 8px; }
.b-tool-grid.is-v-rank .b-tool__rankval { font-weight: 800; color: var(--wf-primary); font-variant-numeric: tabular-nums; }
`,
    },

    tiles: {
      name: "图标墙",
      render(p) {
        const items = p.items || [];
        const tiles = items.map((it) => `<div class="wb-card is-ghost b-tool__tile">
          ${it.tag ? `<span class="b-tool__tiletag">${esc(it.tag)}</span>` : ""}
          <span class="b-tool__tileicon">${esc(it.icon || "•")}</span>
          <div class="b-tool__tiletitle">${esc(it.title || "")}</div>
          ${it.desc ? `<div class="b-tool__tiledesc">${nl2br(it.desc)}</div>` : ""}
          ${it.rating ? `<div class="b-tool__tilerating">★ ${esc(it.rating)}</div>` : ""}
        </div>`).join("");
        return `<div class="wb-inner">
          ${headHTML(p, p.align === "center")}
          <div class="wb-grid b-tool__tiles" data-cols="${esc(p.cols || 3)}">${tiles || empty("暂无工具")}</div>
        </div>`;
      },
      css: `
.b-tool-grid.is-v-tiles .b-tool__tile { position: relative; display: flex; flex-direction: column; align-items: flex-start; gap: 6px; text-align: left; }
.b-tool-grid.is-v-tiles .b-tool__tiletag { position: absolute; top: 16px; right: 16px; padding: 3px 10px; border-radius: 999px; background: var(--wf-primary-soft); color: var(--wf-primary); font-size: .72em; font-weight: 700; }
.b-tool-grid.is-v-tiles .b-tool__tileicon { font-size: 1.8em; }
.b-tool-grid.is-v-tiles .b-tool__tiletitle { font-weight: 700; font-size: 1.05em; }
.b-tool-grid.is-v-tiles .b-tool__tiledesc { color: var(--wf-muted); font-size: .9em; line-height: 1.6; }
.b-tool-grid.is-v-tiles .b-tool__tilerating { margin-top: 4px; font-weight: 700; font-size: .85em; color: var(--wf-primary); }
`,
    },
  });

  /* ============================ 折叠面板 ============================ */
  WF.defineVariants("accordion", {
    cards: {
      name: "卡片网格",
      render(p) {
        const items = p.items || [];
        const cards = items.map((it, i) => `<details class="b-acc__item b-acc__card"${delay(i)}>
          <summary class="b-acc__head">
            <span class="b-acc__idx">${num(i)}</span>
            <span class="b-acc__t">${esc(it.title || "")}</span>
            <span class="b-acc__chev">▾</span>
          </summary>
          <div class="b-acc__body">${nl2br(it.desc || "")}</div>
        </details>`).join("");
        return `<div class="wb-inner">
          ${headHTML(p, p.align === "center")}
          <div class="b-acc__grid">${cards || empty("暂无条目")}</div>
        </div>`;
      },
      css: `
.b-accordion.is-v-cards .b-acc__grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--wb-gap-sm); align-items: start; }
.b-accordion.is-v-cards .b-acc__card { background: var(--wf-bg); box-shadow: var(--wb-shadow-sm); transition: box-shadow .2s var(--wb-ease), border-color .2s var(--wb-ease); }
.b-accordion.is-v-cards .b-acc__card[open] { box-shadow: var(--wb-shadow-md); border-color: color-mix(in srgb, var(--wf-primary) 26%, var(--wb-line)); }
.b-accordion.is-v-cards .b-acc__head { gap: var(--wb-gap-sm); }
.b-accordion.is-v-cards .b-acc__idx { flex: none; width: 30px; height: 30px; border-radius: 9px; background: var(--wf-primary-soft); color: var(--wf-primary); display: inline-flex; align-items: center; justify-content: center; font-size: .78em; font-weight: 800; }
.b-accordion.is-v-cards .b-acc__t { flex: 1; }
@media (max-width: 560px) {
  .b-accordion.is-v-cards .b-acc__grid { grid-template-columns: 1fr; }
}
`,
    },

    numbered: {
      name: "编号序列",
      render(p) {
        const items = p.items || [];
        const rows = items.map((it, i) => `<details class="b-acc__numitem"${delay(i)}>
          <summary class="b-acc__head">
            <span class="b-acc__numbadge">${num(i)}</span>
            <span class="b-acc__t">${esc(it.title || "")}</span>
            <span class="b-acc__chev">▾</span>
          </summary>
          <div class="b-acc__body">${nl2br(it.desc || "")}</div>
        </details>`).join("");
        return `<div class="wb-inner">
          ${headHTML(p, p.align === "center")}
          <div class="b-acc__num">${rows || empty("暂无条目")}</div>
        </div>`;
      },
      css: `
.b-accordion.is-v-numbered .b-acc__num { max-width: 820px; margin: 0 auto; display: grid; }
.b-accordion.is-v-numbered .b-acc__numitem { border-bottom: 1px solid var(--wb-line); }
.b-accordion.is-v-numbered .b-acc__head { padding: 20px 4px; gap: var(--wb-gap-sm); }
.b-accordion.is-v-numbered .b-acc__numbadge { flex: none; width: 38px; height: 38px; border-radius: 999px; background: var(--wf-primary); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: var(--wf-fs-num); font-weight: 800; }
.b-accordion.is-v-numbered .b-acc__t { flex: 1; }
.b-accordion.is-v-numbered .b-acc__body { padding: 0 4px 22px 54px; }
.b-accordion.is-v-numbered .b-acc__numitem[open] .b-acc__chev { transform: rotate(180deg); }
`,
    },

    split: {
      name: "左题右答",
      render(p) {
        const items = p.items || [];
        const rows = items.map((it, i) => `<details class="b-acc__plainitem"${delay(i)}>
          <summary class="b-acc__head">
            <span class="b-acc__t">${esc(it.title || "")}</span>
            <span class="b-acc__chev">▾</span>
          </summary>
          <div class="b-acc__body">${nl2br(it.desc || "")}</div>
        </details>`).join("");
        return `<div class="wb-inner"><div class="wb-split2 b-acc__split">
          ${headHTML(p, false)}
          <div class="b-acc__list b-acc__plain">${rows || empty("暂无条目")}</div>
        </div></div>`;
      },
      css: `
.b-accordion.is-v-split .wb-head { margin-bottom: 0; }
.b-accordion.is-v-split .b-acc__plain { max-width: none; margin: 0; gap: 0; }
.b-accordion.is-v-split .b-acc__plainitem { border-bottom: 1px solid var(--wb-line); }
.b-accordion.is-v-split .b-acc__plainitem .b-acc__head { padding: 18px 2px; }
.b-accordion.is-v-split .b-acc__plainitem .b-acc__body { padding: 0 2px 20px; }
.b-accordion.is-v-split .b-acc__plainitem[open] .b-acc__t { color: var(--wf-primary); }
.b-accordion.is-v-split .b-acc__plainitem[open] .b-acc__chev { transform: rotate(180deg); }
`,
    },
  });

  /* ============================ 竖版卡片 ============================ */
  WF.defineVariants("portrait", {
    cover: {
      name: "整图覆盖",
      render(p, ctx) {
        const items = p.items || [];
        const cards = items.map((it) => `<div class="b-portrait__cover">
          <div class="wb-media b-portrait__covermedia" data-ratio="9x16">
            ${imgOrPh(it.image, it.title || "图片", "", ctx && ctx.lazy)}
            <div class="b-portrait__coverbody">
              <div class="b-portrait__covert">${esc(it.title || "")}</div>
              ${it.desc ? `<div class="b-portrait__coverd">${esc(it.desc)}</div>` : ""}
            </div>
          </div>
        </div>`).join("");
        return `<div class="wb-inner">
          ${headHTML(p, p.align === "center")}
          <div class="wb-grid b-portrait__covers" data-cols="${esc(p.cols || 4)}">${cards || empty("暂无卡片")}</div>
        </div>`;
      },
      css: `
.b-portrait.is-v-cover .b-portrait__covermedia { position: relative; }
.b-portrait.is-v-cover .b-portrait__coverbody { position: absolute; left: 0; right: 0; bottom: 0; padding: 40px 16px 16px; background: linear-gradient(to top, rgba(2, 6, 23, .82), rgba(2, 6, 23, 0)); color: #fff; }
.b-portrait.is-v-cover .b-portrait__covert { font-weight: 800; font-size: 1.02em; }
.b-portrait.is-v-cover .b-portrait__coverd { font-size: .85em; opacity: .85; margin-top: 4px; line-height: 1.5; }
`,
    },

    rail: {
      name: "横向滑轨",
      render(p, ctx) {
        const items = p.items || [];
        const cards = items.map((it) => `<div class="b-portrait__railcard">
          <div class="wb-media b-portrait__railimg" data-ratio="4x3">${imgOrPh(it.image, it.title || "图片", "", ctx && ctx.lazy)}</div>
          <div class="b-portrait__t">${esc(it.title || "")}</div>
          ${it.desc ? `<div class="b-portrait__d">${esc(it.desc)}</div>` : ""}
        </div>`).join("");
        return `<div class="wb-inner">
          ${headHTML(p, p.align === "center")}
          ${items.length ? `<div class="wb-rail b-portrait__rail">${cards}</div>` : empty("暂无卡片")}
        </div>`;
      },
      css: `
.b-portrait.is-v-rail .b-portrait__rail { grid-auto-columns: minmax(240px, 1fr); }
.b-portrait.is-v-rail .b-portrait__railcard { background: var(--wf-bg); border: 1px solid var(--wb-line); border-radius: var(--wb-radius-lg); overflow: hidden; box-shadow: var(--wb-shadow-sm); transition: transform .25s var(--wb-ease), box-shadow .25s var(--wb-ease); }
.b-portrait.is-v-rail .b-portrait__railcard:hover { transform: translateY(-4px); box-shadow: var(--wb-shadow-md); }
.b-portrait.is-v-rail .b-portrait__railimg { border-radius: 0; }
.b-portrait.is-v-rail .b-portrait__t { padding: 14px 16px 0; }
.b-portrait.is-v-rail .b-portrait__d { padding: 6px 16px 16px; }
`,
    },

    circle: {
      name: "圆形头像",
      render(p, ctx) {
        const items = p.items || [];
        const cards = items.map((it) => `<div class="b-portrait__circ">
          <div class="wb-avatar b-portrait__circimg">${imgOrPh(it.image, it.title || "图", "", ctx && ctx.lazy)}</div>
          <div class="b-portrait__t">${esc(it.title || "")}</div>
          ${it.desc ? `<div class="b-portrait__d">${esc(it.desc)}</div>` : ""}
        </div>`).join("");
        return `<div class="wb-inner">
          ${headHTML(p, p.align === "center")}
          <div class="wb-grid b-portrait__circles" data-cols="${esc(p.cols || 4)}">${cards || empty("暂无卡片")}</div>
        </div>`;
      },
      css: `
.b-portrait.is-v-circle .b-portrait__circ { display: flex; flex-direction: column; align-items: center; text-align: center; }
.b-portrait.is-v-circle .b-portrait__circimg { width: 116px; height: 116px; }
.b-portrait.is-v-circle .b-portrait__circimg .wf-ph { min-height: 0; height: 100%; border-radius: 999px; }
.b-portrait.is-v-circle .b-portrait__t { padding: 14px 0 0; }
.b-portrait.is-v-circle .b-portrait__d { padding-left: 0; padding-right: 0; }
@media (max-width: 560px) {
  .b-portrait.is-v-circle .b-portrait__circimg { width: 96px; height: 96px; }
}
`,
    },
  });
})(window.WF);
