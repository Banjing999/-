import express from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import { success, fail, notFound } from '../utils/response.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// 当前用户完整信息（含关注统计）
router.get('/me', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.username, u.nickname, u.avatar, u.email, u.created_at, r.name as role_name,
              (SELECT COUNT(*) FROM follows f WHERE f.following_id = u.id) AS follower_count,
              (SELECT COUNT(*) FROM follows f WHERE f.follower_id = u.id) AS following_count,
              (SELECT COUNT(*) FROM posts p WHERE p.user_id = u.id) AS post_count
       FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?`,
      [req.user.id]
    );
    if (!rows.length) return notFound(res, '用户不存在');
    return success(res, rows[0]);
  } catch (err) {
    return fail(res, '获取用户信息失败', 1, 500);
  }
});

// 更新个人资料（昵称、邮箱、头像）
router.put('/me/profile', authenticate, async (req, res) => {
  const { nickname, email, avatar } = req.body || {};
  const fields = [];
  const values = [];

  if (typeof nickname === 'string' && nickname.trim()) {
    fields.push('nickname = ?');
    values.push(nickname.trim().slice(0, 50));
  }
  if (typeof email === 'string' && email.trim()) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return fail(res, '邮箱格式不正确');
    }
    fields.push('email = ?');
    values.push(email.trim());
  }
  if (typeof avatar === 'string') {
    fields.push('avatar = ?');
    values.push(avatar.trim().slice(0, 500));
  }
  if (!fields.length) return fail(res, '没有要更新的字段');

  try {
    values.push(req.user.id);
    await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
    const [[row]] = await pool.query('SELECT nickname, email, avatar FROM users WHERE id = ?', [req.user.id]);
    return success(res, row);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return fail(res, '该邮箱已被使用');
    return fail(res, '更新资料失败', 1, 500);
  }
});

// 修改密码
router.put('/me/password', authenticate, async (req, res) => {
  const { oldPassword, newPassword } = req.body || {};
  if (!oldPassword || !newPassword) return fail(res, '旧密码和新密码必填');
  if (String(newPassword).length < 6) return fail(res, '新密码至少 6 位');

  try {
    const [[user]] = await pool.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
    if (!user) return notFound(res, '用户不存在');
    if (!(await bcrypt.compare(oldPassword, user.password))) {
      return fail(res, '旧密码不正确', 1);
    }
    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashed, req.user.id]);
    return success(res, null, '密码修改成功');
  } catch (err) {
    return fail(res, '修改密码失败', 1, 500);
  }
});

// 我的帖子（必须放在 /:id 之前，否则 'me' 会被当成 :id 匹配）
router.get('/me/posts', authenticate, async (req, res) => {
  const page = parseInt(req.query.page || '1');
  const pageSize = parseInt(req.query.pageSize || '10');
  const offset = (page - 1) * pageSize;

  try {
    const [count] = await pool.query('SELECT COUNT(*) as total FROM posts WHERE user_id = ?', [req.user.id]);
    const [rows] = await pool.query(
      `SELECT p.*, c.name as category_name FROM posts p LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.user_id = ? ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
      [req.user.id, pageSize, offset]
    );
    return success(res, { list: rows, total: count[0].total, page, pageSize });
  } catch (err) {
    return fail(res, '获取我的帖子失败', 1, 500);
  }
});

// 我的收藏（必须放在 /:id 之前）
router.get('/me/favorites', authenticate, async (req, res) => {
  const page = parseInt(req.query.page || '1');
  const pageSize = parseInt(req.query.pageSize || '10');
  const offset = (page - 1) * pageSize;

  try {
    const [count] = await pool.query('SELECT COUNT(*) as total FROM favorites WHERE user_id = ?', [req.user.id]);
    const [rows] = await pool.query(
      `SELECT p.*, u.nickname as author_name, c.name as category_name FROM favorites f
       JOIN posts p ON f.post_id = p.id
       JOIN users u ON p.user_id = u.id
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE f.user_id = ? ORDER BY f.created_at DESC LIMIT ? OFFSET ?`,
      [req.user.id, pageSize, offset]
    );
    return success(res, { list: rows, total: count[0].total, page, pageSize });
  } catch (err) {
    return fail(res, '获取收藏失败', 1, 500);
  }
});

// 获取用户信息（含关注统计与当前用户的关系）
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.username, u.nickname, u.avatar, u.created_at, r.name as role_name,
              (SELECT COUNT(*) FROM follows f WHERE f.following_id = u.id) AS follower_count,
              (SELECT COUNT(*) FROM follows f WHERE f.follower_id = u.id) AS following_count
       FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return notFound(res, '用户不存在');

    const user = rows[0];
    const viewerId = req.user?.id;
    let isFollowing = false;
    let isMutual = false;

    if (viewerId && viewerId !== user.id) {
      const [[relation]] = await pool.query(
        `SELECT EXISTS(SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?) AS i_follow,
                EXISTS(SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?) AS follows_me`,
        [viewerId, user.id, user.id, viewerId]
      );
      isFollowing = !!relation.i_follow;
      isMutual = !!(relation.i_follow && relation.follows_me);
    }

    return success(res, { ...user, is_following: isFollowing, is_mutual: isMutual });
  } catch (err) {
    return fail(res, '获取用户失败', 1, 500);
  }
});

