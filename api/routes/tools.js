/* ============================================================
 * WebsFlow · 开放工具 API (tools.js)
 *
 * 目的:把「造页 / 改页 / 发布 / 读数据 / 增长实验 / 提案审批」暴露成
 *       自描述的工具接口,供外部 Agent(OpenFlow、MCP 客户端、脚本)调用。
 *
 * 设计:
 *   - 鉴权:API 密钥(Authorization: Bearer wfk_xxx),与用户会话 JWT 并存
 *   - 两个入口:GET /api/tools/manifest(工具清单 + 参数 schema)、POST /api/tools/call(执行)
 *   - 单一 call 入口 + manifest 自描述 → 任何 LLM/Agent 都能直接对接(也被 MCP 包装复用)
 *   - 密钥管理:GET/POST/DELETE /api/tools/keys(需登录)
 * ============================================================ */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, apiKeyAuth } = require('../auth');
const { loadWF } = require('../lib/wf');

function blocksOf(data) {
  const d = data || {};
  if (Array.isArray(d.pages) && d.pages.length) return d.pages[0].blocks || [];
  return d.blocks || [];
}
function setBlocks(data, blocks) {
  const d = data || {};
  if (Array.isArray(d.pages) && d.pages.length) d.pages[0].blocks = blocks;
  else d.blocks = blocks;
  return d;
}
function brief(blocks) {
  const WF = loadWF();
  return (blocks || []).map((b) => {
    const def = WF.Blocks[b.type] || {};
    const sum = def.summary ? def.summary(b.props || {}) : '';
    return { id: b.id, type: b.type, variant: b.variant || null, summary: String(sum || '').slice(0, 60), hidden: !!b.hidden };
  });
}
function pubUrl(p) { return p && p.share_token ? '/webflow/p/' + p.share_token : null; }

