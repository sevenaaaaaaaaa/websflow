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
    if (WF.applyDir) WF.applyDir();
    const style = document.createElement("style");
    style.textContent = WF.runtimeCSS;
    document.head.appendChild(style);
    bindGlobal();
    // 插件区块(公开接口,失败不阻塞启动)
    (WF.apiGetPlugins ? WF.apiGetPlugins() : Promise.reject())
      .then((list) => {
        const usable = (list || []).filter((p) => p.template);
        if (usable.length) {
          WF.registerPluginBlocks(usable);
          console.log("[WebsFlow] 已加载插件区块:", usable.map((p) => p.name).join(", "));
          route();
          // 使用计数(安装量)
          usable.forEach((pl) => { try { WF.apiRequest("/plugins/" + pl.id + "/use", { method: "POST" }).catch(() => {}); } catch (e) {} });
        }
      })
      .catch(() => {});
    route();
  }

  function route() {
    const m = location.hash.match(/^#\/p\/(\w+)/);
    if (m) {
      const proj = WF.getProject(m[1]);
      if (proj) return openEditor(proj);
    }
    if (WF.collab && WF.collab.isActive()) WF.collab.stop();
    if (location.hash === "#/console" || /^#\/console\//.test(location.hash)) {
      if (WF.console) return WF.console.render();
    }
    closeEditor();
    if (location.hash === "#/user") { location.hash = "#/console"; return; }
    renderHub();
  }

  function closeEditor() {
    copilot.msgs = [];
    if (WF.collab && WF.collab.isActive()) WF.collab.stop();
    if (state.session) { state.session.destroy(); state.session = null; }
    state.proj = null; state.sel = null;
  }

  // ============================================================
  //  Hub 项目首页
  // ============================================================
  function renderHub() {
    document.title = WF.t("hubDocTitle");
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
          ${WF.langHTML()}
          ${WF.apiGetStoredUser && WF.apiGetStoredUser()
            ? `<button class="ed-btn" data-act="go-user">👤 ${esc((WF.apiGetStoredUser().display_name) || WF.apiGetStoredUser().username)}</button>`
            : `<button class="ed-btn" data-act="open-login">${WF.t("loginTab")} / ${WF.t("registerTab")}</button>`}
          <button class="ed-btn" data-act="ai-generate">✨ ${WF.t("aiGenerate")}</button>
          <button class="ed-btn" data-act="import-json">${WF.t("importProject")}</button>
          <button class="ed-btn is-primary" data-act="new-project">${WF.t("newProject")}</button>
        </div>
      </div>
      <div class="hub__wrap">
        <div class="hub__hero">
          <h1>${WF.t("hubTitle")}</h1>
          <p>${WF.t("hubSub")}</p>
        </div>
        ${projects.length ? `<div class="hub__grid">${projects.map((p) => {
          const m = WF.Modes[p.mode] || WF.Modes.site;
          return `<div class="hub-card" data-act="open" data-id="${p.id}">
            ${modeBadge(p.mode)}
            <div class="hub-card__name">${esc(p.name)}</div>
            <div class="hub-card__desc">${esc((p.global && p.global.description) || WF.t("blocksCount", { n: p.blocks.length }))}</div>
            <div class="hub-card__meta">
              <span>${new Date(p.updatedAt).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })} ${WF.t("edited")}</span>
              <span class="hub-card__actions">
                <button class="ed-btn" data-act="preview-proj" data-id="${p.id}" title="预览">👁</button>
                <button class="ed-btn" data-act="dup-proj" data-id="${p.id}" title="复制">⧉</button>
                <button class="ed-btn is-danger" data-act="del-proj" data-id="${p.id}" title="删除">🗑</button>
              </span>
            </div>
          </div>`;
        }).join("")}</div>`
        : `<div class="hub-empty"><div class="hub-empty__icon">🧱</div>
            <p>${WF.t("hubEmpty")}</p>
            <button class="ed-btn is-primary" style="margin-top:16px" data-act="new-project">${WF.t("newProject")}</button>
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
        <h2>${WF.t("welcomeTitle")}</h2>
        <p>${WF.t("welcomeSub")}</p>
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
      <div class="modal__title">${WF.t("newPage")}</div>
      <div class="ed-label" style="margin-top:14px">${WF.t("step1Mode")}</div>
      <div class="wizard-modes">
        ${modes.map((m) => `<button class="wizard-mode${m.key === mode ? " is-active" : ""}" data-act="wiz-mode" data-mode="${m.key}">
          <div class="wizard-mode__icon">${m.icon}</div>
          <div class="wizard-mode__name">${m.name}</div>
          <div class="wizard-mode__desc">${m.desc}</div>
        </button>`).join("")}
      </div>
      <div class="ed-label">${WF.t("step2Tpl")}</div>
      <div class="wizard-tpl">
        ${tpls.map((t, i) => `<button data-act="wiz-tpl" data-key="${t.key}" class="${i === 0 ? "is-active" : ""}">
          <div class="wizard-tpl__name">${t.name}</div>
          <div class="wizard-tpl__desc">${t.desc}</div>
        </button>`).join("")}
      </div>
      <div id="wizCloudWrap"></div>
      <div class="ed-label">${WF.t("step3Name")}</div>
      <input class="ed-input" id="wizName" placeholder="${WF.t("namePh")}" value="">
    `, {
      title: WF.t("newPage"),
      okText: WF.t("createEdit"),
      onOk: async function () {
        const modeKey2 = $("#wizModeKey").value;
        const tplKey = $("#wizTplKey").value;
        const cloudId = ($("#wizCloudId") || {}).value || "";
        const tpl = WF.templatesFor(modeKey2).find((t) => t.key === tplKey);
        const name = $("#wizName").value.trim() || ((tpl && tpl.name) || "新页面") + " · " + WF.Modes[modeKey2].name;
        if (cloudId) {
          try {
            const ct = await WF.apiGetTemplate(cloudId);
            const proj = WF.importProject({
              name: $("#wizName").value.trim() || ct.name,
              mode: modeKey2,
              theme: (ct.data && ct.data.theme) || WF.defaultTheme(),
              global: (ct.data && ct.data.global) || {},
              blocks: (ct.data && ct.data.blocks) || [],
              pages: (ct.data && ct.data.pages) || null,
            });
            closeModal();
            location.hash = "#/p/" + proj.id;
          } catch (e) {
            WF.toast(e.message, "error");
          }
          return;
        }
        const proj = WF.createProject(name, modeKey2, tplKey);
        closeModal();
        location.hash = "#/p/" + proj.id;
      },
    });
    // 隐藏状态
    const holder = document.createElement("div");
    holder.innerHTML = `<input type="hidden" id="wizModeKey" value="${mode}"><input type="hidden" id="wizTplKey" value="${tpls[0].key}"><input type="hidden" id="wizCloudId" value="">`;
    $(".modal").appendChild(holder);

    // 云端模板(异步):同类形态优先
    (async () => {
      if (!WF.apiIsLoggedIn()) return;
      try {
        const clouds = (await WF.apiGetTemplates()).filter((tp) => tp.mode === mode).slice(0, 4);
        const wrap = $("#wizCloudWrap");
        if (!wrap || !clouds.length) return;
        wrap.innerHTML = `<div class="ed-label">🌐 ${WF.t("wizCloudTemplates")}</div>
          <div class="wizard-tpl">
            ${clouds.map((tp) => `<button data-act="wiz-cloud" data-id="${esc(tp.id)}">
              <div class="wizard-tpl__name">${esc(tp.name)} <span class="ed-hint" style="display:inline">· ${esc(tp.author || "")}</span></div>
              <div class="wizard-tpl__desc">${esc(tp.description || "")}</div>
            </button>`).join("")}
          </div>`;
      } catch (e) {}
    })();
  }

  // ============================================================
  //  用户后台(#/user)
  // ============================================================
  async function renderUserPanel() {
    document.title = WF.t("userCenter") + " · WebsFlow";
    const user = WF.apiGetStoredUser && WF.apiGetStoredUser();
    if (!user) {
      location.hash = "#/";
      showLoginModal();
      return;
    }
    $("#app").innerHTML = `
    <div class="hub">
      <div class="hub__top">
        <div class="hub__logo"><span class="hub__logo-mark">W</span>
          <div>${WF.t("userCenter")}<small>${esc(user.email || "")}</small></div>
        </div>
        <div style="display:flex;gap:8px">
          ${WF.langHTML()}
          <button class="ed-btn" data-act="go-hub">← ${WF.t("hubTitle") === "Hi, what page shall we build today?" ? "Home" : "首页"}</button>
        </div>
      </div>
      <div class="hub__wrap">
        <div class="up-usercard">
          <div class="up-avatar">${esc((user.display_name || user.username || "U").slice(0, 1).toUpperCase())}</div>
          <div class="up-userinfo">
            <div class="up-username">${esc(user.display_name || user.username)}</div>
            <div class="up-email">${esc(user.email || "")}</div>
          </div>
          <div class="up-actions">
            <button class="ed-btn" data-act="sync-to-cloud">☁️ ${WF.t("syncCloud")}</button>
            <button class="ed-btn" data-act="sync-from-cloud">${WF.t("downloadCloud")}</button>
            <button class="ed-btn is-danger" data-act="do-logout">${WF.t("signOut")}</button>
          </div>
        </div>
        <div class="hub__hero" style="margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
          <h1 style="font-size:20px">📈 ${WF.t("statsTitle")}</h1>
          <button class="ed-btn" data-act="refresh-stats">🔄 ${WF.t("statsRefresh")}</button>
        </div>
        <div id="statsBox" style="margin-bottom:36px"><div class="ed-hint">⏳ ${WF.t("downloading")}</div></div>
        <div class="hub__hero" style="margin-bottom:16px">
          <h1 style="font-size:20px">${WF.t("cloudProjects")}</h1>
        </div>
        <div id="cloudList"><div class="ed-hint">⏳ ${WF.t("downloading")}</div></div>
      </div>
    </div>`;
    loadEventStats();
    try {
      const projects = await WF.apiGetProjects();
      const list = $("#cloudList");
      if (!list) return;
      list.innerHTML = projects.length
        ? `<div class="hub__grid" style="margin-top:0">${projects.map((p) => {
            const m = WF.Modes[p.mode] || WF.Modes.site;
            return `<div class="hub-card" style="cursor:default">
              <span class="hub-card__mode" style="color:${m.color};background:${m.soft}">${m.icon} ${m.name}</span>
              <div class="hub-card__name">${esc(p.name)}</div>
              <div class="hub-card__meta">
                <span>${esc(String(p.updated_at || "").slice(0, 16))}</span>
                <span>${p.share_token && p.is_public ? `🔗 ${WF.t("sharedTag")}` : ""}</span>
              </div>
            </div>`;
          }).join("")}</div>`
        : `<div class="hub-empty"><div class="hub-empty__icon">☁️</div><p>${WF.t("noCloudProjects")}</p></div>`;
    } catch (e) {
      const list = $("#cloudList");
      if (list) list.innerHTML = `<div class="ed-hint">${esc(e.message)}</div>`;
    }
  }

  // ---------- 转化数据看板 ----------
  async function loadEventStats() {
    const box = $("#statsBox");
    if (!box) return;
    let stats;
    try {
      stats = await WF.apiGetEventStats();
    } catch (e) {
      box.innerHTML = `<div class="ed-hint">${esc(e.message)}</div>`;
      return;
    }
    const maxGoal = Math.max(1, ...(stats.goals || []).map((g) => g.count));
    const maxDaily = Math.max(1, ...(stats.daily || []).map((d) => d.count));
    const dailyBars = (stats.daily || []).map((d) => `
      <div class="stats-day" title="${esc(d.date)} · ${d.count}">
        <div class="stats-day__bar" style="height:${Math.round(d.count / maxDaily * 100)}%"></div>
        <div class="stats-day__label">${esc(String(d.date).slice(5))}</div>
      </div>`).join("");

    box.innerHTML = `
      <div class="stats-wrap">
        <div class="stats-cards">
          <div class="stats-card">
            <div class="stats-card__num">${stats.total || 0}</div>
            <div class="stats-card__label">${WF.t("statsTotal")}</div>
          </div>
          <div class="stats-card">
            <div class="stats-card__num">${(stats.goals || []).length}</div>
            <div class="stats-card__label">${WF.t("statsGoalsCount")}</div>
          </div>
        </div>
        <div class="stats-section">
          <div class="stats-section__title">${WF.t("statsDaily")}</div>
          <div class="stats-daily">${dailyBars || `<div class="ed-hint">${WF.t("statsEmpty")}</div>`}</div>
        </div>
        <div class="stats-section">
          <div class="stats-section__title">${WF.t("statsGoals")}</div>
          ${(stats.goals || []).length ? stats.goals.map((g) => `
            <div class="stats-goal">
              <span class="stats-goal__name">${esc(g.goal_id)}</span>
              <div class="stats-goal__bar"><div style="width:${Math.round(g.count / maxGoal * 100)}%"></div></div>
              <span class="stats-goal__count">${g.count}</span>
            </div>`).join("") : `<div class="ed-hint">${WF.t("statsEmpty")}</div>`}
        </div>
        <div class="stats-section">
          <div class="stats-section__title">${WF.t("statsRecent")}</div>
          ${(stats.recent || []).length ? stats.recent.map((r) => `
            <div class="stats-recent">
              <span class="stats-recent__goal">${esc(r.goal_id)}</span>
              <span class="stats-recent__url">${esc(String(r.url || "").slice(0, 46))}</span>
              <span class="stats-recent__time">${esc(String(r.created_at || "").slice(5, 16))}</span>
            </div>`).join("") : `<div class="ed-hint">${WF.t("statsEmpty")}</div>`}
        </div>
      </div>`;
  }

  // ============================================================
  //  编辑器主体
  // ============================================================
  function openEditor(proj) {
    WF.ensurePages(proj);
    state.proj = proj;
    state.session = new WF.Session(proj);
    state.sel = (proj.blocks.find((b) => !b.hidden) || proj.blocks[0] || {}).id || null;
    state.leftTab = "blocks";
    state.device = WF.Modes[proj.mode].defaultDevice || "desktop";
    document.title = proj.name + " · WebsFlow";
    renderShell();
    initBlockImport();
    refreshAll();
  }

  function renderShell() {
    const p = state.proj;
    const m = WF.Modes[p.mode];
    const user = WF.apiGetStoredUser();
    const userHTML = user 
      ? `<span class="ed-top__user" data-act="open-user-menu">👤 ${esc(user.display_name || user.username)}</span>`
      : `<button class="ed-btn" data-act="open-login">登录</button>`;
    
    $("#app").innerHTML = `
    <div class="ed">
      <div class="ed-top">
        <span class="ed-top__logo" data-act="go-hub" title="${WF.t("backToHub")}"><span class="ed-top__logo-mark">W</span></span>
        <input class="ed-top__name" id="projName" value="${esc(p.name)}" title="${WF.t("renameHint")}">
        <span class="ed-mode-badge" style="color:${m.color};background:${m.soft}">${m.icon} ${m.name}</span>
        <button class="ed-btn is-ghost" data-act="undo" title="${WF.t("undoTip")}">↩</button>
        <button class="ed-btn is-ghost" data-act="redo" title="${WF.t("redoTip")}">↪</button>
        <div class="ed-top__spacer"></div>
        <span class="ed-top__save" id="edSave"><span class="dot"></span><span id="edSaveText">${WF.t("saved")}</span></span>
        <div class="ed-seg" id="deviceSeg">${deviceSegHTML()}</div>
        <button class="ed-btn" data-act="preview" title="${WF.t("previewTip")}">${WF.t("preview")}</button>
        <button class="ed-btn" data-act="export-html">${WF.t("exportHTML")}</button>
        <button class="ed-btn" data-act="export-json">{ } JSON</button>
        ${user ? `<button class="ed-btn" data-act="sync-to-cloud" title="${WF.t("syncCloud")}">${WF.t("syncCloud")}</button>
        ${WF.collab.isActive() ? `<span class="ed-collab-badge">${WF.t("collabActive")}</span>` : `<button class="ed-btn" data-act="toggle-collab" title="${WF.t("collabBtn")}">${WF.t("collabBtn")}</button>`}` : ''}
        <button class="ed-btn is-primary" data-act="open-tab" data-tab="theme">${WF.t("themePublish")}</button>
        ${userHTML}
        ${WF.langHTML()}
      </div>
      <div class="ed-body">
        <div class="ed-left">
          <div class="ed-left__tabs">
            <button class="ed-left__tab" data-act="left-tab" data-tab="blocks">${WF.t("tabBlocks")}</button>
            <button class="ed-left__tab" data-act="left-tab" data-tab="outline">${WF.t("tabOutline")}</button>
            <button class="ed-left__tab" data-act="left-tab" data-tab="pages">${WF.t("tabPages")}</button>
            <button class="ed-left__tab" data-act="left-tab" data-tab="ai">${WF.t("tabAI")}</button>
            <button class="ed-left__tab" data-act="left-tab" data-tab="market">${WF.t("tabMarket")}</button>
            <button class="ed-left__tab" data-act="left-tab" data-tab="theme">${WF.t("tabTheme")}</button>
            <button class="ed-left__tab" data-act="left-tab" data-tab="version">${WF.t("tabVersion")}</button>
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
      <div class="copilot" id="copilot">
        <button class="copilot__fab" data-act="copilot-toggle" title="${WF.t("copilot")}">🤖</button>
        <div class="copilot__panel" id="copilotPanel" hidden>
          <div class="copilot__head">🤖 ${WF.t("copilot")}<span class="copilot__spacer"></span><button class="ed-btn is-ghost" data-act="copilot-toggle">✕</button></div>
          <div class="copilot__tasks" id="copilotTasks"></div>
          <div class="copilot__msgs" id="copilotMsgs"></div>
          <div class="copilot__input">
            <input class="ed-input" id="copilotInput" placeholder="${esc(WF.t("copilotPh"))}">
            <button class="ed-btn is-primary" data-act="copilot-send">${WF.t("copilotSend")}</button>
          </div>
        </div>
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
    $("#edSaveText").textContent = s === "saving" ? WF.t("saving") : WF.t("saved") + " " + new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
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
    else if (tab === "pages") body.innerHTML = pagesHTML();
    else if (tab === "ai") body.innerHTML = aiHTML();
    else if (tab === "market") body.innerHTML = marketHTML();
    else if (tab === "theme") body.innerHTML = themeHTML();
    else if (tab === "version") body.innerHTML = versionHTML();
  }

  function libHTML() {
    const mode = state.proj.mode;
    return WF.Categories.map((cat) => {
      const types = Object.keys(WF.Blocks).filter((t) => WF.Blocks[t].category === cat && WF.Blocks[t].modes.includes(mode));
      if (!types.length) return "";
      return `<div class="lib-cat"><div class="lib-cat__title">${WF.tCat(cat)}</div><div class="lib-grid">
        ${types.map((t) => `<div class="lib-item" draggable="true" data-lib-type="${t}" data-act="add-block" data-type="${t}" title="${esc(WF.Blocks[t].desc)}">
          <div class="lib-item__icon">${WF.Blocks[t].icon}</div><div class="lib-item__name">${WF.tBlock(t)}</div>
        </div>`).join("")}
      </div></div>`;
    }).join("") + `<div class="ed-hint" style="margin-top:8px">${WF.t("libHint")}</div>`;
  }

  function aiHTML() {
    const b = selBlock();
    const blockType = b ? b.type : null;
    const g = state.proj.global || {};
    return WF.aiPanelHTML(blockType, { brand: g.brand, product: g.title });
  }

  function marketHTML() {
    return `
      <div class="market-section">
        <div class="market-section__title">${WF.t("marketTitle")}</div>
        <p class="market-section__desc">${WF.t("marketDesc")}</p>
        <button class="ed-btn is-primary" style="width:100%;margin-bottom:12px" data-act="open-market">
          ${WF.t("openMarket")}
        </button>
      </div>
      <div class="market-section">
        <div class="market-section__title">${WF.t("importBlockTitle")}</div>
        <p class="market-section__desc">${WF.t("importBlockDesc")}</p>
        <button class="ed-btn" style="width:100%;margin-bottom:12px" data-act="import-block">
          ${WF.t("importBlockBtn")}
        </button>
        <input type="file" accept=".json,.websflow-block.json" style="display:none" id="importBlockFile">
      </div>
      ${selBlock() ? `
        <div class="market-section">
          <div class="market-section__title">${WF.t("exportBlockTitle")}</div>
          <p class="market-section__desc">${WF.t("exportBlockDesc", { name: WF.tBlock(selBlock().type) })}</p>
          <button class="ed-btn" style="width:100%;margin-bottom:12px" data-act="export-block">
            ${WF.t("exportBlockBtn")}
          </button>
        </div>
      ` : ''}
      <div class="market-section">
        <div class="market-section__title">${WF.t("myFavorites")}</div>
        <div class="market-favorites">
          ${WF.getFavorites().map(type => {
            const def = WF.Blocks[type];
            return def ? `<button class="market-fav-item" data-act="add-fav-block" data-type="${type}">
              <span class="market-fav-icon">${def.icon}</span>
              <span class="market-fav-name">${def.name}</span>
            </button>` : '';
          }).join('')}
          ${WF.getFavorites().length === 0 ? `<div class="market-empty">${WF.t("noFavorites")}</div>` : ''}
        </div>
      </div>
    `;
  }

  function outlineHTML() {
    const blocks = state.proj.blocks;
    if (!blocks.length) return `<div class="outline-empty">${WF.t("outlineEmpty")}</div>`;
    return blocks.map((b, i) => {
      const def = WF.Blocks[b.type];
      const summary = def.summary ? def.summary(b.props) : "";
      return `<div class="outline-item${state.sel === b.id ? " is-active" : ""}" data-act="select" data-id="${b.id}">
        <span class="outline-item__icon">${def.icon}</span>
        <span class="outline-item__name${b.hidden ? " is-hidden" : ""}">${WF.tBlock(b.type)}${summary ? " · " + esc(String(summary).slice(0, 14)) : ""}</span>
        <button class="outline-item__act" data-act="toggle-hide" data-id="${b.id}" title="显示/隐藏">${b.hidden ? "🙈" : "👁"}</button>
        <button class="outline-item__act" data-act="del" data-id="${b.id}" title="删除">✕</button>
      </div>`;
    }).join("");
  }

  function pagesHTML() {
    const p = state.proj;
    WF.ensurePages(p);
    const rows = p.pages.map((pg, i) => `<div class="page-item${pg.id === p.activePageId ? " is-active" : ""}" data-pgid="${pg.id}">
      <div class="page-item__head">
        <span class="page-item__no">${i + 1}</span>
        <input class="ed-input page-item__name" data-pgset="name" data-pgid="${pg.id}" value="${esc(pg.name)}">
        <button class="ed-btn ${pg.id === p.activePageId ? "is-primary" : ""}" data-act="page-switch" data-id="${pg.id}">${pg.id === p.activePageId ? WF.t("pageCurrent") : WF.t("pageSwitch")}</button>
        ${p.pages.length > 1 ? `<button class="ed-btn is-danger" data-act="page-del" data-id="${pg.id}" title="${WF.t("pageDelete")}">✕</button>` : ""}
      </div>
      <div class="page-item__slug">
        <span class="ed-hint">/${esc(pg.slug || "")}</span>
        <input class="ed-input page-item__sluginput" data-pgset="slug" data-pgid="${pg.id}" value="${esc(pg.slug || "")}" placeholder="slug(如 about)">
      </div>
      <div class="ed-hint">${pg.blocks ? pg.blocks.length : 0} ${WF.t("tabBlocks")}</div>
    </div>`).join("");
    return `<div class="lib-cat__title">${WF.t("pagesTitle")}</div>
      <div class="page-list">${rows}</div>
      <button class="ed-btn is-primary" style="width:100%;margin-top:8px" data-act="page-add">＋ ${WF.t("pageAdd")}</button>
      <div class="ed-hint" style="margin-top:8px">${WF.t("pagesHint")}</div>`;
  }

  function themeHTML() {
    const p = state.proj;
    const t = p.theme || {};
    const preset = WF.getPreset(t.preset);
    const mode = p.mode;
    return `
      <div class="insp__section">
        <div class="insp__section-title">${WF.t("secThemePreset")}</div>
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
        <div class="insp__section-title">${WF.t("secFineTune")}</div>
        ${colorField(WF.t("primaryColor"), "primary", t.primary || preset.primary)}
        <div class="field"><label class="ed-label">${WF.t("radius")} <span id="radiusVal">${t.radius != null ? t.radius : preset.radius}</span>px</label>
          <input type="range" min="0" max="28" step="2" value="${t.radius != null ? t.radius : preset.radius}" data-act="theme-radius" style="width:100%"></div>
        <div class="field"><label class="ed-label">${WF.t("bodyFont")}</label>
          <select class="ed-select" data-act="theme-font">${WF.Fonts.map(([k, n]) => `<option value="${k}" ${(t.font || preset.font) === k ? "selected" : ""}>${n}</option>`).join("")}</select></div>
        <div class="field"><label class="ed-label">${WF.t("headingFont")}</label>
          <select class="ed-select" data-act="theme-hfont">${WF.Fonts.map(([k, n]) => `<option value="${k}" ${(t.headingFont || "inherit") === k ? "selected" : ""}>${k === "inherit" ? WF.t("headingInherit") : n}</option>`).join("")}</select></div>
        <div class="field"><label class="ed-label">${WF.t("fontScale")} <span id="scaleVal">${Math.round((t.fontScale || 1) * 100)}%</span></label>
          <input type="range" min="85" max="125" step="5" value="${Math.round((t.fontScale || 1) * 100)}" data-act="theme-scale" style="width:100%"></div>
      </div>
      <div class="insp__section">
        <div class="insp__section-title">${WF.t("secSEO")}</div>
        <div class="field"><label class="ed-label">${WF.t("pageTitle")}</label><input class="ed-input" data-gset="title" value="${esc((p.global && p.global.title) || "")}"></div>
        <div class="field"><label class="ed-label">${WF.t("pageDesc")}</label><textarea class="ed-textarea" rows="2" data-gset="description">${esc((p.global && p.global.description) || "")}</textarea></div>
        <div class="field"><label class="ed-label">${WF.t("keywords")}</label><input class="ed-input" data-gset="keywords" value="${esc((p.global && p.global.keywords) || "")}" placeholder="${WF.t("keywordsPh")}"></div>
        <div class="ed-hint" style="margin-bottom:12px">${WF.t("keywordsHint")}</div>
      </div>
      <div class="insp__section">
        <div class="insp__section-title">${WF.t("secOG")}</div>
        <div class="field"><label class="ed-label">${WF.t("ogTitle")}</label><input class="ed-input" data-gset="og.title" value="${esc((p.global.og && p.global.og.title) || "")}" placeholder="${WF.t("ogTitlePh")}"></div>
        <div class="field"><label class="ed-label">${WF.t("ogDesc")}</label><textarea class="ed-textarea" rows="2" data-gset="og.description">${esc((p.global.og && p.global.og.description) || "")}</textarea></div>
        <div class="field"><label class="ed-label">${WF.t("ogImage")}</label><input class="ed-input" data-gset="og.image" value="${esc((p.global.og && p.global.og.image) || "")}" placeholder="${WF.t("ogImagePh")}"></div>
        <div class="ed-hint">${WF.t("ogHint")}</div>
      </div>
      <div class="insp__section">
        <div class="insp__section-title">${WF.t("secTwitter")}</div>
        <div class="field"><label class="ed-label">${WF.t("cardType")}</label>
          <select class="ed-select" data-gset="twitter.card">
            ${[["summary", WF.t("cardSmall")], ["summary_large_image", WF.t("cardLarge")]].map(([v, n]) => `<option value="${v}" ${(p.global.twitter && p.global.twitter.card) === v ? "selected" : ""}>${n}</option>`).join("")}
          </select></div>
        <div class="field"><label class="ed-label">${WF.t("twitterAcct")}</label><input class="ed-input" data-gset="twitter.site" value="${esc((p.global.twitter && p.global.twitter.site) || "")}" placeholder="@yourhandle"></div>
      </div>
      ${mode === "h5" ? `<div class="insp__section"><div class="insp__section-title">${WF.t("secH5")}</div>
        <div class="field"><label class="ed-label">${WF.t("btnText")}</label><input class="ed-input" data-gset="h5.ctaText" value="${esc((p.global.h5 && p.global.h5.ctaText) || "")}" placeholder="${WF.t("leaveBlankHide")}"></div>
        <div class="field"><label class="ed-label">${WF.t("btnLink")}</label><input class="ed-input" data-gset="h5.ctaLink" value="${esc((p.global.h5 && p.global.h5.ctaLink) || "")}"></div>
      </div>` : ""}
      ${mode === "story" ? `<div class="insp__section"><div class="insp__section-title">${WF.t("secStory")}</div>
        <div class="field-toggle"><label class="ed-label">${WF.t("snapScroll")}</label>
          <label class="switch"><input type="checkbox" data-gset="story.snap" ${p.global.story && p.global.story.snap ? "checked" : ""}><span></span></label></div>
      </div>` : ""}
      <div class="insp__section">
        <div class="insp__section-title">${WF.t("secPublish")}</div>
        <button class="ed-btn" style="width:100%;margin-bottom:8px" data-act="preview">${WF.t("previewExport")}</button>
        <button class="ed-btn is-primary" style="width:100%;margin-bottom:8px" data-act="export-html">${WF.t("exportHtmlBtn")}</button>
        <button class="ed-btn" style="width:100%" data-act="export-json">${WF.t("exportJsonBtn")}</button>
        <div class="ed-hint">${WF.t("publishHint")}</div>
      </div>
      ${WF.apiIsLoggedIn() ? `
      <div class="insp__section">
        <div class="insp__section-title">${WF.t("secShare")}</div>
        <button class="ed-btn" style="width:100%" data-act="share-link">${WF.t("genShareLink")}</button>
        <div id="shareLinkBox" style="margin-top:10px"></div>
        <div class="ed-hint">${WF.t("shareHint")}</div>
      </div>` : ""}`;
  }

  function colorField(label, key, value) {
    return `<div class="field"><label class="ed-label">${label}</label>
      <div class="field-color"><input type="color" value="${/^#[0-9a-fA-F]{6}$/.test(value || "") ? value : "#4f46e5"}" data-act="theme-color" data-key="${key}">
      <button class="ed-btn is-ghost" data-act="theme-color-reset" data-key="${key}" style="padding:5px 10px;font-size:12px">${WF.t("followPreset")}</button></div></div>`;
  }

  function versionHTML() {
    const p = state.proj;
    const vers = p.versions || [];
    return `
      <button class="ed-btn is-primary" style="width:100%;margin-bottom:14px" data-act="snapshot">${WF.t("saveSnapshot")}</button>
      <div class="ed-hint" style="margin-bottom:12px">${WF.t("versionHint")}</div>
      ${vers.length ? vers.map((v, i) => `<div class="ver-item">
        <div class="ver-item__main">
          <div class="ver-item__name">${v.isAuto ? "🕒 " : "📌 "}${esc(v.name)}</div>
          <div class="ver-item__time">${new Date(v.time).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}${v.isAuto ? " · " + WF.t("auto") : ""}</div>
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
      if (!confirm(WF.t("confirmDelBlock", { name: WF.tBlock(blocks[i].type) }))) return;
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
      box.innerHTML = `<div class="insp-empty">${WF.t("inspEmpty")}</div>`;
      return;
    }
    const def = WF.Blocks[b.type];
    let html = `<div class="insp__header"><span class="insp__header-icon">${def.icon}</span><span class="insp__header-name">${WF.tBlock(b.type)}</span>
      <button class="ed-btn is-ghost" data-act="dup-sel" title="复制模块">⧉</button>
      <button class="ed-btn is-ghost is-danger" data-act="del-sel" title="删除模块">✕</button></div>
      <div class="insp__body">`;
    html += `<div class="insp__section"><div class="insp__section-title">${WF.t("secContent")}</div>${def.fields.map((f) => fieldHTML(f, b.props, b.id)).join("")}</div>`;
    html += `<div class="insp__section"><div class="insp__section-title">${WF.t("secStyle")}</div>
      ${colorField(WF.t("blockBg"), "bg", b.style.bg).replace('data-act="theme-color"', 'data-act="block-color"').replace('data-act="theme-color-reset"', 'data-act="block-color-reset"')}
      <div class="field"><label class="ed-label">${WF.t("padding")}</label>
        <select class="ed-select" data-bset="padding">
          ${[["tight", WF.t("tight")], ["normal", WF.t("normal")], ["loose", WF.t("loose")]].map(([v, n]) => `<option value="${v}" ${(b.style.padding || "normal") === v ? "selected" : ""}>${n}</option>`).join("")}
        </select></div>
      <div class="field"><label class="ed-label">${WF.t("anim")}</label>
        <select class="ed-select" data-bset="anim">
          ${[["up", WF.t("animUp")], ["left", WF.t("animLeft")], ["right", WF.t("animRight")], ["zoom", WF.t("animZoom")], ["none", WF.t("animNone")]].map(([v, n]) => `<option value="${v}" ${(b.style.anim || "up") === v ? "selected" : ""}>${n}</option>`).join("")}
        </select><div class="ed-hint">${WF.t("animHint")}</div></div>
      <div class="field"><label class="ed-label">${WF.t("audienceVisitor")}</label>
        <select class="ed-select" data-aset="visitor">
          ${[["any", WF.t("audienceAny")], ["new", WF.t("audienceNew")], ["return", WF.t("audienceReturn")]].map(([v, n]) => `<option value="${v}" ${((b.audience && b.audience.visitor) || "any") === v ? "selected" : ""}>${n}</option>`).join("")}
        </select></div>
      <div class="field"><label class="ed-label">${WF.t("audienceLogin")}</label>
        <select class="ed-select" data-aset="login">
          ${[["any", WF.t("audienceAny")], ["in", WF.t("audienceLoginIn")], ["out", WF.t("audienceLoginOut")]].map(([v, n]) => `<option value="${v}" ${((b.audience && b.audience.login) || "any") === v ? "selected" : ""}>${n}</option>`).join("")}
        </select><div class="ed-hint">${WF.t("audienceLoginHint")}</div></div>
      <div class="field"><label class="ed-label">${WF.t("audienceUtm")}</label>
        <input class="ed-input" data-aset="utm" value="${esc((b.audience && b.audience.utm) || "")}" placeholder="如 ads / geolist">
        <div class="ed-hint">${WF.t("audienceHint")}</div></div>
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
    return `<div class="field"><label class="ed-label">${WF.tField(f.label)}</label>${inner}${f.hint ? `<div class="ed-hint">${f.hint}</div>` : ""}</div>`;
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
    return `<div class="field"><label class="ed-label">${WF.tField(f.label)}(${items.length})</label>
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
              return `<div class="field" style="margin-bottom:8px"><label class="ed-label" style="font-size:11px">${WF.tField(sf.label)}</label>
                <select class="ed-select" data-ifkey="${sf.key}" data-idx="${i}">${sf.options.map(([ov, on]) => `<option value="${esc(ov)}" ${String(v) === String(ov) ? "selected" : ""}>${on}</option>`).join("")}</select></div>`;
            }
            if (sf.type === "textarea") {
              return `<div class="field" style="margin-bottom:8px"><label class="ed-label" style="font-size:11px">${WF.tField(sf.label)}</label>
                <textarea class="ed-textarea" rows="${sf.rows || 2}" data-ifkey="${sf.key}" data-idx="${i}">${esc(v || "")}</textarea></div>`;
            }
            if (sf.type === "number") {
              return `<div class="field" style="margin-bottom:8px"><label class="ed-label" style="font-size:11px">${WF.tField(sf.label)}</label>
                <input class="ed-input" type="number" data-ifkey="${sf.key}" data-idx="${i}" value="${esc(v == null ? "" : v)}"></div>`;
            }
            return `<div class="field" style="margin-bottom:8px"><label class="ed-label" style="font-size:11px">${WF.tField(sf.label)}</label>
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
        if (op === "del") { if (arr.length <= 1 && key !== "options") { WF.toast(WF.t("keepOneItem")); return true; } arr.splice(idx, 1); }
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

    // 组件市场事件
    const marketUse = e.target.closest('[data-marketplace="use"]');
    if (marketUse) {
      const blockId = marketUse.dataset.id;
      const communityBlock = WF.getCommunityBlocks().find(b => b.id === blockId);
      if (communityBlock) {
        const block = WF.useCommunityBlock(communityBlock);
        if (block) {
          state.proj.blocks.push(block);
          state.sel = block.id;
          state.session.commit();
          closeModal();
          refreshAll();
          WF.toast(`已添加「${communityBlock.name}」模块`, "success");
        }
      }
      return;
    }

    const el = e.target.closest("[data-act]");
    if (!el) return;
    const act = el.dataset.act;
    const actions = {
      "go-hub": () => { location.hash = "#/"; },
      "go-user": () => { location.hash = "#/console"; },
      "copilot-toggle": () => copilotToggle(),
      "copilot-send": () => copilotSend(),
      "copilot-task": () => {
        const task = (WF.CopilotTasks || []).concat(WF.getCustomTasks ? WF.getCustomTasks() : []).find((x) => x.id === el.dataset.id);
        if (!task) return;
        if ((task.params || []).length) { copilot.pendingParamTask = task; renderTaskChips(); }
        else runTask(task, {});
      },
      "copilot-save-task": () => saveTaskFromLast(),
      "copilot-tab": () => { copilot.tab = el.dataset.tab; copilot.pendingParamTask = null; renderTaskChips(); },
      "task-param-run": () => runPendingParamTask(),
      "task-param-cancel": () => { copilot.pendingParamTask = null; renderTaskChips(); },
      "cloud-task": () => {
        const t = (copilot.cloudTasks || []).find((x) => x.id === el.dataset.id);
        if (!t) return;
        const task = { id: "cloud:" + t.id, icon: "☁️", kind: "ai", custom: true, cloudId: t.id, name: { zh: t.name, en: t.name }, desc: { zh: t.prompt.slice(0, 40), en: t.prompt.slice(0, 40) }, prompt: t.prompt, params: t.params || [] };
        if ((task.params || []).length) { copilot.pendingParamTask = task; renderTaskChips(); }
        else runAiTask(task, {});
      },
      "cloud-task-del": async () => {
        try { await WF.apiDeleteTask(el.dataset.id); WF.toast(WF.t("taskDeleted"), "success"); copilot.tab = "cloud"; renderTaskChips(); } catch (e) { WF.toast(e.message, "error"); }
      },
      "task-publish-cloud": () => publishCloudTask(),
      "run-compare": () => compareRun(el.dataset.id),
      "ab-compare": () => compareAB(el.dataset.id),
      "copilot-task-del": () => {
        WF.removeCustomTask(el.dataset.id);
        renderTaskChips();
        WF.toast(WF.t("taskDeleted"), "success");
      },
      "copilot-undo": () => {
        state.session && state.session.undo();
        refreshAll();
        renderCanvas();
        WF.toast(WF.t("copilotUndone"), "success");
      },
      "page-switch": () => pageSwitch(el.dataset.id),
      "page-add": () => pageAdd(),
      "page-del": () => pageDel(el.dataset.id),
      "refresh-stats": () => loadEventStats(),
      "switch-lang": () => { WF.setLang(WF.getLang() === "zh" ? "en" : "zh"); },
      "share-link": () => createShareLink(),
      "copy-share": () => copyShareLink(),
      "toggle-collab": () => toggleCollab(),
      "new-project": () => showWizard("site"),
      "welcome-mode": () => { closeModal(); showWizard(el.dataset.mode); },
      "wiz-mode": () => { closeModal(true); showWizard(el.dataset.mode); },
      "wiz-tpl": () => {
        $("#wizTplKey").value = el.dataset.key;
        const c = $("#wizCloudId"); if (c) c.value = "";
        $$(".wizard-tpl button").forEach((b) => b.classList.toggle("is-active", b === el));
      },
      "wiz-cloud": () => {
        const c = $("#wizCloudId"); if (c) c.value = el.dataset.id;
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
      "dup-proj": () => { e.stopPropagation(); WF.duplicateProject(el.dataset.id); renderHub(); WF.toast(WF.t("copyCreated")); },
      "del-proj": () => {
        e.stopPropagation();
        const p = WF.getProject(el.dataset.id);
        if (confirm(WF.t("confirmDelProject", { name: p.name }))) { WF.deleteProject(el.dataset.id); renderHub(); }
      },
      "ai-generate": () => showAiModal(),
      "do-ai-generate": () => doAiGenerate(),
      "open-login": () => showLoginModal(),
      "open-user-menu": () => showUserMenu(),
      "sync-to-cloud": () => syncToCloud(),
      "sync-from-cloud": () => syncFromCloud(),
      "do-login": () => doLogin(),
      "do-register": () => doRegister(),
      "do-logout": () => doLogout(),
      "import-json": () => $("#importFile").click(),
      "open-market": () => openMarketplace(),
      "import-block": () => $("#importBlockFile").click(),
      "export-block": () => {
        const b = selBlock();
        if (b) {
          WF.downloadBlock(b);
          WF.toast(WF.t("blockExported"), "success");
        }
      },
      "add-fav-block": () => {
        const blockType = el.dataset.type;
        if (blockType) {
          addBlock(blockType);
          WF.toast(WF.t("blockAdded", { name: WF.tBlock(blockType) }), "success");
        }
      },
      "theme-preset": () => {
        state.proj.theme.preset = el.dataset.key;
        state.proj.theme = Object.fromEntries(Object.entries(state.proj.theme).filter(([k]) => ["preset", "fontScale", "headingFont"].includes(k)));
        state.session.commit(); refreshAll();
      },
      "generate-copy": () => {
        const blockType = el.dataset.type;
        if (!blockType) return;
        const b = selBlock();
        if (!b) return;
        const g = state.proj.global || {};
        const copy = WF.aiGenerateCopy(blockType, { brand: g.brand, product: g.title });
        Object.assign(b.props, copy);
        state.session.commit();
        renderInspector(); renderCanvas();
        WF.toast(WF.t("copyGenerated"), "success");
      },
      "suggest-color": () => {
        const industry = el.dataset.industry;
        if (!industry) return;
        const scheme = WF.aiSuggestColors({ industry });
        state.proj.theme = { ...state.proj.theme, ...scheme };
        state.session.commit(); refreshAll();
        WF.toast(WF.t("colorApplied", { name: scheme.name }), "success");
      },
      "optimize-layout": () => {
        const optimizations = WF.aiOptimizeLayout(state.proj.blocks);
        if (optimizations.length === 0) {
          WF.toast(WF.t("layoutOk"), "success");
          return;
        }
        optimizations.forEach(opt => {
          const block = state.proj.blocks.find(b => b.id === opt.blockId);
          if (block) WF.aiApplyOptimization(block, opt);
        });
        state.session.commit(); refreshAll();
        WF.toast(WF.t("layoutApplied", { n: optimizations.length }), "success");
      },
      "theme-color-reset": () => { delete state.proj.theme[el.dataset.key]; state.session.commit(); refreshAll(); },
      "block-color-reset": () => { const b = selBlock(); b.style.bg = ""; state.session.commit(); renderInspector(); renderCanvas(); },
      "snapshot": () => { WF.Session.snapshot(state.proj, new Date().toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })); renderLeft(); WF.toast(WF.t("snapshotSaved"), "success"); },
      "restore": () => {
        const v = state.proj.versions[+el.dataset.i];
        if (v && confirm(WF.t("restoreBefore", { name: v.name }))) {
          WF.Session.snapshot(state.proj, "恢复前自动备份", true);
          WF.Session.restore(state.proj, v);
          state.session.commit();
          refreshAll(); WF.toast(WF.t("restored"), "success");
        }
      },
    };
    if (actions[act]) actions[act]();
  }

  function onInput(e) {
    if (WF.collab) WF.collab.markInput();
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

    // 页面名称 / slug
    const pgs = t.closest("[data-pgset]");
    if (pgs && state.proj) {
      const pg = state.proj.pages.find((x) => x.id === pgs.dataset.pgid);
      if (pg) {
        pg[pgs.dataset.pgset] = t.value;
        if (pgs.dataset.pgset === "name" && !pg.slug && state.proj.pages.indexOf(pg) > 0) {
          pg.slug = WF.pageSlugify(t.value, state.proj.pages.indexOf(pg));
        }
        state.session && state.session.commit();
      }
      return;
    }

    // 块级人群定向
    const as = t.closest("[data-aset]");
    if (as && state.proj) {
      const b = selBlock();
      b.audience = b.audience || {};
      const val = t.value;
      if (!val || val === "any") delete b.audience[as.dataset.aset];
      else b.audience[as.dataset.aset] = val;
      if (!Object.keys(b.audience).length) delete b.audience;
      state.session.commit(b.id + "aud");
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
    if (e.key === "Enter" && document.activeElement && document.activeElement.id === "copilotInput") {
      e.preventDefault();
      copilotSend();
      return;
    }
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
      if (typing) return;
      e.preventDefault();
      if (e.shiftKey) state.session.redo(); else state.session.undo();
    }
  }

  // ---------- 组件市场弹窗 ----------
  function openMarketplace() {
    openModal(WF.marketplaceHTML({ mode: state.proj.mode }), {
      title: WF.t("marketTitle"),
      hideClose: false,
      wide: true,
    });
  }

  // ---------- 模块文件导入 ----------
  function initBlockImport() {
    const fileInput = $("#importBlockFile");
    if (!fileInput) return;
    fileInput.onchange = async () => {
      if (!fileInput.files[0]) return;
      try {
        const block = await WF.readBlockFile(fileInput.files[0]);
        if (block) {
          state.proj.blocks.push(block);
          state.sel = block.id;
          state.session.commit();
          refreshAll();
          WF.toast(WF.t("blockImported", { name: WF.tBlock(block.type) }), "success");
        }
      } catch (e) {
        WF.toast(WF.t("importFail", { msg: e.message }), "error");
      }
      fileInput.value = "";
    };
  }

  // ---------- Agent Copilot ----------
  const copilot = { msgs: [], busy: false, tab: "local", cloudTasks: [], pendingParamTask: null, currentTask: null };

  function copilotToggle() {
    const panel = $("#copilotPanel");
    if (!panel) return;
    panel.hidden = !panel.hidden;
    if (!panel.hidden) {
      renderTaskChips();
      if (!copilot.msgs.length) copilotPush("assistant", WF.t("copilotHi"));
      const inp = $("#copilotInput");
      if (inp) inp.focus();
    }
  }

  function copilotPush(role, text, opts) {
    copilot.msgs.push({ role, text, undoable: !!(opts && opts.undoable) });
    const box = $("#copilotMsgs");
    if (box) {
      box.innerHTML = copilot.msgs.map((m) => `<div class="copilot__msg copilot__msg--${m.role}">${esc(m.text)}${
        m.undoable ? `<button class="ed-btn is-ghost copilot__undo" data-act="copilot-undo">↩ ${esc(WF.t("copilotUndo"))}</button>` : ""
      }</div>`).join("");
      box.scrollTop = box.scrollHeight;
    }
  }

  // ---------- 任务模板库 ----------
  function renderTaskChips() {
    const box = $("#copilotTasks");
    if (!box || !WF.CopilotTasks) return;
    const custom = WF.getCustomTasks ? WF.getCustomTasks() : [];
    const chip = (task) => `<button class="copilot__task" data-act="copilot-task" data-id="${esc(task.id)}" title="${esc(WF.taskDesc(task))}">
      <span class="copilot__task-icon">${task.icon || "🧩"}</span>
      <span class="copilot__task-name">${esc(WF.taskLabel(task))}</span>
      ${task.custom ? `<span class="copilot__task-del" data-act="copilot-task-del" data-id="${esc(task.id)}" title="${esc(WF.t("taskDelete"))}">✕</span>` : ""}
      ${task.kind === "rule" ? `<span class="copilot__task-tag">${esc(WF.t("taskInstant"))}</span>` : `<span class="copilot__task-tag is-ai">AI</span>`}
    </button>`;
    if (copilot.tab === "cloud") return renderCloudTasks(box);
    if (copilot.tab === "history") return renderTaskHistory(box);
    if (copilot.pendingParamTask) return renderParamForm(box);

    box.innerHTML = `
      <div class="copilot__tasks-head">
        <span>${esc(copilot.tab === "local" ? WF.t("taskLibrary") : copilot.tab === "cloud" ? WF.t("taskCloud") : WF.t("taskHistory"))}</span>
        <span class="copilot__tabs">
          <button class="ed-btn is-ghost ${copilot.tab === "local" ? "is-on" : ""}" data-act="copilot-tab" data-tab="local">${esc(WF.t("taskTabLocal"))}</button>
          <button class="ed-btn is-ghost ${copilot.tab === "cloud" ? "is-on" : ""}" data-act="copilot-tab" data-tab="cloud">☁️ ${esc(WF.t("taskTabCloud"))}</button>
          <button class="ed-btn is-ghost ${copilot.tab === "history" ? "is-on" : ""}" data-act="copilot-tab" data-tab="history">🕘 ${esc(WF.t("taskTabHistory"))}</button>
          ${copilot.tab === "cloud" ? `<button class="ed-btn is-ghost" data-act="task-publish-cloud" title="${esc(WF.t("taskPublishHint"))}">＋</button>` : `<button class="ed-btn is-ghost" data-act="copilot-save-task" title="${esc(WF.t("taskSaveHint"))}">＋ ${esc(WF.t("taskSave"))}</button>`}
        </span>
      </div>
      <div class="copilot__task-grid">
        ${WF.CopilotTasks.map(chip).join("")}
        ${custom.map(chip).join("")}
      </div>`;
  }

  async function renderCloudTasks(box) {
    box.innerHTML = `<div class="copilot__tasks-head"><span>☁️ ${esc(WF.t("taskCloud"))}</span><span class="copilot__tabs"><button class="ed-btn is-ghost" data-act="copilot-tab" data-tab="local">←</button></span></div>
      <div class="copilot__task-grid"><div class="ed-hint">⏳ ${esc(WF.t("downloading"))}</div></div>`;
    try {
      const list = await WF.apiGetTasks();
      copilot.cloudTasks = list;
      const chip = (t) => `<button class="copilot__task" data-act="cloud-task" data-id="${esc(t.id)}" title="${esc(t.prompt)}">
        <span class="copilot__task-icon">${t.featured ? "⭐" : "☁️"}</span>
        <span class="copilot__task-name">${esc(t.name)}</span>
        <span class="copilot__task-tag is-ai">${t.uses || 0}</span>
        ${t.mine ? `<span class="copilot__task-del" data-act="cloud-task-del" data-id="${esc(t.id)}">✕</span>` : ""}
      </button>`;
      box.innerHTML = `
        <div class="copilot__tasks-head">
          <span>☁️ ${esc(WF.t("taskCloud"))}</span>
          <span class="copilot__tabs">
            <button class="ed-btn is-ghost" data-act="copilot-tab" data-tab="local">← ${esc(WF.t("taskTabLocal"))}</button>
            <button class="ed-btn is-ghost" data-act="task-publish-cloud" title="${esc(WF.t("taskPublishHint"))}">＋ ${esc(WF.t("taskPublish"))}</button>
          </span>
        </div>
        <div class="copilot__task-grid">
          ${list.length ? list.map(chip).join("") : `<div class="ed-hint">${esc(WF.t("taskCloudEmpty"))}</div>`}
        </div>`;
    } catch (e) {
      box.innerHTML = `<div class="ed-hint">${esc(e.message)}</div>`;
    }
  }

  function renderTaskHistory(box) {
    const runs = WF.getTaskRuns ? WF.getTaskRuns() : [];
    box.innerHTML = `
      <div class="copilot__tasks-head">
        <span>🕘 ${esc(WF.t("taskHistory"))}</span>
        <span class="copilot__tabs"><button class="ed-btn is-ghost" data-act="copilot-tab" data-tab="local">←</button></span>
      </div>
      <div class="copilot__runs">
        ${(WF.getABExps() || []).map((exp) => `<div class="copilot__run copilot__run--ab">
          <div class="copilot__run-main">
            <span class="copilot__run-name">🧪 ${esc(exp.name)} A/B</span>
            <span class="copilot__run-meta">${new Date(exp.at).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })} · ${esc(exp.baseGoal)}-A/B</span>
          </div>
          <button class="ed-btn" data-act="ab-compare" data-id="${esc(exp.id)}">${esc(WF.t("taskCompare"))}</button>
          <div class="copilot__run-delta" data-ab="${esc(exp.id)}"></div>
        </div>`).join("")}
        ${runs.length ? runs.map((r) => `<div class="copilot__run">
          <div class="copilot__run-main">
            <span class="copilot__run-name">${esc(r.name)}</span>
            <span class="copilot__run-meta">${new Date(r.at).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })} · ${r.applied || 0} ${esc(WF.t("taskRunItems"))}${r.clicksAt != null ? ` · ${esc(WF.t("taskClicksAt"))} ${r.clicksAt}` : ""}</span>
          </div>
          ${r.clicksAt != null ? `<button class="ed-btn" data-act="run-compare" data-id="${esc(r.id)}">${esc(WF.t("taskCompare"))}</button>` : ""}
          <div class="copilot__run-delta" data-delta="${esc(r.id)}"></div>
        </div>`).join("") : `<div class="ed-hint">${esc(WF.t("taskNoHistory"))}</div>`}
      </div>`;
  }

  async function compareRun(runId) {
    const run = (WF.getTaskRuns() || []).find((x) => x.id === runId);
    const box = document.querySelector(`[data-delta="${runId}"]`);
    if (!run || !box) return;
    box.textContent = "⏳";
    try {
      const stats = await WF.apiGetEventStats();
      const now = stats.total || 0;
      const before = run.clicksAt || 0;
      const delta = now - before;
      box.innerHTML = `${esc(WF.t("taskClicksNow"))} <b>${now}</b> · ${delta >= 0 ? "+" : ""}${delta} ${delta >= 0 ? "📈" : "📉"}`;
    } catch (e) {
      box.textContent = e.message;
    }
  }

  // 参数表单(任务带 params 时)
  function renderParamForm(box) {
    const task = copilot.pendingParamTask;
    const defs = WF.taskDefaults(task);
    box.innerHTML = `
      <div class="copilot__tasks-head">
        <span>${task.icon} ${esc(WF.taskLabel(task))}</span>
        <span class="copilot__tabs"><button class="ed-btn is-ghost" data-act="task-param-cancel">✕</button></span>
      </div>
      <div class="copilot__params">
        <div class="ed-hint" style="margin-bottom:8px">${esc(WF.taskDesc(task))}</div>
        ${(task.params || []).map((p) => `<div class="field" style="margin-bottom:8px">
          <label class="ed-label" style="font-size:11px">${esc(WF.taskParamLabel(p))}</label>
          ${p.type === "select"
            ? `<select class="ed-select" data-param="${esc(p.key)}">${(p.options || []).map(([v, n]) => `<option value="${esc(v)}" ${String(defs[p.key]) === String(v) ? "selected" : ""}>${esc(WF.taskOptionLabel(n))}</option>`).join("")}</select>`
            : `<input class="ed-input" type="${p.type === "number" ? "number" : "text"}" data-param="${esc(p.key)}" value="${esc(defs[p.key])}">`}
        </div>`).join("")}
        <label class="copilot__ab">
          <input type="checkbox" id="abToggle"> ${esc(WF.t("abToggle"))}
        </label>
        <div id="abExtra" hidden>
          ${(task.params || []).length ? `<div class="ed-hint" style="margin:6px 0 4px">${esc(WF.t("abBParams"))}</div>` : ""}
          ${(task.params || []).map((p) => p.type === "select"
            ? `<select class="ed-select" data-paramb="${esc(p.key)}" style="margin-bottom:6px">${(p.options || []).map(([v, n]) => `<option value="${esc(v)}">${esc(WF.taskOptionLabel(n))}</option>`).join("")}</select>`
            : `<input class="ed-input" type="${p.type === "number" ? "number" : "text"}" data-paramb="${esc(p.key)}" value="${esc(p.type === "number" ? (Number(defs[p.key]) + 2) : defs[p.key])}" style="margin-bottom:6px">`).join("")}
          ${task.kind === "ai" ? `<textarea class="ed-textarea" rows="2" id="abPromptB" placeholder="${esc(WF.t("abPromptB"))}"></textarea>` : ""}
          <input class="ed-input" id="abGoal" value="ab-${esc(task.id)}" placeholder="${esc(WF.t("abGoal"))}" style="margin-top:6px">
        </div>
        <button class="ed-btn is-primary" style="width:100%" data-act="task-param-run">${esc(WF.t("taskRun"))}</button>
      </div>`;
    const ab = $("#abToggle");
    if (ab) ab.onchange = () => { const ex = $("#abExtra"); if (ex) ex.hidden = !ab.checked; };
  }

  function runPendingParamTask() {
    const task = copilot.pendingParamTask;
    if (!task) return;
    const params = {};
    document.querySelectorAll("[data-param]").forEach((el) => { params[el.dataset.param] = el.value; });
    const abOn = $("#abToggle") && $("#abToggle").checked;
    if (abOn) {
      const paramsB = {};
      document.querySelectorAll("[data-paramb]").forEach((el) => { paramsB[el.dataset.paramb] = el.value; });
      const goalBase = (($("#abGoal") || {}).value || ("ab-" + task.id)).trim();
      const promptB = (($("#abPromptB") || {}).value || "").trim();
      copilot.pendingParamTask = null;
      runAB(task, params, paramsB, goalBase, promptB);
      return;
    }
    copilot.pendingParamTask = null;
    runTask(task, params);
  }

  // ---------- A/B 对照:两个变体各发布一个页面,按目标分别计量 ----------
  async function runAB(task, paramsA, paramsB, goalBase, promptB) {
    if (!WF.apiIsLoggedIn()) { WF.toast(WF.t("needLogin"), "error"); return; }
    if (!state.proj) return;
    const exp = {
      id: "ab" + Date.now().toString(36),
      name: WF.taskLabel(task), taskId: task.id, at: Date.now(),
      baseGoal: goalBase, variants: [],
    };
    copilotPush("assistant", `🧪 ${WF.t("abStarted")}`);
    try {
      for (const [key, params] of [["A", paramsA], ["B", paramsB]]) {
        const copy = WF.duplicateProject(state.proj.id);
        WF.ensurePages(copy);
        if (task.kind === "rule") {
          task.run(copy, params);
        } else {
          const prompt = (key === "B" && promptB) ? promptB : WF.interpolateTaskPrompt(task, params);
          const r = await WF.apiCopilot(prompt, copy.mode, copy.blocks.map((b) => ({ id: b.id, type: b.type })), "");
          WF.applyCopilotActions(copy, r.actions || []);
        }
        const goalId = goalBase + "-" + key;
        copy.blocks.forEach((b) => { if (b.type === "cta") { b.props.goalId = goalId; } });
        if (!copy.blocks.some((b) => b.type === "cta")) {
          const cta = WF.newBlock("cta");
          cta.props.goalId = goalId;
          copy.blocks.push(cta);
        }
        copy.name = (copy.name || "页面").replace(/ · [AB]$/, "") + " · " + key;
        const created = await WF.apiCreateProject(copy.name, copy.mode,
          { theme: copy.theme, global: copy.global, pages: copy.pages, blocks: copy.blocks },
          (copy.global && copy.global.description) || "");
        const pub = await WF.apiRequest("/projects/" + created.id + "/publish", { method: "POST" });
        exp.variants.push({ key, goalId, cloudId: created.id, localId: copy.id, token: pub.token, url: "/webflow/p/" + pub.token });
      }
      WF.saveABExp(exp);
      copilotPush("assistant", `🧪 ${WF.t("abPublished")}
A: ${exp.variants[0].url}
B: ${exp.variants[1].url}
${WF.t("abHint")}`);
      WF.toast(WF.t("abDone"), "success");
    } catch (e) {
      copilotPush("assistant", "⚠️ A/B 失败:" + e.message);
      WF.toast(e.message, "error");
    }
  }

  async function compareAB(expId) {
    const exp = (WF.getABExps() || []).find((x) => x.id === expId);
    if (!exp) return;
    const box = document.querySelector(`[data-ab="${expId}"]`);
    if (box) box.textContent = "⏳";
    try {
      const stats = await WF.apiGetEventStats();
      const map = {};
      (stats.goals || []).forEach((g) => { map[g.goal_id] = g.count; });
      const rows = exp.variants.map((v) => ({ key: v.key, count: map[v.goalId] || 0, url: v.url }));
      const max = Math.max(1, ...rows.map((r) => r.count));
      const winner = rows[0].count === rows[1].count ? "—" : (rows[0].count > rows[1].count ? "A" : "B");
      if (box) box.innerHTML = `
        ${rows.map((r) => `<div class="cs-rank" style="padding:3px 0">
          <span class="cs-rank__name" style="width:96px">${esc(WF.t("abVariant"))} ${r.key}</span>
          <span class="cs-rank__track"><span class="cs-rank__fill" style="width:${Math.round(r.count / max * 100)}%"></span></span>
          <span class="cs-rank__n">${r.count}</span>
        </div>`).join("")}
        <div class="ed-hint">${esc(WF.t("abWinner"))}: <b>${winner}</b> · ${esc(WF.t("abDelta"))} ${Math.abs(rows[0].count - rows[1].count)}</div>`;
    } catch (e) {
      if (box) box.textContent = e.message;
    }
  }

  function runTask(task, params) {
    // 统一入口:规则任务本地执行;AI 任务(含云端)走 Copilot
    if (task.kind === "rule") return runRuleTaskWithParams(task, params);
    return runAiTask(task, params);
  }

  async function runRuleTaskWithParams(task, params) {
    const r = task.run(state.proj, params) || { applied: 0, summary: "" };
    if (r.applied) {
      state.session && state.session.commit();
      refreshAll();
      renderCanvas();
    }
    copilotPush("assistant", `⚡ ${WF.taskLabel(task)}:${r.summary || WF.t("copilotNoReply")}`, { undoable: r.applied > 0 });
    if (r.applied) WF.toast(WF.t("copilotApplied", { n: r.applied }), "success");
    await recordRun(task, r);
  }

  // 执行历史记录(任务名/改动数/当时点击)
  async function recordRun(task, result) {
    let clicksAt = null;
    try {
      if (WF.apiIsLoggedIn && WF.apiIsLoggedIn()) {
        const stats = await WF.apiGetEventStats();
        clicksAt = stats.total || 0;
      }
    } catch (e) {}
    if (WF.recordTaskRun) {
      WF.recordTaskRun(task, result, { blocksAfter: ((state.proj && state.proj.blocks) || []).length, clicksAt });
    }
    renderTaskChips();
  }

  function runAiTask(task, params) {
    copilotPush("user", "⭐ " + WF.taskLabel(task));
    const prompt = task.prompt ? WF.interpolateTaskPrompt(task, params || {}) : WF.taskLabel(task);
    copilotSend(prompt, { task: task });
  }

  async function publishCloudTask() {
    const lastUser = (copilot.msgs || []).slice().reverse().find((m) => m.role === "user");
    const fallback = ($("#copilotInput") || {}).value || "";
    const prompt = (lastUser && lastUser.text && lastUser.text.indexOf("⭐ ") !== 0 ? lastUser.text : fallback) || "";
    if (!prompt.trim()) { WF.toast(WF.t("taskNeedPrompt"), "error"); return; }
    const name = window.prompt(WF.t("taskNamePrompt"), prompt.slice(0, 16));
    if (name === null) return;
    try {
      await WF.apiPublishTask((name || "").trim() || prompt.slice(0, 16), prompt.trim(), []);
      WF.toast(WF.t("taskPublished"), "success");
      copilot.tab = "cloud";
      renderTaskChips();
    } catch (e) {
      WF.toast(e.message, "error");
    }
  }

  function saveTaskFromLast() {
    const lastUser = (copilot.msgs || []).slice().reverse().find((m) => m.role === "user");
    const fallback = ($("#copilotInput") || {}).value || "";
    const prompt = (lastUser && lastUser.text && lastUser.text.indexOf("⭐ ") !== 0 ? lastUser.text : fallback) || "";
    if (!prompt.trim()) { WF.toast(WF.t("taskNeedPrompt"), "error"); return; }
    const name = window.prompt(WF.t("taskNamePrompt"), prompt.slice(0, 16));
    if (name === null) return;
    WF.saveCustomTask((name || "").trim() || prompt.slice(0, 16), prompt.trim());
    renderTaskChips();
    WF.toast(WF.t("taskSaved"), "success");
  }

  async function copilotSend(taskPromptOverride, meta) {
    copilot.currentTask = meta && meta.task ? meta.task : null;
    const inp = $("#copilotInput");
    const msg = (taskPromptOverride || (inp && inp.value) || "").trim();
    if (!msg || copilot.busy || !state.proj) return;
    if (inp) inp.value = "";
    if (!taskPromptOverride) copilotPush("user", msg);
    copilot.busy = true;
    copilotPush("assistant", WF.t("copilotThinking"));
    const box = $("#copilotMsgs");
    if (box) box.lastElementChild.classList.add("is-typing");
    try {
      const r = await WF.apiCopilot(
        msg, state.proj.mode,
        state.proj.blocks.map((b) => ({ id: b.id, type: b.type })),
        state.sel
      );
      copilot.msgs.pop();
      const acts = Array.isArray(r.actions) ? r.actions : [];
      let applied = 0;
      acts.forEach((a) => {
        if (a.action === "add_block" && WF.Blocks[a.type]) {
          const nb = WF.newBlock(a.type);
          nb.props = Object.assign(nb.props, a.props || {});
          state.proj.blocks.push(nb);
          state.sel = nb.id;
          applied++;
        } else if (a.action === "update_block") {
          const b = state.proj.blocks.find((x) => x.id === a.targetId);
          if (b) { b.props = Object.assign({}, b.props, a.props || {}); applied++; }
        } else if (a.action === "remove_block") {
          const i = state.proj.blocks.findIndex((x) => x.id === a.targetId);
          if (i >= 0) { state.proj.blocks.splice(i, 1); applied++; }
        }
      });
      if (applied) {
        state.session && state.session.commit(); // 多步一次提交 → 一步撤销
        refreshAll();
        renderCanvas();
      }
      copilotPush("assistant", (r.reply || WF.t("copilotNoReply")) + (applied ? `\n(${WF.t("copilotApplied", { n: applied })})` : ""), { undoable: applied > 0 });
      if (applied) WF.toast(WF.t("copilotApplied", { n: applied }), "success");
      if (copilot.currentTask) {
        const tk = copilot.currentTask;
        copilot.currentTask = null;
        recordRun(tk, { applied, summary: `AI 改动 ${applied} 处` });
        if (tk.cloudId) { try { WF.apiUseTask(tk.cloudId); } catch (e) {} }
      }
    } catch (e) {
      copilot.msgs.pop();
      copilotPush("assistant", "⚠️ " + e.message);
    }
    copilot.busy = false;
  }

  // ---------- 多页面 ----------
  function pageSwitch(id) {
    if (!WF.switchPage(state.proj, id)) return;
    state.sel = (state.proj.blocks.find((b) => !b.hidden) || state.proj.blocks[0] || {}).id || null;
    state.session && state.session.commit();
    state.session && state.session.commit();
    refreshAll();
    WF.toast(WF.t("pageSwitched", { name: (WF.activePage(state.proj) || {}).name || "" }), "success");
  }

  function pageAdd() {
    const pg = WF.addPage(state.proj, "");
    pageSwitch(pg.id);
    renderLeft();
  }

  function pageDel(id) {
    if (!confirm(WF.t("pageDeleteConfirm"))) return;
    if (!WF.removePage(state.proj, id)) return;
    state.sel = (state.proj.blocks.find((b) => !b.hidden) || state.proj.blocks[0] || {}).id || null;
    state.session && state.session.commit();
    refreshAll();
  }

  // ---------- AI 生成弹窗 ----------
  function showAiModal() {
    if (!WF.apiIsLoggedIn()) { showLoginModal(); return; }
    openModal(`
      <div class="ai-gen">
        <div class="field">
          <label class="ed-label">${WF.t("aiMode")}</label>
          <select class="ed-select" id="aiMode">
            ${Object.values(WF.Modes).map((m) => `<option value="${m.key}" ${m.key === "site" ? "selected" : ""}>${m.icon} ${m.name}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label class="ed-label">${WF.t("aiPrompt")}</label>
          <textarea class="ed-textarea" rows="5" id="aiPrompt" placeholder="${esc(WF.t("aiPromptPh"))}"></textarea>
        </div>
        <div class="ed-hint">${esc(WF.t("aiHint"))}</div>
        <div id="aiResult" style="margin-top:10px"></div>
      </div>
    `, { title: "✨ " + WF.t("aiGenerate"), hideClose: false });
  }

  async function doAiGenerate() {
    const prompt = ($("#aiPrompt") || {}).value || "";
    const mode = ($("#aiMode") || {}).value || "site";
    const box = $("#aiResult");
    if (!prompt.trim()) { WF.toast(WF.t("aiNeedPrompt"), "error"); return; }
    if (box) box.innerHTML = `<div class="ed-hint">⏳ ${esc(WF.t("aiWorking"))}</div>`;
    try {
      const r = await WF.apiAiGenerate(prompt, mode);
      const proj = WF.importProject({
        name: r.name,
        mode,
        theme: WF.defaultTheme(),
        global: { title: r.name, description: r.description || "", brand: r.name, h5: mode === "h5" ? { ctaText: "", ctaLink: "" } : undefined },
        blocks: r.blocks,
      });
      closeModal();
      location.hash = "#/p/" + proj.id;
      WF.toast(WF.t("aiDone", { n: proj.blocks.length }), "success");
    } catch (e) {
      if (box) box.innerHTML = `<div class="ed-hint" style="color:var(--ed-danger)">${esc(e.message)}</div>`;
      WF.toast(e.message, "error");
    }
  }

  // ---------- 登录/注册弹窗 ----------
  function showLoginModal() {
    openModal(`
      <div class="auth-modal">
        <div class="auth-tabs">
          <button class="auth-tab is-active" data-auth-tab="login">${WF.t("loginTab")}</button>
          <button class="auth-tab" data-auth-tab="register">${WF.t("registerTab")}</button>
        </div>
        <div class="auth-form" id="loginForm">
          <div class="field">
            <label class="ed-label">${WF.t("emailOrName")}</label>
            <input class="ed-input" id="loginEmail" placeholder="${WF.t("emailOrNamePh")}">
          </div>
          <div class="field">
            <label class="ed-label">${WF.t("password")}</label>
            <input class="ed-input" type="password" id="loginPassword" placeholder="${WF.t("passwordPh")}">
          </div>
          <button class="ed-btn is-primary" style="width:100%;margin-top:12px" data-act="do-login">${WF.t("loginTab")}</button>
        </div>
        <div class="auth-form" id="registerForm" style="display:none">
          <div class="field">
            <label class="ed-label">${WF.t("username")}</label>
            <input class="ed-input" id="regUsername" placeholder="${WF.t("usernamePh")}">
          </div>
          <div class="field">
            <label class="ed-label">${WF.t("email")}</label>
            <input class="ed-input" id="regEmail" placeholder="${WF.t("emailPh")}">
          </div>
          <div class="field">
            <label class="ed-label">${WF.t("password")}</label>
            <input class="ed-input" type="password" id="regPassword" placeholder="${WF.t("regPasswordPh")}">
          </div>
          <button class="ed-btn is-primary" style="width:100%;margin-top:12px" data-act="do-register">${WF.t("register")}</button>
        </div>
      </div>
    `, { title: WF.t("loginTab") + " / " + WF.t("registerTab"), hideClose: false });
    
    // 绑定标签切换
    $$(".auth-tab").forEach(tab => {
      tab.onclick = () => {
        $$(".auth-tab").forEach(t => t.classList.remove("is-active"));
        tab.classList.add("is-active");
        $("#loginForm").style.display = tab.dataset.authTab === "login" ? "block" : "none";
        $("#registerForm").style.display = tab.dataset.authTab === "register" ? "block" : "none";
      };
    });
  }

  // 执行登录
  async function doLogin() {
    const email = $("#loginEmail")?.value;
    const password = $("#loginPassword")?.value;
    
    if (!email || !password) {
      WF.toast(WF.t("fillEmailPwd"), "error");
      return;
    }
    
    try {
      await WF.apiLogin(email, password);
      closeModal();
      rerenderCurrent();
      WF.toast(WF.t("loginOk"), "success");
    } catch (e) {
      WF.toast(e.message, "error");
    }
  }

  // 执行注册
  async function doRegister() {
    const username = $("#regUsername")?.value;
    const email = $("#regEmail")?.value;
    const password = $("#regPassword")?.value;
    
    if (!username || !email || !password) {
      WF.toast(WF.t("fillAllFields"), "error");
      return;
    }
    
    try {
      await WF.apiRegister(username, email, password);
      closeModal();
      rerenderCurrent();
      WF.toast(WF.t("registerOk"), "success");
    } catch (e) {
      WF.toast(e.message, "error");
    }
  }

  // 用户菜单
  function showUserMenu() {
    const user = WF.apiGetStoredUser();
    if (!user) return;
    
    openModal(`
      <div class="user-menu">
        <div class="user-info">
          <div class="user-avatar">👤</div>
          <div class="user-details">
            <div class="user-name">${esc(user.display_name || user.username)}</div>
            <div class="user-email">${esc(user.email)}</div>
          </div>
        </div>
        <div class="user-actions">
          <button class="ed-btn is-primary" style="width:100%;margin-bottom:8px" data-act="go-user">
            🏠 ${WF.t("userCenter")}
          </button>
          <button class="ed-btn" style="width:100%;margin-bottom:8px" data-act="sync-from-cloud">
            ${WF.t("downloadCloud")}
          </button>
          <button class="ed-btn" style="width:100%;margin-bottom:8px" data-act="sync-to-cloud">
            ${WF.t("syncCloud")}
          </button>
          <button class="ed-btn is-danger" style="width:100%" data-act="do-logout">
            ${WF.t("signOut")}
          </button>
        </div>
      </div>
    `, { title: WF.t("userCenter"), hideClose: false });
  }

  // 同步到云端
  async function syncToCloud() {
    if (!WF.apiIsLoggedIn()) {
      showLoginModal();
      return;
    }
    
    try {
      WF.toast(WF.t("syncing"), "success");
      const synced = await WF.apiSyncToCloud();
      WF.toast(WF.t("syncedN", { n: synced.length }), "success");
    } catch (e) {
      WF.toast(WF.t("syncFail", { msg: e.message }), "error");
    }
  }

  // 从云端下载
  async function syncFromCloud() {
    if (!WF.apiIsLoggedIn()) {
      showLoginModal();
      return;
    }
    
    try {
      WF.toast(WF.t("downloading"), "success");
      const imported = await WF.apiSyncFromCloud();
      closeModal();
      renderHub();
      WF.toast(WF.t("downloadedN", { n: imported.length }), "success");
    } catch (e) {
      WF.toast(WF.t("downloadFail", { msg: e.message }), "error");
    }
  }

  // 退出登录
  function doLogout() {
    WF.apiLogout();
    closeModal();
    if (WF.collab) WF.collab.stop();
    rerenderCurrent();
    WF.toast(WF.t("signedOut"), "success");
  }

  // 按当前路由刷新界面(编辑器 / 用户后台 / 首页)
  function rerenderCurrent() {
    if (state.proj) { renderShell(); refreshAll(); }
    else if (location.hash === "#/user") renderUserPanel();
    else renderHub();
  }

  // ============================================================
  //  弹层 & toast
  // ============================================================
  function openModal(bodyHTML, opts) {
    opts = opts || {};
    closeModal(true);
    const mask = document.createElement("div");
    mask.className = "modal-mask";
    const wideClass = opts.wide ? " modal--wide" : "";
    mask.innerHTML = `<div class="modal${wideClass}">
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
