/* ============================================================
 * WebsFlow · 编辑器 (editor.js)
 *
 * 理念来源 — Elementor 三栏工作台 + WordPress 区块插入:
 *   左:模块库 / 大纲 / 主题与页面 / 版本
 *   中:真实渲染画布(与导出共用渲染器,所见即所得)
 *   右:按内容 schema 自动生成的属性检查器
 * ============================================================ */
window.WF = window.WF || {};

(function (WF) {
  "use strict";

  const state = { proj: null, session: null, sel: null, leftTab: "blocks", device: "desktop" };
  const $ = (sel, el) => (el || document).querySelector(sel);
  const $$ = (sel, el) => Array.from((el || document).querySelectorAll(sel));
  const esc = (s) => WF.esc(s);

  // ============================================================
  //  启动与路由
  // ============================================================
  function boot() {
    const style = document.createElement("style");
    style.textContent = WF.runtimeCSS;
    document.head.appendChild(style);
    bindGlobal();
    route();
  }

  function route() {
    const m = location.hash.match(/^#\/p\/(\w+)/);
    if (m) {
      const proj = WF.getProject(m[1]);
      if (proj) return openEditor(proj);
    }
    closeEditor();
    renderHub();
  }

  function closeEditor() {
    if (state.session) { state.session.destroy(); state.session = null; }
    state.proj = null; state.sel = null;
  }

  // ============================================================
  //  Hub 项目首页
  // ============================================================
  function renderHub() {
    document.title = "WebsFlow 魔块 · 快速建站工场";
    const projects = WF.listProjects();
    const modeBadge = (mode) => {
      const m = WF.Modes[mode] || WF.Modes.site;
      return `<span class="hub-card__mode" style="color:${m.color};background:${m.soft}">${m.icon} ${m.name}</span>`;
    };
    $("#app").innerHTML = `
    <div class="hub">
      <div class="hub__top">
        <div class="hub__logo"><span class="hub__logo-mark">W</span>
          <div>WebsFlow 魔块<small>模块化页面工场 · 官网 / H5 / PPT / 互动故事</small></div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="ed-btn" data-act="import-json">⬆ 导入项目</button>
          <button class="ed-btn is-primary" data-act="new-project">＋ 新建页面</button>
        </div>
      </div>
      <div class="hub__wrap">
        <div class="hub__hero">
          <h1>你好,今天想做一个什么页面?</h1>
          <p>选一个场景模板,替换文字即可发布。所有数据保存在本机浏览器,导出即单文件 HTML。</p>
        </div>
        ${projects.length ? `<div class="hub__grid">${projects.map((p) => {
          const m = WF.Modes[p.mode] || WF.Modes.site;
          return `<div class="hub-card" data-act="open" data-id="${p.id}">
            ${modeBadge(p.mode)}
            <div class="hub-card__name">${esc(p.name)}</div>
            <div class="hub-card__desc">${esc((p.global && p.global.description) || p.blocks.length + " 个模块")}</div>
            <div class="hub-card__meta">
              <span>${new Date(p.updatedAt).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })} 编辑</span>
              <span class="hub-card__actions">
                <button class="ed-btn" data-act="preview-proj" data-id="${p.id}" title="预览">👁</button>
                <button class="ed-btn" data-act="dup-proj" data-id="${p.id}" title="复制">⧉</button>
                <button class="ed-btn is-danger" data-act="del-proj" data-id="${p.id}" title="删除">🗑</button>
              </span>
            </div>
          </div>`;
        }).join("")}</div>`
        : `<div class="hub-empty"><div class="hub-empty__icon">🧱</div>
            <p>还没有项目。点击右上角「新建页面」,或选择一个场景模板开始。</p>
            <button class="ed-btn is-primary" style="margin-top:16px" data-act="new-project">＋ 新建页面</button>
          </div>`}
      </div>
    </div>
    <input type="file" id="importFile" accept=".json,application/json" style="display:none">`;
    if (WF.isFirstRun()) showWelcome();
  }

  function showWelcome() {
    const modes = Object.values(WF.Modes);
    openModal(`
      <div class="welcome-hero">
        <div style="font-size:40px">🧱</div>
        <h2>欢迎来到 WebsFlow 魔块</h2>
        <p>选一个场景,10 秒得到一个完整页面;所有内容都可以再改。</p>
      </div>
      <div class="welcome-modes">
        ${modes.map((m) => `<button class="welcome-mode" data-act="welcome-mode" data-mode="${m.key}">
          <div class="welcome-mode__icon">${m.icon}</div>
          <div class="welcome-mode__name">${m.name}</div>
          <div class="welcome-mode__desc">${m.desc}</div>
        </button>`).join("")}
      </div>`, { hideClose: false, sub: "" });
    WF.markFirstRun();
  }

  // ---------- 新建向导 ----------
  function showWizard(modeKey) {
    const modes = Object.values(WF.Modes);
    const mode = modeKey || "site";
    const tpls = WF.templatesFor(mode);
    openModal(`
      <div class="modal__title">新建页面</div>
      <div class="ed-label" style="margin-top:14px">① 选择形态</div>
      <div class="wizard-modes">
        ${modes.map((m) => `<button class="wizard-mode${m.key === mode ? " is-active" : ""}" data-act="wiz-mode" data-mode="${m.key}">
          <div class="wizard-mode__icon">${m.icon}</div>
          <div class="wizard-mode__name">${m.name}</div>
          <div class="wizard-mode__desc">${m.desc}</div>
        </button>`).join("")}
      </div>
      <div class="ed-label">② 选择模板</div>
      <div class="wizard-tpl">
        ${tpls.map((t, i) => `<button data-act="wiz-tpl" data-key="${t.key}" class="${i === 0 ? "is-active" : ""}">
          <div class="wizard-tpl__name">${t.name}</div>
          <div class="wizard-tpl__desc">${t.desc}</div>
        </button>`).join("")}
      </div>
      <div class="ed-label">③ 项目名称</div>
      <input class="ed-input" id="wizName" placeholder="如:春季新品发布页" value="">
    `, {
      title: "新建页面",
      okText: "创建并开始编辑",
      onOk() {
        const modeKey2 = $("#wizModeKey").value;
        const tplKey = $("#wizTplKey").value;
        const tpl = WF.templatesFor(modeKey2).find((t) => t.key === tplKey);
        const name = $("#wizName").value.trim() || ((tpl && tpl.name) || "新页面") + " · " + WF.Modes[modeKey2].name;
        const proj = WF.createProject(name, modeKey2, tplKey);
        closeModal();
        location.hash = "#/p/" + proj.id;
      },
    });
    // 隐藏状态
    const holder = document.createElement("div");
    holder.innerHTML = `<input type="hidden" id="wizModeKey" value="${mode}"><input type="hidden" id="wizTplKey" value="${tpls[0].key}">`;
    $(".modal").appendChild(holder);
  }

  // ============================================================
  //  编辑器主体
  // ============================================================
  function openEditor(proj) {
    state.proj = proj;
    state.session = new WF.Session(proj);
    state.sel = (proj.blocks.find((b) => !b.hidden) || proj.blocks[0] || {}).id || null;
    state.leftTab = "blocks";
    state.device = WF.Modes[proj.mode].defaultDevice || "desktop";
    document.title = proj.name + " · WebsFlow";
    renderShell();
    refreshAll();
  }

  function renderShell() {
    const p = state.proj;
    const m = WF.Modes[p.mode];
    $("#app").innerHTML = `
    <div class="ed">
      <div class="ed-top">
        <span class="ed-top__logo" data-act="go-hub" title="返回项目列表"><span class="ed-top__logo-mark">W</span></span>
        <input class="ed-top__name" id="projName" value="${esc(p.name)}" title="点击重命名">
        <span class="ed-mode-badge" style="color:${m.color};background:${m.soft}">${m.icon} ${m.name}</span>
        <button class="ed-btn is-ghost" data-act="undo" title="撤销 (⌘Z)">↩</button>
        <button class="ed-btn is-ghost" data-act="redo" title="重做 (⇧⌘Z)">↪</button>
        <div class="ed-top__spacer"></div>
        <span class="ed-top__save" id="edSave"><span class="dot"></span><span id="edSaveText">已保存</span></span>
        <div class="ed-seg" id="deviceSeg">${deviceSegHTML()}</div>
        <button class="ed-btn" data-act="preview" title="在新窗口打开导出效果">👁 预览</button>
        <button class="ed-btn" data-act="export-html">⬇ 导出 HTML</button>
        <button class="ed-btn" data-act="export-json">{ } JSON</button>
        <button class="ed-btn is-primary" data-act="open-tab" data-tab="theme">🎨 主题与发布</button>
      </div>
      <div class="ed-body">
        <div class="ed-left">
          <div class="ed-left__tabs">
            <button class="ed-left__tab" data-act="left-tab" data-tab="blocks">模块</button>
            <button class="ed-left__tab" data-act="left-tab" data-tab="outline">大纲</button>
            <button class="ed-left__tab" data-act="left-tab" data-tab="theme">主题</button>
            <button class="ed-left__tab" data-act="left-tab" data-tab="version">版本</button>
          </div>
          <div class="ed-left__body" id="leftBody"></div>
        </div>
        <div class="ed-canvas">
          <div class="ed-stage" id="stageScroll">
            <div class="ed-stage__frame" id="stageFrame">
              <div id="wfCanvas" class="wf-editing"></div>
            </div>
          </div>
        </div>
        <div class="ed-right" id="inspector"></div>
      </div>
    </div>`;
  }

  function deviceSegHTML() {
    const mode = state.proj.mode;
    const segs = { site: [["desktop", "🖥 桌面"], ["tablet", "📲 平板"], ["mobile", "📱 手机"]], h5: [["phone", "📱 手机"]], story: [["desktop", "🖥 桌面"], ["mobile", "📱 手机"]], ppt: [["deck", "幻灯片"]] };
    return (segs[mode] || segs.site).map(([k, label]) =>
      `<button data-act="device" data-device="${k}" class="${state.device === k ? "is-active" : ""}">${label}</button>`).join("");
  }

  // ---------- 保存状态指示 ----------
  function saveStatus(s) {
    const el = $("#edSave");
    if (!el) return;
    el.classList.toggle("is-saving", s === "saving");
    $("#edSaveText").textContent = s === "saving" ? "保存中…" : "已保存 " + new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  }

  // ---------- 全量刷新 ----------
  function refreshAll() {
    if (!state.proj) return;
    renderLeft();
    renderCanvas();
    renderInspector();
    const nameInput = $("#projName");
    if (nameInput && nameInput.value !== state.proj.name) nameInput.value = state.proj.name;
  }

  // ============================================================
  //  左侧面板
  // ============================================================
  function renderLeft() {
    const tab = state.leftTab;
    $$(".ed-left__tab").forEach((b) => b.classList.toggle("is-active", b.dataset.tab === tab));
    const body = $("#leftBody");
    if (!body) return;
    if (tab === "blocks") body.innerHTML = libHTML();
    else if (tab === "outline") body.innerHTML = outlineHTML();
    else if (tab === "theme") body.innerHTML = themeHTML();
    else if (tab === "version") body.innerHTML = versionHTML();
  }

  function libHTML() {
    const mode = state.proj.mode;
    return WF.Categories.map((cat) => {
      const types = Object.keys(WF.Blocks).filter((t) => WF.Blocks[t].category === cat && WF.Blocks[t].modes.includes(mode));
      if (!types.length) return "";
      return `<div class="lib-cat"><div class="lib-cat__title">${cat}</div><div class="lib-grid">
        ${types.map((t) => `<div class="lib-item" draggable="true" data-lib-type="${t}" data-act="add-block" data-type="${t}" title="${esc(WF.Blocks[t].desc)}">
          <div class="lib-item__icon">${WF.Blocks[t].icon}</div><div class="lib-item__name">${WF.Blocks[t].name}</div>
        </div>`).join("")}
      </div></div>`;
    }).join("") + `<div class="ed-hint" style="margin-top:8px">点击或拖拽模块到画布;画布内可点选、拖动排序。</div>`;
  }

  function outlineHTML() {
    const blocks = state.proj.blocks;
    if (!blocks.length) return `<div class="outline-empty">画布还是空的<br>从「模块」里添加第一个内容吧</div>`;
    return blocks.map((b, i) => {
      const def = WF.Blocks[b.type];
      const summary = def.summary ? def.summary(b.props) : "";
      return `<div class="outline-item${state.sel === b.id ? " is-active" : ""}" data-act="select" data-id="${b.id}">
        <span class="outline-item__icon">${def.icon}</span>
        <span class="outline-item__name${b.hidden ? " is-hidden" : ""}">${def.name}${summary ? " · " + esc(String(summary).slice(0, 14)) : ""}</span>
        <button class="outline-item__act" data-act="toggle-hide" data-id="${b.id}" title="显示/隐藏">${b.hidden ? "🙈" : "👁"}</button>
        <button class="outline-item__act" data-act="del" data-id="${b.id}" title="删除">✕</button>
      </div>`;
    }).join("");
  }

  function themeHTML() {
    const p = state.proj;
    const t = p.theme || {};
    const preset = WF.getPreset(t.preset);
    const mode = p.mode;
    return `
      <div class="insp__section">
        <div class="insp__section-title">主题预设</div>
        <div class="theme-grid">
          ${WF.ThemePresets.map((th) => `<div class="theme-card${(t.preset || "indigo") === th.key ? " is-active" : ""}" data-act="theme-preset" data-key="${th.key}">
            <div class="theme-card__swatches">
              <span class="theme-card__swatch" style="background:${th.primary}"></span>
              <span class="theme-card__swatch" style="background:${th.bg};border:1px solid ${th.border}"></span>
              <span class="theme-card__swatch" style="background:${th.surface}"></span>
            </div>
            <div class="theme-card__name">${th.name}</div>
          </div>`).join("")}
        </div>
      </div>
      <div class="insp__section">
        <div class="insp__section-title">微调</div>
        ${colorField("主色", "primary", t.primary || preset.primary)}
        <div class="field"><label class="ed-label">圆角 <span id="radiusVal">${t.radius != null ? t.radius : preset.radius}</span>px</label>
          <input type="range" min="0" max="28" step="2" value="${t.radius != null ? t.radius : preset.radius}" data-act="theme-radius" style="width:100%"></div>
        <div class="field"><label class="ed-label">正文字体</label>
          <select class="ed-select" data-act="theme-font">${WF.Fonts.map(([k, n]) => `<option value="${k}" ${(t.font || preset.font) === k ? "selected" : ""}>${n}</option>`).join("")}</select></div>
        <div class="field"><label class="ed-label">标题字体</label>
          <select class="ed-select" data-act="theme-hfont">${WF.Fonts.map(([k, n]) => `<option value="${k}" ${(t.headingFont || "inherit") === k ? "selected" : ""}>${k === "inherit" ? "跟随正文" : n}</option>`).join("")}</select></div>
        <div class="field"><label class="ed-label">整体字号 <span id="scaleVal">${Math.round((t.fontScale || 1) * 100)}%</span></label>
          <input type="range" min="85" max="125" step="5" value="${Math.round((t.fontScale || 1) * 100)}" data-act="theme-scale" style="width:100%"></div>
      </div>
      <div class="insp__section">
        <div class="insp__section-title">页面信息(SEO / 分享)</div>
        <div class="field"><label class="ed-label">页面标题</label><input class="ed-input" data-gset="title" value="${esc((p.global && p.global.title) || "")}"></div>
        <div class="field"><label class="ed-label">页面描述</label><textarea class="ed-textarea" rows="2" data-gset="description">${esc((p.global && p.global.description) || "")}</textarea></div>
      </div>
      ${mode === "h5" ? `<div class="insp__section"><div class="insp__section-title">底部悬浮按钮(H5)</div>
        <div class="field"><label class="ed-label">按钮文字</label><input class="ed-input" data-gset="h5.ctaText" value="${esc((p.global.h5 && p.global.h5.ctaText) || "")}" placeholder="留空则不显示"></div>
        <div class="field"><label class="ed-label">按钮链接</label><input class="ed-input" data-gset="h5.ctaLink" value="${esc((p.global.h5 && p.global.h5.ctaLink) || "")}"></div>
      </div>` : ""}
      ${mode === "story" ? `<div class="insp__section"><div class="insp__section-title">互动叙事</div>
        <div class="field-toggle"><label class="ed-label">整屏滚动(每模块占一屏)</label>
          <label class="switch"><input type="checkbox" data-gset="story.snap" ${p.global.story && p.global.story.snap ? "checked" : ""}><span></span></label></div>
      </div>` : ""}
      <div class="insp__section">
        <div class="insp__section-title">发布</div>
        <button class="ed-btn" style="width:100%;margin-bottom:8px" data-act="preview">👁 预览导出效果</button>
        <button class="ed-btn is-primary" style="width:100%;margin-bottom:8px" data-act="export-html">⬇ 导出单文件 HTML</button>
        <button class="ed-btn" style="width:100%" data-act="export-json">{ } 导出内容 JSON</button>
        <div class="ed-hint">HTML 可上传任意静态空间直接访问;JSON 可随时导入回来继续编辑。</div>
      </div>`;
  }

  function colorField(label, key, value) {
    return `<div class="field"><label class="ed-label">${label}</label>
      <div class="field-color"><input type="color" value="${/^#[0-9a-fA-F]{6}$/.test(value || "") ? value : "#4f46e5"}" data-act="theme-color" data-key="${key}">
      <button class="ed-btn is-ghost" data-act="theme-color-reset" data-key="${key}" style="padding:5px 10px;font-size:12px">跟随预设</button></div></div>`;
  }

  function versionHTML() {
    const p = state.proj;
    const vers = p.versions || [];
    return `
      <button class="ed-btn is-primary" style="width:100%;margin-bottom:14px" data-act="snapshot">📌 保存当前版本</button>
      <div class="ed-hint" style="margin-bottom:12px">每 4 分钟有改动时自动快照;导出/大改前建议手动保存一份。</div>
      ${vers.length ? vers.map((v, i) => `<div class="ver-item">
        <div class="ver-item__main">
          <div class="ver-item__name">${v.isAuto ? "🕒 " : "📌 "}${esc(v.name)}</div>
          <div class="ver-item__time">${new Date(v.time).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}${v.isAuto ? " · 自动" : ""}</div>
        </div>
        <button class="ed-btn" data-act="restore" data-i="${i}">恢复</button>
      </div>`).join("") : `<div class="outline-empty">还没有版本快照</div>`}`;
  }

  // ============================================================
  //  画布
  // ============================================================
  function renderCanvas() {
    const stage = $("#wfCanvas");
    if (!stage) return;
    const frame = $("#stageFrame");
    frame.className = "ed-stage__frame " + ({ desktop: "", tablet: "is-tablet", mobile: "is-mobile", phone: "is-phone", deck: "is-deck" }[state.device] || "");
    const scrollBox = $("#stageScroll");
    const st = scrollBox.scrollTop;
    (stage.__wfTimers || []).forEach((t) => clearInterval(t));
    stage.__wfTimers = [];
    stage.innerHTML = WF.renderProject(state.proj, { context: "edit" });
    WF.runtimeFn(stage);
    scrollBox.scrollTop = st;
    applySelection();
  }

  function applySelection() {
    $$("#wfCanvas .wf-block").forEach((el) => el.classList.toggle("is-selected", el.dataset.wfId === state.sel));
  }

  function select(id, scroll) {
    state.sel = id;
    applySelection();
    renderInspector();
    renderLeft();
    if (scroll) {
      const el = $(`#wfCanvas [data-wf-id="${id}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  // ---------- 结构操作 ----------
  function addBlock(type, index) {
    const b = WF.newBlock(type);
    const blocks = state.proj.blocks;
    if (index == null) {
      const selIdx = blocks.findIndex((x) => x.id === state.sel);
      index = selIdx >= 0 ? selIdx + 1 : blocks.length;
    }
    blocks.splice(index, 0, b);
    state.session.commit();
    state.sel = b.id;
    refreshAll();
    requestAnimationFrame(() => $(`#wfCanvas [data-wf-id="${b.id}"]`) && $(`#wfCanvas [data-wf-id="${b.id}"]`).scrollIntoView({ behavior: "smooth", block: "center" }));
  }

  function indexOf(id) { return state.proj.blocks.findIndex((b) => b.id === id); }

  function moveBlock(id, toIndex) {
    const blocks = state.proj.blocks;
    const from = indexOf(id);
    if (from < 0) return;
    if (toIndex > from) toIndex--;
    if (from === toIndex) return;
    const [b] = blocks.splice(from, 1);
    blocks.splice(toIndex, 0, b);
    state.session.commit();
    refreshAll();
  }

  function blockAction(act, id) {
    const blocks = state.proj.blocks;
    const i = indexOf(id);
    if (i < 0) return;
    if (act === "up" && i > 0) { [blocks[i - 1], blocks[i]] = [blocks[i], blocks[i - 1]]; }
    else if (act === "down" && i < blocks.length - 1) { [blocks[i + 1], blocks[i]] = [blocks[i], blocks[i + 1]]; }
    else if (act === "dup") {
      const copy = JSON.parse(JSON.stringify(blocks[i]));
      copy.id = "b" + Math.random().toString(36).slice(2, 9);
      blocks.splice(i + 1, 0, copy);
      state.sel = copy.id;
    }
    else if (act === "hide") { blocks[i].hidden = !blocks[i].hidden; }
    else if (act === "del") {
      if (!confirm("确定删除这个「" + WF.Blocks[blocks[i].type].name + "」模块?")) return;
      blocks.splice(i, 1);
      if (state.sel === id) state.sel = (blocks[i] || blocks[i - 1] || {}).id || null;
    }
    else return;
    state.session.commit();
    refreshAll();
  }

  // ============================================================
  //  右侧检查器(schema 驱动)
  // ============================================================
  function selBlock() { return state.proj.blocks.find((b) => b.id === state.sel) || null; }

  function renderInspector() {
    const box = $("#inspector");
    if (!box) return;
    const b = selBlock();
    if (!b) {
      box.innerHTML = `<div class="insp-empty">👆 在画布中点选一个模块<br>在这里编辑它的内容与样式</div>`;
      return;
    }
    const def = WF.Blocks[b.type];
    let html = `<div class="insp__header"><span class="insp__header-icon">${def.icon}</span><span class="insp__header-name">${def.name}</span>
      <button class="ed-btn is-ghost" data-act="dup-sel" title="复制模块">⧉</button>
      <button class="ed-btn is-ghost is-danger" data-act="del-sel" title="删除模块">✕</button></div>
      <div class="insp__body">`;
    html += `<div class="insp__section"><div class="insp__section-title">内容</div>${def.fields.map((f) => fieldHTML(f, b.props, b.id)).join("")}</div>`;
    html += `<div class="insp__section"><div class="insp__section-title">样式</div>
      ${colorField("背景色(留空跟随主题)", "bg", b.style.bg).replace('data-act="theme-color"', 'data-act="block-color"').replace('data-act="theme-color-reset"', 'data-act="block-color-reset"')}
      <div class="field"><label class="ed-label">上下留白</label>
        <select class="ed-select" data-bset="padding">
          ${[["tight", "紧凑"], ["normal", "标准"], ["loose", "宽松"]].map(([v, n]) => `<option value="${v}" ${(b.style.padding || "normal") === v ? "selected" : ""}>${n}</option>`).join("")}
        </select></div>
      <div class="field"><label class="ed-label">入场动画</label>
        <select class="ed-select" data-bset="anim">
          ${[["up", "上浮"], ["left", "左入"], ["right", "右入"], ["zoom", "缩放"], ["none", "无"]].map(([v, n]) => `<option value="${v}" ${(b.style.anim || "up") === v ? "selected" : ""}>${n}</option>`).join("")}
        </select><div class="ed-hint">导出页面滚动到该模块时触发</div></div>
    </div></div>`;
    box.innerHTML = html;
  }

  // 把值路径写入 props:"title" 或 "items.2.desc"
  function setPath(obj, path, val) {
    const keys = path.split(".");
    let o = obj;
    for (let i = 0; i < keys.length - 1; i++) o = o[keys[i]];
    o[keys[keys.length - 1]] = val;
  }

  function fieldHTML(f, props, blockId) {
    const val = props[f.key];
    const p = `data-bid="${blockId}" data-fkey="${f.key}"`;
    let inner = "";
    if (f.type === "text" || f.type === "url") {
      inner = `<input class="ed-input" ${p} value="${esc(val || "")}" placeholder="${esc(f.placeholder || "")}">`;
    } else if (f.type === "number") {
      inner = `<input class="ed-input" type="number" ${p} value="${esc(val == null ? "" : val)}">`;
    } else if (f.type === "datetime") {
      inner = `<input class="ed-input" type="datetime-local" ${p} value="${esc(val || "")}">`;
    } else if (f.type === "textarea") {
      inner = `<textarea class="ed-textarea" rows="${f.rows || 3}" ${p} placeholder="${esc(f.placeholder || "")}">${esc(val || "")}</textarea>`;
    } else if (f.type === "select") {
      inner = `<select class="ed-select" ${p}>${f.options.map(([v, n]) => `<option value="${esc(v)}" ${String(val) === String(v) ? "selected" : ""}>${n}</option>`).join("")}</select>`;
    } else if (f.type === "toggle") {
      inner = `<label class="switch"><input type="checkbox" ${p} ${val ? "checked" : ""}><span></span></label>`;
    } else if (f.type === "image") {
      inner = imageFieldHTML(f, val, p);
    } else if (f.type === "list") {
      return listFieldHTML(f, props, blockId);
    }
    return `<div class="field"><label class="ed-label">${f.label}</label>${inner}${f.hint ? `<div class="ed-hint">${f.hint}</div>` : ""}</div>`;
  }

  function imageFieldHTML(f, val, p) {
    return `<div class="field-image" ${p}>
      ${val ? `<img src="${esc(val)}" style="width:100%;border-radius:8px;margin-bottom:6px;max-height:110px;object-fit:cover" alt="">` : ""}
      <div class="field-row">
        <input class="ed-input" data-img="url" value="${esc(val || "")}" placeholder="图片链接或上传">
        <button class="ed-btn" data-img="upload" style="flex:none">上传</button>
      </div>
      <input type="file" accept="image/*" style="display:none" data-img="file">
    </div>`;
  }

  function listFieldHTML(f, props, blockId) {
    const items = props[f.key] || [];
    return `<div class="field"><label class="ed-label">${f.label}(${items.length})</label>
      <div class="list-editor" data-listkey="${f.key}" data-bid="${blockId}">
        ${items.map((it, i) => `<div class="list-editor__item" data-idx="${i}">
          <div class="list-editor__item-head">
            <span class="list-editor__item-title">#${i + 1}</span>
            <span class="list-editor__item-acts">
              <button data-listop="up" title="上移">↑</button>
              <button data-listop="down" title="下移">↓</button>
              <button data-listop="del" title="删除">✕</button>
            </span>
          </div>
          ${f.itemFields.map((sf) => {
            const v = it[sf.key];
            if (sf.type === "select") {
              return `<div class="field" style="margin-bottom:8px"><label class="ed-label" style="font-size:11px">${sf.label}</label>
                <select class="ed-select" data-ifkey="${sf.key}" data-idx="${i}">${sf.options.map(([ov, on]) => `<option value="${esc(ov)}" ${String(v) === String(ov) ? "selected" : ""}>${on}</option>`).join("")}</select></div>`;
            }
            if (sf.type === "textarea") {
              return `<div class="field" style="margin-bottom:8px"><label class="ed-label" style="font-size:11px">${sf.label}</label>
                <textarea class="ed-textarea" rows="${sf.rows || 2}" data-ifkey="${sf.key}" data-idx="${i}">${esc(v || "")}</textarea></div>`;
            }
            if (sf.type === "number") {
              return `<div class="field" style="margin-bottom:8px"><label class="ed-label" style="font-size:11px">${sf.label}</label>
                <input class="ed-input" type="number" data-ifkey="${sf.key}" data-idx="${i}" value="${esc(v == null ? "" : v)}"></div>`;
            }
            return `<div class="field" style="margin-bottom:8px"><label class="ed-label" style="font-size:11px">${sf.label}</label>
              <input class="ed-input" data-ifkey="${sf.key}" data-idx="${i}" value="${esc(v || "")}" placeholder="${esc(sf.placeholder || "")}"></div>`;
          }).join("")}
        </div>`).join("")}
        <button class="list-editor__add" data-listop="add">＋ 添加一项</button>
      </div></div>`;
  }

  function newItem(f) {
    const it = {};
    f.itemFields.forEach((sf) => {
      it[sf.key] = sf.type === "select" ? sf.options[0][0] : sf.type === "number" ? 50 : "";
    });
    return it;
  }

  // ---------- 检查器输入绑定 ----------
  function bindInspectorEvents(e) {
    const insp = $("#inspector");
    if (!insp || !insp.contains(e.target)) return false;

    // 列表操作
    const listBtn = e.target.closest("[data-listop]");
    if (listBtn) {
      const wrap = listBtn.closest(".list-editor");
      const key = wrap.dataset.listkey;
      const b = state.proj.blocks.find((x) => x.id === wrap.dataset.bid);
      const arr = b.props[key];
      const op = listBtn.dataset.listop;
      if (op === "add") arr.push(newItem(wrap._fieldDef || findFieldDef(b, key)));
      else {
        const itemEl = listBtn.closest(".list-editor__item");
        const idx = +itemEl.dataset.idx;
        if (op === "del") { if (arr.length <= 1 && key !== "options") { WF.toast("至少保留一项"); return true; } arr.splice(idx, 1); }
        else if (op === "up" && idx > 0) { [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]; }
        else if (op === "down" && idx < arr.length - 1) { [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]]; }
      }
      state.session.commit();
      renderInspector(); renderCanvas(); renderLeft();
      return true;
    }

    // 图片上传按钮
    const upBtn = e.target.closest('[data-img="upload"]');
    if (upBtn) {
      const holder = upBtn.closest(".field-image");
      const file = holder.querySelector('[data-img="file"]');
      file.onchange = () => {
        if (!file.files[0]) return;
        compressImage(file.files[0], (dataUrl) => {
          const bid = holder.dataset.bid, fkey = holder.dataset.fkey;
          const b = state.proj.blocks.find((x) => x.id === bid);
          b.props[fkey] = dataUrl;
          state.session.commit();
          renderInspector(); renderCanvas();
        });
      };
      file.click();
      return true;
    }
    return false;
  }

  function findFieldDef(b, key) { return (WF.Blocks[b.type].fields || []).find((f) => f.key === key); }

  function compressImage(file, cb) {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxW = 1600;
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        cb(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  // ============================================================
  //  全局事件
  // ============================================================
  function bindGlobal() {
    document.addEventListener("click", onClick);
    document.addEventListener("input", onInput);
    document.addEventListener("change", onChange);
    document.addEventListener("dragstart", onDragStart);
    document.addEventListener("dragover", onDragOver);
    document.addEventListener("dragleave", onDragLeave);
    document.addEventListener("drop", onDrop);
    document.addEventListener("keydown", onKey);
    window.addEventListener("hashchange", route);
  }

  function onClick(e) {
    // 关闭弹层
    if (e.target.classList.contains("modal-mask")) return closeModal();

    // 画布:块工具按钮
    const tool = e.target.closest("[data-wf-act]");
    if (tool) {
      const host = tool.closest("[data-wf-id]");
      blockAction(tool.dataset.wfAct, host.dataset.wfId);
      return;
    }
    // 画布:点选块
    const blockEl = e.target.closest("#wfCanvas [data-wf-id]");
    if (blockEl) {
      if (blockEl.dataset.wfId !== state.sel) select(blockEl.dataset.wfId);
      return;
    }

    if (bindInspectorEvents(e)) return;

    const el = e.target.closest("[data-act]");
    if (!el) return;
    const act = el.dataset.act;
    const actions = {
      "go-hub": () => { location.hash = "#/"; },
      "new-project": () => showWizard("site"),
      "welcome-mode": () => { closeModal(); showWizard(el.dataset.mode); },
      "wiz-mode": () => { closeModal(true); showWizard(el.dataset.mode); },
      "wiz-tpl": () => {
        $("#wizTplKey").value = el.dataset.key;
        $$(".wizard-tpl button").forEach((b) => b.classList.toggle("is-active", b === el));
      },
      "open": () => { location.hash = "#/p/" + el.dataset.id; },
      "open-tab": () => { state.leftTab = el.dataset.tab; renderLeft(); },
      "left-tab": () => { state.leftTab = el.dataset.tab; renderLeft(); },
      "select": () => select(el.dataset.id, true),
      "toggle-hide": () => blockAction("hide", el.dataset.id),
      "del": () => blockAction("del", el.dataset.id),
      "dup-sel": () => state.sel && blockAction("dup", state.sel),
      "del-sel": () => state.sel && blockAction("del", state.sel),
      "add-block": () => addBlock(el.dataset.type),
      "device": () => { state.device = el.dataset.device; $("#deviceSeg").innerHTML = deviceSegHTML(); renderCanvas(); },
      "undo": () => state.session && state.session.undo(),
      "redo": () => state.session && state.session.redo(),
      "preview": () => WF.preview(state.proj),
      "preview-proj": () => { e.stopPropagation(); WF.preview(WF.getProject(el.dataset.id)); },
      "export-html": () => WF.exportHTML(state.proj),
      "export-json": () => WF.exportJSON(state.proj),
      "dup-proj": () => { e.stopPropagation(); WF.duplicateProject(el.dataset.id); renderHub(); WF.toast("已创建副本"); },
      "del-proj": () => {
        e.stopPropagation();
        const p = WF.getProject(el.dataset.id);
        if (confirm(`确定删除项目「${p.name}」?此操作不可恢复。`)) { WF.deleteProject(el.dataset.id); renderHub(); }
      },
      "import-json": () => $("#importFile").click(),
      "theme-preset": () => {
        state.proj.theme.preset = el.dataset.key;
        state.proj.theme = Object.fromEntries(Object.entries(state.proj.theme).filter(([k]) => ["preset", "fontScale", "headingFont"].includes(k)));
        state.session.commit(); refreshAll();
      },
      "theme-color-reset": () => { delete state.proj.theme[el.dataset.key]; state.session.commit(); refreshAll(); },
      "block-color-reset": () => { const b = selBlock(); b.style.bg = ""; state.session.commit(); renderInspector(); renderCanvas(); },
      "snapshot": () => { WF.Session.snapshot(state.proj, new Date().toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })); renderLeft(); WF.toast("已保存版本快照", "success"); },
      "restore": () => {
        const v = state.proj.versions[+el.dataset.i];
        if (v && confirm("恢复到「" + v.name + "」?当前内容会先自动保存一份快照。")) {
          WF.Session.snapshot(state.proj, "恢复前自动备份", true);
          WF.Session.restore(state.proj, v);
          state.session.commit();
          refreshAll(); WF.toast("已恢复", "success");
        }
      },
    };
    if (actions[act]) actions[act]();
  }

  function onInput(e) {
    const t = e.target;

    // 项目名
    if (t.id === "projName") {
      state.proj.name = t.value;
      state.session.commit("projname");
      return;
    }

    // 检查器:块字段(实时预览)
    const f = t.closest("[data-fkey]");
    if (f && state.proj) {
      const b = state.proj.blocks.find((x) => x.id === f.dataset.bid);
      if (!b) return;
      let v = t.value;
      if (t.type === "number") v = v === "" ? "" : +v;
      b.props[f.dataset.fkey] = v;
      state.session.commit(f.dataset.bid + f.dataset.fkey);
      renderCanvas();
      return;
    }

    // 检查器:列表子字段
    const itf = t.closest("[data-ifkey]");
    if (itf && state.proj) {
      const wrap = itf.closest(".list-editor");
      const b = state.proj.blocks.find((x) => x.id === wrap.dataset.bid);
      const arr = b.props[wrap.dataset.listkey];
      arr[+itf.dataset.idx][itf.dataset.ifkey] = t.type === "number" ? +t.value : t.value;
      state.session.commit(wrap.dataset.bid + wrap.dataset.listkey + itf.dataset.idx + itf.dataset.ifkey);
      renderCanvas();
      return;
    }

    // 检查器:图片 URL
    const img = t.closest('[data-img="url"]');
    if (img && state.proj) {
      const holder = img.closest(".field-image");
      const b = state.proj.blocks.find((x) => x.id === holder.dataset.bid);
      b.props[holder.dataset.fkey] = t.value;
      state.session.commit(holder.dataset.bid + holder.dataset.fkey);
      renderCanvas();
      return;
    }

    // 全局设置(title / description / h5 / story)
    const g = t.closest("[data-gset]");
    if (g && state.proj) {
      setPath(state.proj.global, g.dataset.gset, t.type === "checkbox" ? t.checked : t.value);
      state.session.commit("g" + g.dataset.gset);
      renderCanvas();
      return;
    }

    // 块样式
    const bs = t.closest("[data-bset]");
    if (bs && state.proj) {
      const b = selBlock();
      b.style[bs.dataset.bset] = t.value;
      state.session.commit(b.id + bs.dataset.bset);
      renderCanvas();
      return;
    }

    // 主题滑杆/颜色
    if (t.dataset.act === "theme-radius") {
      state.proj.theme.radius = +t.value;
      const lbl = $("#radiusVal"); if (lbl) lbl.textContent = t.value;
      state.session.commit("radius"); renderCanvas();
    }
    if (t.dataset.act === "theme-scale") {
      state.proj.theme.fontScale = +t.value / 100;
      const lbl = $("#scaleVal"); if (lbl) lbl.textContent = t.value + "%";
      state.session.commit("scale"); renderCanvas();
    }
    if (t.dataset.act === "theme-color") {
      state.proj.theme[t.dataset.key] = t.value;
      state.session.commit("color" + t.dataset.key); renderCanvas();
    }
    if (t.dataset.act === "block-color") {
      const b = selBlock();
      b.style.bg = t.value;
      state.session.commit(b.id + "bg"); renderCanvas();
    }
  }

  function onChange(e) {
    const t = e.target;
    // 主题下拉
    if (t.dataset.act === "theme-font") { state.proj.theme.font = t.value; state.session.commit(); refreshAll(); }
    if (t.dataset.act === "theme-hfont") {
      if (t.value === "inherit") delete state.proj.theme.headingFont;
      else state.proj.theme.headingFont = t.value;
      state.session.commit(); refreshAll();
    }
    // select 类块字段 change 时做一次硬提交(避免 coalesce 丢尾巴)
    const f = t.closest("[data-fkey]");
    if (f && t.tagName === "SELECT") { state.session.commit(f.dataset.bid + f.dataset.fkey); renderLeft(); }
  }

  // ---------- 拖拽 ----------
  const drag = { kind: null, id: null, type: null };

  function onDragStart(e) {
    const handle = e.target.closest("[data-wf-drag]");
    if (handle) {
      drag.kind = "move"; drag.id = handle.dataset.wfDrag;
      e.dataTransfer.effectAllowed = "move";
      try { e.dataTransfer.setData("text/plain", drag.id); } catch (err) {}
      return;
    }
    const lib = e.target.closest(".lib-item");
    if (lib) {
      drag.kind = "new"; drag.type = lib.dataset.libType;
      e.dataTransfer.effectAllowed = "copy";
      try { e.dataTransfer.setData("text/plain", drag.type); } catch (err) {}
    }
  }

  function dropLine() {
    let line = $("#wfDropLine");
    if (!line) {
      line = document.createElement("div");
      line.id = "wfDropLine"; line.className = "wf-drop-line";
    }
    return line;
  }

  function onDragOver(e) {
    if (!drag.kind || !state.proj) return;
    const canvas = $("#wfCanvas");
    if (!canvas || (!canvas.contains(e.target) && e.target !== canvas)) return;
    e.preventDefault();
    e.dataTransfer && (e.dataTransfer.dropEffect = drag.kind === "new" ? "copy" : "move");
    const sections = $$("#wfCanvas .wf-page > .wf-block, #wfCanvas .wf-deck > .wf-block");
    const line = dropLine();
    let placed = false;
    for (const s of sections) {
      const r = s.getBoundingClientRect();
      if (e.clientY < r.top + r.height / 2) {
        s.parentElement.insertBefore(line, s); placed = true; break;
      }
    }
    if (!placed) {
      const page = $("#wfCanvas .wf-page") || $("#wfCanvas .wf-deck");
      if (page) page.appendChild(line);
    }
  }

  function onDragLeave(e) {
    const line = $("#wfDropLine");
    if (line && !e.relatedTarget) line.remove();
  }

  function onDrop(e) {
    if (!drag.kind || !state.proj) return;
    const canvas = $("#wfCanvas");
    if (!canvas || (!canvas.contains(e.target) && e.target !== canvas)) return;
    e.preventDefault();
    const line = $("#wfDropLine");
    let index = state.proj.blocks.length;
    if (line) {
      const next = line.nextElementSibling;
      index = next && next.dataset && next.dataset.wfId ? indexOf(next.dataset.wfId) : state.proj.blocks.length;
      line.remove();
    }
    if (drag.kind === "new") addBlock(drag.type, index);
    else moveBlock(drag.id, index);
    drag.kind = null;
  }

  // ---------- 键盘 ----------
  function onKey(e) {
    if (!state.proj) return;
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
      if (typing) return;
      e.preventDefault();
      if (e.shiftKey) state.session.redo(); else state.session.undo();
    }
  }

  // ============================================================
  //  弹层 & toast
  // ============================================================
  function openModal(bodyHTML, opts) {
    opts = opts || {};
    closeModal(true);
    const mask = document.createElement("div");
    mask.className = "modal-mask";
    mask.innerHTML = `<div class="modal">
      <div class="modal__head">
        <div><div class="modal__title">${opts.title || ""}</div><div class="modal__sub">${opts.sub || "选择一个场景,马上得到一个可编辑的完整页面"}</div></div>
        ${opts.hideClose ? "" : `<button class="modal__close" data-act="close-modal">✕</button>`}
      </div>
      <div class="modal__body">${bodyHTML}</div>
      ${opts.okText ? `<div class="modal__foot"><button class="ed-btn" data-act="close-modal">取消</button><button class="ed-btn is-primary" id="modalOk">${opts.okText}</button></div>` : ""}
    </div>`;
    document.body.appendChild(mask);
    if (opts.onOk) $("#modalOk", mask).addEventListener("click", opts.onOk);
  }
  function closeModal(soft) {
    $$(".modal-mask").forEach((m) => m.remove());
    if (!soft && document.activeElement) document.activeElement.blur();
  }

  WF.toast = function (msg, type) {
    let wrap = $(".toast-wrap");
    if (!wrap) { wrap = document.createElement("div"); wrap.className = "toast-wrap"; document.body.appendChild(wrap); }
    const t = document.createElement("div");
    t.className = "toast" + (type === "error" ? " is-error" : type === "success" ? " is-success" : "");
    t.textContent = msg;
    wrap.appendChild(t);
    setTimeout(() => { t.style.opacity = "0"; t.style.transition = "opacity .3s"; }, 2400);
    setTimeout(() => t.remove(), 2800);
  };

  // 导出 API 挂载
  WF.Editor = { saveStatus, refreshAll };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(window.WF);
