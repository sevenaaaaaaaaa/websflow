/* ============================================================
 * WebsFlow · 项目路由 (projects.js)
 * 处理项目的 CRUD 操作、版本管理
 * ============================================================ */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, optionalAuth } = require('../auth');
const { checkProjectQuota, checkPublishQuota } = require('../lib/quota');

// 获取用户的项目列表
router.get('/', authMiddleware, (req, res) => {
  try {
    const projects = db.getUserProjects(req.user.id);
    res.json({ projects });
  } catch (error) {
    console.error('获取项目列表失败:', error);
    res.status(500).json({ error: '获取项目列表失败' });
  }
});

// 创建项目
router.post('/', authMiddleware, (req, res) => {
  try {
    const { name, mode, data, description } = req.body;
    
    if (!name || !mode) {
      return res.status(400).json({ error: '项目名称和模式为必填项' });
    }

    const quota = checkProjectQuota(req.user.id);
    if (!quota.ok) return res.status(quota.code).json({ error: quota.error, quota: true, upgrade: quota.upgrade });

    const project = db.createProject(req.user.id, name, mode, data || {}, description);
    
    res.status(201).json({
      message: '项目创建成功',
      project,
    });
  } catch (error) {
    console.error('创建项目失败:', error);
    res.status(500).json({ error: '创建项目失败' });
  }
});

// 人群规则总览:一次返回所有项目的定向规则(替代逐项目拉取)
router.get('/audience', authMiddleware, (req, res) => {
  try {
    const projects = (db.getUserProjects(req.user.id) || []).slice(0, 200);
    const pages = [];
    projects.forEach((p) => {
      let data = p.data;
      if (typeof data === 'string') { try { data = JSON.parse(data); } catch (e) { data = {}; } }
      const d = data || {};
      const blocks = (Array.isArray(d.pages) && d.pages[0] && d.pages[0].blocks) || d.blocks || [];
      const rules = blocks.filter((b) => b && b.audience &&
        (b.audience.visitor || b.audience.login || b.audience.utm || b.audience.device || b.audience.hours || b.audience.segmentId))
        .map((b) => ({ block_id: b.id, type: b.type, audience: b.audience }));
      if (rules.length) pages.push({ project_id: p.id, project_name: p.name, rules });
    });
    res.json({ pages, scanned: projects.length });
  } catch (e) {
    console.error('人群规则总览失败:', e.message);
    res.status(500).json({ error: '读取失败' });
  }
});

// 获取项目详情
router.get('/:id', authMiddleware, (req, res) => {
  try {
    const project = db.getProject(req.params.id, req.user.id);
    
    if (!project) {
      return res.status(404).json({ error: '项目不存在' });
    }
    
    res.json({ project });
  } catch (error) {
    console.error('获取项目详情失败:', error);
    res.status(500).json({ error: '获取项目详情失败' });
  }
});

// 更新项目
router.put('/:id', authMiddleware, (req, res) => {
  try {
    const { name, mode, data, description, is_public } = req.body;
    
    const success = db.updateProject(req.params.id, req.user.id, {
      name,
      mode,
      data,
      description,
      is_public,
    });
    
    if (!success) {
      return res.status(404).json({ error: '项目不存在或无权修改' });
    }
    
    res.json({ message: '项目更新成功' });
  } catch (error) {
    console.error('更新项目失败:', error);
    res.status(500).json({ error: '更新项目失败' });
  }
});

