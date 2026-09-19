/* ============================================================
 * WebsFlow · 状态存储 (store.js)
 *
 * 理念来源 — OpenFlow 迭代飞轮:
 *   - 自动保存心跳(改动 800ms 后落盘,顶栏可见保存状态)
 *   - 版本快照(手工 + 定时,最多 12 份,可随时回滚)
 *   - 撤销/重做(结构化操作历史,最多 60 步)
 * ============================================================ */
window.WF = window.WF || {};

(function (WF) {
  "use strict";

  const KEY = "websflow.v1";

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { console.warn("WebsFlow 存储读取失败", e); }
    return { projects: {}, firstRunDone: false };
  }

  function persist() {
    try {
      // 多页面模型:blocks 是「当前页」的运行时别名,不落盘(真源在 pages[])
      const out = { projects: {}, firstRunDone: DB.firstRunDone };
      Object.keys(DB.projects).forEach((id) => {
        const p = DB.projects[id];
        out.projects[id] = Object.assign({}, p, { blocks: undefined });   // variant/children 随 pages 落盘
      });
      localStorage.setItem(KEY, JSON.stringify(out));
    } catch (e) {
      console.warn("WebsFlow 保存失败(可能超出容量)", e);
      if (WF.toast) WF.toast("本地保存失败:内容可能超出浏览器容量,试试减小图片", "error");
    }
  }

  let DB = load();

  // ---------- 多页面模型 ----------
  // pages: [{ id, name, slug, blocks }];blocks 为运行时别名指向 activePage
  function pageSlug(name, i) {
    const base = String(name || "page").toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 24);
    return base || ("page-" + (i + 1));
  }

  WF.ensurePages = function (proj) {
    if (!proj) return proj;
    if (!Array.isArray(proj.pages) || !proj.pages.length) {
      proj.pages = [{ id: "main", name: "首页", slug: "", blocks: proj.blocks || [] }];
      proj.activePageId = "main";
    } else {
      proj.pages.forEach((pg, i) => {
        if (!pg.id) pg.id = "pg" + i;
        if (!Array.isArray(pg.blocks)) pg.blocks = [];
        if (pg.slug === undefined) pg.slug = i === 0 ? "" : pageSlug(pg.name, i);
      });
      if (!proj.activePageId || !proj.pages.some((x) => x.id === proj.activePageId)) {
        proj.activePageId = proj.pages[0].id;
      }
    }
    const active = proj.pages.find((x) => x.id === proj.activePageId) || proj.pages[0];
    proj.blocks = active.blocks; // 运行时别名
    return proj;
  };

  WF.activePage = function (proj) {
    WF.ensurePages(proj);
    return proj.pages.find((x) => x.id === proj.activePageId) || proj.pages[0];
  };

  // 硬化:整体替换模块数组时必须同时写回当前页(proj.blocks 只是别名)
  WF.setBlocks = function (proj, blocks) {
    WF.ensurePages(proj);
    const pg = WF.activePage(proj);
    pg.blocks = Array.isArray(blocks) ? blocks : [];
    proj.blocks = pg.blocks;
    persist();
    return proj.blocks;
  };

  WF.switchPage = function (proj, pageId) {
    WF.ensurePages(proj);
    if (!proj.pages.some((x) => x.id === pageId)) return false;
    proj.activePageId = pageId;
    proj.blocks = proj.pages.find((x) => x.id === pageId).blocks;
    return true;
  };

  WF.addPage = function (proj, name) {
    WF.ensurePages(proj);
    const i = proj.pages.length;
    const pg = { id: "pg" + Date.now().toString(36), name: name || ("页面 " + (i + 1)), slug: pageSlug(name, i), blocks: [] };
    proj.pages.push(pg);
    persist();
    return pg;
  };

  WF.removePage = function (proj, pageId) {
    WF.ensurePages(proj);
    if (proj.pages.length <= 1) return false;
    const idx = proj.pages.findIndex((x) => x.id === pageId);
    if (idx < 0) return false;
    proj.pages.splice(idx, 1);
    if (proj.activePageId === pageId) WF.switchPage(proj, proj.pages[Math.max(0, idx - 1)].id);
    persist();
    return true;
  };

  WF.pageSlugify = pageSlug;

  // ---------- 项目 CRUD ----------
  WF.createProject = function (name, mode, tplKey) {
    const preset = WF.templatesFor(mode).find((t) => t.key === tplKey) || WF.templatesFor(mode)[0];
    const content = WF.buildTemplate(tplKey || "blank", mode);
    const id = "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const theme = WF.defaultTheme();
    theme.preset = (preset && preset.theme) || "indigo";
    const proj = {
      id, name: name || "未命名项目", mode,
      theme,
      global: content.global || {},
      blocks: content.blocks || [],
      createdAt: Date.now(), updatedAt: Date.now(),
      versions: [],
    };
    proj.pages = [{ id: "main", name: "首页", slug: "", blocks: proj.blocks }];
    proj.activePageId = "main";
    DB.projects[id] = proj;
    persist();
    return proj;
  };

  WF.getProject = function (id) {
    const p = DB.projects[id];
    if (p) WF.ensurePages(p);
    return p || null;
  };
  WF.listProjects = () => Object.values(DB.projects).map((p) => WF.ensurePages(p)).sort((a, b) => b.updatedAt - a.updatedAt);
  WF.deleteProject = function (id) { delete DB.projects[id]; persist(); };

  WF.duplicateProject = function (id) {
    const src = DB.projects[id];
    if (!src) return null;
    const copy = JSON.parse(JSON.stringify(src));
    copy.id = "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    copy.name = src.name + " 副本";
    copy.createdAt = copy.updatedAt = Date.now();
    copy.versions = [];
    DB.projects[copy.id] = copy;
    persist();
    return copy;
  };

  // 导入 JSON 成为新项目
  WF.importProject = function (data) {
    if (!data || !Array.isArray(data.blocks) || !WF.Modes[data.mode]) throw new Error("不是有效的 WebsFlow 项目文件");
    const id = "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const proj = {
      id,
      name: (data.name || "导入的项目") + "",
      mode: data.mode,
      theme: data.theme || WF.defaultTheme(),
      global: data.global || {},
      blocks: (Array.isArray(data.blocks) ? data.blocks : []).map((b) => WF.normalizeBlock(b)),
      createdAt: Date.now(), updatedAt: Date.now(),
      versions: [],
    };
    // 多页面数据:保留 pages 结构
    if (Array.isArray(data.pages) && data.pages.length) {
      proj.pages = data.pages.map((pg, i) => ({
        id: pg.id || ("pg" + i),
        name: pg.name || ("页面 " + (i + 1)),
        slug: pg.slug === undefined ? (i === 0 ? "" : WF.pageSlugify(pg.name, i)) : pg.slug,
        blocks: (pg.blocks || []).map((b) => WF.normalizeBlock(b)).filter(Boolean),
      }));
      proj.activePageId = proj.pages[0].id;
    }
    WF.ensurePages(proj);
    DB.projects[id] = proj;
    persist();
    return proj;
  };

  WF.normalizeBlock = function (b) {
    const def = WF.Blocks[b.type];
    if (!def) return null;
    const nb = {
      id: b.id || "b" + Math.random().toString(36).slice(2, 9),
      type: b.type,
      props: Object.assign(JSON.parse(JSON.stringify(def.defaults)), b.props || {}),
      hidden: !!b.hidden,
      style: Object.assign({ bg: "", padding: "normal", anim: "up" }, b.style || {}),
    };
    if (def.variants) {
      const keys = def.variants.map(([k]) => k);
      nb.variant = keys.includes(b.variant) ? b.variant : (def.defaultVariant || keys[0]);
    }
    if (def.container) {
      nb.children = (Array.isArray(b.children) ? b.children : [])
        .map((c) => WF.normalizeBlock(c)).filter(Boolean);
    }
    if (b.audience) nb.audience = Object.assign({}, b.audience);
    if (b.personalize) nb.personalize = JSON.parse(JSON.stringify(b.personalize));
    return nb;
  };

  WF.isFirstRun = () => !DB.firstRunDone;
  WF.markFirstRun = function () { DB.firstRunDone = true; persist(); };

  // ---------- 编辑会话:撤销 / 重做 / 快照 ----------
  WF.Session = function (proj) {
    const snap = () => JSON.stringify({ blocks: proj.blocks, global: proj.global, theme: proj.theme });
    let undoStack = [snap()];
    let redoStack = [];
    let lastSnap = snap();
    let lastSnapAt = 0;
    let saveTimer = null;
    let versionTimer = null;

    function scheduleSave() {
      proj.updatedAt = Date.now();
      if (WF.Editor) WF.Editor.saveStatus("saving");
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        persist();
        if (WF.Editor) WF.Editor.saveStatus("saved");
      }, 800);
    }

    // 定时版本快照:每 4 分钟,有改动才存(心跳)
    versionTimer = setInterval(() => {
      if (snap() !== lastSnap) WF.Session.autoSnapshot(proj);
    }, 4 * 60 * 1000);

    return {
      // 每次“结构性/终态”变更后调用:输入类变更请传 coalesce 键,600ms 内合并
      commit(coalesceKey) {
        const now = Date.now();
        const s = snap();
        if (s === undoStack[undoStack.length - 1]) return;
        if (coalesceKey && this._lastKey === coalesceKey && now - lastSnapAt < 600) {
          lastSnapAt = now; lastSnap = s;
        } else {
          undoStack.push(lastSnap);
          if (undoStack.length > 60) undoStack.shift();
          redoStack = [];
          this._lastKey = coalesceKey || null;
          lastSnapAt = now; lastSnap = s;
        }
        scheduleSave();
      },
      undo() {
        if (undoStack.length <= 1) return false;
        redoStack.push(snap());
        const prev = undoStack.pop();
        this._apply(prev);
        return true;
      },
      redo() {
        if (!redoStack.length) return false;
        undoStack.push(snap());
        const next = redoStack.pop();
        this._apply(next);
        return true;
      },
      _apply(s) {
        const data = JSON.parse(s);
        proj.blocks = data.blocks;
        // 多页面模型:同步写回当前页,避免别名被 ensurePages 覆盖
        try {
          const pg = WF.activePage ? WF.activePage(proj) : null;
          if (pg) pg.blocks = data.blocks;
        } catch (e) {}
        proj.global = data.global;
        proj.theme = data.theme;
        lastSnap = snap();
        scheduleSave();
        if (WF.Editor) WF.Editor.refreshAll();
      },
      destroy() { clearInterval(versionTimer); clearTimeout(saveTimer); persist(); },
    };
  };

  // ---------- 版本快照 ----------
  WF.Session.autoSnapshot = function (proj) {
    WF.Session.snapshot(proj, new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }) + " 自动保存", true);
  };
  WF.Session.snapshot = function (proj, name, isAuto) {
    proj.versions = proj.versions || [];
    proj.versions.unshift({
      name: (name || "手动快照") + (isAuto ? "" : ""),
      time: Date.now(),
      isAuto: !!isAuto,
      data: JSON.stringify({ blocks: proj.blocks, global: proj.global, theme: proj.theme }),
    });
    // 手动快照保留全部,自动快照最多 6 份
    const autos = proj.versions.filter((v) => v.isAuto);
    if (autos.length > 6) {
      const drop = autos[autos.length - 1];
      proj.versions = proj.versions.filter((v) => v !== drop);
    }
    if (proj.versions.length > 12) proj.versions = proj.versions.slice(0, 12);
    persist();
  };
  WF.Session.restore = function (proj, version) {
    const data = JSON.parse(version.data);
    proj.blocks = data.blocks;
    proj.global = data.global;
    proj.theme = data.theme;
    proj.updatedAt = Date.now();
    persist();
  };

  // 导出用:干净的分享数据(不含版本历史)
  WF.exportData = function (proj) {
    return {
      app: "websflow", version: 1,
      name: proj.name, mode: proj.mode,
      theme: proj.theme, global: proj.global,
      blocks: proj.blocks,
      exportedAt: new Date().toISOString(),
    };
  };
})(window.WF);
