import express from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import { success, fail } from '../utils/response.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate, requireAdmin);

// 用户列表
router.get('/users', async (req, res) => {
  const page = parseInt(req.query.page || '1');
  const pageSize = parseInt(req.query.pageSize || '20');
  const keyword = req.query.keyword?.trim();
  const role = req.query.role;
  const offset = (page - 1) * pageSize;

  let where = [];
  const params = [];

  if (keyword) {
    where.push('(u.username LIKE ? OR u.email LIKE ? OR u.nickname LIKE ?)');
    const kw = `%${keyword}%`;
    params.push(kw, kw, kw);
  }
  if (role) {
    where.push('r.name = ?');
    params.push(role);
  }

  const whereSQL = where.length ? 'WHERE ' + where.join(' AND ') : '';

  try {
    const [count] = await pool.query(
      `SELECT COUNT(*) as total FROM users u JOIN roles r ON u.role_id = r.id ${whereSQL}`,
      params
    );
    const [rows] = await pool.query(
      `SELECT u.id, u.username, u.email, u.nickname, u.avatar, u.status,
              u.created_at, u.role_id, r.name as role_name
       FROM users u JOIN roles r ON u.role_id = r.id
       ${whereSQL} ORDER BY u.id DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );
    return success(res, { list: rows, total: count[0].total, page, pageSize });
  } catch (err) {
    console.error(err);
    return fail(res, '获取用户列表失败', 1, 500);
  }
});

// 更新用户（角色、状态）
router.put('/users/:id', async (req, res) => {
  const { role_id, status, nickname, email } = req.body;
  try {
    const updates = [];
    const params = [];
    if (role_id !== undefined) { updates.push('role_id = ?'); params.push(role_id); }
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }
    if (nickname !== undefined) { updates.push('nickname = ?'); params.push(nickname); }
    if (email !== undefined) { updates.push('email = ?'); params.push(email); }

    if (updates.length === 0) return fail(res, '没有需要更新的字段');

    params.push(req.params.id);
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    return success(res, null, '更新成功');
  } catch (err) {
    return fail(res, '更新失败', 1, 500);
  }
});

// 重置用户密码
router.put('/users/:id/reset-password', async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) return fail(res, '新密码至少6位');
  try {
    const hashedPwd = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPwd, req.params.id]);
    return success(res, null, '密码重置成功');
  } catch (err) {
    return fail(res, '重置密码失败', 1, 500);
  }
});

// 批量导入用户 (CSV)
router.post('/users/import', async (req, res) => {
  const { users } = req.body;
  if (!Array.isArray(users)) return fail(res, '格式错误');

  let successCount = 0;
  let failCount = 0;

  for (const u of users) {
    try {
      if (!u.username || !u.email || !u.password) { failCount++; continue; }
      const [existing] = await pool.query('SELECT id FROM users WHERE username = ? OR email = ?', [u.username, u.email]);
      if (existing.length > 0) { failCount++; continue; }
      const hashedPwd = await bcrypt.hash(u.password, 10);
      await pool.query(
        'INSERT INTO users (username, email, password, nickname, role_id) VALUES (?, ?, ?, ?, ?)',
        [u.username, u.email, hashedPwd, u.nickname || u.username, u.role_id || 2]
      );
      successCount++;
    } catch { failCount++; }
  }

  return success(res, { successCount, failCount }, `导入完成：成功 ${successCount} 条，失败 ${failCount} 条`);
});

// 批量导出用户
router.get('/users/export', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.username, u.email, u.nickname, r.name as role, u.status, u.created_at
       FROM users u JOIN roles r ON u.role_id = r.id ORDER BY u.id`
    );
    return success(res, rows);
  } catch (err) {
    return fail(res, '导出失败', 1, 500);
  }
});

// 帖子管理列表
router.get('/posts', async (req, res) => {
  const page = parseInt(req.query.page || '1');
  const pageSize = parseInt(req.query.pageSize || '20');
  const keyword = req.query.keyword?.trim();
  const status = req.query.status;
  const offset = (page - 1) * pageSize;

  let where = [];
  const params = [];
  if (keyword) { where.push('p.title LIKE ?'); params.push(`%${keyword}%`); }
  if (status !== undefined && status !== '') { where.push('p.status = ?'); params.push(status); }
  const whereSQL = where.length ? 'WHERE ' + where.join(' AND ') : '';

  try {
    const [count] = await pool.query(`SELECT COUNT(*) as total FROM posts p ${whereSQL}`, params);
    const [rows] = await pool.query(
      `SELECT p.*, u.nickname, c.name as category_name,
              a.review_status, a.review_risk, a.review_score
       FROM posts p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN post_ai a ON a.post_id = p.id
       ${whereSQL} ORDER BY p.id DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );
    return success(res, { list: rows, total: count[0].total, page, pageSize });
  } catch (err) {
    return fail(res, '获取帖子失败', 1, 500);
  }
});

// 更新帖子状态（审核/置顶）
router.put('/posts/:id', async (req, res) => {
  const { status, is_pinned } = req.body;
  try {
    const updates = [];
    const params = [];
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }
    if (is_pinned !== undefined) { updates.push('is_pinned = ?'); params.push(is_pinned); }
    if (updates.length === 0) return fail(res, '没有需要更新的字段');
    params.push(req.params.id);
    await pool.query(`UPDATE posts SET ${updates.join(', ')} WHERE id = ?`, params);
    return success(res, null, '更新成功');
  } catch (err) {
    return fail(res, '更新失败', 1, 500);
  }
});

// 管理端删除帖子（事务级联清理评论、点赞、收藏、标签关联）
router.delete('/posts/:id', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM comments WHERE post_id = ?', [req.params.id]);
    await conn.query('DELETE FROM likes WHERE post_id = ?', [req.params.id]);
    await conn.query('DELETE FROM favorites WHERE post_id = ?', [req.params.id]);
    await conn.query('DELETE FROM post_tags WHERE post_id = ?', [req.params.id]);
    await conn.query('DELETE FROM posts WHERE id = ?', [req.params.id]);
    await conn.commit();
    return success(res, null, '删除成功');
  } catch (err) {
    await conn.rollback();
    return fail(res, '删除失败', 1, 500);
  } finally {
    conn.release();
  }
});

// 分类管理（带各分类帖子数）
router.get('/categories', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.*, COUNT(p.id) as post_count
       FROM categories c LEFT JOIN posts p ON p.category_id = c.id
       GROUP BY c.id ORDER BY c.sort_order ASC`
    );
    return success(res, rows);
  } catch (err) {
    return fail(res, '获取分类失败', 1, 500);
  }
});

