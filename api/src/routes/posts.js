import express from 'express';
import pool from '../config/db.js';
import { success, fail, notFound } from '../utils/response.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// 帖子列表（分页+筛选）
router.get('/', async (req, res) => {
  const page = parseInt(req.query.page || '1');
  const pageSize = parseInt(req.query.pageSize || '10');
  const categoryId = req.query.categoryId;
  const keyword = req.query.keyword?.trim();
  const sort = req.query.sort || 'latest'; // latest | hot

  const offset = (page - 1) * pageSize;

  let where = ['p.status = 1'];
  const params = [];

  if (categoryId) {
    where.push('p.category_id = ?');
    params.push(categoryId);
  }
  if (keyword) {
    where.push('(p.title LIKE ? OR p.content LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`);
  }

  const whereSQL = where.length ? 'WHERE ' + where.join(' AND ') : '';

  let orderSQL;
  if (sort === 'hot') {
    orderSQL = 'ORDER BY p.views DESC, p.likes DESC';
  } else {
    orderSQL = 'ORDER BY p.is_pinned DESC, p.created_at DESC';
  }

  try {
    // 查询总数
    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total FROM posts p ${whereSQL}`,
      params
    );
    const total = countRows[0].total;

    // 查询帖子
    const [rows] = await pool.query(
      `SELECT p.*, u.username, u.nickname, u.avatar, c.name as category_name
       FROM posts p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN categories c ON p.category_id = c.id
       ${whereSQL} ${orderSQL}
       LIMIT ${pageSize} OFFSET ${offset}`,
      params
    );

    return success(res, {
      list: rows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    console.error(err);
    return fail(res, '获取帖子列表失败', 1, 500);
  }
});

// 热门帖子
router.get('/hot', async (req, res) => {
  const limit = parseInt(req.query.limit || '5');
  try {
    const [rows] = await pool.query(
      `SELECT p.id, p.title, p.views, p.likes, p.comment_count, u.nickname
       FROM posts p JOIN users u ON p.user_id = u.id
       WHERE p.status = 1 ORDER BY (p.views + p.likes * 10 + p.comment_count * 20) DESC LIMIT ?`,
      [limit]
    );
    return success(res, rows);
  } catch (err) {
    return fail(res, '获取热门帖子失败', 1, 500);
  }
});

// 最新帖子
router.get('/latest', async (req, res) => {
  const limit = parseInt(req.query.limit || '5');
  try {
    const [rows] = await pool.query(
      `SELECT p.id, p.title, p.created_at, u.nickname FROM posts p JOIN users u ON p.user_id = u.id
       WHERE p.status = 1 ORDER BY p.created_at DESC LIMIT ?`,
      [limit]
    );
    return success(res, rows);
  } catch (err) {
    return fail(res, '获取最新帖子失败', 1, 500);
  }
});

// 帖子详情
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, u.username, u.nickname, u.avatar, c.name as category_name
       FROM posts p JOIN users u ON p.user_id = u.id
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return notFound(res, '帖子不存在');

    const postRow = rows[0];

    // 解析当前登录用户（可选登录）
    let decoded = null;
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.slice(7);
        const jwt = await import('jsonwebtoken');
        decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'dev_secret');
      } catch {}
    }

    // 被隐藏的帖子仅作者本人或管理员可见
    if (postRow.status !== 1 && (!decoded || (decoded.id !== postRow.user_id && decoded.role !== 'admin'))) {
      return notFound(res, '帖子不存在或已被隐藏');
    }

    // 增加浏览量
    await pool.query('UPDATE posts SET views = views + 1 WHERE id = ?', [req.params.id]);

    // 获取标签
    const [tags] = await pool.query(
      `SELECT t.* FROM tags t JOIN post_tags pt ON t.id = pt.tag_id WHERE pt.post_id = ?`,
      [req.params.id]
    );

    const post = { ...postRow, tags };

    // 检查当前用户是否已点赞/收藏
    if (decoded) {
      const [likes] = await pool.query('SELECT 1 FROM likes WHERE user_id = ? AND post_id = ?', [decoded.id, req.params.id]);
      const [favs] = await pool.query('SELECT 1 FROM favorites WHERE user_id = ? AND post_id = ?', [decoded.id, req.params.id]);
      post.is_liked = likes.length > 0;
      post.is_favorited = favs.length > 0;
    }

    return success(res, post);
  } catch (err) {
    return fail(res, '获取帖子详情失败', 1, 500);
  }
});

// 创建帖子
router.post('/', authenticate, async (req, res) => {
  const { title, content, category_id, tags } = req.body;
  if (!title || !content) return fail(res, '标题和内容必填');

  try {
    const [result] = await pool.query(
      'INSERT INTO posts (user_id, title, content, category_id) VALUES (?, ?, ?, ?)',
      [req.user.id, title, content, category_id || null]
    );

    // 处理标签
    if (tags && Array.isArray(tags)) {
      for (const tagName of tags) {
        const [existing] = await pool.query('SELECT id FROM tags WHERE name = ?', [tagName.trim()]);
        let tagId;
        if (existing.length === 0) {
          const [newTag] = await pool.query('INSERT INTO tags (name) VALUES (?)', [tagName.trim()]);
          tagId = newTag.insertId;
        } else {
          tagId = existing[0].id;
        }
        await pool.query('INSERT IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)', [result.insertId, tagId]);
      }
    }

    return success(res, { id: result.insertId }, '发帖成功');
  } catch (err) {
    console.error(err);
    return fail(res, '发帖失败', 1, 500);
  }
});

// 更新帖子
router.put('/:id', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM posts WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return notFound(res, '帖子不存在');

    const post = rows[0];
    if (post.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ code: 403, message: '无权编辑该帖子' });
    }

    const { title, content, category_id, tags } = req.body;
    await pool.query(
      'UPDATE posts SET title = COALESCE(?, title), content = COALESCE(?, content), category_id = COALESCE(?, category_id) WHERE id = ?',
      [title, content, category_id, req.params.id]
    );

    if (tags) {
      await pool.query('DELETE FROM post_tags WHERE post_id = ?', [req.params.id]);
      for (const tagName of tags) {
        const [existing] = await pool.query('SELECT id FROM tags WHERE name = ?', [tagName.trim()]);
        let tagId;
        if (existing.length === 0) {
          const [newTag] = await pool.query('INSERT INTO tags (name) VALUES (?)', [tagName.trim()]);
          tagId = newTag.insertId;
        } else {
          tagId = existing[0].id;
        }
        await pool.query('INSERT IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)', [req.params.id, tagId]);
      }
    }

    return success(res, null, '更新成功');
  } catch (err) {
    return fail(res, '更新失败', 1, 500);
  }
});

// 删除帖子
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM posts WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return notFound(res, '帖子不存在');

    if (rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ code: 403, message: '无权删除该帖子' });
    }

    // 事务级联清理评论、点赞、收藏、标签关联
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('DELETE FROM comments WHERE post_id = ?', [req.params.id]);
      await conn.query('DELETE FROM likes WHERE post_id = ?', [req.params.id]);
      await conn.query('DELETE FROM favorites WHERE post_id = ?', [req.params.id]);
      await conn.query('DELETE FROM post_tags WHERE post_id = ?', [req.params.id]);
      await conn.query('DELETE FROM posts WHERE id = ?', [req.params.id]);
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
    return success(res, null, '删除成功');
  } catch (err) {
    return fail(res, '删除失败', 1, 500);
  }
});

// 点赞
router.post('/:id/like', authenticate, async (req, res) => {
  try {
    const [existing] = await pool.query(
      'SELECT id FROM likes WHERE user_id = ? AND post_id = ?',
      [req.user.id, req.params.id]
    );

    if (existing.length > 0) {
      // 取消点赞
      await pool.query('DELETE FROM likes WHERE id = ?', [existing[0].id]);
      await pool.query('UPDATE posts SET likes = GREATEST(likes - 1, 0) WHERE id = ?', [req.params.id]);
      return success(res, { liked: false, likes: existing[0].likes_count - 1 });
    } else {
      await pool.query('INSERT INTO likes (user_id, post_id) VALUES (?, ?)', [req.user.id, req.params.id]);
      await pool.query('UPDATE posts SET likes = likes + 1 WHERE id = ?', [req.params.id]);
      return success(res, { liked: true });
    }
  } catch (err) {
    return fail(res, '操作失败', 1, 500);
  }
});

// 收藏
router.post('/:id/favorite', authenticate, async (req, res) => {
  try {
    const [existing] = await pool.query(
      'SELECT id FROM favorites WHERE user_id = ? AND post_id = ?',
      [req.user.id, req.params.id]
    );

    if (existing.length > 0) {
      await pool.query('DELETE FROM favorites WHERE id = ?', [existing[0].id]);
      return success(res, { favorited: false });
    } else {
      await pool.query('INSERT INTO favorites (user_id, post_id) VALUES (?, ?)', [req.user.id, req.params.id]);
      return success(res, { favorited: true });
    }
  } catch (err) {
    return fail(res, '操作失败', 1, 500);
  }
});

// 评论列表（树形结构）
router.get('/:id/comments', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.*, u.username, u.nickname, u.avatar
       FROM comments c JOIN users u ON c.user_id = u.id
       WHERE c.post_id = ? ORDER BY c.created_at ASC`,
      [req.params.id]
    );

    // 构建树形结构
    const map = {};
    const tree = [];
    rows.forEach(r => { map[r.id] = { ...r, children: [] }; });
    rows.forEach(r => {
      if (r.parent_id && map[r.parent_id]) {
        map[r.parent_id].children.push(map[r.id]);
      } else {
        tree.push(map[r.id]);
      }
    });

    return success(res, tree);
  } catch (err) {
    return fail(res, '获取评论失败', 1, 500);
  }
});

