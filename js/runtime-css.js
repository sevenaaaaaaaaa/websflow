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
.b-hero__title { font-size: 3em; font-weight: 800; letter-spacing: -0.02em; }
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
  padding: 3.2em 4em; background: var(--wf-bg);
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
.wf-mode-h5 .b-hero__title { font-size: 2.1em; }
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
  .b-hero__title { font-size: 2.2em; }
  .b-nav__links { display: none; }
  .wf-deck { font-size: 26px; }
}
`;
