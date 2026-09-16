/* ============================================================
 * WebsFlow · 渲染引擎 (render.js)
 *
 * 理念来源 — WordPress 区块 + Elementor 渲染管线:
 *   模块 = 内容(props) × 渲染器(HTML) × 形态上下文(mode)。
 *   同一份 JSON 内容,经由不同形态适配器输出官网 / H5 / PPT / 互动故事。
 *   画布预览与导出共用同一条渲染路径 —— 所见即所得。
 * ============================================================ */
window.WF = window.WF || {};

(function (WF) {
  "use strict";

  // ---------- 工具 ----------
  const esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  WF.esc = esc;

  const nl2br = (s) => esc(s); // 配合 CSS white-space: pre-line,无需替换 <br>
  const delay = (i) => ` style="--wf-delay:${i * 70}ms"`;
  const colsVar = (n) => ` style="--wb-cols:${esc(n || 3)}"`;
  const imgOrPh = (src, label, attrs) =>
    src ? `<img src="${esc(src)}" ${attrs || ""} alt="">` : `<div class="wf-ph" data-label="${esc(label || "图片")}"></div>`;

  // 视频链接 → iframe 嵌入地址
  WF.videoEmbedUrl = function (url) {
    const u = String(url || "").trim();
    if (!u) return "";
    if (u.includes("<iframe")) return u;
    let m;
    if ((m = u.match(/bilibili\.com\/video\/(BV[\w]+)/))) return `https://player.bilibili.com/player.html?bvid=${m[1]}&autoplay=0`;
    if ((m = u.match(/youtube(?:-nocookie)?\.com\/watch\?(?:.*&)?v=([\w-]+)/)) || (m = u.match(/youtu\.be\/([\w-]+)/)))
      return `https://www.youtube-nocookie.com/embed/${m[1]}`;
    if ((m = u.match(/vimeo\.com\/(\d+)/))) return `https://player.vimeo.com/video/${m[1]}`;
    return u;
  };

  WF.gradCss = (key) => (WF.Gradients && WF.Gradients[key]) || WF.Gradients.indigo;

  // ---------- 语义锚点:每类模块的第一个实例获得稳定 id,导航可跳转 ----------
  const SEMANTIC = { features: "features", testimonials: "testimonials", pricing: "pricing", faq: "faq", cta: "cta", gallery: "gallery", timeline: "timeline" };
  function buildAnchors(blocks) {
    const used = {};
    return blocks.map((b) => {
      let id = "";
      if (SEMANTIC[b.type] && !used[SEMANTIC[b.type]]) { id = SEMANTIC[b.type]; used[id] = true; }
      return id || "sec-" + b.id;
    });
  }

  function headHTML(p, center) {
    let h = `<div class="wb-head${center ? " is-center" : ""}"${center ? ' data-reveal-child="1"' : ""}>`;
    if (p.eyebrow) h += `<span class="wb-eyebrow">${esc(p.eyebrow)}</span>`;
    if (p.title) h += `<h2 class="wb-title">${esc(p.title)}</h2>`;
    if (p.subtitle) h += `<p class="wb-subtitle">${nl2br(p.subtitle)}</p>`;
    return h + `</div>`;
  }

  const btn = (text, link, cls) => text ? `<a class="wf-btn ${cls || "is-primary"}" href="${esc(link || "#")}">${esc(text)}</a>` : "";

  // ============================================================
  //  模块渲染器(输出 section 内部 HTML)
  // ============================================================
  const R = {

    nav(p, ctx) {
      const links = (p.links || []).map((l) => {
        let href = l.href || "";
        if (!href) href = ctx.resolveAnchor ? (ctx.resolveAnchor(l.label) || "#") : "#";
        return `<a href="${esc(href)}">${esc(l.label)}</a>`;
      }).join("");
      return `<div class="b-nav__inner">
        <span class="b-nav__brand"><span class="b-nav__logo">${esc((p.brand || "W").slice(0, 1))}</span>${esc(p.brand)}</span>
        <nav class="b-nav__links">${links}</nav>
        ${p.btnText ? `<a class="wf-btn is-primary b-nav__cta" href="${esc(p.btnLink || "#")}">${esc(p.btnText)}</a>` : ""}
      </div>`;
    },

    hero(p, ctx) {
      const dark = p.bgType === "gradient" && p.gradient === "night";
      let bg = "";
      if (p.bgType === "gradient") bg = ` style="--wb-hero-bg:${WF.gradCss(p.gradient)}"`;
      else if (p.bgType === "image" && p.image) bg = ` style="--wb-hero-bg:url('${esc(p.image)}')"`;
      const bgCls = p.bgType === "image" && p.image ? " is-image" : "";
      return `<div class="b-hero__bg${bgCls}"${bg}></div>
      <div class="b-hero__inner">
        ${p.badge ? `<span class="b-hero__badge">${esc(p.badge)}</span>` : ""}
        <h1 class="b-hero__title">${esc(p.title)}</h1>
        ${p.subtitle ? `<p class="b-hero__subtitle">${nl2br(p.subtitle)}</p>` : ""}
        <div class="wf-btn-group b-hero__btns">
          ${p.bgType === "image" && p.image ? btn(p.btnText, p.btnLink, "is-light") : btn(p.btnText, p.btnLink, dark ? "is-light" : "is-primary")}
          ${p.bgType === "image" && p.image ? btn(p.btn2Text, p.btn2Link, "is-outline-light") : btn(p.btn2Text, p.btn2Link, "is-ghost")}
        </div>
      </div>`;
    },

    text(p) {
      return `<div class="wb-inner">
        ${p.title ? `<h2 class="b-text__title">${esc(p.title)}</h2>` : ""}
        ${p.body ? `<p class="b-text__body">${nl2br(p.body)}</p>` : ""}
      </div>`;
    },

    split(p) {
      return `<div class="wb-inner"><div class="b-split__grid">
        <div class="b-split__media">${imgOrPh(p.image, "图片", 'loading="lazy"')}</div>
        <div>
          <h2 class="b-split__title">${esc(p.title)}</h2>
          <p class="b-split__body">${nl2br(p.body)}</p>
          ${p.btnText ? `<div class="b-split__btn">${btn(p.btnText, p.btnLink)}</div>` : ""}
        </div>
      </div></div>`;
    },

    features(p, ctx) {
      const items = (p.items || []).map((it, i) => `<div class="b-feature"${ctx.anim ? delay(i) : ""}>
        <div class="b-feature__icon">${esc(it.icon || "✦")}</div>
        <div class="b-feature__title">${esc(it.title)}</div>
        <p class="b-feature__desc">${nl2br(it.desc)}</p>
      </div>`).join("");
      return `<div class="wb-inner">${headHTML(p, p.align === "center")}
        <div class="b-features__grid"${colsVar(p.cols)}>${items}</div>
      </div>`;
    },

    gallery(p, ctx) {
      const items = (p.items || []).map((it, i) => `<div class="b-gallery__item"${ctx.anim ? delay(i) : ""}>
        ${imgOrPh(it.image, "图片", 'loading="lazy"')}
        ${it.caption ? `<span class="b-gallery__cap">${esc(it.caption)}</span>` : ""}
      </div>`).join("");
      return `<div class="wb-inner">${headHTML(p, p.align === "center")}
        <div class="b-gallery__grid"${colsVar(p.cols)}>${items}</div>
      </div>`;
    },

    stats(p, ctx) {
      const items = (p.items || []).map((it, i) => `<div class="b-stat"${ctx.anim ? delay(i) : ""}>
        <div class="b-stat__value">${esc(it.value)}<span style="font-size:.55em">${esc(it.suffix || "")}</span></div>
        <div class="b-stat__label">${esc(it.label)}</div>
      </div>`).join("");
      return `<div class="wb-inner">
        <div class="b-stats__grid"${colsVar(p.cols)}>${items}</div>
      </div>`;
    },

    timeline(p, ctx) {
      const items = (p.items || []).map((it, i) => `<div class="b-tl__item"${ctx.anim ? delay(i) : ""}>
        <span class="b-tl__dot"></span>
        ${it.time ? `<div class="b-tl__time">${esc(it.time)}</div>` : ""}
        <div class="b-tl__title">${esc(it.title)}</div>
        ${it.desc ? `<p class="b-tl__desc">${nl2br(it.desc)}</p>` : ""}
      </div>`).join("");
      return `<div class="wb-inner">${headHTML(p, true)}
        <div class="b-timeline__list">${items}</div>
      </div>`;
    },

    pricing(p, ctx) {
      const items = (p.items || []).map((it, i) => {
        const feats = String(it.feats || "").split("\n").filter((x) => x.trim()).map((x) => `<li>${esc(x.trim())}</li>`).join("");
        return `<div class="b-price${it.featured ? " is-featured" : ""}"${ctx.anim ? delay(i) : ""}>
          ${it.badge ? `<span class="b-price__badge">${esc(it.badge)}</span>` : ""}
          <div class="b-price__name">${esc(it.name)}</div>
          <div class="b-price__amount">${esc(it.price)}<span class="b-price__unit">${esc(it.unit)}</span></div>
          ${it.desc ? `<p class="b-price__desc">${esc(it.desc)}</p>` : ""}
          <ul class="b-price__feats">${feats}</ul>
          ${it.btnText ? `<a class="wf-btn ${it.featured ? "is-primary" : "is-ghost"} b-price__btn" href="#">${esc(it.btnText)}</a>` : ""}
        </div>`;
      }).join("");
      return `<div class="wb-inner">${headHTML(p, p.align === "center")}
        <div class="b-pricing__grid"${colsVar(p.cols)}>${items}</div>
      </div>`;
    },

    testimonials(p, ctx) {
      const items = (p.items || []).map((it, i) => `<div class="b-testi"${ctx.anim ? delay(i) : ""}>
        <p class="b-testi__quote">${esc(it.quote)}</p>
        <div class="b-testi__who">
          <span class="b-testi__avatar">${it.avatar ? `<img src="${esc(it.avatar)}" alt="">` : esc((it.name || "友").slice(0, 1))}</span>
          <div><div class="b-testi__name">${esc(it.name)}</div><div class="b-testi__role">${esc(it.role)}</div></div>
        </div>
      </div>`).join("");
      return `<div class="wb-inner">${headHTML(p, p.align === "center")}
        <div class="b-testi__grid"${colsVar(p.cols)}>${items}</div>
      </div>`;
    },

    faq(p) {
      const items = (p.items || []).map((it, i) => `<div class="b-faq__item">
        <button class="b-faq__q" type="button">${esc(it.q)}</button>
        <div class="b-faq__a"><div class="b-faq__a-inner">${nl2br(it.a)}</div></div>
      </div>`).join("");
      return `<div class="wb-inner">${headHTML(p, p.align === "center")}
        <div class="b-faq__list">${items}</div>
      </div>`;
    },

    cta(p) {
      const cls = p.style === "gradient" ? " is-gradient" : p.style === "surface" ? " is-surface" : "";
      const lightBtn = p.style !== "surface";
      return `<div class="wb-inner">
        <div class="b-cta__panel${cls}">
          <div class="b-cta__title">${esc(p.title)}</div>
          ${p.subtitle ? `<p class="b-cta__subtitle">${nl2br(p.subtitle)}</p>` : ""}
          <div class="wf-btn-group b-cta__btns" style="justify-content:center">
            ${p.style === "surface" ? btn(p.btnText, p.btnLink) : btn(p.btnText, p.btnLink, "is-light")}
          </div>
        </div>
      </div>`;
    },

    video(p) {
      const embed = WF.videoEmbedUrl(p.url);
      const inner = embed && !embed.includes("<iframe")
        ? `<iframe src="${esc(embed)}" loading="lazy" allowfullscreen allow="encrypted-media; fullscreen"></iframe>`
        : embed ? embed : `<div class="b-video__tip">🎞️ 在右侧面板粘贴视频链接(B 站 / YouTube / Vimeo)</div>`;
      return `<div class="wb-inner">${p.title ? headHTML(p, true) : ""}
        <div class="b-video__frame">${inner}</div>
      </div>`;
    },

    tabs(p) {
      const items = p.items || [];
      const bar = items.map((it, i) => `<button class="b-tabs__tab${i === 0 ? " is-active" : ""}" data-tab="${i}" type="button">${esc(it.tab || "页签 " + (i + 1))}</button>`).join("");
      const panels = items.map((it, i) => `<div class="b-tabs__panel${i === 0 ? " is-active" : ""}">
        ${it.image ? `<div class="b-tabs__media"><img src="${esc(it.image)}" loading="lazy" alt=""></div>` : ""}
        ${it.title ? `<div class="b-tabs__title">${esc(it.title)}</div>` : ""}
        ${it.body ? `<p class="b-tabs__body">${nl2br(it.body)}</p>` : ""}
      </div>`).join("");
      return `<div class="wb-inner">
        <div class="b-tabs__bar">${bar}</div>${panels}
      </div>`;
    },

    countdown(p) {
      return `<div class="wb-inner"><div class="b-countdown__panel">
        ${p.title ? `<div class="b-countdown__title">${esc(p.title)}</div>` : ""}
        <div class="b-countdown__digits" data-target="${esc(p.target || "")}">
          <div class="b-countdown__cell"><div class="b-countdown__num" data-cd="d">--</div><div class="b-countdown__unit">天</div></div>
          <div class="b-countdown__cell"><div class="b-countdown__num" data-cd="h">--</div><div class="b-countdown__unit">时</div></div>
          <div class="b-countdown__cell"><div class="b-countdown__num" data-cd="m">--</div><div class="b-countdown__unit">分</div></div>
          <div class="b-countdown__cell"><div class="b-countdown__num" data-cd="s">--</div><div class="b-countdown__unit">秒</div></div>
        </div>
        ${p.note ? `<p class="b-countdown__note">${esc(p.note)}</p>` : ""}
      </div></div>`;
    },

    quiz(p) {
      const letters = "ABCD";
      const opts = (p.options || []).map((o, i) =>
        `<button class="b-quiz__opt" type="button" data-correct="${o.correct ? "1" : "0"}"><span class="b-quiz__key">${letters[i] || "•"}</span>${esc(o.text)}</button>`).join("");
      return `<div class="wb-inner"><div class="b-quiz__panel b-quiz">
        <div class="b-quiz__q">${nl2br(p.question)}</div>
        <div class="b-quiz__opts">${opts}</div>
        ${p.explanation ? `<div class="b-quiz__explain">💡 ${nl2br(p.explanation)}</div>` : ""}
      </div></div>`;
    },

    hotspot(p) {
      const dots = (p.items || []).map((it) =>
        `<button class="b-hotspot__dot" type="button" style="left:${esc(it.x)}%;top:${esc(it.y)}%">●</button>
         <div class="b-hotspot__tip"><strong>${esc(it.label)}</strong>${nl2br(it.desc)}</div>`).join("");
      return `<div class="wb-inner">
        <div class="b-hotspot__stage">${p.image ? `<img src="${esc(p.image)}" alt="">` : `<div class="wf-ph" data-label="放置一张产品图"></div>`}${dots}</div>
      </div>`;
    },

    footer(p) {
      const links = (p.links || []).map((l) => `<a href="${esc(l.href || "#")}">${esc(l.label)}</a>`).join("");
      return `<div class="b-footer__inner">
        <div class="b-footer__grid">
          <div><div class="b-footer__brand">${esc(p.brand)}</div>${p.desc ? `<p class="b-footer__desc">${nl2br(p.desc)}</p>` : ""}</div>
          <nav class="b-footer__links">${links}</nav>
        </div>
        <div class="b-footer__copy"><span>${esc(p.copyright)}</span><span>由 WebsFlow 魔块搭建</span></div>
      </div>`;
    },

    /* ---------- PPT 幻灯 ---------- */
    "slide-title"(p) {
      return `${p.badge ? `<span class="b-s-title__badge">${esc(p.badge)}</span>` : ""}
        <h1 class="wf-slide__title">${esc(p.title)}</h1>
        ${p.subtitle ? `<p class="wf-slide__subtitle">${nl2br(p.subtitle)}</p>` : ""}
        <div class="b-s-title__meta">${p.speaker ? `<span>${esc(p.speaker)}</span>` : ""}${p.date ? `<span>${esc(p.date)}</span>` : ""}</div>`;
    },
    "slide-bullets"(p) {
      const items = (p.items || []).map((it, i) => `<div class="b-s-bullet">
        <span class="b-s-bullet__no">${i + 1}</span>
        <div><div class="b-s-bullet__t">${esc(it.title)}</div>${it.desc ? `<div class="b-s-bullet__d">${esc(it.desc)}</div>` : ""}</div>
      </div>`).join("");
      return `${p.kicker ? `<div class="wf-slide__kicker">${esc(p.kicker)}</div>` : ""}
        ${p.title ? `<h2 class="wf-slide__title">${esc(p.title)}</h2>` : ""}
        <div class="b-s-bullets__list">${items}</div>`;
    },
    "slide-quote"(p) {
      return `<div class="b-s-quote__mark">“</div>
        <p class="b-s-quote__text">${nl2br(p.quote)}</p>
        ${p.author ? `<div class="b-s-quote__author">${esc(p.author)}</div>` : ""}`;
    },
    "slide-end"(p) {
      return `<h1 class="wf-slide__title">${esc(p.title)}</h1>
        ${p.subtitle ? `<p class="wf-slide__subtitle">${nl2br(p.subtitle)}</p>` : ""}
        ${p.contact ? `<p class="b-s-end__contact">${nl2br(p.contact)}</p>` : ""}
        ${p.qr ? `<div class="b-s-end__qr"><img src="${esc(p.qr)}" alt="二维码"></div>` : ""}`;
    },
  };

  // ============================================================
  //  页面装配(形态适配)
  // ============================================================

  WF.renderProject = function (project, opts) {
    opts = opts || {};
    const edit = opts.context === "edit";
    const mode = project.mode || "site";
    const blocks = project.blocks || [];
    const anchors = buildAnchors(blocks);
    const semTypeCount = {};

    // 导航锚点解析:按模块标题/类型猜测
    const resolveAnchor = (label) => {
      if (!label) return "";
      for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        const def = WF.Blocks[b.type];
        const text = (def && def.summary && def.summary(b.props) || "") + b.type;
        if (label && (text.includes(label) || label.includes(text) && text.length > 1)) return "#" + anchors[i];
      }
      return "";
    };
    const ctx = { mode, context: opts.context, project, anim: !edit && mode !== "ppt", resolveAnchor };

    const sections = [];
    blocks.forEach((b, i) => {
      const def = WF.Blocks[b.type];
      if (!def) return;
      const renderer = R[b.type];
      if (!renderer) return;
      const st = b.style || {};
      const isSlide = mode === "ppt";
      const cls = ["wf-block"];
      if (isSlide) cls.push("wf-slide", slideClass(b.type));
      else cls.push("b-" + b.type);
      let attrs = ` class="${cls.join(" ")}" id="${anchors[i]}"`;
      if (st.bg) attrs += ` style="background:${esc(st.bg)}"`;
      if (!isSlide && st.padding && st.padding !== "normal") attrs += ` data-pad="${esc(st.padding)}"`;
      // 入场动画(仅导出态)
      if (ctx.anim && !b.hidden && b.type !== "nav" && (st.anim || "up") !== "none") {
        attrs += ` data-reveal="${esc(st.anim || "up")}"`;
      }
      const inner = renderer(b.props, ctx);
      if (edit) {
        const hiddenCls = b.hidden ? " is-hidden-in-edit" : "";
        const name = def.name;
        sections.push(
          `<${isSlide ? "section" : "section"}${attrs} data-wf-id="${b.id}"${hiddenCls}>` +
          `<div class="wf-blocktools">` +
          `<span class="wf-bt-label" draggable="true" data-wf-drag="${b.id}" title="拖动排序">⠿ ${name}</span>` +
          `<button data-wf-act="up" title="上移">↑</button>` +
          `<button data-wf-act="down" title="下移">↓</button>` +
          `<button data-wf-act="dup" title="复制">⧉</button>` +
          `<button data-wf-act="hide" title="${b.hidden ? "显示" : "隐藏"}">${b.hidden ? "👁" : "🙈"}</button>` +
          `<button data-wf-act="del" title="删除">✕</button>` +
          `</div>${inner}</section>`
        );
      } else {
        if (b.hidden) return;
        sections.push(`<section${attrs}>${inner}</section>`);
      }
    });

    // padding:由 data-pad 属性配合 runtime.css 的属性选择器生效
    const html = sections.join("\n");

    const g = project.global || {};
    const theme = WF.themeVars(project.theme);

    if (mode === "ppt") {
      const total = blocks.length;
      let deck;
      if (edit) {
        deck = `<div class="wf-deck">${html}</div>`;
      } else {
        deck = `<div class="wf-deck is-live"><div class="wf-slide-stage">${html}</div></div>
        <div class="wf-deck__bar">
          <button data-deck="prev" title="上一页">‹</button>
          <div class="wf-deck__dots">${blocks.map((_, i) => `<button class="wf-deck__dot${i === 0 ? " is-active" : ""}" data-deck="dot" data-i="${i}"></button>`).join("")}</div>
          <button data-deck="next" title="下一页">›</button>
          <span data-deck="counter">1 / ${total}</span>
          <button data-deck="full" title="全屏">⛶</button>
        </div>
        <div class="wf-deck__hint">← → 翻页 · F 全屏</div>`;
      }
      return `<div class="wf-root" style="${theme}">${deck}</div>`;
    }

    // site / h5 / story
    const h5bar = mode === "h5" && g.h5 && g.h5.ctaText
      ? `<div class="wf-h5-ctabar"><a class="wf-btn is-primary" href="${esc(g.h5.ctaLink || "#")}">${esc(g.h5.ctaText)}</a></div>`
      : "";
    const hasBar = !!h5bar;
    const progress = mode === "story" && !edit ? `<div class="wf-progress"></div>` : "";
    const snap = mode === "story" && !edit && g.story && g.story.snap;
    const rootCls = ["wf-root", "wf-mode-" + mode];
    if (snap) rootCls.push("is-snap");
    const pageCls = ["wf-page"];
    if (hasBar) pageCls.push("has-ctabar");

    return `<div class="${rootCls.join(" ")}" style="${theme}">
      ${progress}
      <div class="${pageCls.join(" ")}">
      ${html}
      ${h5bar}
      </div>
    </div>`;
  };

  function slideClass(type) {
    return { "slide-title": "b-s-title", "slide-bullets": "b-s-bullets", "slide-quote": "b-s-quote", "slide-end": "b-s-end" }[type] || "";
  }

  // ============================================================
  //  交互运行时:画布与导出页共用(导出时以源码字符串内联)
  // ============================================================
  WF.runtimeFn = function wfRuntime(root) {
    root = root || document;

    // 入场动画(滚动检测,不依赖 IntersectionObserver,兼容一切嵌入环境)
    var revealEls = Array.prototype.slice.call(root.querySelectorAll("[data-reveal]"));
    if (revealEls.length) {
      var revealCheck = function () {
        var vh = window.innerHeight || document.documentElement.clientHeight;
        revealEls = revealEls.filter(function (el) {
          var r = el.getBoundingClientRect();
          if (r.top < vh * 0.92 && r.bottom > 0) { el.classList.add("is-in"); return false; }
          return true;
        });
      };
      var revealTid = null;
      var revealOnScroll = function () {
        if (revealTid) return;
        revealTid = setTimeout(function () { revealTid = null; revealCheck(); }, 60);
      };
      window.addEventListener("scroll", revealOnScroll, { passive: true });
      window.addEventListener("resize", revealOnScroll);
      var revealScroller = root.querySelector(".wf-mode-story.is-snap .wf-page");
      if (revealScroller) revealScroller.addEventListener("scroll", revealOnScroll, { passive: true });
      revealCheck();
    }

    // FAQ 手风琴
    root.querySelectorAll(".b-faq__item").forEach(function (item) {
      if (item.dataset.wfInit) return; item.dataset.wfInit = "1";
      var q = item.querySelector(".b-faq__q"), a = item.querySelector(".b-faq__a");
      if (!q || !a) return;
      q.addEventListener("click", function () {
        var open = item.classList.toggle("is-open");
        a.style.maxHeight = open ? a.scrollHeight + "px" : "0px";
      });
    });

    // 选项卡
    root.querySelectorAll(".b-tabs").forEach(function (wrap) {
      if (wrap.dataset.wfInit) return; wrap.dataset.wfInit = "1";
      var bars = wrap.querySelectorAll(".b-tabs__tab"), panels = wrap.querySelectorAll(".b-tabs__panel");
      bars.forEach(function (tab) {
        tab.addEventListener("click", function () {
          var i = tab.getAttribute("data-tab");
          bars.forEach(function (t) { t.classList.remove("is-active"); });
          panels.forEach(function (p) { p.classList.remove("is-active"); });
          tab.classList.add("is-active");
          if (panels[i]) panels[i].classList.add("is-active");
        });
      });
    });

    // 互动问答
    root.querySelectorAll(".b-quiz").forEach(function (quiz) {
      if (quiz.dataset.wfInit) return; quiz.dataset.wfInit = "1";
      quiz.querySelectorAll(".b-quiz__opt").forEach(function (opt) {
        opt.addEventListener("click", function () {
          if (quiz.classList.contains("is-done")) return;
          quiz.classList.add("is-done");
          opt.classList.add(opt.getAttribute("data-correct") === "1" ? "is-right" : "is-wrong");
          quiz.querySelectorAll('.b-quiz__opt[data-correct="1"]').forEach(function (o) { o.classList.add("is-right"); });
        });
      });
    });

    // 图片热点
    root.querySelectorAll(".b-hotspot__dot").forEach(function (dot) {
      if (dot.dataset.wfInit) return; dot.dataset.wfInit = "1";
      dot.addEventListener("click", function (e) {
        e.stopPropagation();
        var open = dot.classList.contains("is-open");
        dot.parentElement.querySelectorAll(".b-hotspot__dot").forEach(function (d) { d.classList.remove("is-open"); });
        if (!open) dot.classList.add("is-open");
      });
    });

    // 倒计时
    root.querySelectorAll(".b-countdown__digits").forEach(function (box) {
      if (box.dataset.wfInit) return; box.dataset.wfInit = "1";
      var target = new Date(box.getAttribute("data-target") || "").getTime();
      if (!target || isNaN(target)) return;
      var nums = {
        d: box.querySelector('[data-cd="d"]'), h: box.querySelector('[data-cd="h"]'),
        m: box.querySelector('[data-cd="m"]'), s: box.querySelector('[data-cd="s"]'),
      };
      function pad(n) { return (n < 10 ? "0" : "") + n; }
      function tick() {
        var diff = Math.max(0, target - Date.now());
        var s = Math.floor(diff / 1000);
        nums.d.textContent = pad(Math.floor(s / 86400));
        nums.h.textContent = pad(Math.floor(s % 86400 / 3600));
        nums.m.textContent = pad(Math.floor(s % 3600 / 60));
        nums.s.textContent = pad(s % 60);
      }
      tick();
      root.__wfTimers = root.__wfTimers || [];
      root.__wfTimers.push(setInterval(tick, 1000));
    });

    // 阅读进度条(互动故事)
    var progress = root.querySelector(".wf-progress");
    if (progress && !progress.dataset.wfInit) {
      progress.dataset.wfInit = "1";
      var scroller = root.querySelector(".wf-mode-story.is-snap .wf-page") || null;
      var src = scroller || window;
      src.addEventListener("scroll", function () {
        var el = scroller || document.documentElement;
        var max = (scroller ? el.scrollHeight - el.clientHeight : el.scrollHeight - window.innerHeight) || 1;
        var pos = scroller ? el.scrollTop : window.scrollY;
        progress.style.width = Math.min(100, pos / max * 100) + "%";
      }, { passive: true });
    }

    // PPT 放映
    var deck = root.querySelector(".wf-deck.is-live");
    if (deck && !deck.dataset.wfInit) {
      deck.dataset.wfInit = "1";
      var slides = Array.prototype.slice.call(deck.querySelectorAll(".wf-slide"));
      var dots = Array.prototype.slice.call(deck.querySelectorAll(".wf-deck__dot"));
      var counter = deck.parentElement.querySelector("[data-deck=counter]") || document.querySelector("[data-deck=counter]");
      var cur = 0;
      function go(i) {
        cur = Math.max(0, Math.min(slides.length - 1, i));
        slides.forEach(function (s, j) { s.classList.toggle("is-active", j === cur); });
        dots.forEach(function (d, j) { d.classList.toggle("is-active", j === cur); });
        if (counter) counter.textContent = (cur + 1) + " / " + slides.length;
        var hash = "#p" + (cur + 1);
        if (location.hash !== hash) history.replaceState(null, "", hash);
      }
      deck.parentElement.querySelector('[data-deck="prev"]').addEventListener("click", function () { go(cur - 1); });
      deck.parentElement.querySelector('[data-deck="next"]').addEventListener("click", function () { go(cur + 1); });
      deck.parentElement.querySelector('[data-deck="full"]').addEventListener("click", function () {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
      });
      dots.forEach(function (d) {
        d.addEventListener("click", function () { go(parseInt(d.getAttribute("data-i"), 10)); });
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " " || e.key === "PageDown") { e.preventDefault(); go(cur + 1); }
        else if (e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "PageUp") { e.preventDefault(); go(cur - 1); }
        else if (e.key === "Home") go(0);
        else if (e.key === "End") go(slides.length - 1);
        else if (e.key === "f" || e.key === "F") deck.parentElement.querySelector('[data-deck="full"]').click();
      });
      var m = location.hash.match(/^#p(\d+)$/);
      go(m ? parseInt(m[1], 10) - 1 : 0);
    }

    // 锚点平滑滚动
    root.querySelectorAll('a[href^="#"]').forEach(function (a) {
      if (a.dataset.wfInitAnchor) return; a.dataset.wfInitAnchor = "1";
      a.addEventListener("click", function (e) {
        var id = a.getAttribute("href").slice(1);
        if (!id) return;
        var t = document.getElementById(id);
        if (t) {
          e.preventDefault();
          var scroller = root.querySelector(".wf-mode-story.is-snap .wf-page");
          if (scroller && scroller.contains(t)) scroller.scrollTo({ top: t.offsetTop, behavior: "smooth" });
          else t.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });
  };
})(window.WF);
