/* ============================================================
 * WebsFlow · 运行时样式(runtime-css.js)
 * 以 JS 字符串内嵌,编辑器注入 <style>,导出时原样内联进单文件 HTML
 * —— 保证画布与导出页像素级一致(所见即所得),且兼容 file:// 打开。
 * ============================================================ */
window.WF = window.WF || {};
WF.runtimeCSS = `
/* ---------- 主题变量(由主题预设经 CSS 变量注入) ---------- */
.wf-root {
  --wf-primary: #4f46e5;
  --wf-primary-soft: #eef2ff;
  --wf-bg: #ffffff;
  --wf-surface: #f8fafc;
  --wf-text: #111827;
  --wf-muted: #64748b;
  --wf-border: #e2e8f0;
  --wf-radius: 16px;
  --wf-font: -apple-system, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Segoe UI", sans-serif;
  --wf-heading-font: var(--wf-font);
  --wf-font-scale: 1;

  font-family: var(--wf-font);
  color: var(--wf-text);
  background: var(--wf-bg);
  font-size: calc(16px * var(--wf-font-scale));
  line-height: 1.7;
  -webkit-font-smoothing: antialiased;
}
.wf-root * { box-sizing: border-box; }
.wf-root h1, .wf-root h2, .wf-root h3, .wf-root h4 {
  font-family: var(--wf-heading-font);
  line-height: 1.25;
  margin: 0;
  letter-spacing: -0.01em;
}
.wf-root p { margin: 0; }
.wf-root img { max-width: 100%; display: block; }
.wf-root a { color: inherit; text-decoration: none; }
.wf-page { min-height: 40vh; }

@keyframes wf-rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }

/* 模块通用容器 */
.wf-block { position: relative; }
.wb-inner { max-width: 1120px; margin: 0 auto; padding: 72px 24px; }
.wb-inner.is-tight { padding: 40px 24px; }
.wb-inner.is-loose { padding: 104px 24px; }
.wf-block[data-pad="tight"] .wb-inner { padding: 40px 24px; }
.wf-block[data-pad="loose"] .wb-inner { padding: 104px 24px; }

/* 模块标题组合 */
.wb-head { margin-bottom: 40px; max-width: 640px; }
.wb-head.is-center { margin-left: auto; margin-right: auto; text-align: center; }
.wb-eyebrow { display: inline-block; font-size: 13px; font-weight: 600; letter-spacing: 0.12em; color: var(--wf-primary); text-transform: uppercase; margin-bottom: 12px; }
.wb-title { font-size: 2em; font-weight: 700; }
.wb-subtitle { margin-top: 12px; color: var(--wf-muted); font-size: 1.05em; }

/* 按钮 */
.wf-btn {
  display: inline-flex; align-items: center; gap: 8px; justify-content: center;
  padding: 12px 26px; border-radius: calc(var(--wf-radius) * 0.75);
  font-weight: 600; font-size: 0.95em; border: 1px solid transparent;
  cursor: pointer; transition: transform .15s ease, box-shadow .15s ease, background .15s ease;
  font-family: var(--wf-font);
}
.wf-btn:hover { transform: translateY(-1px); }
.wf-btn.is-primary { background: var(--wf-primary); color: #fff; box-shadow: 0 8px 20px -8px var(--wf-primary); }
.wf-btn.is-ghost { border-color: var(--wf-border); color: var(--wf-text); background: transparent; }
.wf-btn.is-light { background: #fff; color: var(--wf-text); }
.wf-btn.is-outline-light { border-color: rgba(255,255,255,.5); color: #fff; background: transparent; }
.wf-btn-group { display: flex; gap: 12px; flex-wrap: wrap; }

/* 占位图(未填图片时的兜底) */
.wf-ph {
  width: 100%; height: 100%; min-height: 120px; display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, var(--wf-primary-soft), var(--wf-surface));
  color: var(--wf-primary); font-weight: 700; letter-spacing: .08em; font-size: 15px;
}
.wf-ph::after { content: attr(data-label); opacity: .7; }

/* ---------- 入场动画 ---------- */
.wf-root [data-reveal] { opacity: 0; transform: translateY(26px); transition: opacity .7s ease, transform .7s cubic-bezier(.2,.7,.3,1); transition-delay: var(--wf-delay, 0ms); }
.wf-root [data-reveal="left"] { transform: translateX(-32px); }
.wf-root [data-reveal="right"] { transform: translateX(32px); }
.wf-root [data-reveal="zoom"] { transform: scale(.92); }
.wf-root [data-reveal="none"] { transform: none; }
.wf-root [data-reveal].is-in { opacity: 1; transform: none; }

/* ---------- 图片懒加载 ---------- */
img[data-src] { background: var(--wf-surface); transition: opacity .3s ease; }
img[data-src].loaded { opacity: 1; }
.wf-ph { background: linear-gradient(135deg, var(--wf-primary-soft), var(--wf-surface)); }

/* ============ nav 导航栏 ============ */
.b-nav { position: sticky; top: 0; z-index: 50; background: color-mix(in srgb, var(--wf-bg) 88%, transparent); backdrop-filter: blur(12px); border-bottom: 1px solid var(--wf-border); }
.b-nav__inner { max-width: 1120px; margin: 0 auto; padding: 14px 24px; display: flex; align-items: center; justify-content: space-between; gap: 24px; }
.b-nav__brand { font-weight: 700; font-size: 1.1em; display: flex; align-items: center; gap: 10px; }
.b-nav__logo { width: 30px; height: 30px; border-radius: 9px; background: var(--wf-primary); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 14px; }
.b-nav__links { display: flex; gap: 26px; font-size: .95em; color: var(--wf-muted); }
.b-nav__links a:hover { color: var(--wf-primary); }
.b-nav__cta { padding: 8px 18px; font-size: .9em; }

/* ============ hero 主视觉 ============ */
.b-hero { position: relative; overflow: hidden; }
.b-hero__inner { max-width: 1120px; margin: 0 auto; padding: 108px 24px; position: relative; z-index: 1; }
.b-hero.is-center .b-hero__inner { text-align: center; }
.b-hero.is-center .wf-btn-group { justify-content: center; }
.b-hero__title { font-size: var(--wf-fs-h1); font-weight: 800; letter-spacing: -0.02em; }
.b-hero__subtitle { margin-top: 18px; font-size: 1.2em; color: var(--wf-muted); max-width: 620px; }
.b-hero.is-center .b-hero__subtitle { margin-left: auto; margin-right: auto; }
.b-hero__btns { margin-top: 34px; }
.b-hero__badge { display: inline-flex; align-items: center; padding: 6px 14px; border-radius: 999px; background: color-mix(in srgb, var(--wf-bg) 75%, transparent); border: 1px solid var(--wf-border); font-size: .85em; font-weight: 600; margin-bottom: 20px; color: var(--wf-text); }
.b-hero__bg { position: absolute; inset: 0; background: var(--wb-hero-bg, var(--wf-surface)); }
.b-hero__bg.is-image { background-size: cover; background-position: center; }
.b-hero__bg.is-image::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,.3), rgba(0,0,0,.08)); }
.b-hero.has-dark-bg { color: #fff; }
.b-hero.has-dark-bg .b-hero__subtitle { color: rgba(255,255,255,.85); }
.b-hero.has-dark-bg .b-hero__badge { background: rgba(255,255,255,.14); border-color: rgba(255,255,255,.3); color: #fff; }

/* ============ text 文字段落 ============ */
.b-text .wb-inner { max-width: 760px; }
.b-text__title { font-size: 1.7em; font-weight: 700; margin-bottom: 18px; }
.b-text__body { color: var(--wf-muted); font-size: 1.08em; white-space: pre-line; }
.b-text.is-center { text-align: center; }

/* ============ split 图文分栏 ============ */
.b-split__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 56px; align-items: center; }
.b-split__media { aspect-ratio: 4 / 3; border-radius: var(--wf-radius); overflow: hidden; box-shadow: 0 24px 48px -24px rgba(15,23,42,.25); }
.b-split__media img { width: 100%; height: 100%; object-fit: cover; }
.b-split__title { font-size: 1.9em; font-weight: 700; }
.b-split__body { margin-top: 16px; color: var(--wf-muted); white-space: pre-line; }
.b-split__btn { margin-top: 26px; }
.b-split.is-flip .b-split__grid > :first-child { order: 2; }
.b-split.is-flip .b-split__grid > :last-child { order: 1; }

/* ============ features 特性网格 ============ */
.b-features__grid { display: grid; gap: 20px; grid-template-columns: repeat(var(--wb-cols, 3), 1fr); }
.b-feature { background: var(--wf-surface); border: 1px solid var(--wf-border); border-radius: var(--wf-radius); padding: 26px; transition: transform .2s ease, box-shadow .2s ease; }
.b-feature:hover { transform: translateY(-4px); box-shadow: 0 18px 36px -20px rgba(15,23,42,.25); }
.b-feature__icon { width: 46px; height: 46px; border-radius: 12px; background: var(--wf-primary-soft); display: flex; align-items: center; justify-content: center; font-size: 22px; margin-bottom: 16px; }
.b-feature__title { font-size: 1.08em; font-weight: 700; }
.b-feature__desc { margin-top: 8px; color: var(--wf-muted); font-size: .95em; }

/* ============ gallery 图片墙 ============ */
.b-gallery__grid { display: grid; gap: 14px; grid-template-columns: repeat(var(--wb-cols, 3), 1fr); }
.b-gallery__item { border-radius: var(--wf-radius); overflow: hidden; aspect-ratio: 4 / 3; position: relative; background: var(--wf-surface); }
.b-gallery__item img { width: 100%; height: 100%; object-fit: cover; transition: transform .35s ease; }
.b-gallery__item:hover img { transform: scale(1.04); }
.b-gallery__cap { position: absolute; left: 0; right: 0; bottom: 0; padding: 26px 14px 12px; font-size: .88em; color: #fff; background: linear-gradient(transparent, rgba(0,0,0,.55)); }

/* ============ stats 数据统计 ============ */
.b-stats__grid { display: grid; gap: 20px; grid-template-columns: repeat(var(--wb-cols, 4), 1fr); text-align: center; }
.b-stat__value { font-size: 2.6em; font-weight: 800; font-family: var(--wf-heading-font); color: var(--wf-primary); letter-spacing: -0.02em; }
.b-stat__label { margin-top: 6px; color: var(--wf-muted); font-size: .95em; }

/* ============ timeline 时间线 ============ */
.b-timeline__list { position: relative; max-width: 680px; margin: 0 auto; }
.b-timeline__list::before { content: ""; position: absolute; left: 9px; top: 8px; bottom: 8px; width: 2px; background: var(--wf-border); }
.b-tl__item { position: relative; padding: 0 0 34px 44px; }
.b-tl__item:last-child { padding-bottom: 0; }
.b-tl__dot { position: absolute; left: 0; top: 4px; width: 20px; height: 20px; border-radius: 50%; background: var(--wf-primary); border: 4px solid var(--wf-primary-soft); }
.b-tl__time { font-size: .85em; font-weight: 600; color: var(--wf-primary); letter-spacing: .04em; }
.b-tl__title { font-size: 1.15em; font-weight: 700; margin-top: 4px; }
.b-tl__desc { color: var(--wf-muted); margin-top: 6px; }

/* ============ pricing 价格表 ============ */
.b-pricing__grid { display: grid; gap: 20px; grid-template-columns: repeat(var(--wb-cols, 3), 1fr); align-items: stretch; }
.b-price { background: var(--wf-surface); border: 1px solid var(--wf-border); border-radius: var(--wf-radius); padding: 30px; display: flex; flex-direction: column; position: relative; }
.b-price.is-featured { border-color: var(--wf-primary); box-shadow: 0 24px 48px -24px var(--wf-primary); background: var(--wf-bg); transform: scale(1.02); }
.b-price__badge { position: absolute; top: -13px; left: 50%; transform: translateX(-50%); background: var(--wf-primary); color: #fff; font-size: .78em; font-weight: 600; padding: 4px 14px; border-radius: 999px; white-space: nowrap; }
.b-price__name { font-weight: 700; font-size: 1.1em; }
.b-price__amount { margin-top: 12px; font-size: 2.2em; font-weight: 800; font-family: var(--wf-heading-font); }
.b-price__unit { font-size: .45em; font-weight: 500; color: var(--wf-muted); margin-left: 4px; }
.b-price__desc { color: var(--wf-muted); font-size: .92em; margin-top: 8px; }
.b-price__feats { list-style: none; margin: 20px 0; padding: 0; display: grid; gap: 10px; font-size: .95em; flex: 1; align-content: start; }
.b-price__feats li { display: flex; gap: 8px; align-items: flex-start; }
.b-price__feats li::before { content: "✓"; color: var(--wf-primary); font-weight: 700; }
.b-price__btn { width: 100%; }

/* ============ testimonials 用户评价 ============ */
.b-testi__grid { display: grid; gap: 20px; grid-template-columns: repeat(var(--wb-cols, 3), 1fr); }
.b-testi { background: var(--wf-surface); border: 1px solid var(--wf-border); border-radius: var(--wf-radius); padding: 26px; display: flex; flex-direction: column; gap: 16px; }
.b-testi__quote { flex: 1; font-size: 1em; }
.b-testi__quote::before { content: "\\201C"; color: var(--wf-primary); font-size: 1.6em; font-weight: 700; line-height: 0; margin-right: 2px; }
.b-testi__who { display: flex; align-items: center; gap: 12px; }
.b-testi__avatar { width: 42px; height: 42px; border-radius: 50%; background: var(--wf-primary-soft); color: var(--wf-primary); display: flex; align-items: center; justify-content: center; font-weight: 700; overflow: hidden; flex: none; }
.b-testi__avatar img { width: 100%; height: 100%; object-fit: cover; }
.b-testi__name { font-weight: 700; font-size: .95em; }
.b-testi__role { color: var(--wf-muted); font-size: .82em; }

/* ============ faq 常见问题 ============ */
.b-faq__list { max-width: 760px; margin: 0 auto; display: grid; gap: 12px; }
.b-faq__item { background: var(--wf-surface); border: 1px solid var(--wf-border); border-radius: calc(var(--wf-radius) * 0.8); overflow: hidden; }
.b-faq__q { width: 100%; text-align: left; background: none; border: none; font: inherit; font-weight: 600; padding: 18px 20px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; gap: 16px; color: var(--wf-text); }
.b-faq__q::after { content: "+"; font-size: 1.3em; color: var(--wf-primary); transition: transform .25s ease; flex: none; }
.b-faq__item.is-open .b-faq__q::after { transform: rotate(45deg); }
.b-faq__a { max-height: 0; overflow: hidden; transition: max-height .3s ease; }
.b-faq__a-inner { padding: 0 20px 18px; color: var(--wf-muted); white-space: pre-line; }

/* ============ cta 行动号召 ============ */
.b-cta__panel { border-radius: var(--wf-radius); padding: 56px 40px; text-align: center; background: var(--wf-primary); color: #fff; position: relative; overflow: hidden; }
.b-cta__panel.is-gradient { background: linear-gradient(120deg, var(--wf-primary), color-mix(in srgb, var(--wf-primary) 55%, #9333ea)); }
.b-cta__panel.is-surface { background: var(--wf-surface); color: var(--wf-text); border: 1px solid var(--wf-border); }
.b-cta__title { font-size: 1.9em; font-weight: 800; }
.b-cta__subtitle { margin-top: 12px; opacity: .85; }
.b-cta__btns { margin-top: 28px; }

/* ============ video 视频 ============ */
.b-video__frame { aspect-ratio: 16 / 9; border-radius: var(--wf-radius); overflow: hidden; background: #0f172a; box-shadow: 0 24px 48px -24px rgba(15,23,42,.4); }
.b-video__frame iframe { width: 100%; height: 100%; border: 0; display: block; }
.b-video__frame > .b-video__tip { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #94a3b8; gap: 10px; font-size: .95em; }

/* ============ tabs 选项卡 ============ */
.b-tabs__bar { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; margin-bottom: 28px; }
.b-tabs__tab { padding: 9px 20px; border-radius: 999px; border: 1px solid var(--wf-border); background: var(--wf-bg); font: inherit; font-size: .95em; font-weight: 600; cursor: pointer; color: var(--wf-muted); }
.b-tabs__tab.is-active { background: var(--wf-primary); border-color: var(--wf-primary); color: #fff; }
.b-tabs__panel { display: none; }
.b-tabs__panel.is-active { display: block; animation: wf-fadein .35s ease; }
.b-tabs__media { aspect-ratio: 16 / 8; border-radius: var(--wf-radius); overflow: hidden; margin-bottom: 20px; }
.b-tabs__media img { width: 100%; height: 100%; object-fit: cover; }
.b-tabs__title { font-size: 1.3em; font-weight: 700; margin-bottom: 10px; text-align: center; }
.b-tabs__body { color: var(--wf-muted); max-width: 680px; margin: 0 auto; text-align: center; white-space: pre-line; }
@keyframes wf-fadein { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }

/* ============ countdown 倒计时 ============ */
.b-countdown__panel { text-align: center; background: var(--wf-surface); border: 1px solid var(--wf-border); border-radius: var(--wf-radius); padding: 44px 24px; }
.b-countdown__title { font-size: 1.4em; font-weight: 700; }
.b-countdown__note { color: var(--wf-muted); margin-top: 10px; font-size: .95em; }
.b-countdown__digits { display: flex; justify-content: center; gap: 14px; margin-top: 26px; flex-wrap: wrap; }
.b-countdown__cell { min-width: 86px; padding: 14px 10px; background: var(--wf-bg); border: 1px solid var(--wf-border); border-radius: var(--wf-radius); }
.b-countdown__num { font-size: 2.1em; font-weight: 800; font-family: var(--wf-heading-font); color: var(--wf-primary); font-variant-numeric: tabular-nums; }
.b-countdown__unit { font-size: .8em; color: var(--wf-muted); margin-top: 2px; }

/* ============ quiz 互动问答 ============ */
.b-quiz__panel { max-width: 640px; margin: 0 auto; background: var(--wf-surface); border: 1px solid var(--wf-border); border-radius: var(--wf-radius); padding: 34px; }
.b-quiz__q { font-size: 1.25em; font-weight: 700; white-space: pre-line; }
.b-quiz__opts { display: grid; gap: 12px; margin-top: 22px; }
.b-quiz__opt { text-align: left; padding: 14px 18px; border-radius: calc(var(--wf-radius) * 0.7); border: 1px solid var(--wf-border); background: var(--wf-bg); font: inherit; cursor: pointer; transition: border-color .15s ease, transform .15s ease; display: flex; gap: 10px; align-items: center; }
.b-quiz__opt:hover { border-color: var(--wf-primary); transform: translateX(3px); }
.b-quiz__opt .b-quiz__key { width: 26px; height: 26px; border-radius: 50%; background: var(--wf-primary-soft); color: var(--wf-primary); display: inline-flex; align-items: center; justify-content: center; font-size: .8em; font-weight: 700; flex: none; }
.b-quiz.is-done .b-quiz__opt { cursor: default; pointer-events: none; opacity: .55; }
.b-quiz__opt.is-right { border-color: #16a34a; background: #f0fdf4; opacity: 1 !important; }
.b-quiz__opt.is-right .b-quiz__key { background: #16a34a; color: #fff; }
.b-quiz__opt.is-wrong { border-color: #dc2626; background: #fef2f2; }
.b-quiz__opt.is-wrong .b-quiz__key { background: #dc2626; color: #fff; }
.b-quiz__explain { display: none; margin-top: 18px; padding: 14px 16px; border-radius: 10px; background: var(--wf-primary-soft); color: var(--wf-text); font-size: .95em; }
.b-quiz.is-done .b-quiz__explain { display: block; animation: wf-fadein .3s ease; }

/* ============ hotspot 图片热点 ============ */
.b-hotspot__stage { position: relative; border-radius: var(--wf-radius); overflow: hidden; aspect-ratio: 16 / 9; background: var(--wf-surface); }
.b-hotspot__stage > img { width: 100%; height: 100%; object-fit: cover; }
.b-hotspot__dot { position: absolute; width: 26px; height: 26px; transform: translate(-50%, -50%); border-radius: 50%; background: rgba(255,255,255,.94); border: none; cursor: pointer; box-shadow: 0 4px 14px rgba(0,0,0,.3); font: inherit; font-weight: 700; color: var(--wf-primary); z-index: 4; }
.b-hotspot__dot::before { content: ""; position: absolute; inset: -7px; border-radius: 50%; border: 2px solid rgba(255,255,255,.75); animation: wf-pulse 2s ease-out infinite; }
@keyframes wf-pulse { 0% { transform: scale(.7); opacity: 1; } 100% { transform: scale(1.35); opacity: 0; } }
.b-hotspot__tip { position: absolute; left: 50%; bottom: 36px; transform: translateX(-50%); width: 230px; background: rgba(15,23,42,.94); color: #fff; border-radius: 12px; padding: 12px 14px; font-size: .85em; opacity: 0; pointer-events: none; transition: opacity .2s ease, bottom .2s ease; text-align: left; z-index: 5; }
.b-hotspot__tip strong { display: block; margin-bottom: 4px; font-size: 1.02em; }
.b-hotspot__dot.is-open + .b-hotspot__tip { opacity: 1; bottom: 42px; }

/* ============ form 联系表单 ============ */
.b-form { max-width: 640px; margin: 0 auto; background: var(--wf-surface); border: 1px solid var(--wf-border); border-radius: var(--wf-radius); padding: 36px; }
.b-form__fields { display: grid; gap: 20px; }
.b-form__field { display: flex; flex-direction: column; gap: 6px; }
.b-form__label { font-size: .92em; font-weight: 600; color: var(--wf-text); }
.b-form__req { color: #dc2626; margin-left: 2px; }
.b-form__input { padding: 10px 14px; border: 1px solid var(--wf-border); border-radius: calc(var(--wf-radius) * 0.6); font: inherit; font-size: .95em; background: var(--wf-bg); color: var(--wf-text); transition: border-color .15s ease, box-shadow .15s ease; }
.b-form__input:focus { outline: none; border-color: var(--wf-primary); box-shadow: 0 0 0 3px var(--wf-primary-soft); }
.b-form__input[type="textarea"], .b-form__input textarea { min-height: 100px; resize: vertical; }
.b-form__submit { margin-top: 24px; width: 100%; }

/* ============ map 地图 ============ */
.b-map__container { border-radius: var(--wf-radius); overflow: hidden; background: var(--wf-surface); }
.b-map__placeholder {
  aspect-ratio: 16 / 9; display: grid; place-items: center;
  background-color: var(--wf-surface);
  background-image: linear-gradient(color-mix(in srgb, var(--wf-border) 55%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--wf-border) 55%, transparent) 1px, transparent 1px);
  background-size: 34px 34px;
}
.b-map__markers { display: grid; gap: 12px; padding: 20px; }
.b-map__marker { padding: 12px 16px; background: var(--wf-bg); border: 1px solid var(--wf-border); border-radius: calc(var(--wf-radius) * 0.6); font-size: .92em; }
.b-map__marker strong { display: block; margin-bottom: 4px; }

/* ============ social 社交链接 ============ */
.b-social__grid { display: flex; flex-wrap: wrap; gap: 16px; justify-content: center; }
.b-social__item { position: relative; }
.b-social__link { display: flex; align-items: center; gap: 10px; padding: 12px 20px; background: var(--wf-surface); border: 1px solid var(--wf-border); border-radius: calc(var(--wf-radius) * 0.75); transition: all .2s ease; }
.b-social__link:hover { border-color: var(--wf-primary); background: var(--wf-primary-soft); transform: translateY(-2px); }
.b-social__icon { font-size: 1.3em; }
.b-social__label { font-weight: 600; font-size: .95em; }
.b-social__qr { display: none; position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); margin-bottom: 12px; padding: 8px; background: var(--wf-bg); border: 1px solid var(--wf-border); border-radius: 12px; box-shadow: 0 12px 32px rgba(15,23,42,.2); z-index: 10; }
.b-social__qr img { width: 160px; height: 160px; display: block; }
.b-social__item:hover .b-social__qr { display: block; animation: wf-fadein .2s ease; }

/* ============ blog 博客文章 ============ */
.b-blog__grid { display: grid; grid-template-columns: repeat(var(--wb-cols, 3), 1fr); gap: 24px; }
.b-blog__card { background: var(--wf-bg); border: 1px solid var(--wf-border); border-radius: var(--wf-radius); overflow: hidden; transition: transform .2s ease, box-shadow .2s ease; }
.b-blog__card:hover { transform: translateY(-4px); box-shadow: 0 20px 40px -20px rgba(15,23,42,.2); }
.b-blog__cover { aspect-ratio: 16 / 10; overflow: hidden; }
.b-blog__cover img { width: 100%; height: 100%; object-fit: cover; }
.b-blog__body { padding: 20px; }
.b-blog__meta { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
.b-blog__cat { padding: 3px 10px; background: var(--wf-primary-soft); color: var(--wf-primary); border-radius: 999px; font-size: .78em; font-weight: 600; }
.b-blog__date { color: var(--wf-muted); font-size: .84em; }
.b-blog__title { font-size: 1.1em; font-weight: 700; margin-bottom: 8px; line-height: 1.4; }
.b-blog__excerpt { color: var(--wf-muted); font-size: .92em; line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }

/* ============ product-showcase 产品展示 ============ */
.b-product__grid { display: grid; grid-template-columns: repeat(var(--wb-cols, 3), 1fr); gap: 24px; }
.b-product__card { background: var(--wf-bg); border: 1px solid var(--wf-border); border-radius: var(--wf-radius); overflow: hidden; transition: transform .2s ease, box-shadow .2s ease; }
.b-product__card:hover { transform: translateY(-4px); box-shadow: 0 20px 40px -20px rgba(15,23,42,.2); }
.b-product__image { position: relative; aspect-ratio: 1; overflow: hidden; }
.b-product__image img { width: 100%; height: 100%; object-fit: cover; }
.b-product__badge { position: absolute; top: 12px; left: 12px; padding: 4px 12px; background: #dc2626; color: #fff; border-radius: 999px; font-size: .78em; font-weight: 600; z-index: 2; }
.b-product__body { padding: 16px 20px 20px; }
.b-product__name { font-size: 1.05em; font-weight: 700; margin-bottom: 6px; }
.b-product__desc { color: var(--wf-muted); font-size: .88em; margin-bottom: 12px; line-height: 1.5; }
.b-product__price { display: flex; align-items: baseline; gap: 8px; }
.b-product__current-price { font-size: 1.25em; font-weight: 800; color: #dc2626; }
.b-product__orig-price { font-size: .9em; color: var(--wf-muted); text-decoration: line-through; }
.b-product__cta { text-align: center; margin-top: 32px; }

/* ============ team 团队成员 ============ */
.b-team__grid { display: grid; grid-template-columns: repeat(var(--wb-cols, 4), 1fr); gap: 28px; }
.b-team__member { text-align: center; }
.b-team__avatar { width: 100px; height: 100px; margin: 0 auto 16px; border-radius: 50%; overflow: hidden; background: var(--wf-surface); }
.b-team__avatar img { width: 100%; height: 100%; object-fit: cover; }
.b-team__avatar .wf-ph { width: 100%; height: 100%; min-height: unset; font-size: 2em; }
.b-team__name { font-size: 1.05em; font-weight: 700; }
.b-team__role { color: var(--wf-primary); font-size: .88em; font-weight: 600; margin-top: 4px; }
.b-team__bio { color: var(--wf-muted); font-size: .88em; margin-top: 8px; line-height: 1.5; }

/* ============ proof 信任数字条 ============ */
.b-proof__bar { display: grid; grid-template-columns: repeat(var(--wb-cols, 3), 1fr); gap: 16px; text-align: center; }
.b-proof__cell { padding: 22px 12px; background: var(--wf-surface); border: 1px solid var(--wf-border); border-radius: var(--wf-radius); }
.b-proof__num { font-size: 1.9em; font-weight: 800; color: var(--wf-primary); font-variant-numeric: tabular-nums; font-family: var(--wf-heading-font); }
.b-proof__label { color: var(--wf-muted); font-size: .9em; margin-top: 6px; }
.b-proof__note { text-align: center; color: var(--wf-muted); font-size: .84em; margin-top: 14px; }

/* ============ logo-wall 品牌背书墙 ============ */
.b-logowall__grid { display: grid; grid-template-columns: repeat(var(--wb-cols, 6), 1fr); gap: 12px; }
.b-logowall__chip { padding: 16px 10px; text-align: center; font-weight: 800; letter-spacing: .05em; color: var(--wf-muted); background: var(--wf-surface); border: 1px solid var(--wf-border); border-radius: calc(var(--wf-radius) * .7); font-size: 1.02em; transition: color .15s ease, border-color .15s ease; }
.b-logowall__chip:hover { color: var(--wf-primary); border-color: var(--wf-primary); }

/* ============ journey 步骤旅程 ============ */
.b-journey__list { display: grid; gap: 18px; max-width: 760px; margin: 0 auto; }
.b-journey__step { display: flex; gap: 18px; align-items: flex-start; }
.b-journey__no { width: 46px; height: 46px; border-radius: 50%; flex: none; display: flex; align-items: center; justify-content: center; background: var(--wf-primary-soft); color: var(--wf-primary); font-weight: 800; font-size: .95em; font-variant-numeric: tabular-nums; border: 1px solid color-mix(in srgb, var(--wf-primary) 25%, transparent); }
.b-journey__t { font-weight: 700; font-size: 1.08em; }
.b-journey__d { color: var(--wf-muted); font-size: .94em; margin-top: 5px; line-height: 1.65; }

/* ============ cluster 痛点小卡 ============ */
.b-cluster__grid { display: grid; grid-template-columns: repeat(var(--wb-cols, 3), 1fr); gap: 14px; }
.b-cluster__card { padding: 20px; background: var(--wf-surface); border: 1px solid var(--wf-border); border-radius: calc(var(--wf-radius) * .8); }
.b-cluster__icon { font-size: 1.5em; }
.b-cluster__t { font-weight: 700; margin-top: 10px; }
.b-cluster__d { color: var(--wf-muted); font-size: .9em; margin-top: 7px; line-height: 1.65; }

/* ============ marquee 滚动横幅 ============ */
.b-marquee { overflow: hidden; border-top: 1px solid var(--wf-border); border-bottom: 1px solid var(--wf-border); background: var(--wf-surface); }
.b-marquee__mask { max-width: 1120px; margin: 0 auto; overflow: hidden; mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent); -webkit-mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent); }
.b-marquee__track { display: flex; gap: 56px; width: max-content; padding: 14px 0; animation: wf-marquee 26s linear infinite; }
.b-marquee:hover .b-marquee__track { animation-play-state: paused; }
.b-marquee__item { font-weight: 700; color: var(--wf-muted); font-size: 1.05em; white-space: nowrap; letter-spacing: .02em; }
@keyframes wf-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }

/* ============ banner 公告横条 ============ */
.b-banner__bar { display: flex; align-items: center; justify-content: center; gap: 14px; flex-wrap: wrap; background: var(--wf-primary); color: #fff; padding: 12px 20px; font-size: .95em; }
.b-banner__link { color: #fff; font-weight: 700; text-decoration: underline; text-underline-offset: 3px; }

/* ============ bento Bento 网格 ============ */
.b-bento__grid { display: grid; grid-template-columns: repeat(var(--wb-cols, 3), 1fr); gap: 14px; }
.b-bento__cell { padding: 22px; background: var(--wf-surface); border: 1px solid var(--wf-border); border-radius: var(--wf-radius); display: flex; flex-direction: column; }
.b-bento__cell.is-wide { grid-column: span 2; }
.b-bento__img { aspect-ratio: 16 / 8; border-radius: calc(var(--wf-radius) * .6); overflow: hidden; margin-bottom: 14px; }
.b-bento__img img { width: 100%; height: 100%; object-fit: cover; }
.b-bento__icon { font-size: 1.6em; }
.b-bento__t { font-weight: 700; font-size: 1.08em; margin-top: 10px; }
.b-bento__d { color: var(--wf-muted); font-size: .92em; margin-top: 6px; line-height: 1.65; }

/* ============ comparison 对比表 ============ */
.b-comparison__wrap { overflow-x: auto; border: 1px solid var(--wf-border); border-radius: var(--wf-radius); }
.b-comparison { width: 100%; border-collapse: collapse; background: var(--wf-bg); font-size: .95em; }
.b-comparison th, .b-comparison td { padding: 14px 18px; text-align: left; border-top: 1px solid var(--wf-border); vertical-align: top; }
.b-comparison thead th { font-weight: 800; background: var(--wf-surface); border-top: none; font-size: 1em; }
.b-comparison tbody th { font-weight: 600; color: var(--wf-muted); white-space: nowrap; }
.b-comparison .is-a { color: var(--wf-text); font-weight: 600; background: color-mix(in srgb, var(--wf-primary-soft) 55%, transparent); min-width: 180px; }
.b-comparison .is-b { color: var(--wf-muted); }

/* ============ before-after 前后对比 ============ */
.b-ba__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
.b-ba__side { text-align: center; }
.b-ba__img { aspect-ratio: 16 / 10; border-radius: var(--wf-radius); overflow: hidden; border: 1px solid var(--wf-border); }
.b-ba__img img, .b-ba__img .wf-ph { width: 100%; height: 100%; }
.b-ba__label { display: inline-block; margin-top: 10px; padding: 4px 14px; border-radius: 999px; background: var(--wf-surface); border: 1px solid var(--wf-border); font-size: .85em; font-weight: 600; color: var(--wf-muted); }
.b-ba__note { text-align: center; color: var(--wf-muted); font-size: .88em; margin-top: 14px; }

/* ============ prompt 提示词启动器 ============ */
.b-prompt__panel { max-width: 760px; margin: 0 auto; background: linear-gradient(135deg, #0f172a, #1e1b4b); color: #f1f5f9; border-radius: var(--wf-radius); padding: 32px 34px; }
.b-prompt__kicker { font-size: .8em; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: #a5b4fc; margin-bottom: 14px; }
.b-prompt__text { font-size: 1.12em; line-height: 1.75; white-space: pre-line; }
.b-prompt__chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 20px; }
.b-prompt__chip { padding: 6px 14px; border-radius: 999px; border: 1px solid rgba(255,255,255,.25); font-size: .85em; color: #cbd5e1; }
.b-prompt__btn { margin-top: 22px; background: #fff; color: #0f172a; box-shadow: none; }

/* ============ tool-grid 工具网格 ============ */
.b-tool__grid { display: grid; grid-template-columns: repeat(var(--wb-cols, 3), 1fr); gap: 16px; }
.b-tool__card { position: relative; padding: 22px; background: var(--wf-surface); border: 1px solid var(--wf-border); border-radius: var(--wf-radius); transition: transform .18s ease, box-shadow .18s ease; }
.b-tool__card:hover { transform: translateY(-3px); box-shadow: 0 16px 36px -18px rgba(15,23,42,.25); }
.b-tool__tag { position: absolute; top: 14px; right: 14px; padding: 3px 10px; border-radius: 999px; background: var(--wf-primary-soft); color: var(--wf-primary); font-size: .75em; font-weight: 700; }
.b-tool__icon { font-size: 1.6em; }
.b-tool__t { font-weight: 700; font-size: 1.05em; margin-top: 10px; }
.b-tool__d { color: var(--wf-muted); font-size: .9em; margin-top: 6px; line-height: 1.6; }
.b-tool__rating { margin-top: 12px; font-size: .85em; font-weight: 700; color: var(--wf-primary); }

/* ============ accordion 折叠面板(原生 details,零 JS) ============ */
.b-acc__list { max-width: 760px; margin: 0 auto; display: grid; gap: 12px; }
.b-acc__item { background: var(--wf-surface); border: 1px solid var(--wf-border); border-radius: calc(var(--wf-radius) * .8); overflow: hidden; }
.b-acc__head { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 16px 20px; cursor: pointer; list-style: none; font-weight: 700; }
.b-acc__head::-webkit-details-marker { display: none; }
.b-acc__chev { transition: transform .2s ease; color: var(--wf-muted); flex: none; }
.b-acc__item[open] .b-acc__chev { transform: rotate(180deg); }
.b-acc__body { padding: 0 20px 18px; color: var(--wf-muted); line-height: 1.7; white-space: pre-line; font-size: .95em; }

/* ============ portrait 竖版卡片 ============ */
.b-portrait__grid { display: grid; grid-template-columns: repeat(var(--wb-cols, 4), 1fr); gap: 18px; }
.b-portrait__card { background: var(--wf-bg); border: 1px solid var(--wf-border); border-radius: var(--wf-radius); overflow: hidden; transition: transform .18s ease, box-shadow .18s ease; }
.b-portrait__card:hover { transform: translateY(-4px); box-shadow: 0 18px 36px -18px rgba(15,23,42,.22); }
.b-portrait__img { aspect-ratio: 3 / 4; overflow: hidden; }
.b-portrait__img img, .b-portrait__img .wf-ph { width: 100%; height: 100%; }
.b-portrait__t { font-weight: 700; padding: 14px 16px 0; }
.b-portrait__d { color: var(--wf-muted); font-size: .88em; padding: 6px 16px 16px; line-height: 1.55; }

/* ============ showcase 编号展示 ============ */
.b-showcase__list { display: grid; gap: 22px; max-width: 900px; margin: 0 auto; }
.b-showcase__row { display: grid; grid-template-columns: 64px 1fr 1fr; gap: 22px; align-items: center; background: var(--wf-surface); border: 1px solid var(--wf-border); border-radius: var(--wf-radius); padding: 22px; }
.b-showcase__row.is-flip .b-showcase__img { order: -1; }
.b-showcase__no { font-size: 2em; font-weight: 800; color: var(--wf-primary); font-variant-numeric: tabular-nums; opacity: .55; font-family: var(--wf-heading-font); }
.b-showcase__t { font-weight: 700; font-size: 1.1em; }
.b-showcase__d { color: var(--wf-muted); font-size: .92em; margin-top: 6px; line-height: 1.65; }
.b-showcase__img { aspect-ratio: 16 / 10; border-radius: calc(var(--wf-radius) * .7); overflow: hidden; }
.b-showcase__img img, .b-showcase__img .wf-ph { width: 100%; height: 100%; }

/* ============ changelog 更新日志 ============ */
.b-chlog__list { max-width: 760px; margin: 0 auto; display: grid; gap: 14px; }
.b-chlog__item { background: var(--wf-surface); border: 1px solid var(--wf-border); border-radius: calc(var(--wf-radius) * .8); padding: 18px 22px; }
.b-chlog__head { display: flex; align-items: center; gap: 10px; }
.b-chlog__tag { padding: 3px 12px; border-radius: 999px; background: var(--wf-primary-soft); color: var(--wf-primary); font-weight: 700; font-size: .82em; font-variant-numeric: tabular-nums; }
.b-chlog__date { color: var(--wf-muted); font-size: .82em; }
.b-chlog__t { font-weight: 700; margin-top: 10px; }
.b-chlog__d { color: var(--wf-muted); font-size: .92em; margin-top: 5px; line-height: 1.6; }

/* ============ 变体:hero ============ */
.b-hero__inner.is-split { display: grid; grid-template-columns: 1.05fr 1fr; gap: 48px; align-items: center; text-align: left; }
.b-hero__inner.is-split .b-hero__title { font-size: var(--wf-fs-h2); }
.b-hero__inner.is-split .b-hero__btns { justify-content: flex-start; }
.b-hero__media { aspect-ratio: 4 / 3; border-radius: var(--wf-radius); overflow: hidden; box-shadow: 0 30px 60px -30px rgba(15,23,42,.35); }
.b-hero__media img, .b-hero__media .wf-ph { width: 100%; height: 100%; }
.b-hero__bg.is-cover { background-image: var(--wb-hero-bg); background-size: cover; background-position: center; }
.b-hero__bg.is-cover::after { content: ""; position: absolute; inset: 0; background: rgba(15,23,42,.45); }
.b-hero__inner.is-fullscreen { min-height: 68vh; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; color: #fff; }
.b-hero__inner.is-fullscreen .b-hero__title { font-size: var(--wf-fs-h1); }
.b-hero__inner.is-fullscreen .b-hero__subtitle { color: rgba(255,255,255,.85); }
.b-hero__inner.is-fullscreen .wf-btn-group { justify-content: center; }

/* ============ 变体:features ============ */
.b-feat-list { display: grid; gap: 14px; }
.b-feat-list__row { display: flex; gap: 16px; align-items: flex-start; padding: 18px 20px; background: var(--wf-surface); border: 1px solid var(--wf-border); border-radius: calc(var(--wf-radius) * .8); }
.b-feat-list__icon { font-size: 1.5em; flex: none; }
.b-feat-list__t { font-weight: 700; }
.b-feat-list__d { color: var(--wf-muted); font-size: .93em; margin-top: 4px; line-height: 1.6; }
.b-feat-num__grid { display: grid; grid-template-columns: repeat(var(--wb-cols, 3), 1fr); gap: 18px; }
.b-feat-num { padding: 22px; border-top: 3px solid var(--wf-primary); background: var(--wf-surface); border-radius: calc(var(--wf-radius) * .7); }
.b-feat-num__no { font-size: 1.6em; font-weight: 800; color: var(--wf-primary); font-family: var(--wf-heading-font); }
.b-feat-num__t { font-weight: 700; margin-top: 8px; }
.b-feat-num__d { color: var(--wf-muted); font-size: .92em; margin-top: 6px; line-height: 1.6; }

/* ============ 变体:cta ============ */
.b-cta__banner { display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap; padding: 26px 32px; background: var(--wf-primary); color: #fff; }
.b-cta__banner.is-gradient { background: linear-gradient(135deg, var(--wf-primary), #7c3aed); }
.b-cta__banner .b-cta__title { font-size: 1.3em; font-weight: 800; }
.b-cta__banner .b-cta__subtitle { opacity: .88; font-size: .95em; margin-top: 4px; }
.b-cta__panel.is-split { display: flex; align-items: center; justify-content: space-between; gap: 24px; text-align: left; flex-wrap: wrap; }

/* ============ 变体:testimonials ============ */
.b-testi-big { max-width: 780px; margin: 0 auto; text-align: center; }
.b-testi-big blockquote { font-size: 1.6em; font-weight: 700; line-height: 1.5; margin: 0; white-space: pre-line; }
.b-testi-big figcaption { margin-top: 18px; color: var(--wf-muted); font-size: .95em; }
.b-testi-av__grid { display: grid; grid-template-columns: repeat(var(--wb-cols, 4), 1fr); gap: 18px; text-align: center; }
.b-testi-av__name { margin-top: 8px; font-size: .9em; font-weight: 600; }
.b-testi-av .b-testi__avatar { width: 64px; height: 64px; font-size: 1.2em; margin: 0 auto; }

/* ============ 容器(分栏) ============ */
.b-section { display: grid; gap: 24px; }
.b-section--cols-1 { grid-template-columns: 1fr; }
.b-section--cols-2 { grid-template-columns: 1fr 1fr; }
.b-section--cols-3 { grid-template-columns: repeat(3, 1fr); }
.b-section--gap-tight { gap: 12px; }
.b-section--gap-loose { gap: 40px; }
.b-section__col { min-width: 0; display: flex; flex-direction: column; }
.b-section__col > .wf-block { flex: none; }
.b-section .wb-inner { padding: 0; max-width: none; }
.b-section .b-hero__inner { padding: 0; }
.wf-editing .b-section__col { outline: 1px dashed color-mix(in srgb, var(--wf-primary) 35%, transparent); outline-offset: 6px; border-radius: 8px; }

/* ============ footer 页脚 ============ */
.b-footer { background: var(--wf-surface); border-top: 1px solid var(--wf-border); }
.b-footer__inner { max-width: 1120px; margin: 0 auto; padding: 48px 24px; }
.b-footer__grid { display: flex; justify-content: space-between; gap: 40px; flex-wrap: wrap; }
.b-footer__brand { font-weight: 800; font-size: 1.15em; }
.b-footer__desc { color: var(--wf-muted); font-size: .92em; margin-top: 10px; max-width: 320px; white-space: pre-line; }
.b-footer__links { display: flex; gap: 22px; flex-wrap: wrap; font-size: .92em; color: var(--wf-muted); align-items: flex-start; }
.b-footer__links a:hover { color: var(--wf-primary); }
.b-footer__copy { margin-top: 34px; padding-top: 20px; border-top: 1px solid var(--wf-border); color: var(--wf-muted); font-size: .84em; display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; }

/* ============ PPT 幻灯 ============ */
.wf-deck { container-type: inline-size; font-size: 2.083cqi; }
.wf-slide {
  width: 100%; aspect-ratio: 16 / 9; position: relative; overflow: hidden;
  display: flex; flex-direction: column; justify-content: center;
  padding: 3.2em 4em 4.6em; background: var(--wf-bg);
}
.wf-slide__kicker { font-size: .78em; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: var(--wf-primary); margin-bottom: 1em; }
.wf-slide__title { font-size: 2.4em; font-weight: 800; letter-spacing: -0.02em; line-height: 1.2; }
.wf-slide__subtitle { font-size: 1.05em; color: var(--wf-muted); margin-top: .8em; }
.b-s-title { background: linear-gradient(135deg, var(--wf-primary-soft), var(--wf-bg) 62%); }
.b-s-title .wf-slide__title { font-size: 3em; }
.b-s-title__meta { margin-top: 2.2em; display: flex; gap: 2em; color: var(--wf-muted); font-size: .9em; flex-wrap: wrap; }
.b-s-title__badge { display: inline-block; align-self: flex-start; padding: .35em 1em; border-radius: 999px; background: var(--wf-primary); color: #fff; font-size: .78em; font-weight: 600; margin-bottom: 1.4em; letter-spacing: .08em; }
.b-s-bullets__list { margin-top: 1.6em; display: grid; gap: 1em; }
.b-s-bullet { display: flex; gap: 1em; align-items: flex-start; background: var(--wf-surface); border: 1px solid var(--wf-border); border-radius: var(--wf-radius); padding: 1em 1.2em; }
.b-s-bullet__no { width: 1.7em; height: 1.7em; border-radius: 50%; background: var(--wf-primary); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: .85em; flex: none; }
.b-s-bullet__t { font-weight: 700; font-size: 1.05em; }
.b-s-bullet__d { color: var(--wf-muted); font-size: .9em; margin-top: .2em; }
.b-s-quote { background: linear-gradient(135deg, var(--wf-primary), color-mix(in srgb, var(--wf-primary) 60%, #1e1b4b)); color: #fff; text-align: center; align-items: center; }
.b-s-quote__mark { font-size: 4em; line-height: .6; opacity: .4; font-family: Georgia, serif; }
.b-s-quote__text { font-size: 1.9em; font-weight: 700; line-height: 1.5; max-width: 20em; margin: .6em auto 0; white-space: pre-line; }
.b-s-quote__author { margin-top: 1.6em; opacity: .8; font-size: .95em; }
.b-s-end { text-align: center; align-items: center; }
.b-s-end__contact { margin-top: 2em; color: var(--wf-muted); font-size: .95em; white-space: pre-line; }
.b-s-end__qr { margin: 1.6em auto 0; width: 8em; height: 8em; border-radius: 1em; overflow: hidden; box-shadow: 0 1em 2em -1em rgba(15,23,42,.4); }
.b-s-end__qr img { width: 100%; height: 100%; object-fit: cover; }
.wf-slide__pageno { position: absolute; bottom: 1em; right: 1.6em; font-size: .7em; color: var(--wf-muted); font-variant-numeric: tabular-nums; }

/* PPT 放映态(导出/预览) */
.wf-deck.is-live { height: 100vh; display: flex; align-items: center; justify-content: center; background: #0b1020; }
.wf-deck.is-live .wf-slide-stage { width: min(100vw, 177.78vh); position: relative; box-shadow: 0 40px 120px rgba(0,0,0,.5); border-radius: 6px; overflow: hidden; }
.wf-deck.is-live .wf-slide { position: absolute; inset: 0; width: 100%; aspect-ratio: auto; height: 100%; opacity: 0; visibility: hidden; transform: translateX(24px); transition: opacity .4s ease, transform .4s ease, visibility .4s; }
.wf-deck.is-live .wf-slide.is-active { position: relative; opacity: 1; visibility: visible; transform: none; }
.wf-deck__bar { position: fixed; bottom: 18px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 14px; background: rgba(15,23,42,.8); backdrop-filter: blur(8px); color: #cbd5e1; padding: 8px 16px; border-radius: 999px; z-index: 60; font-size: 14px; font-family: -apple-system, "PingFang SC", sans-serif; }
.wf-deck__bar button { background: none; border: none; color: #fff; font-size: 16px; cursor: pointer; padding: 2px 8px; border-radius: 6px; }
.wf-deck__bar button:hover { background: rgba(255,255,255,.15); }
.wf-deck__dots { display: flex; gap: 6px; }
.wf-deck__dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,.3); cursor: pointer; border: none; padding: 0; }
.wf-deck__dot.is-active { background: #fff; }
.wf-deck__hint { position: fixed; top: 16px; right: 18px; color: rgba(255,255,255,.4); font-size: 12px; z-index: 60; font-family: -apple-system, "PingFang SC", sans-serif; }

/* ============ 形态:H5 ============ */
.wf-mode-h5 { background: #e2e8f0; }
.wf-mode-h5 .wf-page { max-width: 480px; margin: 0 auto; background: var(--wf-bg); min-height: 100vh; box-shadow: 0 0 60px rgba(15,23,42,.15); }
.wf-mode-h5 .b-hero__inner { padding: 72px 22px; }
.wf-mode-h5 .b-hero__title { font-size: var(--wf-fs-h1); }
.wf-mode-h5 .b-hero__subtitle { font-size: 1.02em; }
.wf-mode-h5 .wb-inner { padding: 48px 20px; }
.wf-mode-h5 .b-features__grid { grid-template-columns: repeat(2, 1fr) !important; gap: 12px; }
.wf-mode-h5 .b-feature { padding: 18px; }
.wf-mode-h5 .b-stats__grid { grid-template-columns: repeat(2, 1fr) !important; }
.wf-mode-h5 .b-pricing__grid, .wf-mode-h5 .b-testi__grid { grid-template-columns: 1fr !important; }
.wf-mode-h5 .b-price.is-featured { transform: none; }
.wf-mode-h5 .b-split__grid { grid-template-columns: 1fr !important; gap: 24px; }
.wf-mode-h5 .b-split.is-flip .b-split__grid > :first-child { order: 1; }
.wf-mode-h5 .b-split.is-flip .b-split__grid > :last-child { order: 2; }
.wf-mode-h5 .b-gallery__grid { grid-template-columns: repeat(2, 1fr) !important; }
.wf-mode-h5 .b-nav__links { display: none; }
.wf-mode-h5 .b-footer__grid { flex-direction: column; gap: 20px; }
.wf-h5-ctabar { position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: 480px; padding: 12px 16px calc(12px + env(safe-area-inset-bottom)); background: color-mix(in srgb, var(--wf-bg) 92%, transparent); backdrop-filter: blur(12px); border-top: 1px solid var(--wf-border); z-index: 55; }
.wf-h5-ctabar .wf-btn { width: 100%; }
.wf-page.has-ctabar { padding-bottom: 84px; }


/* ============================================================
 * ============ 质量层 · 共享排版工具箱(全部变体复用) ============
 * 统一节奏 / 流体字阶 / 卡片与媒体规范 / 焦点与动效 / 空状态
 * ============================================================ */
:where(.wf-root) {
  --wb-space-1: 6px;  --wb-space-2: 12px; --wb-space-3: 18px;
  --wb-space-4: 26px; --wb-space-5: 40px; --wb-space-6: 64px;
  --wb-radius-sm: calc(var(--wf-radius) * .5);
  --wb-radius-md: calc(var(--wf-radius) * .75);
  --wb-radius-lg: var(--wf-radius);
  --wb-shadow-sm: 0 1px 2px rgba(15,23,42,.06), 0 1px 1px rgba(15,23,42,.04);
  --wb-shadow-md: 0 8px 24px -12px rgba(15,23,42,.18), 0 2px 6px rgba(15,23,42,.05);
  --wb-shadow-lg: 0 24px 60px -24px rgba(15,23,42,.28);
  --wb-ease: cubic-bezier(.2,.7,.3,1);
  --wb-measure: 62ch;
  --wb-line: color-mix(in srgb, var(--wf-border) 88%, transparent);
}

/* 流式字阶:桌面→手机平滑缩放,不再靠媒体查询硬切 */
.wf-root .wb-title { font-size: clamp(1.6em, 1.15em + 1.5vw, 2.2em); letter-spacing: -.02em; }
.wf-root .wb-subtitle { font-size: clamp(.98em, .94em + .2vw, 1.08em); line-height: 1.75; max-width: var(--wb-measure); }
.wf-root .wb-head.is-center .wb-subtitle { margin-left: auto; margin-right: auto; }
.wf-root .wb-lead { font-size: clamp(1.02em, .98em + .25vw, 1.16em); color: var(--wf-muted); line-height: 1.8; }
.wf-root .wb-muted { color: var(--wf-muted); }
.wf-root .wb-eyebrow { font-size: .78em; }

/* 布局工具 */
.wf-root .wb-stack { display: flex; flex-direction: column; gap: var(--wb-space-3); }
.wf-root .wb-row { display: flex; align-items: center; gap: var(--wb-space-2); flex-wrap: wrap; }
.wf-root .wb-split2 { display: grid; grid-template-columns: 1.05fr .95fr; gap: clamp(28px, 5vw, 64px); align-items: center; }
.wf-root .wb-split2.is-flip > :first-child { order: 2; }
.wf-root .wb-rail { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(240px, 1fr); gap: var(--wb-space-4); overflow-x: auto; padding-bottom: 6px; scroll-snap-type: x proximity; }
.wf-root .wb-rail > * { scroll-snap-align: start; }
.wf-root .wb-mosaic { display: grid; grid-template-columns: repeat(6, 1fr); gap: var(--wb-space-3); }
.wf-root .wb-grid { display: grid; gap: var(--wb-space-4); grid-template-columns: repeat(var(--wb-cols, 3), minmax(0, 1fr)); }
.wf-root .wb-grid[data-cols="2"] { --wb-cols: 2; }
.wf-root .wb-grid[data-cols="4"] { --wb-cols: 4; }
.wf-root .wb-grid.is-auto { grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
.wf-root .wb-divider { height: 1px; background: var(--wb-line); border: 0; margin: var(--wb-space-5) 0; }

/* 卡片 */
.wf-root .wb-card {
  background: var(--wf-bg); border: 1px solid var(--wb-line); border-radius: var(--wb-radius-lg);
  padding: var(--wb-space-4); box-shadow: var(--wb-shadow-sm);
  transition: transform .25s var(--wb-ease), box-shadow .25s var(--wb-ease), border-color .25s var(--wb-ease);
}
.wf-root .wb-card.is-flat { box-shadow: none; background: var(--wf-surface); }
.wf-root .wb-card.is-ghost { border-style: dashed; box-shadow: none; background: transparent; }
.wf-root .wb-card.is-lift:hover { transform: translateY(-4px); box-shadow: var(--wb-shadow-md); border-color: color-mix(in srgb, var(--wf-primary) 26%, var(--wb-line)); }
.wf-root .wb-card__title { font-size: 1.06em; font-weight: 700; }
.wf-root .wb-card__body { color: var(--wf-muted); font-size: .95em; line-height: 1.75; margin-top: 8px; }

/* 媒体:统一比例、裁切与占位 */
.wf-root .wb-media { position: relative; overflow: hidden; border-radius: var(--wb-radius-lg); background: var(--wf-surface); }
.wf-root .wb-media > img, .wf-root .wb-media > .wf-ph { width: 100%; height: 100%; display: block; }
.wf-root .wb-media > img { object-fit: cover; aspect-ratio: var(--wb-ratio, 16 / 10); }
.wf-root .wb-media[data-ratio="1"] > img { aspect-ratio: 1 / 1; }
.wf-root .wb-media[data-ratio="4x3"] > img { aspect-ratio: 4 / 3; }
.wf-root .wb-media[data-ratio="9x16"] > img { aspect-ratio: 9 / 16; }
.wf-root .wb-media[data-ratio="21x9"] > img { aspect-ratio: 21 / 9; }
.wf-root .wb-media.is-soft { box-shadow: var(--wb-shadow-md); }
.wf-root .wb-media__badge {
  position: absolute; left: 12px; bottom: 12px; padding: 5px 11px; border-radius: 999px;
  background: color-mix(in srgb, #0b1220 62%, transparent); color: #fff; font-size: .76em; font-weight: 600;
  backdrop-filter: blur(6px);
}

/* 徽标 / 数值 / 引言 */
.wf-root .wb-pill {
  display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 999px;
  border: 1px solid var(--wb-line); background: var(--wf-surface); color: var(--wf-muted);
  font-size: .78em; font-weight: 650; letter-spacing: .02em;
}
.wf-root .wb-pill.is-primary { background: var(--wf-primary-soft); color: var(--wf-primary); border-color: color-mix(in srgb, var(--wf-primary) 22%, transparent); }
.wf-root .wb-kpi { font-size: clamp(1.7em, 1.2em + 1.8vw, 2.4em); font-weight: 800; letter-spacing: -.03em; line-height: 1.1; font-variant-numeric: tabular-nums; }
.wf-root .wb-kpi__label { margin-top: 6px; color: var(--wf-muted); font-size: .88em; }
.wf-root .wb-quote { font-size: clamp(1.05em, .98em + .5vw, 1.32em); line-height: 1.7; font-weight: 550; }
.wf-root .wb-quote::before { content: "“"; color: var(--wf-primary); font-size: 1.6em; line-height: 0; margin-right: 2px; vertical-align: -.2em; }
.wf-root .wb-avatar { border-radius: 999px; overflow: hidden; background: var(--wf-surface); flex: 0 0 auto; }
.wf-root .wb-avatar > img { width: 100%; height: 100%; object-fit: cover; }
.wf-root .wb-name { font-weight: 700; font-size: .95em; }
.wf-root .wb-role { color: var(--wf-muted); font-size: .84em; }
.wf-root .wb-stars { color: #f59e0b; letter-spacing: .12em; font-size: .92em; }

/* 交互质量:统一焦点环 / 过渡 / 禁止项 */
.wf-root a, .wf-root button { -webkit-tap-highlight-color: transparent; }
.wf-root a:focus-visible, .wf-root button:focus-visible, .wf-root [tabindex]:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--wf-primary) 70%, #fff); outline-offset: 2px; border-radius: var(--wb-radius-sm);
}
.wf-root .wf-btn { transition: transform .18s var(--wb-ease), box-shadow .18s var(--wb-ease), background .18s var(--wb-ease), color .18s var(--wb-ease); }
.wf-root .wf-btn:hover { transform: translateY(-1px); box-shadow: var(--wb-shadow-sm); }
.wf-root .wf-btn:active { transform: translateY(0); }
.wf-root .wb-link { color: var(--wf-primary); font-weight: 650; display: inline-flex; align-items: center; gap: 4px; }
.wf-root .wb-link::after { content: "→"; transition: transform .2s var(--wb-ease); }
.wf-root .wb-link:hover::after { transform: translateX(3px); }

/* 占比条 / 进度类(对比、评分、技能) */
.wf-root .wb-bar { height: 8px; border-radius: 999px; background: var(--wf-surface); overflow: hidden; }
.wf-root .wb-bar > span { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, var(--wf-primary), color-mix(in srgb, var(--wf-primary) 55%, #fff)); }

/* 空状态占位更克制 */
.wf-root .wf-ph {
  min-height: 132px; border: 1px dashed color-mix(in srgb, var(--wf-primary) 26%, var(--wf-border));
  border-radius: var(--wb-radius-lg); display: flex; align-items: center; justify-content: center;
  color: var(--wf-muted); font-size: .86em;
}

/* 无障碍与偏好 */
@media (prefers-reduced-motion: reduce) {
  .wf-root *, .wf-root *::before, .wf-root *::after { animation: none !important; transition: none !important; }
  .wf-root [data-reveal] { opacity: 1 !important; transform: none !important; }
}


/* ============================================================
 * ============ 版式系统 v2 · 统一边距 / 节奏 / 对齐 ============
 * 单一数值来源:所有模块共用同一套容器宽度、栏距、段间距与卡片内边距,
 * 保证任何页面(任意模块组合)的左右对齐与纵向节奏一致。
 * 选择器统一以 .wf-root 提升优先级,覆盖早期各模块的散落数值。
 * ============================================================ */
:where(.wf-root) {
  /* 容器与栏距 */
  --wb-container: 1120px;
  --wb-container-narrow: 720px;
  --wb-gutter: clamp(18px, 2.2vw, 24px);
  /* 纵向节奏(段间距) */
  --wb-section-y: clamp(52px, 6.2vw, 76px);
  --wb-section-y-tight: clamp(30px, 3.6vw, 44px);
  --wb-section-y-loose: clamp(66px, 8.4vw, 104px);
  --wb-section-y-hero: clamp(66px, 8.4vw, 108px);
  --wb-section-y-h5: clamp(38px, 7vw, 56px);
  /* 间距刻度(栏距/列表间距) */
  --wb-gap-xs: 8px;  --wb-gap-sm: 14px; --wb-gap: 22px;
  --wb-gap-lg: 34px; --wb-gap-xl: 52px;
  /* 内边距刻度 */
  --wb-card-pad: clamp(18px, 1.9vw, 26px);
  --wb-chip-pad: 16px;
  --wb-panel-pad: clamp(24px, 3.2vw, 40px);
  --wb-panel-pad-lg: clamp(34px, 5vw, 56px);
  --wb-head-gap: clamp(26px, 3.2vw, 40px);
}

/* ---------- 容器:全站统一左右边距 ---------- */
.wf-root .wb-inner { max-width: var(--wb-container); padding: var(--wb-section-y) var(--wb-gutter); }
.wf-root .wb-inner.is-tight { padding: var(--wb-section-y-tight) var(--wb-gutter); }
.wf-root .wb-inner.is-loose { padding: var(--wb-section-y-loose) var(--wb-gutter); }
.wf-root .wf-block[data-pad="tight"] .wb-inner { padding: var(--wb-section-y-tight) var(--wb-gutter); }
.wf-root .wf-block[data-pad="loose"] .wb-inner { padding: var(--wb-section-y-loose) var(--wb-gutter); }
.wf-root .wb-inner[style] { max-width: var(--wb-container); }
.wf-root .b-nav__inner { max-width: var(--wb-container); padding: 14px var(--wb-gutter); }
.wf-root .b-hero__inner { max-width: var(--wb-container); padding: var(--wb-section-y-hero) var(--wb-gutter); }
.wf-root .b-footer__inner { max-width: var(--wb-container); padding: var(--wb-section-y-tight) var(--wb-gutter); }
.wf-root .b-marquee__mask { max-width: var(--wb-container); }
.wf-root .b-banner__bar,
.wf-root .b-banner__soft,
.wf-root .b-banner__split { padding-left: var(--wb-gutter); padding-right: var(--wb-gutter); }
/* 窄版心模块(声明/表单/问答)保持居中,只统一纵向节奏与窄版心宽度 */
.wf-root .b-text .wb-inner { max-width: var(--wb-container-narrow); }
.wf-root .wf-block.b-form .b-form, .wf-root .b-quiz__panel { max-width: 640px; }
/* section 自身若与内层元素同名(form),重置掉内层卡片样式,避免"卡片套卡片 + 版心被压窄" */
.wf-root .wf-block.b-form { max-width: none; margin: 0; padding: 0; background: none; border: 0; border-radius: 0; box-shadow: none; }
.wf-root .wf-mode-h5 .wb-inner { padding: var(--wb-section-y-h5) var(--wb-gutter); }

/* ---------- 标题组:统一的 eyebrow/标题/副标题 节奏 ---------- */
.wf-root .wb-head { margin-bottom: var(--wb-head-gap); }
.wf-root .wb-head .wb-eyebrow { margin-bottom: var(--wb-gap-sm); }
.wf-root .wb-head .wb-subtitle { margin-top: var(--wb-gap-sm); }
.wf-root .wb-head > :last-child { margin-bottom: 0; }
.wf-root .wb-head.is-center { text-align: center; }

/* ---------- 栅格栏距:统一到刻度 ---------- */
.wf-root .b-features__grid, .wf-root .b-testi__grid, .wf-root .b-pricing__grid,
.wf-root .b-blog__grid, .wf-root .b-product__grid, .wf-root .b-team__grid,
.wf-root .b-tool__grid, .wf-root .b-cluster__grid, .wf-root .b-bento__grid,
.wf-root .b-proof__bar, .wf-root .b-stats__grid, .wf-root .wb-grid { gap: var(--wb-gap); }
.wf-root .b-gallery__grid, .wf-root .b-logowall__grid, .wf-root .b-social__grid { gap: var(--wb-gap-sm); }
.wf-root .b-mosaic, .wf-root .wb-mosaic { gap: var(--wb-gap-sm); }
.wf-root .b-price__feats, .wf-root .b-faq__list, .wf-root .b-map__markers, .wf-root .b-form__fields { gap: var(--wb-gap-sm); }
/* 图文分栏:经典与变体两套实现共用同一栏距 */
.wf-root .b-split__grid, .wf-root .wb-split2 { gap: var(--wb-gap-xl); }
.wf-root .b-before-after__bar, .wf-root .b-ba__bar, .wf-root .b-portrait__grid, .wf-root [data-block] .wb-grid { gap: var(--wb-gap); }

/* ---------- 卡片内边距:统一到刻度 ---------- */
.wf-root .b-feature,
.wf-root .b-testi,
.wf-root .b-price,
.wf-root .b-blog__body,
.wf-root .b-product__body,
.wf-root .b-proof__cell,
.wf-root .b-cluster__card,
.wf-root .b-bento__cell,
.wf-root .b-tool__card,
.wf-root .b-blog__card,
.wf-root .b-product__card,
.wf-root .wb-card { padding: var(--wb-card-pad); }
.wf-root .b-logowall__chip, .wf-root .b-social__link { padding: var(--wb-chip-pad); }
.wf-root .b-social__link { padding-left: 20px; padding-right: 20px; }
.wf-root .b-cta__panel { padding: var(--wb-panel-pad-lg) var(--wb-panel-pad); }
.wf-root .b-countdown__panel, .wf-root .b-quiz__panel, .wf-root .b-form { padding: var(--wb-panel-pad); }
.wf-root .b-price__badge { top: -12px; }

/* ---------- 等高 / 对齐:同一行卡片高度一致,内容顶端对齐 ---------- */
.wf-root .b-features__grid, .wf-root .b-testi__grid, .wf-root .b-pricing__grid,
.wf-root .b-blog__grid, .wf-root .b-product__grid, .wf-root .b-team__grid,
.wf-root .b-tool__grid, .wf-root .b-bento__grid, .wf-root .b-proof__bar { align-items: stretch; }
.wf-root .b-feature, .wf-root .b-testi, .wf-root .b-price,
.wf-root .b-blog__card, .wf-root .b-product__card, .wf-root .b-tool__card,
.wf-root .b-bento__cell { height: 100%; }
.wf-root .b-feature { display: flex; flex-direction: column; }
.wf-root .b-feature > :last-child { margin-top: auto; }
.wf-root .b-blog__body, .wf-root .b-product__body { display: flex; flex-direction: column; }
.wf-root .b-blog__excerpt, .wf-root .b-product__desc { margin-bottom: var(--wb-gap-sm); }
.wf-root .b-blog__card .b-blog__meta, .wf-root .b-product__cta { margin-top: auto; }
.wf-root .b-features__grid, .wf-root .b-tool__grid { align-content: stretch; }



/* ============================================================
 * ====== 设计契约层 · 模块内部视觉统一(借鉴 OpenFlow tokens) ======
 * 原则(与 OpenFlow 同一套纪律):
 *   1. 每个模块内部只用「角色」决定排版:眉题 / 标题 / 导语 / 正文 / 元信息 / 数值
 *   2. 组件尺寸固定:按钮 48(紧凑 40)、输入 50、胶囊 28 —— 全站同一手感
 *   3. 只有 3 档圆角、2 档阴影;主按钮用主题色阴影,而不是灰阴影
 *   4. 元信息/日期/数值走等宽字体 + tabular-nums,制造秩序感
 *   5. 标题统一 800 字重 + 紧字距(-.02/-.03em),正文 1.75~1.95 行高
 * ============================================================ */
:where(.wf-root) {
  --wf-mono: ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace;
  --wf-fs-h1: clamp(34px, 4.3vw, 54px);
  --wf-fs-h2: clamp(26px, 3.2vw, 34px);
  --wf-fs-h3: 18px;
  --wf-fs-lead: clamp(16px, 1.05vw + 12px, 17px);
  --wf-fs-body: 15.5px;
  --wf-fs-meta: 13px;
  --wf-fs-num: clamp(28px, 3.4vw, 40px);
  --wb-btn-h: 48px;
  --wb-btn-h-sm: 40px;
  --wb-input-h: 50px;
  --wb-pill-h: 28px;
  --r-lg: calc(var(--wf-radius) * var(--wf-radius-scale, 1));
  --r-md: calc(var(--r-lg) * .7);
  --r-sm: calc(var(--r-lg) * .46);
  --wb-shadow-action: 0 4px 16px color-mix(in srgb, var(--wf-primary) 30%, transparent);
  --wb-shadow-action-hover: 0 8px 24px color-mix(in srgb, var(--wf-primary) 38%, transparent);
  --wb-ring: 0 0 0 3px color-mix(in srgb, var(--wf-primary) 55%, transparent);
}

/* 幻灯形态:同一套角色令牌在 deck 内改用 em 重定基,随舞台等比缩放 */
.wf-root .wf-deck {
  --wf-fs-h1: 3em;
  --wf-fs-h2: 2.2em;
  --wf-fs-h3: 1.05em;
  --wf-fs-lead: 1.15em;
  --wf-fs-body: .92em;
  --wf-fs-meta: .85em;
  --wf-fs-num: 2.2em;
}

/* ---------- 角色:标题层级 ---------- */
.wf-root .b-hero__title { font-size: var(--wf-fs-h1); font-weight: var(--wf-heading-weight, 800); letter-spacing: var(--wf-heading-letter, -.02em); line-height: 1.12; text-wrap: balance; }
.wf-root .wb-title,
.wf-root .b-text__title,
.wf-root .b-split__title { font-size: var(--wf-fs-h2); font-weight: var(--wf-heading-weight, 800); letter-spacing: var(--wf-heading-letter, -.02em); line-height: 1.2; text-wrap: balance; }
.wf-root .b-cta__title { font-size: var(--wf-fs-h2); font-weight: var(--wf-heading-weight, 800); letter-spacing: var(--wf-heading-letter, -.02em); line-height: 1.2; }
.wf-root .b-text .wb-inner { max-width: var(--wb-container-narrow); }

/* 卡片/步骤级标题(h3) */
.wf-root .wb-card__title, .wf-root .b-feature__title, .wf-root .b-cluster__t, .wf-root .b-bento__t,
.wf-root .b-tool__t, .wf-root .b-showcase__t, .wf-root .b-journey__t, .wf-root .b-chlog__t,
.wf-root .b-portrait__t, .wf-root .b-tl__title, .wf-root .b-feat-list__t, .wf-root .b-feat-num__t,
.wf-root .b-blog__title, .wf-root .b-product__name, .wf-root .b-team__name, .wf-root .b-testi__name,
.wf-root .b-price__name, .wf-root .b-tabs__title, .wf-root .b-s-bullet__t,
.wf-root .b-acc__head, .wf-root .b-faq__q { font-size: var(--wf-fs-h3); font-weight: 700; letter-spacing: -.01em; line-height: 1.45; }

/* ---------- 角色:导语 / 正文 / 元信息 ---------- */
.wf-root .b-hero__subtitle, .wf-root .b-cta__subtitle, .wf-root .b-text__body,
.wf-root .b-split__body, .wf-root .b-footer__desc { font-size: var(--wf-fs-lead); line-height: 1.95; }
.wf-root .b-feature__desc, .wf-root .b-cluster__d, .wf-root .b-bento__d, .wf-root .b-tool__d,
.wf-root .b-showcase__d, .wf-root .b-journey__d, .wf-root .b-portrait__d, .wf-root .b-tl__desc,
.wf-root .b-feat-list__d, .wf-root .b-feat-num__d, .wf-root .b-blog__excerpt, .wf-root .b-product__desc,
.wf-root .b-team__bio, .wf-root .b-testi__quote, .wf-root .b-acc__body, .wf-root .b-price__desc,
.wf-root .b-chlog__d, .wf-root .b-prompt__text, .wf-root .b-tabs__body { font-size: var(--wf-fs-body); line-height: 1.78; }
.wf-root .b-hero__subtitle, .wf-root .b-cta__subtitle { max-width: 640px; }
.wf-root .b-hero.is-center .b-hero__subtitle, .wf-root .b-cta .b-cta__subtitle { margin-left: auto; margin-right: auto; }

/* 元信息:统一 13px,数字/日期/标签走等宽 */
.wf-root .b-team__role, .wf-root .b-testi__role, .wf-root .b-blog__cat, .wf-root .b-tool__tag,
.wf-root .b-social__label, .wf-root .b-proof__label, .wf-root .b-countdown__unit, .wf-root .b-price__unit,
.wf-root .b-ba__label, .wf-root .b-gallery__cap, .wf-root .b-stat__label, .wf-root .b-form__label,
.wf-root .b-countdown__note, .wf-root .b-proof__note, .wf-root .b-s-title__meta { font-size: var(--wf-fs-meta); line-height: 1.6; }
.wf-root .b-blog__date, .wf-root .b-blog__meta, .wf-root .b-chlog__date, .wf-root .b-chlog__tag,
.wf-root .b-price__unit, .wf-root .b-countdown__unit, .wf-root .b-s-title__meta {
  font-family: var(--wf-meta-font, var(--wf-mono)); font-variant-numeric: tabular-nums; letter-spacing: .01em;
}

/* 数值:统一字阶 + 等宽数字 */
.wf-root .b-price__amount, .wf-root .b-stat__num, .wf-root .b-stat__value, .wf-root .b-proof__num,
.wf-root .b-countdown__num, .wf-root .b-countdown__digits b, .wf-root .wb-kpi { font-size: var(--wf-fs-num); font-weight: 800; letter-spacing: -.02em; line-height: 1.05; font-variant-numeric: tabular-nums; }
.wf-root .b-price__amount { font-family: var(--wf-heading-font); }

/* ---------- 组件:按钮(固定高度,主按钮用主题色阴影) ---------- */
.wf-root .wf-btn {
  height: var(--wb-btn-h); padding: 0 26px; font-size: 15px; font-weight: 700;
  border-radius: var(--r-sm); gap: 8px; white-space: nowrap;
  transition: background .2s var(--wb-ease), box-shadow .2s var(--wb-ease), transform .2s var(--wb-ease), border-color .2s, color .2s;
}
.wf-root .wf-btn.is-primary { box-shadow: var(--wf-accent-shadow, var(--wb-shadow-action)); }
.wf-root .wf-btn.is-primary:hover { box-shadow: var(--wf-accent-shadow-hover, var(--wb-shadow-action-hover)); }
.wf-root .wf-btn:active { transform: scale(.97); }
.wf-root .wf-btn.is-sm, .wf-root .b-nav__cta, .wf-root .b-banner .wf-btn {
  height: var(--wb-btn-h-sm); padding: 0 18px; font-size: 14px;
}
.wf-root .wf-btn.is-ghost { box-shadow: none; }
.wf-root .wf-btn:focus-visible { outline: none; box-shadow: var(--wb-ring); }
.wf-root .wf-btn.is-primary:focus-visible { box-shadow: var(--wb-shadow-action), var(--wb-ring); }

/* ---------- 组件:输入 / 胶囊 / 图标 ---------- */
.wf-root .b-form__input, .wf-root .wf-input {
  min-height: var(--wb-input-h); padding: 13px 16px; font-size: 15px;
  border-radius: var(--r-sm); border: 1.5px solid var(--wf-border); background: var(--wf-bg);
}
.wf-root .b-form__input:focus, .wf-root .wf-input:focus {
  border-color: var(--wf-primary); outline: none;
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--wf-primary) 12%, transparent);
}
.wf-root .wb-pill, .wf-root .b-blog__cat, .wf-root .b-tool__tag, .wf-root .b-chlog__tag,
.wf-root .b-product__badge, .wf-root .b-price__badge, .wf-root .b-hero__badge {
  height: var(--wb-pill-h); display: inline-flex; align-items: center; padding: 0 12px;
  border-radius: 999px; font-size: 12px; font-weight: 650; line-height: 1;
}
.wf-root .b-cluster__icon, .wf-root .b-bento__icon, .wf-root .b-tool__icon, .wf-root .b-feature__icon,
.wf-root .b-prompt__chip {
  width: 42px; height: 42px; border-radius: var(--r-sm); display: inline-flex;
  align-items: center; justify-content: center; font-size: 1.05em; line-height: 1;
  background: var(--wf-primary-soft); color: var(--wf-primary); flex: none;
}

/* ---------- 组件:卡片统一(发丝边框 + 主题色 hover) ---------- */
.wf-root .b-feature, .wf-root .b-testi, .wf-root .b-price, .wf-root .b-blog__card,
.wf-root .b-product__card, .wf-root .b-tool__card, .wf-root .b-proof__cell,
.wf-root .b-cluster__card, .wf-root .b-bento__cell, .wf-root .b-portrait__card,
.wf-root .b-showcase__t, .wf-root .b-team__card {
  border-radius: var(--r-lg); border: 1px solid var(--wf-card-border, var(--wb-line)); background: var(--wf-card-bg, var(--wf-bg));
}
.wf-root .b-price.is-featured { box-shadow: 0 24px 48px -24px color-mix(in srgb, var(--wf-primary) 65%, transparent), var(--wb-shadow-md); }
.wf-root .b-feature:hover, .wf-root .b-testi:hover, .wf-root .b-blog__card:hover,
.wf-root .b-product__card:hover, .wf-root .b-tool__card:hover,
.wf-root .b-cluster__card:hover, .wf-root .b-bento__cell:hover, .wf-root .b-proof__cell:hover {
  transform: translateY(var(--wf-hover-lift, -3px));
}

/* ---------- 眉题:等宽字母间距,像 OpenFlow 的 kicker ---------- */
.wf-root .wb-eyebrow {
  display: var(--wf-kicker-display, inline-block);
  font-family: var(--wf-meta-font, var(--wf-mono)); font-size: var(--wf-fs-meta); font-weight: 700;
  letter-spacing: .08em; text-transform: var(--wf-kicker-transform, uppercase);
}


/* ---------- 模块内部节奏:卡片内容统一间距(替代 margin 顶到底) ---------- */
.wf-root .b-feature, .wf-root .b-tool__card, .wf-root .b-cluster__card, .wf-root .b-bento__cell,
.wf-root .b-showcase__t, .wf-root .b-portrait__card, .wf-root .b-journey__step, .wf-root .b-chlog__item {
  display: flex; flex-direction: column; gap: 10px;
}
.wf-root .b-feature > :last-child, .wf-root .b-tool__card > :last-child { margin-top: 0; }
.wf-root .b-feature__title, .wf-root .b-tool__t, .wf-root .b-cluster__t, .wf-root .b-bento__t { margin-top: 2px; }
.wf-root .b-cluster__icon, .wf-root .b-bento__icon, .wf-root .b-tool__icon { margin-bottom: 4px; }
.wf-root .b-blog__body, .wf-root .b-product__body { display: flex; flex-direction: column; gap: 8px; }
.wf-root .b-blog__excerpt, .wf-root .b-product__desc { margin-bottom: 0; }
.wf-root .b-blog__card .b-blog__meta, .wf-root .b-product__cta { margin-top: auto; padding-top: 6px; }
.wf-root .b-team__member, .wf-root .b-testi, .wf-root .b-price { display: flex; flex-direction: column; }
.wf-root .b-team__member { gap: 6px; align-items: center; }
.wf-root .b-testi { gap: 14px; }
.wf-root .b-price { gap: 0; }
.wf-root .b-price__feats { margin: 18px 0 22px; gap: 10px; }
.wf-root .b-price__btn { margin-top: auto; }
.wf-root .b-acc__body, .wf-root .b-faq__a-inner { padding-top: 2px; }

/* ---------- hero:居中态(align 生效 / 无主图自动居中) ---------- */
.wf-root .b-hero__inner.is-center { text-align: center; }
.wf-root .b-hero__inner.is-center .wf-btn-group { justify-content: center; }
.wf-root .b-hero__inner.is-center .b-hero__subtitle { margin-left: auto; margin-right: auto; }
.wf-root .b-hero__inner.is-center .b-hero__copy { max-width: 860px; margin: 0 auto; }
.wf-root .b-hero__copy { max-width: 760px; }

/* ---------- 空标题组不再占位(避免"假留白") ---------- */
.wf-root .wb-head:empty { display: none; }
.wf-root .wb-inner:has(> .wb-head:empty) { padding-top: calc(var(--wb-section-y) * .62); }
.wf-root .wb-inner:has(> .wb-head:empty) .wb-head { margin-bottom: 0; }

/* ---------- 分隔与列表:统一发丝线 + 行内节奏 ---------- */
.wf-root .b-tl__item, .wf-root .b-chlog__item, .wf-root .b-team__row, .wf-root .b-proof__srow,
.wf-root .b-a-row, .wf-root .b-acc__item { border-color: var(--wb-line); }
.wf-root .b-tl__item { padding-bottom: var(--wb-gap); }
.wf-root .b-tl__title { margin-bottom: 4px; }
.wf-root .b-countdown__panel { padding: var(--wb-panel-pad) var(--wb-panel-pad); }
.wf-root .b-countdown__digits { gap: var(--wb-gap-sm); }
.wf-root .b-countdown__cell { border-radius: var(--r-md); padding: 12px 8px; }
.wf-root .b-stats__grid, .wf-root .b-proof__bar { align-items: start; }
/* 数据条(统计/信任数字):内容少,上下留白按比例收窄,避免大片假留白 */
.wf-root .b-stats .wb-inner, .wf-root .b-proof .wb-inner, .wf-root .b-countdown .wb-inner {
  padding-top: calc(var(--wb-section-y) * .68); padding-bottom: calc(var(--wb-section-y) * .68);
}
.wf-root .b-stat { display: flex; flex-direction: column; gap: 6px; align-items: center; }
.wf-root .b-stat__label { color: var(--wf-muted); }


/* ============================================================
 * ====== 内容级契约 · 媒体 / 图标 / 表格与列表对齐 / 空状态 ======
 * 目标:同一页面里,图像一律「同比例、同裁切、同圆角」;图标与序号同一套规格;
 *       表格与列表的列左沿、行高、分隔线一致;空数据不塌陷、不突兀。
 * ============================================================ */

/* ---------- 媒体:一律裁切,比例由角色决定,圆角走令牌 ---------- */
/* 角色约定:媒体一律 cover(裁切);地图/二维码等"信息型图像"用 contain。
   需要单独控制时,给该 img 加 data-fit="contain"。 */
.wf-root img { object-fit: cover; }
.wf-root img.is-contain, .wf-root .b-social__qr img, .wf-root .b-map img,
.wf-root .b-map__placeholder img, .wf-root img[data-fit="contain"] { object-fit: contain; }

.wf-root .b-gallery__item, .wf-root .b-blog__cover, .wf-root .b-product__image,
.wf-root .b-portrait__img, .wf-root .b-showcase__img, .wf-root .b-bento__img,
.wf-root .b-tabs__media, .wf-root .b-ba__img, .wf-root .b-hotspot__stage,
.wf-root .b-split__media, .wf-root .b-hero__media {
  border-radius: var(--r-md); overflow: hidden; background: var(--wf-surface);
}
/* 卡片内媒体:与卡片同圆角,避免"方角贴圆卡" */
.wf-root .b-blog__card, .wf-root .b-product__card, .wf-root .b-portrait__card,
.wf-root .b-showcase__t, .wf-root .b-tabs__panel { overflow: hidden; }
.wf-root .b-blog__card .b-blog__cover, .wf-root .b-product__card .b-product__image { border-radius: 0; }

/* 角色化比例(放在容器上,空状态同样占位不塌陷) */
.wf-root .b-gallery__item { aspect-ratio: 4 / 3; }
.wf-root .b-blog__cover { aspect-ratio: 16 / 10; }
.wf-root .b-product__image { aspect-ratio: 1 / 1; }
.wf-root .b-portrait__img { aspect-ratio: 3 / 4; }
.wf-root .b-showcase__img { aspect-ratio: 4 / 3; }
.wf-root .b-bento__img { aspect-ratio: 16 / 9; }
.wf-root .b-bento__cell.is-wide .b-bento__img { aspect-ratio: 21 / 9; }
.wf-root .b-tabs__media { aspect-ratio: 4 / 3; }
.wf-root .b-ba__img { aspect-ratio: 16 / 10; }
.wf-root .b-split__media { aspect-ratio: 4 / 3; }
.wf-root .b-hero__media { aspect-ratio: 4 / 3; }
.wf-root .b-team__avatar, .wf-root .b-testi__avatar { aspect-ratio: 1 / 1; border-radius: 999px; }
.wf-root .b-portrait__img, .wf-root .b-showcase__img, .wf-root .b-bento__img, .wf-root .b-tabs__media { position: relative; }

/* ---------- 图标与序号:同一套规格 ---------- */
.wf-root .b-journey__no, .wf-root .b-showcase__no, .wf-root .b-tl__time, .wf-root .b-tl__dot,
.wf-root .b-s-bullets__n, .wf-root .b-countdown__num, .wf-root .b-steps__n {
  font-family: var(--wf-mono); font-variant-numeric: tabular-nums; letter-spacing: .01em;
}
.wf-root .b-journey__no, .wf-root .b-showcase__no {
  width: 34px; height: 34px; border-radius: var(--r-sm); flex: none;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--wf-primary-soft); color: var(--wf-primary); font-weight: 700; font-size: var(--wf-fs-meta);
}
.wf-root .b-tl__time { color: var(--wf-primary); font-weight: 700; }
.wf-root .b-tl__dot { background: var(--wf-bg); border: 2px solid var(--wf-primary); color: var(--wf-primary); font-weight: 700; }

/* ---------- 表格与列表:列对齐 / 行高 / 分隔线 ---------- */
.wf-root .b-comparison__wrap { border-radius: var(--r-md); border-color: var(--wb-line); }
.wf-root .b-comparison { font-size: var(--wf-fs-body); table-layout: fixed; }
.wf-root .b-comparison th, .wf-root .b-comparison td { padding: 15px 18px; vertical-align: middle; border-top-color: var(--wb-line); }
.wf-root .b-comparison tbody th { width: 26%; color: var(--wf-text); font-weight: 650; white-space: normal; }
.wf-root .b-comparison thead th { font-size: var(--wf-fs-meta); font-weight: 700; letter-spacing: .04em; color: var(--wf-muted); background: var(--wf-surface); }
.wf-root .b-comparison thead th.is-a, .wf-root .b-comparison td.is-a { color: var(--wf-primary); }
.wf-root .b-comparison td.is-a { font-weight: 650; background: color-mix(in srgb, var(--wf-primary-soft) 45%, transparent); }
.wf-root .b-comparison tbody tr:last-child th, .wf-root .b-comparison tbody tr:last-child td { border-bottom: 0; }

/* 列表标记固定宽度:多行文本左沿也能对齐 */
.wf-root .b-price__feats li::before, .wf-root .b-split__check .wk-tick, .wf-root .checklist li::before { flex: none; }
.wf-root .b-price__feats li, .wf-root .b-split__check li { align-items: flex-start; }
.wf-root .b-proof__cell { display: flex; flex-direction: column; gap: 4px; align-items: center; text-align: center; }
.wf-root .b-proof__note { color: var(--wf-muted); }
.wf-root .b-tool__rating {
  margin-top: auto; padding-top: 6px; display: flex; align-items: center; gap: 6px;
  font-family: var(--wf-mono); font-variant-numeric: tabular-nums; font-size: var(--wf-fs-meta); color: var(--wf-muted);
}
.wf-root .b-tool__rating::first-letter { color: #f59e0b; }
.wf-root .b-tool__card { display: flex; flex-direction: column; }
.wf-root .b-logowall__chip, .wf-root .b-social__link { justify-content: center; }

/* ---------- 空状态:仍然占位,但克制、统一 ---------- */
.wf-root .wf-ph {
  min-height: var(--wb-ph-min, 132px); height: 100%; width: 100%;
  border: 1.5px dashed color-mix(in srgb, var(--wf-primary) 22%, var(--wf-border));
  border-radius: inherit; display: flex; align-items: center; justify-content: center; gap: 8px;
  background: linear-gradient(140deg, var(--wf-surface), color-mix(in srgb, var(--wf-primary-soft) 35%, var(--wf-surface)));
  color: var(--wf-muted); font-size: var(--wf-fs-meta); letter-spacing: .02em; text-align: center; padding: 12px;
}
.wf-root .b-team__avatar .wf-ph, .wf-root .b-testi__avatar .wf-ph { min-height: 0; }
.wf-root .b-map__fallback .wf-ph {
  border: 0; background: var(--wf-bg); box-shadow: var(--wb-shadow-sm);
  min-height: 0; height: auto; width: auto; max-width: 78%;
  padding: 10px 16px; border-radius: 999px; position: relative; z-index: 1;
  display: inline-flex; align-items: center; gap: 8px; font-size: var(--wf-fs-meta);
}
.wf-root .b-map__fallback .wf-ph::before { content: "📍"; font-size: 1.05em; }
.wf-root .b-map__placeholder { position: relative; }
/* 降级态:地图不可用时在网格中央显示定位针 */
.wf-root .b-map__tiles.is-fallback ~ .b-map__fallback::before {
  content: ""; position: absolute; width: 14px; height: 14px; left: 50%; top: 50%;
  transform: translate(-50%, -50%) rotate(45deg);
  background: var(--wf-primary); border-radius: 50% 50% 50% 0; opacity: .85; pointer-events: none;
}
.wf-root .b-gallery__item .wf-ph, .wf-root .b-portrait__img .wf-ph, .wf-root .b-product__image .wf-ph,
.wf-root .b-blog__cover .wf-ph, .wf-root .b-showcase__img .wf-ph, .wf-root .b-bento__img .wf-ph,
.wf-root .b-ba__img .wf-ph, .wf-root .b-split__media .wf-ph, .wf-root .b-hero__media .wf-ph { min-height: 0; }


/* ============================================================
 * ====== 交互态契约:时长/缓动统一 + 语义色 + 焦点环 + 展开态 ======
 * 所有可交互元素用同一组时长与缓动;状态色走语义令牌;
 * 焦点环统一为 3px 主题色环;展开/切换有同一条动效曲线。
 * ============================================================ */
:where(.wf-root) {
  --wb-dur-fast: .16s;
  --wb-dur: .28s;
  --wb-dur-slow: .45s;
  --wf-ok: oklch(58% .17 152);      --wf-ok-soft: oklch(58% .17 152 / .12);
  --wf-warn: oklch(66% .15 75);     --wf-warn-soft: oklch(66% .15 75 / .14);
  --wf-danger: oklch(55% .2 25);    --wf-danger-soft: oklch(55% .2 25 / .12);
  --wf-tip-bg: oklch(22% .02 70 / .94);
}

/* 统一焦点环(替换 outline,与按钮/输入一致) */
.wf-root a:focus-visible, .wf-root button:focus-visible, .wf-root summary:focus-visible,
.wf-root [role="tab"]:focus-visible, .wf-root [tabindex]:focus-visible {
  outline: none; box-shadow: var(--wb-ring); border-radius: var(--r-sm);
}

/* ---------- 选项卡 ---------- */
.wf-root .b-tabs__bar { gap: var(--wb-gap-xs); margin-bottom: var(--wb-gap-lg); }
.wf-root .b-tabs__tab {
  height: 40px; padding: 0 18px; font-size: 14px; font-weight: 650; border-radius: 999px;
  border: 1px solid var(--wf-card-border, var(--wb-line)); background: var(--wf-bg); color: var(--wf-muted);
  transition: background var(--wb-dur-fast) var(--wb-ease), color var(--wb-dur-fast) var(--wb-ease),
              border-color var(--wb-dur-fast) var(--wb-ease), box-shadow var(--wb-dur-fast) var(--wb-ease);
}
.wf-root .b-tabs__tab:hover { color: var(--wf-text); border-color: color-mix(in srgb, var(--wf-primary) 40%, var(--wb-line)); }
.wf-root .b-tabs__tab.is-active { background: var(--wf-primary); border-color: var(--wf-primary); color: #fff; box-shadow: var(--wf-accent-shadow, none); }
.wf-root .b-tabs__media { aspect-ratio: 16 / 9; border-radius: var(--r-md); margin-bottom: var(--wb-gap); }
.wf-root .b-tabs__title { text-align: center; }
.wf-root .b-tabs__panel.is-active { animation: wf-rise var(--wb-dur) var(--wb-ease); }

/* ---------- 折叠面板 / 常见问题 ---------- */
.wf-root .b-acc__item { background: var(--wf-card-bg, var(--wf-bg)); border: 1px solid var(--wf-card-border, var(--wb-line)); border-radius: var(--r-md); overflow: hidden; transition: box-shadow var(--wb-dur) var(--wb-ease), border-color var(--wb-dur) var(--wb-ease); }
.wf-root .b-acc__item[open] { box-shadow: var(--wb-shadow-sm); border-color: color-mix(in srgb, var(--wf-primary) 34%, var(--wb-line)); }
.wf-root .b-acc__head { cursor: pointer; list-style: none; display: flex; align-items: center; justify-content: space-between; gap: var(--wb-gap-sm); padding: 18px 20px; }
.wf-root .b-acc__head::-webkit-details-marker { display: none; }
.wf-root .b-acc__chev { color: var(--wf-primary); font-size: 1.1em; transition: transform var(--wb-dur) var(--wb-ease); flex: none; }
.wf-root .b-acc__item[open] .b-acc__chev { transform: rotate(180deg); }
.wf-root .b-acc__body { padding: 0 20px 18px; color: var(--wf-muted); }
.wf-root .b-acc__item[open] .b-acc__body { animation: wf-rise var(--wb-dur) var(--wb-ease); }
.wf-root .b-faq__q { transition: color var(--wb-dur-fast) var(--wb-ease), background var(--wb-dur-fast) var(--wb-ease); }
.wf-root .b-faq__q:hover { color: var(--wf-primary); }
.wf-root .b-faq__q::after { transition: transform var(--wb-dur) var(--wb-ease); }
.wf-root .b-faq__item.is-open .b-faq__a-inner { animation: wf-rise var(--wb-dur) var(--wb-ease); }

/* ---------- 图片热点 ---------- */
.wf-root .b-hotspot__dot {
  transition: transform var(--wb-dur) var(--wb-ease), background var(--wb-dur-fast), color var(--wb-dur-fast), box-shadow var(--wb-dur-fast);
}
.wf-root .b-hotspot__dot:hover { transform: translate(-50%, -50%) scale(1.12); }
.wf-root .b-hotspot__dot.is-open { background: var(--wf-primary); color: #fff; box-shadow: 0 0 0 4px color-mix(in srgb, var(--wf-primary) 28%, transparent); }
.wf-root .b-hotspot__tip {
  background: var(--wf-tip-bg); backdrop-filter: blur(10px); border-radius: var(--r-sm);
  transition: opacity var(--wb-dur) var(--wb-ease), transform var(--wb-dur) var(--wb-ease);
  transform: translate(-50%, 6px);
}
.wf-root .b-hotspot__dot.is-open + .b-hotspot__tip { transform: translate(-50%, 0); }

/* ---------- 互动问答 ---------- */
.wf-root .b-quiz__opt {
  transition: border-color var(--wb-dur-fast) var(--wb-ease), transform var(--wb-dur-fast) var(--wb-ease), background var(--wb-dur-fast) var(--wb-ease);
  border-radius: var(--r-sm); padding: 14px 16px;
}
.wf-root .b-quiz__opt:hover { transform: translateX(2px); }
.wf-root .b-quiz__opt.is-right { border-color: var(--wf-ok); background: var(--wf-ok-soft); }
.wf-root .b-quiz__opt.is-wrong { border-color: var(--wf-danger); background: var(--wf-danger-soft); }
.wf-root .b-quiz__key { width: 26px; height: 26px; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; background: var(--wf-primary-soft); color: var(--wf-primary); font-weight: 700; font-size: 12px; flex: none; }

/* ---------- 前后对比 / 表单错误 ---------- */
.wf-root .b-ba__label { height: var(--wb-pill-h); display: inline-flex; align-items: center; padding: 0 12px; border-radius: 999px; font-size: 12px; font-weight: 650; }
.wf-root .b-ba__img { border-color: var(--wf-card-border, var(--wb-line)); border-radius: var(--r-md); }
.wf-root .b-form__field.is-error .b-form__input { border-color: var(--wf-danger); }
.wf-root .b-form__msg { color: var(--wf-danger); font-size: var(--wf-fs-meta); }


/* ---------- 地图:OSM 瓦片 + 标记点 + 失败降级 ---------- */
.wf-root .b-map__placeholder { position: relative; overflow: hidden; }
.wf-root .b-map__tiles { position: absolute; inset: 0; }
.wf-root .b-map__tiles.is-fallback { display: none; }
.wf-root .b-map__tile {
  position: absolute; width: calc(25% + 1px); height: calc(44.4444% + 1px);
  object-fit: fill; border: 0; border-radius: 0; pointer-events: none; user-select: none;
}
.wf-root .b-map__tiles.is-fallback ~ .b-map__pin { display: none; }
.wf-root .b-map__fallback { display: none; position: absolute; inset: 0; place-items: center; }
.wf-root .b-map__tiles.is-fallback ~ .b-map__fallback { display: grid; }
.wf-root .b-map__pin { position: absolute; transform: translate(-50%, -100%); z-index: 2; display: flex; flex-direction: column; align-items: center; }
.wf-root .b-map__pin-dot {
  width: 16px; height: 16px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg);
  background: var(--wf-primary); border: 2px solid #fff; box-shadow: 0 3px 10px rgba(15,23,42,.4);
}
.wf-root .b-map__pin-label {
  margin-top: 6px; padding: 3px 9px; border-radius: 999px; white-space: nowrap;
  background: color-mix(in srgb, #0b1220 80%, transparent); color: #fff;
  font-size: 12px; font-weight: 650; backdrop-filter: blur(6px); opacity: 0;
  transition: opacity var(--wb-dur) var(--wb-ease);
}
.wf-root .b-map__pin:hover .b-map__pin-label, .wf-root .b-map__pin:focus .b-map__pin-label { opacity: 1; }
.wf-root .b-map__osm {
  position: absolute; right: 10px; bottom: 10px; z-index: 3;
  padding: 6px 11px; border-radius: 999px; font-size: 12px; font-weight: 650;
  background: color-mix(in srgb, var(--wf-bg) 88%, transparent); color: var(--wf-text);
  border: 1px solid var(--wb-line); backdrop-filter: blur(8px);
  transition: background var(--wb-dur-fast) var(--wb-ease), color var(--wb-dur-fast) var(--wb-ease);
}
.wf-root .b-map__osm:hover { background: var(--wf-primary); color: #fff; border-color: var(--wf-primary); }
.wf-root .b-map__credit {
  position: absolute; left: 10px; bottom: 10px; z-index: 3;
  padding: 4px 9px; border-radius: 999px; font-size: 11px; font-weight: 600;
  background: color-mix(in srgb, var(--wf-bg) 82%, transparent); color: var(--wf-muted);
  border: 1px solid var(--wb-line); backdrop-filter: blur(8px);
}
.wf-root .b-map__marker { display: flex; flex-direction: column; gap: 3px; }
.wf-root .b-map__marker span { color: var(--wf-muted); font-size: var(--wf-fs-meta); }

/* ---------- 卡片阴影:由主题令牌驱动(主题面板「阴影强度」可调) ---------- */
.wf-root .b-feature, .wf-root .b-testi, .wf-root .b-price, .wf-root .b-blog__card,
.wf-root .b-product__card, .wf-root .b-tool__card, .wf-root .b-proof__cell,
.wf-root .b-cluster__card, .wf-root .b-bento__cell, .wf-root .b-logowall__chip,
.wf-root .b-social__link { box-shadow: var(--wb-shadow-sm); }
.wf-root .b-feature, .wf-root .b-testi, .wf-root .b-blog__card, .wf-root .b-product__card,
.wf-root .b-price, .wf-root .b-cluster__card, .wf-root .b-bento__cell, .wf-root .b-proof__cell {
  transition: box-shadow .22s var(--wb-ease), transform .22s var(--wb-ease), border-color .22s var(--wb-ease);
}
.wf-root .b-feature:hover, .wf-root .b-testi:hover, .wf-root .b-blog__card:hover,
.wf-root .b-product__card:hover, .wf-root .b-tool__card:hover,
.wf-root .b-cluster__card:hover, .wf-root .b-bento__cell:hover, .wf-root .b-proof__cell:hover {
  box-shadow: var(--wb-shadow-md);
}
.wf-root .b-price.is-featured {
  box-shadow: 0 24px 48px -24px color-mix(in srgb, var(--wf-primary) 65%, transparent), var(--wb-shadow-md);
}

/* ---------- 文字质量:换行更自然 + 锚点不被吸顶导航遮挡 ---------- */
.wf-root h1, .wf-root h2, .wf-root h3, .wf-root .wb-title, .wf-root .wb-kpi { text-wrap: balance; }
.wf-root p, .wf-root li, .wf-root .wb-subtitle, .wf-root .wb-lead { text-wrap: pretty; }
.wf-root .wf-block[id] { scroll-margin-top: 92px; }
.wf-root .b-nav__links a, .wf-root .b-footer__links a { transition: color .18s var(--wb-ease); }
.wf-root .b-nav__links { gap: var(--wb-gap-lg); }
.wf-root .b-footer__grid { gap: var(--wb-gap-xl); }
.wf-root .b-footer__links { gap: var(--wb-gap); }

/* ============ 形态:story 互动叙事 ============ */
.wf-mode-story .wf-progress { position: fixed; top: 0; left: 0; height: 3px; background: var(--wf-primary); z-index: 80; width: 0; transition: width .1s linear; }
.wf-mode-story.is-snap .wf-page { scroll-snap-type: y mandatory; height: 100vh; overflow-y: scroll; }
.wf-mode-story.is-snap .wf-page > .wf-block { scroll-snap-align: start; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; }
.wf-mode-story.is-snap .wb-inner { width: 100%; }
.wf-mode-story.is-snap .b-nav { position: static; }

/* 官网导出在真实手机上的响应式 */
@media (max-width: 860px) {
  .b-features__grid, .b-testi__grid, .b-pricing__grid { grid-template-columns: 1fr !important; }
  .b-stats__grid { grid-template-columns: repeat(2, 1fr) !important; }
  .b-gallery__grid { grid-template-columns: repeat(2, 1fr) !important; }
  .b-split__grid { grid-template-columns: 1fr !important; gap: 28px; }
  .b-split.is-flip .b-split__grid > :first-child { order: 1; }
  .b-split.is-flip .b-split__grid > :last-child { order: 2; }
  .b-hero__title { font-size: var(--wf-fs-h2); }
  .b-nav__links { display: none; }
  .wf-deck { font-size: 26px; }
  .b-blog__grid, .b-product__grid { grid-template-columns: repeat(2, 1fr) !important; }
  .b-proof__bar { grid-template-columns: repeat(2, 1fr) !important; }
  .b-cluster__grid, .b-logowall__grid { grid-template-columns: repeat(2, 1fr) !important; }
  .b-journey__step { gap: 12px; }
  .b-team__grid { grid-template-columns: repeat(2, 1fr) !important; }
  .b-social__grid { justify-content: flex-start; }
  .b-form { padding: 24px; }
  /* 质量层响应式 */
  .wf-root .wb-grid, .wf-root .wb-grid[data-cols="4"] { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
  .wf-root .wb-split2 { grid-template-columns: 1fr !important; gap: 28px; }
  .wf-root .wb-split2.is-flip > :first-child { order: 0; }
  .wf-root .wb-mosaic { grid-template-columns: repeat(4, 1fr) !important; }
  .wf-root .wb-inner { padding-left: 20px; padding-right: 20px; }
}

@media (max-width: 560px) {
  .b-blog__grid, .b-product__grid, .b-team__grid { grid-template-columns: 1fr !important; }
  .b-social__grid { flex-direction: column; }
  .b-proof__bar, .b-cluster__grid, .b-logowall__grid { grid-template-columns: 1fr !important; }
  .b-tool__grid, .b-portrait__grid { grid-template-columns: 1fr !important; }
  .b-social__link { width: 100%; justify-content: center; }
}
`;
