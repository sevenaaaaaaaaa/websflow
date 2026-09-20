/* ============================================================
 * WebsFlow · 布局变体 · 批次 3(展示 / 社交 / 社交证明)
 * video / tabs / form / map / social / blog / product-showcase / team / proof
 * 约定:render(p, ctx, b) 返回模块内部 HTML;样式以 .is-v-<key> 作用域书写。
 * product-showcase 的模块类为 .b-product。
 * ============================================================ */
window.WF = window.WF || {};

(function (WF) {
  "use strict";
  const esc = (s) => WF.esc(s);
  const nl2br = (s) => WF.nl2br(s);
  const btn = (...a) => WF.btn(...a);
  const imgOrPh = (...a) => WF.imgOrPh(...a);
  const headHTML = (...a) => WF.headHTML(...a);
  const pad2 = (i) => (i < 9 ? "0" : "") + (i + 1);
  const num = (v, fb) => { const n = Number(v); return isFinite(n) ? n : fb; };

  /* 视频:统一生成 iframe / 原始嵌入 / 空态提示 */
  const videoInner = (p) => {
    const embed = WF.videoEmbedUrl(p.url);
    if (embed && embed.indexOf("<iframe") < 0) {
      return `<iframe src="${esc(embed)}" loading="lazy" allowfullscreen allow="encrypted-media; fullscreen"></iframe>`;
    }
    if (embed) return embed;
    return `<div class="b-video__tip">🎞️ 在右侧面板粘贴视频链接(B 站 / YouTube / Vimeo)</div>`;
  };

  /* 社交平台图标 */
  const socialIcons = {
    wechat: "💬", weibo: "🔴", douyin: "🎵", xiaohongshu: "📕",
    github: "🐙", twitter: "🐦", linkedin: "💼", email: "📧", phone: "📞",
  };
  const socialIcon = (it) => socialIcons[it && it.platform] || "🔗";

  /* 博客元信息(分类 + 日期) */
  const blogMeta = (it) => {
    const cat = it.category ? `<span class="b-blog__cat">${esc(it.category)}</span>` : "";
    const date = it.date ? `<time class="b-blog__date">${esc(it.date)}</time>` : "";
    return cat || date ? `<div class="b-blog__meta">${cat}${date}</div>` : "";
  };

  /* 价格行 */
  const priceHTML = (it, cls) => `<div class="${cls || "b-product__price"}">
    <span class="b-product__current-price">${esc(it.price || "")}</span>
    ${it.originalPrice ? `<span class="b-product__orig-price">${esc(it.originalPrice)}</span>` : ""}
  </div>`;

  /* 头像 */
  const avatarHTML = (it, cls) => `<div class="wb-avatar${cls ? " " + cls : ""}">${imgOrPh(it.avatar, (it.name || "?").slice(0, 1), "")}</div>`;

  /* 地图占位(保留 data-* 供后续接入真实地图) */
  const mapStage = (p, cls) => `<div class="b-map__placeholder${cls ? " " + cls : ""}" data-lat="${esc(num(p.lat, 39.908823))}" data-lng="${esc(num(p.lng, 116.39747))}" data-zoom="${esc(num(p.zoom, 15))}"><div class="wf-ph" data-label="地图: ${esc(p.address || "")}"></div></div>`;

  /* 表单字段(保持与默认渲染一致 name / input / required 结构) */
  const formFields = (p) => (p.fields || []).map((f, i) => {
    const req = f.required ? " required" : "";
    const reqMark = f.required ? '<span class="b-form__req">*</span>' : "";
    let input = "";
    if (f.type === "textarea") {
      input = `<textarea class="b-form__input" name="field_${i}" placeholder="${esc(f.placeholder || "")}"${req}></textarea>`;
    } else if (f.type === "select") {
      input = `<select class="b-form__input" name="field_${i}"${req}><option value="">请选择</option></select>`;
    } else {
      input = `<input class="b-form__input" type="${esc(f.type || "text")}" name="field_${i}" placeholder="${esc(f.placeholder || "")}"${req}>`;
    }
    const wide = f.type === "textarea" ? " is-full" : "";
    return `<div class="b-form__field${wide}">
      <label class="b-form__label">${esc(f.label || "")}${reqMark}</label>
      ${input}
    </div>`;
  }).join("");

  const formHTML = (p, cls) => `<form class="b-form${cls ? " " + cls : ""}" data-wf-form="${esc(p.title || "form")}" data-wf-success="${esc(p.successMessage || "提交成功！")}" onsubmit="event.preventDefault(); window.__wfSubmitForm && window.__wfSubmitForm(this)">
    <div class="b-form__fields">${formFields(p)}</div>
    <button type="submit" class="wf-btn is-primary b-form__submit">${esc(p.submitText || "提交")}</button>
  </form>`;

  /* tabs 标签 / 面板:保持 .b-tabs__tab / data-tab / .b-tabs__panel / is-active */
  const tabsBar = (items, cls) => (items || []).map((it, i) =>
    `<button class="b-tabs__tab${cls ? " " + cls : ""}${i === 0 ? " is-active" : ""}" data-tab="${i}" type="button">${esc(it.tab || "页签 " + (i + 1))}</button>`
  ).join("");

  const tabsPanels = (items) => (items || []).map((it, i) => `<div class="b-tabs__panel${i === 0 ? " is-active" : ""}">
    ${it.image ? `<div class="b-tabs__media">${imgOrPh(it.image, "页签配图", "")}</div>` : ""}
    ${it.title ? `<div class="b-tabs__title">${esc(it.title)}</div>` : ""}
    ${it.body ? `<p class="b-tabs__body">${nl2br(it.body)}</p>` : ""}
  </div>`).join("");

  /* ============================ 视频 ============================ */
  WF.defineVariants("video", {
    cinema: {
      name: "影院宽幕",
      render(p) {
        return `<div class="wb-inner">
          <div class="b-video__head">
            <span class="wb-pill is-primary">VIDEO</span>
            ${p.title ? `<h2 class="b-video__title">${esc(p.title)}</h2>` : ""}
          </div>
          <div class="b-video__frame is-wide">${videoInner(p)}</div>
        </div>`;
      },
      css: `
.b-video.is-v-cinema .b-video__head { display: flex; align-items: center; gap: var(--wb-gap-sm); flex-wrap: wrap; margin-bottom: 22px; }
.b-video.is-v-cinema .b-video__title { font-size: var(--wf-fs-h2); font-weight: 800; letter-spacing: -.02em; }
.b-video.is-v-cinema .b-video__frame.is-wide { aspect-ratio: 21 / 9; border-radius: calc(var(--wf-radius) * 1.25); }
@media (max-width: 860px) {
  .b-video.is-v-cinema .b-video__frame.is-wide { aspect-ratio: 16 / 9; }
}
`,
    },

    spotlight: {
      name: "居中聚光",
      render(p) {
        return `<div class="wb-inner"><div class="b-video__spot">
          ${p.title ? `<h2 class="b-video__title">${esc(p.title)}</h2>` : ""}
          <div class="b-video__frame is-soft">${videoInner(p)}</div>
          <span class="b-video__hint">— 点击播放器即可开始 —</span>
        </div></div>`;
      },
      css: `
.b-video.is-v-spotlight .b-video__spot { max-width: 920px; margin: 0 auto; text-align: center; }
.b-video.is-v-spotlight .b-video__title { font-size: var(--wf-fs-h2); font-weight: 800; letter-spacing: -.02em; margin-bottom: 26px; }
.b-video.is-v-spotlight .b-video__frame.is-soft { box-shadow: 0 44px 90px -44px color-mix(in srgb, var(--wf-primary) 60%, transparent); outline: 1px solid var(--wb-line); }
.b-video.is-v-spotlight .b-video__hint { display: inline-block; margin-top: 18px; color: var(--wf-muted); font-size: .84em; letter-spacing: .08em; }
@media (max-width: 560px) {
  .b-video.is-v-spotlight .b-video__hint { display: none; }
}
`,
    },

    side: {
      name: "侧栏说明",
      render(p) {
        const canLink = p.url && p.url.indexOf("<iframe") < 0;
        return `<div class="wb-inner"><div class="wb-split2 b-video__side">
          <div class="b-video__frame">${videoInner(p)}</div>
          <div class="wb-stack b-video__copy">
            <span class="wb-pill">WATCH</span>
            ${p.title ? `<h2 class="b-video__title">${esc(p.title)}</h2>` : ""}
            <p class="wb-muted b-video__desc">支持 B 站、YouTube、Vimeo 等平台的视频嵌入,粘贴观看页链接即可自动识别。</p>
            ${canLink ? `<a class="wb-link" href="${esc(p.url)}" target="_blank" rel="noopener">在原平台观看</a>` : ""}
          </div>
        </div></div>`;
      },
      css: `
.b-video.is-v-side .b-video__copy { align-items: flex-start; }
.b-video.is-v-side .b-video__title { font-size: var(--wf-fs-h2); font-weight: 800; letter-spacing: -.02em; }
.b-video.is-v-side .b-video__desc { font-size: var(--wf-fs-body); line-height: 1.8; }
`,
    },
  });

  /* ============================ 选项卡 ============================ */
  WF.defineVariants("tabs", {
    vertical: {
      name: "侧边标签",
      render(p) {
        const items = p.items || [];
        return `<div class="wb-inner"><div class="b-tabs__split">
          <div class="b-tabs__bar is-vertical">${tabsBar(items)}</div>
          <div class="b-tabs__panels">${tabsPanels(items)}</div>
        </div></div>`;
      },
      css: `
.b-tabs.is-v-vertical .b-tabs__split { display: grid; grid-template-columns: 236px 1fr; gap: clamp(24px, 4vw, 52px); align-items: start; }
.b-tabs.is-v-vertical .b-tabs__bar.is-vertical { flex-direction: column; flex-wrap: nowrap; align-items: stretch; justify-content: flex-start; gap: 4px; margin-bottom: 0; }
.b-tabs.is-v-vertical .b-tabs__bar.is-vertical .b-tabs__tab { text-align: left; border: 0; border-left: 2px solid var(--wb-line); border-radius: 0; background: transparent; color: var(--wf-muted); padding: 12px 16px; }
.b-tabs.is-v-vertical .b-tabs__bar.is-vertical .b-tabs__tab.is-active { border-left-color: var(--wf-primary); color: var(--wf-primary); background: var(--wf-primary-soft); }
.b-tabs.is-v-vertical .b-tabs__title { text-align: left; }
.b-tabs.is-v-vertical .b-tabs__body { text-align: left; margin: 0; max-width: none; }
@media (max-width: 860px) {
  .b-tabs.is-v-vertical .b-tabs__split { grid-template-columns: 1fr; }
  .b-tabs.is-v-vertical .b-tabs__bar.is-vertical { flex-direction: row; flex-wrap: wrap; gap: var(--wb-gap-xs); margin-bottom: 20px; }
  .b-tabs.is-v-vertical .b-tabs__bar.is-vertical .b-tabs__tab { border-left: 0; border: 1px solid var(--wf-border); border-radius: 999px; }
}
`,
    },

    cards: {
      name: "卡片页签",
      render(p) {
        const items = p.items || [];
        const cards = items.map((it, i) => `<button class="b-tabs__tab is-card${i === 0 ? " is-active" : ""}" data-tab="${i}" type="button">
          <span class="b-tabs__no">${pad2(i)}</span>
          <span class="b-tabs__cat">${esc(it.tab || "页签 " + (i + 1))}</span>
        </button>`).join("");
        return `<div class="wb-inner"><div class="b-tabs__bar is-cards">${cards}</div><div class="b-tabs__stage">${tabsPanels(items)}</div></div>`;
      },
      css: `
.b-tabs.is-v-cards .b-tabs__bar.is-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: var(--wb-gap-sm); justify-content: stretch; margin-bottom: 26px; }
.b-tabs.is-v-cards .b-tabs__tab.is-card { display: flex; flex-direction: column; gap: 6px; align-items: flex-start; text-align: left; padding: var(--wb-card-pad); border-radius: var(--wb-radius-lg); background: var(--wf-bg); border: 1px solid var(--wb-line); box-shadow: var(--wb-shadow-sm); transition: transform .2s var(--wb-ease), box-shadow .2s var(--wb-ease); }
.b-tabs.is-v-cards .b-tabs__tab.is-card:hover { transform: translateY(-2px); box-shadow: var(--wb-shadow-md); }
.b-tabs.is-v-cards .b-tabs__tab.is-card.is-active { background: var(--wf-primary); border-color: var(--wf-primary); color: #fff; }
.b-tabs.is-v-cards .b-tabs__no { font-size: var(--wf-fs-num); font-weight: 800; opacity: .6; letter-spacing: .14em; }
.b-tabs.is-v-cards .b-tabs__cat { font-size: var(--wf-fs-meta); font-weight: 700; }
.b-tabs.is-v-cards .b-tabs__stage { background: var(--wf-surface); border: 1px solid var(--wb-line); border-radius: var(--wb-radius-lg); padding: clamp(20px, 3vw, 40px); }
@media (max-width: 560px) {
  .b-tabs.is-v-cards .b-tabs__bar.is-cards { grid-template-columns: 1fr 1fr; }
}
`,
    },

    underline: {
      name: "下划线标签",
      render(p) {
        const items = p.items || [];
        const panels = items.map((it, i) => `<div class="b-tabs__panel${i === 0 ? " is-active" : ""}">
          <div class="wb-split2">
            <div class="wb-media" data-ratio="4x3">${imgOrPh(it.image, "页签配图", "")}</div>
            <div class="wb-stack">
              ${it.title ? `<div class="b-tabs__title">${esc(it.title)}</div>` : ""}
              ${it.body ? `<p class="b-tabs__body">${nl2br(it.body)}</p>` : ""}
            </div>
          </div>
        </div>`).join("");
        return `<div class="wb-inner"><div class="b-tabs__bar is-underline">${tabsBar(items)}</div><div class="b-tabs__panels">${panels}</div></div>`;
      },
      css: `
.b-tabs.is-v-underline .b-tabs__bar.is-underline { justify-content: flex-start; gap: var(--wb-gap-lg); border-bottom: 1px solid var(--wb-line); margin-bottom: 30px; }
.b-tabs.is-v-underline .b-tabs__tab { border: 0; border-radius: 0; background: transparent; color: var(--wf-muted); padding: 10px 2px; border-bottom: 2px solid transparent; margin-bottom: -1px; font-weight: 650; }
.b-tabs.is-v-underline .b-tabs__tab.is-active { background: transparent; color: var(--wf-primary); border-bottom-color: var(--wf-primary); }
.b-tabs.is-v-underline .b-tabs__title { text-align: left; }
.b-tabs.is-v-underline .b-tabs__body { text-align: left; margin: 0; max-width: none; }
@media (max-width: 560px) {
  .b-tabs.is-v-underline .b-tabs__bar.is-underline { gap: var(--wb-gap-sm); }
}
`,
    },
  });

  /* ============================ 联系表单 ============================ */
  WF.defineVariants("form", {
    split: {
      name: "左文右表",
      render(p) {
        return `<div class="wb-inner"><div class="wb-split2 b-form__split">
          <div class="wb-stack">
            ${headHTML(p, false)}
            <span class="wb-divider" style="margin:0"></span>
            <p class="wb-muted b-form__note">填写表单提交后,我们会在一个工作日内回复。</p>
          </div>
          <div>${formHTML(p, "is-split")}</div>
        </div></div>`;
      },
      css: `
.b-form.is-v-split { max-width: none; margin: 0; padding: 0; background: transparent; border: 0; }
.b-form.is-v-split .b-form__split { align-items: start; }
.b-form.is-v-split .b-form.is-split { max-width: 100%; margin: 0; }
.b-form.is-v-split .b-form__note { font-size: var(--wf-fs-meta); line-height: 1.8; }
`,
    },

    grid: {
      name: "双栏表单",
      render(p) {
        return `<div class="wb-inner">
          ${headHTML(p, p.align === "center")}
          <div class="b-form__wrap">${formHTML(p, "is-grid")}</div>
        </div>`;
      },
      css: `
.b-form.is-v-grid { max-width: none; margin: 0; padding: 0; background: transparent; border: 0; }
.b-form.is-v-grid .b-form.is-grid { max-width: 820px; }
.b-form.is-v-grid .b-form.is-grid .b-form__fields { grid-template-columns: 1fr 1fr; gap: var(--wb-gap) 20px; }
.b-form.is-v-grid .b-form.is-grid .b-form__field.is-full { grid-column: 1 / -1; }
@media (max-width: 860px) {
  .b-form.is-v-grid .b-form.is-grid .b-form__fields { grid-template-columns: 1fr; }
}
`,
    },

    inline: {
      name: "紧凑横排",
      render(p) {
        return `<div class="wb-inner">
          ${headHTML(p, p.align === "center")}
          ${formHTML(p, "is-inline")}
        </div>`;
      },
      css: `
.b-form.is-v-inline { max-width: none; margin: 0; padding: 0; background: transparent; border: 0; }
.b-form.is-v-inline .b-form.is-inline { max-width: none; display: flex; flex-wrap: wrap; align-items: flex-start; gap: var(--wb-gap-sm); }
.b-form.is-v-inline .b-form.is-inline .b-form__fields { display: flex; flex-wrap: wrap; gap: var(--wb-gap-sm); flex: 1 1 520px; }
.b-form.is-v-inline .b-form.is-inline .b-form__field { flex: 1 1 210px; }
.b-form.is-v-inline .b-form.is-inline .b-form__field.is-full { flex-basis: 100%; }
.b-form.is-v-inline .b-form.is-inline .b-form__submit { margin-top: 0; width: auto; flex: 0 0 auto; }
@media (max-width: 560px) {
  .b-form.is-v-inline .b-form.is-inline .b-form__field { flex-basis: 100%; }
}
`,
    },
  });

  /* ============================ 地图 ============================ */
  WF.defineVariants("map", {
    panel: {
      name: "侧栏信息",
      render(p) {
        const rows = (p.markers || []).map((m) => `<li class="b-map__row">
          <span class="b-map__pin">📍</span>
          <div>
            <strong>${esc(m.name || "")}</strong>
            ${m.address ? `<span class="b-map__addr">${esc(m.address)}</span>` : ""}
          </div>
        </li>`).join("");
        return `<div class="wb-inner"><div class="wb-split2 b-map__split">
          <div class="b-map__stage">${mapStage(p)}</div>
          <div class="wb-card is-lift b-map__panel">
            ${p.title ? `<h2 class="b-map__title">${esc(p.title)}</h2>` : ""}
            ${p.subtitle ? `<p class="b-map__sub wb-muted">${nl2br(p.subtitle)}</p>` : ""}
            ${p.address ? `<div class="b-map__address"><span class="wb-pill is-primary">地址</span><span>${esc(p.address)}</span></div>` : ""}
            ${rows ? `<ul class="b-map__list">${rows}</ul>` : ""}
          </div>
        </div></div>`;
      },
      css: `
.b-map.is-v-panel .b-map__split { align-items: stretch; }
.b-map.is-v-panel .b-map__stage { border-radius: var(--wb-radius-lg); overflow: hidden; }
.b-map.is-v-panel .b-map__panel { display: flex; flex-direction: column; gap: var(--wb-gap-sm); }
.b-map.is-v-panel .b-map__title { font-size: var(--wf-fs-h2); font-weight: 800; }
.b-map.is-v-panel .b-map__list { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--wb-gap-sm); }
.b-map.is-v-panel .b-map__row { display: flex; gap: var(--wb-gap-sm); align-items: flex-start; }
.b-map.is-v-panel .b-map__addr { display: block; color: var(--wf-muted); font-size: .9em; }
.b-map.is-v-panel .b-map__address { display: flex; gap: var(--wb-gap-sm); align-items: center; flex-wrap: wrap; color: var(--wf-muted); font-size: .94em; }
@media (max-width: 860px) {
  .b-map.is-v-panel .b-map__placeholder { aspect-ratio: 16 / 9; }
}
`,
    },

    overlay: {
      name: "浮层卡片",
      render(p) {
        return `<div class="wb-inner"><div class="b-map__cover">
          ${mapStage(p, "is-cover")}
          <div class="wb-card b-map__float">
            ${p.title ? `<h2 class="b-map__title">${esc(p.title)}</h2>` : ""}
            ${p.address ? `<p class="b-map__addr-line">${esc(p.address)}</p>` : ""}
            ${p.subtitle ? `<p class="b-map__float-sub wb-muted">${nl2br(p.subtitle)}</p>` : ""}
          </div>
        </div></div>`;
      },
      css: `
.b-map.is-v-overlay .b-map__cover { position: relative; border-radius: var(--wb-radius-lg); overflow: hidden; }
.b-map.is-v-overlay .b-map__placeholder.is-cover { aspect-ratio: 21 / 9; }
.b-map.is-v-overlay .b-map__float { position: absolute; left: 24px; bottom: 24px; max-width: 340px; background: color-mix(in srgb, var(--wf-bg) 92%, transparent); backdrop-filter: blur(10px); box-shadow: var(--wb-shadow-lg); }
.b-map.is-v-overlay .b-map__title { font-size: var(--wf-fs-h2); font-weight: 800; }
.b-map.is-v-overlay .b-map__addr-line { color: var(--wf-muted); font-size: .92em; margin-top: 8px; }
.b-map.is-v-overlay .b-map__float-sub { font-size: .88em; margin-top: 8px; }
@media (max-width: 860px) {
  .b-map.is-v-overlay .b-map__placeholder.is-cover { aspect-ratio: 4 / 3; }
}
@media (max-width: 560px) {
  .b-map.is-v-overlay .b-map__float { position: static; margin: 14px; max-width: none; }
}
`,
    },

    cards: {
      name: "标记卡片",
      render(p) {
        const cards = (p.markers || []).map((m, i) => `<div class="wb-card is-flat b-map__mc">
          <span class="b-map__mno">${pad2(i)}</span>
          <div class="wb-card__title">${esc(m.name || "")}</div>
          ${m.address ? `<div class="wb-card__body">${esc(m.address)}</div>` : ""}
        </div>`).join("");
        return `<div class="wb-inner">
          ${headHTML(p, p.align === "center")}
          <div class="b-map__stack">${mapStage(p)}</div>
          ${cards ? `<div class="wb-grid is-auto b-map__grid">${cards}</div>` : ""}
        </div>`;
      },
      css: `
.b-map.is-v-cards .b-map__stack { border-radius: var(--wb-radius-lg); overflow: hidden; margin-bottom: 26px; }
.b-map.is-v-cards .b-map__grid { margin-top: 0; }
.b-map.is-v-cards .b-map__mc { display: flex; flex-direction: column; gap: 6px; }
.b-map.is-v-cards .b-map__mno { color: var(--wf-primary); font-weight: 800; font-size: .82em; letter-spacing: .14em; }
@media (max-width: 560px) {
  .b-map.is-v-cards .b-map__placeholder { aspect-ratio: 1 / 1; }
}
`,
    },
  });

  /* ============================ 社交链接 ============================ */
  WF.defineVariants("social", {
    tiles: {
      name: "磁贴宫格",
      render(p) {
        const items = (p.items || []).map((it) => {
          const qr = it.qr ? `<span class="b-social__qr is-inline"><img src="${esc(it.qr)}" alt="二维码"></span>` : "";
          return `<a class="b-social__tile" href="${esc(it.url || "#")}" target="_blank" rel="noopener">
            <span class="b-social__glyph">${socialIcon(it)}</span>
            <span class="b-social__label">${esc(it.label || it.platform || "")}</span>
            ${qr}
          </a>`;
        }).join("");
        return `<div class="wb-inner">${headHTML(p, p.align === "center")}<div class="wb-grid is-auto b-social__tiles">${items}</div></div>`;
      },
      css: `
.b-social.is-v-tiles .b-social__tiles { grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
.b-social.is-v-tiles .b-social__tile { display: flex; flex-direction: column; align-items: center; gap: var(--wb-gap-sm); padding: var(--wb-card-pad); border-radius: var(--wb-radius-lg); background: var(--wf-bg); border: 1px solid var(--wb-line); box-shadow: var(--wb-shadow-sm); text-align: center; transition: transform .25s var(--wb-ease), box-shadow .25s var(--wb-ease), border-color .25s var(--wb-ease); }
.b-social.is-v-tiles .b-social__tile:hover { transform: translateY(-4px); box-shadow: var(--wb-shadow-md); border-color: color-mix(in srgb, var(--wf-primary) 26%, var(--wb-line)); }
.b-social.is-v-tiles .b-social__glyph { font-size: 1.8em; line-height: 1; }
.b-social.is-v-tiles .b-social__label { font-weight: 700; font-size: var(--wf-fs-meta); }
.b-social.is-v-tiles .b-social__qr.is-inline { position: static; display: block; margin: 6px auto 0; padding: 0; border: 0; box-shadow: none; background: transparent; }
.b-social.is-v-tiles .b-social__qr.is-inline img { width: 96px; height: 96px; }
`,
    },

    rows: {
      name: "列表横排",
      render(p) {
        const items = (p.items || []).map((it) => `<a class="b-social__row" href="${esc(it.url || "#")}" target="_blank" rel="noopener">
          <span class="b-social__glyph">${socialIcon(it)}</span>
          <span class="b-social__label">${esc(it.label || it.platform || "")}</span>
          <span class="b-social__go">↗</span>
        </a>`).join("");
        return `<div class="wb-inner">${headHTML(p, p.align === "center")}<div class="b-social__rows">${items}</div></div>`;
      },
      css: `
.b-social.is-v-rows .b-social__rows { display: grid; gap: var(--wb-gap-sm); max-width: 680px; margin: 0 auto; }
.b-social.is-v-rows .b-social__row { display: flex; align-items: center; gap: var(--wb-gap-sm); padding: 14px 18px; border: 1px solid var(--wb-line); border-radius: var(--wb-radius-md); background: var(--wf-bg); transition: border-color .2s var(--wb-ease), transform .2s var(--wb-ease); }
.b-social.is-v-rows .b-social__row:hover { border-color: var(--wf-primary); transform: translateX(4px); }
.b-social.is-v-rows .b-social__glyph { width: 40px; height: 40px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; background: var(--wf-primary-soft); font-size: 1.15em; flex: 0 0 auto; }
.b-social.is-v-rows .b-social__label { font-weight: 650; flex: 1 1 auto; }
.b-social.is-v-rows .b-social__go { color: var(--wf-muted); }
`,
    },

    bar: {
      name: "胶囊横条",
      render(p) {
        const items = (p.items || []).map((it) => `<a class="b-social__chip" href="${esc(it.url || "#")}" target="_blank" rel="noopener">
          <span class="b-social__icon">${socialIcon(it)}</span>${esc(it.label || it.platform || "")}
        </a>`).join("");
        return `<div class="wb-inner">${headHTML(p, p.align === "center")}<div class="b-social__bar">${items}</div></div>`;
      },
      css: `
.b-social.is-v-bar .b-social__bar { display: flex; flex-wrap: wrap; gap: var(--wb-gap-sm); justify-content: center; }
.b-social.is-v-bar .b-social__chip { display: inline-flex; align-items: center; gap: var(--wb-gap-xs); padding: 9px 18px; border-radius: 999px; border: 1px solid var(--wb-line); background: var(--wf-bg); color: var(--wf-text); font-weight: 600; font-size: .92em; transition: background .2s var(--wb-ease), color .2s var(--wb-ease), border-color .2s var(--wb-ease); }
.b-social.is-v-bar .b-social__chip:hover { background: var(--wf-primary); border-color: var(--wf-primary); color: #fff; }
@media (max-width: 560px) {
  .b-social.is-v-bar .b-social__bar { flex-direction: column; align-items: stretch; }
  .b-social.is-v-bar .b-social__chip { justify-content: center; }
}
`,
    },
  });

  /* ============================ 博客文章 ============================ */
  WF.defineVariants("blog", {
    feature: {
      name: "头条特写",
      render(p, ctx) {
        const items = p.items || [];
        if (!items.length) return `<div class="wb-inner">${headHTML(p, p.align === "center")}<div class="wf-ph" data-label="暂无文章"></div></div>`;
        const f = items[0];
        const more = items.slice(1).map((it) => `<div class="b-blog__row">
          <span class="b-blog__rtitle">${esc(it.title || "")}</span>
          <span class="b-blog__rdate">${esc(it.date || "")}</span>
        </div>`).join("");
        return `<div class="wb-inner">
          ${headHTML(p, p.align === "center")}
          <div class="b-blog__featured">
            <div class="wb-media is-soft" data-ratio="4x3">${imgOrPh(f.image, "文章封面", "", ctx && ctx.lazy)}</div>
            <div class="wb-stack">
              ${blogMeta(f)}
              <h3 class="b-blog__ftitle">${esc(f.title || "")}</h3>
              <p class="b-blog__fexcerpt">${esc(f.excerpt || "")}</p>
            </div>
          </div>
          ${more ? `<div class="b-blog__more">${more}</div>` : ""}
        </div>`;
      },
      css: `
.b-blog.is-v-feature .b-blog__featured { display: grid; grid-template-columns: 1.05fr .95fr; gap: clamp(24px, 4vw, 48px); align-items: center; margin-bottom: 36px; }
.b-blog.is-v-feature .b-blog__ftitle { font-size: clamp(1.4em, 1.1em + 1.3vw, 2em); font-weight: 800; line-height: 1.3; }
.b-blog.is-v-feature .b-blog__fexcerpt { color: var(--wf-muted); line-height: 1.8; }
.b-blog.is-v-feature .b-blog__more { display: grid; gap: 0; }
.b-blog.is-v-feature .b-blog__row { display: flex; align-items: baseline; justify-content: space-between; gap: var(--wb-gap); padding: 16px 4px; border-top: 1px solid var(--wb-line); }
.b-blog.is-v-feature .b-blog__row:first-child { border-top: 0; }
.b-blog.is-v-feature .b-blog__rtitle { font-weight: 650; }
.b-blog.is-v-feature .b-blog__rdate { color: var(--wf-muted); font-size: .85em; white-space: nowrap; }
@media (max-width: 860px) {
  .b-blog.is-v-feature .b-blog__featured { grid-template-columns: 1fr; }
}
`,
    },

    list: {
      name: "列表纵排",
      render(p, ctx) {
        const items = (p.items || []).map((it) => `<article class="b-blog__item">
          <div class="wb-media" data-ratio="4x3">${imgOrPh(it.image, "文章封面", "", ctx && ctx.lazy)}</div>
          <div>
            ${blogMeta(it)}
            <h3 class="b-blog__title">${esc(it.title || "")}</h3>
            <p class="b-blog__excerpt">${esc(it.excerpt || "")}</p>
          </div>
        </article>`).join("");
        return `<div class="wb-inner">${headHTML(p, p.align === "center")}<div class="b-blog__list">${items}</div></div>`;
      },
      css: `
.b-blog.is-v-list .b-blog__list { display: grid; gap: var(--wb-gap); }
.b-blog.is-v-list .b-blog__item { display: grid; grid-template-columns: 220px 1fr; gap: var(--wb-gap); align-items: center; padding-bottom: 20px; border-bottom: 1px solid var(--wb-line); }
.b-blog.is-v-list .b-blog__title { font-size: var(--wf-fs-h2); font-weight: 750; margin: 8px 0; }
.b-blog.is-v-list .b-blog__excerpt { color: var(--wf-muted); font-size: var(--wf-fs-body); line-height: 1.7; }
@media (max-width: 860px) {
  .b-blog.is-v-list .b-blog__item { grid-template-columns: 140px 1fr; gap: var(--wb-gap-sm); }
}
@media (max-width: 560px) {
  .b-blog.is-v-list .b-blog__item { grid-template-columns: 1fr; }
}
`,
    },

    mosaic: {
      name: "错落拼贴",
      render(p, ctx) {
        const items = (p.items || []).map((it, i) => `<article class="b-blog__mcard">
          <div class="wb-media${i === 0 ? " is-soft" : ""}" data-ratio="${i === 0 ? "21x9" : "4x3"}">${imgOrPh(it.image, "文章封面", "", ctx && ctx.lazy)}</div>
          ${blogMeta(it)}
          <h3 class="b-blog__mtitle">${esc(it.title || "")}</h3>
          <p class="b-blog__mexcerpt">${esc(it.excerpt || "")}</p>
        </article>`).join("");
        return `<div class="wb-inner">${headHTML(p, p.align === "center")}<div class="b-blog__mosaic">${items}</div></div>`;
      },
      css: `
.b-blog.is-v-mosaic .b-blog__mosaic { display: grid; grid-template-columns: repeat(6, 1fr); gap: var(--wb-space-4); }
.b-blog.is-v-mosaic .b-blog__mcard { grid-column: span 2; display: flex; flex-direction: column; }
.b-blog.is-v-mosaic .b-blog__mcard:first-child { grid-column: span 4; }
.b-blog.is-v-mosaic .b-blog__mcard .wb-media { margin-bottom: 14px; }
.b-blog.is-v-mosaic .b-blog__mtitle { font-size: 1.08em; font-weight: 750; margin: 6px 0; }
.b-blog.is-v-mosaic .b-blog__mexcerpt { color: var(--wf-muted); font-size: .92em; line-height: 1.7; }
@media (max-width: 860px) {
  .b-blog.is-v-mosaic .b-blog__mosaic { grid-template-columns: repeat(2, 1fr); }
  .b-blog.is-v-mosaic .b-blog__mcard, .b-blog.is-v-mosaic .b-blog__mcard:first-child { grid-column: span 1; }
}
@media (max-width: 560px) {
  .b-blog.is-v-mosaic .b-blog__mosaic { grid-template-columns: 1fr; }
}
`,
    },
  });

  /* ============================ 产品展示 ============================ */
  WF.defineVariants("product-showcase", {
    feature: {
      name: "主推特写",
      render(p, ctx) {
        const items = p.items || [];
        if (!items.length) return `<div class="wb-inner">${headHTML(p, p.align === "center")}<div class="wf-ph" data-label="暂无产品"></div></div>`;
        const f = items[0];
        const more = items.slice(1).map((it) => `<div class="b-product__mini">
          <div class="wb-media" data-ratio="4x3">${imgOrPh(it.image, "产品图片", "", ctx && ctx.lazy)}</div>
          <div class="b-product__minibody">
            <span class="b-product__mininame">${esc(it.name || "")}</span>
            <span class="b-product__current-price">${esc(it.price || "")}</span>
          </div>
        </div>`).join("");
        return `<div class="wb-inner">
          ${headHTML(p, p.align === "center")}
          <div class="b-product__featured">
            <div class="wb-media is-soft" data-ratio="1">
              ${f.badge ? `<span class="b-product__badge">${esc(f.badge)}</span>` : ""}
              ${imgOrPh(f.image, "产品图片", "", ctx && ctx.lazy)}
            </div>
            <div class="wb-stack">
              <h3 class="b-product__ftitle">${esc(f.name || "")}</h3>
              ${f.desc ? `<p class="b-product__fdesc">${esc(f.desc)}</p>` : ""}
              ${priceHTML(f, "b-product__fprice")}
              ${p.btnText ? `<div>${btn(p.btnText, "#")}</div>` : ""}
            </div>
          </div>
          ${more ? `<div class="b-product__more">${more}</div>` : ""}
        </div>`;
      },
      css: `
.b-product-showcase.is-v-feature .b-product__featured { display: grid; grid-template-columns: 1.05fr .95fr; gap: clamp(24px, 4vw, 52px); align-items: center; margin-bottom: 36px; }
.b-product-showcase.is-v-feature .b-product__ftitle { font-size: clamp(1.5em, 1.15em + 1.4vw, 2.1em); font-weight: 800; }
.b-product-showcase.is-v-feature .b-product__fdesc { color: var(--wf-muted); line-height: 1.8; }
.b-product-showcase.is-v-feature .b-product__fprice { display: flex; align-items: baseline; gap: var(--wb-gap-sm); }
.b-product-showcase.is-v-feature .b-product__fprice .b-product__current-price { font-size: 2em; }
.b-product-showcase.is-v-feature .b-product__more { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: var(--wb-gap); }
.b-product-showcase.is-v-feature .b-product__mini { border: 1px solid var(--wb-line); border-radius: var(--wb-radius-md); overflow: hidden; background: var(--wf-bg); }
.b-product-showcase.is-v-feature .b-product__minibody { padding: 12px 14px; display: flex; align-items: baseline; justify-content: space-between; gap: var(--wb-gap-xs); }
.b-product-showcase.is-v-feature .b-product__mininame { font-weight: 650; font-size: .92em; }
@media (max-width: 860px) {
  .b-product-showcase.is-v-feature .b-product__featured { grid-template-columns: 1fr; }
}
`,
    },

    list: {
      name: "横向清单",
      render(p, ctx) {
        const rows = (p.items || []).map((it) => `<div class="b-product__row">
          <div class="wb-media b-product__thumb" data-ratio="1">
            ${it.badge ? `<span class="b-product__badge">${esc(it.badge)}</span>` : ""}
            ${imgOrPh(it.image, "产品图片", "", ctx && ctx.lazy)}
          </div>
          <div>
            <div class="b-product__pname">${esc(it.name || "")}</div>
            ${it.desc ? `<div class="b-product__pdesc">${esc(it.desc)}</div>` : ""}
            ${priceHTML(it, "b-product__prices")}
          </div>
          <div class="b-product__buy">
            ${p.btnText ? btn(p.btnText, "#") : ""}
          </div>
        </div>`).join("");
        return `<div class="wb-inner">${headHTML(p, p.align === "center")}<div class="b-product__list">${rows}</div></div>`;
      },
      css: `
.b-product-showcase.is-v-list .b-product__list { display: grid; gap: var(--wb-gap-sm); }
.b-product-showcase.is-v-list .b-product__row { display: grid; grid-template-columns: 150px 1fr auto; gap: var(--wb-gap); align-items: center; padding: var(--wb-chip-pad); border: 1px solid var(--wb-line); border-radius: var(--wb-radius-lg); background: var(--wf-bg); transition: border-color .2s var(--wb-ease), transform .2s var(--wb-ease); }
.b-product-showcase.is-v-list .b-product__row:hover { border-color: var(--wf-primary); transform: translateX(4px); }
.b-product-showcase.is-v-list .b-product__thumb { border-radius: var(--wb-radius-md); }
.b-product-showcase.is-v-list .b-product__pname { font-weight: 750; font-size: 1.06em; }
.b-product-showcase.is-v-list .b-product__pdesc { color: var(--wf-muted); font-size: .9em; margin-top: 4px; }
.b-product-showcase.is-v-list .b-product__prices { display: flex; align-items: baseline; gap: var(--wb-gap-xs); margin-top: 8px; }
.b-product-showcase.is-v-list .b-product__buy { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
@media (max-width: 860px) {
  .b-product-showcase.is-v-list .b-product__row { grid-template-columns: 110px 1fr; }
  .b-product-showcase.is-v-list .b-product__buy { grid-column: 2; align-items: flex-start; }
}
@media (max-width: 560px) {
  .b-product-showcase.is-v-list .b-product__row { grid-template-columns: 1fr; }
  .b-product-showcase.is-v-list .b-product__thumb { max-width: 160px; }
}
`,
    },

    mosaic: {
      name: "拼贴橱窗",
      render(p, ctx) {
        const items = (p.items || []).map((it, i) => `<div class="b-product__mcard">
          <div class="wb-media" data-ratio="${i === 0 ? "21x9" : "1"}">
            ${it.badge ? `<span class="b-product__badge">${esc(it.badge)}</span>` : ""}
            ${imgOrPh(it.image, "产品图片", "", ctx && ctx.lazy)}
          </div>
          <div class="b-product__mbody">
            <div class="b-product__mname">${esc(it.name || "")}</div>
            ${it.desc ? `<div class="b-product__mdesc">${esc(it.desc)}</div>` : ""}
            ${priceHTML(it, "b-product__mprice")}
            ${p.btnText ? `<div class="b-product__mbuy">${btn(p.btnText, "#")}</div>` : ""}
          </div>
        </div>`).join("");
        return `<div class="wb-inner">${headHTML(p, p.align === "center")}<div class="b-product__mosaic">${items}</div>${p.btnText ? `<div class="b-product__cta">${btn(p.btnText, "#")}</div>` : ""}</div>`;
      },
      css: `
.b-product-showcase.is-v-mosaic .b-product__mosaic { display: grid; grid-template-columns: repeat(6, 1fr); gap: var(--wb-space-4); }
.b-product-showcase.is-v-mosaic .b-product__mcard { grid-column: span 2; border: 1px solid var(--wb-line); border-radius: var(--wb-radius-lg); overflow: hidden; background: var(--wf-bg); display: flex; flex-direction: column; transition: transform .25s var(--wb-ease), box-shadow .25s var(--wb-ease); }
.b-product-showcase.is-v-mosaic .b-product__mcard:hover { transform: translateY(-4px); box-shadow: var(--wb-shadow-md); }
.b-product-showcase.is-v-mosaic .b-product__mcard:first-child { grid-column: span 4; }
.b-product-showcase.is-v-mosaic .b-product__mbody { padding: 14px 16px 18px; display: flex; flex-direction: column; gap: 6px; flex: 1 1 auto; }
.b-product-showcase.is-v-mosaic .b-product__mname { font-weight: 750; }
.b-product-showcase.is-v-mosaic .b-product__mdesc { color: var(--wf-muted); font-size: .9em; }
.b-product-showcase.is-v-mosaic .b-product__mprice { display: flex; align-items: baseline; gap: var(--wb-gap-xs); margin-top: auto; padding-top: 8px; }
.b-product-showcase.is-v-mosaic .b-product__mbuy { margin-top: 6px; }
.b-product-showcase.is-v-mosaic .b-product__mbuy .wf-btn { padding: 8px 16px; font-size: .86em; }
@media (max-width: 860px) {
  .b-product-showcase.is-v-mosaic .b-product__mosaic { grid-template-columns: repeat(2, 1fr); }
  .b-product-showcase.is-v-mosaic .b-product__mcard, .b-product-showcase.is-v-mosaic .b-product__mcard:first-child { grid-column: span 1; }
}
@media (max-width: 560px) {
  .b-product-showcase.is-v-mosaic .b-product__mosaic { grid-template-columns: 1fr; }
}
`,
    },
  });

  /* ============================ 团队成员 ============================ */
  WF.defineVariants("team", {
    spotlight: {
      name: "主理人特写",
      render(p, ctx) {
        const items = p.items || [];
        if (!items.length) return `<div class="wb-inner">${headHTML(p, p.align === "center")}<div class="wf-ph" data-label="暂无成员"></div></div>`;
        const lead = items[0];
        const chips = items.slice(1).map((it) => `<div class="b-team__chip">
          ${avatarHTML(it, "b-team__chipav")}
          <div><div class="b-team__chipname">${esc(it.name || "")}</div><div class="wb-role">${esc(it.role || "")}</div></div>
        </div>`).join("");
        return `<div class="wb-inner">
          ${headHTML(p, p.align === "center")}
          <div class="b-team__spot">
            ${avatarHTML(lead, "b-team__bigav")}
            <div>
              <h3 class="b-team__sname">${esc(lead.name || "")}</h3>
              <div class="b-team__srole">${esc(lead.role || "")}</div>
              ${lead.bio ? `<p class="b-team__sbio">${esc(lead.bio)}</p>` : ""}
            </div>
          </div>
          ${chips ? `<div class="b-team__chips">${chips}</div>` : ""}
        </div>`;
      },
      css: `
.b-team.is-v-spotlight .wb-avatar > .wf-ph { width: 100%; height: 100%; min-height: 0; }
.b-team.is-v-spotlight .b-team__spot { display: grid; grid-template-columns: .8fr 1.2fr; gap: clamp(24px, 4vw, 52px); align-items: center; padding-bottom: 36px; margin-bottom: 32px; border-bottom: 1px solid var(--wb-line); }
.b-team.is-v-spotlight .b-team__bigav { width: min(240px, 60vw); height: min(240px, 60vw); margin: 0 auto; }
.b-team.is-v-spotlight .b-team__sname { font-size: clamp(1.5em, 1.2em + 1.2vw, 2em); font-weight: 800; }
.b-team.is-v-spotlight .b-team__srole { color: var(--wf-primary); font-weight: 650; margin-top: 6px; }
.b-team.is-v-spotlight .b-team__sbio { color: var(--wf-muted); margin-top: 16px; line-height: 1.8; }
.b-team.is-v-spotlight .b-team__chips { display: flex; flex-wrap: wrap; gap: var(--wb-gap-sm); }
.b-team.is-v-spotlight .b-team__chip { display: flex; align-items: center; gap: var(--wb-gap-sm); padding: 10px 16px 10px 10px; border: 1px solid var(--wb-line); border-radius: 999px; background: var(--wf-bg); }
.b-team.is-v-spotlight .b-team__chipav { width: 40px; height: 40px; }
.b-team.is-v-spotlight .b-team__chipname { font-weight: 650; font-size: .92em; }
@media (max-width: 860px) {
  .b-team.is-v-spotlight .b-team__spot { grid-template-columns: 1fr; text-align: center; }
}
`,
    },

    list: {
      name: "名录纵排",
      render(p) {
        const rows = (p.items || []).map((it) => `<div class="b-team__row">
          ${avatarHTML(it, "b-team__rav")}
          <div>
            <div class="b-team__rname">${esc(it.name || "")}</div>
            <div class="b-team__rrole">${esc(it.role || "")}</div>
            ${it.bio ? `<p class="b-team__rbio">${esc(it.bio)}</p>` : ""}
          </div>
        </div>`).join("");
        return `<div class="wb-inner">${headHTML(p, p.align === "center")}<div class="b-team__list">${rows}</div></div>`;
      },
      css: `
.b-team.is-v-list .wb-avatar > .wf-ph { width: 100%; height: 100%; min-height: 0; }
.b-team.is-v-list .b-team__list { display: grid; gap: var(--wb-gap-sm); }
.b-team.is-v-list .b-team__row { display: grid; grid-template-columns: 72px 1fr; gap: var(--wb-gap); align-items: start; padding: 18px 4px; border-top: 1px solid var(--wb-line); }
.b-team.is-v-list .b-team__row:first-child { border-top: 0; }
.b-team.is-v-list .b-team__rav { width: 72px; height: 72px; }
.b-team.is-v-list .b-team__rname { font-weight: 750; font-size: 1.05em; }
.b-team.is-v-list .b-team__rrole { color: var(--wf-primary); font-size: .86em; font-weight: 600; margin-top: 2px; }
.b-team.is-v-list .b-team__rbio { color: var(--wf-muted); font-size: .92em; margin-top: 8px; line-height: 1.7; }
@media (max-width: 560px) {
  .b-team.is-v-list .b-team__row { grid-template-columns: 56px 1fr; gap: var(--wb-gap-sm); }
  .b-team.is-v-list .b-team__rav { width: 56px; height: 56px; }
}
`,
    },

    cards: {
      name: "卡片栅格",
      render(p) {
        const cards = (p.items || []).map((it) => `<div class="b-team__card">
          ${avatarHTML(it, "b-team__cav")}
          <div class="b-team__cname">${esc(it.name || "")}</div>
          <div class="b-team__crole">${esc(it.role || "")}</div>
          ${it.bio ? `<p class="b-team__cbio">${esc(it.bio)}</p>` : ""}
        </div>`).join("");
        return `<div class="wb-inner">${headHTML(p, p.align === "center")}<div class="b-team__cards">${cards}</div></div>`;
      },
      css: `
.b-team.is-v-cards .wb-avatar > .wf-ph { width: 100%; height: 100%; min-height: 0; }
.b-team.is-v-cards .b-team__cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--wb-gap); }
.b-team.is-v-cards .b-team__card { border: 1px solid var(--wb-line); border-radius: var(--wb-radius-lg); padding: var(--wb-card-pad); background: var(--wf-bg); box-shadow: var(--wb-shadow-sm); text-align: center; transition: transform .25s var(--wb-ease), box-shadow .25s var(--wb-ease); }
.b-team.is-v-cards .b-team__card:hover { transform: translateY(-4px); box-shadow: var(--wb-shadow-md); }
.b-team.is-v-cards .b-team__cav { width: 88px; height: 88px; margin: 0 auto 16px; }
.b-team.is-v-cards .b-team__cname { font-weight: 750; }
.b-team.is-v-cards .b-team__crole { color: var(--wf-muted); font-size: .86em; margin-top: 4px; }
.b-team.is-v-cards .b-team__cbio { color: var(--wf-muted); font-size: .9em; margin-top: 12px; line-height: 1.7; }
`,
    },
  });

  /* ============================ 信任数字条 ============================ */
  WF.defineVariants("proof", {
    band: {
      name: "横幅数据带",
      render(p) {
        const cols = p.cols || "3";
        const cells = (p.items || []).map((it) => `<div class="b-proof__cell">
          <div class="wb-kpi">${esc(it.value || "")}</div>
          <div class="wb-kpi__label">${esc(it.label || "")}</div>
        </div>`).join("");
        return `<div class="wb-inner is-tight" style="--wb-cols:${esc(cols)}">
          <div class="b-proof__band">${cells}</div>
          ${p.note ? `<div class="b-proof__note wb-muted">${esc(p.note)}</div>` : ""}
        </div>`;
      },
      css: `
.b-proof.is-v-band { background: color-mix(in srgb, var(--wf-primary) 6%, var(--wf-surface)); }
.b-proof.is-v-band .b-proof__band { display: grid; grid-template-columns: repeat(var(--wb-cols, 3), 1fr); gap: var(--wb-gap); text-align: center; }
.b-proof.is-v-band .b-proof__cell { position: relative; padding: 10px 16px; }
.b-proof.is-v-band .b-proof__cell + .b-proof__cell::before { content: ""; position: absolute; left: -10px; top: 12%; bottom: 12%; width: 1px; background: var(--wb-line); }
.b-proof.is-v-band .wb-kpi { color: var(--wf-primary); }
.b-proof.is-v-band .b-proof__note { text-align: center; margin-top: 26px; }
@media (max-width: 860px) {
  .b-proof.is-v-band .b-proof__band { grid-template-columns: repeat(2, 1fr); }
  .b-proof.is-v-band .b-proof__cell + .b-proof__cell::before { display: none; }
}
@media (max-width: 560px) {
  .b-proof.is-v-band .b-proof__band { grid-template-columns: 1fr; }
}
`,
    },

    stack: {
      name: "纵向清单",
      render(p) {
        const rows = (p.items || []).map((it) => `<div class="b-proof__srow">
          <div class="wb-kpi b-proof__sval">${esc(it.value || "")}</div>
          <div class="b-proof__label">${esc(it.label || "")}</div>
        </div>`).join("");
        return `<div class="wb-inner">
          <div class="b-proof__stack">${rows}</div>
          ${p.note ? `<div class="b-proof__note wb-muted">${esc(p.note)}</div>` : ""}
        </div>`;
      },
      css: `
.b-proof.is-v-stack .b-proof__stack { display: grid; gap: 0; max-width: 820px; margin: 0 auto; }
.b-proof.is-v-stack .b-proof__srow { display: grid; grid-template-columns: minmax(120px, auto) 1fr; align-items: baseline; gap: var(--wb-gap-lg); padding: 22px 4px; border-top: 1px solid var(--wb-line); }
.b-proof.is-v-stack .b-proof__srow:first-child { border-top: 0; }
.b-proof.is-v-stack .b-proof__sval { color: var(--wf-primary); }
.b-proof.is-v-stack .b-proof__label { color: var(--wf-muted); text-align: right; }
.b-proof.is-v-stack .b-proof__note { text-align: right; margin-top: 22px; }
@media (max-width: 560px) {
  .b-proof.is-v-stack .b-proof__srow { grid-template-columns: 1fr; gap: 6px; }
  .b-proof.is-v-stack .b-proof__label { text-align: left; }
  .b-proof.is-v-stack .b-proof__note { text-align: left; }
}
`,
    },

    mosaic: {
      name: "错落磁贴",
      render(p) {
        const cells = (p.items || []).map((it, i) => `<div class="b-proof__mcell">
          <div class="wb-kpi">${esc(it.value || "")}</div>
          <div class="wb-kpi__label">${esc(it.label || "")}</div>
          <span class="wb-bar" style="margin-top:18px"><span style="width:${40 + ((i * 17) % 55)}%"></span></span>
        </div>`).join("");
        return `<div class="wb-inner">
          <div class="b-proof__mosaic">${cells}</div>
          ${p.note ? `<div class="b-proof__note wb-muted">${esc(p.note)}</div>` : ""}
        </div>`;
      },
      css: `
.b-proof.is-v-mosaic .b-proof__mosaic { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--wb-gap); }
.b-proof.is-v-mosaic .b-proof__mcell { padding: var(--wb-card-pad); border: 1px solid var(--wb-line); border-radius: var(--wb-radius-lg); background: var(--wf-bg); box-shadow: var(--wb-shadow-sm); transition: transform .25s var(--wb-ease), box-shadow .25s var(--wb-ease); }
.b-proof.is-v-mosaic .b-proof__mcell:hover { transform: translateY(-4px); box-shadow: var(--wb-shadow-md); }
.b-proof.is-v-mosaic .b-proof__mcell:nth-child(even) { background: var(--wf-primary-soft); border-color: color-mix(in srgb, var(--wf-primary) 20%, transparent); }
.b-proof.is-v-mosaic .b-proof__note { text-align: center; margin-top: 22px; }
`,
    },
  });
})(window.WF);