// ---------- 工具定义(自描述) ----------
const TOOLS = {
  // ---------- 生产流水线 & 体检(MCP / 外部 Agent 可直接调) ----------
  produce_run: {
    scope: 'growth',
    desc: '生产流水线:给一句 brief(业务/产品/受众/目标),自动产出故事线 → 模块(含范式新模块) → 自动配图 → A/B 两版(已发布) → 质检 → 交付包',
    params: { type: 'object', properties: {
      business: { type: 'string', description: '业务/品牌' }, product: { type: 'string' }, audience: { type: 'string' },
      goal: { type: 'string' }, mode: { type: 'string', description: 'site | h5 | story' }, industry: { type: 'string' },
      mediaTags: { type: 'array', items: { type: 'string' } }, ctaText: { type: 'string' }, price: { type: 'string' },
      mustHave: { type: 'array', items: { type: 'string' } }, objective: { type: 'string', description: 'cta_click | lead' },
      slug: { type: 'string' },
    }, required: ['business'] },
    run: async (user, a) => {
      const r = await require('../lib/producer').run(user.id, a || {});
      return { id: r.id, status: r.status, storyline: (r.storyline || {}).scenes ? r.storyline.scenes.length : 0,
        newModules: (r.newModules || []).map((m) => m.block_type), variants: r.variants, qa: r.qa, delivery: r.delivery };
    },
  },
  selfcheck_run: {
    scope: 'read',
    desc: '系统体检:检查配置/流水线/实验/数据/素材,可选自动修复安全项',
    params: { type: 'object', properties: { applyFixes: { type: 'boolean' }, deep: { type: 'boolean' } } },
    run: async (user, a) => {
      const sc = require('../lib/selfcheck');
      const r = await sc.run(user, { applyFixes: !!(a && a.applyFixes), deep: !!(a && a.deep) });
      r.smoothness = sc.smoothness(r);
      return { ok: r.ok, warns: r.warns, items: r.items, fixes: r.fixes, smoothness: r.smoothness };
    },
  },
  list_patterns: {
    scope: 'read',
    desc: '列出可用模块范式(内置 + 伙伴范式包),供开发者/Agent 参考与复用',
    params: { type: 'object', properties: { partner_only: { type: 'boolean' } } },
    run: (user, a) => {
      const out = [];
      try {
        const builtin = require('../lib/module-patterns.json').patterns || [];
        if (!(a && a.partner_only)) builtin.forEach((p) => out.push({ key: p.key, name: p.name, ref: p.ref, roles: p.roles, tags: p.tags, source: 'builtin' }));
      } catch (e) {}
      try { require('../lib/pattern-packs').asPatterns(user.id).forEach((p) => out.push({ key: p.key, name: p.name, ref: p.ref, roles: p.roles, tags: p.tags, source: 'partner', block_type: p.block_type })); } catch (e) {}
      return { patterns: out, count: out.length };
    },
  },
  pattern_pack_submit: {
    scope: 'write',
    desc: '提交范式包(一个 JSON = 一组模块范式):校验后自动注册为可用模块,后续生产自动优先使用',
    params: { type: 'object', properties: { pack: { type: 'object', description: '{name, author, version, patterns:[{key,name,ref,roles,tags,fields,template}]}' } }, required: ['pack'] },
    run: (user, a) => require('../lib/pattern-packs').submit(user, a.pack),
  },
  archive_variants: {
    scope: 'write',
    desc: '批量归档实验变体页(AI 轮次/演示页/对照副本),保持页面列表干净;可传 ids 精确归档',
    params: { type: 'object', properties: { ids: { type: 'array', items: { type: 'string' } } } },
    run: (user, a) => db.archiveProjects(user.id, { ids: a && a.ids }),
  },

  list_pages: {
    scope: "read",
    desc: '列出我的页面(项目):id、名称、形态、是否已发布、访问地址',
    params: { type: 'object', properties: {} },
    run: (user) => {
      const list = db.getUserProjects(user.id).map((p) => ({
        id: p.id, name: p.name, mode: p.mode, published: !!p.published, url: pubUrl(p), updated_at: p.updated_at,
      }));
      return { pages: list };
    },
  },
  get_page: {
    scope: "read",
    desc: '读取页面结构(模块 id/类型/摘要),用于后续精确改稿',
    params: { type: 'object', properties: { project_id: { type: 'string' } }, required: ['project_id'] },
    run: (user, a) => {
      const p = db.getProject(a.project_id, user.id);
      if (!p) throw new Error('项目不存在或无权访问');
      return { id: p.id, name: p.name, mode: p.mode, published: !!p.published, url: pubUrl(p), blocks: brief(blocksOf(p.data)) };
    },
  },
  create_page: {
    scope: "write",
    desc: '新建页面/创建落地页:用一句话生成并(默认)发布,返回可访问地址',
    params: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: '页面要做什么,例如「精品咖啡新品上市的投放落地页」' },
        mode: { type: 'string', enum: ['site', 'h5', 'ppt', 'story'], description: '形态,默认 site' },
        name: { type: 'string' },
        publish: { type: 'boolean', description: '是否立即发布,默认 true' },
      },
      required: ['prompt'],
    },
    run: async (user, a) => {
      const { generatePage } = require('../lib/ai');
      const mode = ['site', 'h5', 'ppt', 'story'].includes(a.mode) ? a.mode : 'site';
      const gen = await generatePage(user.id, a.prompt, mode);
      const created = db.createProject(user.id, (a.name || String(a.prompt).slice(0, 20)).slice(0, 60), mode, { blocks: gen.blocks, theme: {}, global: {} }, String(a.prompt).slice(0, 200));
      let url = null;
      if (a.publish !== false) { const r = db.setPublished(created.id, user.id, true); url = r ? '/webflow/p/' + r.share_token : null; }
      return { id: created.id, name: created.name, url, model: gen.model, blocks: brief(gen.blocks) };
    },
  },
  update_page: {
    scope: "write",
    desc: '修改页面文案与结构:给一句指令或结构化 ops,先出差异再应用',
    params: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        instruction: { type: 'string', description: '自然语言改动,例如「标题更具体,按钮改成立即预约」' },
        ops: { type: 'array', description: '结构化补丁:[{op:"update",id,props}]', items: { type: 'object' } },
        apply: { type: 'boolean', description: '是否写入,默认 true' },
      },
      required: ['project_id'],
    },
    run: async (user, a) => {
      const p = db.getProject(a.project_id, user.id);
      if (!p) throw new Error('项目不存在或无权访问');
      const WF = loadWF();
      const blocks = blocksOf(p.data);
      let ops = a.ops || [], reply = '', hypothesis = '', theme = '', rejected = [];
      if (!ops.length) {
        if (!a.instruction) throw new Error('需要 instruction 或 ops 之一');
        const { patchOps } = require('../lib/ai');
        const r = await patchOps(user.id, { instruction: a.instruction, mode: p.mode, blocks, stats: db.projectGrowthSnapshot(p.id, 14) });
        ops = r.ops; reply = r.reply; hypothesis = r.hypothesis; theme = r.theme; rejected = r.rejected;
      } else {
        const checked = WF.validateOps({ blocks }, ops);
        ops = checked.ops; rejected = checked.rejected;
      }
      const diff = WF.diffOps({ blocks }, ops);
      if (a.apply !== false && ops.length) {
        const res = WF.applyOps({ blocks }, ops);
        db.updateProject(p.id, user.id, { data: setBlocks(p.data, res.snapshot.length === blocks.length ? blocks : blocks) });
        // applyOps 是就地修改,上面 blocks 即最新内容
        db.updateProject(p.id, user.id, { data: setBlocks(p.data, blocks) });
      }
      return { applied: a.apply !== false && ops.length > 0, ops: ops.length, rejected, reply, hypothesis, theme, diff };
    },
  },
  publish_page: {
    scope: "write",
    desc: '发布页面(幂等),返回访问地址',
    params: { type: 'object', properties: { project_id: { type: 'string' } }, required: ['project_id'] },
    run: (user, a) => {
      const p = db.getProject(a.project_id, user.id);
      if (!p) throw new Error('项目不存在或无权访问');
      const r = db.setPublished(p.id, user.id, true);
      return { published: true, url: '/webflow/p/' + r.share_token };
    },
  },
  unpublish_page: {
    scope: "write",
    desc: '取消发布(立即失效)',
    params: { type: 'object', properties: { project_id: { type: 'string' } }, required: ['project_id'] },
    run: (user, a) => {
      const p = db.getProject(a.project_id, user.id);
      if (!p) throw new Error('项目不存在或无权访问');
      db.setPublished(p.id, user.id, false);
      return { published: false };
    },
  },
  page_stats: {
    scope: "read",
    desc: '查询页面数据:曝光、点击、线索、分群与来源统计',
    params: { type: 'object', properties: { project_id: { type: 'string' }, days: { type: 'number' } }, required: ['project_id'] },
    run: (user, a) => {
      const p = db.getProject(a.project_id, user.id);
      if (!p) throw new Error('项目不存在或无权访问');
      return db.projectGrowthSnapshot(p.id, a.days || 14);
    },
  },
  growth_plan: {
    scope: "growth",
    desc: '用数据提实验假设:给出提升转化的改动建议(不写库)',
    params: { type: 'object', properties: { project_id: { type: 'string' }, objective: { type: 'string', enum: ['cta_click', 'lead'] } }, required: ['project_id'] },
    run: async (user, a) => {
      const p = db.getProject(a.project_id, user.id);
      if (!p) throw new Error('项目不存在或无权访问');
      const { patchOps } = require('../lib/ai');
      const stats = db.projectGrowthSnapshot(p.id, 14);
      const r = await patchOps(user.id, {
        instruction: '根据页面真实数据,提出一个最可能提升转化的假设,并用最少的改动落地。',
        mode: p.mode, blocks: blocksOf(p.data), stats,
        lessons: require('../lib/growth-lessons').brief(db.listGrowthRunsForUser(user.id, 100), {}),
      });
      return { hypothesis: r.hypothesis, theme: r.theme, reply: r.reply, ops: r.ops, rejected: r.rejected, stats };
    },
  },
  start_experiment: {
    scope: "growth",
    desc: '做 A/B 测试:把改动发布成两个变体并按目标计量',
    params: {
      type: 'object',
      properties: { project_id: { type: 'string' }, ops: { type: 'array', items: { type: 'object' } }, hypothesis: { type: 'string' } },
      required: ['project_id', 'ops'],
    },
    run: async (user, a) => {
      const agent = require('../lib/growth-agent');
      const p = db.getProject(a.project_id, user.id);
      if (!p) throw new Error('项目不存在或无权访问');
      const cfg = db.getGrowthConfig(p.id) || db.upsertGrowthConfig(p.id, user.id, { enabled: 0 });
      const WF = loadWF();
      const checked = WF.validateOps({ blocks: blocksOf(p.data) }, a.ops || []);
      if (!checked.ops.length) throw new Error('改动无效:' + JSON.stringify(checked.rejected).slice(0, 200));
      const round = db.listGrowthRuns(p.id, 200).length + 1;
      const res = agent.startRound(cfg, p, { ops: checked.ops, hypothesis: a.hypothesis || '外部 Agent 发起的实验', reply: 'via tools API' }, db.projectGrowthSnapshot(p.id, 14), round, '');
      if (res.skip) throw new Error('无法发布:' + res.skip);
      return res;
    },
  },
  get_identity: {
    scope: 'read',
    desc: '按任一标识查一个用户的统一身份与跨系统轨迹(事件/线索/订单);给出标识即自动归并',
    params: {
      type: 'object',
      properties: {
        vid: { type: 'string' }, uid: { type: 'string' }, payflow_ref: { type: 'string' },
        email: { type: 'string' }, phone: { type: 'string' }, timeline: { type: 'boolean' },
      },
    },
    run: (user, a) => {
      const r = require('../lib/identity').resolveIdentity(a, a.traits);
      if (r.error) throw new Error(r.error);
      const out = { identity: r.identity, created: r.created };
      if (r.merged) out.merged = r.merged;
      if (a.timeline !== false) out.timeline = db.identityTimeline(r.identity.id, 50);
      return out;
    },
  },
  identity_stats: {
    scope: 'read',
    desc: '身份库概览:身份数与标识链接数',
    params: { type: 'object', properties: {} },
    run: () => db.identityStats(),
  },
  create_goal: {
    scope: 'growth',
    desc: '设定业务目标(如 CVR≥12%),编排器会自己决定何时开实验、何时等待',
    params: {
      type: 'object',
      properties: {
        project_id: { type: 'string' }, name: { type: 'string' },
        metric: { type: 'string', enum: ['cvr', 'lead_rate', 'leads', 'clicks'] },
        target: { type: 'number' }, window_days: { type: 'number' }, deadline: { type: 'string' },
      },
      required: ['metric', 'target'],
    },
    run: (user, a) => {
      const orch = require('../lib/orchestrator');
      if (!orch.METRICS[a.metric]) throw new Error('metric 仅支持:' + Object.keys(orch.METRICS).join('/'));
      return { goal: db.createGoal(Object.assign({ user_id: user.id }, a)) };
    },
  },
  list_goals: {
    scope: 'read',
    desc: '查看目标进度与最近的编排动作',
    params: { type: 'object', properties: { project_id: { type: 'string' } } },
    run: (user, a) => {
      const orch = require('../lib/orchestrator');
      const goals = db.listGoals(Object.assign({ user_id: user.id }, a || {}));
      return { goals: goals.map((g) => {
        const m = orch.metricOf(g, db.projectGrowthSnapshot(g.project_id, g.window_days || 7));
        return Object.assign({}, g, { current: m.value, unit: m.unit, reached: orch.reached(g, m.value), cycles: db.listGoalCycles(g.id, 3) });
      }) };
    },
  },
  get_trace: {
    scope: 'read',
    desc: '端到端轨迹:同一个 trace_id 下的曝光/点击、线索、订单与 API 调用',
    params: { type: 'object', properties: { trace_id: { type: 'string' }, limit: { type: 'number' } }, required: ['trace_id'] },
    run: (user, a) => ({ trace_id: a.trace_id, timeline: db.traceTimeline(a.trace_id, a.limit) }),
  },
  record_lesson: {
    scope: 'growth',
    desc: '记录一条平台经验(场景→动作→结果),供所有系统复用与规避',
    params: {
      type: 'object',
      properties: {
        scene: { type: 'string', description: '场景,如 landing-page-cvr / content-engagement / lead-quality' },
        action: { type: 'string', description: '动作标识,如 title / urgency / trust' },
        outcome: { type: 'string', enum: ['win', 'loss', 'neutral'] },
        metric: { type: 'string' }, delta: { type: 'number' }, weight: { type: 'number' },
        scope: { type: 'string', description: '作用域(项目/账号等)' }, detail: { type: 'string' }, ref: { type: 'string' },
      },
      required: ['scene', 'action', 'outcome'],
    },
    run: (user, a) => {
      const rows = require('../lib/lessons').record(Object.assign({ system: 'websflow-agent' }, a));
      return { saved: rows.length, ids: rows.map((r) => r.id) };
    },
  },
  lessons_summary: {
    scope: 'read',
    desc: '平台经验汇总:各方向胜率与样本(可按 system/scene 过滤)',
    params: { type: 'object', properties: { system: { type: 'string' }, scene: { type: 'string' } } },
    run: (user, a) => ({ summary: require('../lib/lessons').summarize(a || {}) }),
  },
  lessons_brief: {
    scope: 'read',
    desc: '取"给模型看的经验文本"(可直接拼进提示词)',
    params: { type: 'object', properties: { system: { type: 'string' }, scene: { type: 'string' } }, required: ['scene'] },
    run: (user, a) => ({ brief: require('../lib/lessons').brief(a || {}) }),
  },
  list_capabilities: {
    scope: 'read',
    desc: '平台能力目录:各系统能做什么、怎么调、要什么权限(?system/kind/q)',
    params: { type: 'object', properties: { system: { type: 'string' }, kind: { type: 'string' }, q: { type: 'string' }, status: { type: 'string' } } },
    run: (user, a) => ({ capabilities: db.listCapabilities(a || {}) }),
  },
  find_capability: {
    scope: 'read',
    desc: '按需求找能力:给一句需求,返回该调用谁(含 endpoint/auth/scopes)',
    params: { type: 'object', properties: { need: { type: 'string' }, limit: { type: 'number' } }, required: ['need'] },
    run: (user, a) => {
      const found = require('../lib/capabilities').findCapability(a.need, { limit: a.limit });
      return { need: a.need, count: found.length, capabilities: found };
    },
  },
  list_proposals: {
    scope: "read",
    desc: '列出增长提案(人审):待审 / 已通过 / 已驳回',
    params: { type: 'object', properties: { project_id: { type: 'string' } } },
    run: (user, a) => ({ proposals: a.project_id ? db.listGrowthProposals(a.project_id, 20) : db.listPendingProposalsForUser(user.id) }),
  },
  approve_proposal: {
    scope: "growth",
    desc: '通过提案并发布两个变体',
    params: { type: 'object', properties: { proposal_id: { type: 'string' } }, required: ['proposal_id'] },
    run: (user, a) => {
      const r = require('../lib/growth-agent').approveProposal(a.proposal_id, user.id);
      if (r.error) throw new Error(r.error);
      return r;
    },
  },
  reject_proposal: {
    scope: "growth",
    desc: '驳回提案(原因会进入经验库,让 Agent 避开该方向)',
    params: { type: 'object', properties: { proposal_id: { type: 'string' }, reason: { type: 'string' } }, required: ['proposal_id'] },
    run: (user, a) => {
      const r = require('../lib/growth-agent').rejectProposal(a.proposal_id, user.id, a.reason);
      if (r.error) throw new Error(r.error);
      return r;
    },
  },
  ingest_events: {
    scope: 'ingest',
    desc: '回传线索质量/订单事件:外部事实写入并参与分群与实验(幂等)',
    params: {
      type: 'object',
      properties: { events: { type: 'array', items: { type: 'object' }, description: '每条需含 event_id 与 type' } },
      required: ['events'],
    },
    run: (user, a) => require('../lib/ingest').ingestEvents(user, { events: a.events }),
  },
  list_agents: {
    scope: "read",
    desc: '查看增长 Agent(自主跑轮)配置与状态',
    params: { type: 'object', properties: { project_id: { type: 'string' } } },
    run: (user, a) => {
      if (a.project_id) {
        const p = db.getProject(a.project_id, user.id);
        if (!p) throw new Error('项目不存在或无权访问');
        return { config: db.getGrowthConfig(p.id), active: db.getActiveGrowthRun(p.id), runs: db.listGrowthRuns(p.id, 10) };
      }
      return { agents: db.listGrowthConfigs(false).filter((c) => c.user_id === user.id) };
    },
  },
  configure_agent: {
    scope: "growth",
    desc: '配置增长 Agent:启用、目标(点击/线索)、人审、风险闸门、轮次与冷却',
    params: {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        enabled: { type: 'boolean' }, objective: { type: 'string', enum: ['cta_click', 'lead'] },
        approval_mode: { type: 'boolean' }, auto_promote: { type: 'boolean' },
        min_views: { type: 'number' }, max_rounds: { type: 'number' },
        cooldown_hours: { type: 'number' }, hold_hours: { type: 'number' },
        guard_enabled: { type: 'boolean' }, guard_min_views: { type: 'number' }, guard_drop_pct: { type: 'number' },
      },
      required: ['project_id'],
    },
    run: (user, a) => {
      const p = db.getProject(a.project_id, user.id);
      if (!p) throw new Error('项目不存在或无权访问');
      const patch = {};
      Object.keys(a).forEach((k) => { if (k !== 'project_id') patch[k] = a[k]; });
      return { config: db.upsertGrowthConfig(p.id, user.id, patch) };
    },
  },
};