router.post('/categories', async (req, res) => {
  const { name, icon, sort_order } = req.body;
  if (!name) return fail(res, '分类名称必填');
  try {
    const [result] = await pool.query(
      'INSERT INTO categories (name, icon, sort_order) VALUES (?, ?, ?)',
      [name, icon || '', sort_order || 0]
    );
    return success(res, { id: result.insertId }, '创建成功');
  } catch (err) {
    return fail(res, '创建失败（可能名称已存在）', 1, 500);
  }
});

router.put('/categories/:id', async (req, res) => {
  const { name, icon, sort_order } = req.body;
  try {
    await pool.query(
      'UPDATE categories SET name = COALESCE(?, name), icon = COALESCE(?, icon), sort_order = COALESCE(?, sort_order) WHERE id = ?',
      [name, icon, sort_order, req.params.id]
    );
    return success(res, null, '更新成功');
  } catch (err) {
    return fail(res, '更新失败', 1, 500);
  }
});

router.delete('/categories/:id', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // 先解除帖子与该分类的关联，避免产生悬空外键
    await conn.query('UPDATE posts SET category_id = NULL WHERE category_id = ?', [req.params.id]);
    await conn.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
    await conn.commit();
    return success(res, null, '删除成功');
  } catch (err) {
    await conn.rollback();
    return fail(res, '删除失败', 1, 500);
  } finally {
    conn.release();
  }
});

// 仪表盘统计
router.get('/stats/dashboard', async (req, res) => {
  try {
    const [[users], [posts], [comments], [categories], [todayPosts], [todayUsers]] = await Promise.all([
      pool.query('SELECT COUNT(*) as total FROM users'),
      pool.query('SELECT COUNT(*) as total FROM posts'),
      pool.query('SELECT COUNT(*) as total FROM comments'),
      pool.query('SELECT COUNT(*) as total FROM categories'),
      pool.query('SELECT COUNT(*) as total FROM posts WHERE DATE(created_at) = CURDATE()'),
      pool.query('SELECT COUNT(*) as total FROM users WHERE DATE(created_at) = CURDATE()'),
    ]);

    // 近7天趋势（补全没有数据的日期，保证图表始终展示完整7天）
    const [postTrend] = await pool.query(`
      SELECT DATE(created_at) as date, COUNT(*) as cnt
      FROM posts
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
      GROUP BY DATE(created_at)
    `);
    const [commentTrend] = await pool.query(`
      SELECT DATE(created_at) as date, COUNT(*) as cnt
      FROM comments
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
      GROUP BY DATE(created_at)
    `);
    const dayKey = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10));
    const postMap = new Map(postTrend.map((r) => [dayKey(r.date), Number(r.cnt)]));
    const commentMap = new Map(commentTrend.map((r) => [dayKey(r.date), Number(r.cnt)]));
    const trend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      trend.push({
        date: key,
        posts_count: postMap.get(key) || 0,
        comments_count: commentMap.get(key) || 0,
      });
    }

    return success(res, {
      totalUsers: users[0].total,
      totalPosts: posts[0].total,
      totalComments: comments[0].total,
      totalCategories: categories[0].total,
      todayPosts: todayPosts[0].total,
      todayUsers: todayUsers[0].total,
      trend,
    });
  } catch (err) {
    console.error(err);
    return fail(res, '获取统计数据失败', 1, 500);
  }
});

// 数据统计
router.get('/stats/detail', async (req, res) => {
  try {
    const [[activeUsers], [categoryDist], [topPosts]] = await Promise.all([
      pool.query(`
        SELECT u.id, u.username, u.nickname, COUNT(p.id) as post_count
        FROM users u LEFT JOIN posts p ON p.user_id = u.id
        GROUP BY u.id ORDER BY post_count DESC LIMIT 10
      `),
      pool.query(`
        SELECT c.name, COUNT(p.id) as post_count
        FROM categories c LEFT JOIN posts p ON p.category_id = c.id
        GROUP BY c.id ORDER BY post_count DESC
      `),
      pool.query(`
        SELECT p.id, p.title, p.views, p.likes, p.comment_count, u.nickname
        FROM posts p JOIN users u ON p.user_id = u.id
        ORDER BY (p.views + p.likes * 10 + p.comment_count * 20) DESC LIMIT 10
      `),
    ]);

    return success(res, {
      activeUsers: activeUsers,
      categoryDistribution: categoryDist,
      topPosts: topPosts,
    });
  } catch (err) {
    return fail(res, '获取统计详情失败', 1, 500);
  }
});

export default router;
