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
  let wfUidSeq = 0;
  const esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  WF.esc = esc;

  const nl2br = (s) => esc(s); // 配合 CSS white-space: pre-line,无需替换 <br>
  const delay = (i) => ` style="--wf-delay:${i * 70}ms"`;
  const colsVar = (n) => ` style="--wb-cols:${esc(n || 3)}"`;
  const imgOrPh = (src, label, attrs, lazy) => {
    if (!src) return `<div class="wf-ph" data-label="${esc(label || "图片")}"></div>`;
    if (lazy) {
      return `<img data-src="${esc(src)}" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E" ${attrs || ""} alt="" loading="lazy">`;
    }
    return `<img src="${esc(src)}" ${attrs || ""} alt="">`;
  };

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

  // 渲染容器内某一栏的子模块(section 及其变体共用)
  WF.renderChildren = function (b, ctx, col) {
    const children = (b && b.children) || [];
    const colBlocks = children.filter((x) => (Number(x.col) || 0) === Number(col));
    const html = colBlocks.map((cb) => {
      const cdef = WF.Blocks[cb.type];
      if (!cdef || cb.hidden) return "";
      const vk = cdef.variants && WF.blockVariant ? WF.blockVariant(cb) : null;
      const renderer = (vk && WF.variantRenderer && WF.variantRenderer(cb.type, vk)) || R[cb.type];
      if (!renderer) return "";
      const pad = cb.style && cb.style.padding && cb.style.padding !== "normal" ? ` data-pad="${esc(cb.style.padding)}"` : "";
      const bg = cb.style && cb.style.bg ? ` style="background:${esc(cb.style.bg)}"` : "";
      const reveal = ctx.anim && (cb.style && (cb.style.anim || "up")) !== "none" ? ` data-reveal="${esc((cb.style && cb.style.anim) || "up")}"` : "";
      return `<div class="wf-block b-${cb.type}${vk ? " is-v-" + vk : ""}"${bg}${pad}${reveal}>${renderer(cb.props, ctx, cb)}</div>`;
    }).join("");
    return html || `<div class="wf-ph" data-label="第 ${Number(col) + 1} 栏(把模块移入这里)"></div>`;
  };

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
        if (href.indexOf("page:") === 0) {
          const slug = href.slice(5);
          if (ctx.multiBase) href = ctx.multiBase + (slug ? "/" + slug : "");
          else href = "#" + slug; // 编辑/单文件导出态退化为锚点
        } else if (!href) {
          href = ctx.resolveAnchor ? (ctx.resolveAnchor(l.label) || "#") : "#";
        }
        return `<a href="${esc(href)}">${esc(l.label)}</a>`;
      }).join("");
      return `<div class="b-nav__inner">
        <span class="b-nav__brand"><span class="b-nav__logo">${esc((p.brand || "W").slice(0, 1))}</span>${esc(p.brand)}</span>
        <nav class="b-nav__links">${links}</nav>
        ${p.btnText ? `<a class="wf-btn is-primary b-nav__cta" href="${esc(p.btnLink || "#")}">${esc(p.btnText)}</a>` : ""}
      </div>`;
    },

    hero(p, ctx, b) {
      const variant = (b && WF.blockVariant(b)) || "center";
      // 默认(经典)布局只渲染文案,本就应居中 —— 只有显式 align=left 才居左
      const center = p.align !== "left";
      const dark = p.bgType === "gradient" && p.gradient === "night";
      // 深色底(夜景渐变 / 配图背景)时文字需转浅色,否则深字压深图不可读
      const onDark = dark || (p.bgType === "image" && !!p.image);
      const darkCls = onDark ? " is-dark-text" : "";
      let bg = "";
      if (p.bgType === "gradient") bg = ` style="--wb-hero-bg:${WF.gradCss(p.gradient)}"`;
      else if (p.bgType === "image" && p.image) bg = ` style="--wb-hero-bg:url('${esc(p.image)}')"`;
      const bgCls = p.bgType === "image" && p.image ? " is-image" : "";
      const btns = `<div class="wf-btn-group b-hero__btns">
          ${p.bgType === "image" && p.image ? btn(p.btnText, p.btnLink, "is-light") : btn(p.btnText, p.btnLink, dark ? "is-light" : "is-primary")}
          ${p.bgType === "image" && p.image ? btn(p.btn2Text, p.btn2Link, "is-outline-light") : btn(p.btn2Text, p.btn2Link, "is-ghost")}
        </div>`;
      const text = `<div class="b-hero__copy${center ? " is-center" : ""}">
        ${p.badge ? `<span class="b-hero__badge">${esc(p.badge)}</span>` : ""}
        <h1 class="b-hero__title" data-wf-f="title">${esc(p.title)}</h1>
        ${p.subtitle ? `<p class="b-hero__subtitle" data-wf-f="subtitle">${nl2br(p.subtitle)}</p>` : ""}
        ${btns}
      </div>`;
      if (variant === "split") {
        const media = p.image
          ? `<div class="b-hero__media"><img src="${esc(p.image)}" alt=""${(ctx && ctx.lazy) ? ' loading="lazy"' : ""}></div>`
          : `<div class="b-hero__media"><div class="b-hero__mock" aria-hidden="true">
              <div class="b-hero__mock-bar"><span class="b-hero__mock-dot"></span><span class="b-hero__mock-dot"></span><span class="b-hero__mock-dot"></span><span class="b-hero__mock-url"></span></div>
              <div class="b-hero__mock-body">
                <div class="b-hero__mock-line is-title"></div>
                <div class="b-hero__mock-line"></div>
                <div class="b-hero__mock-line is-sub"></div>
                <div class="b-hero__mock-line is-accent"></div>
                <div class="b-hero__mock-cards"><span class="b-hero__mock-card"></span><span class="b-hero__mock-card"></span><span class="b-hero__mock-card"></span></div>
              </div>
            </div></div>`;
        return `<div class="b-hero__bg${bgCls}"${bg}></div>
          <div class="b-hero__inner is-split${darkCls}">
            <div class="b-hero__col">${text}</div>
            <div class="b-hero__col">${media}</div>
          </div>`;
      }
      if (variant === "fullscreen") {
        const img = p.image || (WF.Gradients && WF.Gradients[p.gradient]) || "";
        return `<div class="b-hero__bg is-cover" style="--wb-hero-bg:${p.image ? `url('${esc(p.image)}')` : img}"></div>
          <div class="b-hero__inner is-fullscreen${darkCls}">
            ${p.badge ? `<span class="b-hero__badge">${esc(p.badge)}</span>` : ""}
            <h1 class="b-hero__title">${esc(p.title)}</h1>
            ${p.subtitle ? `<p class="b-hero__subtitle">${nl2br(p.subtitle)}</p>` : ""}
            ${btns}
          </div>`;
      }
      return `<div class="b-hero__bg${bgCls}"${bg}></div>
        <div class="b-hero__inner${center ? " is-center" : ""}${darkCls}">${text}</div>`;
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

    features(p, ctx, b) {
      const variant = (b && WF.blockVariant(b)) || "cards";
      if (variant === "list") {
        const rows = (p.items || []).map((it, i) => `<div class="b-feat-list__row"${ctx.anim ? delay(i) : ""}>
          <span class="b-feat-list__icon">${esc(it.icon || "✦")}</span>
          <div><div class="b-feat-list__t">${esc(it.title)}</div><p class="b-feat-list__d">${nl2br(it.desc)}</p></div>
        </div>`).join("");
        return `<div class="wb-inner">${headHTML(p, p.align === "center")}<div class="b-feat-list">${rows}</div></div>`;
      }
      if (variant === "numbered") {
        const steps = (p.items || []).map((it, i) => `<div class="b-feat-num"${ctx.anim ? delay(i) : ""}>
          <span class="b-feat-num__no">${String(i + 1).padStart(2, "0")}</span>
          <div class="b-feat-num__t">${esc(it.title)}</div>
          <p class="b-feat-num__d">${nl2br(it.desc)}</p>
        </div>`).join("");
        return `<div class="wb-inner">${headHTML(p, p.align === "center")}
          <div class="b-feat-num__grid"${colsVar(p.cols)}>${steps}</div></div>`;
      }
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

    testimonials(p, ctx, b) {
      const variant = (b && WF.blockVariant(b)) || "cards";
      if (variant === "bigquote") {
        const first = (p.items || [])[0] || {};
        return `<div class="wb-inner">${headHTML(p, p.align === "center")}
          <figure class="b-testi-big">
            <blockquote>${nl2br(first.quote || "")}</blockquote>
            <figcaption>${esc(first.name || "")}${first.role ? " · " + esc(first.role) : ""}</figcaption>
          </figure>
        </div>`;
      }
      if (variant === "avatars") {
        const chips = (p.items || []).map((it, i) => `<div class="b-testi-av"${ctx.anim ? delay(i) : ""} title="${esc(it.quote || "")}">
          <span class="b-testi__avatar">${it.avatar ? `<img src="${esc(it.avatar)}" alt="">` : esc((it.name || "友").slice(0, 1))}</span>
          <div class="b-testi-av__name">${esc(it.name || "")}</div>
        </div>`).join("");
        return `<div class="wb-inner">${headHTML(p, p.align === "center")}
          <div class="b-testi-av__grid"${colsVar(p.cols)}>${chips}</div></div>`;
      }
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

    cta(p, ctx, b) {
      const variant = (b && WF.blockVariant(b)) || "panel";
      const cls = p.style === "gradient" ? " is-gradient" : p.style === "surface" ? " is-surface" : "";
      const goalAttr = p.goalId ? ` data-goal="${esc(p.goalId)}"` : "";
      let button = p.style === "surface" ? btn(p.btnText, p.btnLink) : btn(p.btnText, p.btnLink, "is-light");
      if (p.goalId && button) button = button.replace("<a ", `<a data-track-click="${esc(p.goalId)}" data-goal="${esc(p.goalId)}" `);
      if (variant === "banner") {
        return `<div class="b-cta__banner${cls}"${goalAttr}>
          <div><div class="b-cta__title">${esc(p.title)}</div>${p.subtitle ? `<p class="b-cta__subtitle">${nl2br(p.subtitle)}</p>` : ""}</div>
          <div class="wf-btn-group">${button}</div>
        </div>`;
      }
      if (variant === "split") {
        return `<div class="wb-inner"><div class="b-cta__panel is-split${cls}"${goalAttr}>
          <div><div class="b-cta__title">${esc(p.title)}</div>${p.subtitle ? `<p class="b-cta__subtitle">${nl2br(p.subtitle)}</p>` : ""}</div>
          <div class="wf-btn-group">${button}</div>
        </div></div>`;
      }
      return `<div class="wb-inner">
        <div class="b-cta__panel${cls}"${goalAttr}>
          <div class="b-cta__title">${esc(p.title)}</div>
          ${p.subtitle ? `<p class="b-cta__subtitle">${nl2br(p.subtitle)}</p>` : ""}
          <div class="wf-btn-group b-cta__btns" style="justify-content:center">
            ${button}
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

    tabs(p, ctx, b) {
      const items = p.items || [];
      const bid = (b && b.id) || ("tabs" + (++wfUidSeq));
      const bar = items.map((it, i) => `<button class="b-tabs__tab${i === 0 ? " is-active" : ""}" data-tab="${i}" type="button" role="tab" id="wf-tab-${esc(bid)}-${i}" aria-selected="${i === 0 ? "true" : "false"}" aria-controls="wf-tabp-${esc(bid)}-${i}" tabindex="${i === 0 ? "0" : "-1"}">${esc(it.tab || "页签 " + (i + 1))}</button>`).join("");
      const panels = items.map((it, i) => `<div class="b-tabs__panel${i === 0 ? " is-active" : ""}" role="tabpanel" id="wf-tabp-${esc(bid)}-${i}" aria-labelledby="wf-tab-${esc(bid)}-${i}">
        ${it.image ? `<div class="b-tabs__media"><img src="${esc(it.image)}" loading="lazy" alt=""></div>` : ""}
        ${it.title ? `<div class="b-tabs__title">${esc(it.title)}</div>` : ""}
        ${it.body ? `<p class="b-tabs__body">${nl2br(it.body)}</p>` : ""}
      </div>`).join("");
      return `<div class="wb-inner">
        <div class="b-tabs__bar" role="tablist">${bar}</div>${panels}
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
        `<button class="b-hotspot__dot" type="button" style="left:${esc(it.x)}%;top:${esc(it.y)}%" aria-expanded="false" aria-label="${esc(it.label || "查看说明")}">●</button>
         <div class="b-hotspot__tip"><strong>${esc(it.label)}</strong>${nl2br(it.desc)}</div>`).join("");
      return `<div class="wb-inner">
        <div class="b-hotspot__stage">${p.image ? `<img src="${esc(p.image)}" alt="">` : `<div class="wf-ph" data-label="放置一张产品图"></div>`}${dots}</div>
      </div>`;
    },

    /* ---------- 表单与交互 ---------- */
    form(p) {
      const fields = (p.fields || []).map((f, i) => {
        const req = f.required ? ' required' : '';
        const reqMark = f.required ? '<span class="b-form__req">*</span>' : '';
        let input = '';
        if (f.type === 'textarea') {
          input = `<textarea class="b-form__input" name="field_${i}" placeholder="${esc(f.placeholder || '')}"${req}></textarea>`;
        } else if (f.type === 'select') {
          input = `<select class="b-form__input" name="field_${i}"${req}><option value="">请选择</option></select>`;
        } else {
          input = `<input class="b-form__input" type="${esc(f.type || 'text')}" name="field_${i}" placeholder="${esc(f.placeholder || '')}"${req}>`;
        }
        return `<div class="b-form__field">
          <label class="b-form__label">${esc(f.label || '')}${reqMark}</label>
          ${input}
        </div>`;
      }).join('');
      return `<div class="wb-inner">
        ${headHTML(p, p.align === 'center')}
        <form class="b-form" data-wf-form="${esc(p.title || "form")}" data-wf-success="${esc(p.successMessage || '提交成功！')}" onsubmit="event.preventDefault(); window.__wfSubmitForm && window.__wfSubmitForm(this)">
          <div class="b-form__fields">${fields}</div>
          <button type="submit" class="wf-btn is-primary b-form__submit">${esc(p.submitText || '提交')}</button>
        </form>
      </div>`;
    },

    map(p, ctx, b) {
      const lat = Number(p.lat) || 39.908823;
      const lng = Number(p.lng) || 116.397470;
      let zoom = Math.max(1, Math.min(19, Number(p.zoom) || 15));

      // ---- 瓦片地图(免 Key 底图):按基准视口计算瓦片位置,百分比定位随容器缩放 ----
      // 底图样式可切换;tileUrl 可指向自建/代理瓦片服务
      const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services/";
      const STYLES = {
        light: { url: ESRI + "Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}", credit: "© Esri" },
        satellite: { url: ESRI + "World_Imagery/MapServer/tile/{z}/{y}/{x}", credit: "© Esri" },
        street: { url: ESRI + "World_Street_Map/MapServer/tile/{z}/{y}/{x}", credit: "© Esri" },
        topo: { url: ESRI + "World_Topo_Map/MapServer/tile/{z}/{y}/{x}", credit: "© Esri" },
        osm: { url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png", credit: "© OpenStreetMap contributors" },
      };
      const styleKey = STYLES[p.mapStyle] ? p.mapStyle : "light";
      const style = STYLES[styleKey];
      const custom = p.tileUrl && String(p.tileUrl).trim();
      const tpl = custom || style.url;
      const credit = custom ? "地图数据" : style.credit;
      // 中国区:Esri 街道/地形底图在高缩放级别无数据(会返回占位图),自动降到 13
      if (!custom && (styleKey === "street" || styleKey === "topo") && zoom > 13) zoom = 13;
      const tileSrc = (z, x, y) => tpl.replace("{z}", z).replace("{x}", x).replace("{y}", y);
      const BASE_W = 1024, BASE_H = 576, TILE = 256, COLS = 5, ROWS = 3;
      const worldPx = (la, ln, z) => {
        const n = Math.pow(2, z);
        const x = (ln + 180) / 360 * n * TILE;
        const rad = la * Math.PI / 180;
        const y = (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2 * n * TILE;
        return { x, y };
      };
      const c = worldPx(lat, lng, zoom);
      const tl = { x: c.x - BASE_W / 2, y: c.y - BASE_H / 2 };
      const firstX = Math.floor(tl.x / TILE), firstY = Math.floor(tl.y / TILE);
      const offX = tl.x - firstX * TILE, offY = tl.y - firstY * TILE;
      const maxTile = Math.pow(2, zoom) - 1;
      let tiles = "";
      for (let j = 0; j < ROWS; j++) {
        for (let i = 0; i < COLS; i++) {
          const tx = ((firstX + i) % (maxTile + 1) + (maxTile + 1)) % (maxTile + 1);
          const ty = firstY + j;
          if (ty < 0 || ty > maxTile) continue;
          const left = (i * TILE + offX) / BASE_W * 100;
          const top = (j * TILE + offY) / BASE_H * 100;
          tiles += `<img class="b-map__tile" src="${esc(tileSrc(zoom, tx, ty))}"` +
            ` alt="" loading="${j === 0 && i < 3 ? "eager" : "lazy"}" decoding="async" referrerpolicy="no-referrer"` +
            ` style="left:${left.toFixed(3)}%;top:${top.toFixed(3)}%"` +
            ` onerror="this.closest('.b-map__tiles').classList.add('is-fallback');this.remove()"` +
            ` onload="if(this.naturalWidth<200){this.closest('.b-map__tiles').classList.add('is-fallback')}">`;
        }
      }

      // ---- 标记点:按经纬度换算屏幕位置 ----
      const rawMarkers = (p.markers || []).filter((m) => m && (m.name || m.address || m.lat));
      const markers = rawMarkers.length ? rawMarkers : [{ name: p.address || "位置", lat, lng }];
      const pins = markers.map((m) => {
        const mlat = Number(m.lat) || lat, mlng = Number(m.lng) || lng;
        const w = worldPx(mlat, mlng, zoom);
        const left = (w.x - tl.x) / BASE_W * 100;
        const top = (w.y - tl.y) / BASE_H * 100;
        if (left < -4 || left > 104 || top < -4 || top > 104) return "";
        return `<span class="b-map__pin" style="left:${left.toFixed(2)}%;top:${top.toFixed(2)}%" title="${esc(m.name || "")}">` +
          `<span class="b-map__pin-dot"></span>` +
          (m.name ? `<span class="b-map__pin-label">${esc(m.name)}</span>` : "") + `</span>`;
      }).join("");

      const osmLink = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=${zoom}/${lat}/${lng}`;
      const list = markers.map((m) =>
        `<div class="b-map__marker"><strong>${esc(m.name || "")}</strong>${m.address ? `<span>${esc(m.address)}</span>` : ""}</div>`
      ).join("");

      return `<div class="wb-inner">
        ${headHTML(p, p.align === "center")}
        <div class="b-map__container">
          <div class="b-map__placeholder" data-lat="${lat}" data-lng="${lng}" data-zoom="${zoom}">
            <div class="b-map__tiles">${tiles}</div>
            ${pins}
            <div class="b-map__fallback"><span class="wf-ph" data-label="地图: ${esc(p.address || "")}"></span></div>
            <span class="b-map__credit">${esc(credit)}</span>
            <a class="b-map__osm" href="${esc(osmLink)}" target="_blank" rel="noopener">在地图中打开 ↗</a>
          </div>
          ${list ? `<div class="b-map__markers">${list}</div>` : ""}
        </div>
      </div>`;
    },

    social(p) {
      const platformIcons = {
        wechat: '💬', weibo: '🔴', douyin: '🎵', xiaohongshu: '📕',
        github: '🐙', twitter: '🐦', linkedin: '💼', email: '📧', phone: '📞'
      };
      const items = (p.items || []).map(item => {
        const icon = platformIcons[item.platform] || '🔗';
        const qr = item.qr ? `<div class="b-social__qr"><img src="${esc(item.qr)}" alt="二维码"></div>` : '';
        return `<div class="b-social__item">
          <a href="${esc(item.url || '#')}" class="b-social__link" target="_blank" rel="noopener">
            <span class="b-social__icon">${icon}</span>
            <span class="b-social__label">${esc(item.label || item.platform)}</span>
          </a>
          ${qr}
        </div>`;
      }).join('');
      return `<div class="wb-inner">
        ${headHTML(p, p.align === 'center')}
        <div class="b-social__grid">${items}</div>
      </div>`;
    },

    blog(p, ctx) {
      const cols = p.cols || '3';
      const lazy = ctx && ctx.lazy;
      const items = (p.items || []).map(item => {
        const dateStr = item.date ? `<time class="b-blog__date">${esc(item.date)}</time>` : '';
        const cat = item.category ? `<span class="b-blog__cat">${esc(item.category)}</span>` : '';
        return `<article class="b-blog__card">
          <div class="b-blog__cover">${imgOrPh(item.image, '文章封面', '', lazy)}</div>
          <div class="b-blog__body">
            <div class="b-blog__meta">${cat}${dateStr}</div>
            <h3 class="b-blog__title">${esc(item.title || '')}</h3>
            <p class="b-blog__excerpt">${esc(item.excerpt || '')}</p>
          </div>
        </article>`;
      }).join('');
      return `<div class="wb-inner">
        ${headHTML(p, p.align === 'center')}
        <div class="b-blog__grid" style="--wb-cols:${cols}">${items}</div>
      </div>`;
    },

    "product-showcase"(p, ctx) {
      const cols = p.cols || '3';
      const lazy = ctx && ctx.lazy;
      const items = (p.items || []).map(item => {
        const badge = item.badge ? `<span class="b-product__badge">${esc(item.badge)}</span>` : '';
        const origPrice = item.originalPrice ? `<span class="b-product__orig-price">${esc(item.originalPrice)}</span>` : '';
        return `<div class="b-product__card">
          <div class="b-product__image">${badge}${imgOrPh(item.image, '产品图片', '', lazy)}</div>
          <div class="b-product__body">
            <h3 class="b-product__name">${esc(item.name || '')}</h3>
            <p class="b-product__desc">${esc(item.desc || '')}</p>
            <div class="b-product__price">
              <span class="b-product__current-price">${esc(item.price || '')}</span>
              ${origPrice}
            </div>
          </div>
        </div>`;
      }).join('');
      return `<div class="wb-inner">
        ${headHTML(p, p.align === 'center')}
        <div class="b-product__grid" style="--wb-cols:${cols}">${items}</div>
        ${p.btnText ? `<div class="b-product__cta"><a class="wf-btn is-primary" href="#">${esc(p.btnText)}</a></div>` : ''}
      </div>`;
    },

    team(p, ctx) {
      const cols = p.cols || '4';
      const lazy = ctx && ctx.lazy;
      const items = (p.items || []).map(item => `<div class="b-team__member">
        <div class="b-team__avatar">${item.avatar ? imgOrPh(item.avatar, item.name || '?', '', lazy) : `<div class="wf-ph" data-label="${esc((item.name || '?').slice(0, 1))}"></div>`}</div>
        <h3 class="b-team__name">${esc(item.name || '')}</h3>
        <div class="b-team__role">${esc(item.role || '')}</div>
        ${item.bio ? `<p class="b-team__bio">${esc(item.bio)}</p>` : ''}
      </div>`).join('');
      return `<div class="wb-inner">
        ${headHTML(p, p.align === 'center')}
        <div class="b-team__grid" style="--wb-cols:${cols}">${items}</div>
      </div>`;
    },

    /* ---------- 转化与社交证明 ---------- */
    proof(p) {
      const cells = (p.items || []).map((it) => `<div class="b-proof__cell">
        <div class="b-proof__num">${esc(it.value || "")}</div>
        <div class="b-proof__label">${esc(it.label || "")}</div>
      </div>`).join("");
      return `<div class="wb-inner is-tight">
        <div class="b-proof__bar" style="--wb-cols:${esc(p.cols || 3)}">${cells}</div>
        ${p.note ? `<div class="b-proof__note">${esc(p.note)}</div>` : ""}
      </div>`;
    },

    "logo-wall"(p) {
      const chips = (p.items || []).map((it) => `<div class="b-logowall__chip">${esc(it.name || "")}</div>`).join("");
      return `<div class="wb-inner is-tight">
        ${headHTML(p, p.align === "center")}
        <div class="b-logowall__grid" style="--wb-cols:${esc(p.cols || 6)}">${chips}</div>
      </div>`;
    },

    journey(p) {
      const steps = (p.items || []).map((it, i) => `<div class="b-journey__step" data-reveal-child="1">
        <span class="b-journey__no">${String(i + 1).padStart(2, "0")}</span>
        <div><div class="b-journey__t">${esc(it.title || "")}</div>
        ${it.desc ? `<div class="b-journey__d">${nl2br(it.desc)}</div>` : ""}</div>
      </div>`).join("");
      return `<div class="wb-inner">
        ${headHTML(p, p.align === "center")}
        <div class="b-journey__list">${steps}</div>
      </div>`;
    },

    cluster(p) {
      const cards = (p.items || []).map((it, i) => `<div class="b-cluster__card"${delay(i)}>
        ${it.icon ? `<div class="b-cluster__icon">${esc(it.icon)}</div>` : ""}
        <div class="b-cluster__t">${esc(it.title || "")}</div>
        ${it.desc ? `<div class="b-cluster__d">${nl2br(it.desc)}</div>` : ""}
      </div>`).join("");
      return `<div class="wb-inner">
        ${headHTML(p, p.align === "center")}
        <div class="b-cluster__grid" style="--wb-cols:${esc(p.cols || 3)}">${cards}</div>
      </div>`;
    },

    marquee(p) {
      const items = (p.items || []).map((it) => `<span class="b-marquee__item">${esc(it.text || "")}</span>`).join("");
      return `<div class="b-marquee"><div class="b-marquee__mask">
        <div class="b-marquee__track">${items}${items}</div>
      </div></div>`;
    },

    banner(p) {
      return `<div class="b-banner__bar">
        <span class="b-banner__text">${esc(p.text || "")}</span>
        ${p.linkText ? `<a class="b-banner__link" href="${esc(p.link || "#")}">${esc(p.linkText)} →</a>` : ""}
      </div>`;
    },

    bento(p) {
      const cells = (p.items || []).map((it, i) => `<div class="b-bento__cell${it.span === "2" ? " is-wide" : ""}"${delay(i)}>
        ${it.image ? `<div class="b-bento__img"><img src="${esc(it.image)}" alt=""></div>` : ""}
        ${it.icon ? `<div class="b-bento__icon">${esc(it.icon)}</div>` : ""}
        <div class="b-bento__t">${esc(it.title || "")}</div>
        ${it.desc ? `<div class="b-bento__d">${nl2br(it.desc)}</div>` : ""}
      </div>`).join("");
      return `<div class="wb-inner">
        ${headHTML(p, p.align === "center")}
        <div class="b-bento__grid" style="--wb-cols:${esc(p.cols || 3)}">${cells}</div>
      </div>`;
    },

    comparison(p) {
      const rows = (p.items || []).map((it, i) => `<tr${delay(i)}>
        <th>${esc(it.feature || it.label || "")}</th>
        <td class="is-a">${esc(it.a || "")}</td>
        <td class="is-b">${esc(it.b || "")}</td>
      </tr>`).join("");
      return `<div class="wb-inner">
        ${headHTML(p, p.align === "center")}
        <div class="b-comparison__wrap">
          <table class="b-comparison">
            <thead><tr><th></th><th class="is-a">${esc(p.planA || "")}</th><th class="is-b">${esc(p.planB || "")}</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;
    },

    "before-after"(p) {
      const ba = (img, label, alt) => `<div class="b-ba__side">
        <div class="b-ba__img">${imgOrPh(img, alt || "图片")}</div>
        <div class="b-ba__label">${esc(alt || "")}</div>
      </div>`;
      return `<div class="wb-inner">
        ${headHTML(p, p.align === "center")}
        <div class="b-ba__grid">
          ${ba(p.beforeImage, p.beforeLabel, p.beforeLabel || "改造前")}
          ${ba(p.afterImage, p.afterLabel, p.afterLabel || "改造后")}
        </div>
        ${p.note ? `<div class="b-ba__note">${esc(p.note)}</div>` : ""}
      </div>`;
    },

    prompt(p) {
      const chips = (p.items || []).map((it) => `<span class="b-prompt__chip">${esc(it.text || "")}</span>`).join("");
      return `<div class="wb-inner">
        <div class="b-prompt__panel">
          ${p.subtitle ? `<div class="b-prompt__kicker">${esc(p.subtitle)}</div>` : ""}
          <div class="b-prompt__text">${nl2br(p.title || "")}</div>
          ${chips ? `<div class="b-prompt__chips">${chips}</div>` : ""}
          ${p.btnText ? `<a class="wf-btn is-primary b-prompt__btn" href="${esc(p.btnLink || "#")}">${esc(p.btnText)}</a>` : ""}
        </div>
      </div>`;
    },

    "tool-grid"(p) {
      const cards = (p.items || []).map((it, i) => `<div class="b-tool__card"${delay(i)}>
        ${it.tag ? `<span class="b-tool__tag">${esc(it.tag)}</span>` : ""}
        ${it.icon ? `<div class="b-tool__icon">${esc(it.icon)}</div>` : ""}
        <div class="b-tool__t">${esc(it.title || "")}</div>
        ${it.desc ? `<div class="b-tool__d">${nl2br(it.desc)}</div>` : ""}
        ${it.rating ? `<div class="b-tool__rating">★ ${esc(it.rating)}</div>` : ""}
      </div>`).join("");
      return `<div class="wb-inner">
        ${headHTML(p, p.align === "center")}
        <div class="b-tool__grid" style="--wb-cols:${esc(p.cols || 3)}">${cards}</div>
      </div>`;
    },

    accordion(p) {
      const items = (p.items || []).map((it, i) => `<details class="b-acc__item"${delay(i)}>
        <summary class="b-acc__head">
          <span class="b-acc__t">${esc(it.title || "")}</span>
          <span class="b-acc__chev">▾</span>
        </summary>
        <div class="b-acc__body">${nl2br(it.desc || "")}</div>
      </details>`).join("");
      return `<div class="wb-inner">
        ${headHTML(p, p.align === "center")}
        <div class="b-acc__list">${items}</div>
      </div>`;
    },

    portrait(p, ctx) {
      const cards = (p.items || []).map((it, i) => `<div class="b-portrait__card"${delay(i)}>
        <div class="b-portrait__img">${imgOrPh(it.image, it.title || "图片", "", ctx && ctx.lazy)}</div>
        <div class="b-portrait__t">${esc(it.title || "")}</div>
        ${it.desc ? `<div class="b-portrait__d">${esc(it.desc)}</div>` : ""}
      </div>`).join("");
      return `<div class="wb-inner">
        ${headHTML(p, p.align === "center")}
        <div class="b-portrait__grid" style="--wb-cols:${esc(p.cols || 4)}">${cards}</div>
      </div>`;
    },

    showcase(p, ctx) {
      const rows = (p.items || []).map((it, i) => `<div class="b-showcase__row${i % 2 ? " is-flip" : ""}"${delay(i)}>
        <div class="b-showcase__no">${String(i + 1).padStart(2, "0")}</div>
        <div class="b-showcase__txt">
          <div class="b-showcase__t">${esc(it.title || "")}</div>
          ${it.desc ? `<div class="b-showcase__d">${nl2br(it.desc)}</div>` : ""}
        </div>
        <div class="b-showcase__img">${imgOrPh(it.image, it.title || "配图", "", ctx && ctx.lazy)}</div>
      </div>`).join("");
      return `<div class="wb-inner">
        ${headHTML(p, p.align === "center")}
        <div class="b-showcase__list">${rows}</div>
      </div>`;
    },

    changelog(p) {
      const rows = (p.items || []).map((it, i) => `<div class="b-chlog__item"${delay(i)}>
        <div class="b-chlog__head">
          <span class="b-chlog__tag">${esc(it.tag || "")}</span>
          <span class="b-chlog__date">${esc(it.date || "")}</span>
        </div>
        <div class="b-chlog__t">${esc(it.title || "")}</div>
        ${it.desc ? `<div class="b-chlog__d">${nl2br(it.desc)}</div>` : ""}
      </div>`).join("");
      return `<div class="wb-inner">
        ${headHTML(p, p.align === "center")}
        <div class="b-chlog__list">${rows}</div>
      </div>`;
    },

    section(p, ctx, b) {
      const cols = Math.max(1, Math.min(3, Number(p.cols) || 2));
      const children = (b && b.children) || [];
      let inner = "";
      for (let c = 0; c < cols; c++) {
        const colBlocks = children.filter((x) => (Number(x.col) || 0) === c);
        const rendered = colBlocks.map((cb) => {
          const cdef = WF.Blocks[cb.type];
          if (!cdef || cb.hidden) return "";
          const renderer = R[cb.type] || (WF.Plugins && WF.Plugins[cb.type] ? (props) => `<div class="wf-plugin">${WF.renderPlugin(WF.Plugins[cb.type], props || {})}</div>` : null);
          if (!renderer) return "";
          const pad = cb.style && cb.style.padding && cb.style.padding !== "normal" ? ` data-pad="${esc(cb.style.padding)}"` : "";
          const bg = cb.style && cb.style.bg ? ` style="background:${esc(cb.style.bg)}"` : "";
          const reveal = ctx.anim && (cb.style && (cb.style.anim || "up")) !== "none" ? ` data-reveal="${esc((cb.style && cb.style.anim) || "up")}"` : "";
          return `<div class="wf-block b-${cb.type}"${bg}${pad}${reveal}>${renderer(cb.props, ctx, cb)}</div>`;
        }).join("");
        inner += `<div class="b-section__col">${rendered || `<div class="wf-ph" data-label="第 ${c + 1} 栏(把模块移入这里)"></div>`}</div>`;
      }
      return `<div class="wb-inner"><div class="b-section b-section--cols-${cols} b-section--gap-${esc(p.gap || "normal")}">${inner}</div></div>`;
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
    const ctx = { mode, context: opts.context, project, anim: !edit && mode !== "ppt" && !opts.noAnim, resolveAnchor, lazy: opts.context === "live", multiBase: opts.multiBase || "" };

    const sections = [];
    blocks.forEach((b, i) => {
      const def = WF.Blocks[b.type];
      if (!def) return;
      // 分群:可见性判定 + 个性化内容替换(SSR/导出/画布一致)
      const _eff = (typeof opts.visitor !== "undefined" && !edit && WF.effectiveProps)
        ? WF.effectiveProps(b, opts.visitor, project.segments)
        : { visible: true, props: b.props };
      if (!edit && !_eff.visible) return;   // 该人群不可见 → 不输出
      const effProps = _eff.props;
      const vKey = def.variants ? (WF.blockVariant ? WF.blockVariant(b) : b.variant) : null;
      let renderer = (vKey && WF.variantRenderer && WF.variantRenderer(b.type, vKey)) || R[b.type];
      if (!renderer && WF.Plugins && WF.Plugins[b.type]) {
        renderer = (props) => `<div class="wb-inner"><div class="wf-plugin">${WF.renderPlugin(WF.Plugins[b.type], props || {})}</div></div>`;
      }
      if (!renderer) {
        console.warn("[WebsFlow] 模块类型缺少渲染器:", b.type);
        renderer = () => `<div class="wb-inner"><div class="wf-ph" data-label="⚠️ 渲染器缺失: ${esc(b.type)}"></div></div>`;
      }
      const st = b.style || {};
      const isSlide = mode === "ppt";
      const cls = ["wf-block"];
      if (isSlide) cls.push("wf-slide", slideClass(b.type));
      else cls.push("b-" + b.type);
      // 布局变体钩子:便于变体样式稳定作用于整个模块
      if (vKey) cls.push("is-v-" + vKey);
      let attrs = ` class="${cls.join(" ")}" id="${anchors[i]}"`;
      if (vKey) attrs += ` data-wf-variant="${esc(vKey)}"`;
      if (st.bg) attrs += ` style="background:${esc(st.bg)}"`;
      if (!isSlide && st.padding && st.padding !== "normal") attrs += ` data-pad="${esc(st.padding)}"`;
      const aud = b.audience;
      if (!edit && aud && (aud.visitor || aud.utm || aud.login)) {
        attrs += ` data-wf-audience="${esc(JSON.stringify(aud))}"`;
      }
      // 入场动画(仅导出态)
      if (ctx.anim && !b.hidden && b.type !== "nav" && (st.anim || "up") !== "none") {
        attrs += ` data-reveal="${esc(st.anim || "up")}"`;
      }
      const inner = renderer(effProps, ctx, b);
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
        sections.push(`<section${attrs} data-wf-b="${b.id}">${inner}</section>`);
      }
    });

    // padding:由 data-pad 属性配合 runtime.css 的属性选择器生效
    const html = sections.join("\n");

    const g = project.global || {};
    const theme = WF.themeVars(project.theme, project.mode);

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
    try { document.documentElement.classList.add("wf-anim"); } catch (e) {}

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

    // 选项卡(支持鼠标 + 键盘方向键,补齐 aria)
    root.querySelectorAll(".b-tabs").forEach(function (wrap) {
      if (wrap.dataset.wfInit) return; wrap.dataset.wfInit = "1";
      var bars = Array.prototype.slice.call(wrap.querySelectorAll(".b-tabs__tab"));
      var panels = wrap.querySelectorAll(".b-tabs__panel");
      function activate(idx) {
        bars.forEach(function (t, j) {
          var on = j === idx;
          t.classList.toggle("is-active", on);
          t.setAttribute("aria-selected", on ? "true" : "false");
          t.setAttribute("tabindex", on ? "0" : "-1");
        });
        panels.forEach(function (p, j) { p.classList.toggle("is-active", j === idx); });
      }
      bars.forEach(function (tab, idx) {
        tab.addEventListener("click", function () { activate(idx); });
        tab.addEventListener("keydown", function (e) {
          var next = null;
          if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (idx + 1) % bars.length;
          else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (idx - 1 + bars.length) % bars.length;
          else if (e.key === "Home") next = 0;
          else if (e.key === "End") next = bars.length - 1;
          if (next === null) return;
          e.preventDefault();
          activate(next);
          bars[next].focus();
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

    // 图片热点(点击/键盘均可展开,Esc 与点击空白关闭)
    root.querySelectorAll(".b-hotspot__dot").forEach(function (dot) {
      if (dot.dataset.wfInit) return; dot.dataset.wfInit = "1";
      function setOpen(open) {
        var stage = dot.parentElement;
        stage.querySelectorAll(".b-hotspot__dot").forEach(function (d) {
          d.classList.remove("is-open");
          d.setAttribute("aria-expanded", "false");
        });
        if (open) { dot.classList.add("is-open"); dot.setAttribute("aria-expanded", "true"); }
      }
      dot.addEventListener("click", function (e) {
        e.stopPropagation();
        setOpen(!dot.classList.contains("is-open"));
      });
      dot.addEventListener("keydown", function (e) { if (e.key === "Escape") { setOpen(false); } });
      dot.parentElement.addEventListener("click", function (e) { if (e.target === dot.parentElement) setOpen(false); });
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

    // 块级人群定向(访客新老 + UTM 匹配 + 登录态)
    var audEls = Array.prototype.slice.call(root.querySelectorAll("[data-wf-audience]"));
    if (audEls.length) {
      var isReturn = false, isLoggedIn = false;
      try {
        isReturn = !!localStorage.getItem("websflow.visit");
        localStorage.setItem("websflow.visit", "1");
        isLoggedIn = !!localStorage.getItem("websflow.token");
      } catch (e) {}
      var qs = location.search || "";
      audEls.forEach(function (el) {
        try {
          var a = JSON.parse(el.getAttribute("data-wf-audience") || "{}");
          var hide = false;
          if (a.visitor === "new" && isReturn) hide = true;
          if (a.visitor === "return" && !isReturn) hide = true;
          if (a.login === "in" && !isLoggedIn) hide = true;
          if (a.login === "out" && isLoggedIn) hide = true;
          if (a.utm && qs.indexOf(a.utm) === -1) hide = true;
          if (hide) el.style.display = "none";
        } catch (e) {}
      });
    }

    // 表单提交(线索交 OpenFlow;失败时降级为本地提示)
    window.__wfSubmitForm = function (form) {
      try {
        var fields = {};
        Array.prototype.slice.call(form.querySelectorAll("input,textarea,select")).forEach(function (el, i) {
          var label = el.getAttribute("placeholder") || el.getAttribute("name") || ("field" + i);
          fields[label] = el.value;
        });
        var payload = JSON.stringify({
          project_id: window.__wfProjectId || null,
          project_name: document.title,
          url: location.href.slice(0, 300),
          seg: (typeof wfMatchedSegs !== "undefined" ? (wfMatchedSegs || []).join(",") : ""),
          fields: fields,
        });
        var done = function () {
          var msg = form.getAttribute("data-wf-success") || "提交成功!";
          var box = form.querySelector(".b-form__fields");
          if (box) box.innerHTML = '<div style="padding:24px;text-align:center;font-weight:600">' + msg + "</div>";
          var btn = form.querySelector(".b-form__submit"); if (btn) btn.style.display = "none";
        };
        // 现有站点规则:表单提交 = form_submit 事件(CDP SDK)
        try { if (window.CDP && window.CDP.track) window.CDP.track("form_submit", { form: form.getAttribute("data-wf-form") || document.title, fields: Object.keys(fields).length }); } catch (e) {}
        if (navigator.sendBeacon) {
          navigator.sendBeacon("/webflow/api/automation/lead", new Blob([payload], { type: "application/json" }));
          done();
        } else {
          fetch("/webflow/api/automation/lead", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload })
            .then(done).catch(done);
        }
      } catch (e) { alert("提交失败,请稍后再试"); }
    };

    // ---------- 页面自动化(触发-动作,页面侧) ----------
    (function wfAutomation() {
      var rules = (window.__wfAutomation || []).filter(function (r) { return r && r.enabled !== false; });
      rules.forEach(function (r, i) { if (!r.id) r.id = "auto_" + i; });   // 兜底:缺 id 时补上,保证多规则各自去重
      if (!rules.length) return;
      var fired = {};
      try { fired = JSON.parse(sessionStorage.getItem("wf_auto_fired") || "{}") || {}; } catch (e) { fired = {}; }
      var state = { clicked: false, scrolled: 0, loadedAt: Date.now(), env: null };
      try {
        state.env = {
          visitor: localStorage.getItem("websflow.visit") ? "return" : "new",
          login: localStorage.getItem("websflow.token") ? "in" : "out",
          device: /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "") ? "mobile" : "desktop",
          utm: location.search || "",
          hour: new Date().getHours(),
        };
      } catch (e) { state.env = { visitor: "new", login: "out", device: "desktop", utm: location.search || "", hour: new Date().getHours() }; }

      function persistFired() { try { sessionStorage.setItem("wf_auto_fired", JSON.stringify(fired)); } catch (e) {} }
      function matchConds(w) {
        if (!w) return true;
        if (w.device && w.device !== "any" && w.device !== state.env.device) return false;
        if (w.utm && String(state.env.utm).indexOf(w.utm) === -1) return false;
        if (w.visitor === "new" && state.env.visitor === "return") return false;
        if (w.visitor === "return" && state.env.visitor !== "return") return false;
        if (w.login === "in" && state.env.login !== "in") return false;
        if (w.login === "out" && state.env.login === "in") return false;
        if (w.requireNoClick && state.clicked) return false;
        return true;
      }
      function markClicked() { state.clicked = true; }
      document.addEventListener("click", function (e) {
        var el = e.target && e.target.closest ? e.target.closest("[data-goal], .wf-btn, .b-form__submit") : null;
        if (el) markClicked();
      }, true);

      function el(tag, style, html) {
        var n = document.createElement(tag);
        if (style) n.setAttribute("style", style);
        if (html != null) n.innerHTML = html;
        return n;
      }
      var POPUP_CSS = "position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px";
      var CARD_CSS = "background:#fff;border-radius:18px;max-width:420px;width:100%;padding:26px;box-shadow:0 40px 90px -30px rgba(15,23,42,.5);font-family:-apple-system,'PingFang SC',sans-serif";
      var BTN_CSS = "display:inline-flex;align-items:center;justify-content:center;padding:10px 20px;border-radius:10px;background:#4f46e5;color:#fff;font-weight:600;text-decoration:none;cursor:pointer;border:none;font-size:14px";
      var BAR_CSS = "position:fixed;left:0;right:0;bottom:0;z-index:9998;display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap;padding:12px 18px;background:#4f46e5;color:#fff;font-family:-apple-system,'PingFang SC',sans-serif;font-size:14px;box-shadow:0 -10px 30px rgba(15,23,42,.2)";

      function runAction(a) {
        if (!a || !a.type) return;
        if (a.type === "popup") {
          var wrap = el("div", POPUP_CSS);
          var card = el("div", CARD_CSS);
          card.innerHTML = '<div style="font-size:20px;font-weight:800;margin-bottom:8px">' + (a.title || "特别提示") + "</div>" +
            (a.body ? '<p style="color:#64748b;line-height:1.7;margin:0 0 16px;white-space:pre-line">' + a.body + "</p>" : "") +
            (a.coupon ? '<div style="background:#eef2ff;color:#4f46e5;font-weight:800;text-align:center;padding:12px;border-radius:10px;letter-spacing:.08em;margin-bottom:14px">' + a.coupon + "</div>" : "");
          var row = el("div", "display:flex;gap:10px;justify-content:flex-end");
          var close = el("button", "border:1px solid #e2e8f0;background:#fff;border-radius:10px;padding:10px 16px;cursor:pointer", "稍后再说");
          close.onclick = function () { wrap.remove(); };
          row.appendChild(close);
          if (a.linkText) {
            var go = el("a", BTN_CSS, a.linkText);
            go.setAttribute("href", a.link || "#");
            row.appendChild(go);
          }
          card.appendChild(row);
          wrap.appendChild(card);
          wrap.addEventListener("click", function (e) { if (e.target === wrap) wrap.remove(); });
          document.body.appendChild(wrap);
        } else if (a.type === "bar") {
          if (document.getElementById("wfAutoBar")) document.getElementById("wfAutoBar").remove();
          var bar = el("div", BAR_CSS);
          bar.id = "wfAutoBar";
          bar.innerHTML = "<span>" + (a.text || "") + "</span>" +
            (a.coupon ? '<b style="background:rgba(255,255,255,.2);padding:3px 12px;border-radius:999px">' + a.coupon + "</b>" : "") +
            (a.linkText ? '<a style="color:#fff;font-weight:700;text-decoration:underline" href="' + (a.link || "#") + '">' + a.linkText + "</a>" : "") +
            '<button style="position:absolute;right:10px;top:8px;background:none;border:none;color:#fff;cursor:pointer;font-size:14px">✕</button>';
          bar.querySelector("button").onclick = function () { bar.remove(); };
          document.body.appendChild(bar);
        } else if (a.type === "redirect" && a.link) {
          window.location.href = a.link;
        } else if (a.type === "form") {
          var form = document.querySelector(".b-form");
          if (form) { form.scrollIntoView({ behavior: "smooth", block: "center" }); var inp = form.querySelector("input,textarea"); if (inp) setTimeout(function () { inp.focus(); }, 600); }
        }
      }

      // 多步旅程:按顺序执行,支持每步 delay(秒) 与 if 条件(执行时判定)
      function fire(rule, idx) {
        var rkey = rule.id || ("auto_" + idx);   // 兜底:规则缺 id 时按下标去重,避免互相顶掉
        if (fired[rkey] && !(rule.when && rule.when.repeat)) return;
        fired[rkey] = 1; persistFired();
        var steps = rule.then || [];
        var delayAcc = 0;
        steps.forEach(function (a) {
          delayAcc += Math.max(0, Number(a && a.delay) || 0);
          var runStep = function () {
            if (a && a.if && !matchConds(a.if)) return;   // 该步条件不满足 → 跳过本步,不影响后续
            runAction(a);
          };
          if (delayAcc > 0) setTimeout(runStep, delayAcc * 1000);
          else runStep();
        });
      }
      function check(triggerType) {
        rules.forEach(function (rule) {
          var w = rule.when || {};
          if ((w.type || "time_on_page") !== triggerType) return;
          if (!matchConds(w)) return;
          fire(rule);
        });
      }
      // 定时类触发
      var timers = rules.filter(function (r) { return (r.when && r.when.type) === "time_on_page"; });
      timers.forEach(function (r) {
        var sec = Math.max(1, Number(r.when.value) || 30);
        setTimeout(function () { if (matchConds(r.when)) fire(r); }, sec * 1000);
      });
      // 滚动深度
      var scrollRules = rules.filter(function (r) { return r.when && r.when.type === "scroll_depth"; });
      if (scrollRules.length) {
        var onScroll = function () {
          var h = document.documentElement.scrollHeight - window.innerHeight;
          var pct = h > 0 ? Math.round(window.scrollY / h * 100) : 100;
          state.scrolled = Math.max(state.scrolled, pct);
          scrollRules.forEach(function (r) {
            if (state.scrolled >= (Number(r.when.value) || 60) && matchConds(r.when)) fire(r);
          });
        };
        window.addEventListener("scroll", onScroll, { passive: true });
      }
      // 退出意图
      var exitRules = rules.filter(function (r) { return r.when && r.when.type === "exit_intent"; });
      if (exitRules.length) {
        document.addEventListener("mouseout", function (e) {
          if (e.clientY <= 0 && !e.relatedTarget) exitRules.forEach(function (r) { if (matchConds(r.when)) fire(r); });
        });
      }
      // UTM / 到站即触发
      var nowRules = rules.filter(function (r) { return r.when && r.when.type === "utm"; });
      if (nowRules.length) setTimeout(function () { check("utm"); }, 800);
      // 无点击触发(在时长基础上判定)
      var noClickRules = rules.filter(function (r) { return r.when && r.when.type === "no_click"; });
      noClickRules.forEach(function (r) {
        var sec = Math.max(1, Number(r.when.value) || 30);
        setTimeout(function () { if (!state.clicked && matchConds(r.when)) fire(r); }, sec * 1000);
      });
    })();

    // ---------- 千人千面(导出页运行时) ----------
    var wfEnv = (function () {
      var e = { visitor: "new", login: "out", device: "desktop", utm: location.search || "", country: "", hour: new Date().getHours() };
      try { e.visitor = localStorage.getItem("websflow.visit") ? "return" : "new"; } catch (x) {}
      try { e.login = localStorage.getItem("websflow.token") ? "in" : "out"; } catch (x) {}
      e.device = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "") ? "mobile" : "desktop";
      return e;
    })();
    var wfMatchedSegs = [];
    if (window.__wfSegments && window.__wfSegments.length) {
      window.__wfSegments.forEach(function (sg) {
        var r = sg.rules || {};
        var ok = true;
        if (r.visitor === "new" && wfEnv.visitor === "return") ok = false;
        if (r.visitor === "return" && wfEnv.visitor !== "return") ok = false;
        if (r.login === "in" && wfEnv.login !== "in") ok = false;
        if (r.login === "out" && wfEnv.login === "in") ok = false;
        if (r.device && r.device !== "any" && r.device !== wfEnv.device) ok = false;
        if (r.utm && String(wfEnv.utm).indexOf(r.utm) === -1) ok = false;
        if (ok) wfMatchedSegs.push(sg.id);
      });
    }
    // 可见性:按 audience(分群或自定义规则)隐藏;个性化:替换标题/副标题/按钮/图片
    var segRules = {};
    (window.__wfSegments || []).forEach(function (sg) { segRules[sg.id] = sg.rules || {}; });
    function matchRules(r) {
      if (!r) return true;
      if (r.visitor === "new" && wfEnv.visitor === "return") return false;
      if (r.visitor === "return" && wfEnv.visitor !== "return") return false;
      if (r.login === "in" && wfEnv.login !== "in") return false;
      if (r.login === "out" && wfEnv.login === "in") return false;
      if (r.device && r.device !== "any" && r.device !== wfEnv.device) return false;
      if (r.utm && String(wfEnv.utm).indexOf(r.utm) === -1) return false;
      if (r.hours) {
        var mm = String(r.hours).match(/^(\d{1,2})-(\d{1,2})$/);
        if (mm) {
          var h = wfEnv.hour, from = +mm[1], to = +mm[2];
          var inRange = from <= to ? (h >= from && h < to) : (h >= from || h < to);
          if (!inRange) return false;
        }
      }
      return true;
    }
    (window.__wfAudience || []).forEach(function (item) {
      var sec = root.querySelector('[data-wf-b="' + item.id + '"]');
      if (!sec) return;
      var rules = item.segmentId ? (segRules[item.segmentId] || {}) : (item.audience || {});
      if (!matchRules(rules)) { sec.style.display = "none"; sec.setAttribute("data-wf-hidden", "1"); }
    });
    Array.prototype.slice.call(root.querySelectorAll("[data-wf-b]")).forEach(function (sec) {
      var id = sec.getAttribute("data-wf-b");
      if (sec.getAttribute("data-wf-hidden") === "1") return;
      var rule = null;
      (window.__wfPersonalize || []).forEach(function (item) {
        if (item.id !== id) return;
        (item.rules || []).forEach(function (r) { if (!rule && wfMatchedSegs.indexOf(r.segmentId) !== -1) rule = r; });
      });
      if (!rule || !rule.patch) return;
      var patch = rule.patch;
      Object.keys(patch).forEach(function (k) {
        if (k === "image") {
          var img = sec.querySelector("img");
          if (img && patch[k]) img.setAttribute("src", patch[k]);
          return;
        }
        var el = sec.querySelector('[data-wf-f="' + k + '"]');
        if (el && patch[k] != null && patch[k] !== "") el.textContent = patch[k];
      });
      var btns = sec.querySelectorAll(".wf-btn");
      if (patch.btnText && btns.length) btns[0].textContent = patch.btnText;
    });

    // 访客标识与来源(在线访客 / 来源分布)
    var wfVid = "";
    try {
      wfVid = localStorage.getItem("wf_vid") || "";
      if (!wfVid) { wfVid = "v_" + Math.random().toString(36).slice(2, 12) + Date.now().toString(36); localStorage.setItem("wf_vid", wfVid); }
    } catch (e) {}
    var wfSrc = "";
    try {
      var m = location.search.match(/utm_source=([^&]+)/);
      if (m) wfSrc = "utm:" + decodeURIComponent(m[1]).slice(0, 30);
      else if (document.referrer) { try { wfSrc = "ref:" + new URL(document.referrer).hostname.slice(0, 30); } catch (e) {} }
      else wfSrc = "(直接访问)";
    } catch (e) {}

    // 曝光上报(每会话一次,用于 A/B 转化率计算)
    try {
      var pvPid = window.__wfProjectId;
      if (pvPid && navigator.sendBeacon && window.sessionStorage) {
        var pvKey = "wf_pv_" + pvPid;
        if (!sessionStorage.getItem(pvKey)) {
          sessionStorage.setItem(pvKey, "1");
          navigator.sendBeacon("/webflow/api/events", new Blob([JSON.stringify({
            goal_id: "view:" + pvPid, type: "page_view", url: location.href.slice(0, 300),
            seg: (wfMatchedSegs || []).join(","), vid: wfVid, src: wfSrc,
          })], { type: "application/json" }));
        }
      }
    } catch (pvErr) {}

    // 转化目标上报:点击带 data-goal 的元素时 sendBeacon
    root.addEventListener("click", function (e) {
      var el = e.target && e.target.closest ? e.target.closest("[data-goal]") : null;
      if (!el || !navigator.sendBeacon) return;
      try {
        var payload = JSON.stringify({
          goal_id: el.getAttribute("data-goal"),
          type: "cta_click",
          url: location.href.slice(0, 300),
          project_id: window.__wfProjectId || null,
          seg: (wfMatchedSegs || []).join(","),
          vid: wfVid, src: wfSrc,
          ts: Date.now(),
        });
        navigator.sendBeacon("/webflow/api/events", new Blob([payload], { type: "application/json" }));
      } catch (err) {}
    }, true);

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
  // 基础渲染器表(变体注册表用:老页面/旧块的"经典版式")
  WF.__baseRenderers = R;
  // 通用渲染片段工具(变体文件/插件共用;此处声明已初始化完毕)
  WF.nl2br = nl2br;
  WF.delay = delay;
  WF.imgOrPh = imgOrPh;
  WF.headHTML = headHTML;
  WF.btn = btn;
})(window.WF);
