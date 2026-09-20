/* ============================================================
 * WebsFlow · AI 路由 (ai.js)
 * POST /api/ai/generate —— 一句话生成落地页区块清单(需登录)
 * ============================================================ */
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../auth');
const { generatePage, copilot, patchOps } = require('../lib/ai');
const { loadWF } = require('../lib/wf');
const { checkAiQuota } = require('../lib/quota');
const db = require('../db');

router.post('/generate', authMiddleware, async (req, res) => {
  try {
    const { prompt, mode } = req.body || {};
    if (!mode) return res.status(400).json({ error: '缺少形态参数' });
    const quota = checkAiQuota(req.user.id);
    if (!quota.ok) return res.status(quota.code).json({ error: quota.error, quota: true, upgrade: quota.upgrade });
    const result = await generatePage(req.user.id, prompt, mode);
    db.logAiCall(req.user.id);
    quota.remaining -= 1;
    const WF = loadWF();
    const blocks = result.blocks.map((b) => {
      const nb = WF.newBlock(b.type);
      nb.props = Object.assign(nb.props, b.props);
      return nb;
    });
    res.json({
      name: result.name,
      description: result.description,
      mode,
      blocks,
      warnings: result.warnings,
      remaining: quota.remaining,
      model: result.model,
    });
  } catch (e) {
    console.error('AI 生成失败:', e.message);
    res.status(400).json({ error: e.message });
  }
});

// Agent Copilot:对话 + 工具动作
router.post('/copilot', authMiddleware, async (req, res) => {
  try {
    const { message, mode, blocks, selectedId } = req.body || {};
    if (!mode || !message) return res.status(400).json({ error: '缺少参数' });
    const quota = checkAiQuota(req.user.id);
    if (!quota.ok) return res.status(quota.code).json({ error: quota.error, quota: true, upgrade: quota.upgrade });
    const result = await copilot(req.user.id, message, mode, (blocks || []).slice(0, 60), selectedId);
    db.logAiCall(req.user.id);
    res.json(Object.assign({ remaining: quota.remaining - 1 }, result));
  } catch (e) {
    console.error('Copilot 失败:', e.message);
    res.status(400).json({ error: e.message });
  }
});

// AI 改稿:指令 → 校验过的结构化补丁(可预览/可撤销)
router.post('/patch', authMiddleware, async (req, res) => {
  try {
    const { instruction, mode, blocks } = req.body || {};
    if (!mode || !instruction) return res.status(400).json({ error: '缺少参数' });
    const quota = checkAiQuota(req.user.id);
    if (!quota.ok) return res.status(quota.code).json({ error: quota.error, quota: true, upgrade: quota.upgrade });
    const result = await patchOps(req.user.id, { instruction, mode, blocks: (blocks || []).slice(0, 60) });
    db.logAiCall(req.user.id);
    res.json(Object.assign({ remaining: quota.remaining - 1 }, result));
  } catch (e) {
    console.error('AI 改稿失败:', e.message);
    res.status(400).json({ error: e.message });
  }
});

// AI 增长实验:读真实数据 + 页面结构 → 假设 + 补丁(供 A/B 使用)
router.post('/growth-plan', authMiddleware, async (req, res) => {
  try {
    const { projectId, days } = req.body || {};
    if (!projectId) return res.status(400).json({ error: '缺少 projectId' });
    const project = db.getProject(projectId, req.user.id);
    if (!project) return res.status(404).json({ error: '项目不存在或无权访问' });
    const quota = checkAiQuota(req.user.id);
    if (!quota.ok) return res.status(quota.code).json({ error: quota.error, quota: true, upgrade: quota.upgrade });
    const data = project.data || {};
    const blocks = (data.blocks || []).slice(0, 60);
    if (!blocks.length) return res.status(400).json({ error: '页面为空' });
    const stats = db.projectGrowthSnapshot(projectId, days);
    const result = await patchOps(req.user.id, {
      instruction: '根据这份页面的真实数据,提出一个最可能提升转化的实验:给出假设,并用最少的改动把它落地(改文案/CTA/信任要素)。',
      mode: project.mode, blocks, stats,
    });
    db.logAiCall(req.user.id);
    res.json(Object.assign({ remaining: quota.remaining - 1, stats }, result));
  } catch (e) {
    console.error('AI 增长方案失败:', e.message);
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
