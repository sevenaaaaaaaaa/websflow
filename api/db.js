/* ============================================================
 * WebsFlow · 数据库模块 (db.js)
 * 使用 sql.js 实现轻量级本地数据库（纯 JS，无需编译）
 * ============================================================ */

const initSqlJs = require('sql.js');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const bcrypt = require('bcryptjs');
const { sanitizePluginHtml, sanitizeFields } = require('./lib/sanitize');
const { v4: uuidv4 } = require('uuid');

// 数据库文件路径
const DB_PATH = process.env.WF_DB_PATH || path.join(__dirname, 'websflow.db');

let db = null;

// ============================================================
//  驱动适配层:优先 better-sqlite3(原生 + WAL),不可用则回退 sql.js
//  两者都暴露同一组方法:run(sql, params) / prepare(sql) / export()
//  这样上层(以及全部既有查询代码)无需任何改动。
// ============================================================
let DRIVER = "sqljs";
let nativeDb = null;

function makeBetterAdapter(native) {
  return {
    _native: native,
    run(sql, params) {
      const text = String(sql);
      // 多语句(分号隔开)走 exec;单语句走 prepare 以便绑定参数
      if (!params || !params.length) {
        if (text.indexOf(";") !== -1 && text.trim().replace(/;+\s*$/, "").indexOf(";") !== -1) {
          return native.exec(text);
        }
        return native.prepare(text).run();
      }
      return native.prepare(text).run(params);
    },
    prepare(sql) {
      // 模拟 sql.js 的 step/getAsObject 迭代协议
      const stmt = native.prepare(sql);
      const columns = stmt.columns().map((c) => c.name);
      let rows = null, idx = -1, current = null;
      return {
        bind(params) { rows = stmt.raw().all(params || []); },
        step() {
          if (rows === null) rows = stmt.raw().all();   // 未 bind 时无参执行
          idx++;
          if (idx >= rows.length) return false;
          const r = rows[idx];
          current = {};
          columns.forEach((c, i) => { current[c] = r[i]; });
          return true;
        },
        getAsObject() { return current || {}; },
        free() { try { stmt.free ? stmt.free() : null; } catch (e) {} },
      };
    },
    export() { return null; },   // 原生驱动无需导出(直接落盘)
  };
}

function openBetter() {
  const Better = require('better-sqlite3');
  const native = new Better(DB_PATH);
  native.pragma('journal_mode = WAL');
  native.pragma('synchronous = NORMAL');
  native.pragma('busy_timeout = 5000');
  native.pragma('foreign_keys = ON');
  DRIVER = 'better-sqlite3';
  return makeBetterAdapter(native);
}


// ============================================================
//  初始化数据库
// ============================================================

