/* ============================================================
 * WebsFlow · 用户路由 (users.js)
 * 处理用户注册、登录、信息管理
 * ============================================================ */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { generateToken, authMiddleware } = require('../auth');

// 注册
router.post('/register', (req, res) => {
  try {
    const { username, email, password, ref, utm } = req.body;
    
    // 验证必填字段
    if (!username || !email || !password) {
      return res.status(400).json({ error: '用户名、邮箱和密码为必填项' });
    }
    
    // 验证格式
    if (username.length < 2 || username.length > 20) {
      return res.status(400).json({ error: '用户名长度应为 2-20 个字符' });
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: '邮箱格式不正确' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: '密码长度至少 6 个字符' });
    }
    
    // 检查用户名是否已存在
    if (db.findUserByUsername(username)) {
      return res.status(400).json({ error: '用户名已被占用' });
    }
    
    // 检查邮箱是否已存在
    if (db.findUserByEmail(email)) {
      return res.status(400).json({ error: '邮箱已被注册' });
    }
    
    // 创建用户
    const user = db.createUser(username, email, password);
    // 邀请归因(仅首次)
    if (ref) {
      try { db.bindReferrer(user.id, ref); } catch (e) {}
    }
    // UTM 渠道归因(注册来源)
    if (utm && (utm.source || utm.medium || utm.campaign)) {
      try { db.setUserUtm(user.id, utm); } catch (e) {}
    }
    
    // 生成 Token
    const token = generateToken(user);
    
    res.status(201).json({
      message: '注册成功',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        display_name: user.display_name,
        is_admin: user.is_admin || 0,
        balance: user.balance || 0,
      },
      token,
    });
  } catch (error) {
    console.error('注册失败:', error);
    res.status(500).json({ error: '注册失败，请稍后重试' });
  }
});

// 登录
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    
    // 验证必填字段
    if (!email || !password) {
      return res.status(400).json({ error: '邮箱和密码为必填项' });
    }
    
    // 查找用户（支持邮箱或用户名登录）
    let user = db.findUserByEmail(email);
    if (!user) {
      user = db.findUserByUsername(email);
    }
    
    if (!user) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }
    
    // 验证密码
    if (!db.verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }
    
    // 生成 Token
    const token = generateToken(user);
    
    res.json({
      message: '登录成功',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        display_name: user.display_name,
        avatar: user.avatar,
        is_admin: user.is_admin || 0,
        balance: user.balance || 0,
      },
      token,
    });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ error: '登录失败，请稍后重试' });
  }
});

// 获取当前用户信息
router.get('/me', authMiddleware, (req, res) => {
  res.json({
    user: req.user,
  });
});

// 更新用户信息
router.put('/me', authMiddleware, (req, res) => {
  try {
    const { display_name, avatar } = req.body;
    
    db.updateUser(req.user.id, { display_name, avatar });
    
    const updatedUser = db.findUserById(req.user.id);
    
    res.json({
      message: '更新成功',
      user: updatedUser,
    });
  } catch (error) {
    console.error('更新用户信息失败:', error);
    res.status(500).json({ error: '更新失败，请稍后重试' });
  }
});

module.exports = router;
