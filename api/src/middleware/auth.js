import jwt from 'jsonwebtoken';
import { unauthorized } from '../utils/response.js';

export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return unauthorized(res, '请先登录');
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    req.user = decoded;
    next();
  } catch (err) {
    return unauthorized(res, '登录已过期，请重新登录');
  }
};

// 可选登录：带 token 时解析用户，不带 token 也放行
export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET || 'dev_secret');
    } catch {}
  }
  next();
};

export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return unauthorized(res, '请先登录');
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      code: 403,
      message: '权限不足，需要管理员权限',
    });
  }
  next();
};