// 关注用户
router.post('/:id/follow', authenticate, async (req, res) => {
  const targetId = parseInt(req.params.id);
  if (!targetId || targetId === req.user.id) {
    return fail(res, '不能关注自己');
  }

  try {
    const [target] = await pool.query('SELECT id FROM users WHERE id = ? AND status = 1', [targetId]);
    if (!target.length) return notFound(res, '用户不存在');

    await pool.query(
      'INSERT IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)',
      [req.user.id, targetId]
    );

    const [[relation]] = await pool.query(
      `SELECT EXISTS(SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?) AS follows_me`,
      [targetId, req.user.id]
    );

    return success(res, {
      is_following: true,
      is_mutual: !!relation.follows_me,
    });
  } catch (err) {
    return fail(res, '关注失败', 1, 500);
  }
});

// 取消关注
router.delete('/:id/follow', authenticate, async (req, res) => {
  try {
    await pool.query('DELETE FROM follows WHERE follower_id = ? AND following_id = ?', [
      req.user.id,
      req.params.id,
    ]);
    return success(res, { is_following: false, is_mutual: false });
  } catch (err) {
    return fail(res, '取消关注失败', 1, 500);
  }
});

// 当前用户与目标用户的关注状态
router.get('/:id/follow-status', authenticate, async (req, res) => {
  try {
    const [[relation]] = await pool.query(
      `SELECT EXISTS(SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?) AS i_follow,
              EXISTS(SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?) AS follows_me`,
      [req.user.id, req.params.id, req.params.id, req.user.id]
    );
    return success(res, {
      is_following: !!relation.i_follow,
      follows_me: !!relation.follows_me,
      is_mutual: !!(relation.i_follow && relation.follows_me),
    });
  } catch (err) {
    return fail(res, '获取关注状态失败', 1, 500);
  }
});

// 粉丝列表
router.get('/:id/followers', optionalAuth, async (req, res) => {
  const viewerId = req.user?.id || 0;
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.username, u.nickname, u.avatar, f.created_at,
              EXISTS(SELECT 1 FROM follows x WHERE x.follower_id = ? AND x.following_id = u.id) AS i_follow,
              EXISTS(SELECT 1 FROM follows x WHERE x.follower_id = u.id AND x.following_id = ?) AS follows_me
       FROM follows f JOIN users u ON u.id = f.follower_id
       WHERE f.following_id = ? AND u.status = 1
       ORDER BY f.created_at DESC`,
      [viewerId, viewerId, req.params.id]
    );
    return success(
      res,
      rows.map((row) => ({ ...row, is_mutual: !!(row.i_follow && row.follows_me) }))
    );
  } catch (err) {
    return fail(res, '获取粉丝列表失败', 1, 500);
  }
});

// 关注列表
router.get('/:id/following', optionalAuth, async (req, res) => {
  const viewerId = req.user?.id || 0;
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.username, u.nickname, u.avatar, f.created_at,
              EXISTS(SELECT 1 FROM follows x WHERE x.follower_id = ? AND x.following_id = u.id) AS i_follow,
              EXISTS(SELECT 1 FROM follows x WHERE x.follower_id = u.id AND x.following_id = ?) AS follows_me
       FROM follows f JOIN users u ON u.id = f.following_id
       WHERE f.follower_id = ? AND u.status = 1
       ORDER BY f.created_at DESC`,
      [viewerId, viewerId, req.params.id]
    );
    return success(
      res,
      rows.map((row) => ({ ...row, is_mutual: !!(row.i_follow && row.follows_me) }))
    );
  } catch (err) {
    return fail(res, '获取关注列表失败', 1, 500);
  }
});

// 用户帖子
router.get('/:id/posts', async (req, res) => {
  const page = parseInt(req.query.page || '1');
  const pageSize = parseInt(req.query.pageSize || '10');
  const offset = (page - 1) * pageSize;

  try {
    const [count] = await pool.query('SELECT COUNT(*) as total FROM posts WHERE user_id = ? AND status = 1', [req.params.id]);
    const [rows] = await pool.query(
      `SELECT p.*, c.name as category_name FROM posts p LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.user_id = ? AND p.status = 1 ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
      [req.params.id, pageSize, offset]
    );
    return success(res, { list: rows, total: count[0].total, page, pageSize });
  } catch (err) {
    return fail(res, '获取用户帖子失败', 1, 500);
  }
});

export default router;