// ---------- 路由 ----------
// G6:版本与弃用信息
const { versionInfo } = require('../lib/capabilities');

router.get('/version', (req, res) => {
  res.json(versionInfo());
});

router.get('/manifest', apiKeyAuth, (req, res) => {
  res.json(Object.assign({
    name: 'WebsFlow',
    version: '1.0.0',
    description: '落地页平台的开放工具集:造页、改稿、发布、读数据、跑增长实验',
    tools: Object.keys(TOOLS).map((name) => ({
      name, description: TOOLS[name].desc, scope: TOOLS[name].scope || 'read', parameters: TOOLS[name].params,
      deprecated: !!TOOLS[name].deprecated, replaced_by: TOOLS[name].replacedBy || null,
    })),
  }, versionInfo()));
});

router.post('/call', apiKeyAuth, async (req, res) => {
  const { name, args } = req.body || {};
  const tool = TOOLS[name];
  const t0 = Date.now();
  const key = req.apiKey || {};
  const scopes = Array.isArray(key.scopes) ? key.scopes : [];
  const audit = (ok, error, detail) => db.addApiAudit({
    key_id: key.id, user_id: req.user && req.user.id, action: 'tool:' + name,
    detail: detail || '', ok, error, ms: Date.now() - t0, ip: req.ip,
    trace_id: req.headers['x-trace-id'] || (req.body && req.body.trace_id) || null,
  });
  if (!tool) { audit(0, 'unknown tool'); return res.status(404).json({ ok: false, error: '未知工具:' + name }); }
  // 密钥权限(空 scopes = 旧密钥,视为全权,保持兼容)
  const need = tool.scope || 'read';
  if (scopes.length && !scopes.includes(need) && !scopes.includes('admin')) {
    audit(0, 'scope denied');
    return res.status(403).json({ ok: false, error: `该密钥缺少权限:${need}` });
  }
  // 配额
  try {
    const q = db.bumpApiQuota(key.id);
    const quota = Number(key.quota_per_day) || 2000;
    if (q.calls > quota) { audit(0, 'quota'); return res.status(429).json({ ok: false, error: `超出当日配额(${quota})` }); }
  } catch (e) { /* 配额失败不阻断 */ }
  try {
    const required = (tool.params && tool.params.required) || [];
    for (const k of required) {
      if (args == null || args[k] === undefined) return res.status(400).json({ ok: false, error: `缺少参数:${k}` });
    }
    if (tool.deprecated) {
      res.set('Warning', '299 - "tool deprecated"' + (tool.replacedBy ? ', use ' + tool.replacedBy : ''));
    }
    const result = await tool.run(req.user, args || {});
    audit(1, null, JSON.stringify(result).slice(0, 200));
    res.json({ ok: true, tool: name, result });
  } catch (e) {
    console.error('[tools] 调用失败', name, e.message);
    audit(0, e.message);
    res.status(400).json({ ok: false, tool: name, error: e.message });
  }
});

