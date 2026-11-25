import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import { success, fail } from '../utils/response.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// 注册
router.post('/register', async (req, res) => {
  const { username, email, password, nickname } = req.body;

  if (!username || !email || !password) {
    return fail(res, '用户名、邮箱和密码必填');
  }
  if (password.length < 6) {
    return fail(res, '密码至少6位');
  }

  try {
    // 检查用户名/邮箱是否存在
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );
    if (existing.length > 0) {
      return fail(res, '用户名或邮箱已被注册');
    }

    const hashedPwd = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (username, email, password, nickname) VALUES (?, ?, ?, ?)',
      [username, email, hashedPwd, nickname || username]
    );

    const [users] = await pool.query(
      `SELECT u.id, u.username, u.email, u.nickname, u.avatar, u.role_id, r.name as role_name, u.status, u.created_at
       FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?`,
      [result.insertId]
    );

    const user = users[0];
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role_name },
      process.env.JWT_SECRET || 'dev_secret',
      { expiresIn: '7d' }
    );

    return success(res, { user, token }, '注册成功');
  } catch (err) {
    console.error(err);
    return fail(res, '注册失败，请稍后再试', 1, 500);
  }
});

// 登录
router.post('/login', async (req, res) => {
  const { account, password } = req.body;

  if (!account || !password) {
    return fail(res, '账号和密码必填');
  }

  try {
    const [rows] = await pool.query(
      `SELECT u.*, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id
       WHERE u.username = ? OR u.email = ?`,
      [account, account]
    );

    if (rows.length === 0) {
      return fail(res, '账号或密码错误');
    }

    const user = rows[0];
    if (user.status === 0) {
      return fail(res, '账号已被禁用，请联系管理员');
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return fail(res, '账号或密码错误');
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role_name },
      process.env.JWT_SECRET || 'dev_secret',
      { expiresIn: '7d' }
    );

    const safeUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      nickname: user.nickname,
      avatar: user.avatar,
      role: user.role_name,
      status: user.status,
      created_at: user.created_at,
    };

    return success(res, { user: safeUser, token }, '登录成功');
  } catch (err) {
    console.error(err);
    return fail(res, '登录失败', 1, 500);
  }
});

// 获取当前用户信息
router.get('/me', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.username, u.email, u.nickname, u.avatar, u.role_id,
              r.name as role, u.status, u.created_at
       FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?`,
      [req.user.id]
    );
    if (rows.length === 0) return fail(res, '用户不存在');
    return success(res, rows[0]);
  } catch (err) {
    return fail(res, '获取用户信息失败', 1, 500);
  }
});

// 更新个人信息
router.put('/me', authenticate, async (req, res) => {
  const { nickname, avatar, email } = req.body;
  try {
    await pool.query(
      'UPDATE users SET nickname = COALESCE(?, nickname), avatar = COALESCE(?, avatar), email = COALESCE(?, email) WHERE id = ?',
      [nickname, avatar, email, req.user.id]
    );
    return success(res, null, '更新成功');
  } catch (err) {
    return fail(res, '更新失败', 1, 500);
  }
});

// 修改密码
router.put('/password', authenticate, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) return fail(res, '请输入旧密码和新密码');
  if (newPassword.length < 6) return fail(res, '新密码至少6位');

  try {
    const [rows] = await pool.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
    if (rows.length === 0) return fail(res, '用户不存在');

    const valid = await bcrypt.compare(oldPassword, rows[0].password);
    if (!valid) return fail(res, '旧密码不正确');

    const hashedPwd = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPwd, req.user.id]);
    return success(res, null, '密码修改成功');
  } catch (err) {
    return fail(res, '修改密码失败', 1, 500);
  }
});

export default router;
