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
    ["produce", "🏭", "csProduce"],
    ["cases", "🏷", "csCases"],
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
    const fromHash = (location.hash.match(/^#\/console\/([a-z-]+)/) || [])[1];
    if (!section && fromHash) section = fromHash;
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
    if (state.rtSource) { try { state.rtSource.close(); } catch (e) {} state.rtSource = null; }
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
      produce: [["csSideHint", "csProduceSub"]],
      cases: [["csSideHint", "csCasesHint"]],
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
    } else if (s === "conversion") {
      html += `<div class="cs-side__group">
        <button class="cs-side-item" data-cs-act="goal-new">🎯 ${esc(t("csGoalNew"))}</button>
        <button class="cs-side-item" data-cs-act="jump" data-to="audience">🪪 ${esc(t("csIdentityTitle"))}</button>
        <button class="cs-side-item" data-cs-act="jump" data-to="settings">🔌 ${esc(t("csPlatform"))}</button>
      </div>`;
      html += `<div class="cs-side__group"><div class="cs-side__sub">${esc(t("csFilterMode"))}</div>
        <select class="ed-select" data-cs-filter="mode"><option value="">${esc(t("csAllModes"))}</option>${Object.values(WF.Modes).map((m) => `<option value="${m.key}">${m.icon} ${m.name}</option>`).join("")}</select></div>`;
      html += `<div class="cs-side__group"><div class="cs-side__sub">${esc(t("csFilterProject"))}</div>
        <select class="ed-select" data-cs-filter="project"><option value="">${esc(t("csAllProjects"))}</option></select></div>`;
    } else if (s === "pages") {
      html += `<div class="cs-side__group">
        <input class="ed-input" id="pageSearch" placeholder="${esc(t("csSearchPagesPh"))}" value="${esc(state.pageQ || "")}">
        <label class="cs-side__hint" style="display:flex;gap:6px;align-items:center;margin-top:8px;cursor:pointer">
          <input type="checkbox" id="pageOnlyReal" ${state.pageReal !== false ? "checked" : ""}> ${esc(t("csOnlyReal"))}</label>
      </div>`;
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
    const ps = $("#pageSearch");
    if (ps) ps.oninput = () => { state.pageQ = ps.value.trim(); if (state._pt) clearTimeout(state._pt); state._pt = setTimeout(() => loadPages(), 250); };
    const pr = $("#pageOnlyReal");
    if (pr) pr.onchange = () => { state.pageReal = pr.checked; loadPages(); };
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
    main.innerHTML = `<div class="cs-card"><div class="cs-skeleton"></div><div class="cs-skeleton"></div><div class="cs-skeleton"></div></div>`;
    try {
      if (s === "overview") return await loadOverview();
      if (s === "pages") return await loadPages();
      if (s === "conversion") return await loadConversion();
      if (s === "audience") return await loadAudience();
      if (s === "produce") return await loadProduce();
      if (s === "cases") return await loadCases();
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

  async function showUpgrade(payload) {
    const u = (payload && payload.upgrade) || {};
    const lines = (u.compare || []).map((c) => `${c.feature}  ${c.free} → ${c.pro}`).join("\n");
    const yearly = u.yearly && u.yearly.id;
    const ok = await confirmDialog((u.copy || (payload && payload.error) || t("csUpgradeCopy")) + "\n\n" + lines, {
      title: t("csUpgradeTitle"), danger: false, okText: yearly ? t("csUpgradeYearly") : t("csUpgradeGo"),
    });
    if (!ok) return;
    if (yearly) return buyOnline(u.yearly.id, "pro", u.yearly.name);
    state.section = "settings";
    route();
  }

  async function loadOverview() {
    const [projects, stats] = await Promise.all([WF.apiGetProjects(), WF.apiGetEventStats()]);
    let launch = null;
    try { launch = await WF.apiRequest("/metrics/launch"); } catch (e) { launch = null; }
    setTimeout(() => { renderSelfCheck().catch(() => {}); }, 60);
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
        <div class="cs-kpi"><div class="cs-kpi__label">${esc(t("csKpiTime"))}</div>
          <div class="cs-kpi__val">${launch && launch.median_minutes != null ? esc(String(launch.median_minutes)) : "–"}</div>
          <div class="cs-kpi__sub">${esc(t("csKpiTimeSub", { n: (launch && launch.target_minutes) || 10 }))}${launch && launch.weekly_published != null ? " · " + esc(t("csKpiWeekly", { n: launch.weekly_published })) : ""}</div></div>
      </div>
      <div class="cs-panels">
        <div class="cs-card">
          <div class="cs-card__head"><div class="cs-card__title">${esc(t("csTrend"))}</div>
            <span class="cs-trend-range">${[13, 30, 90].map((d) => `<button class="ed-btn is-ghost${(state.trendDays || 13) === d ? " is-active" : ""}" data-cs-act="trend-days" data-days="${d}">${d}${esc(t("csDaysUnit"))}</button>`).join("")}</span>
          </div>
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
        ${(WF.apiGetStoredUser() || {}).is_admin ? `
        <div class="cs-card">
          <div class="cs-card__head">
            <div class="cs-card__title">🧾 ${esc(t("csOps"))}</div>
            <span class="copilot__tabs">
              <button class="ed-btn" data-cs-act="reconcile-run">${esc(t("csReconcile"))}</button>
              <button class="ed-btn is-primary" data-cs-act="weekly-run">${esc(t("csWeeklyRun"))}</button>
            </span>
          </div>
          <details data-lazy="ops"><summary class="cs-side__hint" style="cursor:pointer">${esc(t("csExpandLoad"))}</summary>
            <div id="opsBox" style="margin-top:6px"><div class="cs-side__hint">–</div></div></details>
        </div>` : ""}
        <div class="cs-card">
          <div class="cs-card__head"><div class="cs-card__title">🩺 ${esc(t("csSelfCheck"))}
            <span class="cs-side__hint" id="selfFixHint"></span></div>
            <div style="display:flex;gap:6px">
              <button class="ed-btn is-primary" data-cs-act="self-fix">${esc(t("csSelfFix"))}</button>
              <button class="ed-btn" data-cs-act="self-recheck">${esc(t("csSelfRecheck"))}</button>
            </div></div>
          <div id="selfBox"><div class="cs-skeleton"></div></div>
        </div>
        <div class="cs-card">
          <div class="cs-card__head"><div class="cs-card__title">🏷 ${esc(t("csCases"))}</div><button class="ed-btn" data-cs-nav="cases">${esc(t("csViewAll"))}</button></div>
          ${((launch && launch.cases) || []).length ? (launch.cases || []).map((c) => `
            <div class="cs-rank">
              <span class="cs-rank__name" style="width:auto;flex:1">${esc(c.title)}</span>
              <span class="cs-badge cs-badge--muted">${esc(c.industry || c.mode || "")}</span>
              ${c.url ? `<a class="ed-btn" href="${esc(c.url)}" target="_blank" rel="noopener">${esc(t("csOpen"))}</a>` : ""}
            </div>`).join("") : `<div class="cs-side__hint">${esc(t("csCasesEmpty"))}</div>`}
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
    loadOps();
    runAutoOptimize();
    if (!state.optTimer) {
      state.optTimer = setInterval(() => { if (location.hash.indexOf("#/console") === 0) runAutoOptimize(); }, 5 * 60 * 1000);
    }
  }

  // ---------- 增长目标与编排(阶段三) ----------
  async function loadGoals() {
    const box = $("#goalsBox");
    if (!box) return;
    box.innerHTML = "⏳";
    try {
      const r = await WF.apiRequest("/goals");
      const goals = r.goals || [];
      if (!goals.length) { box.innerHTML = `<div class="cs-side__hint">${esc(t("csGoalEmpty"))}</div>`; return; }
      box.innerHTML = goals.map((g) => {
        const pct = g.target ? Math.min(100, Math.round((g.current / g.target) * 100)) : 0;
        const cls = g.reached ? "cs-badge--ok" : (g.status === 'expired' ? "cs-badge--warn" : "");
        return `<div class="cs-abrow" data-goal="${esc(g.id)}">
          <div class="cs-abrow__main">
            <div class="cs-abrow__name">${esc(g.name || g.metric_label)} <span class="cs-badge ${cls}">${g.status}</span>
              <span class="cs-side__hint">${g.metric_label} ${g.current}${g.unit} / 目标 ${g.target}${g.unit} · ${g.window_days}${esc(t("csGoalDays"))}</span></div>
            <div class="cs-bar" style="margin-top:4px"><span style="width:${pct}%"></span></div>
            <div class="cs-side__hint">${(g.cycles || []).slice(0, 2).map((c) => `${c.action}:${String(c.detail || '').slice(0, 40)}`).join(" | ") || esc(t("csGoalNoCycles"))}</div>
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0">
            <button class="ed-btn" data-cs-act="goal-run" data-id="${esc(g.id)}">▶</button>
            <button class="ed-btn" data-cs-act="goal-pause" data-id="${esc(g.id)}" data-on="${g.enabled ? 1 : 0}">${g.enabled ? "⏸" : "⏯"}</button>
          </div>
        </div>`;
      }).join("");
    } catch (e) { box.innerHTML = `⚠️ ${esc(e.message)}`; }
  }

  // 范式库:内置 + 伙伴提交(开放给生态)
  async function loadPatterns() {
    const box = $("#patBox");
    if (!box) return;
    try {
      const r = await WF.apiRequest("/patterns");
      const b = r.builtin || [], p2 = r.partner || [];
      box.innerHTML = `<div class="cs-side__hint">${esc(t("csPatBuiltin"))} ${b.length} · ${esc(t("csPatPartner"))} ${p2.length}</div>`
        + b.map((x) => `<div class="cs-abrow"><div class="cs-abrow__main">
            <div class="cs-abrow__name">${esc(x.name)} <span class="cs-badge cs-badge--muted">${esc(x.key)}</span></div>
            <div class="cs-side__hint">${esc(t("csPatRef"))} ${esc(x.ref)} · ${esc((x.tags || []).slice(0, 5).join("、"))}</div>
          </div></div>`).join("")
        + p2.map((x) => `<div class="cs-abrow"><div class="cs-abrow__main">
            <div class="cs-abrow__name">${esc(x.name)} <span class="cs-badge cs-badge--accent">${esc(t("csPatPartner"))}</span> <span class="cs-badge cs-badge--muted">${esc(x.block_type)}</span></div>
            <div class="cs-side__hint">${esc(x.ref || "")}</div>
          </div></div>`).join("")
        + `<details style="margin-top:8px"><summary class="cs-side__hint" style="cursor:pointer">${esc(t("csPatHow"))}</summary>
            <pre class="cs-pre">POST /webflow/api/patterns
{"pack":{"name":"保险行业范式包","author":"you@partner.com","version":"1",
 "patterns":[{"key":"trust_badges","name":"信任徽章墙","ref":"参考 Lemonade",
   "roles":["proof","logos"],"tags":["保险","信任","资质"],
   "fields":[{"key":"title","label":"标题","type":"text"}],
   "template":"<h2>{{title}}</h2>"}]}}</pre>
            <div class="cs-side__hint">${esc(t("csPatRule"))}</div></details>`;
    } catch (e) { box.innerHTML = `⚠️ ${esc(e.message)}`; }
  }

  // 今日体检:能自动解决的不让人再去别的入口配置
  async function renderSelfCheck(deep) {
    const box = $("#selfBox");
    if (!box) return;
    if (!box.dataset.first) { box.dataset.first = "1"; box.innerHTML = `<div class="cs-skeleton"></div>`; }
    const r = await WF.apiRequest("/selfcheck" + (deep ? "?deep=1&sample=4" : ""));
    const warn = (r.items || []).filter((i) => i.level === "warn");
    const ok = (r.items || []).filter((i) => i.level === "ok");
    const hint = $("#selfFixHint");
    if (hint) hint.textContent = warn.length ? t("csSelfWarns", { n: warn.length }) : t("csSelfAllOk");
    const row = (i) => `<div class="cs-abrow">
      <div class="cs-abrow__main">
        <div class="cs-abrow__name">${i.level === "ok" ? "✅" : i.level === "warn" ? "⚠️" : "ℹ️"} ${esc(i.title)}
          ${i.auto ? `<span class="cs-badge cs-badge--accent">${esc(t("csSelfAuto"))}</span>` : ""}</div>
        <div class="cs-side__hint">${esc(i.detail || "")}</div>
      </div>
      ${i.link && i.level !== "ok" ? `<button class="ed-btn" data-cs-act="goto" data-to="${esc(i.link)}">${esc(t("csSelfGo"))}</button>` : ""}
    </div>`;
    box.innerHTML = (warn.length ? warn.map(row).join("") : `<div class="cs-side__hint" style="margin-bottom:6px">${esc(t("csSelfAllOk"))}</div>`)
      + ok.map(row).join("");
  }

  async function selfFix() {
    WF.toast("🩺 " + t("csSelfFixing"), "success");
    const r = await WF.apiRequest("/selfcheck/fix", { method: "POST", body: {} });
    const done = (r.fixes || []).filter((f) => f.ok);
    WF.toast(done.length ? `✅ ${done.map((f) => f.detail).join(" / ").slice(0, 80)}` : "ℹ️ " + t("csSelfNoFix"), "success");
    await renderSelfCheck();
  }

  // 跨系统待审动作(阶段三:决策 → 其它系统能力,默认人审)
  async function loadCrossActions() {
    const box = $("#crossBox");
    if (!box) return;
    try {
      const r = await WF.apiRequest("/actions?limit=20");
      const all = r.actions || [];
      const list = all.filter((a) => a.status === "pending");
      const decided = all.filter((a) => a.status !== "pending").slice(0, 3);
      const row = (a, pending) => `<div class="cs-abrow">
        <div class="cs-abrow__main">
          <div class="cs-abrow__name">${esc(a.title)}
            <span class="cs-badge ${a.status === "executed" ? "cs-badge--ok" : (a.status === "failed" || a.status === "manual" ? "cs-badge--warn" : "")}">${esc(a.capability_id)}</span></div>
          <div class="cs-side__hint">${esc(a.reason || "")}</div>
          <div class="cs-side__hint">${esc(t("csActSystem"))}: ${esc(a.system || "-")} · ${esc(t("csActStatus"))}: ${esc(a.status)}${a.decided_at ? " · " + esc(String(a.decided_at).slice(0, 16)) : ""}${a.result ? " · " + esc(String(a.result.detail || a.result.error || "").slice(0, 60)) : ""}</div>
        </div>
        ${pending ? `<div style="display:flex;gap:6px;flex-shrink:0">
          <button class="ed-btn is-primary" data-cs-act="act-approve" data-id="${esc(a.id)}">${esc(t("csActApprove"))}</button>
          <button class="ed-btn" data-cs-act="act-reject" data-id="${esc(a.id)}">${esc(t("csActReject"))}</button>
        </div>` : ""}
      </div>`;
      box.innerHTML = list.length
        ? list.map((a) => row(a, true)).join("") + (decided.length ? `<div class="cs-side__sub" style="margin-top:8px">${esc(t("csActRecent"))}</div>` + decided.map((a) => row(a, false)).join("") : "")
        : `<div class="cs-side__hint">${esc(t("csActEmpty"))}</div>`;
    } catch (e) { box.innerHTML = `⚠️ ${esc(e.message)}`; }
  }

  async function goalAction(act, id, extra) {
    try {
      if (act === "run") await WF.apiRequest(`/goals/${id}/run`, { method: "POST" });
      if (act === "pause") await WF.apiRequest(`/goals/${id}/pause`, { method: "POST", body: JSON.stringify({ enabled: extra }) });
      if (act === "new") {
        const metric = (window.prompt(t("csGoalMetric"), "cvr") || "cvr").trim();
        const target = Number(window.prompt(t("csGoalTarget"), "12") || 0);
        const projectId = (window.prompt(t("csGoalProject"), "") || "").trim();
        if (!target) return;
        await WF.apiRequest("/goals", { method: "POST", body: JSON.stringify({ metric, target, project_id: projectId || undefined, name: metric + " ≥ " + target, window_days: 7 }) });
      }
      WF.toast(t("csGoalDone"), "success");
      loadGoals();
    } catch (e) { WF.toast(e.message, "error"); }
  }

  async function seedLaunchGoals() {
    try {
      const r = await WF.apiRequest("/goals/seed-defaults", { method: "POST", body: {} });
      WF.toast(t("csGoalSeeded", { n: r.seeded || 0 }), "success");
      loadGoals();
    } catch (e) { WF.toast(e.message, "error"); }
  }

  async function traceLookup() {
    const box = $("#traceBox");
    const id = (($("#traceQ") || {}).value || "").trim();
    if (!box || !id) return;
    box.innerHTML = "⏳";
    try {
      const r = await WF.apiRequest("/trace/" + encodeURIComponent(id));
      const icon = { event: "📊", lead: "🧲", order: "💳", api: "🔌" };
      box.innerHTML = (r.timeline || []).length ? r.timeline.slice(0, 15).map((x) => `<div class="cs-side__hint" style="display:flex;gap:8px">
        <span style="min-width:112px">${new Date(x.created_at).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
        <span style="min-width:64px">${icon[x.source] || ""} ${esc(x.source)}</span>
        <span>${esc(String(x.kind || ""))} ${x.detail ? "· " + esc(String(x.detail).slice(0, 36)) : ""}${x.value != null ? " · " + esc(String(x.value)) : ""}</span>
      </div>`).join("") : `<div class="cs-side__hint">${esc(t("csTraceEmpty"))}</div>`;
    } catch (e) { box.innerHTML = `⚠️ ${esc(e.message)}`; }
  }

  // ---------- 待审提案(人审模式) ----------
  async function renderProposals() {
    const box = $("#proposalBox");
    if (!box || !WF.apiGrowthProposals) return;
    box.innerHTML = `<div class="cs-side__hint">⏳</div>`;
    try {
      const list = (await WF.apiGrowthProposals()) || [];
      if (!list.length) { box.innerHTML = `<div class="cs-side__hint">${esc(t("csProposalEmpty"))}</div>`; return; }
      box.innerHTML = list.map((p) => {
        const ops = p.ops || [];
        const stats = p.stats_before || {};
        return `<div class="cs-proposal" data-prop="${esc(p.id)}">
          <div class="cs-proposal__head">
            <span class="cs-badge">${esc(t("gaRound"))}${p.round}</span>
            <span class="cs-badge">${esc(p.objective === "lead" ? t("gaObjLead") : t("gaObjClick"))}</span>
            ${p.theme ? `<span class="cs-badge">${esc(t("gaTheme_" + p.theme) || p.theme)}</span>` : ""}
            ${(p.categories || []).map((c) => `<span class="cs-badge">${esc(t("gaCat_" + c) || c)}</span>`).join("")}
          </div>
          <div class="cs-proposal__hyp">${esc(p.hypothesis || "")}</div>
          ${p.reason ? `<div class="cs-side__hint">${esc(String(p.reason).slice(0, 160))}</div>` : ""}
          <div class="cs-side__hint">${esc(t("csProposalData", { v: stats.views || 0, c: stats.clicks || 0, l: stats.leads || 0 }))}</div>
          ${p.preview_a && p.preview_b ? `<div class="cs-preview" data-preview="${esc(p.id)}">
            <div class="cs-preview__bar">
              <span class="cs-side__hint">${esc(t("csPreviewLabel"))}</span>
              <span class="cs-preview__modes">
                <button class="ed-btn is-ghost" data-cs-act="pv-mode" data-id="${esc(p.id)}" data-mode="desktop" data-on="1">🖥</button>
                <button class="ed-btn is-ghost" data-cs-act="pv-mode" data-id="${esc(p.id)}" data-mode="mobile" data-on="0">📱</button>
                <a class="ed-btn is-ghost" href="/webflow/p/preview/${esc(p.preview_a)}" target="_blank" rel="noopener">A↗</a>
                <a class="ed-btn is-ghost" href="/webflow/p/preview/${esc(p.preview_b)}" target="_blank" rel="noopener">B↗</a>
              </span>
            </div>
            <div class="cs-preview__frames">
              <figure><figcaption>${esc(t("csPreviewA"))}</figcaption>
                <div class="cs-preview__box is-desktop"><iframe src="/webflow/p/preview/${esc(p.preview_a)}" loading="lazy" sandbox="allow-scripts allow-same-origin"></iframe></div>
              </figure>
              <figure><figcaption>${esc(t("csPreviewB"))}</figcaption>
                <div class="cs-preview__box is-desktop"><iframe src="/webflow/p/preview/${esc(p.preview_b)}" loading="lazy" sandbox="allow-scripts allow-same-origin"></iframe></div>
              </figure>
            </div>
          </div>` : ""}
          <details style="margin-top:6px"><summary class="cs-side__hint" style="cursor:pointer">${esc(t("csProposalDiff", { n: ops.length }))}</summary>
            <div style="margin-top:6px">${ops.map((op) => `<div class="cs-diffrow">
              <span class="cs-diffrow__f">${esc(op.op === "add" ? "+ " + op.type : op.op === "remove" ? "- 模块" : op.op === "variant" ? "变体" : "")}</span>
              <span class="cs-diffrow__v">${esc(Object.keys(op.props || {}).map((k) => `${k}: ${String(op.props[k]).slice(0, 40)}`).join(" · ").slice(0, 120))}</span>
            </div>`).join("")}</div>
          </details>
          <div style="display:flex;gap:6px;margin-top:8px">
            <button class="ed-btn is-primary" data-cs-act="prop-approve" data-id="${esc(p.id)}">✅ ${esc(t("csProposalApprove"))}</button>
            <button class="ed-btn" data-cs-act="prop-reject" data-id="${esc(p.id)}">✋ ${esc(t("csProposalReject"))}</button>
          </div>
        </div>`;
      }).join("");
    } catch (e) { box.innerHTML = `<div class="cs-side__hint">⚠️ ${esc(e.message)}</div>`; }
  }

  // ---------- 经验库:哪些方向更常赢(跨项目) ----------
  async function renderGrowthLessons() {
    const box = $("#growthLessons");
    if (!box || !WF.apiGrowthLessons) return;
    try {
      const d = await WF.apiGrowthLessons();
      const cats = (d.summary.categories || []).filter((c) => c.decided > 0);
      if (!cats.length) { box.textContent = `${esc(t("csLessonsSparse", { n: d.rounds || 0 }))}`; return; }
      // 与服务端同一口径:高/低互斥,且需要足够的可判定样本
      const eligible = cats.filter((c) => c.decided >= 1);
      const top = eligible.filter((c) => c.winRate >= 0.55).slice(0, 3).map((c) => `${c.label} ${(c.winRate * 100).toFixed(0)}%(${c.wins}/${c.decided})`);
      const bad = eligible.filter((c) => c.winRate <= 0.45).slice(0, 3).map((c) => `${c.label} ${(c.winRate * 100).toFixed(0)}%`);
      if (!top.length && !bad.length) { box.textContent = `🧠 ${esc(t("csLessonsSparse", { n: d.rounds || 0 }))}`; return; }
      box.innerHTML = `🧠 ${top.length ? esc(t("csLessonsTop")) + ":" + esc(top.join(" · ")) : ""}${top.length && bad.length ? " · " : ""}${bad.length ? esc(t("csLessonsAvoid")) + ":" + esc(bad.join(" · ")) : ""}`;
    } catch (e) { box.textContent = ""; }
  }

  // ---------- 增长 Agent(自主跑轮)总览 ----------
  async function renderGrowthAgents() {
    const box = $("#growthAgentBox");
    if (!box) return;
    if (!WF.apiGrowthAgents) { box.innerHTML = `<div class="cs-side__hint">-</div>`; return; }
    box.innerHTML = `<div class="cs-side__hint">⏳</div>`;
    try {
      const agents = await WF.apiGrowthAgents();
      if (!agents.length) {
        box.innerHTML = `<div class="cs-side__hint">${esc(t("csAgentEmpty"))}</div>`;
        return;
      }
      box.innerHTML = agents.map((a) => {
        const active = a.active;
        const last = (a.recent || []).find((r) => r.status !== "running");
        const maxR = a.max_rounds || 5;
        let stat;
        if (a.paused_reason) stat = `<span class="cs-badge cs-badge--warn">${esc(t("csAgentGuardPaused"))}</span>`;
        else if (active) stat = `<span class="cs-badge cs-badge--ok">${esc(t("csAgentRunning", { n: active.round }))}</span>`;
        else if (a.enabled) stat = `<span class="cs-badge">${esc(t("csAgentIdle"))}</span>`;
        else stat = `<span class="cs-badge cs-badge--off">${esc(t("csAgentOff"))}</span>`;
        return `<div class="cs-agent" data-agent="${esc(a.project_id)}">
          <div class="cs-agent__head">
            <span class="cs-agent__name">${esc(a.project_name || "")}</span>
            ${stat}
            <span class="cs-badge">${esc(a.objective === "lead" ? t("gaObjLead") : t("gaObjClick"))}</span>
            <span class="cs-side__hint">${esc(t("csAgentRounds", { n: a.finished_rounds || 0, max: maxR }))} · ${esc(t("csAgentMinViews", { n: a.min_views }))}</span>
          </div>
          ${active ? `<div class="cs-agent__row">
            <div class="cs-side__hint">${esc(t("csAgentHypothesis"))}:${esc((active.hypothesis || "").slice(0, 70))}${(active.categories || []).length ? ` <span class="cs-badge">${esc(active.categories.map((c) => (t("gaCat_" + c) || c)).join("/"))}</span>` : ""}${active.theme ? ` <span class="cs-badge">${esc(t("gaTheme_" + active.theme) || active.theme)}</span>` : ""}</div>
            <div class="cs-side__stats" data-agent-stats="${esc(active.id)}">⏳</div>
            <div class="cs-side__hint">A <a href="${esc((active.variants[0] || {}).url || "#")}" target="_blank">${esc((active.variants[0] || {}).url || "")}</a> · B <a href="${esc((active.variants[1] || {}).url || "#")}" target="_blank">${esc((active.variants[1] || {}).url || "")}</a></div>
          </div>` : ""}
          ${last ? `<div class="cs-side__hint">${esc(t("csAgentLast"))}:${last.decision === "promoted" ? "🏆 " + esc(t("csAgentPromoted")) : last.decision === "stopped" ? esc(t("csAgentStopped")) : esc(t("csAgentInconclusive"))}${last.result && last.result.p != null ? " · p=" + (+last.result.p).toFixed(3) : ""}${last.result && last.result.metric ? " · " + esc(last.result.metric) : ""}${last.result && last.result.views ? " · " + last.result.views + " " + esc(t("csAgentSamples")) : ""}</div>` : ""}
          <div style="display:flex;gap:6px;margin-top:6px">
            <button class="ed-btn" data-cs-act="agent-run" data-id="${esc(a.project_id)}">▶ ${esc(t("csAgentRunNow"))}</button>
            <button class="ed-btn" data-cs-act="agent-toggle" data-id="${esc(a.project_id)}" data-on="${a.enabled ? 1 : 0}">${a.enabled ? "⏸ " + esc(t("csAgentPause")) : "⏯ " + esc(t("csAgentResume"))}</button>
          </div>
        </div>`;
      }).join("");
      // 拉当前轮的样本
      agents.filter((a) => a.active).forEach(async (a) => {
        const el = document.querySelector(`[data-agent-stats="${a.active.id}"]`);
        if (!el) return;
        try {
          const stats = await WF.apiGetEventStats();
          const map = {};
          (stats.goals || []).forEach((g) => { map[g.goal_id] = g.count; });
          const counts = a.active.variants.map((v) => ({ views: map["view:" + v.cloudId] || 0, clicks: map[v.goalId] || 0 }));
          const st = WF.abStats(counts);
          const unit = a.objective === "lead" ? "线索" : "点击";
          el.textContent = `A ${(st.cvrA * 100).toFixed(1)}% (${st.va}/${st.ca}${unit}) · B ${(st.cvrB * 100).toFixed(1)}% (${st.vb}/${st.cb}${unit}) · ${st.significant ? "✅ 显著" : "⏳ 观察中"} p=${st.p.toFixed(3)}`;
        } catch (e) { el.textContent = ""; }
      });
    } catch (e) {
      box.innerHTML = `<div class="cs-side__hint">⚠️ ${esc(e.message)}</div>`;
    }
  }

  // ---------- A/B 实验列表(含 AI 新建的实验) ----------
  function renderABList() {
    const box = $("#abExpBox");
    if (!box) return;
    const list = (WF.getABExps ? WF.getABExps() : []) || [];
    if (!list.length) { box.innerHTML = `<div class="cs-side__hint">${esc(t("csABEmpty"))}</div>`; return; }
    box.innerHTML = list.slice(0, 6).map((exp) => `<div class="cs-abrow" data-ab="${esc(exp.id)}">
      <div class="cs-abrow__main">
        <div class="cs-abrow__name">${esc(exp.name || exp.taskId || "A/B")}${exp.promoted ? ` <span class="cs-abrow__win">🏆 ${esc(exp.promoted.key)}</span>` : ""}${exp.autoOptimize ? ` <span class="cs-side__hint">${esc(t("abAutoOptOn"))}</span>` : ""}</div>
        <div class="cs-side__hint">${new Date(exp.at).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })} · ${esc(exp.baseGoal)}-A/B · ${esc(exp.variants.map((v) => v.key).join("/"))}</div>
        <div class="cs-abrow__stats" hidden></div>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0">
        <button class="ed-btn" data-cs-act="ab-compare" data-id="${esc(exp.id)}">${esc(t("abCompare"))}</button>
        <button class="ed-btn" data-cs-act="ab-promote" data-id="${esc(exp.id)}" title="${esc(WF.t("abAutoOptHint"))}">🏆 ${esc(t("abAutoOpt"))}</button>
      </div>
    </div>`).join("");
  }

  // 单个实验:抓数据算显著性
  async function compareABExp(expId) {
    const row = document.querySelector(`[data-ab="${expId}"]`);
    if (!row) return;
    const statsBox = row.querySelector(".cs-abrow__stats");
    statsBox.hidden = false;
    statsBox.innerHTML = "⏳";
    try {
      const stats = await WF.apiGetEventStats();
      const map = {};
      (stats.goals || []).forEach((g) => { map[g.goal_id] = g.count; });
      const exp = (WF.getABExps() || []).find((x) => x.id === expId);
      const counts = exp.variants.map((v) => ({ views: map["view:" + v.cloudId] || 0, clicks: map[v.goalId] || 0 }));
      const st = WF.abStats(counts);
      const pct = (x) => (x * 100).toFixed(1) + "%";
      statsBox.innerHTML = exp.variants.map((v, i) => {
        const cvr = i === 0 ? st.cvrA : st.cvrB;
        const max = Math.max(0.0001, Math.max(st.cvrA, st.cvrB));
        const views = i === 0 ? st.va : st.vb, clicks = i === 0 ? st.ca : st.cb;
        return `<div class="cs-rank" style="padding:2px 0">
          <span class="cs-rank__name" style="width:56px">${esc(v.key)}</span>
          <span class="cs-rank__track"><span class="cs-rank__fill" style="width:${Math.round(cvr / max * 100)}%"></span></span>
          <span class="cs-rank__n">${pct(cvr)} <span class="cs-side__hint">${views}/${clicks}</span></span>
        </div>`;
      }).join("") + `<div class="cs-side__hint">${esc(t("abSig"))}: ${st.significant ? "✅ " + esc(t("abSigYes")) : "⏳ " + esc(t("abSigNo"))} (p=${st.p.toFixed(3)})</div>`;
    } catch (e) { statsBox.textContent = "⚠️ " + e.message; }
  }

  // 单个实验:立即评估并提优(显著才动)
  async function promoteABExp(expId) {
    const list = (WF.getABExps ? WF.getABExps() : []) || [];
    const exp = list.find((x) => x.id === expId);
    if (!exp) return;
    try {
      const stats = await WF.apiGetEventStats();
      const map = {};
      (stats.goals || []).forEach((g) => { map[g.goal_id] = g.count; });
      const counts = exp.variants.map((v) => ({ views: map["view:" + v.cloudId] || 0, clicks: map[v.goalId] || 0 }));
      const st = WF.abStats(counts);
      if (!st.significant) return WF.toast(t("abSigNo"), "error");
      const winner = st.cvrA >= st.cvrB ? exp.variants[0] : exp.variants[1];
      const loser = st.cvrA >= st.cvrB ? exp.variants[1] : exp.variants[0];
      await WF.apiRequest("/projects/" + loser.cloudId + "/unpublish", { method: "POST" });
      exp.promoted = { key: winner.key, at: Date.now(), cvrA: st.cvrA, cvrB: st.cvrB };
      localStorage.setItem("websflow.abExps", JSON.stringify(list));
      WF.toast(t("csAutoOptDone", { v: winner.key }), "success");
      renderABList();
    } catch (e) { WF.toast(e.message, "error"); }
  }

  // 自动提优:A/B 显著 → 下线落后版本(+ 邀请页写默认版本)
  async function runAutoOptimize() {
    if (!WF.autoOptimizeExperiments) return;
    try {
      const done = await WF.autoOptimizeExperiments(
        () => WF.apiGetEventStats(),
        (cloudId) => WF.apiRequest("/projects/" + cloudId + "/unpublish", { method: "POST" }),
        (variant, expId) => WF.apiSetRefVariant(variant, expId)
      );
      done.forEach((d) => WF.toast(t("csAutoOptDone", { v: d.winner }), "success"));
    } catch (e) { /* 静默 */ }
  }

  // ---------- 运维:对账结果 + 周环比 + 周报 ----------
  async function loadOps() {
    const box = $("#opsBox");
    if (!box) return;
    const me = WF.apiGetStoredUser() || {};
    if (!me.is_admin) return;
    try {
      const rep = await WF.apiReconcileLast();
      const wk = await WF.apiWeekly();
      const c = wk.current || {};
      const d = c.wow || {};
      const sign = (x) => (x >= 0 ? "+" : "") + x + "%";
      box.innerHTML = `
        <div class="cs-side__hint" style="margin-bottom:8px">${esc(t("csWeekly"))}: <b>${esc(c.period || "")}</b> 起 ·
          ${esc(t("csWoW"))}: ${esc(t("csWoWRevenue"))} ${sign(d.revenue || 0)} · ${esc(t("csWoWPaid"))} ${sign(d.paidUsers || 0)} · ${esc(t("csWoWSignups"))} ${sign(d.signups || 0)} · ${esc(t("csWoWCommission"))} ${sign(d.commission || 0)}
        </div>
        <details style="margin-bottom:8px">
          <summary class="cs-side__hint" style="cursor:pointer">${esc(t("csWeeklyPreview"))}</summary>
          <pre class="cs-side__hint" style="white-space:pre-wrap;margin:6px 0 0">${esc(wk.preview || "")}</pre>
        </details>
        <div class="cs-side__hint" style="margin-bottom:4px">${esc(t("csOpsLast"))}: ${rep ? esc(rep.at || "") : esc(t("csNoData"))}</div>
        ${rep ? `<div class="cs-side__hint">${esc(t("csOpsStat", { checked: rep.checked || 0, healed: rep.healed || 0, corrected: rep.corrected || 0, ok: rep.ok || 0 }))}</div>` : ""}
        ${(rep && rep.corrections && rep.corrections.length) ? `<div style="margin-top:4px">${rep.corrections.map((x) => `<div class="cs-side__hint">↩ ${esc(x.order_no)} ${x.from}→${x.to} (${x.delta >= 0 ? "+" : ""}¥${(x.delta / 100).toFixed(2)})</div>`).join("")}</div>` : ""}
        ${(rep && rep.amountMismatch && rep.amountMismatch.filter((x) => x.action && x.action.startsWith("需人工")).length) ? `<div class="cs-side__hint" style="color:var(--ed-danger)">⚠ ${rep.amountMismatch.filter((x) => x.action && x.action.startsWith("需人工")).map((x) => x.order_no + ":" + x.action).join(" / ")}</div>` : ""}
        ${(wk.reports || []).length ? `<div style="margin-top:8px" class="cs-side__hint">${esc(t("csWeeklyHistory"))}: ${wk.reports.slice(0, 4).map((r) => esc(r.period)).join(" · ")}</div>` : ""}`;
    } catch (e) {
      box.innerHTML = `<div class="cs-side__hint">${esc(e.message)}</div>`;
    }
  }

  async function runWeekly() {
    WF.toast(t("csWeeklyRunning"));
    try {
      const r = await WF.apiWeeklyRun();
      WF.toast(r.message, "success");
      loadOps();
    } catch (e) {
      WF.toast(e.message, "error");
    }
  }

  // ---------- 实时看板(SSE) ----------
  function renderRealtime(d) {
    const w = d.windows || {};
    const set = (id, win) => {
      const v = document.getElementById(id), sub = document.getElementById(id + "s");
      if (v) v.textContent = win ? (win.views + " / " + win.clicks) : "–";
      if (sub) sub.textContent = win ? ("CVR " + win.cvr + "%") : "–";
    };
    set("rt1", w.m1); set("rt5", w.m5); set("rt15", w.m15);
    const series = d.series || [];
    const box = document.getElementById("rtSeries");
    if (box) {
      const max = Math.max(1, ...series.map((x) => (x.clicks || 0) + (x.views || 0)));
      box.innerHTML = series.slice(-30).map((x) => `<div class="cs-bar" title="${esc(x.minute)} 曝光${x.views} 点击${x.clicks}">
        <div class="cs-bar__fill" style="height:${Math.round(((x.clicks || 0) + (x.views || 0)) / max * 100)}%"></div>
        <div class="cs-bar__label">${esc(String(x.minute).slice(11))}</div></div>`).join("") || `<div class="cs-side__hint">${esc(t("csNoData"))}</div>`;
    }
    if (typeof renderABList === "function") renderABList();
    if (typeof loadGoals === "function") loadGoals();
    if (typeof loadCrossActions === "function") loadCrossActions();
    if (typeof renderProposals === "function") renderProposals();
    if (typeof renderGrowthLessons === "function") renderGrowthLessons();
    if (typeof renderGrowthAgents === "function") renderGrowthAgents();
    const on = document.getElementById("rtOnline");
    if (on) on.textContent = (d.online != null ? d.online : "–");
    const srcBox = document.getElementById("rtSources");
    if (srcBox) {
      const srcs = d.sources || [];
      const max = Math.max(1, ...srcs.map((x) => x.n));
      srcBox.innerHTML = srcs.length ? srcs.slice(0, 5).map((x) => `<div class="cs-rank" style="padding:2px 0">
        <span class="cs-rank__name" style="width:96px">${esc(x.src)}</span>
        <span class="cs-rank__track"><span class="cs-rank__fill" style="width:${Math.round(x.n / max * 100)}%"></span></span>
        <span class="cs-rank__n">${x.n}</span>
      </div>`).join("") : `<div class="cs-side__hint">${esc(t("csNoData"))}</div>`;
    }
    const rec = document.getElementById("rtRecent");
    if (rec) {
      rec.textContent = (d.recent || []).slice(0, 4).map((r) => `${r.type === "page_view" ? "👁" : "🎯"} ${r.goal_id}${r.seg ? " [" + r.seg + "]" : ""}`).join("   ");
    }
  }

  function startRealtime(projectId) {
    if (state.rtSource) { try { state.rtSource.close(); } catch (e) {} state.rtSource = null; }
    try {
      const url = WF.apiRealtimeStreamURL(projectId);
      const es = new EventSource(url);
      state.rtSource = es;
      const dot = () => { const d = document.getElementById("rtDot"); if (d) d.className = "rt-dot is-on"; };
      es.onmessage = (ev) => {
        try { renderRealtime(JSON.parse(ev.data)); dot(); } catch (e) {}
      };
      es.onerror = () => {
        const d = document.getElementById("rtDot"); if (d) d.className = "rt-dot";
      };
    } catch (e) { /* SSE 不可用时静默 */ }
  }

  // ---------- 告警规则 ----------
  async function loadAlerts() {
    const box = $("#alertBox");
    if (!box) return;
    try {
      const rules = await WF.apiGetAlerts();
      const metricName = { views: t("csRtViews"), clicks: t("csRtClicks"), cvr: "CVR" };
      const actName = { notify: t("csAlertNotify"), unpublish: t("csAlertUnpublish"), task: t("csAlertTask") };
      box.innerHTML = rules.length ? rules.map((r) => `<div class="copilot__run" style="margin-bottom:6px">
        <div class="copilot__run-main">
          <span class="copilot__run-name">${esc(r.name || "")} ${r.enabled ? "" : "(" + esc(t("csSchedPaused")) + ")"}</span>
          <span class="copilot__run-meta">${esc(metricName[r.metric] || r.metric)} ${esc(r.operator)} ${r.threshold} · ${r.window_minutes}min · ${esc(actName[r.action] || r.action)}${r.last_fired_at ? " · " + esc(t("csAlertLastFired")) + " " + esc(String(r.last_fired_at).slice(5, 16)) : ""}</span>
        </div>
        <button class="ed-btn" data-cs-act="alert-run" data-id="${esc(r.id)}">${esc(t("csAlertRun"))}</button>
        <button class="ed-btn" data-cs-act="alert-toggle" data-id="${esc(r.id)}" data-enabled="${r.enabled ? 1 : 0}">${r.enabled ? esc(t("csSchedPause")) : esc(t("csSchedResume"))}</button>
        <button class="ed-btn is-danger" data-cs-act="alert-del" data-id="${esc(r.id)}">${esc(t("csDelete"))}</button>
      </div>`).join("") : `<div class="cs-side__hint">${esc(t("csAlertEmpty"))}</div>`;
    } catch (e) { box.innerHTML = `<div class="cs-side__hint">${esc(e.message)}</div>`; }
  }

  async function addAlert() {
    const name = window.prompt(t("csAlertName"), t("csAlerts"));
    if (name === null) return;
    const metric = (window.prompt(t("csAlertMetricPrompt"), "cvr") || "cvr").trim();
    const operator = (window.prompt(t("csAlertOpPrompt"), "<") || "<").trim();
    const threshold = Number(window.prompt(t("csAlertThresholdPrompt"), "1"));
    const win = Number(window.prompt(t("csAlertWindowPrompt"), "30"));
    const action = (window.prompt(t("csAlertActionPrompt"), "notify") || "notify").trim();
    try {
      await WF.apiCreateAlert({ name: name || t("csAlerts"), metric, operator, threshold, window_minutes: win, action, project_id: state.fproject || undefined });
      WF.toast(t("csAlertCreated"), "success");
      loadAlerts();
    } catch (e) { WF.toast(e.message, "error"); }
  }

  async function runAlert(id) {
    try {
      const r = await WF.apiRunAlert(id);
      const res = r.result || {};
      WF.toast(res.fired ? t("csAlertFired", { v: res.value }) : t("csAlertNotFired", { v: res.value }), res.fired ? "success" : "info");
      loadAlerts();
    } catch (e) { WF.toast(e.message, "error"); }
  }

  async function runReconcile() {
    WF.toast(t("csReconcileRunning"));
    try {
      const r = await WF.apiReconcileRun();
      const rep = r.report || {};
      WF.toast(t("csReconcileDone2", { checked: rep.checked || 0, healed: rep.healed || 0, corrected: rep.corrected || 0 }), "success");
      loadOps();
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
    // 默认隐藏实验变体(AI 轮次/演示页/对照副本),避免几十个实验页淹没正式页
    const isVariant = (n) => /AI ?轮|AI 实验源页|人审模式演示页|A\/B .*副本|· \d+[AB]$|终验|演练/.test(String(n || ""));
    const all = projects.length;
    if (state.pageReal !== false) projects = projects.filter((p) => !isVariant(p.name));
    if (state.pageQ) { const q = state.pageQ.toLowerCase(); projects = projects.filter((p) => String(p.name || "").toLowerCase().includes(q)); }
    state._pageAll = all;
    const main = $("#csMain");
    const pageSub = (state._pageAll && state._pageAll !== projects.length) ? `${projects.length}/${state._pageAll} · ` + t("csPagesSub") : t("csPagesSub");
    main.innerHTML = head("csPages", "csPagesSub", `
        <button class="ed-btn is-primary" data-cs-act="new-page">➕ ${esc(t("csNewPage"))}</button>
      `).replace(esc(t("csPagesSub")), esc(pageSub)) + `<div class="cs-card" style="padding:0;overflow:hidden">
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
                      ? `<button class="ed-btn" data-cs-act="copy-link" data-token="${esc(p.share_token || "")}">📋 ${esc(t("csCopyLink"))}</button>
                         <button class="ed-btn" data-cs-act="open-page" data-id="${esc(p.id)}" data-token="${esc(p.share_token || "")}">🔗 ${esc(t("csOpen"))}</button>
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
    // 首屏并行:数据与项目下拉同一轮往返
    const [stats, projects] = await Promise.all([
      WF.apiGetEventStats(state.fproject || undefined, state.trendDays || 13),
      WF.apiGetProjects().catch(() => []),
    ]);
    const main = $("#csMain");
    const daily = stats.daily || [];
    const maxGoal = Math.max(1, ...(stats.goals || []).map((g) => g.count));
    const maxDaily = Math.max(1, ...daily.map((d) => d.count));
    main.innerHTML = head("csConversion", "csConversionSub", `<button class="ed-btn" data-cs-act="reload">🔄 ${esc(t("csRefresh"))}</button>`) + `
      <div class="cs-card">
        <div class="cs-card__head">
          <div class="cs-card__title">⚡ ${esc(t("csRealtime"))} <span id="rtDot" class="rt-dot"></span></div>
          <span class="cs-side__hint" style="margin:0">${esc(t("csRealtimeHint"))}</span>
        </div>
        <div class="cs-kpi-grid" id="rtKpis">
          <div class="cs-kpi"><div class="cs-kpi__label">${esc(t("csRt1m"))}</div><div class="cs-kpi__val" id="rt1">–</div><div class="cs-kpi__sub" id="rt1s">–</div></div>
          <div class="cs-kpi"><div class="cs-kpi__label">${esc(t("csRt5m"))}</div><div class="cs-kpi__val" id="rt5">–</div><div class="cs-kpi__sub" id="rt5s">–</div></div>
          <div class="cs-kpi"><div class="cs-kpi__label">${esc(t("csRt15m"))}</div><div class="cs-kpi__val" id="rt15">–</div><div class="cs-kpi__sub" id="rt15s">–</div></div>
        </div>
        <div class="cs-bars" id="rtSeries" style="height:70px"></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-top:10px">
          <div>
            <div class="cs-kpi__label">${esc(t("csOnlineNow"))}</div>
            <div style="font-size:26px;font-weight:800;color:var(--ok)" id="rtOnline">–</div>
            <div class="cs-side__hint">${esc(t("csOnlineHint"))}</div>
          </div>
          <div>
            <div class="cs-kpi__label">${esc(t("csSources"))}</div>
            <div id="rtSources"><div class="cs-side__hint">–</div></div>
          </div>
        </div>
        <div class="cs-side__hint" id="rtRecent" style="margin-top:6px"></div>
      </div>
      <div class="cs-card">
        <div class="cs-card__head">
          <div class="cs-card__title">🎯 ${esc(t("csGoalTitle"))}</div>
          <div style="display:flex;gap:6px">
            <button class="ed-btn" data-cs-act="goal-seed">${esc(t("csGoalSeed"))}</button>
            <button class="ed-btn" data-cs-act="goal-new">＋ ${esc(t("csGoalNew"))}</button>
          </div>
        </div>
        <div class="cs-side__hint" style="margin-bottom:8px">${esc(t("csGoalHint"))}</div>
        <div id="goalsBox"><div class="cs-side__hint">⏳</div></div>
      </div>
      <div class="cs-card">
        <div class="cs-card__head"><div class="cs-card__title">🧭 ${esc(t("csActTitle"))}
          <span class="cs-side__hint">${esc(t("csActSub"))}</span></div></div>
        <div id="crossBox"><div class="cs-skeleton"></div></div>
        <details style="margin-top:8px"><summary class="cs-side__hint" style="cursor:pointer">${esc(t("csTraceTitle"))}</summary>
          <div style="display:flex;gap:6px;margin-top:6px">
            <input class="ed-input" id="traceQ" style="flex:1" placeholder="${esc(t("csTracePh"))}">
            <button class="ed-btn" data-cs-act="trace-lookup">${esc(t("csTraceLookup"))}</button>
          </div>
          <div id="traceBox" style="margin-top:6px"></div>
        </details>
      </div>
      <div class="cs-card" id="proposalCard">
        <div class="cs-card__head">
          <div class="cs-card__title">📝 ${esc(t("csProposalTitle"))}</div>
          <span class="cs-side__hint">${esc(t("csProposalHint"))}</span>
        </div>
        <div id="proposalBox"><div class="cs-side__hint">⏳</div></div>
      </div>
      <div class="cs-card">
        <div class="cs-card__head">
          <div class="cs-card__title">🤖 ${esc(t("csAgentTitle"))}</div>
          <span class="cs-side__hint">${esc(t("csAgentHint"))}</span>
        </div>
        <div id="growthLessons" class="cs-side__hint" style="margin-bottom:6px"></div>
        <div id="growthAgentBox"><div class="cs-side__hint">⏳</div></div>
      </div>
      <div class="cs-card">
        <div class="cs-card__head">
          <div class="cs-card__title">🧪 ${esc(t("csABTitle"))}</div>
          <span class="cs-side__hint">${esc(t("csABHint"))}</span>
        </div>
        <div id="abExpBox"><div class="cs-side__hint">⏳</div></div>
      </div>
      <div class="cs-card">
        <div class="cs-card__head">
          <div class="cs-card__title">🔔 ${esc(t("csAlerts"))}</div>
          <button class="ed-btn" data-cs-act="alert-add">＋ ${esc(t("csAlertAdd"))}</button>
        </div>
        <div id="alertBox"><div class="cs-side__hint">⏳</div></div>
      </div>
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
      <div class="cs-card">
        <div class="cs-card__head"><div class="cs-card__title">👥 ${esc(t("csBySeg"))}</div><span class="cs-side__hint" style="margin:0">${esc(t("csBySegHint"))}</span></div>
        ${(stats.bySeg || []).length ? `<div class="cs-tbl-wrap" style="border:none">
          <table class="cs-tbl">
            <thead><tr><th>${esc(t("csSegCol"))}</th><th>${esc(t("abViews"))}</th><th>${esc(t("abClicks"))}</th><th>CVR</th></tr></thead>
            <tbody>${(stats.bySeg || []).map((r) => `<tr>
              <td class="cs-tbl__name">${esc(r.seg)}</td>
              <td class="cs-tbl__mono">${r.views}</td>
              <td class="cs-tbl__mono">${r.clicks}</td>
              <td class="cs-tbl__mono">${r.cvr}%</td>
            </tr>`).join("")}</tbody>
          </table></div>` : `<div class="cs-empty"><div class="cs-empty__icon">👥</div>${esc(t("csNoData"))}</div>`}
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
    startRealtime(state.fproject || null);
    loadAlerts();
    // 侧栏项目筛选下拉
    const sel = $('[data-cs-filter="project"]');
    if (sel && sel.options.length <= 1) {
      (projects || []).forEach((p) => { const o = document.createElement("option"); o.value = p.id; o.textContent = p.name; sel.appendChild(o); });
      if (state.fproject) sel.value = state.fproject;
    }
  }

  async function loadAudience() {
    // 服务端一次聚合:此前逐项目拉取 12+ 次请求
    const overview = await WF.apiGetAudienceOverview();
    const rows = [];
    overview.slice(0, 40).forEach((p) => {
      (p.rules || []).forEach((r) => rows.push({ page: p.project_name, pid: p.project_id, type: r.type, aud: r.audience }));
    });
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
      ${identityPanelHTML()}
      <div class="cs-card">
        ${rows.length ? `<table class="cs-tbl" data-cs-table>
          <thead><tr><th>${esc(t("csColPage"))}</th><th>${esc(t("csColBlock"))}</th><th>${esc(t("csColRule"))}</th><th>${esc(t("csActions"))}</th></tr></thead>
          <tbody>
            ${rows.map((r) => `<tr>
              <td class="cs-tbl__name">${esc(r.page)}</td>
              <td>${esc(WF.tBlock(r.type))}</td>
              <td><span class="cs-badge cs-badge--warn">${esc(label(r.aud))}</span></td>
              <td><button class="ed-btn" data-cs-act="edit-page" data-id="${esc(r.pid)}">${esc(t("csEdit"))}</button></td>
            </tr>`).join("")}
          </tbody>
        </table>` : `<div class="cs-empty"><div class="cs-empty__icon">🎯</div>${esc(t("csAudienceEmpty"))}</div>`}
      </div>
      <div class="cs-card">
        <div class="cs-card__head"><div class="cs-card__title">${esc(t("csHowItWorks"))}</div></div>
        <div class="cs-side__hint" style="margin:0">${esc(t("csAudienceHow"))}</div>
      </div>`;
    main.onclick = onMainClick;
    const wrap = $("[data-cs-table]", main);
    if (wrap) enhanceTable(wrap);
  }

  // ============================================================
  //  生产流水线:故事线 → 用/造模块 → 打磨视觉 → A/B → 自动质检 → 成套交付
  // ============================================================
  let producePoll = null;
  const PRODUCE_STEPS = [
    ["storyline", "csPstepStory", "🧭"],
    ["modules", "csPstepModules", "🧩"],
    ["visual", "csPstepVisual", "🎨"],
    ["variants", "csPstepVariants", "🧪"],
    ["qa", "csPstepQa", "🛡️"],
    ["delivery", "csPstepDelivery", "📦"],
  ];

  function produceStepRows(steps) {
    const done = {};
    (steps || []).forEach((st) => { done[String(st.key).split(".")[0]] = st; });
    return PRODUCE_STEPS.map(([key, labelKey, icon]) => {
      const hit = done[key];
      const state = hit ? "done" : (steps && steps.length && key === PRODUCE_STEPS[Math.min(steps.length, PRODUCE_STEPS.length - 1)][0] ? "doing" : "todo");
      return `<div class="cs-abrow">
        <div class="cs-abrow__main">
          <div class="cs-abrow__name">${icon} ${esc(t(labelKey))}
            <span class="cs-badge ${hit ? "cs-badge--ok" : ""}">${hit ? "✓" : state === "doing" ? "…" : ""}</span></div>
          ${hit ? `<div class="cs-side__hint">${esc(hit.detail || "")}</div>` : ""}
        </div>
      </div>`;
    }).join("");
  }

  function produceResultHTML(r) {
    if (!r) return "";
    const vs = r.variants || [];
    const qa = r.qa || {};
    const pack = r.delivery || {};
    return `
      <div class="cs-card">
        <div class="cs-card__head"><div class="cs-card__title">🧪 ${esc(t("csPAbtitle"))}</div>
          <span class="cs-side__hint">${esc(t("csPAbtip"))}</span></div>
        ${vs.map((v) => `<div class="cs-abrow" data-variant="${esc(v.key)}">
          <div class="cs-abrow__main">
            <div class="cs-abrow__name"><span class="cs-badge ${v.key === "B" ? "cs-badge--warn" : ""}">${esc(v.key)}</span> ${esc(v.name)}</div>
            <div class="cs-side__hint">${esc((r.storyline && r.storyline.hypotheses || []).find((x) => x.key === v.key) || {}).statement || ""}</div>
            <div class="cs-side__hint"><a href="${esc(v.url)}" target="_blank" rel="noopener">${esc(v.url)}</a></div>
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0">
            <button class="ed-btn is-primary" data-cs-act="produce-preview" data-url="${esc(v.url)}">${esc(t("csPPreview"))}</button>
            <button class="ed-btn" data-cs-act="open-editor" data-id="${esc(v.cloudId)}">${esc(t("csPEdit"))}</button>
          </div>
        </div>`).join("") || `<div class="cs-side__hint">–</div>`}
      </div>
      <div class="cs-card">
        <div class="cs-card__head"><div class="cs-card__title">🛡️ ${esc(t("csPQa"))}</div></div>
        <div class="cs-side__hint">A: ${qa.A && qa.A.ok ? "✅ " + esc(t("csPPass")) : "⚠️"} · ${(qa.A && qa.A.autofixes || []).length} ${esc(t("csPFixes"))}
          &nbsp;|&nbsp; B: ${qa.B && qa.B.ok ? "✅ " + esc(t("csPPass")) : "⚠️"} · ${(qa.B && qa.B.autofixes || []).length} ${esc(t("csPFixes"))}</div>
        ${(qa.A && qa.A.issues || []).length || (qa.B && qa.B.issues || []).length
          ? `<div class="cs-side__hint" style="margin-top:6px">${esc([...(qa.A && qa.A.issues || []), ...(qa.B && qa.B.issues || [])].map((i) => i.code).join(", "))}</div>` : ""}
      </div>
      <div class="cs-card">
        <div class="cs-card__head"><div class="cs-card__title">📦 ${esc(t("csPPack"))}</div>
          <button class="ed-btn" data-cs-act="produce-pack" data-id="${esc(r.id || "")}">${esc(t("csPShowPack"))}</button></div>
        <div class="cs-side__hint">${esc(pack.dir || "")} · ${(pack.files || []).join(", ")}</div>
        <div id="packBox"></div>
      </div>
      <div class="cs-card">
        <div class="cs-card__head"><div class="cs-card__title">🎬 ${esc(t("csPStory"))}</div>
          <span class="cs-side__hint">${esc(r.storyline && r.storyline.angle || "")}</span></div>
        ${(r.storyline && r.storyline.scenes || []).map((sc, i) => `<div class="cs-abrow">
          <div class="cs-abrow__main">
            <div class="cs-abrow__name">${String(i + 1).padStart(2, "0")} ${esc(WF.tBlock ? sc.role : sc.role)} ${sc.role === "custom" ? `<span class="cs-badge cs-badge--warn">${esc(t("csPNewModule"))}</span>` : ""}</div>
            <div class="cs-side__hint">${esc(sc.heading || "")}${sc.sub ? " — " + esc(sc.sub) : ""}</div>
          </div>
        </div>`).join("")}
        ${(r.newModules || []).length ? `<div class="cs-side__hint" style="margin-top:8px">${esc(t("csPNewModules"))}: ${esc(r.newModules.map((m) => m.block_type + (m.ai ? "(AI)" : "(模板)")).join(", "))}</div>` : ""}
      </div>`;
  }

  async function loadProduce() {
    if (producePoll) { clearInterval(producePoll); producePoll = null; }
    const main = $("#csMain");
    let list = { productions: [] };
    try { list = await WF.apiRequest("/produce?limit=10"); } catch (e) {}
    if (!window.WF.industryOptions) {
      try { window.WF.industryOptions = (await WF.apiRequest("/produce/industries")).industries || []; } catch (e) { window.WF.industryOptions = []; }
    }
    main.innerHTML = head("csProduce", "csProduceSub", `<button class="ed-btn" data-cs-act="produce-new">＋ ${esc(t("csPNew"))}</button>`) + `
      <div class="cs-card" id="produceForm" ${list.productions.length ? 'style="display:none"' : ""}>
        <div class="cs-card__head"><div class="cs-card__title">📝 ${esc(t("csPBrief"))}</div>
          <span class="cs-side__hint">${esc(t("csPBriefTip"))}</span></div>
        <div class="cs-pgrid">
          <label class="field"><span class="ed-label">${esc(t("csPBusiness"))}</span><input class="ed-input" id="pBusiness" placeholder="${esc(t("csPBusinessPh"))}"></label>
          <label class="field"><span class="ed-label">${esc(t("csPProduct"))}</span><input class="ed-input" id="pProduct" placeholder="${esc(t("csPProductPh"))}"></label>
          <label class="field"><span class="ed-label">${esc(t("csPAudience"))}</span><input class="ed-input" id="pAudience" placeholder="${esc(t("csPAudiencePh"))}"></label>
          <label class="field"><span class="ed-label">${esc(t("csPGoal"))}</span><input class="ed-input" id="pGoal" placeholder="${esc(t("csPGoalPh"))}"></label>
          <label class="field"><span class="ed-label">${esc(t("csPIndustry"))}</span>
            <select class="ed-select" id="pIndustry"><option value="">${esc(t("csPIndustryAuto"))}</option>${(window.WF.industryOptions || []).map((x) => `<option value="${esc(x.key)}">${esc(x.label)} (${x.count})</option>`).join("")}</select></label>
          <label class="field"><span class="ed-label">${esc(t("csPMode"))}</span>
            <select class="ed-select" id="pMode"><option value="site">${esc(t("csPSite"))}</option><option value="h5">${esc(t("csPH5"))}</option><option value="story">${esc(t("csPStory2"))}</option></select></label>
          <label class="field"><span class="ed-label">${esc(t("csPMedia"))}</span><input class="ed-input" id="pMedia" placeholder="${esc(t("csPMediaPh"))}"></label>
          <label class="field"><span class="ed-label">${esc(t("csPCta"))}</span><input class="ed-input" id="pCta" placeholder="${esc(t("csPCtaPh"))}"></label>
          <label class="field"><span class="ed-label">${esc(t("csPPrice"))}</span><input class="ed-input" id="pPrice" placeholder="${esc(t("csPPricePh"))}"></label>
        </div>
        <div style="display:flex;gap:8px;align-items:center;margin-top:10px">
          <button class="ed-btn is-primary" data-cs-act="produce-run">🏭 ${esc(t("csPRun"))}</button>
          <span class="cs-side__hint">${esc(t("csPRunTip"))}</span>
        </div>
      </div>
      <div id="produceRun"></div>
      <div class="cs-card">
        <div class="cs-card__head"><div class="cs-card__title">🗂 ${esc(t("csPHistory"))}</div></div>
        ${(list.productions || []).map((x) => `<div class="cs-abrow">
          <div class="cs-abrow__main">
            <div class="cs-abrow__name">${esc((x.brief || {}).business || "-")} <span class="cs-badge ${x.status === "done" ? "cs-badge--ok" : x.status === "failed" ? "cs-badge--warn" : ""}">${esc(x.status)}</span></div>
            <div class="cs-side__hint">${esc(String(x.created_at || "").slice(0, 16))} · ${esc((x.brief || {}).product || "")}</div>
          </div>
          <button class="ed-btn" data-cs-act="produce-open" data-id="${esc(x.id)}">${esc(t("csPOpen"))}</button>
        </div>`).join("") || `<div class="cs-side__hint">${esc(t("csPEmpty"))}</div>`}
      </div>`;
    main.onclick = onMainClick;
  }

  async function produceStart() {
    const brief = {
      business: ($("#pBusiness") || {}).value || "", product: ($("#pProduct") || {}).value || "",
      audience: ($("#pAudience") || {}).value || "", goal: ($("#pGoal") || {}).value || "",
      mode: ($("#pMode") || {}).value || "site",
      mediaTags: String((($("#pMedia") || {}).value) || "").split(/[,，\s]+/).filter(Boolean),
      ctaText: ($("#pCta") || {}).value || "", price: ($("#pPrice") || {}).value || "",
      industry: ($("#pIndustry") || {}).value || "",
    };
    if (!brief.business && !brief.product) return WF.toast("⚠️ " + t("csPNeedBrief"), "error");
    const box = $("#produceRun");
    box.innerHTML = `<div class="cs-card"><div class="cs-card__head"><div class="cs-card__title">🏭 ${esc(t("csPRunning"))}</div></div><div id="produceSteps">${produceStepRows([])}</div></div>`;
    const r = await WF.apiRequest("/produce", { method: "POST", body: { brief } });
    WF.toast("🏭 " + t("csPStarted"), "success");
    const id = r.id;
    producePoll = setInterval(async () => {
      try {
        const st = await WF.apiRequest("/produce/" + id);
        const stepsEl = $("#produceSteps");
        if (stepsEl) stepsEl.innerHTML = produceStepRows(st.steps);
        if (st.status !== "running") {
          clearInterval(producePoll); producePoll = null;
          box.innerHTML = `<div class="cs-card"><div class="cs-card__head"><div class="cs-card__title">🏭 ${esc(t("csPDone"))}</div>
              <span class="cs-side__hint">${esc(st.status)}</span></div>${produceStepRows(st.steps)}</div>`
            + produceResultHTML(Object.assign({ id }, st.result || {}));
          WF.toast(st.status === "done" ? "✅ " + t("csPDone") : "⚠️ " + st.status, st.status === "done" ? "success" : "error");
        }
      } catch (e) { /* 轮询失败下一轮重试 */ }
    }, 2500);
  }

  async function produceOpen(id) {
    const box = $("#produceRun");
    box.innerHTML = `<div class="cs-card"><div class="cs-skeleton"></div></div>`;
    const st = await WF.apiRequest("/produce/" + id);
    box.innerHTML = `<div class="cs-card"><div class="cs-card__head"><div class="cs-card__title">🏭 ${esc((st.brief || {}).business || "")}</div>
        <span class="cs-side__hint">${esc(st.status)}</span></div>${produceStepRows(st.steps)}</div>`
      + produceResultHTML(Object.assign({ id }, st.result || {}));
  }

  async function producePack(id) {
    const box = $("#packBox");
    if (!box) return;
    box.innerHTML = `<div class="cs-skeleton"></div>`;
    const r = await WF.apiRequest("/produce/" + id + "/pack");
    const readme = (r.files || []).find((f) => f.name === "README.md");
    box.innerHTML = `<div class="cs-side__hint" style="margin:8px 0 4px">${(r.files || []).map((f) => `${esc(f.name)} (${Math.round(f.size / 1024)}KB)`).join(" · ")}</div>
      ${readme ? `<pre class="cs-pre">${esc(readme.content)}</pre>` : ""}`;
  }

  async function loadCases() {
    const main = $("#csMain");
    let data = { cases: [], live: [] };
    try { data = await WF.apiRequest("/metrics/launch"); } catch (e) {}
    const card = (c) => `<div class="cs-card" style="margin:0">
      <div class="cs-card__head"><div class="cs-card__title">${esc(c.title)}</div>
        <span class="cs-badge cs-badge--muted">${esc(c.industry || c.mode || "")}</span></div>
      <div class="cs-side__hint">${esc(c.note || c.metric || "")}${c.modules ? " · " + c.modules + " 模块" : ""}</div>
      ${c.url ? `<div style="margin-top:10px"><a class="ed-btn is-primary" href="${esc(c.url)}" target="_blank" rel="noopener">${esc(t("csOpen"))}</a></div>` : ""}
    </div>`;
    main.innerHTML = head("csCases", "csCasesSub") + `
      <div class="cs-side__hint" style="margin-bottom:10px">${esc(t("csCasesHint"))}</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px">
        ${(data.cases || []).map(card).join("")}
      </div>
      ${(data.live || []).length ? `<div class="cs-card" style="margin-top:16px">
        <div class="cs-card__head"><div class="cs-card__title">${esc(t("csCasesLive"))}</div></div>
        ${(data.live || []).map((c) => `<div class="cs-rank">
          <span class="cs-rank__name" style="width:auto;flex:1">${esc(c.title)}</span>
          ${c.url ? `<a class="ed-btn" href="${esc(c.url)}" target="_blank" rel="noopener">${esc(t("csOpen"))}</a>` : ""}
        </div>`).join("")}
      </div>` : ""}`;
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

  // ---------- 开放平台:API 密钥 ----------
  async function loadApiKeys() {
    const box = $("#apiKeysBox");
    if (!box) return;
    try {
      const r = await WF.apiRequest("/tools/keys");
      const keys = r.keys || [];
      const SCOPE_LABEL = { read: t("csScopeRead"), write: t("csScopeWrite"), growth: t("csScopeGrowth"), ingest: t("csScopeIngest") };
      box.innerHTML = keys.length ? keys.map((k) => `<div class="cs-abrow" data-key="${esc(k.id)}">
        <div class="cs-abrow__main">
          <div class="cs-abrow__name">${esc(k.name)} <span class="cs-side__hint">${esc(k.key_prefix)}…</span>
            ${(k.scopes && k.scopes.length) ? (k.scopes || []).map((sc) => `<span class="cs-badge">${esc(SCOPE_LABEL[sc] || sc)}</span>`).join("") : `<span class="cs-badge cs-badge--warn">${esc(t("csScopeAll"))}</span>`}
          </div>
          <div class="cs-side__hint">${esc(t("csApiCreated"))}${new Date(k.created_at).toLocaleDateString("zh-CN")}${k.last_used_at ? ` · ${esc(t("csApiLastUsed"))}${new Date(k.last_used_at).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}` : ` · ${esc(t("csApiNeverUsed"))}`} · ${esc(t("csApiQuota", { u: k.calls_today || 0, q: k.quota_per_day || 2000 }))}</div>
        </div>
        <button class="ed-btn" data-cs-act="api-key-del" data-id="${esc(k.id)}">${esc(t("csApiRevoke"))}</button>
      </div>`).join("") : `<div class="cs-side__hint">${esc(t("csApiEmpty"))}</div>`;
      // 审计列表在展开时加载(见 bindLazyDetails)
    } catch (e) { box.innerHTML = `<div class="cs-side__hint">⚠️ ${esc(e.message)}</div>`; }
  }
  // 最近调用审计
  async function loadApiAudit() {
    const box = $("#apiAuditBox");
    if (!box) return;
    try {
      const r = await WF.apiRequest("/tools/audit?limit=12");
      const list = r.audit || [];
      box.innerHTML = list.length ? list.map((a) => `<div class="cs-side__hint" style="display:flex;gap:8px">
        <span style="min-width:118px">${new Date(a.created_at).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
        <span style="min-width:130px">${esc(a.action)}</span>
        <span>${a.ok ? "✅" : "❌"} ${esc((a.detail || a.error || "").slice(0, 60))}</span>
      </div>`).join("") : `<div class="cs-side__hint">${esc(t("csApiNoAudit"))}</div>`;
    } catch (e) { box.innerHTML = `<div class="cs-side__hint">⚠️ ${esc(e.message)}</div>`; }
  }

  // 展示工具清单(无需密钥:直接用当前会话调一次只读工具不可行,这里静态说明常用工具)
  function renderApiToolsHint() {
    const box = $("#apiToolsBox");
    if (!box) return;
    box.innerHTML = esc(t("csApiToolsHint"));
  }

  // ---------- 平台经验库(G4) ----------
  async function loadLessons() {
    const box = $("#lessonsBox");
    if (!box) return;
    box.innerHTML = "⏳";
    const scene = ($("#lessonScene") || {}).value || "";
    try {
      const [sum, brief] = await Promise.all([
        WF.apiRequest("/lessons/summary" + (scene ? "?scene=" + encodeURIComponent(scene) : "")),
        WF.apiRequest("/lessons/brief" + (scene ? "?scene=" + encodeURIComponent(scene) : "")),
      ]);
      const rows = sum.summary || [];
      box.innerHTML = `
        <div class="ai-stats" style="white-space:pre-wrap">${esc(brief.brief || "")}</div>
        ${rows.length ? rows.slice(0, 10).map((r) => `<div class="cs-abrow">
          <div class="cs-abrow__main">
            <div class="cs-abrow__name">${esc(r.action_label || r.action)} <span class="cs-badge">${esc(r.scene)}</span>
              <span class="cs-badge">${esc(r.system)}</span></div>
            <div class="cs-side__hint">${esc(t("csLessonsStat", { w: r.wins, l: r.losses, n: r.decided, t: r.trials }))}${r.avgDelta != null ? " · Δ" + r.avgDelta : ""}</div>
          </div>
          <span class="cs-badge ${r.winRate >= 0.55 ? "cs-badge--ok" : (r.winRate <= 0.45 ? "cs-badge--warn" : "")}">${(r.winRate * 100).toFixed(0)}%</span>
        </div>`).join("") : `<div class="cs-side__hint">${esc(t("csLessonsEmpty"))}</div>`}`;
    } catch (e) { box.innerHTML = `⚠️ ${esc(e.message)}`; }
  }

  // ---------- 能力目录(G3) ----------
  async function loadCapabilities(q) {
    const box = $("#capsBox");
    if (!box) return;
    box.innerHTML = "⏳";
    try {
      const path = q ? ("/capabilities/find?need=" + encodeURIComponent(q)) : "/capabilities";
      const r = await WF.apiRequest(path);
      const list = r.capabilities || [];
      const bySystem = {};
      list.forEach((c) => { (bySystem[c.system] = bySystem[c.system] || []).push(c); });
      box.innerHTML = list.length ? Object.keys(bySystem).map((sys) => `
        <div class="cs-side__hint" style="margin-top:6px"><b>${esc(sys)}</b> · ${bySystem[sys].length} 项</div>
        ${bySystem[sys].slice(0, 8).map((c) => `<div class="cs-abrow">
          <div class="cs-abrow__main">
            <div class="cs-abrow__name">${esc(c.name || c.id)} <span class="cs-side__hint">${esc(c.kind)}</span>
              ${(c.scopes || []).map((sc) => `<span class="cs-badge">${esc(sc)}</span>`).join("")}
              ${c.status === 'unreachable' ? `<span class="cs-badge cs-badge--warn">${esc(t("csCapsUnreachable"))}</span>` : ""}
              ${c.source === 'builtin' ? `<span class="cs-badge">${esc(t("csCapsBuiltin"))}</span>` : `<span class="cs-badge cs-badge--ok">${esc(t("csCapsRegistered"))}</span>`}
            </div>
            <div class="cs-side__hint">${esc((c.description || "").slice(0, 90))}</div>
            ${c.endpoint ? `<div class="cs-side__hint">→ ${esc(c.endpoint)}</div>` : ""}
          </div>
        </div>`).join("")}`).join("") : `<div class="cs-side__hint">${esc(t("csCapsEmpty"))}</div>`;
    } catch (e) { box.innerHTML = `⚠️ ${esc(e.message)}`; }
  }

  // ---------- 身份打通(G2):按任一标识查一个人的跨系统轨迹 ----------
  function identityPanelHTML() {
    return `<div class="cs-card">
      <div class="cs-card__head"><div class="cs-card__title">🪪 ${esc(t("csIdentityTitle"))}</div>
        <span class="cs-side__hint">${esc(t("csIdentityHint"))}</span></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <input class="ed-input" id="idQ" style="flex:1;min-width:180px" placeholder="${esc(t("csIdentityPh"))}">
        <button class="ed-btn is-primary" data-cs-act="id-lookup">${esc(t("csIdentityLookup"))}</button>
      </div>
      <div id="idBox" style="margin-top:10px"></div>
    </div>`;
  }

  async function identityLookup() {
    const box = $("#idBox");
    const raw = (($("#idQ") || {}).value || "").trim();
    if (!raw) return;
    if (!box) return;
    box.innerHTML = "⏳";
    // 支持 "kind:value" 或裸值(裸值按 vid→uid→email 逐个试)
    let q = {};
    const m = raw.match(/^(vid|uid|email|phone|payflow_ref)[:：](.+)$/);
    if (m) q[m[1]] = m[2].trim();
    else { q = { vid: raw, uid: raw, email: raw }; }
    try {
      const r = await WF.apiRequest("/identity/resolve", { method: "POST", body: JSON.stringify(q) });
      const idn = r.identity;
      const tl = await WF.apiRequest("/identity/" + idn.id);
      const srcIcon = { event: "📊", lead: "🧲", order: "💳" };
      box.innerHTML = `
        <div class="ai-stats">${esc(t("csIdentityFound"))}<b>${esc(idn.id.slice(0, 8))}</b>
          ${r.created ? `<span class="cs-badge cs-badge--ok">${esc(t("csIdentityNew"))}</span>` : ""}
          ${r.merged ? `<span class="cs-badge cs-badge--warn">${esc(t("csIdentityMerged", { n: r.merged.length }))}</span>` : ""}
        </div>
        <div class="cs-side__hint" style="margin-top:6px">${esc(t("csIdentityLinks"))}${(idn.links || []).map((l) => `<span class="cs-badge">${esc(l.kind)}:${esc(String(l.value).slice(0, 22))}</span>`).join("")}</div>
        ${Object.keys(idn.traits || {}).length ? `<div class="cs-side__hint">${esc(t("csIdentityTraits"))}${esc(JSON.stringify(idn.traits).slice(0, 160))}</div>` : ""}
        <div style="margin-top:8px">${(tl.timeline || []).slice(0, 20).map((x) => `<div class="cs-side__hint" style="display:flex;gap:8px">
          <span style="min-width:118px">${new Date(x.created_at).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
          <span style="min-width:74px">${srcIcon[x.source] || ""} ${esc(x.source)}</span>
          <span>${esc(String(x.kind || ""))} ${x.detail ? "· " + esc(String(x.detail).slice(0, 40)) : ""}${x.value != null ? " · " + esc(String(x.value)) : ""}</span>
        </div>`).join("") || `<div class="cs-side__hint">${esc(t("csIdentityNoTimeline"))}</div>`}</div>`;
    } catch (e) { box.innerHTML = `⚠️ ${esc(e.message)}`; }
  }
  if (typeof WF !== "undefined") WF.__identityLookup = identityLookup;

  function loadSettings() {
    const user = WF.apiGetStoredUser() || {};
    const main = $("#csMain");
    main.innerHTML = head("csSettings", "csSettingsSub", "") + `
      <div class="cs-panels">
        <div class="cs-section"><div class="cs-section__title">👤 ${esc(t("csAccountSection"))}</div></div>
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
          <details data-lazy="referral"><summary class="cs-side__hint" style="cursor:pointer">${esc(t("csExpandLoad"))}</summary>
            <div id="refBox" style="margin-top:6px"><div class="cs-side__hint">–</div></div></details>
        </div>
        ${(WF.apiGetStoredUser() || {}).is_admin ? `
        <div class="cs-card">
          <div class="cs-card__head"><div class="cs-card__title">🔔 ${esc(t("csNotifyChannel"))}</div></div>
          <div id="larkBox"><div class="cs-side__hint">⏳</div></div>
        </div>` : ""}
        <div class="cs-card">
          <div class="cs-card__head"><div class="cs-card__title">🧬 ${esc(t("csPatTitle"))}</div>
            <div style="display:flex;gap:6px">
              <button class="ed-btn" data-cs-act="pat-load">${esc(t("csPatRefresh"))}</button>
              <button class="ed-btn" data-cs-act="archive-variants">🧹 ${esc(t("csArchiveVariants"))}</button>
            </div></div>
          <div class="cs-side__hint">${esc(t("csPatSub"))}</div>
          <div id="patBox" style="margin-top:8px"><div class="cs-skeleton"></div></div>
        </div>
        <div class="cs-section" id="platformSection">
          <div class="cs-section__title">🔌 ${esc(t("csPlatform"))} <span class="cs-side__hint">${esc(t("csPlatformSub"))}</span></div>
        </div>
        <div class="cs-card">
          <div class="cs-card__head">
            <div class="cs-card__title">${esc(t("csApiTitle"))}</div>
            <button class="ed-btn" data-cs-act="api-key-add">＋ ${esc(t("csApiCreate"))}</button>
          </div>
          <div class="cs-side__hint" style="margin-bottom:10px">${esc(t("csApiHint"))}</div>
          <div id="apiKeysBox"><div class="cs-side__hint">⏳</div></div>
          <details data-lazy="audit" style="margin-top:8px"><summary class="cs-side__hint" style="cursor:pointer">${esc(t("csApiAudit"))}</summary>
            <div id="apiAuditBox" style="margin-top:6px">⏳</div></details>
          <details style="margin-top:10px">
            <summary class="cs-side__hint" style="cursor:pointer">${esc(t("csApiTools"))}</summary>
            <div id="apiToolsBox" class="cs-side__hint" style="margin-top:6px">⏳</div>
          </details>
        </div>
        <div class="cs-card">
          <div class="cs-card__head">
            <div class="cs-card__title">🧠 ${esc(t("csLessonsTitle"))}</div>
            <button class="ed-btn" data-cs-act="lessons-refresh">↻</button>
          </div>
          <div class="cs-side__hint" style="margin-bottom:8px">${esc(t("csLessonsHint"))}</div>
          <div style="display:flex;gap:6px;margin-bottom:8px">
            <select class="ed-select" id="lessonScene" style="flex:1">
              <option value="">${esc(t("csLessonsAllScenes"))}</option>
              ${["landing-page-cvr", "content-engagement", "lead-quality", "checkout-completion", "retention"].map((k) => `<option value="${k}">${esc(k)}</option>`).join("")}
            </select>
            <button class="ed-btn is-primary" data-cs-act="lessons-load">${esc(t("csLessonsLoad"))}</button>
          </div>
          <div id="lessonsBox"><div class="cs-side__hint">⏳</div></div>
        </div>
        <div class="cs-card">
          <div class="cs-card__head">
            <div class="cs-card__title">🧭 ${esc(t("csCapsTitle"))}</div>
            <button class="ed-btn" data-cs-act="caps-sync">↻ ${esc(t("csCapsSync"))}</button>
          </div>
          <div class="cs-side__hint" style="margin-bottom:8px">${esc(t("csCapsHint"))}</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">
            <input class="ed-input" id="capQ" style="flex:1;min-width:160px" placeholder="${esc(t("csCapsPh"))}">
            <button class="ed-btn is-primary" data-cs-act="caps-find">${esc(t("csCapsFind"))}</button>
          </div>
          <div id="capsBox"><div class="cs-side__hint">⏳</div></div>
        </div>
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
    bindLazyDetails(main);   // 折叠区(返佣/审计/对账)首次展开才请求
    loadPatterns().catch(() => {});
    // 首屏只拉"套餐 + 平台三卡";收益/返佣/对账等折叠区按需加载
    Promise.all([loadBilling().catch(() => {}), loadApiKeys(), loadCapabilities(), loadLessons()]);
  }

  // ---------- 通知中心 ----------
  // 折叠区惰性加载:首次展开才请求
  function bindLazyDetails(root) {
    (root || document).querySelectorAll("details[data-lazy]").forEach((d) => {
      if (d.dataset.bound) return;
      d.dataset.bound = "1";
      d.addEventListener("toggle", () => {
        if (!d.open || d.dataset.loaded) return;
        d.dataset.loaded = "1";
        const kind = d.dataset.lazy;
        if (kind === "referral") loadReferral();
        else if (kind === "audit") loadApiAudit();
        else if (kind === "ops") { if (typeof loadBoard === "function") loadBoard(); if (typeof loadMailStatus === "function") loadMailStatus(); if (typeof loadPayoutAdmin === "function") loadPayoutAdmin(); }
      });
    });
  }

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
            <span class="cs-side__hint" style="margin:0">${esc(t("csCredits"))}: ¥${(me.balance || 0).toFixed(2)}</span>
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
      // 返佣卡片在展开时按需加载(见 bindLazyDetails)
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
      box.innerHTML = (r.catalog || []).map((it) => `<button class="ed-btn ${it.key === "pro_yearly" ? "is-primary" : ""}" data-cs-act="pay-buy" data-id="${esc(it.id)}" data-kind="${esc(it.kind)}" data-name="${esc(it.name)}">
        ${it.kind === "pro" ? "💎" : "💰"} ${esc(it.name)}${it.amount_cents ? " · ¥" + Math.round(it.amount_cents / 100) : ""}
      </button>`).join("")
        + `<div class="cs-side__hint" style="width:100%;margin-top:6px">${esc(t("csPayCompare"))}</div>`
        + `<table class="cs-tbl" style="margin-top:6px"><thead><tr><th>${esc(t("csCompareFeature"))}</th><th>${esc(t("csCompareFree"))}</th><th>${esc(t("csComparePro"))}</th></tr></thead><tbody>
          <tr><td>云端项目</td><td>3</td><td>100</td></tr>
          <tr><td>已发布页面</td><td>1</td><td>50</td></tr>
          <tr><td>AI 出页 / 日</td><td>20</td><td>200</td></tr>
          <tr><td>托管页角标</td><td>${esc(t("csCompareYes"))}</td><td>${esc(t("csCompareNo"))}</td></tr>
        </tbody></table>`;
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
        ${r.payoutMode === "payflow" ? `<div class="cs-side__hint" style="margin-top:8px">💰 ${esc(t("csPayoutViaPayflow"))}: <b>¥${(((r.payflow && r.payflow.summary && r.payflow.summary.withdrawable) || 0) / 100).toFixed(2)}</b> ${r.payflow && r.payflow.commissionRate != null ? `· 费率 ${(r.payflow.commissionRate * 100).toFixed(0)}%` : ""}</div>` : ""}
        ${r.verified ? `
        <div class="field" style="margin-top:8px">
          <label class="ed-label">${esc(t("csPayout"))} (${esc(t("csPayoutBalance"))}: ¥${r.payoutMode === "payflow" ? ((((r.payflow && r.payflow.summary && r.payflow.summary.withdrawable) || 0) / 100).toFixed(2)) : (r.balance || 0).toFixed(2)})</label>
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
        theme: { preset: useB ? "aqua" : "indigo", fontScale: 1 },
        global: { title: useB ? "不等排期,今天就把落地页做出来" : "把页面,变成你的增长引擎", description: "通过邀请链接注册 WebsFlow,五分钟做投放落地页", brand: "WebsFlow 魔块" },
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
    if (act === "ab-compare") return compareABExp(el.dataset.id);
    if (act === "ab-promote") return promoteABExp(el.dataset.id);
    if (act === "trend-days") {
      state.trendDays = Number(el.dataset.days) || 13;
      loadAnalytics && loadAnalytics();
      return;
    }
    if (act === "pv-mode") {
      const wrap = document.querySelector(`[data-preview="${el.dataset.id}"]`);
      if (!wrap) return;
      const mode = el.dataset.mode;
      wrap.querySelectorAll("[data-cs-act='pv-mode']").forEach((b) => b.classList.toggle("is-active", b.dataset.mode === mode));
      wrap.querySelectorAll(".cs-preview__box").forEach((b) => { b.classList.toggle("is-desktop", mode === "desktop"); b.classList.toggle("is-mobile", mode === "mobile"); });
      return;
    }
    if (act === "jump") {
      state.section = el.dataset.to;
      $$(".cs-tab").forEach((b) => b.classList.toggle("is-on", b.dataset.csNav === state.section));
      renderSide(); loadSection(state.section);
      return;
    }
    if (act === "goal-new") return goalAction("new");
    if (act === "goal-seed") return seedLaunchGoals();
    if (act === "copy-link") {
      const url = "https://nownexts.com/webflow/p/" + (el.dataset.token || "");
      const done = () => WF.toast("📋 " + t("csCopied"), "success");
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, () => { window.prompt(t("csCopyLink"), url); });
        else window.prompt(t("csCopyLink"), url);
      } catch (e) { window.prompt(t("csCopyLink"), url); }
      return;
    }
    if (act === "pat-load") return loadPatterns();
    if (act === "archive-variants") {
      el.disabled = true;
      WF.apiRequest("/projects/archive-variants", { method: "POST", body: {} })
        .then((r) => { WF.toast("🧹 " + t("csArchived", { n: (r.archived || 0) }), "success"); loadPatterns(); })
        .catch((e) => WF.toast("⚠️ " + e.message, "error"));
      return;
    }
    if (act === "self-fix") return selfFix();
    if (act === "self-recheck") return renderSelfCheck(true);
    if (act === "goto") { const to = el.dataset.to || ""; if (to.startsWith("#/console/")) { const sec = to.split("/").pop(); const btn = document.querySelector(`[data-cs-nav='${sec}']`); if (btn) btn.click(); } else if (to) window.open(to, "_blank"); return; }
    if (act === "produce-new") { const f = $("#produceForm"); if (f) f.style.display = f.style.display === "none" ? "" : "none"; return; }
    if (act === "produce-run") return produceStart();
    if (act === "produce-open") return produceOpen(el.dataset.id);
    if (act === "produce-pack") return producePack(el.dataset.id);
    if (act === "produce-preview") { window.open(el.dataset.url, "_blank"); return; }
    if (act === "act-approve" || act === "act-reject") {
      el.disabled = true;
      const path = act === "act-approve" ? `/actions/${el.dataset.id}/approve` : `/actions/${el.dataset.id}/reject`;
      WF.apiRequest(path, { method: "POST", body: {} }).then((r) => {
        WF.toast(act === "act-approve" ? ((r.result && r.result.ok) ? "✅ " + t("csActDone") : "⚠️ " + ((r.result && (r.result.error || r.result.detail)) || "")) : "🚫 " + t("csActRejected"));
        loadCrossActions();
      }).catch((e) => { el.disabled = false; WF.toast("⚠️ " + e.message); });
      return;
    }
    if (act === "goal-run") return goalAction("run", el.dataset.id);
    if (act === "goal-pause") return goalAction("pause", el.dataset.id, el.dataset.on !== "1");
    if (act === "trace-lookup") return traceLookup();
    if (act === "lessons-refresh" || act === "lessons-load") return loadLessons();
    if (act === "caps-sync") return WF.apiRequest("/capabilities/sync", { method: "POST" }).then((r) => { WF.toast(t("csCapsSynced", { n: r.synced }), "success"); loadCapabilities(); }).catch((e) => WF.toast(e.message, "error"));
    if (act === "caps-find") return loadCapabilities((($("#capQ") || {}).value || "").trim());
    if (act === "id-lookup") return identityLookup();
    if (act === "api-key-add") {
      const name = window.prompt(t("csApiKeyName"), "agent") || "agent";
      const scopes = (window.prompt(t("csApiKeyScopes"), "read,write,growth,ingest") || "read,write,growth,ingest")
        .split(",").map((x) => x.trim()).filter((x) => ["read", "write", "growth", "ingest"].includes(x));
      const quota = Number(window.prompt(t("csApiKeyQuota"), "2000") || 2000) || 2000;
      return WF.apiRequest("/tools/keys", { method: "POST", body: JSON.stringify({ name, scopes, quota_per_day: quota }) }).then((r) => {
        // 只显示一次:用弹层展示,便于复制
        window.prompt(t("csApiKeyOnce"), r.key);
        loadApiKeys();
      }).catch((e) => WF.toast(e.message, "error"));
    }
    if (act === "api-key-del") {
      if (!window.confirm(t("csApiRevokeConfirm"))) return;
      return WF.apiRequest("/tools/keys/" + el.dataset.id, { method: "DELETE" }).then(() => { WF.toast(t("deleted"), "success"); loadApiKeys(); }).catch((e) => WF.toast(e.message, "error"));
    }
    if (act === "prop-approve") {
      el.disabled = true; el.textContent = "…";
      return WF.apiGrowthApprove(el.dataset.id).then(() => { WF.toast(t("csProposalApproved"), "success"); renderProposals(); renderGrowthAgents(); }).catch((e) => { WF.toast(e.message, "error"); el.disabled = false; });
    }
    if (act === "prop-reject") {
      const reason = window.prompt(t("csProposalRejectWhy"), "") || "";
      return WF.apiGrowthReject(el.dataset.id, reason).then(() => { WF.toast(t("csProposalRejected"), "success"); renderProposals(); }).catch((e) => WF.toast(e.message, "error"));
    }
    if (act === "agent-run") {
      el.disabled = true; el.textContent = "…";
      return WF.apiGrowthAgentRun(el.dataset.id).then((r) => {
        const s = r && (r.phase || r.skip);
        WF.toast(t("csAgentTick", { r: s || "-" }), (r && r.skip === "insufficient-traffic") ? "error" : "success");
        renderGrowthAgents();
      }).catch((e) => WF.toast(e.message, "error"));
    }
    if (act === "agent-toggle") {
      const on = el.dataset.on === "1";
      return WF.apiGrowthAgentSave(el.dataset.id, { enabled: !on }).then(() => { WF.toast(on ? t("csAgentPaused") : t("csAgentResumed"), "success"); renderGrowthAgents(); }).catch((e) => WF.toast(e.message, "error"));
    }
    if (act === "ref-set-default") return setRefDefaultVariant(el.dataset.exp, el.dataset.variant);
    if (act === "lark-save") return saveLark();
    if (act === "settle-mail") return mailSettlement(el.dataset.period);
    if (act === "mail-test") return mailTest();
    if (act === "alert-add") return addAlert();
    if (act === "alert-run") return runAlert(el.dataset.id);
    if (act === "alert-toggle") return (async () => { await WF.apiToggleAlert(el.dataset.id, el.dataset.enabled !== "1"); loadAlerts(); })();
    if (act === "alert-del") return (async () => { await WF.apiDeleteAlert(el.dataset.id); WF.toast(t("csDeleted"), "success"); loadAlerts(); })();
    if (act === "attr-by") { state.attrBy = el.dataset.by; loadAttribution(); return; }
    if (act === "reconcile-run") return runReconcile();
    if (act === "weekly-run") return runWeekly();
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
      if (e.payload && e.payload.quota) return showUpgrade(e.payload);
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
