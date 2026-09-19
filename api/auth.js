/* ============================================================
 * WebsFlow · 认证模块 (auth.js)
 * JWT 认证中间件
 * ============================================================ */

const jwt = require('jsonwebtoken');
const db = require('./db');

// JWT 密钥（生产环境应使用环境变量）
const JWT_SECRET = process.env.JWT_SECRET || 'websflow-secret-key-2026';
const JWT_EXPIRES_IN = '7d';

// 生成 JWT Token
function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// 验证 JWT Token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// API 密钥认证(开放平台用):Authorization: Bearer wfk_xxx
function apiKeyAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token || token.indexOf('wfk_') !== 0) return res.status(401).json({ error: '缺少 API 密钥' });
  const hit = db.userByApiKey(token);
  if (!hit) return res.status(401).json({ error: 'API 密钥无效或已撤销' });
  req.user = hit.user;
  req.apiKey = hit.key;
  next();
}

// 认证中间件
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未授权，请先登录' });
  }
  
  const token = authHeader.slice(7);
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json({ error: 'Token 无效或已过期' });
  }
  
  // 获取用户信息
  const user = db.findUserById(decoded.id);
  if (!user) {
    return res.status(401).json({ error: '用户不存在' });
  }
  
  req.user = user;
  next();
}

// 可选认证中间件（不强制要求登录）
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    
    if (decoded) {
      const user = db.findUserById(decoded.id);
      if (user) {
        req.user = user;
      }
    }
  }
  
  next();
}

// 管理员中间件(审核权限)
function adminOnly(req, res, next) {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ error: '需要管理员权限' });
  }
  next();
}

module.exports = {
  apiKeyAuth,
  adminOnly,
  generateToken,
  verifyToken,
  authMiddleware,
  optionalAuth,
  JWT_SECRET,
};