async function initDatabase() {
  // 驱动选择(WF_DB_DRIVER):
  //   auto(默认) 优先 better-sqlite3,失败回退 sql.js
  //   better     强制原生,不可用则直接失败(避免"以为切了其实没切")
  //   sqljs      强制回退(显式跳过原生探测)
  const wantDriver = String(process.env.WF_DB_DRIVER || 'auto').toLowerCase();
  if (wantDriver === 'sqljs') {
    console.log('[db] 驱动: sql.js(按 WF_DB_DRIVER=sqljs 强制)');
  } else {
    try {
      db = openBetter();
      console.log('[db] 驱动: better-sqlite3 (WAL 模式,写入直接落盘,无整库导出)');
    } catch (e) {
      if (wantDriver === 'better') throw new Error('WF_DB_DRIVER=better 但原生驱动不可用: ' + e.message);
      console.warn('[db] better-sqlite3 不可用,回退 sql.js:', e.message);
    }
  }
  if (!db) {
    const SQL = await initSqlJs();
    if (fs.existsSync(DB_PATH)) {
      const fileBuffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(fileBuffer);
    } else {
      db = new SQL.Database();
    }
    DRIVER = 'sqljs';
    // 启动时重放日志(崩溃后未合并的写入在这里补齐)
    try { replayJournal(); } catch (e) { console.error('[db] 启动重放失败:', e.message); }
  }
  
  // 创建表
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT,
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      mode TEXT NOT NULL DEFAULT 'site',
      description TEXT,
      thumbnail TEXT,
      data TEXT NOT NULL,
      is_public INTEGER DEFAULT 0,
      share_token TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS project_versions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      goal_id TEXT NOT NULL,
      type TEXT DEFAULT 'cta_click',
      url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      project_name TEXT,
      url TEXT,
      seg TEXT,
      form_id TEXT,
      data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS alert_rules (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT,
      project_id TEXT,
      metric TEXT NOT NULL,
      operator TEXT NOT NULL,
      threshold REAL NOT NULL,
      window_minutes INTEGER DEFAULT 30,
      action TEXT DEFAULT 'notify',
      enabled INTEGER DEFAULT 1,
      cooldown_minutes INTEGER DEFAULT 60,
      last_fired_at DATETIME,
      last_value REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS weekly_reports (
      id TEXT PRIMARY KEY,
      period TEXT UNIQUE,
      data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS reconcile_reports (
      id TEXT PRIMARY KEY,
      data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS settlements (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      period TEXT NOT NULL,
      data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, period)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS payouts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      amount REAL NOT NULL,
      method TEXT,
      account TEXT,
      status TEXT DEFAULT 'requested',
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      processed_at DATETIME
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS payflow_orders (
      order_no TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      product_id TEXT,
      amount_cents INTEGER DEFAULT 0,
      status TEXT DEFAULT 'created',
      pay_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      applied_at DATETIME
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS scheduled_tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      project_id TEXT,
      kind TEXT DEFAULT 'inspect',
      prompt TEXT,
      enabled INTEGER DEFAULT 1,
      last_run_at DATETIME,
      last_result TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS copilot_tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      author TEXT,
      name TEXT NOT NULL,
      prompt TEXT NOT NULL,
      params TEXT,
      status TEXT DEFAULT 'pending',
      featured INTEGER DEFAULT 0,
      uses INTEGER DEFAULT 0,
      reviewer_note TEXT,
      reviewed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      kind TEXT DEFAULT 'info',
      title TEXT NOT NULL,
      body TEXT,
      link TEXT,
      read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS activation_codes (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      kind TEXT NOT NULL DEFAULT 'pro',
      value REAL DEFAULT 0,
      note TEXT,
      used_by TEXT,
      used_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      template_id TEXT,
      buyer_id TEXT,
      seller_id TEXT,
      amount REAL DEFAULT 0,
      seller_share REAL DEFAULT 0,
      platform_share REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS plugins (
      id TEXT PRIMARY KEY,
      owner_id TEXT,
      name TEXT NOT NULL,
      block_type TEXT NOT NULL,
      description TEXT,
      fields TEXT,
      template TEXT,
      enabled INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS community_templates (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      author TEXT,
      name TEXT NOT NULL,
      mode TEXT NOT NULL DEFAULT 'site',
      description TEXT,
      data TEXT NOT NULL,
      downloads INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS growth_agent_config (
      project_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      enabled INTEGER DEFAULT 0,
      min_views INTEGER DEFAULT 50,
      max_rounds INTEGER DEFAULT 5,
      cooldown_hours INTEGER DEFAULT 12,
      hold_hours INTEGER DEFAULT 48,
      auto_promote INTEGER DEFAULT 1,
      last_tick_at DATETIME,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 事件日聚合:原始事件保留有限天数,长期趋势靠日粒度(体积小、查询快)
  db.run(`
    CREATE TABLE IF NOT EXISTS event_daily (
      project_id TEXT NOT NULL,
      day TEXT NOT NULL,
      goal_id TEXT,
      type TEXT NOT NULL,
      n INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (project_id, day, goal_id, type)
    )
  `);

  // 身份打通(G2):一个人的统一身份 + 各系统的标识链接(vid/uid/payflow_ref/email/phone)
  db.run(`
    CREATE TABLE IF NOT EXISTS identities (
      id TEXT PRIMARY KEY,
      first_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      traits TEXT,
      merged_into TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS identity_links (
      id TEXT PRIMARY KEY,
      identity_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      value TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 平台能力目录(G3):每个系统"能做什么、怎么调、要什么权限"
  // 平台经验契约(G4):任何系统都能记录"场景→动作→结果",供所有系统复用/规避
  // 目标驱动编排(阶段三):给 KPI,而非给操作
  db.run(`
    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      project_id TEXT,
      name TEXT,
      metric TEXT NOT NULL,
      direction TEXT DEFAULT 'up',
      target REAL NOT NULL,
      window_days INTEGER DEFAULT 7,
      deadline TEXT,
      enabled INTEGER DEFAULT 1,
      status TEXT DEFAULT 'active',
      last_value REAL,
      last_eval_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS goal_cycles (
      id TEXT PRIMARY KEY,
      goal_id TEXT NOT NULL,
      value REAL,
      target REAL,
      gap REAL,
      action TEXT,
      detail TEXT,
      ref TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS pattern_packs (
      id TEXT PRIMARY KEY,
      owner_id TEXT,
      name TEXT,
      author TEXT,
      version TEXT,
      patterns TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS pattern_stats (
      user_id TEXT,
      pattern_key TEXT,
      uses INTEGER DEFAULT 0,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      qa_issues INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, pattern_key)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS self_checks (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      ok INTEGER,
      warns INTEGER,
      report TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS productions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      brief TEXT,
      status TEXT DEFAULT 'running',
      steps TEXT,
      result TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS cross_actions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      project_id TEXT,
      goal_id TEXT,
      trace_id TEXT,
      capability_id TEXT NOT NULL,
      system TEXT,
      kind TEXT,
      title TEXT,
      reason TEXT,
      payload TEXT,
      status TEXT DEFAULT 'pending',
      requires_approval INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      decided_at DATETIME,
      decided_by TEXT,
      result TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS lessons (
      id TEXT PRIMARY KEY,
      system TEXT NOT NULL,
      scope TEXT,
      scene TEXT NOT NULL,
      action TEXT NOT NULL,
      action_label TEXT,
      outcome TEXT NOT NULL,
      metric TEXT,
      delta REAL,
      weight REAL DEFAULT 1,
      source TEXT DEFAULT 'observed',
      detail TEXT,
      ref TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS capabilities (
      id TEXT PRIMARY KEY,
      system TEXT NOT NULL,
      name TEXT,
      description TEXT,
      kind TEXT DEFAULT 'action',
      params TEXT,
      returns TEXT,
      auth TEXT,
      scopes TEXT,
      endpoint TEXT,
      invoke TEXT DEFAULT 'http',
      status TEXT DEFAULT 'active',
      version TEXT DEFAULT '1',
      source TEXT DEFAULT 'registered',
      owner_user_id TEXT,
      last_verified_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS api_audit (
      id TEXT PRIMARY KEY,
      key_id TEXT,
      user_id TEXT,
      action TEXT,
      detail TEXT,
      ok INTEGER DEFAULT 1,
      error TEXT,
      ms INTEGER,
      ip TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT,
      key_prefix TEXT,
      key_hash TEXT NOT NULL,
      scopes TEXT,
      last_used_at DATETIME,
      revoked_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS preview_pages (
      token TEXT PRIMARY KEY,
      user_id TEXT,
      project_id TEXT,
      proposal_id TEXT,
      side TEXT,
      data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS growth_proposals (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      user_id TEXT,
      round INTEGER DEFAULT 1,
      objective TEXT,
      hypothesis TEXT,
      reason TEXT,
      theme TEXT,
      categories TEXT,
      ops TEXT,
      stats_before TEXT,
      base_goal TEXT,
      status TEXT DEFAULT 'pending',
      decided_by TEXT,
      decided_at DATETIME,
      reject_reason TEXT,
      run_id TEXT,
      agent_context TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS growth_guard_events (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      user_id TEXT,
      kind TEXT,
      detail TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS growth_runs (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      user_id TEXT,
      round INTEGER DEFAULT 1,
      status TEXT DEFAULT 'running',
      hypothesis TEXT,
      reason TEXT,
      base_goal TEXT,
      ops TEXT,
      variants TEXT,
      stats_before TEXT,
      result TEXT,
      decision TEXT,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      concluded_at DATETIME
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS layout_presets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      author TEXT,
      name TEXT NOT NULL,
      layout TEXT NOT NULL,
      scope TEXT DEFAULT 'team',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS community_blocks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      data TEXT NOT NULL,
      downloads INTEGER DEFAULT 0,
      rating REAL DEFAULT 0,
      tags TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  
  // 索引:按实际查询路径补齐(此前一个索引都没有,聚合查询全表扫描)
  const INDEXES = [
    'CREATE INDEX IF NOT EXISTS idx_events_proj_time ON events(project_id, created_at)',
    'CREATE INDEX IF NOT EXISTS idx_events_type_time ON events(type, created_at)',
    'CREATE INDEX IF NOT EXISTS idx_events_goal ON events(goal_id)',
    'CREATE INDEX IF NOT EXISTS idx_events_time ON events(created_at)',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_events_uid_ext ON events(event_id) WHERE event_id IS NOT NULL',
    'CREATE INDEX IF NOT EXISTS idx_events_uid ON events(uid)',

    'CREATE UNIQUE INDEX IF NOT EXISTS idx_apikeys_hash ON api_keys(key_hash)',
    'CREATE INDEX IF NOT EXISTS idx_leads_proj_time ON leads(project_id, created_at)',
    'CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id, updated_at)',
    'CREATE INDEX IF NOT EXISTS idx_versions_proj ON project_versions(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_notify_user_read ON notifications(user_id, read)',
    'CREATE INDEX IF NOT EXISTS idx_sched_user ON scheduled_tasks(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_growth_runs_proj ON growth_runs(project_id, status)',
    'CREATE INDEX IF NOT EXISTS idx_growth_props_proj ON growth_proposals(project_id, status)',
    'CREATE INDEX IF NOT EXISTS idx_growth_props_user ON growth_proposals(user_id, status)',
    'CREATE INDEX IF NOT EXISTS idx_preview_exp ON preview_pages(expires_at)',
    'CREATE INDEX IF NOT EXISTS idx_identity_links ON identity_links(kind, value)',
    'CREATE INDEX IF NOT EXISTS idx_identity_of ON identity_links(identity_id)',
    'CREATE INDEX IF NOT EXISTS idx_events_identity ON events(identity_id)',
    'CREATE INDEX IF NOT EXISTS idx_events_trace ON events(trace_id)',
    'CREATE INDEX IF NOT EXISTS idx_leads_trace ON leads(trace_id)',
    'CREATE INDEX IF NOT EXISTS idx_apikeys_hash ON api_keys(key_hash)',
    'CREATE INDEX IF NOT EXISTS idx_cap_system ON capabilities(system, kind)',
    'CREATE INDEX IF NOT EXISTS idx_lessons_scene ON lessons(system, scene, action)',
    'CREATE INDEX IF NOT EXISTS idx_lessons_scope ON lessons(scope)',
    'CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id, status)',
    'CREATE INDEX IF NOT EXISTS idx_goal_cycles ON goal_cycles(goal_id, created_at)',
    'CREATE INDEX IF NOT EXISTS idx_cross_actions ON cross_actions(status, created_at)',
    'CREATE INDEX IF NOT EXISTS idx_cross_actions_goal ON cross_actions(goal_id, created_at)',
    'CREATE INDEX IF NOT EXISTS idx_cap_status ON capabilities(status)',
  ];
  INDEXES.forEach((sql) => { try { db.run(sql); } catch (e) { console.warn('[db] 建索引失败:', e.message); } });

  // 迁移:事件分群标记(千人千面归因)
  ensureColumn('projects', 'archived', 'archived INTEGER DEFAULT 0');
  ensureColumn('events', 'seg', 'seg TEXT');
  // 迁移:访客标识与来源(在线访客 / 来源分布)
  ensureColumn('events', 'vid', 'vid TEXT');
  // 增长目标(多目标):cta_click 抽点击 | lead 抽表单线索
// 增长轮次:改动归类 / 语义主题 / 当时用到的经验(便于审计"Agent 知道什么")
  ensureColumn('growth_agent_config', 'objective', "objective TEXT DEFAULT 'cta_click'");
  // 风险闸门(自动暂停保护)
  ensureColumn('growth_agent_config', 'guard_enabled', 'guard_enabled INTEGER DEFAULT 1');
  ensureColumn('growth_agent_config', 'guard_min_views', 'guard_min_views INTEGER DEFAULT 50');
  ensureColumn('growth_agent_config', 'guard_drop_pct', 'guard_drop_pct INTEGER DEFAULT 60');
  ensureColumn('growth_agent_config', 'guard_window_hours', 'guard_window_hours INTEGER DEFAULT 6');
  ensureColumn('growth_agent_config', 'guard_max_inconclusive', 'guard_max_inconclusive INTEGER DEFAULT 3');
  ensureColumn('growth_agent_config', 'paused_reason', 'paused_reason TEXT');
  // 人审模式:AI 只出方案,人工确认后才发布
  ensureColumn('api_keys', 'quota_per_day', 'quota_per_day INTEGER DEFAULT 2000');
  ensureColumn('api_keys', 'calls_today', 'calls_today INTEGER DEFAULT 0');
  ensureColumn('api_keys', 'calls_day', 'calls_day TEXT');
  // G6:能力弃用策略
  ensureColumn('capabilities', 'deprecated_at', 'deprecated_at DATETIME');
  ensureColumn('capabilities', 'replaced_by', 'replaced_by TEXT');
  ensureColumn('growth_agent_config', 'approval_mode', 'approval_mode INTEGER DEFAULT 0');
  // 提案的可视化预览(A/B 两份未发布页面)
  ensureColumn('growth_proposals', 'preview_a', 'preview_a TEXT');
  ensureColumn('growth_proposals', 'preview_b', 'preview_b TEXT');
  ensureColumn('growth_agent_config', 'proposal_ttl_hours', 'proposal_ttl_hours INTEGER DEFAULT 48');
  ensureColumn('growth_agent_config', 'paused_at', 'paused_at DATETIME');
  // 事件回传总线(G1):外部事件幂等 id / 身份 / 数值
  ensureColumn('events', 'event_id', 'event_id TEXT');
  ensureColumn('events', 'uid', 'uid TEXT');
  ensureColumn('events', 'value', 'value REAL');
  ensureColumn('events', 'identity_id', 'identity_id TEXT');
  ensureColumn('events', 'trace_id', 'trace_id TEXT');
  ensureColumn('leads', 'trace_id', 'trace_id TEXT');
  ensureColumn('payflow_orders', 'trace_id', 'trace_id TEXT');
  ensureColumn('api_audit', 'trace_id', 'trace_id TEXT');
  ensureColumn('leads', 'identity_id', 'identity_id TEXT');
  ensureColumn('payflow_orders', 'identity_id', 'identity_id TEXT');
  ensureColumn('growth_runs', 'categories', 'categories TEXT');
  ensureColumn('growth_runs', 'theme', 'theme TEXT');
  ensureColumn('growth_runs', 'agent_context', 'agent_context TEXT');
  ensureColumn('events', 'src', 'src TEXT');

  // 迁移:PayFlow 推荐映射(委派模式)
  ensureColumn('users', 'payflow_ref_code', 'payflow_ref_code TEXT');

  // 迁移:邀请页默认版本(A/B 自动选优)
  ensureColumn('users', 'ref_variant', 'ref_variant TEXT');
  ensureColumn('users', 'ref_variant_exp', 'ref_variant_exp TEXT');

  // 迁移:UTM 渠道(注册来源)
  ensureColumn('users', 'utm_source', 'utm_source TEXT');
  ensureColumn('users', 'utm_medium', 'utm_medium TEXT');
  ensureColumn('users', 'utm_campaign', 'utm_campaign TEXT');

  // 迁移:实名信息(提现风控)
  ensureColumn('users', 'real_name', 'real_name TEXT');
  ensureColumn('users', 'phone', 'phone TEXT');
  ensureColumn('users', 'verified', 'verified INTEGER DEFAULT 0');
  ensureColumn('users', 'verified_at', 'verified_at DATETIME');

  // 迁移:宽限期
  ensureColumn('users', 'grace_until', 'grace_until DATETIME');
  // 迁移:推荐裂变 + 到期提醒去重
  ensureColumn('users', 'referral_code', 'referral_code TEXT');
  ensureColumn('users', 'referred_by', 'referred_by TEXT');
  ensureColumn('users', 'plan_notice_at', 'plan_notice_at DATETIME');

  // 迁移:管理员标记
  ensureColumn('users', 'is_admin', 'is_admin INTEGER DEFAULT 0');
  // 迁移:插件市场字段
  ensureColumn('plugins', 'price', 'price REAL DEFAULT 0');
  ensureColumn('plugins', 'status', "status TEXT DEFAULT 'pending'");
  ensureColumn('plugins', 'uses', 'uses INTEGER DEFAULT 0');
  ensureColumn('plugins', 'reviewer_note', 'reviewer_note TEXT');
  ensureColumn('plugins', 'reviewed_at', 'reviewed_at DATETIME');
  // 迁移:模板审核与推荐位
  ensureColumn('community_templates', 'status', "status TEXT DEFAULT 'pending'");
  ensureColumn('community_templates', 'featured', 'featured INTEGER DEFAULT 0');
  ensureColumn('community_templates', 'reviewer_note', 'reviewer_note TEXT');
  ensureColumn('community_templates', 'reviewed_at', 'reviewed_at DATETIME');
  // 历史数据:无状态视为已过审
  run("UPDATE plugins SET status = 'approved' WHERE status IS NULL");
  run("UPDATE community_templates SET status = 'approved' WHERE status IS NULL");

  // 迁移:用户套餐与余额
  ensureColumn('users', 'plan', "plan TEXT DEFAULT 'free'");
  ensureColumn('users', 'plan_expires_at', 'plan_expires_at DATETIME');
  ensureColumn('users', 'balance', 'balance REAL DEFAULT 0');
  // 迁移:模板价格
  ensureColumn('community_templates', 'price', 'price REAL DEFAULT 0');

  // 迁移:为老库补 published / published_at 列
  ensureColumn('projects', 'published', 'published INTEGER DEFAULT 0');
  ensureColumn('projects', 'published_at', 'published_at DATETIME');

  // 管理员:环境变量名单 + 首个用户兜底
  const adminEmails = (process.env.WEBSFLOW_ADMINS || '').split(',').map((x) => x.trim()).filter(Boolean);
  adminEmails.forEach((em) => run('UPDATE users SET is_admin = 1 WHERE email = ?', [em]));
  const anyAdmin = queryOne('SELECT id FROM users WHERE is_admin = 1 LIMIT 1');
  if (!anyAdmin) {
    const first = queryOne('SELECT id FROM users ORDER BY created_at ASC LIMIT 1');
    if (first) run('UPDATE users SET is_admin = 1 WHERE id = ?', [first.id]);
  }

  // 种子激活码(演示用,可在后台生成更多)
  const seeds = [
    ['WEBSFLOW-PRO-30', 'pro', 30, '专业版 30 天'],
    ['WEBSFLOW-BALANCE-50', 'balance', 50, '余额 50 元'],
  ];
  seeds.forEach(([code, kind, value, note]) => {
    const exists = queryOne('SELECT id FROM activation_codes WHERE code = ?', [code]);
    if (!exists) run('INSERT INTO activation_codes (id, code, kind, value, note) VALUES (?, ?, ?, ?, ?)', [uuidv4(), code, kind, value, note]);
  });

  // 保存数据库
  saveDatabase();
  auditUserColumns();
  console.log('数据库初始化完成');
}

// 用户对外列清单(唯一真源:新增列必须加在这里,否则接口读不到)
const USER_COLUMNS = [
  'id', 'username', 'email', 'display_name', 'avatar',
  'plan', 'plan_expires_at', 'grace_until', 'plan_notice_at', 'balance', 'is_admin',
  'referral_code', 'referred_by', 'ref_variant', 'ref_variant_exp', 'payflow_ref_code',
  'real_name', 'phone', 'verified', 'verified_at',
  'utm_source', 'utm_medium', 'utm_campaign',
  'created_at', 'updated_at',
].join(', ');

// 启动自检:users 表有列但未列入 USER_COLUMNS 时告警(防止"加了列却读不到")
function auditUserColumns() {
  try {
    const cols = query('PRAGMA table_info(users)').map((c) => c.name);
    const listed = new Set(USER_COLUMNS.split(',').map((x) => x.trim()));
    const missing = cols.filter((c) => c !== 'password_hash' && !listed.has(c));
    if (missing.length) console.warn('[db] USER_COLUMNS 未包含的列(接口将读不到):', missing.join(', '));
    return missing;
  } catch (e) { return []; }
}

// 列迁移助手:列不存在时补列
function ensureColumn(table, column, ddl) {
  try {
    const cols = query(`PRAGMA table_info(${table})`);
    if (!cols.some((c) => c.name === column)) {
      db.run(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
      console.log(`迁移:${table}.${column} 已补列`);
    }
  } catch (e) {
    console.warn(`迁移 ${table}.${column} 失败:`, e.message);
  }
}

// 保存数据库到文件

// ============================================================
//  写入日志(WAL 式):把"每次写都整库导出"换成"追加一行日志"
//  - run(): 内存执行 + 追加 journal(成本 O(1)),写入即刻持久
//  - 启动:加载快照后重放 journal(用 PRAGMA user_version 做幂等,避免重复应用)
//  - 合并:每 N 次写或 T 秒把内存导出为快照(原子 rename)并清空 journal
//  这台服务器(glibc 2.17 / g++ 4.8)无法使用原生 SQLite,因此用该方案消除扩展性悬崖。
// ============================================================
const JOURNAL_PATH = DB_PATH + '.journal';
let journalWrites = 0;
const RAW_RETENTION_DAYS = Math.max(7, Number(process.env.WF_RAW_EVENT_DAYS) || 45);
let lastCompactAt = Date.now();
const COMPACT_EVERY_WRITES = Math.max(20, Number(process.env.WF_JOURNAL_COMPACT_WRITES) || 400);
const COMPACT_EVERY_MS = Math.max(1000, Number(process.env.WF_JOURNAL_COMPACT_MS) || 20000);

function userVersion() {
  try { const r = queryOne('PRAGMA user_version'); return (r && (r.user_version || r['user_version()'] || 0)) || 0; } catch (e) { return 0; }
}
function setUserVersion(n) { try { db.run('PRAGMA user_version = ' + (Number(n) || 0)); } catch (e) {} }

// 必须同步追加:WriteStream 是异步缓冲,进程硬崩溃会丢缓冲 → 写入丢失(实测踩到)
function appendJournal(sql, params, seq) {
  try {
    fs.appendFileSync(JOURNAL_PATH, JSON.stringify({ seq, sql, params: params || [] }) + '\n');
  } catch (e) { console.error('[db] 写日志失败:', e.message); }
}

function truncateJournal() {
  try { fs.writeFileSync(JOURNAL_PATH, ''); } catch (e) { console.error('[db] 清空日志失败:', e.message); }
}

function replayJournal() {
  if (DRIVER === 'better-sqlite3') return 0;   // 原生驱动无需重放
  if (!fs.existsSync(JOURNAL_PATH)) return 0;
  let applied = 0;
  try {
    const cur = userVersion();
    const lines = fs.readFileSync(JOURNAL_PATH, 'utf8').split('\n');
    lines.forEach((line) => {
      if (!line) return;
      let item = null;
      try { item = JSON.parse(line); } catch (e) { return; }
      if (!item || !item.sql) return;
      if ((item.seq || 0) <= cur) return;        // 已包含在快照里,跳过(幂等)
      try { db.run(item.sql, item.params || []); applied++; } catch (e) { console.warn('[db] 重放失败:', e.message); }
    });
    console.log('[db] 重放写入日志:', applied, '条(快照 user_version=' + cur + ')');
  } catch (e) { console.error('[db] 重放日志失败:', e.message); }
  return applied;
}

// 合并:导出快照(原子替换)+ 记录已包含的序号 + 清空日志
function compactDatabase(force) {
  if (!db || DRIVER === 'better-sqlite3') return;
  if (!force && journalWrites < COMPACT_EVERY_WRITES && Date.now() - lastCompactAt < COMPACT_EVERY_MS) return;
  try {
    setUserVersion(userVersion() + journalWrites);
    const buf = Buffer.from(db.export());
    const tmp = DB_PATH + '.tmp';
    fs.writeFileSync(tmp, buf);
    fs.renameSync(tmp, DB_PATH);      // 原子替换
    truncateJournal();
    journalWrites = 0;
    lastCompactAt = Date.now();
  } catch (e) {
    console.error('[db] 合并失败:', e.message);
  }
}

// 防抖落盘:sql.js 每次导出都是"整库序列化 + 整文件写",写入成本随库增长线性上升。
// 策略:写操作后仅安排一次延迟落盘(默认 400ms,最多延迟 1.5s),进程退出前强制刷盘。

function flushDatabase() {
  if (!db) return;
  if (DRIVER === 'better-sqlite3') {
    // 原生驱动:写入已落盘,这里只做 WAL checkpoint,保证单文件可复制
    try { db._native.pragma('wal_checkpoint(TRUNCATE)'); } catch (e) {}
    return;
  }
  compactDatabase(true);   // 强制合并(导出快照 + 清空日志)
}

function saveDatabase() {
  // 兼容保留:写入已通过日志即时持久,这里只按需触发一次合并
  if (!db || DRIVER === 'better-sqlite3') return;
  if (Date.now() - lastCompactAt >= COMPACT_EVERY_MS) compactDatabase(true);
}

// 退出前刷盘,避免丢最后一批写入
["SIGINT", "SIGTERM"].forEach((sig) => process.on(sig, () => { flushDatabase(); process.exit(0); }));
process.on("beforeExit", () => flushDatabase());

// ============================================================
//  辅助函数
// ============================================================

// 执行查询并返回结果
function query(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) {
    stmt.bind(params);
  }
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

// 执行单条查询
function queryOne(sql, params = []) {
  const results = query(sql, params);
  return results.length > 0 ? results[0] : null;
}

// 执行更新
function run(sql, params = []) {
  db.run(sql, params);
  if (DRIVER === 'better-sqlite3') return;   // 原生驱动直接落盘
  journalWrites++;
  appendJournal(sql, params, userVersion() + journalWrites);
  if (journalWrites >= COMPACT_EVERY_WRITES || Date.now() - lastCompactAt >= COMPACT_EVERY_MS) compactDatabase();
}

// ============================================================
//  用户操作
// ============================================================

function createUser(username, email, password) {
  const id = uuidv4();
  const passwordHash = bcrypt.hashSync(password, 10);
  
  run(
    'INSERT INTO users (id, username, email, password_hash, display_name) VALUES (?, ?, ?, ?, ?)',
    [id, username, email, passwordHash, username]
  );
  
  return { id, username, email, display_name: username };
}

function findUserByEmail(email) {
  return queryOne('SELECT * FROM users WHERE email = ?', [email]);
}

function findUserByUsername(username) {
  return queryOne('SELECT * FROM users WHERE username = ?', [username]);
}

function findUserById(id) {
  return queryOne(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`, [id]);
}

function verifyPassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

function updateUser(id, data) {
  const fields = [];
  const values = [];
  
  if (data.display_name) {
    fields.push('display_name = ?');
    values.push(data.display_name);
  }
  if (data.avatar) {
    fields.push('avatar = ?');
    values.push(data.avatar);
  }
  
  if (fields.length === 0) return false;
  
  fields.push("updated_at = datetime('now')");
  values.push(id);
  
  run(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
  return true;
}

// ============================================================
//  项目操作
// ============================================================

function createProject(userId, name, mode, data, description) {
  const id = uuidv4();
  const shareToken = uuidv4().replace(/-/g, '').slice(0, 12);
  
  run(
    'INSERT INTO projects (id, user_id, name, mode, data, description, share_token) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, userId, name, mode, JSON.stringify(data), description || '', shareToken]
  );
  
  return { id, name, mode, share_token: shareToken };
}

function archiveProjects(userId, filter) {
  const f = filter || {};
  try { ensureColumn('projects', 'archived', 'archived INTEGER DEFAULT 0'); } catch (e) {}
  const rows = query('SELECT id, name FROM projects WHERE user_id = ?', [userId]);
  const isVariant = (n) => /AI ?轮|AI 实验源页|人审模式演示页|A\/B .*副本|· \d+[AB]$|终验|演练/.test(String(n || ""));
  const ids = (f.ids && f.ids.length) ? f.ids : rows.filter((r) => isVariant(r.name)).map((r) => r.id);
  ids.forEach((id) => {
    run('UPDATE projects SET archived = 1, published = 0, is_public = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?', [id, userId]);
  });
  return { archived: ids.length };
}

function getUserProjects(userId) {
  const rows = query(
    'SELECT id, name, mode, description, thumbnail, is_public, published, published_at, share_token, created_at, updated_at, archived, data FROM projects WHERE user_id = ? AND COALESCE(archived, 0) = 0 ORDER BY updated_at DESC',
    [userId]
  );
  return rows.map((r) => {
    let pageCount = 1;
    try {
      const d = JSON.parse(r.data);
      pageCount = (Array.isArray(d.pages) && d.pages.length) || 1;
    } catch (e) {}
    delete r.data;
    return Object.assign(r, { page_count: pageCount });
  });
}

function getProject(projectId, userId) {
  const project = queryOne('SELECT * FROM projects WHERE id = ?', [projectId]);
  
  if (!project) return null;
  
  if (project.user_id !== userId && !project.is_public) {
    return null;
  }
  
  return {
    ...project,
    data: JSON.parse(project.data),
  };
}

function updateProject(projectId, userId, data) {
  const project = queryOne('SELECT user_id FROM projects WHERE id = ?', [projectId]);
  if (!project || project.user_id !== userId) return false;
  
  const fields = [];
  const values = [];
  
  if (data.name) {
    fields.push('name = ?');
    values.push(data.name);
  }
  if (data.mode) {
    fields.push('mode = ?');
    values.push(data.mode);
  }
  if (data.description !== undefined) {
    fields.push('description = ?');
    values.push(data.description);
  }
  if (data.data) {
    fields.push('data = ?');
    values.push(JSON.stringify(data.data));
  }
  if (data.is_public !== undefined) {
    fields.push('is_public = ?');
    values.push(data.is_public ? 1 : 0);
  }
  
  if (fields.length === 0) return false;
  
  fields.push("updated_at = datetime('now')");
  values.push(projectId, userId);
  
  run(`UPDATE projects SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`, values);
  return true;
}

function deleteProject(projectId, userId) {
  run('DELETE FROM projects WHERE id = ? AND user_id = ?', [projectId, userId]);
  return true;
}

function setPublished(projectId, userId, flag) {
  const row = queryOne('SELECT share_token FROM projects WHERE id = ? AND user_id = ?', [projectId, userId]);
  if (!row) return null;
  run(
    "UPDATE projects SET published = ?, published_at = CASE WHEN ? = 1 THEN datetime('now') ELSE published_at END, is_public = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?",
    [flag ? 1 : 0, flag ? 1 : 0, flag ? 1 : 0, projectId, userId]
  );
  return { share_token: row.share_token, published: flag ? 1 : 0 };
}

function getPublishedProject(shareToken) {
  const project = queryOne(
    'SELECT p.id, p.name, p.mode, p.description, p.data, p.share_token, p.published_at, p.updated_at, u.plan AS owner_plan, u.plan_expires_at AS owner_plan_expires FROM projects p LEFT JOIN users u ON u.id = p.user_id WHERE p.share_token = ? AND p.published = 1',
    [shareToken]
  );
  if (!project) return null;
  return { ...project, data: JSON.parse(project.data) };
}

function getProjectByShareToken(shareToken) {
  const project = queryOne(
    'SELECT id, name, mode, description, data, created_at FROM projects WHERE share_token = ? AND is_public = 1',
    [shareToken]
  );
  
  if (!project) return null;
  
  return {
    ...project,
    data: JSON.parse(project.data),
  };
}

function setProjectPublic(projectId, userId, isPublic) {
  run('UPDATE projects SET is_public = ?, updated_at = datetime(\'now\') WHERE id = ? AND user_id = ?', [
    isPublic ? 1 : 0,
    projectId,
    userId,
  ]);
  return true;
}

// ============================================================
//  版本操作
// ============================================================

function saveVersion(projectId, name, data) {
  const id = uuidv4();
  
  run(
    'INSERT INTO project_versions (id, project_id, name, data) VALUES (?, ?, ?, ?)',
    [id, projectId, name, JSON.stringify(data)]
  );
  
  return { id, name };
}

function getProjectVersions(projectId) {
  return query(
    'SELECT id, name, created_at FROM project_versions WHERE project_id = ? ORDER BY created_at DESC LIMIT 20',
    [projectId]
  );
}

function getVersion(versionId) {
  const version = queryOne('SELECT * FROM project_versions WHERE id = ?', [versionId]);
  
  if (!version) return null;
  
  return {
    ...version,
    data: JSON.parse(version.data),
  };
}

// ============================================================
//  社区模块操作
// ============================================================

function publishBlock(userId, name, type, description, data, tags) {
  const id = uuidv4();
  
  run(
    'INSERT INTO community_blocks (id, user_id, name, type, description, data, tags) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, userId, name, type, description, JSON.stringify(data), JSON.stringify(tags || [])]
  );
  
  return { id, name };
}

function getCommunityBlocks(filters) {
  let sql = 'SELECT * FROM community_blocks WHERE 1=1';
  const params = [];
  
  if (filters?.type) {
    sql += ' AND type = ?';
    params.push(filters.type);
  }
  
  if (filters?.search) {
    sql += ' AND (name LIKE ? OR description LIKE ?)';
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }
  
  sql += ' ORDER BY downloads DESC, rating DESC LIMIT 50';
  
  return query(sql, params).map(block => ({
    ...block,
    data: JSON.parse(block.data),
    tags: JSON.parse(block.tags || '[]'),
  }));
}

function incrementDownloads(blockId) {
  run('UPDATE community_blocks SET downloads = downloads + 1 WHERE id = ?', [blockId]);
  return true;
}

// ---------- PayFlow 收款订单 ----------
function createPayflowOrder(orderNo, userId, kind, productId, amountCents, payUrl) {
  run(
    'INSERT INTO payflow_orders (order_no, user_id, kind, product_id, amount_cents, pay_url) VALUES (?, ?, ?, ?, ?, ?)',
    [orderNo, userId, kind, productId || null, amountCents || 0, payUrl || null]
  );
  return { order_no: orderNo };
}

function getPayflowOrder(orderNo) {
  return queryOne('SELECT * FROM payflow_orders WHERE order_no = ?', [orderNo]);
}

function getUserPayflowOrders(userId) {
  return query('SELECT order_no, kind, product_id, amount_cents, status, pay_url, created_at FROM payflow_orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 20', [userId]);
}

// 幂等入账:返回 true 表示本次生效
function applyPayflowOrder(orderNo) {
  const row = queryOne('SELECT * FROM payflow_orders WHERE order_no = ?', [orderNo]);
  if (!row) return { ok: false, error: '订单映射不存在' };
  if (row.status === 'paid') return { ok: true, already: true, userId: row.user_id, kind: row.kind, product_id: row.product_id, amount_cents: row.amount_cents };
  run("UPDATE payflow_orders SET status = 'paid', applied_at = datetime('now') WHERE order_no = ?", [orderNo]);
  return { ok: true, already: false, userId: row.user_id, kind: row.kind, product_id: row.product_id, amount_cents: row.amount_cents };
}

function markPayflowRefunded(orderNo) {
  run("UPDATE payflow_orders SET status = 'refunded' WHERE order_no = ?", [orderNo]);
  return true;
}

// ---------- 定时任务(每日巡检) ----------
function createScheduledTask(userId, name, projectId, prompt) {
  const id = uuidv4();
  run(
    'INSERT INTO scheduled_tasks (id, user_id, name, project_id, prompt) VALUES (?, ?, ?, ?, ?)',
    [id, userId, String(name).slice(0, 60), projectId || null, String(prompt || '').slice(0, 1000)]
  );
  return { id, name };
}

function getScheduledTasks(userId) {
  return query(
    'SELECT id, name, project_id, kind, enabled, last_run_at, last_result, created_at FROM scheduled_tasks WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
    [userId]
  );
}

function getDueScheduledTasks(hours) {
  const h = hours || 20;
  return query(
    'SELECT * FROM scheduled_tasks WHERE enabled = 1 AND (last_run_at IS NULL OR last_run_at <= datetime(\'now\', \'-\' || ? || \' hours\')) LIMIT 20',
    [h]
  );
}

function updateScheduledRun(id, result) {
  run("UPDATE scheduled_tasks SET last_run_at = datetime('now'), last_result = ? WHERE id = ?", [String(result || '').slice(0, 4000), id]);
}

function setScheduledEnabled(id, userId, enabled) {
  const row = queryOne('SELECT user_id FROM scheduled_tasks WHERE id = ?', [id]);
  if (!row || row.user_id !== userId) return false;
  run('UPDATE scheduled_tasks SET enabled = ? WHERE id = ?', [enabled ? 1 : 0, id]);
  return true;
}

function deleteScheduledTask(id, userId) {
  const row = queryOne('SELECT user_id FROM scheduled_tasks WHERE id = ?', [id]);
  if (!row || row.user_id !== userId) return false;
  run('DELETE FROM scheduled_tasks WHERE id = ?', [id]);
  return true;
}

// ---------- 云端 Copilot 任务 ----------
function createTask(userId, author, name, prompt, params, status) {
  const id = uuidv4();
  run(
    'INSERT INTO copilot_tasks (id, user_id, author, name, prompt, params, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, userId || null, author || '', String(name).slice(0, 60), String(prompt).slice(0, 2000), JSON.stringify(params || []), status || 'pending']
  );
  return { id, name, status: status || 'pending' };
}

function getTasks(userId) {
  const all = query("SELECT * FROM copilot_tasks ORDER BY featured DESC, uses DESC, created_at DESC LIMIT 100");
  return all
    .filter((t) => t.status === 'approved' || (userId && t.user_id === userId))
    .map((t) => ({
      id: t.id, name: t.name, prompt: t.prompt,
      params: JSON.parse(t.params || '[]'),
      status: t.status, featured: t.featured, uses: t.uses || 0,
      author: t.author, owner_id: t.user_id,
      mine: !!(userId && t.user_id === userId),
    }));
}

function getTasksForReview() {
  return query("SELECT id, user_id, author, name, prompt, status, featured, created_at FROM copilot_tasks ORDER BY (status = 'pending') DESC, created_at DESC LIMIT 100")
    .map((t) => Object.assign(t, { kind: 'task', description: String(t.prompt).slice(0, 60) }));
}

function reviewTask(id, status, featured, note) {
  run("UPDATE copilot_tasks SET status = ?, featured = ?, reviewer_note = ?, reviewed_at = datetime('now') WHERE id = ?",
    [status, featured ? 1 : 0, note || '', id]);
  return true;
}

function incrementTaskUses(id) {
  run('UPDATE copilot_tasks SET uses = uses + 1 WHERE id = ?', [id]);
}

function deleteTask(id, userId) {
  const row = queryOne('SELECT user_id FROM copilot_tasks WHERE id = ?', [id]);
  if (!row || (row.user_id && row.user_id !== userId)) return false;
  run('DELETE FROM copilot_tasks WHERE id = ?', [id]);
  return true;
}

// ---------- 通知 ----------
function createNotification(userId, kind, title, body, link) {
  const id = uuidv4();
  run(
    'INSERT INTO notifications (id, user_id, kind, title, body, link) VALUES (?, ?, ?, ?, ?, ?)',
    [id, userId, kind || 'info', String(title).slice(0, 120), String(body || '').slice(0, 400), link || null]
  );
  return { id, userId, title };
}

function getNotifications(userId) {
  return query(
    'SELECT id, kind, title, body, link, read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
    [userId]
  );
}

function getUnreadCount(userId) {
  const row = queryOne('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read = 0', [userId]);
  return row ? row.n : 0;
}

function markAllRead(userId) {
  run('UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0', [userId]);
  return true;
}

function adminIds() {
  return query('SELECT id FROM users WHERE is_admin = 1').map((r) => r.id);
}

// ---------- 套餐 / 激活码 / 订单 / 配额 ----------
const PLANS = {
  free: { key: 'free', name: '免费版', cloudProjects: 3, publishedPages: 1, aiPerDay: 20, badge: true, price: 0 },
  pro: { key: 'pro', name: '专业版', cloudProjects: 100, publishedPages: 50, aiPerDay: 200, badge: false, price: 39 },
};

function getUserPlan(userId) {
  const u = queryOne('SELECT plan, plan_expires_at, grace_until FROM users WHERE id = ?', [userId]);
  if (!u) return PLANS.free;
  let plan = u.plan === 'pro' ? 'pro' : 'free';
  if (plan === 'pro' && u.plan_expires_at) {
    const exp = new Date(String(u.plan_expires_at).replace(' ', 'T') + 'Z').getTime();
    if (exp && exp < Date.now()) {
      // 宽限期内仍视为 Pro
      const grace = u.grace_until ? new Date(String(u.grace_until).replace(' ', 'T') + 'Z').getTime() : 0;
      if (!grace || grace < Date.now()) plan = 'free';
    }
  }
  return PLANS[plan];
}

function getUsage(userId) {
  const row = queryOne('SELECT COUNT(*) AS n FROM projects WHERE user_id = ?', [userId]);
  const pub = queryOne('SELECT COUNT(*) AS n FROM projects WHERE user_id = ? AND published = 1', [userId]);
  const ai = queryOne(
    "SELECT COUNT(*) AS n FROM orders WHERE kind = 'ai' AND buyer_id = ? AND created_at >= datetime('now','-1 day')",
    [userId]
  );
  return { cloudProjects: row ? row.n : 0, publishedPages: pub ? pub.n : 0, aiToday: ai ? ai.n : 0 };
}

function logAiCall(userId) {
  run("INSERT INTO orders (id, kind, buyer_id, amount) VALUES (?, 'ai', ?, 0)", [uuidv4(), userId]);
}

function createCode(code, kind, value, note) {
  run('INSERT INTO activation_codes (id, code, kind, value, note) VALUES (?, ?, ?, ?, ?)', [uuidv4(), code, kind, value || 0, note || '']);
  return { code, kind, value };
}

function redeemCode(userId, code) {
  const row = queryOne('SELECT * FROM activation_codes WHERE code = ?', [String(code || '').trim().toUpperCase()]);
  if (!row) return { error: '激活码无效' };
  if (row.used_by) return { error: '激活码已被使用' };
  if (row.kind === 'pro') {
    const days = Math.round(row.value || 30);
    run("UPDATE users SET plan = 'pro', plan_expires_at = datetime('now', '+' || ? || ' days') WHERE id = ?", [days, userId]);
  } else if (row.kind === 'balance') {
    run('UPDATE users SET balance = balance + ? WHERE id = ?', [row.value || 0, userId]);
  }
  run("UPDATE activation_codes SET used_by = ?, used_at = datetime('now') WHERE id = ?", [userId, row.id]);
  return { kind: row.kind, value: row.value };
}

// 开通/续期:从「当前到期时间与现在」的较晚者起算,避免续费缩短有效期
// ---------- 推荐裂变 ----------
function ensureReferralCode(userId) {
  const u = queryOne('SELECT referral_code, username FROM users WHERE id = ?', [userId]);
  if (!u) return null;
  if (u.referral_code) return u.referral_code;
  const base = String(u.username || 'user').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'user';
  let code = base + Math.random().toString(36).slice(2, 6);
  for (let i = 0; i < 5; i++) {
    const dup = queryOne('SELECT id FROM users WHERE referral_code = ?', [code]);
    if (!dup) break;
    code = base + Math.random().toString(36).slice(2, 6);
  }
  run('UPDATE users SET referral_code = ? WHERE id = ?', [code, userId]);
  return code;
}

function findByReferralCode(code) {
  return queryOne('SELECT id, username FROM users WHERE referral_code = ?', [String(code || '').trim()]);
}

function bindReferrer(userId, refCode) {
  const target = findByReferralCode(refCode);
  if (!target || target.id === userId) return null;
  const me = queryOne('SELECT referred_by FROM users WHERE id = ?', [userId]);
  if (!me || me.referred_by) return null; // 仅首次绑定
  run('UPDATE users SET referred_by = ? WHERE id = ?', [target.id, userId]);
  return target;
}

// 邀请排行榜:按邀请人数(其次佣金收入)排序
// 渠道归因:按邀请人聚合「注册 → 付费 → 收入」漏斗
function getAttribution(userId) {
  const scope = userId ? 'WHERE r.referred_by = ?' : '';
  const params = userId ? [userId] : [];
  const refs = query(
    `SELECT u.id AS referrer_id, u.username, COUNT(r.id) AS invited,
            SUM(CASE WHEN COALESCE(r.verified,0)=1 THEN 1 ELSE 0 END) AS verified
       FROM users u LEFT JOIN users r ON r.referred_by = u.id
      ${scope}
      GROUP BY u.id HAVING invited > 0 ORDER BY invited DESC LIMIT 50`,
    params
  );
  return refs.map((row) => {
    // 被邀请人的付费额(PayFlow 已支付订单 + 站内模板/插件消费)
    const pay = queryOne(
      `SELECT COALESCE(SUM(amount_cents),0) AS cents FROM payflow_orders
        WHERE status = 'paid' AND user_id IN (SELECT id FROM users WHERE referred_by = ?)`,
      [row.referrer_id]
    );
    const inner = queryOne(
      `SELECT COALESCE(SUM(amount),0) AS amt FROM orders
        WHERE kind IN ('template','plugin','pro','balance') AND buyer_id IN (SELECT id FROM users WHERE referred_by = ?)`,
      [row.referrer_id]
    );
    const paidUsers = queryOne(
      `SELECT COUNT(DISTINCT user_id) AS n FROM (
          SELECT user_id FROM payflow_orders WHERE status='paid' AND user_id IN (SELECT id FROM users WHERE referred_by = ?)
          UNION
          SELECT buyer_id AS user_id FROM orders WHERE kind IN ('template','plugin','pro','balance') AND buyer_id IN (SELECT id FROM users WHERE referred_by = ?)
        )`,
      [row.referrer_id, row.referrer_id]
    );
    const commission = queryOne("SELECT COALESCE(SUM(seller_share),0) AS c FROM orders WHERE kind='commission' AND seller_id = ?", [row.referrer_id]);
    const revenue = ((pay ? pay.cents : 0) / 100) + (inner ? inner.amt : 0);
    const invited = row.invited || 0;
    const paid = paidUsers ? paidUsers.n : 0;
    return {
      referrer_id: row.referrer_id, username: row.username,
      invited, paidUsers: paid,
      convRate: invited ? Math.round(paid / invited * 1000) / 10 : 0,
      revenue: Math.round(revenue * 100) / 100,
      ltv: invited ? Math.round(revenue / invited * 100) / 100 : 0,
      commission: Math.round((commission ? commission.c : 0) * 100) / 100,
    };
  });
}

function getReferralLeaderboard(limit) {
  const rows = query(
    'SELECT u.id, u.username, COUNT(r.id) AS invited FROM users u JOIN users r ON r.referred_by = u.id GROUP BY u.id ORDER BY invited DESC LIMIT ?',
    [limit || 20]
  );
  return rows.map((r) => {
    const earn = queryOne("SELECT COALESCE(SUM(seller_share),0) AS total FROM orders WHERE kind = 'commission' AND seller_id = ?", [r.id]);
    return { id: r.id, username: r.username, invited: r.invited, commission: earn ? earn.total : 0 };
  }).sort((a, b) => (b.invited - a.invited) || (b.commission - a.commission));
}

function getReferredUsers(userId) {
  return query('SELECT id, username, created_at FROM users WHERE referred_by = ? ORDER BY created_at DESC LIMIT 100', [userId]);
}

// ---------- 实时指标(分钟级) ----------
function addLead(lead) {
  const id = uuidv4();
  // 线索通常带邮箱/手机 → 在这里把身份补全(表单是最强的身份来源)
  const data = lead.data || {};
  let identityId = null;
  try {
    identityId = require('./lib/identity').attachIdentity({
      vid: lead.vid, uid: lead.uid, email: data['邮箱'] || data.email, phone: data['手机'] || data['电话'] || data.phone,
      traits: data,
    });
  } catch (e) {}
  run(
    'INSERT INTO leads (id, project_id, project_name, url, seg, form_id, data, identity_id, trace_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, lead.project_id || null, String(lead.project_name || '').slice(0, 80), String(lead.url || '').slice(0, 300),
     String(lead.seg || '').slice(0, 120), String(lead.form_id || '').slice(0, 40), JSON.stringify(data), identityId,
     lead.trace_id ? String(lead.trace_id).slice(0, 80) : null]
  );
  return id;
}

function getLeads() {
  return query('SELECT id, project_name, seg, data, created_at FROM leads ORDER BY created_at DESC LIMIT 100')
    .map((r) => Object.assign(r, { data: JSON.parse(r.data || '{}') }));
}

function getRealtimeMetrics(projectId, minutes) {
  const mins = Math.max(5, Math.min(120, Number(minutes) || 30));
  const params = [];
  let where = ` AND created_at >= datetime('now', '-${mins} minutes')`;
  if (projectId) { where += ' AND project_id = ?'; params.push(projectId); }

  const series = query(
    `SELECT strftime('%Y-%m-%d %H:%M', created_at) AS minute,
            SUM(CASE WHEN type='page_view' THEN 1 ELSE 0 END) AS views,
            SUM(CASE WHEN type='cta_click' THEN 1 ELSE 0 END) AS clicks
       FROM events WHERE 1=1${where}
      GROUP BY minute ORDER BY minute ASC`,
    params
  );
  const win = (m) => {
    const p2 = [];
    let w = ` AND created_at >= datetime('now', '-${m} minutes')`;
    if (projectId) { w += ' AND project_id = ?'; p2.push(projectId); }
    const row = queryOne(
      `SELECT SUM(CASE WHEN type='page_view' THEN 1 ELSE 0 END) AS views,
              SUM(CASE WHEN type='cta_click' THEN 1 ELSE 0 END) AS clicks
         FROM events WHERE 1=1${w}`,
      p2
    ) || { views: 0, clicks: 0 };
    const v = row.views || 0, c = row.clicks || 0;
    return { views: v, clicks: c, cvr: v ? Math.round(c / v * 1000) / 10 : 0 };
  };
  const recent = query(
    `SELECT goal_id, type, url, seg, created_at FROM events WHERE 1=1${where} ORDER BY created_at DESC LIMIT 12`,
    params
  );
  const goals = query(
    `SELECT goal_id, COUNT(*) AS clicks FROM events WHERE type='cta_click'${where} GROUP BY goal_id ORDER BY clicks DESC LIMIT 8`,
    params
  );
  // 在线访客:近 5 分钟出现的不同访客(无 vid 时回退到 url 维度)
  const online = queryOne(
    `SELECT COUNT(DISTINCT COALESCE(NULLIF(vid,''), url)) AS n FROM events
      WHERE created_at >= datetime('now','-5 minutes')${projectId ? ' AND project_id = ?' : ''}`,
    projectId ? [projectId] : []
  );
  // 来源分布:近 30 分钟按 src(utm_source / 引荐域)
  const sources = query(
    `SELECT COALESCE(NULLIF(src,''),'(直接访问)') AS src, COUNT(*) AS n FROM events
      WHERE 1=1${where} GROUP BY COALESCE(NULLIF(src,''),'(直接访问)') ORDER BY n DESC LIMIT 8`,
    params
  );
  return { at: new Date().toISOString(), online: online ? online.n : 0,
    windows: { m1: win(1), m5: win(5), m15: win(15) }, series, recent, goals, sources };
}

// ---------- 告警规则 ----------
function createAlertRule(userId, r) {
  const id = uuidv4();
  run(
    'INSERT INTO alert_rules (id, user_id, name, project_id, metric, operator, threshold, window_minutes, action, cooldown_minutes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, userId, r.name || '告警', r.project_id || null, r.metric, r.operator, Number(r.threshold) || 0,
     Math.max(5, Math.min(1440, Number(r.window_minutes) || 30)), r.action || 'notify', Math.max(5, Number(r.cooldown_minutes) || 60)]
  );
  return { id };
}

function getAlertRules(userId) {
  return query('SELECT * FROM alert_rules WHERE user_id = ? ORDER BY created_at DESC LIMIT 50', [userId]);
}

function getAllEnabledAlertRules() {
  return query('SELECT * FROM alert_rules WHERE enabled = 1 LIMIT 200');
}

function setAlertEnabled(id, userId, enabled) {
  const row = queryOne('SELECT user_id FROM alert_rules WHERE id = ?', [id]);
  if (!row || row.user_id !== userId) return false;
  run('UPDATE alert_rules SET enabled = ? WHERE id = ?', [enabled ? 1 : 0, id]);
  return true;
}

function deleteAlertRule(id, userId) {
  const row = queryOne('SELECT user_id FROM alert_rules WHERE id = ?', [id]);
  if (!row || row.user_id !== userId) return false;
  run('DELETE FROM alert_rules WHERE id = ?', [id]);
  return true;
}

function markAlertFired(id, value) {
  run("UPDATE alert_rules SET last_fired_at = datetime('now'), last_value = ? WHERE id = ?", [value, id]);
  return true;
}

// ---------- 对账 ----------
function getAllPayflowOrders() {
  return query('SELECT * FROM payflow_orders ORDER BY created_at DESC LIMIT 1000');
}

function saveReconcileReport(report) {
  const id = uuidv4();
  run('INSERT INTO reconcile_reports (id, data) VALUES (?, ?)', [id, JSON.stringify(report)]);
  return { id };
}

function getLastReconcile() {
  const row = queryOne('SELECT data, created_at FROM reconcile_reports ORDER BY created_at DESC LIMIT 1');
  if (!row) return null;
  try { return Object.assign({ created_at: row.created_at }, JSON.parse(row.data)); } catch (e) { return null; }
}

// 对账冲正:更新本地金额 / 作废
function updatePayflowOrderAmount(orderNo, amountCents) {
  run('UPDATE payflow_orders SET amount_cents = ? WHERE order_no = ?', [Number(amountCents) || 0, orderNo]);
  return true;
}

function markPayflowOrderVoid(orderNo) {
  run("UPDATE payflow_orders SET status = 'void' WHERE order_no = ?", [orderNo]);
  return true;
}

// ---------- 周统计 / 周报 ----------
function weekKey(offsetWeeks) {
  const d = new Date();
  const day = d.getUTCDay() || 7;              // 周一=1
  d.setUTCDate(d.getUTCDate() - (day - 1) + (offsetWeeks || 0) * 7);
  return d.toISOString().slice(0, 10);          // 该周周一的日期作为 key
}

// 某周(以周一日期为界)的渠道统计
function getWeekStats(weekStart) {
  const start = weekStart;
  const endExpr = "datetime(?, '+7 days')";
  const revenue = queryOne(
    `SELECT COALESCE(SUM(amount_cents),0) AS cents FROM payflow_orders WHERE status='paid' AND date(created_at) >= date(?) AND date(created_at) < date(${endExpr})`,
    [start, start]
  );
  const inner = queryOne(
    "SELECT COALESCE(SUM(amount),0) AS amt FROM orders WHERE kind IN ('template','plugin','pro','balance') AND date(created_at) >= date(?) AND date(created_at) < datetime(?, '+7 days')",
    [start, start]
  );
  const paidUsers = queryOne(
    `SELECT COUNT(DISTINCT user_id) AS n FROM (SELECT user_id FROM payflow_orders WHERE status='paid' AND date(created_at) >= date(?) AND date(created_at) < datetime(?, '+7 days') UNION SELECT buyer_id AS user_id FROM orders WHERE kind IN ('template','plugin','pro','balance') AND date(created_at) >= date(?) AND date(created_at) < datetime(?, '+7 days'))`,
    [start, start, start, start]
  );
  const signups = queryOne("SELECT COUNT(*) AS n FROM users WHERE date(created_at) >= date(?) AND date(created_at) < datetime(?, '+7 days')", [start, start]);
  const commission = queryOne("SELECT COALESCE(SUM(seller_share),0) AS c FROM orders WHERE kind='commission' AND date(created_at) >= date(?) AND date(created_at) < datetime(?, '+7 days')", [start, start]);
  return {
    week: start,
    revenue: Math.round((((revenue ? revenue.cents : 0) / 100) + (inner ? inner.amt : 0)) * 100) / 100,
    paidUsers: paidUsers ? paidUsers.n : 0,
    signups: signups ? signups.n : 0,
    commission: Math.round((commission ? commission.c : 0) * 100) / 100,
  };
}

// 各渠道(邀请人)在某周的收入
function getWeekChannels(weekStart, limit) {
  const rows = query(
    "SELECT u.id AS id, u.username FROM users u JOIN users r ON r.referred_by = u.id GROUP BY u.id HAVING COUNT(r.id) > 0 LIMIT ?",
    [limit || 20]
  );
  return rows.map((row) => {
    const pay = queryOne(
      "SELECT COALESCE(SUM(amount_cents),0) AS cents FROM payflow_orders WHERE status='paid' AND user_id IN (SELECT id FROM users WHERE referred_by = ?) AND date(created_at) >= date(?) AND date(created_at) < datetime(?, '+7 days')",
      [row.id, weekStart, weekStart]
    );
    const inner = queryOne(
      "SELECT COALESCE(SUM(amount),0) AS amt FROM orders WHERE kind IN ('template','plugin','pro','balance') AND buyer_id IN (SELECT id FROM users WHERE referred_by = ?) AND date(created_at) >= date(?) AND date(created_at) < datetime(?, '+7 days')",
      [row.id, weekStart, weekStart]
    );
    return {
      id: row.id, username: row.username,
      revenue: Math.round((((pay ? pay.cents : 0) / 100) + (inner ? inner.amt : 0)) * 100) / 100,
    };
  }).filter((x) => x.revenue > 0).sort((a, b) => b.revenue - a.revenue);
}

function saveWeeklyReport(period, data) {
  const id = uuidv4();
  run('INSERT OR REPLACE INTO weekly_reports (id, period, data) VALUES (?, ?, ?)', [id, period, JSON.stringify(data)]);
  return { id, period };
}

function getWeeklyReports() {
  return query('SELECT period, data, created_at FROM weekly_reports ORDER BY period DESC LIMIT 12')
    .map((r) => Object.assign({}, r, { data: JSON.parse(r.data || '{}') }));
}

function hasWeeklyReport(period) {
  return !!queryOne('SELECT id FROM weekly_reports WHERE period = ?', [period]);
}

function setPayflowRefCode(userId, code) {
  run('UPDATE users SET payflow_ref_code = ? WHERE id = ?', [code || null, userId]);
  return true;
}

function setRefVariant(userId, variant, expId) {
  run('UPDATE users SET ref_variant = ?, ref_variant_exp = ? WHERE id = ?', [variant || null, expId || null, userId]);
  return true;
}

function setUserUtm(userId, utm) {
  if (!utm) return false;
  run('UPDATE users SET utm_source = ?, utm_medium = ?, utm_campaign = ? WHERE id = ?',
    [String(utm.source || '').slice(0, 60), String(utm.medium || '').slice(0, 60), String(utm.campaign || '').slice(0, 60), userId]);
  return true;
}

// 按 UTM 来源聚合(自身获客渠道的 LTV)
function getAttributionByUtm() {
  const rows = query(
    "SELECT COALESCE(NULLIF(utm_source,''), '(direct)') AS source, COUNT(*) AS users FROM users GROUP BY source ORDER BY users DESC LIMIT 30"
  );
  return rows.map((r) => {
    const paid = queryOne(
      "SELECT COUNT(DISTINCT user_id) AS n FROM (SELECT user_id FROM payflow_orders WHERE status='paid' AND user_id IN (SELECT id FROM users WHERE COALESCE(NULLIF(utm_source,''),'(direct)') = ?) UNION SELECT buyer_id AS user_id FROM orders WHERE kind IN ('template','plugin','pro','balance') AND buyer_id IN (SELECT id FROM users WHERE COALESCE(NULLIF(utm_source,''),'(direct)') = ?))",
      [r.source, r.source]
    );
    const pay = queryOne(
      "SELECT COALESCE(SUM(amount_cents),0) AS cents FROM payflow_orders WHERE status='paid' AND user_id IN (SELECT id FROM users WHERE COALESCE(NULLIF(utm_source,''),'(direct)') = ?)",
      [r.source]
    );
    const inner = queryOne(
      "SELECT COALESCE(SUM(amount),0) AS amt FROM orders WHERE kind IN ('template','plugin','pro','balance') AND buyer_id IN (SELECT id FROM users WHERE COALESCE(NULLIF(utm_source,''),'(direct)') = ?)",
      [r.source]
    );
    const revenue = ((pay ? pay.cents : 0) / 100) + (inner ? inner.amt : 0);
    const users = r.users || 0;
    const paidUsers = paid ? paid.n : 0;
    return {
      source: r.source, users, paidUsers,
      convRate: users ? Math.round(paidUsers / users * 1000) / 10 : 0,
      revenue: Math.round(revenue * 100) / 100,
      ltv: users ? Math.round(revenue / users * 100) / 100 : 0,
    };
  });
}

// ---------- 实名 / 风控 ----------
function setVerified(userId, realName, phone) {
  run("UPDATE users SET real_name = ?, phone = ?, verified = 1, verified_at = datetime('now') WHERE id = ?", [realName, phone, userId]);
  return true;
}

function getRiskConfig() {
  return {
    minAmount: 10, maxAmount: 2000,          // 单笔
    dailyAmount: 5000, monthlyAmount: 20000, // 日/月累计
    dailyCount: 3,                            // 每日申请次数
    singlePending: true,                      // 同时只能有一笔待处理
  };
}

function getPayoutRiskSnapshot(userId) {
  const today = queryOne("SELECT COALESCE(SUM(amount),0) AS amt, COUNT(*) AS cnt FROM payouts WHERE user_id = ? AND date(created_at) = date('now') AND status != 'rejected'", [userId]);
  const month = queryOne("SELECT COALESCE(SUM(amount),0) AS amt FROM payouts WHERE user_id = ? AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now') AND status != 'rejected'", [userId]);
  const pending = queryOne("SELECT COUNT(*) AS cnt FROM payouts WHERE user_id = ? AND status IN ('requested','approved')", [userId]);
  return {
    todayAmount: today ? today.amt : 0, todayCount: today ? today.cnt : 0,
    monthAmount: month ? month.amt : 0, pendingCount: pending ? pending.cnt : 0,
  };
}

// ---------- 月度结算单 ----------
function createSettlement(userId, period, data) {
  const id = uuidv4();
  run('INSERT OR REPLACE INTO settlements (id, user_id, period, data) VALUES (?, ?, ?, ?)', [id, userId, period, JSON.stringify(data)]);
  return { id, period };
}

function getSettlements(userId) {
  return query('SELECT period, data, created_at FROM settlements WHERE user_id = ? ORDER BY period DESC LIMIT 24', [userId]).map((r) => Object.assign({}, r, { data: JSON.parse(r.data || '{}') }));
}

function hasSettlement(period) {
  const row = queryOne('SELECT id FROM settlements WHERE period = ? LIMIT 1', [period]);
  return !!row;
}

// 某月佣金明细(按邀请人聚合)
function getMonthlyCommission(period) {
  return query(
    "SELECT seller_id AS user_id, COUNT(*) AS orders, COALESCE(SUM(seller_share),0) AS commission FROM orders WHERE kind = 'commission' AND strftime('%Y-%m', created_at) = ? GROUP BY seller_id",
    [period]
  );
}

function getReferredCountByUser(userId) {
  const row = queryOne('SELECT COUNT(*) AS n FROM users WHERE referred_by = ?', [userId]);
  return row ? row.n : 0;
}

// ---------- 提现(Payout) ----------
function createPayout(userId, amount, method, account) {
  const id = uuidv4();
  run('INSERT INTO payouts (id, user_id, amount, method, account) VALUES (?, ?, ?, ?, ?)',
    [id, userId, amount, method || 'manual', account || '']);
  return { id, amount };
}

function getPayouts(userId) {
  return query('SELECT id, amount, method, account, status, note, created_at, processed_at FROM payouts WHERE user_id = ? ORDER BY created_at DESC LIMIT 30', [userId]);
}

function getPendingPayouts() {
  return query("SELECT p.id, p.user_id, p.amount, p.method, p.account, p.status, p.created_at, u.username, u.email FROM payouts p LEFT JOIN users u ON u.id = p.user_id WHERE p.status IN ('requested','approved') ORDER BY p.created_at ASC LIMIT 100");
}

function getPayoutById(id) {
  return queryOne('SELECT * FROM payouts WHERE id = ?', [id]);
}

function updatePayoutStatus(id, status, note) {
  run("UPDATE payouts SET status = ?, note = ?, processed_at = datetime('now') WHERE id = ?", [status, note || '', id]);
  return true;
}

// ---------- 套餐到期生命周期 ----------
function getExpiringPlans(days) {
  return query(
    "SELECT id, username, email, plan_expires_at FROM users WHERE plan = 'pro' AND plan_expires_at IS NOT NULL AND plan_expires_at <= datetime('now', '+' || ? || ' days') AND plan_expires_at > datetime('now') AND (plan_notice_at IS NULL OR plan_notice_at < date('now'))",
    [days || 7]
  );
}

// 已过期但仍在宽限期内的(仍保留 Pro 权益)
function getExpiredPlans() {
  return query("SELECT id, username, email, plan_expires_at FROM users WHERE plan = 'pro' AND plan_expires_at IS NOT NULL AND plan_expires_at <= datetime('now') AND (grace_until IS NULL OR grace_until <= datetime('now'))");
}

// 刚过期、需要进入宽限期的
function getPlansToGrace() {
  return query("SELECT id, username, email, plan_expires_at FROM users WHERE plan = 'pro' AND plan_expires_at IS NOT NULL AND plan_expires_at <= datetime('now') AND grace_until IS NULL");
}

function startGrace(userId, days) {
  const n = Math.round(days == null ? 3 : days);
  const mod = (n >= 0 ? '+' : '') + n + ' days';   // 负数必须为 '-3 days',不能是 '+-3 days'
  run("UPDATE users SET grace_until = datetime('now', ?) WHERE id = ?", [mod, userId]);
  return true;
}

function clearGrace(userId) {
  run('UPDATE users SET grace_until = NULL WHERE id = ?', [userId]);
  return true;
}

function downgradePlan(userId) {
  run("UPDATE users SET plan = 'free' WHERE id = ?", [userId]);
  return true;
}

function markPlanNoticed(userId) {
  run("UPDATE users SET plan_notice_at = datetime('now') WHERE id = ?", [userId]);
  return true;
}

function grantPlan(userId, days) {
  const u = queryOne('SELECT plan_expires_at FROM users WHERE id = ?', [userId]);
  const cur = u && u.plan_expires_at ? new Date(String(u.plan_expires_at).replace(' ', 'T') + 'Z').getTime() : 0;
  const base = Math.max(Date.now(), cur || 0);
  const iso = new Date(base + Math.round(days || 30) * 86400000).toISOString().slice(0, 19).replace('T', ' ');
  run("UPDATE users SET plan = 'pro', plan_expires_at = ? WHERE id = ?", [iso, userId]);
  return true;
}

function addBalance(userId, amount) {
  run('UPDATE users SET balance = ROUND(balance + ?, 2) WHERE id = ?', [amount, userId]);
}

function createOrder(kind, buyerId, sellerId, amount, sellerShare, platformShare, templateId) {
  const id = uuidv4();
  run(
    'INSERT INTO orders (id, kind, template_id, buyer_id, seller_id, amount, seller_share, platform_share) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, kind, templateId || null, buyerId || null, sellerId || null, amount || 0, sellerShare || 0, platformShare || 0]
  );
  return { id, kind, amount };
}

function getUserOrders(userId) {
  return query(
    'SELECT id, kind, template_id, amount, seller_share, created_at FROM orders WHERE buyer_id = ? AND kind != \'ai\' ORDER BY created_at DESC LIMIT 50',
    [userId]
  );
}

function getEarnings(userId) {
  const row = queryOne("SELECT COALESCE(SUM(seller_share),0) AS total, COUNT(*) AS orders FROM orders WHERE seller_id = ?", [userId]);
  return { total: row ? row.total : 0, orders: row ? row.orders : 0 };
}

// ---------- 插件 ----------
function createPlugin(ownerId, name, blockType, description, fields, template, price) {
  const id = uuidv4();
  run(
    'INSERT INTO plugins (id, owner_id, name, block_type, description, fields, template, price, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, ownerId || null, name, blockType, description || '', JSON.stringify(fields || []), template || '',
     Math.max(0, Math.min(9999, Number(price) || 0)), 'pending']
  );
  return { id, name, block_type: blockType, status: 'pending' };
}

// 公开可见插件:已过审 + 自己未过审的 + 已购买
function getPlugins(userId) {
  const all = query('SELECT * FROM plugins WHERE enabled = 1 ORDER BY created_at DESC LIMIT 100');
  return all
    .filter((p) => p.status === 'approved' || (userId && p.owner_id === userId) || (userId && p.price > 0 && hasPurchased('plugin', p.id, userId)))
    .map((p) => {
      const owns = userId && p.owner_id === userId;
      const bought = userId && hasPurchased('plugin', p.id, userId);
      const locked = p.price > 0 && !owns && !bought;
      return {
        id: p.id, name: p.name, block_type: p.block_type, description: p.description,
        fields: sanitizeFields(JSON.parse(p.fields || '[]')),
        template: locked ? null : sanitizePluginHtml(p.template),
        price: p.price || 0, status: p.status, uses: p.uses || 0,
        owner_id: p.owner_id, locked: !!locked, mine: !!owns,
      };
    });
}

function getPluginsForReview() {
  return query("SELECT id, owner_id, name, block_type, description, price, status, created_at FROM plugins ORDER BY (status = 'pending') DESC, created_at DESC LIMIT 100")
    .map((p) => Object.assign(p, { kind: 'plugin', type_label: p.block_type }));
}

function reviewPlugin(id, status, note) {
  run("UPDATE plugins SET status = ?, reviewer_note = ?, reviewed_at = datetime('now') WHERE id = ?", [status, note || '', id]);
  return true;
}

function incrementPluginUses(id) {
  run('UPDATE plugins SET uses = uses + 1 WHERE id = ?', [id]);
}

function deletePlugin(id, ownerId) {
  const row = queryOne('SELECT owner_id FROM plugins WHERE id = ?', [id]);
  if (!row || (row.owner_id && row.owner_id !== ownerId)) return false;
  run('DELETE FROM plugins WHERE id = ?', [id]);
  return true;
}

// ---------- 云端模板 ----------
function createTemplate(userId, author, name, mode, description, data, price) {
  const id = uuidv4();
  run(
    'INSERT INTO community_templates (id, user_id, author, name, mode, description, data, price, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, userId, author || '', name, mode, description || '', JSON.stringify(data), price || 0, 'pending']
  );
  return { id, name, mode };
}

function getTemplates(includeAll) {
  if (includeAll) {
    return query(
      "SELECT id, user_id, author, name, mode, description, downloads, price, status, featured, created_at FROM community_templates ORDER BY featured DESC, (status = 'pending') DESC, downloads DESC LIMIT 100"
    );
  }
  return query(
    "SELECT id, user_id, author, name, mode, description, downloads, price, status, featured, created_at FROM community_templates WHERE COALESCE(status,'approved') = 'approved' ORDER BY featured DESC, downloads DESC LIMIT 100"
  );
}

function getTemplatesForReview() {
  return query("SELECT id, user_id, author, name, mode, price, status, featured, created_at FROM community_templates ORDER BY (status = 'pending') DESC, created_at DESC LIMIT 100")
    .map((t) => Object.assign(t, { kind: 'template' }));
}

function reviewTemplate(id, status, featured, note) {
  run(
    "UPDATE community_templates SET status = ?, featured = ?, reviewer_note = ?, reviewed_at = datetime('now') WHERE id = ?",
    [status, featured ? 1 : 0, note || '', id]
  );
  return true;
}

function getTemplate(id) {
  const row = queryOne('SELECT * FROM community_templates WHERE id = ?', [id]);
  if (!row) return null;
  return Object.assign({}, row, { data: JSON.parse(row.data) });
}

function deleteTemplate(id, userId) {
  const row = queryOne('SELECT user_id FROM community_templates WHERE id = ?', [id]);
  if (!row || row.user_id !== userId) return false;
  run('DELETE FROM community_templates WHERE id = ? AND user_id = ?', [id, userId]);
  return true;
}

function hasPurchased(kind, targetId, userId) {
  const row = queryOne('SELECT id FROM orders WHERE kind = ? AND template_id = ? AND buyer_id = ? LIMIT 1', [kind, targetId, userId]);
  return !!row;
}

function incrementTemplateDownloads(id) {
  run('UPDATE community_templates SET downloads = downloads + 1 WHERE id = ?', [id]);
}

function addEvent(goalId, type, url, projectId, seg, vid, src, extra) {
  const e = extra || {};
  const id = uuidv4();
  // 外部事件幂等:event_id 已存在则直接返回(不重复写入)
  if (e.eventId) {
    const hit = queryOne('SELECT id FROM events WHERE event_id = ?', [String(e.eventId).slice(0, 80)]);
    if (hit) return { id: hit.id, goal_id: goalId, deduped: true };
  }
  // 身份打通:事件写入时解析/链接身份(失败不影响埋点主流程)
  let identityId = null;
  try {
    identityId = require('./lib/identity').attachIdentity({
      vid, uid: e.uid, payflowRef: e.payflowRef, email: e.email, phone: e.phone, traits: {},
    });
  } catch (err) {}
  run(
    'INSERT INTO events (id, project_id, goal_id, type, url, seg, vid, src, event_id, uid, value, identity_id, trace_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, projectId || null, goalId, type || 'cta_click', url || null,
     seg ? String(seg).slice(0, 120) : null,
     vid ? String(vid).slice(0, 40) : null,
     src ? String(src).slice(0, 60) : null,
     e.eventId ? String(e.eventId).slice(0, 80) : null,
     e.uid ? String(e.uid).slice(0, 64) : null,
     isFinite(Number(e.value)) ? Number(e.value) : null, identityId, e.traceId ? String(e.traceId).slice(0, 80) : null]
  );
  return { id, goal_id: goalId, identity_id: identityId };
}

// 按分群聚合(曝光/点击/转化率)
// 增长快照:给 AI 决策用的聚合数据(曝光/点击/CVR/分群/来源/线索)
function projectGrowthSnapshot(projectId, days) {
  const d = Math.max(1, Math.min(90, Number(days) || 14));
  const win = `created_at >= datetime('now','-${d} days')`;
  const rows = query(
    `SELECT type, COUNT(*) AS n,
            COUNT(DISTINCT COALESCE(NULLIF(vid,''), url)) AS visitors
       FROM events WHERE project_id = ? AND ${win} GROUP BY type`,
    [projectId]
  );
  const pick = (t) => (rows.find((r) => r.type === t) || { n: 0 }).n;
  const views = pick('page_view'), clicks = pick('cta_click');
  const byGoal = query(
    `SELECT goal_id, COUNT(*) AS n FROM events WHERE project_id = ? AND ${win}
      GROUP BY goal_id ORDER BY n DESC LIMIT 12`, [projectId]);
  const bySeg = query(
    `SELECT COALESCE(NULLIF(seg,''),'(未分组)') AS seg,
            SUM(CASE WHEN type='cta_click' THEN 1 ELSE 0 END) AS clicks,
            SUM(CASE WHEN type='page_view' THEN 1 ELSE 0 END) AS views
       FROM events WHERE project_id = ? AND ${win} GROUP BY seg ORDER BY views DESC LIMIT 8`, [projectId]);
  const bySrc = query(
    `SELECT COALESCE(NULLIF(src,''),'(直接访问)') AS src,
            SUM(CASE WHEN type='cta_click' THEN 1 ELSE 0 END) AS clicks,
            SUM(CASE WHEN type='page_view' THEN 1 ELSE 0 END) AS views
       FROM events WHERE project_id = ? AND ${win} GROUP BY src ORDER BY views DESC LIMIT 8`, [projectId]);
  let leads = 0;
  try { const l = queryOne('SELECT COUNT(*) AS n FROM leads WHERE project_id = ?', [projectId]); leads = l ? l.n : 0; } catch (e) {}
  const last = queryOne('SELECT MAX(created_at) AS t FROM events WHERE project_id = ?', [projectId]);
  return {
    days: d, views, clicks, leads,
    cvr: views ? +(clicks / views * 100).toFixed(2) : null,
    byGoal, bySeg, bySrc,
    lastEventAt: last ? last.t : null,
  };
}

// 分群表只统计页面行为(曝光/点击),避免外部回传事件产生空行
function getEventStatsBySeg(projectId) {
  const params = [];
  let where = "";
  if (projectId) { where = " AND project_id = ?"; params.push(projectId); }
  return query(
    `SELECT COALESCE(NULLIF(seg,''),'(未分群)') AS seg,
            SUM(CASE WHEN type='page_view' THEN 1 ELSE 0 END) AS views,
            SUM(CASE WHEN type='cta_click' THEN 1 ELSE 0 END) AS clicks
       FROM events WHERE type IN ('page_view','cta_click')${where}
      GROUP BY COALESCE(NULLIF(seg,''),'(未分群)')
      ORDER BY clicks DESC LIMIT 20`,
    params
  ).map((r) => Object.assign(r, {
    cvr: r.views ? Math.round(r.clicks / r.views * 1000) / 10 : 0,
  }));
}

// ---------- 事件日聚合(rollup) ----------
// 把 [dayFrom, dayTo] 的原始事件按 项目/天/目标/类型 聚合写入 event_daily(幂等:先删该区间再写)
function rollupEvents(days) {
  const d = Math.max(1, Math.min(400, Number(days) || 2));
  const from = `-${d} days`;
  let rolled = 0;
  try {
    const rows = query(
      `SELECT project_id, date(created_at) AS day, goal_id, type, COUNT(*) AS n
         FROM events WHERE created_at >= datetime('now', ?)
        GROUP BY project_id, date(created_at), goal_id, type`,
      [from]
    );
    // 先清掉这些天已有的聚合,避免重复累加
    run("DELETE FROM event_daily WHERE day >= date('now', ?)", [from]);
    rows.forEach((r) => {
      run(`INSERT OR REPLACE INTO event_daily (project_id, day, goal_id, type, n, updated_at)
           VALUES (?, ?, ?, ?, ?, datetime('now'))`,
        [r.project_id || '', r.day, r.goal_id || '', r.type || '', r.n]);
      rolled++;
    });
  } catch (e) { console.warn('[db] 聚合失败:', e.message); }
  return { days: d, rows: rolled };
}

// 长期趋势:原始数据 + 日聚合合并(原始优先,避免重复计数)
function getDailyTrend(projectId, days) {
  const d = Math.max(1, Math.min(400, Number(days) || 13));
  const projSql = projectId ? ' AND project_id = ?' : '';
  const rawFrom = `-${Math.min(d, RAW_RETENTION_DAYS)} days`;
  const raw = query(
    `SELECT date(created_at) AS day, COUNT(*) AS n FROM events
      WHERE created_at >= datetime('now', ?)${projSql}
      GROUP BY date(created_at)`,
    projectId ? [rawFrom, projectId] : [rawFrom]
  );
  const from = `-${d} days`;
  const rolled = query(
    `SELECT day, SUM(n) AS n FROM event_daily
      WHERE day >= date('now', ?)${projectId ? ' AND project_id = ?' : ''}
      GROUP BY day`,
    projectId ? [from, projectId] : [from]
  );
  const map = {};
  rolled.forEach((r) => { map[r.day] = r.n; });     // 聚合值(覆盖更早的历史)
  raw.forEach((r) => { map[r.day] = r.n; });        // 原始值优先(当天更准)
  return Object.keys(map).sort().map((day) => ({ date: day, count: map[day] }));
}

// 归档清理:原始事件只保留最近 N 天(默认 120),避免库无限增长导致写入成本线性上升
function pruneOldEvents(days) {
  const d = Math.max(7, Math.min(730, Number(days) || RAW_RETENTION_DAYS));
  // 先聚合再清理:保证长期趋势不丢
  try { rollupEvents(Math.min(d, 7)); } catch (e) {}
  let removed = 0;
  try {
    const n = queryOne("SELECT COUNT(*) AS n FROM events WHERE created_at < datetime('now', ?)", [`-${d} days`]);
    removed = n ? n.n : 0;
    if (removed) run("DELETE FROM events WHERE created_at < datetime('now', ?)", [`-${d} days`]);
  } catch (e) { console.warn('[db] 事件清理失败:', e.message); }
  // 过期预览页一并清掉
  try { run("DELETE FROM preview_pages WHERE expires_at IS NOT NULL AND expires_at < datetime('now')"); } catch (e) {}
  if (removed) { try { db.run('VACUUM'); } catch (e) {} compactDatabase(true); }
  return { days: d, removed };
}

function getEventStats(filters) {
  const proj = [];
  let projSql = "";
  if (filters?.project_id) {
    projSql = " AND project_id = ?";
    proj.push(filters.project_id);
  }

  const totalRow = queryOne(`SELECT COUNT(*) as total FROM events WHERE 1=1${projSql}`, proj);
  const goals = query(
    `SELECT goal_id, COUNT(*) as count, MAX(created_at) as last_at FROM events WHERE 1=1${projSql} GROUP BY goal_id ORDER BY count DESC LIMIT 50`,
    proj
  );
  const daily = query(
    `SELECT date(created_at) as date, COUNT(*) as count FROM events
     WHERE created_at >= datetime('now','-13 days','localtime')${projSql}
     GROUP BY date(created_at) ORDER BY date ASC`,
    proj
  );
  const recent = query(
    `SELECT goal_id, type, url, created_at FROM events WHERE 1=1${projSql} ORDER BY created_at DESC LIMIT 15`,
    proj
  );

  return {
    total: totalRow ? totalRow.total : 0,
    goals,
    daily,
    recent,
  };
}

function getEvents(filters) {
  let sql = "SELECT goal_id, type, url, COUNT(*) as count FROM events WHERE 1=1";
  const params = [];
  if (filters?.goal_id) {
    sql += ' AND goal_id = ?';
    params.push(filters.goal_id);
  }
  if (filters?.project_id) {
    sql += ' AND project_id = ?';
    params.push(filters.project_id);
  }
  sql += " GROUP BY goal_id, type ORDER BY count DESC LIMIT 100";
  return query(sql, params);
}

// ---------- 增长 Agent(自动跑轮) ----------
function getGrowthConfig(projectId) {
  return queryOne('SELECT * FROM growth_agent_config WHERE project_id = ?', [projectId]) || null;
}
function listGrowthConfigs(enabledOnly) {
  const rows = enabledOnly
    ? query('SELECT * FROM growth_agent_config WHERE enabled = 1 ORDER BY COALESCE(last_tick_at, created_at) ASC LIMIT 200')
    : query('SELECT * FROM growth_agent_config ORDER BY created_at DESC LIMIT 200');
  return rows;
}
// 按项目批量统计线索数(多目标:线索目标用)
function leadCountsFor(projectIds) {
  const ids = (projectIds || []).filter(Boolean);
  const out = {};
  if (!ids.length) return out;
  try {
    const ph = ids.map(() => '?').join(',');
    const rows = query(`SELECT project_id, COUNT(*) AS n FROM leads WHERE project_id IN (${ph}) GROUP BY project_id`, ids);
    rows.forEach((r) => { out[r.project_id] = r.n; });
  } catch (e) { /* 静默 */ }
  return out;
}

function upsertGrowthConfig(projectId, userId, patch) {
  const cur = getGrowthConfig(projectId);
  const num = (v, d, lo, hi) => { const n = Number(v); return isFinite(n) ? Math.max(lo, Math.min(hi, Math.round(n))) : d; };
  const OBJECTIVES = ['cta_click', 'lead'];
  const v = {
    objective: (patch && OBJECTIVES.includes(patch.objective)) ? patch.objective : (cur && cur.objective ? cur.objective : 'cta_click'),
    enabled: patch && patch.enabled !== undefined ? (patch.enabled ? 1 : 0) : (cur ? cur.enabled : 0),
    min_views: num(patch && patch.min_views, cur ? cur.min_views : 50, 1, 1000000),
    max_rounds: num(patch && patch.max_rounds, cur ? cur.max_rounds : 5, 1, 50),
    cooldown_hours: num(patch && patch.cooldown_hours, cur ? cur.cooldown_hours : 12, 0, 720),
    hold_hours: num(patch && patch.hold_hours, cur ? cur.hold_hours : 48, 1, 720),
    auto_promote: patch && patch.auto_promote !== undefined ? (patch.auto_promote ? 1 : 0) : (cur ? cur.auto_promote : 1),
    note: (patch && patch.note !== undefined ? String(patch.note).slice(0, 200) : (cur ? cur.note : null)),
    guard_enabled: patch && patch.guard_enabled !== undefined ? (patch.guard_enabled ? 1 : 0) : (cur && cur.guard_enabled !== null && cur.guard_enabled !== undefined ? cur.guard_enabled : 1),
    guard_min_views: num(patch && patch.guard_min_views, cur ? cur.guard_min_views : 50, 1, 1000000),
    guard_drop_pct: num(patch && patch.guard_drop_pct, cur ? cur.guard_drop_pct : 60, 10, 99),
    guard_window_hours: num(patch && patch.guard_window_hours, cur ? cur.guard_window_hours : 6, 1, 168),
    guard_max_inconclusive: num(patch && patch.guard_max_inconclusive, cur ? cur.guard_max_inconclusive : 3, 1, 20),
    approval_mode: patch && patch.approval_mode !== undefined ? (patch.approval_mode ? 1 : 0) : (cur ? cur.approval_mode : 0),
    proposal_ttl_hours: num(patch && patch.proposal_ttl_hours, cur ? cur.proposal_ttl_hours : 48, 1, 720),
  };
  if (cur) {
    run(`UPDATE growth_agent_config SET objective=?, enabled=?, min_views=?, max_rounds=?, cooldown_hours=?, hold_hours=?, auto_promote=?, note=?,
         guard_enabled=?, guard_min_views=?, guard_drop_pct=?, guard_window_hours=?, guard_max_inconclusive=?,
         approval_mode=?, proposal_ttl_hours=? WHERE project_id=?`,
      [v.objective, v.enabled, v.min_views, v.max_rounds, v.cooldown_hours, v.hold_hours, v.auto_promote, v.note,
       v.guard_enabled, v.guard_min_views, v.guard_drop_pct, v.guard_window_hours, v.guard_max_inconclusive,
       v.approval_mode, v.proposal_ttl_hours, projectId]);
  } else {
    run(`INSERT INTO growth_agent_config (project_id, user_id, objective, enabled, min_views, max_rounds, cooldown_hours, hold_hours, auto_promote, note,
         guard_enabled, guard_min_views, guard_drop_pct, guard_window_hours, guard_max_inconclusive, approval_mode, proposal_ttl_hours)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [projectId, userId, v.objective, v.enabled, v.min_views, v.max_rounds, v.cooldown_hours, v.hold_hours, v.auto_promote, v.note,
       v.guard_enabled, v.guard_min_views, v.guard_drop_pct, v.guard_window_hours, v.guard_max_inconclusive, v.approval_mode, v.proposal_ttl_hours]);
  }
  return getGrowthConfig(projectId);
}
// 指定项目在 [offsetHours, offsetHours+hours) 窗口内的曝光数
function viewsInWindow(projectId, hours, offsetHours) {
  const h = Math.max(1, Number(hours) || 6), off = Math.max(0, Number(offsetHours) || 0);
  const row = queryOne(
    `SELECT COUNT(*) AS n FROM events WHERE project_id = ? AND type = 'page_view'
       AND created_at >= datetime('now', ?) AND created_at < datetime('now', ?)`,
    [projectId, `-${h + off} hours`, `-${off} hours`]
  );
  return row ? row.n : 0;
}

// 指定项目在近 hours 小时内的转化数(按目标)
function conversionsInWindow(projectId, objective, hours) {
  const h = Math.max(1, Number(hours) || 6);
  if (objective === 'lead') {
    const r = queryOne(`SELECT COUNT(*) AS n FROM leads WHERE project_id = ? AND created_at >= datetime('now', ?)`, [projectId, `-${h} hours`]);
    return r ? r.n : 0;
  }
  const r = queryOne(
    `SELECT COUNT(*) AS n FROM events WHERE project_id = ? AND type = 'cta_click' AND created_at >= datetime('now', ?)`,
    [projectId, `-${h} hours`]
  );
  return r ? r.n : 0;
}

// ---------- 开放平台:API 密钥 ----------
function sha256(t) { return crypto.createHash('sha256').update(String(t)).digest('hex'); }
function createApiKey(userId, name, scopes) {
  const raw = 'wfk_' + crypto.randomBytes(20).toString('hex');
  const id = uuidv4();
  run('INSERT INTO api_keys (id, user_id, name, key_prefix, key_hash, scopes) VALUES (?, ?, ?, ?, ?, ?)',
    [id, userId, (name || 'default').slice(0, 40), raw.slice(0, 11), sha256(raw), JSON.stringify(scopes || [])]);
  return { id, key: raw, name: name || 'default' };
}
function listApiKeys(userId) {
  return query('SELECT id, name, key_prefix, scopes, quota_per_day, calls_today, calls_day, last_used_at, created_at FROM api_keys WHERE user_id = ? AND revoked_at IS NULL ORDER BY created_at DESC', [userId])
    .map((r) => Object.assign({}, r, { scopes: safeParse(r.scopes, []) }));
}
function setApiKeyQuota(id, quota) {
  const q = Math.max(1, Math.min(1000000, Number(quota) || 2000));
  run('UPDATE api_keys SET quota_per_day = ? WHERE id = ?', [q, id]);
  return q;
}

function revokeApiKey(id, userId) {
  const row = queryOne('SELECT id FROM api_keys WHERE id = ? AND user_id = ?', [id, userId]);
  if (!row) return false;
  run("UPDATE api_keys SET revoked_at = datetime('now') WHERE id = ?", [id]);
  return true;
}
// 用密钥换取用户(校验 + 记录使用时间)
function userByApiKey(rawKey) {
  if (!rawKey || rawKey.indexOf('wfk_') !== 0) return null;
  const row = queryOne('SELECT * FROM api_keys WHERE key_hash = ? AND revoked_at IS NULL', [sha256(rawKey)]);
  if (!row) return null;
  run("UPDATE api_keys SET last_used_at = datetime('now') WHERE id = ?", [row.id]);
  const user = findUserById(row.user_id);
  if (!user) return null;
  // scopes 在库里是 JSON 文本 → 必须解析成数组,否则权限判断会失效
  let scopes = [];
  try { scopes = JSON.parse(row.scopes || '[]'); } catch (e) { scopes = []; }
  return { user, key: Object.assign({}, row, { scopes: Array.isArray(scopes) ? scopes : [] }) };
}

// ---------- 预览页(未发布,凭 token 访问,过期自动失效) ----------
function addPreviewPage(row) {
  const token = crypto.randomBytes(10).toString('hex');
  run(`INSERT INTO preview_pages (token, user_id, project_id, proposal_id, side, data, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now', ?))`,
    [token, row.user_id || null, row.project_id || null, row.proposal_id || null, row.side || 'a',
     JSON.stringify(row.data || {}), `+${Math.max(1, Number(row.ttlHours) || 720)} hours`]);
  return token;
}
// ---------- 经验契约(G4) ----------
const OUTCOMES = ['win', 'loss', 'neutral'];
function addLesson(row) {
  const id = uuidv4();
  const outcome = OUTCOMES.includes(row.outcome) ? row.outcome : 'neutral';
  run(`INSERT INTO lessons (id, system, scope, scene, action, action_label, outcome, metric, delta, weight, source, detail, ref)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, String(row.system || 'unknown').slice(0, 40), String(row.scope || '').slice(0, 120),
     String(row.scene || '').slice(0, 80), String(row.action || '').slice(0, 80),
     String(row.action_label || row.action || '').slice(0, 120), outcome,
     String(row.metric || '').slice(0, 40), Number.isFinite(Number(row.delta)) ? Number(row.delta) : null,
     Number.isFinite(Number(row.weight)) ? Number(row.weight) : 1,
     String(row.source || 'observed').slice(0, 20), String(row.detail || '').slice(0, 400), String(row.ref || '').slice(0, 120)]);
  return queryOne('SELECT * FROM lessons WHERE id = ?', [id]);
}
function listLessons(f) {
  const x = f || {};
  const where = [], params = [];
  if (x.system) { where.push('system = ?'); params.push(x.system); }
  if (x.scene) { where.push('scene = ?'); params.push(x.scene); }
  if (x.action) { where.push('action = ?'); params.push(x.action); }
  if (x.scope) { where.push('scope = ?'); params.push(x.scope); }
  if (x.outcome) { where.push('outcome = ?'); params.push(x.outcome); }
  return query(`SELECT * FROM lessons ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY created_at DESC LIMIT ?`,
    params.concat([Math.min(1000, Number(x.limit) || 200)]));
}
// 聚合:按 system/scene/action 统计胜负(贝叶斯平滑,先验≈50%)
function aggregateLessons(f) {
  const ALPHA = 2, BETA = 2;
  const rows = listLessons(Object.assign({ limit: 1000 }, f || {}));
  const bag = {};
  rows.forEach((r) => {
    const key = [r.system, r.scene, r.action].join('|');
    const b = bag[key] || (bag[key] = { system: r.system, scene: r.scene, action: r.action, action_label: r.action_label || r.action, wins: 0, losses: 0, neutral: 0, decided: 0, trials: 0, deltaSum: 0, deltaN: 0, last_at: r.created_at });
    b.trials++;
    if (r.outcome === 'win') { b.wins++; b.decided++; }
    else if (r.outcome === 'loss') { b.losses++; b.decided++; }
    else b.neutral++;
    if (r.delta != null) { b.deltaSum += r.delta; b.deltaN++; }
    if (String(r.created_at) > String(b.last_at)) b.last_at = r.created_at;
  });
  return Object.values(bag).map((b) => ({
    system: b.system, scene: b.scene, action: b.action, action_label: b.action_label,
    trials: b.trials, decided: b.decided, wins: b.wins, losses: b.losses,
    winRate: +(((b.wins + ALPHA) / (b.decided + ALPHA + BETA))).toFixed(3),
    avgDelta: b.deltaN ? +(b.deltaSum / b.deltaN).toFixed(4) : null,
    last_at: b.last_at,
  })).sort((a, b) => (b.winRate - a.winRate) || (b.decided - a.decided));
}
function deleteLesson(id, system) {
  const row = queryOne('SELECT id, system FROM lessons WHERE id = ?', [id]);
  if (!row) return false;
  if (system && row.system !== system) return false;
  run('DELETE FROM lessons WHERE id = ?', [id]);
  return true;
}

// ---------- 能力目录(G3) ----------
function parseCap(r) {
  if (!r) return null;
  return Object.assign({}, r, {
    params: (() => { try { return JSON.parse(r.params || '{}'); } catch (e) { return {}; } })(),
    scopes: (() => { try { return JSON.parse(r.scopes || '[]'); } catch (e) { return []; } })(),
  });
}
function upsertCapability(cap) {
  const id = String(cap.id || '').trim();
  // 能力 id 必须是 <system>.<name> 形式(防止脏数据污染目录)
  if (!id || !/^[a-z][a-z0-9-]*\.[a-z][a-z0-9._-]*$/.test(id)) return null;
  const exist = queryOne('SELECT id FROM capabilities WHERE id = ?', [id]);
  const vals = [
    cap.system || 'unknown', cap.name || id, (cap.description || '').slice(0, 400), cap.kind || 'action',
    JSON.stringify(cap.params || {}), (cap.returns || '').slice(0, 300), (cap.auth || '').slice(0, 80),
    JSON.stringify(cap.scopes || []), (cap.endpoint || '').slice(0, 300), cap.invoke || 'http',
    cap.status || 'active', (cap.version || '1').slice(0, 20), cap.source || 'registered',
    cap.owner_user_id || null,
  ];
  if (exist) {
    run(`UPDATE capabilities SET system=?, name=?, description=?, kind=?, params=?, returns=?, auth=?, scopes=?, endpoint=?, invoke=?, status=?, version=?, source=?, owner_user_id=?, updated_at=datetime('now') WHERE id=?`,
      vals.concat([id]));
  } else {
    // 注意:列首是 id,值数组必须以 id 开头(此前漏掉 → 主键被写成 system,后续条目全部冲突)
    run(`INSERT INTO capabilities (id, system, name, description, kind, params, returns, auth, scopes, endpoint, invoke, status, version, source, owner_user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id].concat(vals));
  }
  return getCapability(id);
}
function getCapability(id) {
  return parseCap(queryOne('SELECT * FROM capabilities WHERE id = ?', [id]));
}
function listCapabilities(filters) {
  const f = filters || {};
  const where = [], params = [];
  if (!f.includeDeprecated) where.push('deprecated_at IS NULL');
  if (f.system) { where.push('system = ?'); params.push(f.system); }
  if (f.kind) { where.push('kind = ?'); params.push(f.kind); }
  if (f.status) { where.push('status = ?'); params.push(f.status); }
  if (f.source) { where.push('source = ?'); params.push(f.source); }
  const sql = `SELECT * FROM capabilities ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY system, id LIMIT ?`;
  let rows = query(sql, params.concat([Number(f.limit) || 200])).map(parseCap);
  if (f.q) {
    const q = String(f.q).toLowerCase();
    rows = rows.filter((r) => (r.id + ' ' + r.name + ' ' + r.description).toLowerCase().includes(q));
  }
  return rows;
}
function deprecateCapability(id, replacedBy) {
  run("UPDATE capabilities SET deprecated_at = datetime('now'), replaced_by = ? WHERE id = ?", [replacedBy || null, id]);
  return getCapability(id);
}
function setCapabilityVerified(id, status) {
  run("UPDATE capabilities SET last_verified_at = datetime('now'), status = ? WHERE id = ?", [status || 'active', id]);
}

// ---------- 身份打通(G2) ----------
function createIdentity(traits) {
  const id = uuidv4();
  run('INSERT INTO identities (id, traits) VALUES (?, ?)', [id, JSON.stringify(traits || {})]);
  return getIdentity(id);
}
function getIdentity(id) {
  const r = queryOne('SELECT * FROM identities WHERE id = ?', [id]);
  if (!r) return null;
  let traits = {}; try { traits = JSON.parse(r.traits || '{}'); } catch (e) {}
  const links = query('SELECT kind, value FROM identity_links WHERE identity_id = ?', [id]);
  return Object.assign({}, r, { traits, links });
}
// 按任一标识找身份(遇到已合并的,跳到合并目标)
function findIdentity(kind, value) {
  const link = queryOne('SELECT identity_id FROM identity_links WHERE kind = ? AND value = ?', [String(kind), String(value)]);
  if (!link) return null;
  let id = link.identity_id;
  for (let i = 0; i < 5; i++) {
    const row = queryOne('SELECT merged_into FROM identities WHERE id = ?', [id]);
    if (!row || !row.merged_into) break;
    id = row.merged_into;
  }
  return getIdentity(id);
}
function linkIdentity(identityId, kind, value) {
  const k = String(kind), v = String(value);
  if (!k || !v) return;
  const exist = queryOne('SELECT id, identity_id FROM identity_links WHERE kind = ? AND value = ?', [k, v]);
  if (exist) {
    if (exist.identity_id !== identityId) {
      // 该标识已挂在别的身份上 → 合并过来
      mergeIdentities(identityId, exist.identity_id);
    }
    run("UPDATE identity_links SET last_seen_at = datetime('now') WHERE id = ?", [exist.id]);
    return;
  }
  run('INSERT INTO identity_links (id, identity_id, kind, value) VALUES (?, ?, ?, ?)', [uuidv4(), identityId, k, v]);
}
// 把 b 合并进 a(链接转移 + 标记 merged_into)
function mergeIdentities(aId, bId) {
  if (!aId || !bId || aId === bId) return aId;
  run('UPDATE identity_links SET identity_id = ? WHERE identity_id = ?', [aId, bId]);
  run('UPDATE events SET identity_id = ? WHERE identity_id = ?', [aId, bId]);
  run('UPDATE leads SET identity_id = ? WHERE identity_id = ?', [aId, bId]);
  run("UPDATE identities SET merged_into = ?, last_seen_at = datetime('now') WHERE id = ?", [aId, bId]);
  run("UPDATE identities SET last_seen_at = datetime('now') WHERE id = ?", [aId]);
  return aId;
}
function touchIdentity(id) {
  run("UPDATE identities SET last_seen_at = datetime('now') WHERE id = ?", [id]);
}
function setIdentityTraits(id, traits) {
  if (!traits || !Object.keys(traits).length) return;
  const cur = queryOne('SELECT traits FROM identities WHERE id = ?', [id]);
  let merged = {};
  try { merged = JSON.parse((cur && cur.traits) || '{}'); } catch (e) {}
  Object.keys(traits).forEach((k) => { if (traits[k] != null && traits[k] !== '') merged[k] = String(traits[k]).slice(0, 120); });
  run('UPDATE identities SET traits = ? WHERE id = ?', [JSON.stringify(merged), id]);
}
function setEventIdentity(eventId, identityId) {
  run('UPDATE events SET identity_id = ? WHERE id = ?', [identityId, eventId]);
}
// 端到端轨迹:一次投放/一次调用的全链路(事件 + 线索 + 订单 + 接口调用)
function traceTimeline(traceId, limit) {
  const t = String(traceId || '').trim();
  if (!t) return [];
  const n = Math.min(300, Number(limit) || 100);
  const events = query(`SELECT 'event' AS source, type AS kind, goal_id AS detail, created_at, value, project_id FROM events WHERE trace_id = ? ORDER BY created_at DESC LIMIT ?`, [t, n]);
  const leads = query(`SELECT 'lead' AS source, COALESCE(form_id,'lead') AS kind, project_name AS detail, created_at, NULL AS value, project_id FROM leads WHERE trace_id = ? ORDER BY created_at DESC LIMIT ?`, [t, n]);
  const orders = query(`SELECT 'order' AS source, kind, order_no AS detail, created_at, amount_cents AS value, NULL AS project_id FROM payflow_orders WHERE trace_id = ? ORDER BY created_at DESC LIMIT ?`, [t, n]);
  const calls = query(`SELECT 'api' AS source, action AS kind, detail, created_at, NULL AS value, NULL AS project_id FROM api_audit WHERE trace_id = ? ORDER BY created_at DESC LIMIT ?`, [t, n]);
  return events.concat(leads, orders, calls).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, n);
}
function setOrderTrace(orderNo, traceId) {
  if (!traceId) return;
  run('UPDATE payflow_orders SET trace_id = ? WHERE order_no = ?', [String(traceId).slice(0, 80), String(orderNo)]);
}
function setLeadTrace(leadId, traceId) {
  if (!traceId) return;
  run('UPDATE leads SET trace_id = ? WHERE id = ?', [String(traceId).slice(0, 80), leadId]);
}
function setEventTrace(eventId, traceId) {
  if (!traceId) return;
  run('UPDATE events SET trace_id = ? WHERE id = ?', [String(traceId).slice(0, 80), eventId]);
}

// ---------- 目标与编排(阶段三) ----------
function createGoal(row) {
  const id = uuidv4();
  run(`INSERT INTO goals (id, user_id, project_id, name, metric, direction, target, window_days, deadline)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, row.user_id, row.project_id || null, String(row.name || '').slice(0, 80) || null,
     String(row.metric || 'cvr').slice(0, 30), row.direction === 'down' ? 'down' : 'up',
     Number(row.target) || 0, Math.max(1, Math.min(180, Number(row.window_days) || 7)), row.deadline || null]);
  return getGoal(id);
}
function getGoal(id) {
  return queryOne('SELECT * FROM goals WHERE id = ?', [id]);
}
function listGoals(f) {
  const x = f || {};
  const where = [], params = [];
  if (x.user_id) { where.push('user_id = ?'); params.push(x.user_id); }
  if (x.project_id) { where.push('project_id = ?'); params.push(x.project_id); }
  if (x.status) { where.push('status = ?'); params.push(x.status); }
  if (x.enabledOnly) where.push('enabled = 1');
  return query(`SELECT * FROM goals ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY created_at DESC LIMIT 100`, params);
}
function updateGoalState(id, patch) {
  const p = patch || {};
  run(`UPDATE goals SET status = COALESCE(?, status), last_value = COALESCE(?, last_value), last_eval_at = datetime('now'), enabled = COALESCE(?, enabled) WHERE id = ?`,
    [p.status || null, p.last_value === undefined ? null : p.last_value, p.enabled === undefined ? null : (p.enabled ? 1 : 0), id]);
  return getGoal(id);
}
function addGoalCycle(row) {
  const id = uuidv4();
  run('INSERT INTO goal_cycles (id, goal_id, value, target, gap, action, detail, ref) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, row.goal_id, Number.isFinite(Number(row.value)) ? Number(row.value) : null, Number(row.target) || null,
     Number.isFinite(Number(row.gap)) ? Number(row.gap) : null, String(row.action || '').slice(0, 40),
     String(row.detail || '').slice(0, 300), row.ref || null]);
  return queryOne('SELECT * FROM goal_cycles WHERE id = ?', [id]);
}
function listGoalCycles(goalId, limit) {
  return query('SELECT * FROM goal_cycles WHERE goal_id = ? ORDER BY created_at DESC LIMIT ?', [goalId, Math.min(200, Number(limit) || 30)]);
}

// 范式效果统计(自我进化:越用越准)
function addPatternPack(row) {
  const id = uuidv4();
  run('INSERT INTO pattern_packs (id, owner_id, name, author, version, patterns) VALUES (?, ?, ?, ?, ?, ?)',
    [id, row.owner_id || null, String(row.name || '').slice(0, 60), String(row.author || '').slice(0, 60),
     String(row.version || '1'), JSON.stringify(row.patterns || [])]);
  return queryOne('SELECT * FROM pattern_packs WHERE id = ?', [id]);
}
function listPatternPacks(ownerId, limit) {
  return query('SELECT * FROM pattern_packs WHERE owner_id = ? ORDER BY created_at DESC LIMIT ?', [ownerId, Math.min(50, Number(limit) || 20)]);
}

function bumpPatternStat(userId, key, patch) {
  if (!userId || !key) return null;
  const p = patch || {};
  const cur = queryOne('SELECT * FROM pattern_stats WHERE user_id = ? AND pattern_key = ?', [userId, key]);
  if (!cur) {
    run('INSERT INTO pattern_stats (user_id, pattern_key, uses, wins, losses, qa_issues) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, key, Number(p.uses) || 0, Number(p.wins) || 0, Number(p.losses) || 0, Number(p.qa_issues) || 0]);
  } else {
    run(`UPDATE pattern_stats SET uses = uses + ?, wins = wins + ?, losses = losses + ?, qa_issues = qa_issues + ?, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ? AND pattern_key = ?`,
      [Number(p.uses) || 0, Number(p.wins) || 0, Number(p.losses) || 0, Number(p.qa_issues) || 0, userId, key]);
  }
  return queryOne('SELECT * FROM pattern_stats WHERE user_id = ? AND pattern_key = ?', [userId, key]);
}
function listPatternStats(userId) {
  return query('SELECT * FROM pattern_stats WHERE user_id = ? ORDER BY (wins - losses) DESC, uses DESC LIMIT 60', [userId]);
}

function listUsers(limit) {
  return query('SELECT id, email, username, plan, plan_expires_at, created_at FROM users ORDER BY created_at ASC LIMIT ?', [Math.min(500, Number(limit) || 100)]);
}

function launchFunnel() {
  return query(`SELECT u.id AS user_id, u.created_at AS user_at, MIN(p.published_at) AS first_pub
    FROM users u
    JOIN projects p ON p.user_id = u.id AND p.published = 1 AND p.published_at IS NOT NULL
    GROUP BY u.id`);
}

function countPublishedSince(since) {
  const row = queryOne('SELECT COUNT(*) AS n FROM projects WHERE published = 1 AND published_at >= ?', [since]);
  return row ? row.n : 0;
}

function addSelfCheck(row) {
  const id = uuidv4();
  run('INSERT INTO self_checks (id, user_id, ok, warns, report) VALUES (?, ?, ?, ?, ?)',
    [id, row.user_id || null, row.ok ? 1 : 0, Number(row.warns) || 0, row.report || '{}']);
  return queryOne('SELECT * FROM self_checks WHERE id = ?', [id]);
}
function listSelfChecks(userId, limit) {
  return query('SELECT id, ok, warns, created_at FROM self_checks WHERE user_id = ? ORDER BY created_at DESC LIMIT ?', [userId, Math.min(100, Number(limit) || 10)]);
}

function addProduction(row) {
  const id = uuidv4();
  run('INSERT INTO productions (id, user_id, brief, status) VALUES (?, ?, ?, ?)',
    [id, row.user_id || null, row.brief || '{}', row.status || 'running']);
  return getProduction(id);
}
function getProduction(id) { return queryOne('SELECT * FROM productions WHERE id = ?', [id]); }
function listProductions(userId, limit) {
  return query('SELECT * FROM productions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?', [userId, Math.min(100, Number(limit) || 20)]);
}
function updateProduction(id, patch) {
  const p = patch || {};
  const cur = getProduction(id);
  if (!cur) return null;
  run('UPDATE productions SET status = ?, steps = ?, result = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [p.status != null ? p.status : cur.status, p.steps != null ? p.steps : cur.steps, p.result != null ? p.result : cur.result, id]);
  return getProduction(id);
}

function addCrossAction(row) {
  const id = row.id || uuidv4();
  run(`INSERT INTO cross_actions (id, user_id, project_id, goal_id, trace_id, capability_id, system, kind, title, reason, payload, status, requires_approval)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, row.user_id || null, row.project_id || null, row.goal_id || null, row.trace_id || null,
     row.capability_id, row.system || null, row.kind || null, String(row.title || '').slice(0, 200),
     String(row.reason || '').slice(0, 500), row.payload ? JSON.stringify(row.payload).slice(0, 4000) : null,
     row.status || 'pending', row.requires_approval === 0 ? 0 : 1]);
  return getCrossAction(id);
}
function getCrossAction(id) {
  return queryOne('SELECT * FROM cross_actions WHERE id = ?', [id]);
}
function listCrossActions(opt) {
  const o = opt || {};
  const where = [];
  const args = [];
  if (o.user_id) { where.push('user_id = ?'); args.push(o.user_id); }
  if (o.status) { where.push('status = ?'); args.push(o.status); }
  if (o.project_id) { where.push('project_id = ?'); args.push(o.project_id); }
  args.push(Math.min(200, Number(o.limit) || 50));
  return query('SELECT * FROM cross_actions' + (where.length ? ' WHERE ' + where.join(' AND ') : '') + ' ORDER BY created_at DESC LIMIT ?', args);
}
function countPendingCrossActions(userId) {
  const r = queryOne("SELECT COUNT(*) AS n FROM cross_actions WHERE status = 'pending'" + (userId ? ' AND user_id = ?' : ''), userId ? [userId] : []);
  return (r && r.n) || 0;
}
function decideCrossAction(id, patch) {
  const p = patch || {};
  run('UPDATE cross_actions SET status = ?, decided_at = CURRENT_TIMESTAMP, decided_by = ?, result = ? WHERE id = ?',
    [p.status, p.decided_by || null, p.result ? JSON.stringify(p.result).slice(0, 4000) : null, id]);
  return getCrossAction(id);
}

function setOrderIdentity(orderNo, identityId) {
  run('UPDATE payflow_orders SET identity_id = ? WHERE order_no = ?', [identityId, String(orderNo)]);
}
function setLeadIdentity(leadId, identityId) {
  run('UPDATE leads SET identity_id = ? WHERE id = ?', [identityId, leadId]);
}
// 身份时间线:页面事件 + 线索 + 订单
function identityTimeline(identityId, limit) {
  const n = Math.min(200, Number(limit) || 50);
  const id = String(identityId);
  const events = query(
    `SELECT 'event' AS source, type AS kind, goal_id AS detail, created_at, value FROM events WHERE identity_id = ? ORDER BY created_at DESC LIMIT ?`, [id, n]);
  const leads = query(
    `SELECT 'lead' AS source, COALESCE(form_id,'lead') AS kind, project_name AS detail, created_at, NULL AS value FROM leads WHERE identity_id = ? ORDER BY created_at DESC LIMIT ?`, [id, n]);
  const orders = query(
    `SELECT 'order' AS source, kind, order_no AS detail, created_at, amount_cents AS value FROM payflow_orders WHERE identity_id = ? ORDER BY created_at DESC LIMIT ?`, [id, n]);
  return events.concat(leads, orders).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, n);
}
function identityStats() {
  const r = queryOne('SELECT COUNT(*) AS n FROM identities WHERE merged_into IS NULL');
  const l = queryOne('SELECT COUNT(*) AS n FROM identity_links');
  return { identities: r ? r.n : 0, links: l ? l.n : 0 };
}

// ---------- 开放平台:审计与配额 ----------
function addApiAudit(row) {
  try {
    run('INSERT INTO api_audit (id, key_id, user_id, action, detail, ok, error, ms, ip, trace_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [uuidv4(), row.key_id || null, row.user_id || null, (row.action || '').slice(0, 60),
       (row.detail || '').slice(0, 300), row.ok ? 1 : 0, (row.error || '').slice(0, 200), Number(row.ms) || 0, (row.ip || '').slice(0, 60),
       row.trace_id ? String(row.trace_id).slice(0, 80) : null]);
  } catch (e) { /* 审计失败不影响业务 */ }
}
function listApiAudit(userId, limit) {
  return query('SELECT * FROM api_audit WHERE user_id = ? ORDER BY created_at DESC LIMIT ?', [userId, limit || 50]);
}
// 当日调用计数(跨天自动归零)
function bumpApiQuota(keyId) {
  const today = new Date().toISOString().slice(0, 10);
  const row = queryOne('SELECT calls_today, calls_day FROM api_keys WHERE id = ?', [keyId]);
  if (!row) return { ok: false, calls: 0 };
  const sameDay = row.calls_day === today;             // 跨天则从 0 起算
  const n = (sameDay ? (Number(row.calls_today) || 0) : 0) + 1;
  run('UPDATE api_keys SET calls_today = ?, calls_day = ? WHERE id = ?', [n, today, keyId]);
  return { ok: true, calls: n };
}

function getPreviewPage(token) {
  const r = queryOne("SELECT * FROM preview_pages WHERE token = ? AND (expires_at IS NULL OR expires_at > datetime('now'))", [token]);
  if (!r) return null;
  return Object.assign({}, r, { data: safeParse(r.data, {}) });
}

// ---------- 增长提案(人审模式) ----------
function addGrowthProposal(row) {
  const id = uuidv4();
  run(`INSERT INTO growth_proposals (id, project_id, user_id, round, objective, hypothesis, reason, theme, categories, ops, stats_before, base_goal, agent_context)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, row.project_id, row.user_id || null, Number(row.round) || 1, row.objective || 'cta_click',
     row.hypothesis || null, row.reason || null, row.theme || null,
     JSON.stringify(row.categories || []), JSON.stringify(row.ops || []), JSON.stringify(row.stats_before || {}),
     row.base_goal || null, row.agent_context || null]);
  return getGrowthProposal(id);
}
function hydrateProposal(r) {
  if (!r) return null;
  return Object.assign({}, r, {
    ops: safeParse(r.ops, []), categories: safeParse(r.categories, []), stats_before: safeParse(r.stats_before, {}),
  });
}
function getGrowthProposal(id) {
  return hydrateProposal(queryOne('SELECT * FROM growth_proposals WHERE id = ?', [id]));
}
function listGrowthProposals(projectId, limit) {
  return query('SELECT * FROM growth_proposals WHERE project_id = ? ORDER BY created_at DESC LIMIT ?', [projectId, limit || 20]).map(hydrateProposal);
}
function getPendingProposal(projectId) {
  return hydrateProposal(queryOne("SELECT * FROM growth_proposals WHERE project_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1", [projectId]));
}
function listPendingProposalsForUser(userId) {
  return query("SELECT * FROM growth_proposals WHERE user_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 50", [userId]).map(hydrateProposal);
}
function setProposalPreviews(id, a, b) {
  run('UPDATE growth_proposals SET preview_a = ?, preview_b = ? WHERE id = ?', [a || null, b || null, id]);
  return getGrowthProposal(id);
}

function decideGrowthProposal(id, status, opts) {
  const o = opts || {};
  run("UPDATE growth_proposals SET status = ?, decided_by = ?, decided_at = datetime('now'), reject_reason = ?, run_id = ? WHERE id = ?",
    [status, o.by || null, o.reason || null, o.run_id || null, id]);
  return getGrowthProposal(id);
}
function expireGrowthProposals(projectId, ttlHours) {
  const h = Math.max(1, Number(ttlHours) || 48);
  run(`UPDATE growth_proposals SET status = 'expired', decided_at = datetime('now'), reject_reason = '超时未处理'
       WHERE project_id = ? AND status = 'pending' AND created_at < datetime('now', ?)`, [projectId, `-${h} hours`]);
  return true;
}

function addGuardEvent(row) {
  run('INSERT INTO growth_guard_events (id, project_id, user_id, kind, detail) VALUES (?, ?, ?, ?, ?)',
    [uuidv4(), row.project_id, row.user_id || null, row.kind || null, (row.detail || '').slice(0, 400)]);
}
function listGuardEvents(projectId, limit) {
  return query('SELECT * FROM growth_guard_events WHERE project_id = ? ORDER BY created_at DESC LIMIT ?', [projectId, limit || 10]);
}

// 暂停 Agent 并记录原因(风险闸门用)
function pauseGrowthAgent(projectId, reason) {
  run("UPDATE growth_agent_config SET enabled = 0, paused_reason = ?, paused_at = datetime('now'), note = ? WHERE project_id = ?",
    [String(reason || '').slice(0, 200), '风险暂停', projectId]);
}
function clearGrowthPause(projectId) {
  run('UPDATE growth_agent_config SET paused_reason = NULL, paused_at = NULL WHERE project_id = ?', [projectId]);
}

function touchGrowthTick(projectId) {
  run("UPDATE growth_agent_config SET last_tick_at = datetime('now') WHERE project_id = ?", [projectId]);
}
function addGrowthRun(row) {
  const id = uuidv4();
  const round = Number(row.round) || 1;
  run(`INSERT INTO growth_runs (id, project_id, user_id, round, status, hypothesis, reason, base_goal, ops, variants, stats_before, categories, theme, agent_context)
       VALUES (?, ?, ?, ?, 'running', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, row.project_id, row.user_id || null, round, row.hypothesis || null, row.reason || null,
     row.base_goal || null, JSON.stringify(row.ops || []), JSON.stringify(row.variants || []), JSON.stringify(row.stats_before || {}),
     JSON.stringify(row.categories || []), row.theme || null, row.agent_context || null]);
  return getGrowthRun(id);
}
function safeParse(t, d) { try { return t ? JSON.parse(t) : d; } catch (e) { return d; } }
function getGrowthRun(id) {
  const r = queryOne('SELECT * FROM growth_runs WHERE id = ?', [id]);
  // 必须与 listGrowthRuns 同样解析:此前漏了 categories → 结轮时写入经验会被静默吞掉
  return r ? hydrateRun(r) : null;
}
function listGrowthRuns(projectId, limit) {
  const rows = query('SELECT * FROM growth_runs WHERE project_id = ? ORDER BY started_at DESC LIMIT ?', [projectId, limit || 20]);
  return rows.map(hydrateRun);
}
// 某用户全部项目的轮次(用于跨项目学习)
function listGrowthRunsForUser(userId, limit) {
  const rows = query('SELECT * FROM growth_runs WHERE user_id = ? ORDER BY started_at DESC LIMIT ?', [userId, limit || 200]);
  return rows.map(hydrateRun);
}
function hydrateRun(r) {
  return Object.assign({}, r, {
    ops: safeParse(r.ops, []), variants: safeParse(r.variants, []),
    stats_before: safeParse(r.stats_before, {}), result: safeParse(r.result, null),
    categories: safeParse(r.categories, []),
  });
}
function getActiveGrowthRun(projectId) {
  const r = queryOne("SELECT * FROM growth_runs WHERE project_id = ? AND status = 'running' ORDER BY started_at DESC LIMIT 1", [projectId]);
  return r ? getGrowthRun(r.id) : null;
}
function concludeGrowthRun(id, status, result, decision) {
  run("UPDATE growth_runs SET status=?, result=?, decision=?, concluded_at=datetime('now') WHERE id=?",
    [status, JSON.stringify(result || {}), decision || null, id]);
  return getGrowthRun(id);
}

// ---------- 版式预设(团队共享) ----------
function createLayoutPreset(userId, author, name, layout, scope) {
  const id = uuidv4();
  run('INSERT INTO layout_presets (id, user_id, author, name, layout, scope) VALUES (?, ?, ?, ?, ?, ?)',
    [id, userId, author || null, String(name).slice(0, 40), JSON.stringify(layout || {}), scope === "private" ? "private" : "team"]);
  return getLayoutPreset(id);
}
function getLayoutPreset(id) {
  const row = queryOne('SELECT * FROM layout_presets WHERE id = ?', [id]);
  return row ? { ...row, layout: safeJson(row.layout) } : null;
}
function safeJson(t) { try { return JSON.parse(t || "{}"); } catch (e) { return {}; } }
function getLayoutPresets(userId) {
  const rows = query('SELECT * FROM layout_presets WHERE scope = ? OR user_id = ? ORDER BY created_at DESC LIMIT 100', ['team', userId || '']);
  return rows.map((r) => ({ ...r, layout: safeJson(r.layout), mine: r.user_id === userId }));
}
function deleteLayoutPreset(id, userId, isAdmin) {
  const row = queryOne('SELECT * FROM layout_presets WHERE id = ?', [id]);
  if (!row) return false;
  if (row.user_id !== userId && !isAdmin) return false;
  run('DELETE FROM layout_presets WHERE id = ?', [id]);
  return true;
}

module.exports = {
  dbDriver: () => DRIVER,
  addLead,
  getLeads,
  getRealtimeMetrics,
  createAlertRule,
  getAlertRules,
  getAllEnabledAlertRules,
  setAlertEnabled,
  deleteAlertRule,
  markAlertFired,
  getAllPayflowOrders,
  saveReconcileReport,
  getLastReconcile,
  setUserUtm,
  setRefVariant,
  setPayflowRefCode,
  updatePayflowOrderAmount,
  markPayflowOrderVoid,
  weekKey,
  getWeekStats,
  getWeekChannels,
  saveWeeklyReport,
  getWeeklyReports,
  hasWeeklyReport,
  getAttributionByUtm,
  setVerified,
  getRiskConfig,
  getPayoutRiskSnapshot,
  createSettlement,
  getSettlements,
  hasSettlement,
  getMonthlyCommission,
  getReferredCountByUser,
  createPayout,
  getPayouts,
  getPendingPayouts,
  getPayoutById,
  updatePayoutStatus,
  getPlansToGrace,
  startGrace,
  clearGrace,
  ensureReferralCode,
  findByReferralCode,
  bindReferrer,
  getReferredUsers,
  getReferralLeaderboard,
  getAttribution,
  getExpiringPlans,
  getExpiredPlans,
  downgradePlan,
  markPlanNoticed,
  createPayflowOrder,
  getPayflowOrder,
  getUserPayflowOrders,
  applyPayflowOrder,
  markPayflowRefunded,
  createScheduledTask,
  getScheduledTasks,
  getDueScheduledTasks,
  updateScheduledRun,
  setScheduledEnabled,
  deleteScheduledTask,
  createTask,
  getTasks,
  getTasksForReview,
  reviewTask,
  incrementTaskUses,
  deleteTask,
  createNotification,
  getNotifications,
  getUnreadCount,
  markAllRead,
  adminIds,
  PLANS,
  getUserPlan,
  getUsage,
  logAiCall,
  createCode,
  redeemCode,
  grantPlan,
  addBalance,
  createOrder,
  getUserOrders,
  getEarnings,
  createPlugin,
  getPlugins,
  getPluginsForReview,
  getGrowthConfig,
  leadCountsFor,
  viewsInWindow,
  pauseGrowthAgent,
  clearGrowthPause,
  conversionsInWindow,
  createApiKey,
  setApiKeyQuota,
  listApiKeys,
  revokeApiKey,
  userByApiKey,
  addLesson,
  listLessons,
  aggregateLessons,
  deleteLesson,
  upsertCapability,
  getCapability,
  listCapabilities,
  deprecateCapability,
  setCapabilityVerified,
  traceTimeline,
  setOrderTrace,
  setLeadTrace,
  setEventTrace,
  createGoal,
  getGoal,
  listGoals,
  updateGoalState,
  addGoalCycle,
  archiveProjects,
  addPatternPack,
  listPatternPacks,
  bumpPatternStat,
  listPatternStats,
  listUsers,
  launchFunnel,
  countPublishedSince,
  addSelfCheck,
  listSelfChecks,
  addProduction,
  getProduction,
  listProductions,
  updateProduction,
  addCrossAction,
  getCrossAction,
  listCrossActions,
  countPendingCrossActions,
  decideCrossAction,
  listGoalCycles,
  createIdentity,
  getIdentity,
  findIdentity,
  linkIdentity,
  mergeIdentities,
  touchIdentity,
  setIdentityTraits,
  setEventIdentity,
  setLeadIdentity,
  setOrderIdentity,
  identityTimeline,
  identityStats,
  addApiAudit,
  listApiAudit,
  bumpApiQuota,
  addPreviewPage,
  getPreviewPage,
  addGrowthProposal,
  setProposalPreviews,
  getGrowthProposal,
  listGrowthProposals,
  getPendingProposal,
  listPendingProposalsForUser,
  decideGrowthProposal,
  expireGrowthProposals,
  addGuardEvent,
  listGuardEvents,
  listGrowthConfigs,
  upsertGrowthConfig,
  touchGrowthTick,
  addGrowthRun,
  getGrowthRun,
  listGrowthRuns,
  listGrowthRunsForUser,
  getActiveGrowthRun,
  concludeGrowthRun,
  createLayoutPreset,
  getLayoutPresets,
  deleteLayoutPreset,
  reviewPlugin,
  incrementPluginUses,
  deletePlugin,
  getTemplatesForReview,
  reviewTemplate,
  hasPurchased,
  createTemplate,
  getTemplates,
  getTemplate,
  deleteTemplate,
  incrementTemplateDownloads,
  setPublished,
  getPublishedProject,
  addEvent,
  getEventStats,
  rollupEvents,
  getDailyTrend,
  pruneOldEvents,
  flushDatabase,
  projectGrowthSnapshot,
  getEventStatsBySeg,
  getEvents,
  initDatabase,
  createUser,
  findUserByEmail,
  findUserByUsername,
  findUserById,
  verifyPassword,
  updateUser,
  createProject,
  getUserProjects,
  getProject,
  updateProject,
  deleteProject,
  getProjectByShareToken,
  setProjectPublic,
  saveVersion,
  getProjectVersions,
  getVersion,
  publishBlock,
  getCommunityBlocks,
  incrementDownloads,
};