// 批量归档实验变体(AI 轮次/演示页/对照副本),保持列表干净
router.post('/archive-variants', authMiddleware, (req, res) => {
  try {
    const r = db.archiveProjects(req.user.id, { ids: (req.body && req.body.ids) || null });
    res.json({ ok: true, archived: r.archived });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 删除项目
router.delete('/:id', authMiddleware, (req, res) => {
  try {
    const success = db.deleteProject(req.params.id, req.user.id);
    
    if (!success) {
      return res.status(404).json({ error: '项目不存在或无权删除' });
    }
    
    res.json({ message: '项目删除成功' });
  } catch (error) {
    console.error('删除项目失败:', error);
    res.status(500).json({ error: '删除项目失败' });
  }
});

// 设置项目公开状态
router.put('/:id/public', authMiddleware, (req, res) => {
  try {
    const { is_public } = req.body;
    
    const success = db.setProjectPublic(req.params.id, req.user.id, is_public);
    
    if (!success) {
      return res.status(404).json({ error: '项目不存在或无权修改' });
    }
    
    res.json({ message: '项目公开状态已更新' });
  } catch (error) {
    console.error('更新项目公开状态失败:', error);
    res.status(500).json({ error: '更新失败' });
  }
});

// 获取项目版本列表
router.get('/:id/versions', authMiddleware, (req, res) => {
  try {
    const project = db.getProject(req.params.id, req.user.id);
    
    if (!project) {
      return res.status(404).json({ error: '项目不存在' });
    }
    
    const versions = db.getProjectVersions(req.params.id);
    res.json({ versions });
  } catch (error) {
    console.error('获取版本列表失败:', error);
    res.status(500).json({ error: '获取版本列表失败' });
  }
});

// 保存项目版本
router.post('/:id/versions', authMiddleware, (req, res) => {
  try {
    const { name, data } = req.body;
    
    const project = db.getProject(req.params.id, req.user.id);
    
    if (!project) {
      return res.status(404).json({ error: '项目不存在' });
    }
    
    const version = db.saveVersion(req.params.id, name || '手动保存', data || project.data);
    
    res.status(201).json({
      message: '版本保存成功',
      version,
    });
  } catch (error) {
    console.error('保存版本失败:', error);
    res.status(500).json({ error: '保存版本失败' });
  }
});

// 获取版本详情
router.get('/:id/versions/:versionId', authMiddleware, (req, res) => {
  try {
    const version = db.getVersion(req.params.versionId);
    
    if (!version) {
      return res.status(404).json({ error: '版本不存在' });
    }
    
    res.json({ version });
  } catch (error) {
    console.error('获取版本详情失败:', error);
    res.status(500).json({ error: '获取版本详情失败' });
  }
});

// 发布到托管 URL(需登录)
router.post('/:id/publish', authMiddleware, (req, res) => {
  try {
    const current = db.getProject(req.params.id, req.user.id);
    const quota = checkPublishQuota(req.user.id, current && current.published === 1);
    if (!quota.ok) return res.status(quota.code).json({ error: quota.error, quota: true, upgrade: quota.upgrade });
    const result = db.setPublished(req.params.id, req.user.id, true);
    if (!result) {
      return res.status(404).json({ error: '项目不存在或无权操作' });
    }
    res.json({
      message: '已发布',
      token: result.share_token,
      url: '/webflow/p/' + result.share_token,
    });
  } catch (error) {
    console.error('发布失败:', error);
    res.status(500).json({ error: '发布失败' });
  }
});

// 取消发布
router.post('/:id/unpublish', authMiddleware, (req, res) => {
  try {
    const result = db.setPublished(req.params.id, req.user.id, false);
    if (!result) {
      return res.status(404).json({ error: '项目不存在或无权操作' });
    }
    res.json({ message: '已取消发布' });
  } catch (error) {
    console.error('取消发布失败:', error);
    res.status(500).json({ error: '取消发布失败' });
  }
});

// 通过分享链接获取项目（无需登录）
router.get('/share/:token', (req, res) => {
  try {
    const project = db.getProjectByShareToken(req.params.token);
    
    if (!project) {
      return res.status(404).json({ error: '项目不存在或未公开' });
    }
    
    res.json({ project });
  } catch (error) {
    console.error('获取分享项目失败:', error);
    res.status(500).json({ error: '获取项目失败' });
  }
});

module.exports = router;
