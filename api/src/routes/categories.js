import express from 'express';
import pool from '../config/db.js';
import { success, fail } from '../utils/response.js';

const router = express.Router();

// 分类列表
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.*, (SELECT COUNT(*) FROM posts p WHERE p.category_id = c.id AND p.status = 1) as post_count
       FROM categories c ORDER BY c.sort_order ASC, c.id ASC`
    );
    return success(res, rows);
  } catch (err) {
    return fail(res, '获取分类失败', 1, 500);
  }
});

export default router;
