/* ============================================================
 * WebsFlow · 轻量后台 (console.js)
 *
 * 设计借鉴 OpenFlow admin:
 *   - 顶栏一级分区(main-tabs) + 侧栏当前区明细 + 内容区
 *   - 框架级交互一次引入:确认对话框 / 表格筛选排序分页 / 卡片计数动画
 *   - 纯 CSS + 内联 SVG 图表,零图表库
 *
 * 信息架构聚焦定位:概览 / 落地页 / 转化 / 人群 / 模块 / 设置
 * 一切围绕「出页 → 投放 → 看数据」闭环,不含与投放无关的管理项
 * ============================================================ */
window.WF = window.WF || {};

(function (WF) {
  "use strict";

  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const esc = (s) => WF.esc(s);
  const t = (k, v) => WF.t(k, v);

  const SECTIONS = [
    ["overview", "🗂", "csOverview"],
    ["pages", "🧱", "csPages"],
    ["conversion", "📈", "csConversion"],
    ["audience", "🎯", "csAudience"],
    ["modules", "🧰", "csModules"],
    ["templates", "🌐", "csTemplates"],
    ["plugins", "🧩", "csPlugins"],
    ["tasks", "🗂", "csTasks"],
    ["settings", "⚙️", "csSettings"],
  ];

  const state = { section: "overview" };

  // ============================================================
  //  框架级交互
  // ============================================================

  // 确认对话框(借鉴 OpenFlow of-dialog + 危险文案判定)
  function confirmDialog(message, opts) {
    opts = opts || {};
    return new Promise((resolve) => {
      const danger = opts.danger !== undefined ? opts.danger : true;
      const mask = document.createElement("div");
      mask.className = "cs-dialog-mask";
      mask.innerHTML = `
        <div class="cs-dialog">
          <div class="cs-dialog__title">${esc(opts.title || message)}</div>
          ${opts.title ? `<div class="cs-dialog__msg">${esc(message)}</div>` : ""}
          <div class="cs-dialog__actions">
            <button class="ed-btn" data-cs-dlg="cancel">${esc(t("csCancel"))}</button>
            <button class="ed-btn ${danger ? "is-danger" : "is-primary"}" data-cs-dlg="ok">${esc(opts.okText || t("csConfirm"))}</button>
          </div>
        </div>`;
      document.body.appendChild(mask);
      const done = (val) => { mask.remove(); resolve(val); };
      mask.addEventListener("click", (e) => {
        if (e.target === mask || e.target.dataset.csDlg === "cancel") return done(false);
        if (e.target.dataset.csDlg === "ok") return done(true);
      });
    });
  }

  // 表格增强:筛选 + 排序 + 分页(借鉴 OpenFlow admin-ui.js 自动表格)
  function enhanceTable(wrap) {
    const table = $("table", wrap);
    if (!table) return;
    const tbody = $("tbody", table);
    if (!tbody) return;
    const rows = Array.from(tbody.querySelectorAll("tr"));
    const pageSize = 10;
    let page = 1;
    let keyword = "";
    let sortIdx = -1;
    let sortAsc = true;

    const bar = document.createElement("div");
    bar.className = "cs-tbl-filter";
    bar.innerHTML = `<input placeholder="${esc(t("csSearch"))}…">`;
    wrap.insertBefore(bar, table);
    const pager = document.createElement("div");
    pager.className = "cs-pager";
    wrap.appendChild(pager);

    const input = $("input", bar);
    input.addEventListener("input", () => { keyword = input.value.trim().toLowerCase(); page = 1; apply(); });

    $$("th", table).forEach((th, idx) => {
      if (idx === $$("th", table).length - 1) return; // 末列通常是操作列
      th.style.cursor = "pointer";
      th.addEventListener("click", () => {
        if (sortIdx === idx) sortAsc = !sortAsc;
        else { sortIdx = idx; sortAsc = true; }
        apply();
      });
    });

    function cellText(tr, i) {
      const td = tr.children[i];
      return td ? (td.textContent || "").trim() : "";
    }
    function apply() {
      let list = rows.filter((r) => !keyword || (r.textContent || "").toLowerCase().includes(keyword));
      if (sortIdx >= 0) {
        list = list.slice().sort((a, b) => {
          const x = cellText(a, sortIdx), y = cellText(b, sortIdx);
          const nx = parseFloat(x.replace(/[^\d.-]/g, "")), ny = parseFloat(y.replace(/[^\d.-]/g, ""));
          let r;
          if (!isNaN(nx) && !isNaN(ny) && /\d/.test(x) && /\d/.test(y)) r = nx - ny;
          else r = x.localeCompare(y, "zh-CN");
          return sortAsc ? r : -r;
        });
      }
      const pages = Math.max(1, Math.ceil(list.length / pageSize));
      page = Math.min(page, pages);
      rows.forEach((r) => { r.style.display = "none"; });
      list.slice((page - 1) * pageSize, page * pageSize).forEach((r) => { r.style.display = ""; });
      input.parentElement.style.display = rows.length > 6 ? "" : "none";
      pager.innerHTML = pages > 1
        ? `<button data-cs-pg="${page - 1}" ${page === 1 ? "disabled" : ""}>‹</button>
           <span>${page} / ${pages}</span>
           <button data-cs-pg="${page + 1}" ${page === pages ? "disabled" : ""}>›</button>
           <span style="margin-left:auto">${list.length}</span>`
        : "";
      tbody.parentElement.style.display = list.length ? "" : "table";
      let empty = $(".cs-tbl-empty", wrap);
      if (!list.length) {
        if (!empty) {
          empty = document.createElement("div");
          empty.className = "cs-empty cs-tbl-empty";
          empty.innerHTML = `<div class="cs-empty__icon">🗒</div><div>${esc(t("csNoData"))}</div>`;
          pager.parentElement.insertBefore(empty, pager);
        }
      } else if (empty) empty.remove();
    }
    pager.addEventListener("click", (e) => {
      const b = e.target.closest("[data-cs-pg]");
      if (!b || b.disabled) return;
      page = parseInt(b.dataset.csPg, 10);
      apply();
    });
    apply();
  }

  // 内联 SVG 迷你折线(借鉴 OpenFlow .ai-sparkline)
  function sparklineSVG(points) {
    const w = 600, h = 90, pad = 6;
    if (!points.length) return `<div class="cs-empty">${esc(t("csNoData"))}</div>`;
    const max = Math.max(1, ...points);
    const step = points.length > 1 ? (w - pad * 2) / (points.length - 1) : 0;
    const coords = points.map((v, i) => [pad + i * step, h - pad - (v / max) * (h - pad * 2)]);
    const line = coords.map(([x, y], i) => (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1)).join(" ");
    const area = line + ` L ${w - pad} ${h - pad} L ${pad} ${h - pad} Z`;
    const dots = coords.map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.6" fill="var(--accent)"/>`).join("");
    return `<svg class="cs-spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <defs><linearGradient id="csg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="oklch(52% .17 258 / .28)"/><stop offset="100%" stop-color="oklch(52% .17 258 / 0)"/>
      </linearGradient></defs>
      <path d="${area}" fill="url(#csg)"/>
      <path d="${line}" fill="none" stroke="var(--accent)" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>
      ${dots}
    </svg>`;
  }

  // 数字滚动(借鉴 OpenFlow count-up)
  function countUp(el) {
    const target = parseFloat(el.dataset.val || el.dataset.count || el.textContent || "0") || 0;
    if (target <= 0) { el.textContent = "0"; return; }
    const dur = 600, t0 = performance.now();
    function step(now) {
      const p = Math.min(1, (now - t0) / dur);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))).toLocaleString();
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // ============================================================
  //  外壳
  // ============================================================
  let _kicker = null;

  async function render(section) {
    const user = WF.apiGetStoredUser && WF.apiGetStoredUser();
    if (!user) {
      location.hash = "#/";
      return;
    }
    if (section && SECTIONS.some(([k]) => k === section)) state.section = section;
    document.title = t("consoleTitle") + " · WebsFlow";
    // 刷新用户信息(套餐/管理员标记可能已变化)
    if (!state.userRefreshed) {
      state.userRefreshed = true;
      WF.apiGetCurrentUser().then((fresh) => {
        if (fresh && fresh.is_admin !== user.is_admin) route();
      }).catch(() => {});
    }
    const m = WF.Modes;
    $("#app").innerHTML = `
      <div class="console">
        <div class="cs-top">
          <div class="cs-top__brand"><span class="cs-top__mark">W</span>WebsFlow ${esc(t("consoleTitle"))}</div>
          <div class="cs-tabs">
            ${SECTIONS.map(([k, icon, key]) => `<button class="cs-tab${state.section === k ? " is-on" : ""}" data-cs-nav="${k}">${icon} ${esc(t(key))}</button>`).join("")}
          </div>
          <div class="cs-top__right">
            <div class="cs-bell-wrap">
              <button class="cs-bell" data-cs-act="toggle-notify" title="${esc(t("csNotify"))}">🔔<span class="cs-bell__n" id="csBellN" hidden>0</span></button>
              <div class="cs-notify" id="csNotify" hidden></div>
            </div>
            ${WF.langHTML()}
            <button class="ed-btn" data-act="go-hub">${esc(t("csBackEditor"))}</button>
            <div class="cs-user" data-cs-nav="settings">
              <span class="cs-user__avatar">${esc((user.display_name || user.username || "U").slice(0, 1).toUpperCase())}</span>
              ${esc(user.display_name || user.username)}
            </div>
          </div>
        </div>
        <div class="cs-body">
          <aside class="cs-side" id="csSide"></aside>
          <main class="cs-main" id="csMain"><div class="cs-empty">⏳</div></main>
        </div>
      </div>`;
    bindShell();
    renderSide();
    loadNotify();
    if (!state.notifyTimer) {
      state.notifyTimer = setInterval(() => { if (location.hash.indexOf("#/console") === 0) loadNotify(); }, 60000);
    }
    await loadSection(state.section);
  }

  function bindShell() {
    $$("[data-cs-nav]").forEach((el) => {
      el.onclick = () => { state.section = el.dataset.csNav; route(); };
    });
    // 顶栏铃铛(不在内容区,需单独绑定)
    const bell = $(".cs-bell");
    if (bell) bell.onclick = toggleNotify;
  }

  function route() {
    $$(".cs-tab").forEach((b) => b.classList.toggle("is-on", b.dataset.csNav === state.section));
    renderSide();
    loadSection(state.section);
  }

  function renderSide() {
    const side = $("#csSide");
    if (!side) return;
    const s = state.section;
    const cfg = {
      overview: [["csSideQuick", [["csNewPage", "cs-new-page"], ["csSyncCloud", "cs-sync"]]], ["csSideHint", "csOverviewHint"]],
      pages: [["csSideFilter", null], ["csSideHint", "csPagesHint"]],
      conversion: [["csSideFilter", null], ["csSideHint", "csConversionHint"]],
      audience: [["csSideHint", "csAudienceSideHint"]],
      modules: [["csSideHint", "csModulesHint"]],
      settings: [["csSideHint", "csSettingsHint"]],
    }[s];
    let html = `<div class="cs-side__title">${esc(t("csSideTitle"))}</div>`;
    if (s === "overview") {
      html += `<div class="cs-side__group">
        <button class="cs-side-item" data-cs-act="new-page">➕ ${esc(t("csNewPage"))}</button>
        <button class="cs-side-item" data-cs-act="sync-cloud">☁️ ${esc(t("csSyncCloud"))}</button>
        <button class="cs-side-item" data-cs-act="open-store">🛒 ${esc(t("csModules"))}</button>
      </div>`;
    } else if (s === "pages" || s === "conversion") {
      html += `<div class="cs-side__group">
        <div class="cs-side__sub">${esc(t("csFilterMode"))}</div>
        <select class="ed-select" data-cs-filter="mode">
          <option value="">${esc(t("csAllModes"))}</option>
          ${Object.values(WF.Modes).map((m) => `<option value="${m.key}">${m.icon} ${m.name}</option>`).join("")}
        </select>
        ${s === "conversion" ? `<div class="cs-side__sub">${esc(t("csAllProjects"))}</div>
        <select class="ed-select" data-cs-filter="project"><option value="">${esc(t("csAllProjects"))}</option></select>` : ""}
      </div>`;
    }
    const hintKey = { overview: "csOverviewHint", pages: "csPagesHint", conversion: "csConversionHint", audience: "csAudienceSideHint", modules: "csModulesHint", templates: "csTemplatesHint", plugins: "csPluginsHint", tasks: "csTasksHint", settings: "csSettingsHint" }[s];
    html += `<div class="cs-side__hint">${esc(t(hintKey))}</div>`;
    side.innerHTML = html;
    side.onclick = (e) => {
      const b = e.target.closest("[data-cs-act]");
      if (!b) return;
      const act = b.dataset.csAct;
      if (act === "new-page") { location.hash = "#/"; setTimeout(() => { const n = $('[data-act="new-project"]'); if (n) n.click(); }, 60); }
      if (act === "sync-cloud") doSync();
      if (act === "open-store") { state.section = "modules"; route(); }
    };
    side.onchange = (e) => {
      const f = e.target.closest("[data-cs-filter]");
      if (!f) return;
      state["f" + f.dataset.csFilter] = f.value;
      loadSection(state.section);
    };
  }

  // ============================================================
  //  板块:数据加载
  // ============================================================
  async function loadSection(s) {
    const main = $("#csMain");
    if (!main) return;
    main.innerHTML = `<div class="cs-empty">⏳</div>`;
    try {
      if (s === "overview") return await loadOverview();
      if (s === "pages") return await loadPages();
      if (s === "conversion") return await loadConversion();
      if (s === "audience") return await loadAudience();
      if (s === "modules") return loadModules();
      if (s === "templates") return await loadTemplates();
      if (s === "plugins") return await loadPlugins();
      if (s === "tasks") return await loadTaskLibrary();
      if (s === "settings") return loadSettings();
    } catch (e) {
      main.innerHTML = `<div class="cs-empty"><div class="cs-empty__icon">⚠️</div>${esc(e.message)}</div>`;
    }
  }

  function head(titleKey, subKey, actionsHTML) {
    return `<div class="cs-main__head">
      <div><div class="cs-main__title">${esc(t(titleKey))}</div><div class="cs-main__sub">${esc(t(subKey))}</div></div>
      <div class="cs-main__actions">${actionsHTML || ""}</div>
    </div>`;
  }

  async function loadOverview() {
    const [projects, stats] = await Promise.all([WF.apiGetProjects(), WF.apiGetEventStats()]);
    const shared = projects.filter((p) => p.is_public).length;
    const main = $("#csMain");
    const daily = stats.daily || [];
    main.innerHTML = head("csOverview", "csOverviewSub", `
        <button class="ed-btn" data-cs-act="sync-cloud">☁️ ${esc(t("csSyncCloud"))}</button>
        <button class="ed-btn is-primary" data-cs-act="new-page">➕ ${esc(t("csNewPage"))}</button>
      `) + `
      <div class="cs-kpi-grid">
        <div class="cs-kpi"><div class="cs-kpi__label">${esc(t("csKpiProjects"))}</div><div class="cs-kpi__val" data-count="${projects.length}">0</div><div class="cs-kpi__sub">${esc(t("csKpiProjectsSub"))}</div></div>
        <div class="cs-kpi"><div class="cs-kpi__label">${esc(t("csKpiClicks"))}</div><div class="cs-kpi__val" data-count="${stats.total || 0}">0</div><div class="cs-kpi__sub">${esc(t("csKpiClicksSub"))}</div></div>
        <div class="cs-kpi"><div class="cs-kpi__label">${esc(t("csKpiGoals"))}</div><div class="cs-kpi__val" data-count="${(stats.goals || []).length}">0</div><div class="cs-kpi__sub">${esc(t("csKpiGoalsSub"))}</div></div>
        <div class="cs-kpi"><div class="cs-kpi__label">${esc(t("csKpiShared"))}</div><div class="cs-kpi__val" data-count="${shared}">0</div><div class="cs-kpi__sub">${esc(t("csKpiSharedSub"))}</div></div>
      </div>
      <div class="cs-panels">
        <div class="cs-card">
          <div class="cs-card__head"><div class="cs-card__title">${esc(t("csTrend"))}</div><div class="cs-badge cs-badge--muted">${daily.length} ${esc(t("csDaysUnit"))}</div></div>
          ${sparklineSVG(daily.map((d) => d.count))}
        </div>
        <div class="cs-card">
          <div class="cs-card__head"><div class="cs-card__title">${esc(t("csRecentEvents"))}</div></div>
          ${(stats.recent || []).length ? (stats.recent || []).slice(0, 6).map((r) => `
            <div class="cs-rank">
              <span class="cs-rank__name" style="width:120px">${esc(r.goal_id)}</span>
              <span class="cs-rank__track" style="background:transparent"><span style="color:var(--muted);font-size:var(--fs-sm)">${esc(String(r.url || "").slice(0, 34))}</span></span>
              <span class="cs-rank__n" style="font-weight:500;color:var(--faint)">${esc(String(r.created_at || "").slice(5, 16))}</span>
            </div>`).join("") : `<div class="cs-empty"><div class="cs-empty__icon">📭</div>${esc(t("csNoData"))}</div>`}
        </div>
        <div class="cs-card">
          <div class="cs-card__head">
            <div class="cs-card__title">📡 ${esc(t("csAttr"))}</div>
            <span class="copilot__tabs">
              <button class="ed-btn ${state.attrBy !== "utm" ? "is-on" : ""}" data-cs-act="attr-by" data-by="ref">${esc(t("csAttrByRef"))}</button>
              <button class="ed-btn ${state.attrBy === "utm" ? "is-on" : ""}" data-cs-act="attr-by" data-by="utm">${esc(t("csAttrByUtm"))}</button>
            </span>
          </div>
          <div id="attrBox"><div class="cs-side__hint">⏳</div></div>
        </div>
        <div class="cs-card">
          <div class="cs-card__head"><div class="cs-card__title">${esc(t("csRecentPages"))}</div><button class="ed-btn" data-cs-nav="pages">${esc(t("csViewAll"))}</button></div>
          ${projects.length ? projects.slice(0, 5).map((p) => {
            const m = WF.Modes[p.mode] || WF.Modes.site;
            return `<div class="cs-rank">
              <span class="cs-rank__name" style="width:auto;flex:1">${esc(p.name)}</span>
              <span class="cs-badge cs-badge--accent">${m.icon} ${m.name}</span>
              <button class="ed-btn" data-cs-act="edit-page" data-id="${esc(p.id)}">${esc(t("csEdit"))}</button>
            </div>`;
          }).join("") : `<div class="cs-empty"><div class="cs-empty__icon">🧱</div>${esc(t("csNoProjects"))}</div>`}
        </div>
      </div>`;
    main.onclick = onMainClick;
    $$(".cs-kpi__val", main).forEach((el) => countUp(el));
    loadAttribution();
  }

  async function runReconcile() {
    WF.toast(t("csReconcileRunning"));
    try {
      const r = await WF.apiReconcileRun();
      const rep = r.report || {};
      WF.toast(t("csReconcileDone", { checked: rep.checked || 0, healed: rep.healed || 0 }), "success");
    } catch (e) {
      WF.toast(e.message, "error");
    }
  }

  async function loadAttribution() {
    const box = $("#attrBox");
    if (!box) return;
    try {
      const a = await WF.apiAttribution();
      const tm = a.totals || {};
      if (state.attrBy === "utm") {
        const rows = (a.byUtm || []);
        box.innerHTML = `
          <div class="cs-side__hint" style="margin-bottom:6px">${esc(t("csAttrUtmHint"))}</div>
          ${rows.length ? rows.slice(0, 6).map((u) => `<div class="cs-rank" style="padding:3px 0">
            <span class="cs-rank__name" style="width:96px">${esc(u.source)}</span>
            <span class="cs-rank__track"><span class="cs-rank__fill" style="width:${Math.min(100, u.revenue)}%"></span></span>
            <span class="cs-rank__n">¥${u.revenue.toFixed(0)}</span>
          </div>
          <div class="cs-side__hint" style="margin:-2px 0 6px 100px">${u.users} 注册 · ${u.paidUsers} 付费 · ${u.convRate}% · LTV ¥${u.ltv}</div>`).join("")
            : `<div class="cs-side__hint">${esc(t("csAttrEmpty"))}</div>`}`;
        return;
      }
      box.innerHTML = `
        <div class="cs-side__hint" style="margin-bottom:6px">${esc(t("csAttrScope", { scope: a.scope === "all" ? t("csAttrAll") : t("csAttrMine") }))}</div>
        ${(a.channels || []).slice(0, 5).map((c) => `<div class="cs-rank" style="padding:3px 0">
          <span class="cs-rank__name" style="width:100px">${esc(c.username)}</span>
          <span class="cs-rank__track"><span class="cs-rank__fill" style="width:${Math.min(100, c.revenue)}%"></span></span>
          <span class="cs-rank__n">¥${c.revenue.toFixed(0)}</span>
        </div>`).join("") || `<div class="cs-side__hint">${esc(t("csAttrEmpty"))}</div>`}
        <div class="cs-side__hint" style="margin-top:6px">
          ${esc(t("csAttrTotals", { invited: tm.invited || 0, paid: tm.paidUsers || 0, conv: tm.convRate || 0, revenue: (tm.revenue || 0).toFixed(2), ltv: tm.ltv || 0, roi: tm.roi || 0 }))}
        </div>
        ${(WF.apiGetStoredUser() || {}).is_admin ? `<div style="margin-top:8px"><button class="ed-btn" data-cs-act="reconcile-run">🧾 ${esc(t("csReconcile"))}</button></div>` : ""}`;
    } catch (e) {
      box.innerHTML = `<div class="cs-side__hint">${esc(e.message)}</div>`;
    }
  }

  async function loadPages() {
    let projects = await WF.apiGetProjects();
    if (state.fmode) projects = projects.filter((p) => p.mode === state.fmode);
    const main = $("#csMain");
    main.innerHTML = head("csPages", "csPagesSub", `
        <button class="ed-btn is-primary" data-cs-act="new-page">➕ ${esc(t("csNewPage"))}</button>
      `) + `<div class="cs-card" style="padding:0;overflow:hidden">
        <div class="cs-tbl-wrap" data-cs-table style="border:none;border-radius:0">
          <table class="cs-tbl">
            <thead><tr>
              <th>${esc(t("csColName"))}</th><th>${esc(t("csColMode"))}</th>
              <th>${esc(t("csColUpdated"))}</th><th>${esc(t("csColStatus"))}</th><th>${esc(t("csActions"))}</th>
            </tr></thead>
            <tbody>
              ${projects.map((p) => {
                const m = WF.Modes[p.mode] || WF.Modes.site;
                return `<tr>
                  <td class="cs-tbl__name">${esc(p.name)}</td>
                  <td><span class="cs-badge cs-badge--accent">${m.icon} ${m.name}</span>${(p.page_count || 1) > 1 ? ` <span class="cs-badge cs-badge--muted">${esc(t("csPagesCount", { n: p.page_count }))}</span>` : ""}</td>
                  <td class="cs-tbl__mono">${esc(String(p.updated_at || "").slice(0, 16))}</td>
                  <td>${p.published
                    ? `<span class="cs-badge cs-badge--ok">🚀 ${esc(t("csPublished"))}</span>`
                    : (p.is_public ? `<span class="cs-badge cs-badge--accent">🔗 ${esc(t("csShared"))}</span>` : `<span class="cs-badge cs-badge--muted">${esc(t("csPrivate"))}</span>`)}</td>
                  <td><div class="cs-tbl__actions">
                    <button class="ed-btn" data-cs-act="edit-page" data-id="${esc(p.id)}">${esc(t("csEdit"))}</button>
                    ${p.published
                      ? `<button class="ed-btn" data-cs-act="open-page" data-id="${esc(p.id)}" data-token="${esc(p.share_token || "")}">🔗 ${esc(t("csOpen"))}</button>
                         <button class="ed-btn" data-cs-act="unpublish-page" data-id="${esc(p.id)}">${esc(t("csUnpublish"))}</button>`
                      : `<button class="ed-btn is-primary" data-cs-act="publish-page" data-id="${esc(p.id)}">🚀 ${esc(t("csPublish"))}</button>`}
                    <button class="ed-btn" data-cs-act="tpl-from-page" data-id="${esc(p.id)}" data-name="${esc(p.name)}" data-mode="${esc(p.mode)}">📤 ${esc(t("csSaveAsTemplate"))}</button>
                    <button class="ed-btn is-danger" data-cs-act="del-page" data-id="${esc(p.id)}" data-name="${esc(p.name)}">${esc(t("csDelete"))}</button>
                  </div></td>
                </tr>`;
              }).join("")}
            </tbody>
          </table>
        </div>
      </div>`;
    main.onclick = onMainClick;
    const wrap = $("[data-cs-table]", main);
    if (wrap) enhanceTable(wrap);
  }

  async function loadConversion() {
    const stats = await WF.apiGetEventStats(state.fproject || undefined);
    const main = $("#csMain");
    const daily = stats.daily || [];
    const maxGoal = Math.max(1, ...(stats.goals || []).map((g) => g.count));
    const maxDaily = Math.max(1, ...daily.map((d) => d.count));
    main.innerHTML = head("csConversion", "csConversionSub", `<button class="ed-btn" data-cs-act="reload">🔄 ${esc(t("csRefresh"))}</button>`) + `
      <div class="cs-kpi-grid">
        <div class="cs-kpi"><div class="cs-kpi__label">${esc(t("csKpiClicks"))}</div><div class="cs-kpi__val" data-count="${stats.total || 0}">0</div></div>
        <div class="cs-kpi"><div class="cs-kpi__label">${esc(t("csKpiGoals"))}</div><div class="cs-kpi__val" data-count="${(stats.goals || []).length}">0</div></div>
      </div>
      <div class="cs-panels">
        <div class="cs-card">
          <div class="cs-card__head"><div class="cs-card__title">${esc(t("csTrend"))}</div></div>
          <div class="cs-bars">
            ${daily.length ? daily.map((d) => `<div class="cs-bar" title="${esc(d.date)} · ${d.count}">
              <div class="cs-bar__fill" style="height:${Math.round(d.count / maxDaily * 100)}%"></div>
              <div class="cs-bar__label">${esc(String(d.date).slice(5))}</div>
            </div>`).join("") : `<div class="cs-empty" style="width:100%">${esc(t("csNoData"))}</div>`}
          </div>
        </div>
        <div class="cs-card">
          <div class="cs-card__head"><div class="cs-card__title">${esc(t("csGoalsRank"))}</div></div>
          ${(stats.goals || []).length ? stats.goals.map((g) => `
            <div class="cs-rank">
              <span class="cs-rank__name">${esc(g.goal_id)}</span>
              <span class="cs-rank__track"><span class="cs-rank__fill" style="width:${Math.round(g.count / maxGoal * 100)}%"></span></span>
              <span class="cs-rank__n">${g.count}</span>
            </div>`).join("") : `<div class="cs-empty"><div class="cs-empty__icon">🎯</div>${esc(t("csNoData"))}<div class="cs-side__hint">${esc(t("csGoalHint"))}</div></div>`}
        </div>
      </div>
      <div class="cs-card" style="padding:0;overflow:hidden">
        <div class="cs-card__head" style="padding:16px 20px 0"><div class="cs-card__title">${esc(t("csRecentEvents"))}</div></div>
        <div class="cs-tbl-wrap" data-cs-table style="border:none;margin-top:12px">
          <table class="cs-tbl">
            <thead><tr><th>${esc(t("csColGoal"))}</th><th>${esc(t("csColUrl"))}</th><th>${esc(t("csColTime"))}</th></tr></thead>
            <tbody>
              ${(stats.recent || []).map((r) => `<tr>
                <td class="cs-tbl__mono">${esc(r.goal_id)}</td>
                <td class="cs-tbl__mono">${esc(String(r.url || "").slice(0, 60))}</td>
                <td class="cs-tbl__mono">${esc(String(r.created_at || "").slice(0, 16))}</td>
              </tr>`).join("")}
            </tbody>
          </table>
        </div>
      </div>`;
    main.onclick = onMainClick;
    $$(".cs-kpi__val", main).forEach((el) => countUp(el));
    const wrap = $("[data-cs-table]", main);
    if (wrap) enhanceTable(wrap);
    // 侧栏项目筛选下拉
    const sel = $('[data-cs-filter="project"]');
    if (sel && sel.options.length <= 1) {
      try {
        const projects = await WF.apiGetProjects();
        projects.forEach((p) => { const o = document.createElement("option"); o.value = p.id; o.textContent = p.name; sel.appendChild(o); });
        if (state.fproject) sel.value = state.fproject;
      } catch (e) {}
    }
  }

  async function loadAudience() {
    const projects = (await WF.apiGetProjects()).slice(0, 12);
    const rows = [];
    for (const p of projects) {
      try {
        const full = await WF.apiGetProject(p.id);
        (full.data && full.data.blocks || []).forEach((b) => {
          if (b.audience && (b.audience.visitor || b.audience.login || b.audience.utm)) rows.push({ page: p.name, pid: p.id, type: b.type, aud: b.audience });
        });
      } catch (e) {}
    }
    const label = (aud) => {
      const parts = [];
      if (aud.visitor === "new") parts.push(`🆕 ${t("csVisitorNew")}`);
      if (aud.visitor === "return") parts.push(`🔁 ${t("csVisitorReturn")}`);
      if (aud.login === "in") parts.push(`🔐 ${t("csLoginIn")}`);
      if (aud.login === "out") parts.push(`👤 ${t("csLoginOut")}`);
      if (aud.utm) parts.push(`🔗 UTM: ${aud.utm}`);
      return parts.join(" · ");
    };
    const main = $("#csMain");
    main.innerHTML = head("csAudience", "csAudienceSub", "") + `
      <div class="cs-card">
        <div class="cs-card__head"><div class="cs-card__title">${esc(t("csAudienceRules"))}</div><div class="cs-badge cs-badge--accent">${rows.length}</div></div>
        ${rows.length ? `<div class="cs-tbl-wrap" data-cs-table style="border:none">
          <table class="cs-tbl">
            <thead><tr><th>${esc(t("csColPage"))}</th><th>${esc(t("csColBlock"))}</th><th>${esc(t("csColRule"))}</th><th>${esc(t("csActions"))}</th></tr></thead>
            <tbody>
              ${rows.map((r) => `<tr>
                <td class="cs-tbl__name">${esc(r.page)}</td>
                <td>${esc(WF.tBlock(r.type))}</td>
                <td><span class="cs-badge cs-badge--warn">${esc(label(r.aud))}</span></td>
                <td><button class="ed-btn" data-cs-act="edit-page" data-id="${esc(r.pid)}">${esc(t("csEdit"))}</button></td>
              </tr>`).join("")}
            </tbody>
          </table>
        </div>` : `<div class="cs-empty"><div class="cs-empty__icon">🎯</div>${esc(t("csAudienceEmpty"))}</div>`}
      </div>
      <div class="cs-card">
        <div class="cs-card__head"><div class="cs-card__title">${esc(t("csHowItWorks"))}</div></div>
        <div class="cs-side__hint" style="margin:0">${esc(t("csAudienceHow"))}</div>
      </div>`;
    main.onclick = onMainClick;
    const wrap = $("[data-cs-table]", main);
    if (wrap) enhanceTable(wrap);
  }

  function loadModules() {
    const favs = WF.getFavorites();
    const community = WF.getCommunityBlocks();
    const main = $("#csMain");
    const blockCard = (type) => {
      const def = WF.Blocks[type];
      if (!def) return "";
      return `<div class="cs-card" style="margin:0;padding:16px">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:20px">${def.icon}</span>
          <div style="flex:1;min-width:0">
            <div style="font-weight:700">${esc(WF.tBlock(type))}</div>
            <div class="cs-side__hint" style="margin:2px 0 0">${esc(def.desc)}</div>
          </div>
          <button class="ed-btn is-primary" data-cs-act="use-block" data-type="${esc(type)}">${esc(t("csUseBlock"))}</button>
        </div>
      </div>`;
    };
    main.innerHTML = head("csModules", "csModulesSub", "") + `
      <div class="cs-card">
        <div class="cs-card__head"><div class="cs-card__title">❤️ ${esc(t("csFavorites"))}</div><div class="cs-badge cs-badge--accent">${favs.length}</div></div>
        ${favs.length ? `<div class="cs-panels">${favs.map(blockCard).join("")}</div>`
          : `<div class="cs-empty"><div class="cs-empty__icon">🤍</div>${esc(t("csNoFavorites"))}</div>`}
      </div>
      <div class="cs-card">
        <div class="cs-card__head"><div class="cs-card__title">🛒 ${esc(t("csCommunity"))}</div><div class="cs-badge cs-badge--muted">${community.length}</div></div>
        <div class="cs-tbl-wrap" data-cs-table style="border:none">
          <table class="cs-tbl">
            <thead><tr><th>${esc(t("csColBlock"))}</th><th>${esc(t("csColType"))}</th><th>${esc(t("csColAuthor"))}</th><th>⬇</th><th>${esc(t("csActions"))}</th></tr></thead>
            <tbody>
              ${community.map((b) => `<tr>
                <td class="cs-tbl__name">${esc(b.name)}<div class="cs-side__hint" style="margin:2px 0 0">${esc(b.description)}</div></td>
                <td>${esc(WF.tBlock(b.type))}</td>
                <td class="cs-tbl__mono">${esc(b.author)}</td>
                <td class="cs-tbl__mono">${b.downloads}</td>
                <td><button class="ed-btn" data-cs-act="use-community" data-id="${esc(b.id)}">${esc(t("csUseBlock"))}</button></td>
              </tr>`).join("")}
            </tbody>
          </table>
        </div>
      </div>`;
    main.onclick = onMainClick;
    const wrap = $("[data-cs-table]", main);
    if (wrap) enhanceTable(wrap);
  }

  function loadSettings() {
    const user = WF.apiGetStoredUser() || {};
    const main = $("#csMain");
    main.innerHTML = head("csSettings", "csSettingsSub", "") + `
      <div class="cs-panels">
        <div class="cs-card">
          <div class="cs-card__head"><div class="cs-card__title">💎 ${esc(t("csPlanTitle"))}</div><button class="ed-btn" data-cs-act="reload-billing">🔄</button></div>
          <div id="billingBox"><div class="cs-side__hint">⏳</div></div>
        </div>
        <div class="cs-card">
          <div class="cs-card__head"><div class="cs-card__title">💰 ${esc(t("csEarnings"))}</div></div>
          <div id="earningsBox"><div class="cs-side__hint">⏳</div></div>
        </div>
        <div class="cs-card">
          <div class="cs-card__head"><div class="cs-card__title">🔗 ${esc(t("csReferral"))}</div></div>
          <div id="refBox"><div class="cs-side__hint">⏳</div></div>
        </div>
        ${(WF.apiGetStoredUser() || {}).is_admin ? `
        <div class="cs-card">
          <div class="cs-card__head"><div class="cs-card__title">🔔 ${esc(t("csNotifyChannel"))}</div></div>
          <div id="larkBox"><div class="cs-side__hint">⏳</div></div>
        </div>` : ""}
        <div class="cs-card">
          <div class="cs-card__head"><div class="cs-card__title">👤 ${esc(t("csProfile"))}</div></div>
          <div class="cs-side__hint" style="margin-bottom:12px">${esc(t("csProfileHint"))}</div>
          <div class="field"><label class="ed-label">${esc(t("csDisplayName"))}</label>
            <input class="ed-input" id="csName" value="${esc(user.display_name || user.username || "")}"></div>
          <div class="field"><label class="ed-label">${esc(t("csAvatar"))}</label>
            <input class="ed-input" id="csAvatar" value="${esc(user.avatar || "")}" placeholder="https://…"></div>
          <div class="field"><label class="ed-label">${esc(t("csEmail"))}</label>
            <input class="ed-input" value="${esc(user.email || "")}" disabled></div>
          <button class="ed-btn is-primary" data-cs-act="save-profile">${esc(t("csSave"))}</button>
        </div>
        <div class="cs-card">
          <div class="cs-card__head"><div class="cs-card__title">🌐 ${esc(t("csPreferences"))}</div></div>
          <div class="field"><label class="ed-label">${esc(t("csLanguage"))}</label>
            <select class="ed-select" data-cs-act="set-lang">
              ${WF.Langs.map(([k, n]) => `<option value="${k}" ${WF.getLang() === k ? "selected" : ""}>${n}</option>`).join("")}
            </select></div>
          <button class="ed-btn" data-cs-act="go-hub">${esc(t("csBackEditor"))}</button>
          <button class="ed-btn is-danger" data-cs-act="logout" style="margin-left:8px">${esc(t("csLogout"))}</button>
        </div>
        <div class="cs-card">
          <div class="cs-card__head"><div class="cs-card__title">🧨 ${esc(t("csDangerZone"))}</div></div>
          <div class="cs-side__hint" style="margin-bottom:12px">${esc(t("csDangerHint"))}</div>
          <button class="ed-btn is-danger" data-cs-act="clear-local">${esc(t("csClearLocal"))}</button>
        </div>
      </div>`;
    main.onclick = onMainClick;
    main.onchange = (e) => {
      const el = e.target.closest('[data-cs-act="set-lang"]');
      if (el) WF.setLang(el.value);
    };
    loadBilling();
  }

  // ---------- 通知中心 ----------
  async function loadNotify() {
    try {
      const r = await WF.apiGetNotifications();
      state.notif = { list: r.notifications || [], unread: r.unread || 0 };
      const n = $("#csBellN");
      if (n) {
        n.hidden = !state.notif.unread;
        n.textContent = state.notif.unread > 99 ? "99+" : String(state.notif.unread);
      }
      renderNotify();
    } catch (e) { /* 未登录等,忽略 */ }
  }

  function renderNotify() {
    const box = $("#csNotify");
    if (!box || box.hidden) return;
    const list = (state.notif && state.notif.list) || [];
    box.innerHTML = list.length ? list.map((x) => `
      <div class="cs-notify__item${x.read ? "" : " is-unread"}">
        <div class="cs-notify__title">${esc(x.title)}</div>
        ${x.body ? `<div class="cs-notify__body">${esc(x.body)}</div>` : ""}
        <div class="cs-notify__time">${esc(String(x.created_at || "").slice(5, 16))}</div>
      </div>`).join("") : `<div class="cs-empty" style="padding:24px">${esc(t("csNoNotify"))}</div>`;
  }

  async function toggleNotify() {
    const box = $("#csNotify");
    if (!box) return;
    box.hidden = !box.hidden;
    renderNotify();
    if (!box.hidden && state.notif && state.notif.unread) {
      try { await WF.apiReadNotifications(); } catch (e) {}
      state.notif.list.forEach((x) => { x.read = 1; });
      state.notif.unread = 0;
      const n = $("#csBellN");
      if (n) n.hidden = true;
      renderNotify();
    }
  }

  // ---------- 模板收藏夹 ----------
  const FAV_KEY = "websflow.tplFav";
  function favs() {
    try { return JSON.parse(localStorage.getItem(FAV_KEY) || "[]"); } catch (e) { return []; }
  }
  function saveFavs(list) {
    try { localStorage.setItem(FAV_KEY, JSON.stringify(list)); } catch (e) {}
  }
  function toggleTplFav(id) {
    const list = favs();
    const i = list.indexOf(id);
    if (i >= 0) list.splice(i, 1);
    else list.push(id);
    saveFavs(list);
    WF.toast(favs().includes(id) ? t("csFavAdded") : t("csFavRemoved"), "success");
    route();
  }
  function toggleFavOnly() {
    state.tplFavOnly = !state.tplFavOnly;
    route();
  }

  // ---------- 套餐 / 收益 ----------
  async function loadBilling() {
    const box = $("#billingBox");
    if (box) {
      try {
        const me = await WF.apiBillingMe();
        const u = me.usage || {};
        const plan = me.plan || {};
        const bar = (label, used, max) => `<div class="cs-rank">
          <span class="cs-rank__name" style="width:96px">${esc(label)}</span>
          <span class="cs-rank__track"><span class="cs-rank__fill" style="width:${Math.min(100, Math.round(used / Math.max(1, max) * 100))}%"></span></span>
          <span class="cs-rank__n">${used}/${max >= 100 ? "∞" : max}</span>
        </div>`;
        box.innerHTML = `
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
            <span class="cs-badge ${plan.key === "pro" ? "cs-badge--ok" : "cs-badge--muted"}" style="font-size:var(--fs-md)">${esc(plan.name || "免费版")}</span>
            ${me.plan_expires_at ? `<span class="cs-side__hint" style="margin:0">${esc(t("csExpires"))} ${esc(String(me.plan_expires_at).slice(0, 10))}</span>` : ""}
            <span class="cs-side__hint" style="margin:0">${esc(t("csBalance"))}: ¥${(me.balance || 0).toFixed(2)}</span>
          </div>
          ${bar(t("csUsageProjects"), u.cloudProjects || 0, plan.cloudProjects || 3)}
          ${bar(t("csUsagePublished"), u.publishedPages || 0, plan.publishedPages || 1)}
          ${bar(t("csUsageAi"), u.aiToday || 0, plan.aiPerDay || 20)}
          <div class="cs-side__hint" style="margin:14px 0 6px">${esc(t("csPayTitle"))} <span id="payChannel"></span></div>
          <div id="payBox" style="display:flex;gap:8px;flex-wrap:wrap"><span class="cs-side__hint">⏳</span></div>
          <div id="payOrders" style="margin-top:10px"></div>
          <div class="field" style="margin-top:12px">
            <label class="ed-label">${esc(t("csRedeem"))}</label>
            <div style="display:flex;gap:8px">
              <input class="ed-input" id="redeemCode" placeholder="${esc(t("csRedeemPh"))}">
              <button class="ed-btn is-primary" style="flex:none" data-cs-act="redeem-code">${esc(t("csRedeemBtn"))}</button>
            </div>
            <div class="cs-side__hint">${esc(t("csRedeemHint"))}</div>
          </div>`;
      } catch (e) {
        box.innerHTML = `<div class="cs-side__hint">${esc(e.message)}</div>`;
      }
      loadPay();
      loadReferral();
    }
    const ebox = $("#earningsBox");
    if (ebox) {
      try {
        const e = await WF.apiGetEarnings();
        ebox.innerHTML = `
          <div class="cs-kpi"><div class="cs-kpi__label">${esc(t("csEarnings"))}</div>
            <div class="cs-kpi__val" data-count="${Math.round(e.total || 0)}">0</div>
            <div class="cs-kpi__sub">${esc(t("csEarningsSub", { n: e.orders || 0 }))}</div></div>`;
        $$(".cs-kpi__val", ebox).forEach((el) => countUp(el));
      } catch (e) {
        ebox.innerHTML = `<div class="cs-side__hint">${esc(e.message)}</div>`;
      }
    }
  }

  // ---------- 在线支付(PayFlow) ----------
  async function loadPay() {
    const box = $("#payBox");
    if (!box) return;
    try {
      const r = await WF.apiBillingCatalog();
      const chEl = $("#payChannel");
      if (chEl) chEl.innerHTML = r.auto ? `<span class="cs-badge cs-badge--ok">${esc(t("csPayAuto"))}</span>` : `<span class="cs-badge cs-badge--warn">${esc(t("csPayManual"))}</span>`;
      if (!r.configured) { box.innerHTML = `<span class="cs-side__hint">${esc(t("csPayUnconfigured"))}</span>`; return; }
      box.innerHTML = (r.catalog || []).map((it) => `<button class="ed-btn ${it.kind === "pro" ? "is-primary" : ""}" data-cs-act="pay-buy" data-id="${esc(it.id)}" data-kind="${esc(it.kind)}" data-name="${esc(it.name)}">
        ${it.kind === "pro" ? "💎" : "💰"} ${esc(it.name)}
      </button>`).join("");
      const orders = await WF.apiPayflowOrders();
      const ob = $("#payOrders");
      if (ob) {
        ob.innerHTML = orders.filter((o) => o.status === "created").map((o) => `
          <div class="cs-side__hint" style="display:flex;align-items:center;gap:8px">
            <span>${esc(t("csPayPending"))} ${esc(o.order_no)}</span>
            <button class="ed-btn" data-cs-act="pay-check" data-no="${esc(o.order_no)}">${esc(t("csPayCheck"))}</button>
          </div>`).join("");
      }
    } catch (e) {
      box.innerHTML = `<span class="cs-side__hint">${esc(e.message)}</span>`;
    }
  }

  // ---------- 邀请返佣 ----------
  async function loadReferral() {
    const box = $("#refBox");
    if (!box) return;
    try {
      const r = await WF.apiReferralMe();
      const link = location.origin + "/webflow/?ref=" + r.code;
      box.innerHTML = `
        <div class="field"><label class="ed-label">${esc(t("csRefCode"))}</label>
          <div style="display:flex;gap:8px">
            <input class="ed-input" id="refLink" value="${esc(link)}" readonly onclick="this.select()">
            <button class="ed-btn is-primary" style="flex:none" data-cs-act="ref-copy">${esc(t("copyLink"))}</button>
          </div>
        </div>
        <div class="cs-side__hint">${esc(t("csRefHint"))}</div>
        <div class="cs-rank" style="margin-top:8px">
          <span class="cs-rank__name" style="width:88px">${esc(t("csRefInvited"))}</span>
          <span class="cs-rank__track"><span class="cs-rank__fill" style="width:${Math.min(100, (r.invited || 0) * 10)}%"></span></span>
          <span class="cs-rank__n">${r.invited || 0}</span>
        </div>
        <div class="cs-rank">
          <span class="cs-rank__name" style="width:88px">${esc(t("csRefEarned"))}</span>
          <span class="cs-rank__track"><span class="cs-rank__fill" style="width:${Math.min(100, (r.earnings && r.earnings.total) || 0)}%"></span></span>
          <span class="cs-rank__n">¥${((r.earnings && r.earnings.total) || 0).toFixed(1)}</span>
        </div>
        ${r.refVariant ? `<div class="cs-side__hint" style="margin:4px 0">🏆 ${esc(t("csRefDefaultOn", { v: r.refVariant }))}</div>` : ""}
        <div style="margin:8px 0 4px">
          <span class="cs-badge cs-badge--ok">${esc(r.tier ? r.tier.name.zh : "")} · ${esc(t("csRefRate"))} ${r.tier ? (r.tier.pro * 100).toFixed(0) : 10}% / ${r.tier ? (r.tier.other * 100).toFixed(0) : 5}%</span>
          ${r.next ? `<span class="cs-side__hint" style="margin-left:8px">${esc(t("csRefNext", { n: r.next.need, name: r.next.name.zh, pro: (r.next.pro * 100).toFixed(0) }))}</span>` : `<span class="cs-side__hint" style="margin-left:8px">${esc(t("csRefMaxTier"))}</span>`}
        </div>
        ${r.verified ? `
        <div class="field" style="margin-top:8px">
          <label class="ed-label">${esc(t("csPayout"))} (${esc(t("csPayoutBalance"))}: ¥${(r.balance || 0).toFixed(2)})</label>
          <div style="display:flex;gap:8px">
            <input class="ed-input" id="payoutAmt" type="number" placeholder="${esc(t("csPayoutPh", { min: r.risk.minAmount }))}">
            <button class="ed-btn is-primary" style="flex:none" data-cs-act="payout-request">${esc(t("csPayoutAsk"))}</button>
          </div>
          <div class="cs-side__hint">${esc(t("csRiskLimits", { max: r.risk.maxAmount, day: r.risk.dailyAmount, month: r.risk.monthlyAmount, cnt: r.risk.dailyCount }))}</div>
          <div class="cs-side__hint">${esc(t("csPayoutHint"))}</div>
        </div>` : `
        <div class="field" style="margin-top:8px">
          <label class="ed-label">${esc(t("csRefVerify"))}</label>
          <div style="display:flex;gap:8px;margin-bottom:6px">
            <input class="ed-input" id="verifyName" placeholder="${esc(t("csRefRealName"))}">
            <input class="ed-input" id="verifyPhone" placeholder="${esc(t("csRefPhone"))}">
          </div>
          <button class="ed-btn is-primary" data-cs-act="ref-verify">${esc(t("csRefSubmit"))}</button>
          <div class="cs-side__hint">${esc(t("csRefVerifyHint"))}</div>
        </div>`}
        ${(r.settlements || []).length ? `<div style="margin-top:8px">
          <div class="cs-side__hint" style="margin-bottom:4px">${esc(t("csSettle"))}</div>
          ${r.settlements.slice(0, 6).map((x) => `<div class="cs-side__hint" style="display:flex;gap:8px;align-items:center">
            <span style="flex:1">${esc(x.period)} · ¥${Number(x.commission || 0).toFixed(2)} (${x.orders} ${esc(t("csSettleOrders"))})</span>
            <button class="ed-btn" data-cs-act="settle-download" data-period="${esc(x.period)}">${esc(t("csSettleDownload"))}</button>
            <button class="ed-btn" data-cs-act="settle-mail" data-period="${esc(x.period)}">📧</button>
          </div>`).join("")}
        </div>` : ""}
        <div class="cs-side__hint" id="mailStatus" style="margin-top:8px"></div>
        <div style="margin-top:10px">
          <button class="ed-btn" data-cs-act="make-ref-page">🎯 ${esc(t("csRefPageMake"))}</button>
          <button class="ed-btn" data-cs-act="make-ref-ab">🧪 ${esc(t("csRefPageAB"))}</button>
          <div class="cs-side__hint">${esc(t("csRefPageHint"))}</div>
          <div id="refPageBox"></div>
        </div>
        ${(r.payouts || []).length ? `<div style="margin-top:6px">${r.payouts.slice(0, 5).map((p) => `<div class="cs-side__hint" style="display:flex;gap:8px"><span>¥${(p.amount || 0).toFixed(2)}</span><span class="cs-badge ${p.status === "paid" ? "cs-badge--ok" : p.status === "rejected" ? "cs-badge--muted" : "cs-badge--warn"}">${esc(t("csPayout_" + p.status) || p.status)}</span><span>${esc(String(p.created_at || "").slice(0, 10))}</span></div>`).join("")}</div>` : ""}
        <div id="boardBox" style="margin-top:10px"></div>
        <div id="payoutAdmin" style="margin-top:10px"></div>
        <div class="field" style="margin-top:10px">
          <label class="ed-label">${esc(t("csRefClaim"))}</label>
          <div style="display:flex;gap:8px">
            <input class="ed-input" id="refClaim" placeholder="${esc(t("csRefClaimPh"))}">
            <button class="ed-btn" style="flex:none" data-cs-act="ref-claim">${esc(t("csRefClaimBtn"))}</button>
          </div>
        </div>`;
      loadBoard();
      loadPayoutAdmin();
      loadMailStatus();
      loadNotifyChannel();
    } catch (e) {
      box.innerHTML = `<div class="cs-side__hint">${esc(e.message)}</div>`;
    }
  }

  async function loadBoard() {
    const box = $("#boardBox");
    if (!box) return;
    try {
      const r = await WF.apiReferralBoard();
      box.innerHTML = `<div class="cs-side__hint" style="margin-bottom:4px">${esc(t("csRefBoard"))}${r.me ? ` · ${esc(t("csRefMyRank", { n: r.me.rank }))}` : ""}</div>
        ${(r.board || []).slice(0, 5).map((x, i) => `<div class="cs-side__hint" style="display:flex;gap:8px">
          <span style="width:18px">${i + 1}</span>
          <span style="flex:1">${esc(x.username)}${x.isMe ? " (" + esc(t("csMine")) + ")" : ""}</span>
          <span>${x.invited} ${esc(t("csRefInvited"))}</span>
          <span>¥${(x.commission || 0).toFixed(1)}</span>
        </div>`).join("") || `<div class="cs-side__hint">${esc(t("csNoData"))}</div>`}`;
    } catch (e) { box.innerHTML = ""; }
  }

  async function loadPayoutAdmin() {
    const box = $("#payoutAdmin");
    if (!box) return;
    const me = WF.apiGetStoredUser() || {};
    if (!me.is_admin) return;
    try {
      const list = await WF.apiPayoutsPending();
      if (!list.length) { box.innerHTML = ""; return; }
      box.innerHTML = `<div class="cs-side__hint" style="margin-bottom:4px">${esc(t("csPayoutPending"))} (${list.length})</div>
        ${list.map((p) => `<div class="cs-side__hint" style="display:flex;gap:6px;align-items:center">
          <span style="flex:1">${esc(p.username || p.user_id)} · ¥${(p.amount || 0).toFixed(2)}</span>
          <button class="ed-btn" data-cs-act="payout-review" data-id="${esc(p.id)}" data-action="approve">${esc(t("csApprove"))}</button>
          <button class="ed-btn" data-cs-act="payout-review" data-id="${esc(p.id)}" data-action="paid">${esc(t("csPayoutPaid"))}</button>
          <button class="ed-btn is-danger" data-cs-act="payout-review" data-id="${esc(p.id)}" data-action="reject">${esc(t("csReject"))}</button>
        </div>`).join("")}`;
    } catch (e) { box.innerHTML = ""; }
  }

  async function loadMailStatus() {
    const box = $("#mailStatus");
    if (!box) return;
    const me = WF.apiGetStoredUser() || {};
    try {
      const m = await WF.apiMailStatus();
      box.innerHTML = `${esc(t("csMailChannel"))}: ${m.configured
        ? `<span class="cs-badge cs-badge--ok">${esc(t("csMailOn"))} (${esc(m.source)})</span>`
        : `<span class="cs-badge cs-badge--warn">${esc(t("csMailOff"))}</span>`}
        ${m.configured && me.is_admin ? `<button class="ed-btn" data-cs-act="mail-test" style="margin-left:6px">${esc(t("csMailTest"))}</button>` : ""}
        ${!m.configured ? `<div class="cs-side__hint">${esc(t("csMailHint"))}</div>` : ""}`;
    } catch (e) { box.innerHTML = ""; }
  }

  async function loadNotifyChannel() {
    const box = $("#larkBox");
    if (!box) return;
    try {
      const r = await WF.apiNotifyStatus();
      box.innerHTML = `
        <div class="cs-side__hint" style="margin-bottom:6px">${esc(t("csNotifyLarkHint"))}</div>
        <div class="field"><label class="ed-label">${esc(t("csNotifyLark"))} ${
          r.lark.configured ? `<span class="cs-badge cs-badge--ok">${esc(t("csMailOn"))} (${esc(r.lark.source)})</span>` : `<span class="cs-badge cs-badge--warn">${esc(t("csMailOff"))}</span>`}</label>
          <div style="display:flex;gap:8px">
            <input class="ed-input" id="larkUrl" placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/...">
            <button class="ed-btn is-primary" style="flex:none" data-cs-act="lark-save">${esc(t("csSave"))}</button>
          </div>
          <div class="cs-side__hint">${esc(t("csNotifyLarkHow"))}</div>
        </div>`;
    } catch (e) { box.innerHTML = ""; }
  }

  async function saveLark() {
    const i = $("#larkUrl");
    const url = (i && i.value || "").trim();
    if (!url) return WF.toast(t("csNotifyLarkHow"), "error");
    try {
      const r = await WF.apiSetLark(url);
      WF.toast(r.message, "success");
      loadNotifyChannel();
    } catch (e) {
      WF.toast(e.message, "error");
    }
  }

  async function mailTest() {
    try {
      const r = await WF.apiMailTest();
      WF.toast(r.message, "success");
    } catch (e) {
      WF.toast(e.message, "error");
    }
  }

  // 邀请页 A/B:两个变体各自发布,目标分别计量
  async function makeRefPageAB() {
    const box = $("#refPageBox");
    if (box) box.innerHTML = `<div class="cs-side__hint">⏳ ${esc(t("downloading"))}</div>`;
    try {
      const me = await WF.apiReferralMe();
      const link = location.origin + "/webflow/?ref=" + me.code;
      const useB = me.refVariant === "B";   // A/B 自动选优:优先使用胜出版本文案
      const mk = (type, props, style) => {
        const def = WF.Blocks[type];
        return {
          id: "b" + Math.random().toString(36).slice(2, 9), type,
          props: Object.assign(JSON.parse(JSON.stringify(def.defaults)), props || {}),
          hidden: false, style: Object.assign({ bg: "", padding: "normal", anim: type === "nav" ? "none" : "up" }, style || {}),
        };
      };
      const base = (V, goalId, hero, cta) => {
        const blocks = [
          mk("nav", { brand: "WebsFlow 魔块", links: [{ label: "为什么", href: "#cluster" }, { label: "常见问题", href: "#faq" }], btnText: V === "A" ? "免费开始" : "先免费试用", btnLink: link }),
          mk("hero", Object.assign({ badge: V === "A" ? "🎁 邀请有礼" : "🚀 一个人也能做投放", title: hero, subtitle: V === "A"
              ? "我用 WebsFlow 一个人做出投放落地页、看转化数据、跑 A/B 测试。通过我的邀请链接注册,你也能立刻开始。"
              : "不用等设计排期:选模板、换文案、五分钟出成品页,还能用云托管一键发布并看转化。",
            btnText: cta, btnLink: link, btn2Text: "先看看效果", btn2Link: "#cluster", bgType: "gradient", gradient: "indigo", align: "center" }, { padding: "loose" })),
          mk("proof", { cols: "3", items: [{ value: "43", label: "成品模块" }, { value: "5", suffix: "分钟", label: "出第一个落地页" }, { value: "A/B", label: "自带显著性检验" }] }),
          mk("cluster", { title: "做投放,最怕这三件事", cols: "3", items: [
            { icon: "⏱", title: "出页太慢", desc: "外包排期按周算,活动明天就要上线。" },
            { icon: "📉", title: "不知道哪版好", desc: "改完没对照,内置显著性检验一眼看赢家。" },
            { icon: "🧩", title: "素材散落各处", desc: "单文件 HTML 随处可挂,也能云托管发布。" },
          ] }),
          mk("faq", { title: "你可能想问", items: [
            { q: "需要写代码吗?", a: "不需要,全程可视化编辑。" },
            { q: "免费版够用吗?", a: "可建 3 个云端项目、发布 1 个页面、每日 20 次 AI 生成。" },
          ] }),
          mk("cta", { title: cta, subtitle: "通过我的邀请链接注册,直接开始", btnText: V === "A" ? "立即免费开始" : "免费试用,不绑卡", btnLink: link, style: "gradient", goalId }),
          mk("footer", { brand: "WebsFlow 魔块", desc: "AI 时代的落地页工场", links: [{ label: "产品介绍", url: "/webflow/" }], copyright: "© 2026 WebsFlow" }),
        ];
        return blocks;
      };
      const expId = "refab" + Date.now().toString(36);
      const variants = [];
      for (const V of ["A", "B"]) {
        const goalId = `${expId}-${V}`;
        const hero = V === "A" ? "把页面,变成你的增长引擎" : "不等排期,今天就把落地页做出来";
        const cta = V === "A" ? "通过邀请链接免费开始" : "免费试用,不绑卡";
        const blocks = base(V, goalId, hero, cta);
        const created = await WF.apiCreateProject(`${me.code}-邀请页-${V}`, "site", {
          theme: { preset: V === "A" ? "indigo" : "aqua", fontScale: 1 },
          global: { title: hero, description: "通过邀请链接注册 WebsFlow", brand: "WebsFlow 魔块" },
          blocks, pages: [{ id: "main", name: "首页", slug: "", blocks }],
        }, "邀请页 A/B");
        const pub = await WF.apiRequest("/projects/" + created.id + "/publish", { method: "POST" });
        variants.push({ key: V, goalId, cloudId: created.id, token: pub.token, url: location.origin + "/webflow/p/" + pub.token, localId: "" });
      }
      WF.saveABExp({ id: expId, name: (me.code || "") + " 邀请页", taskId: "refpage-ab", at: Date.now(), baseGoal: expId, variants, refPage: true });
      if (box) box.innerHTML = `
        <div class="cs-side__hint" style="margin:6px 0">${esc(t("csRefPageABDone"))}</div>
        ${variants.map((v) => `<div class="cs-side__hint" style="display:flex;gap:8px;align-items:center;margin-bottom:4px">
          <span class="cs-badge cs-badge--accent">${v.key}</span>
          <input class="ed-input" value="${esc(v.url)}" readonly onclick="this.select()" style="flex:1">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent(v.url)}" style="width:52px;height:52px;border-radius:6px">
        </div>`).join("")}
        <button class="ed-btn is-primary" data-cs-act="refab-compare" data-exp="${esc(expId)}">${esc(t("taskCompare"))}</button>
        <div id="refabDelta" style="margin-top:6px"></div>`;
      WF.toast(t("csRefPageABDone"), "success");
    } catch (e) {
      if (box) box.innerHTML = `<div class="cs-side__hint">${esc(e.message)}</div>`;
    }
  }

  async function compareRefAB(expId) {
    const box = document.querySelector("#refabDelta");
    if (box) box.textContent = "⏳";
    try {
      const exp = (WF.getABExps() || []).find((x) => x.id === expId);
      if (!exp) return;
      const stats = await WF.apiGetEventStats();
      const map = {};
      (stats.goals || []).forEach((g) => { map[g.goal_id] = g.count; });
      const counts = exp.variants.map((v) => ({ views: map["view:" + v.cloudId] || 0, clicks: map[v.goalId] || 0 }));
      const st = WF.abStats(counts);
      const pct = (x) => (x * 100).toFixed(1) + "%";
      if (box) box.innerHTML = `
        ${exp.variants.map((v, i) => `<div class="cs-rank" style="padding:3px 0">
          <span class="cs-rank__name" style="width:70px">${esc(t("abVariant"))} ${v.key}</span>
          <span class="cs-rank__track"><span class="cs-rank__fill" style="width:${Math.round((i === 0 ? st.cvrA : st.cvrB) * 100 / Math.max(0.0001, Math.max(st.cvrA, st.cvrB)) * 100)}%"></span></span>
          <span class="cs-rank__n">${pct(i === 0 ? st.cvrA : st.cvrB)}</span>
        </div>`).join("")}
        <div class="cs-side__hint">${esc(t("abViews"))} A${st.va}/B${st.vb} · ${esc(t("abClicks"))} A${st.ca}/B${st.cb} · ${esc(t("abSig"))}: ${st.significant ? "✅ " + esc(t("abSigYes")) : "⏳ " + esc(t("abSigNo"))} (p=${st.p.toFixed(3)})</div>
        ${st.significant ? `<button class="ed-btn is-primary" style="margin-top:6px" data-cs-act="ref-set-default" data-exp="${esc(expId)}" data-variant="${st.cvrA > st.cvrB ? "A" : "B"}">🏆 ${esc(t("csRefSetDefault", { v: st.cvrA > st.cvrB ? "A" : "B" }))}</button>` : ""}`;
    } catch (e) {
      if (box) box.textContent = e.message;
    }
  }

  async function setRefDefaultVariant(expId, variant) {
    try {
      const r = await WF.apiSetRefVariant(variant, expId);
      WF.toast(r.message, "success");
      loadReferral();
    } catch (e) {
      WF.toast(e.message, "error");
    }
  }

  async function submitVerify() {
    const name = (($("#verifyName") || {}).value || "").trim();
    const phone = (($("#verifyPhone") || {}).value || "").trim();
    if (!name || !phone) return WF.toast(t("csRefVerifyHint"), "error");
    try {
      const r = await WF.apiReferralVerify(name, phone);
      WF.toast(r.message, "success");
      loadReferral();
    } catch (e) {
      WF.toast(e.message, "error");
    }
  }

  async function mailSettlement(period) {
    try {
      const r = await WF.apiSettlementMail(period);
      WF.toast(r.message, "success");
    } catch (e) {
      WF.toast(e.message, "error");
    }
  }

  async function downloadSettlement(period) {
    try {
      const text = await WF.apiSettlement(period);
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "websflow-结算单-" + period + ".txt";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      WF.toast(t("csSettleDownloaded"), "success");
    } catch (e) {
      WF.toast(e.message, "error");
    }
  }

  // 裂变活动页:套用增长漏斗结构 + 个人邀请链接
  async function makeRefPage() {
    const box = $("#refPageBox");
    if (box) box.innerHTML = `<div class="cs-side__hint">⏳ ${esc(t("downloading"))}</div>`;
    try {
      const me = await WF.apiReferralMe();
      const link = location.origin + "/webflow/?ref=" + me.code;
      const useB = me.refVariant === "B";   // A/B 自动选优:优先使用胜出版本文案
      const mk = (type, props, style) => {
        const def = WF.Blocks[type];
        return {
          id: "b" + Math.random().toString(36).slice(2, 9), type,
          props: Object.assign(JSON.parse(JSON.stringify(def.defaults)), props || {}),
          hidden: false, style: Object.assign({ bg: "", padding: "normal", anim: type === "nav" ? "none" : "up" }, style || {}),
        };
      };
      const blocks = [
        mk("nav", { brand: "WebsFlow 魔块", links: [{ label: "为什么", href: "#cluster" }, { label: "怎么做", href: "#journey" }, { label: "常见问题", href: "#faq" }], btnText: "免费开始", btnLink: link }),
        mk("hero", useB
          ? { badge: "🚀 一个人也能做投放", title: "不等排期,今天就把落地页做出来", subtitle: "不用等设计排期:选模板、换文案、五分钟出成品页,还能用云托管一键发布并看转化。", btnText: "免费试用,不绑卡", btnLink: link, btn2Text: "先看看效果", btn2Link: "#cluster", bgType: "gradient", gradient: "aqua", align: "center" }
          : { badge: "🎁 邀请有礼", title: "把页面,变成你的增长引擎", subtitle: "我用 WebsFlow 一个人做出投放落地页、看转化数据、跑 A/B 测试。通过我的邀请链接注册,你也能立刻开始。", btnText: "通过邀请链接免费开始", btnLink: link, btn2Text: "先看看效果", btn2Link: "#cluster", bgType: "gradient", gradient: "indigo", align: "center" }, { padding: "loose" }),
        mk("proof", { cols: "3", items: [{ value: "43", label: "成品模块" }, { value: "5", suffix: "分钟", label: "出第一个落地页" }, { value: "A/B", label: "自带显著性检验" }], note: "注册即可体验免费版" }),
        mk("cluster", { title: "做投放,最怕这三件事", subtitle: "也正好是它最擅长的", cols: "3", items: [
          { icon: "⏱", title: "出页太慢", desc: "外包排期按周算,活动明天就要上线。选模板换文案,五分钟出成品页。" },
          { icon: "📉", title: "不知道哪版好", desc: "改了一版没数据对照。内置曝光/点击与显著性检验,一眼看出赢家。" },
          { icon: "🧩", title: "素材散落各处", desc: "导出的单文件 HTML 随手就能挂到任意空间,还能用云托管一键发布。" },
        ] }),
        mk("journey", { title: "三步开始", align: "center", items: [
          { title: "注册并进编辑器", desc: "浏览器打开即用,无需安装" },
          { title: "选场景模板", desc: "官网 / H5 / PPT / 互动故事" },
          { title: "发布并投放", desc: "一键托管出独立链接,自带转化看板" },
        ] }),
        mk("testimonials", { title: "他们已经在用", cols: "3", items: [
          { quote: "以前的落地页要排期两周,现在我半小时就能改三版做测试。", name: "Ken", role: "投放操盘手" },
          { quote: "转化数据直接回来看板,哪版赢一眼就知道。", name: "小满", role: "增长负责人" },
          { quote: "导出的单文件 HTML 直接挂到我自己的空间,零依赖。", name: "Alex", role: "独立开发者" },
        ] }),
        mk("faq", { title: "你可能想问", items: [
          { q: "需要会写代码吗?", a: "不需要。全程可视化编辑,导出的是零依赖单文件。" },
          { q: "免费版有什么限制?", a: "免费版可创建 3 个云端项目、发布 1 个页面、每日 20 次 AI 生成;专业版解锁更多额度并去除托管角标。" },
          { q: "通过你的链接注册有区别吗?", a: "同样免费,但能让邀请人获得一点返佣支持,算是请我喝杯咖啡 🙌" },
        ] }),
        mk("cta", useB
          ? { title: "免费试用,不绑卡", subtitle: "通过我的邀请链接注册,直接开始", btnText: "免费试用,不绑卡", btnLink: link, style: "gradient" }
          : { title: "现在就做你的第一个落地页", subtitle: "通过我的邀请链接注册,直接开始", btnText: "立即免费开始", btnLink: link, style: "gradient" }),
        mk("footer", { brand: "WebsFlow 魔块", desc: "AI 时代的落地页工场", links: [{ label: "产品介绍", url: "/webflow/" }], copyright: "© 2026 WebsFlow" }),
      ];
      const name = (me.code || "ref") + " 邀请页";
      const created = await WF.apiCreateProject(name, "site", {
        theme: { preset: "indigo", fontScale: 1 },
        global: { title: "把页面,变成你的增长引擎", description: "通过邀请链接注册 WebsFlow,五分钟做投放落地页", brand: "WebsFlow 魔块" },
        blocks, pages: [{ id: "main", name: "首页", slug: "", blocks }],
      }, "邀请落地页");
      const pub = await WF.apiRequest("/projects/" + created.id + "/publish", { method: "POST" });
      const url = location.origin + "/webflow/p/" + pub.token;
      const qr = "https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=" + encodeURIComponent(url);
      if (box) box.innerHTML = `
        <div style="display:flex;gap:12px;align-items:flex-start;margin-top:8px">
          <img src="${qr}" alt="QR" style="width:130px;height:130px;border:1px solid var(--ed-border);border-radius:10px">
          <div style="flex:1;min-width:0">
            <div class="cs-side__hint" style="margin:0 0 6px">${esc(t("csRefPageDone"))}</div>
            <input class="ed-input" value="${esc(url)}" readonly onclick="this.select()" style="margin-bottom:6px">
            <button class="ed-btn is-primary" data-cs-act="ref-page-copy" data-url="${esc(url)}">${esc(t("copyLink"))}</button>
          </div>
        </div>`;
      WF.toast(t("csRefPageDone"), "success");
    } catch (e) {
      if (box) box.innerHTML = `<div class="cs-side__hint">${esc(e.message)}</div>`;
    }
  }

  async function payoutRequest() {
    const i = $("#payoutAmt");
    const amt = Number((i || {}).value);
    if (!amt || amt < 10) return WF.toast(t("csPayoutMin"), "error");
    const ok = await confirmDialog(t("csPayoutConfirm", { amount: amt.toFixed(2) }), { title: t("csPayoutAsk"), danger: false });
    if (!ok) return;
    try {
      const r = await WF.apiPayoutRequest(amt, "manual", "");
      WF.toast(r.message, "success");
      loadReferral();
    } catch (e) {
      WF.toast(e.message, "error");
    }
  }

  async function payoutReview(id, action) {
    try {
      await WF.apiPayoutReview(id, action);
      WF.toast(t("csPayoutDone"), "success");
      loadReferral();
    } catch (e) {
      WF.toast(e.message, "error");
    }
  }

  async function copyRefLink() {
    const i = $("#refLink");
    if (!i) return;
    try { await navigator.clipboard.writeText(i.value); WF.toast(t("copied"), "success"); } catch (e) { i.select(); document.execCommand("copy"); WF.toast(t("copied"), "success"); }
  }

  async function claimRef() {
    const i = $("#refClaim");
    if (!i || !i.value.trim()) return WF.toast(t("csRefClaimPh"), "error");
    try {
      const r = await WF.apiReferralClaim(i.value.trim());
      WF.toast(r.message, "success");
      loadReferral();
    } catch (e) {
      WF.toast(e.message, "error");
    }
  }

  async function buyOnline(productId, kind, name) {
    try {
      const r = await WF.apiBillingCheckout(productId, kind);
      window.open(r.pay_url, "_blank");
      WF.toast(t("csPayOpened", { name: name || "" }), "success");
      pollOrder(r.order_no, 0);
      route();
    } catch (e) {
      WF.toast(e.message, "error");
    }
  }

  async function checkOrder(orderNo) {
    try {
      const r = await WF.apiBillingOrderStatus(orderNo);
      if (r.status === "paid") {
        WF.toast(t("csPayPaid"), "success");
        route();
      } else {
        WF.toast(t("csPayNotYet"));
      }
    } catch (e) {
      WF.toast(e.message, "error");
    }
  }

  // 轮询订单(最多 10 分钟),到账即刷新
  function pollOrder(orderNo, n) {
    if (n > 100) return;
    setTimeout(async () => {
      try {
        const r = await WF.apiBillingOrderStatus(orderNo);
        if (r.status === "paid") {
          WF.toast(t("csPayPaid"), "success");
          if (location.hash.indexOf("#/console") === 0) route();
          return;
        }
      } catch (e) {}
      pollOrder(orderNo, n + 1);
    }, 6000);
  }

  async function redeemCode() {
    const inp = $("#redeemCode");
    if (!inp || !inp.value.trim()) return WF.toast(t("csRedeemPh"), "error");
    try {
      const r = await WF.apiRedeem(inp.value.trim());
      WF.toast(r.message, "success");
      loadBilling();
    } catch (e) {
      WF.toast(e.message, "error");
    }
  }

  // ============================================================
  //  动作
  // ============================================================
  function onMainClick(e) {
    const nav = e.target.closest("[data-cs-nav]");
    if (nav) { state.section = nav.dataset.csNav; return route(); }
    const el = e.target.closest("[data-cs-act]");
    if (!el) return;
    const act = el.dataset.csAct;
    if (act === "new-page") { location.hash = "#/"; setTimeout(() => { const n = $('[data-act="new-project"]'); if (n) n.click(); }, 60); return; }
    if (act === "go-hub") { location.hash = "#/"; return; }
    if (act === "reload") return route();
    if (act === "sync-cloud") return doSync();
    if (act === "edit-page") return openInEditor(el.dataset.id);
    if (act === "publish-page") return publishPage(el.dataset.id);
    if (act === "unpublish-page") return unpublishPage(el.dataset.id);
    if (act === "open-page") return window.open("/webflow/p/" + el.dataset.token, "_blank");
    if (act === "share-page") return sharePage(el.dataset.id);
    if (act === "tpl-from-page") return saveAsTemplate(el.dataset.id, el.dataset.name, el.dataset.mode);
    if (act === "use-template") return useTemplate(el.dataset.id);
    if (act === "buy-template") return buyTemplate(el.dataset.id, el.dataset.price);
    if (act === "tpl-approve") return reviewTemplate(el.dataset.id, "approved");
    if (act === "tpl-reject") return reviewTemplate(el.dataset.id, "rejected");
    if (act === "tpl-feature") return reviewTemplate(el.dataset.id, "approved", el.dataset.featured === "1" ? 0 : 1);
    if (act === "buy-plugin") return buyPlugin(el.dataset.id, el.dataset.price);
    if (act === "plugin-approve") return reviewPlugin(el.dataset.id, "approved");
    if (act === "plugin-reject") return reviewPlugin(el.dataset.id, "rejected");
    if (act === "plugin-submit") return submitPlugin();
    if (act === "del-plugin") return deletePlugin(el.dataset.id, el.dataset.name);
    if (act === "task-approve") return reviewTask(el.dataset.id, "approved");
    if (act === "task-reject") return reviewTask(el.dataset.id, "rejected");
    if (act === "task-feature") return reviewTask(el.dataset.id, "approved", el.dataset.featured === "1" ? 0 : 1);
    if (act === "del-task") return deleteTask(el.dataset.id, el.dataset.name);
    if (act === "pay-buy") return buyOnline(el.dataset.id, el.dataset.kind, el.dataset.name);
    if (act === "ref-copy") return copyRefLink();
    if (act === "ref-claim") return claimRef();
    if (act === "payout-request") return payoutRequest();
    if (act === "ref-verify") return submitVerify();
    if (act === "settle-download") return downloadSettlement(el.dataset.period);
    if (act === "make-ref-page") return makeRefPage();
    if (act === "make-ref-ab") return makeRefPageAB();
    if (act === "refab-compare") return compareRefAB(el.dataset.exp);
    if (act === "ref-set-default") return setRefDefaultVariant(el.dataset.exp, el.dataset.variant);
    if (act === "lark-save") return saveLark();
    if (act === "settle-mail") return mailSettlement(el.dataset.period);
    if (act === "mail-test") return mailTest();
    if (act === "attr-by") { state.attrBy = el.dataset.by; loadAttribution(); return; }
    if (act === "reconcile-run") return runReconcile();
    if (act === "ref-page-copy") {
      navigator.clipboard.writeText(el.dataset.url || "").then(() => WF.toast(t("copied"), "success")).catch(() => {});
      return;
    }
    if (act === "payout-review") return payoutReview(el.dataset.id, el.dataset.action);
    if (act === "pay-check") return checkOrder(el.dataset.no);
    if (act === "sched-create") return createScheduled();
    if (act === "sched-run") return runScheduledNow(el.dataset.id);
    if (act === "sched-toggle") return toggleScheduled(el.dataset.id, el.dataset.enabled === "1" ? 0 : 1);
    if (act === "sched-del") return deleteScheduled(el.dataset.id);
    if (act === "del-template") return deleteTemplate(el.dataset.id, el.dataset.name);
    if (act === "del-page") return deletePage(el.dataset.id, el.dataset.name);
    if (act === "use-block") return useBlockType(el.dataset.type);
    if (act === "use-community") return useCommunityBlock(el.dataset.id);
    if (act === "save-profile") return saveProfile();
    if (act === "reload-billing" || act === "redeem-code") return act === "redeem-code" ? redeemCode() : loadBilling();
    if (act === "toggle-notify") return toggleNotify();
    if (act === "tpl-fav") return toggleTplFav(el.dataset.id);
    if (act === "tpl-fav-only") return toggleFavOnly();
    if (act === "logout") return doLogout();
    if (act === "clear-local") return clearLocal();
  }

  async function doSync() {
    try {
      WF.toast(t("syncing"));
      const ids = await WF.apiSyncToCloud();
      WF.toast(t("syncedN", { n: ids.length }), "success");
      route();
    } catch (e) {
      WF.toast(t("syncFail", { msg: e.message }), "error");
    }
  }

  async function openInEditor(id) {
    try {
      const p = await WF.apiGetProject(id);
      const local = WF.importProject({
        name: p.name,
        mode: p.mode,
        theme: p.data && p.data.theme,
        global: p.data && p.data.global,
        blocks: p.data && p.data.blocks,
      });
      location.hash = "#/p/" + local.id;
    } catch (e) {
      WF.toast(t("importFail", { msg: e.message }), "error");
    }
  }

  async function publishPage(id) {
    try {
      const data = await WF.apiRequest(`/projects/${id}/publish`, { method: "POST" });
      const url = location.origin + (data.url || ("/webflow/p/" + data.token));
      const ok = await confirmDialog(t("csPublishReady") + "\n" + url, { title: t("csPublish"), danger: false, okText: t("copyLink") });
      if (ok) {
        try { await navigator.clipboard.writeText(url); WF.toast(t("copied"), "success"); } catch (e) { WF.toast(url); }
      }
      route();
    } catch (e) {
      WF.toast(e.message, "error");
    }
  }

  async function unpublishPage(id) {
    const ok = await confirmDialog(t("csConfirmUnpublish"), { title: t("csUnpublish") });
    if (!ok) return;
    try {
      await WF.apiRequest(`/projects/${id}/unpublish`, { method: "POST" });
      WF.toast(t("csUnpublishedOk"), "success");
      route();
    } catch (e) {
      WF.toast(e.message, "error");
    }
  }

  // ---------- 云端模板 ----------
  async function saveAsTemplate(id, name, mode) {
    try {
      const priceStr = window.prompt(t("csPricePrompt"), "0");
      if (priceStr === null) return;
      const price = Math.max(0, Math.min(9999, Number(priceStr) || 0));
      const p = await WF.apiGetProject(id);
      await WF.apiPublishTemplate(name || p.name, mode || p.mode, (p.data && p.data.global && p.data.global.description) || "", p.data || {}, price);
      WF.toast(t("csTemplatePublished"), "success");
    } catch (e) {
      WF.toast(e.message, "error");
    }
  }

  async function buyTemplate(id, price) {
    const ok = await confirmDialog(t("csBuyConfirm", { price }), { title: t("csBuy"), danger: false });
    if (!ok) return;
    try {
      const r = await WF.apiBuyTemplate(id);
      WF.toast(t("csBuyOk", { balance: (r.balance || 0).toFixed(2) }), "success");
      route();
    } catch (e) {
      WF.toast(e.message, "error");
    }
  }

  async function useTemplate(id) {
    try {
      const tpl = await WF.apiGetTemplate(id);
      const proj = WF.importProject({
        name: tpl.name,
        mode: tpl.mode,
        theme: (tpl.data && tpl.data.theme) || WF.defaultTheme(),
        global: (tpl.data && tpl.data.global) || {},
        blocks: (tpl.data && tpl.data.blocks) || [],
        pages: (tpl.data && tpl.data.pages) || null,
      });
      location.hash = "#/p/" + proj.id;
    } catch (e) {
      WF.toast(e.message, "error");
    }
  }

  async function deleteTemplate(id, name) {
    const ok = await confirmDialog(t("csConfirmDeleteTemplate", { name: name || "" }), { title: t("csDelete") });
    if (!ok) return;
    try {
      await WF.apiDeleteTemplate(id);
      WF.toast(t("csDeleted"), "success");
      route();
    } catch (e) {
      WF.toast(e.message, "error");
    }
  }

  async function reviewTemplate(id, status, featured) {
    try {
      await WF.apiReviewTemplate(id, status, !!featured);
      WF.toast(status === "approved" ? t("csApproved") : t("csRejectedMsg"), "success");
      route();
    } catch (e) {
      WF.toast(e.message, "error");
    }
  }

  async function buyPlugin(id, price) {
    const ok = await confirmDialog(t("csBuyConfirm", { price }), { title: t("csBuy"), danger: false });
    if (!ok) return;
    try {
      const r = await WF.apiBuyPlugin(id);
      WF.toast(t("csBuyOk", { balance: (r.balance || 0).toFixed(2) }), "success");
      route();
    } catch (e) {
      WF.toast(e.message, "error");
    }
  }

  async function reviewPlugin(id, status) {
    try {
      await WF.apiReviewPlugin(id, status);
      WF.toast(status === "approved" ? t("csApproved") : t("csRejectedMsg"), "success");
      route();
    } catch (e) {
      WF.toast(e.message, "error");
    }
  }

  async function deletePlugin(id, name) {
    const ok = await confirmDialog(t("csConfirmDeleteTemplate", { name: name || "" }), { title: t("csDelete") });
    if (!ok) return;
    try {
      await WF.apiDeletePlugin(id);
      WF.toast(t("csDeleted"), "success");
      route();
    } catch (e) {
      WF.toast(e.message, "error");
    }
  }

  async function submitPlugin() {
    const g = (id) => (($("#" + id) || {}).value || "").trim();
    const name = g("plName"), type = g("plType"), desc = g("plDesc"), tplHtml = g("plTpl");
    const price = Math.max(0, Math.min(9999, Number(g("plPrice")) || 0));
    if (!name || !type || !tplHtml) return WF.toast(t("csPluginNeed"), "error");
    // "key:标签" 每行一个字段
    const fields = g("plFields").split("\n").map((line) => {
      const [k, label] = line.split(":").map((x) => (x || "").trim());
      return k ? { key: k, label: label || k, type: "text" } : null;
    }).filter(Boolean);
    if (!fields.length) return WF.toast(t("csPluginNeed"), "error");
    try {
      await WF.apiCreatePlugin({ name, block_type: type, description: desc, fields, template: tplHtml, price });
      WF.toast(t("csPluginSubmitted"), "success");
      route();
    } catch (e) {
      WF.toast(e.message, "error");
    }
  }

  async function reviewTask(id, status, featured) {
    try {
      await WF.apiReviewTask(id, status, !!featured);
      WF.toast(status === "approved" ? t("csApproved") : t("csRejectedMsg"), "success");
      route();
    } catch (e) {
      WF.toast(e.message, "error");
    }
  }

  async function deleteTask(id, name) {
    const ok = await confirmDialog(t("csConfirmDeleteTemplate", { name: name || "" }), { title: t("csDelete") });
    if (!ok) return;
    try {
      await WF.apiDeleteTask(id);
      WF.toast(t("csDeleted"), "success");
      route();
    } catch (e) {
      WF.toast(e.message, "error");
    }
  }

  async function loadTaskLibrary() {
    const me = WF.apiGetStoredUser() || {};
    const tasks = await WF.apiGetTasks();
    const main = $("#csMain");
    main.innerHTML = head("csTasks", "csTasksSub", `<button class="ed-btn" data-cs-nav="plugins">🧩 ${esc(t("csPlugins"))}</button>`) + `
      <div class="cs-card" style="padding:0;overflow:hidden">
        <div class="cs-tbl-wrap" data-cs-table style="border:none">
          <table class="cs-tbl">
            <thead><tr>
              <th>${esc(t("csColName"))}</th><th>${esc(t("csColAuthor"))}</th>
              <th>${esc(t("csUses"))}</th><th>${esc(t("csColStatus"))}</th><th>${esc(t("csActions"))}</th>
            </tr></thead>
            <tbody>
              ${tasks.map((tk) => `<tr>
                <td class="cs-tbl__name">${esc(tk.name)}${tk.featured ? " ⭐" : ""}<div class="cs-side__hint" style="margin:2px 0 0">${esc(String(tk.prompt || "").slice(0, 70))}</div></td>
                <td class="cs-tbl__mono">${esc(tk.author || "")}${tk.mine ? " (" + esc(t("csMine")) + ")" : ""}</td>
                <td class="cs-tbl__mono">${tk.uses || 0}</td>
                <td>${tk.status === "approved" ? `<span class="cs-badge cs-badge--ok">${esc(t("csOnline"))}</span>` : tk.status === "rejected" ? `<span class="cs-badge cs-badge--muted">${esc(t("csRejected"))}</span>` : `<span class="cs-badge cs-badge--warn">${esc(t("csPending"))}</span>`}</td>
                <td><div class="cs-tbl__actions">
                  ${me.is_admin ? `<button class="ed-btn" data-cs-act="task-approve" data-id="${esc(tk.id)}">${esc(t("csApprove"))}</button>
                     <button class="ed-btn" data-cs-act="task-reject" data-id="${esc(tk.id)}">${esc(t("csReject"))}</button>
                     <button class="ed-btn" data-cs-act="task-feature" data-id="${esc(tk.id)}" data-featured="${tk.featured ? 1 : 0}">${tk.featured ? "⭐" : "☆"}</button>` : ""}
                  ${tk.mine ? `<button class="ed-btn is-danger" data-cs-act="del-task" data-id="${esc(tk.id)}" data-name="${esc(tk.name)}">${esc(t("csDelete"))}</button>` : ""}
                </div></td>
              </tr>`).join("")}
            </tbody>
          </table>
        </div>
      </div>
      <div class="cs-panels" style="margin-top:16px">
        <div class="cs-card">
          <div class="cs-card__head"><div class="cs-card__title">⏰ ${esc(t("csSched"))}</div></div>
          <div id="schedBox"><div class="cs-side__hint">⏳</div></div>
        </div>
        <div class="cs-card">
          <div class="cs-card__head"><div class="cs-card__title">+ ${esc(t("csSchedNew"))}</div></div>
          <div class="cs-side__hint" style="margin-bottom:10px">${esc(t("csSchedHint"))}</div>
          <div class="field"><label class="ed-label">${esc(t("csSchedName"))}</label><input class="ed-input" id="schName" placeholder="${esc(t("csSchedNamePh"))}"></div>
          <div class="field"><label class="ed-label">${esc(t("csSchedProject"))}</label><select class="ed-select" id="schProject"></select></div>
          <button class="ed-btn is-primary" data-cs-act="sched-create">${esc(t("csSchedCreate"))}</button>
        </div>
      </div>`;
    main.onclick = onMainClick;
    const wrap = $("[data-cs-table]", main);
    if (wrap) enhanceTable(wrap);
    loadScheduled();
  }

  // ---------- 定时巡检 ----------
  async function loadScheduled() {
    const box = $("#schedBox");
    if (box) {
      try {
        const list = await WF.apiGetScheduled();
        box.innerHTML = list.length ? list.map((t) => `
          <div class="copilot__run" style="margin-bottom:8px">
            <div class="copilot__run-main">
              <span class="copilot__run-name">${esc(t.name)} ${t.enabled ? "" : "(" + esc(t("csSchedPaused")) + ")"}</span>
              <span class="copilot__run-meta">${t.last_run_at ? esc(String(t.last_run_at).slice(0, 16)) : esc(t("csSchedNever"))}</span>
            </div>
            <button class="ed-btn" data-cs-act="sched-run" data-id="${esc(t.id)}">${esc(t("csSchedRunNow"))}</button>
            <button class="ed-btn" data-cs-act="sched-toggle" data-id="${esc(t.id)}" data-enabled="${t.enabled ? 1 : 0}">${t.enabled ? esc(t("csSchedPause")) : esc(t("csSchedResume"))}</button>
            <button class="ed-btn is-danger" data-cs-act="sched-del" data-id="${esc(t.id)}">${esc(t("csDelete"))}</button>
            ${t.last_result ? `<div class="copilot__run-delta" style="white-space:pre-wrap">${esc(String(t.last_result).slice(0, 400))}</div>` : ""}
          </div>`).join("") : `<div class="cs-empty" style="padding:20px"><div class="cs-empty__icon">⏰</div>${esc(t("csSchedEmpty"))}</div>`;
      } catch (e) {
        box.innerHTML = `<div class="cs-side__hint">${esc(e.message)}</div>`;
      }
    }
    const sel = $("#schProject");
    if (sel && sel.options.length === 0) {
      try {
        const projects = await WF.apiGetProjects();
        sel.innerHTML = projects.map((p) => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join("") || `<option value="">${esc(t("csNoProjects"))}</option>`;
      } catch (e) {}
    }
  }

  async function createScheduled() {
    const name = (($("#schName") || {}).value || "").trim() || t("csSchedNamePh");
    const projectId = ($("#schProject") || {}).value || "";
    if (!projectId) return WF.toast(t("csNoProjects"), "error");
    try {
      await WF.apiCreateScheduled(name, projectId, "");
      WF.toast(t("csSchedCreated"), "success");
      route();
    } catch (e) {
      WF.toast(e.message, "error");
    }
  }

  async function runScheduledNow(id) {
    WF.toast(t("csSchedRunning"));
    try {
      await WF.apiRunScheduled(id);
      WF.toast(t("csSchedRan"), "success");
      route();
    } catch (e) {
      WF.toast(e.message, "error");
    }
  }

  async function toggleScheduled(id, enabled) {
    try {
      await WF.apiToggleScheduled(id, !!enabled);
      WF.toast(enabled ? t("csSchedResumed") : t("csSchedPausedOk"), "success");
      route();
    } catch (e) {
      WF.toast(e.message, "error");
    }
  }

  async function deleteScheduled(id) {
    const ok = await confirmDialog(t("csSchedDeleteConfirm"), { title: t("csDelete") });
    if (!ok) return;
    try {
      await WF.apiDeleteScheduled(id);
      WF.toast(t("csDeleted"), "success");
      route();
    } catch (e) {
      WF.toast(e.message, "error");
    }
  }

  async function loadPlugins() {
    const me = WF.apiGetStoredUser() || {};
    const plugins = await WF.apiGetPlugins();
    const main = $("#csMain");
    const statusBadge = (s) => s === "approved" ? `<span class="cs-badge cs-badge--ok">${esc(t("csOnline"))}</span>`
      : s === "rejected" ? `<span class="cs-badge cs-badge--muted">${esc(t("csRejected"))}</span>`
      : `<span class="cs-badge cs-badge--warn">${esc(t("csPending"))}</span>`;
    main.innerHTML = head("csPlugins", "csPluginsSub", `<button class="ed-btn" data-cs-nav="templates">🌐 ${esc(t("csTemplates"))}</button>`) + `
      <div class="cs-panels">
        <div class="cs-card">
          <div class="cs-card__head"><div class="cs-card__title">🧩 ${esc(t("csPluginMarket"))}</div><span class="cs-badge cs-badge--accent">${plugins.length}</span></div>
          ${plugins.length ? `<div class="cs-tbl-wrap" data-cs-table style="border:none">
            <table class="cs-tbl">
              <thead><tr><th>${esc(t("csColBlock"))}</th><th>${esc(t("csColType"))}</th><th>${esc(t("csPrice"))}</th><th>${esc(t("csUses"))}</th><th>${esc(t("csColStatus"))}</th><th>${esc(t("csActions"))}</th></tr></thead>
              <tbody>
                ${plugins.map((pl) => `<tr>
                  <td class="cs-tbl__name">${esc(pl.name)}<div class="cs-side__hint" style="margin:2px 0 0">${esc(pl.description || "")}</div></td>
                  <td class="cs-tbl__mono">${esc(pl.block_type)}</td>
                  <td>${pl.price > 0 ? `¥${pl.price}` : `<span class="cs-badge cs-badge--muted">${esc(t("csFreeTpl"))}</span>`}</td>
                  <td class="cs-tbl__mono">${pl.uses || 0}</td>
                  <td>${statusBadge(pl.status)}${pl.mine ? ` <span class="cs-badge cs-badge--accent">${esc(t("csMine"))}</span>` : ""}</td>
                  <td><div class="cs-tbl__actions">
                    ${pl.price > 0 && !pl.mine && !pl.locked ? "" : ""}
                    ${pl.locked ? `<button class="ed-btn is-primary" data-cs-act="buy-plugin" data-id="${esc(pl.id)}" data-price="${pl.price}">💰 ${esc(t("csBuy"))}</button>` : ""}
                    ${me.is_admin && pl.status === "pending" ? `<button class="ed-btn" data-cs-act="plugin-approve" data-id="${esc(pl.id)}">${esc(t("csApprove"))}</button><button class="ed-btn" data-cs-act="plugin-reject" data-id="${esc(pl.id)}">${esc(t("csReject"))}</button>` : ""}
                    ${pl.mine ? `<button class="ed-btn is-danger" data-cs-act="del-plugin" data-id="${esc(pl.id)}" data-name="${esc(pl.name)}">${esc(t("csDelete"))}</button>` : ""}
                  </div></td>
                </tr>`).join("")}
              </tbody>
            </table>
          </div>` : `<div class="cs-empty"><div class="cs-empty__icon">🧩</div>${esc(t("csNoPlugins"))}</div>`}
        </div>
        <div class="cs-card">
          <div class="cs-card__head"><div class="cs-card__title">📤 ${esc(t("csPluginRegister"))}</div></div>
          <div class="cs-side__hint" style="margin-bottom:10px">${esc(t("csPluginRegisterHint"))}</div>
          <div class="field"><label class="ed-label">${esc(t("csColBlock"))}</label><input class="ed-input" id="plName" placeholder="限时优惠条"></div>
          <div class="field"><label class="ed-label">${esc(t("csColType"))} (block_type)</label><input class="ed-input" id="plType" placeholder="promo-bar"></div>
          <div class="field"><label class="ed-label">${esc(t("csPluginFields"))}</label><textarea class="ed-textarea" rows="3" id="plFields" placeholder="text:促销文案&#10;code:优惠码&#10;note:小字说明"></textarea></div>
          <div class="field"><label class="ed-label">HTML ${esc(t("csPluginTemplate"))}</label><textarea class="ed-textarea" rows="4" id="plTpl" placeholder="&lt;div&gt;{{text}} / {{code}}&lt;/div&gt;"></textarea>
            <div class="cs-side__hint">${esc(t("csPluginTplHint"))}</div></div>
          <div class="field"><label class="ed-label">${esc(t("csPrice"))}</label><input class="ed-input" id="plPrice" type="number" value="0"></div>
          <button class="ed-btn is-primary" data-cs-act="plugin-submit">${esc(t("csPluginSubmit"))}</button>
        </div>
      </div>`;
    main.onclick = onMainClick;
    const wrap = $("[data-cs-table]", main);
    if (wrap) enhanceTable(wrap);
  }

  async function loadTemplates() {
    let templates = await WF.apiGetTemplates();
    const me = WF.apiGetStoredUser() || {};
    const myFavs = favs();
    if (state.tplFavOnly) templates = templates.filter((tp) => myFavs.includes(tp.id));
    const main = $("#csMain");
    main.innerHTML = head("csTemplates", "csTemplatesSub", `
        <button class="ed-btn ${state.tplFavOnly ? "is-primary" : ""}" data-cs-act="tpl-fav-only">⭐ ${esc(t("csFavOnly"))} (${myFavs.length})</button>
        <button class="ed-btn" data-cs-nav="pages">🧱 ${esc(t("csPages"))}</button>`) + `
      <div class="cs-card" style="padding:0;overflow:hidden">
        <div class="cs-tbl-wrap" data-cs-table style="border:none">
          <table class="cs-tbl">
            <thead><tr>
              <th>${esc(t("csColName"))}</th><th>${esc(t("csColMode"))}</th>
              <th>${esc(t("csColAuthor"))}</th><th>${esc(t("csPrice"))}</th><th>⬇</th><th>${esc(t("csActions"))}</th>
            </tr></thead>
            <tbody>
              ${templates.map((tp) => {
                const m = WF.Modes[tp.mode] || WF.Modes.site;
                const mine = tp.user_id === me.id;
                return `<tr>
                  <td class="cs-tbl__name">${esc(tp.name)}<div class="cs-side__hint" style="margin:2px 0 0">${esc(tp.description || "")}</div></td>
                  <td><span class="cs-badge cs-badge--accent">${m.icon} ${m.name}</span></td>
                  <td class="cs-tbl__mono">${esc(tp.author || "")}${mine ? " (我)" : ""}</td>
                  <td>${tp.status === "pending" ? `<span class="cs-badge cs-badge--warn">${esc(t("csPending"))}</span> ` : tp.status === "rejected" ? `<span class="cs-badge cs-badge--muted">${esc(t("csRejected"))}</span> ` : ""}${tp.featured ? `⭐ ` : ""}${(tp.price || 0) > 0
                    ? (tp.purchased ? `<span class="cs-badge cs-badge--ok">¥${tp.price} ${esc(t("csPurchased"))}</span>` : `<span class="cs-badge cs-badge--warn">¥${tp.price}</span>`)
                    : `<span class="cs-badge cs-badge--muted">${esc(t("csFreeTpl"))}</span>`}</td>
                  <td class="cs-tbl__mono">${tp.downloads || 0}</td>
                  <td><div class="cs-tbl__actions">
                    ${(tp.price || 0) > 0 && !tp.purchased && !mine
                      ? `<button class="ed-btn is-primary" data-cs-act="buy-template" data-id="${esc(tp.id)}" data-price="${tp.price}">💰 ${esc(t("csBuy"))}</button>`
                      : `<button class="ed-btn is-primary" data-cs-act="use-template" data-id="${esc(tp.id)}">${esc(t("csUse"))}</button>`}
                    <button class="ed-btn" data-cs-act="tpl-fav" data-id="${esc(tp.id)}">${myFavs.includes(tp.id) ? "⭐" : "☆"}</button>
                    ${me.is_admin ? `<button class="ed-btn" data-cs-act="tpl-approve" data-id="${esc(tp.id)}">${esc(t("csApprove"))}</button>
                       <button class="ed-btn" data-cs-act="tpl-reject" data-id="${esc(tp.id)}">${esc(t("csReject"))}</button>
                       <button class="ed-btn" data-cs-act="tpl-feature" data-id="${esc(tp.id)}" data-featured="${tp.featured ? 1 : 0}">${tp.featured ? "⭐" : "☆"}</button>` : ""}
                    ${mine ? `<button class="ed-btn is-danger" data-cs-act="del-template" data-id="${esc(tp.id)}" data-name="${esc(tp.name)}">${esc(t("csDelete"))}</button>` : ""}
                  </div></td>
                </tr>`;
              }).join("")}
            </tbody>
          </table>
        </div>
      </div>
      ${templates.length ? "" : `<div class="cs-empty"><div class="cs-empty__icon">🌐</div>${esc(t("csNoTemplates"))}</div>`}`;
    main.onclick = onMainClick;
    const wrap = $("[data-cs-table]", main);
    if (wrap) enhanceTable(wrap);
  }

  async function sharePage(id) {
    try {
      await WF.apiSetProjectPublic(id, true);
      const full = await WF.apiGetProject(id);
      const url = location.origin + location.pathname.replace(/[^/]*$/, "") + "share.html?t=" + (full.share_token || id);
      const ok = await confirmDialog(t("csShareReady") + "\n" + url, { title: t("csShareTitle"), danger: false, okText: t("copyLink") });
      if (ok) {
        try { await navigator.clipboard.writeText(url); WF.toast(t("copied"), "success"); } catch (e) { WF.toast(url); }
      }
      route();
    } catch (e) {
      WF.toast(e.message, "error");
    }
  }

  async function deletePage(id, name) {
    const ok = await confirmDialog(t("csConfirmDeletePage", { name: name || id }), { title: t("csDelete") });
    if (!ok) return;
    try {
      await WF.apiDeleteProject(id);
      WF.toast(t("csDeleted"), "success");
      route();
    } catch (e) {
      WF.toast(e.message, "error");
    }
  }

  function useBlockType(type) {
    const p = WF.createProject(WF.tBlock(type) + " · " + new Date().toLocaleDateString("zh-CN"), "site", "blank");
    p.blocks = [WF.newBlock(type)];
    WF.getProject(p.id).blocks = p.blocks;
    WF.toast(t("blockAdded", { name: WF.tBlock(type) }), "success");
    location.hash = "#/p/" + p.id;
  }

  function useCommunityBlock(id) {
    const cb = WF.getCommunityBlocks().find((b) => b.id === id);
    if (!cb) return;
    const block = WF.useCommunityBlock(cb);
    if (!block) return;
    const p = WF.createProject(cb.name, WF.Modes.site.key, "blank");
    p.blocks = [block];
    WF.toast(t("blockAdded", { name: cb.name }), "success");
    location.hash = "#/p/" + p.id;
  }

  async function saveProfile() {
    try {
      await WF.apiUpdateUser({
        display_name: ($("#csName") || {}).value || "",
        avatar: ($("#csAvatar") || {}).value || "",
      });
      WF.toast(t("csSaved"), "success");
      route();
    } catch (e) {
      WF.toast(e.message, "error");
    }
  }

  function doLogout() {
    WF.apiLogout();
    if (WF.collab) WF.collab.stop();
    location.hash = "#/";
    WF.toast(t("signedOut"), "success");
  }

  async function clearLocal() {
    const ok = await confirmDialog(t("csConfirmClear"), { title: t("csClearLocal") });
    if (!ok) return;
    try { localStorage.removeItem("websflow.v1"); } catch (e) {}
    WF.toast(t("csLocalCleared"), "success");
    location.reload();
  }

  WF.console = { render, go: render };
})(window.WF);