// 发表评论
router.post('/:id/comments', authenticate, async (req, res) => {
  const { content, parent_id } = req.body;
  if (!content) return fail(res, '评论内容必填');

  try {
    const [result] = await pool.query(
      'INSERT INTO comments (post_id, user_id, parent_id, content) VALUES (?, ?, ?, ?)',
      [req.params.id, req.user.id, parent_id || null, content]
    );
    await pool.query('UPDATE posts SET comment_count = comment_count + 1 WHERE id = ?', [req.params.id]);
    return success(res, { id: result.insertId }, '评论成功');
  } catch (err) {
    return fail(res, '评论失败', 1, 500);
  }
});

// 删除评论
router.delete('/:id/comments/:commentId', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM comments WHERE id = ?', [req.params.commentId]);
    if (rows.length === 0) return notFound(res, '评论不存在');

    const comment = rows[0];
    if (comment.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ code: 403, message: '无权删除该评论' });
    }

    // 递归删除子评论，并统计被删除的评论总数（含自身）
    const deleteChildren = async (parentId) => {
      const [children] = await pool.query('SELECT id FROM comments WHERE parent_id = ?', [parentId]);
      let count = 1;
      for (const child of children) {
        count += await deleteChildren(child.id);
      }
      await pool.query('DELETE FROM comments WHERE id = ?', [parentId]);
      return count;
    };

    const deletedCount = await deleteChildren(comment.id);
    await pool.query(
      'UPDATE posts SET comment_count = GREATEST(comment_count - ?, 0) WHERE id = ?',
      [deletedCount, req.params.id]
    );

    return success(res, null, '删除成功');
  } catch (err) {
    return fail(res, '删除失败', 1, 500);
  }
});

export default router;