// ---------- 密钥管理(需登录) ----------
router.get('/keys', authMiddleware, (req, res) => {
  res.json({ keys: db.listApiKeys(req.user.id) });
});
const VALID_SCOPES = ['read', 'write', 'growth', 'ingest'];
router.post('/keys', authMiddleware, (req, res) => {
  const body = req.body || {};
  const scopes = Array.isArray(body.scopes) && body.scopes.length
    ? body.scopes.filter((x) => VALID_SCOPES.includes(x))
    : VALID_SCOPES.slice();   // 不传则全权
  const k = db.createApiKey(req.user.id, body.name, scopes);
  if (body.quota_per_day) {
    try { db.setApiKeyQuota(k.id, body.quota_per_day); } catch (e) {}
  }
  res.status(201).json({ message: '已创建,请立即保存密钥(只显示一次)', key: k.key, id: k.id, name: k.name, scopes });
});
// 最近调用审计(供控制台展示)
router.get('/audit', authMiddleware, (req, res) => {
  res.json({ audit: db.listApiAudit(req.user.id, Math.min(200, Number(req.query.limit) || 50)) });
});
router.delete('/keys/:id', authMiddleware, (req, res) => {
  const ok = db.revokeApiKey(req.params.id, req.user.id);
  if (!ok) return res.status(404).json({ error: '密钥不存在' });
  res.json({ message: '已撤销' });
});

module.exports = router;
module.exports.TOOLS = TOOLS;
