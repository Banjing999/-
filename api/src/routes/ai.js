import express from 'express';
import crypto from 'crypto';
import pool from '../config/db.js';
import { success, fail, notFound } from '../utils/response.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import {
  getAIStatus,
  generateSummary,
  translateTexts,
  expandContent,
  checkPost,
  reviewPost,
  AIUnavailableError,
} from '../services/ai.js';

const router = express.Router();

// AI 服务状态
router.get('/status', (req, res) => success(res, getAIStatus()));

async function loadPost(id) {
  const [rows] = await pool.query(
    'SELECT id, title, content, comment_count, status FROM posts WHERE id = ?',
    [id]
  );
  return rows[0] || null;
}

// 生成帖子摘要 + 一句话总结（带缓存）
router.post('/posts/:id/summary', async (req, res) => {
  try {
    const post = await loadPost(req.params.id);
    if (!post || post.status !== 1) return notFound(res, '帖子不存在');

    const [comments] = await pool.query(
      'SELECT content FROM comments WHERE post_id = ? ORDER BY created_at ASC LIMIT 20',
      [req.params.id]
    );

    const hash = crypto
      .createHash('sha256')
      .update([post.title, post.content, post.comment_count].join('\u0001'))
      .digest('hex');

    const [cached] = await pool.query(
      'SELECT summary, one_liner, summary_hash FROM post_ai WHERE post_id = ?',
      [req.params.id]
    );

    if (cached.length && cached[0].summary && cached[0].summary_hash === hash) {
      return success(res, {
        summary: cached[0].summary,
        oneLiner: cached[0].one_liner,
        source: 'cache',
        cached: true,
      });
    }

    const result = await generateSummary({
      title: post.title,
      content: post.content,
      commentCount: post.comment_count,
      commentSample: comments.map((c) => c.content),
    });

    await pool.query(
      `INSERT INTO post_ai (post_id, summary, one_liner, summary_hash)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE summary = VALUES(summary), one_liner = VALUES(one_liner), summary_hash = VALUES(summary_hash)`,
      [post.id, result.summary, result.oneLiner, hash]
    );

    return success(res, { ...result, cached: false });
  } catch (err) {
    console.error(err);
    return fail(res, '生成摘要失败', 1, 500);
  }
});

// 翻译（单帖 / 整楼共用）
router.post('/translate', async (req, res) => {
  const { texts, targetLang = 'en' } = req.body || {};

  if (!Array.isArray(texts) || texts.length === 0) {
    return fail(res, '待翻译内容不能为空');
  }
  if (texts.length > 40) {
    return fail(res, '单次最多翻译 40 段内容');
  }

  const cleaned = texts.map((text) => String(text ?? '').slice(0, 4000));

  try {
    const result = await translateTexts(cleaned, targetLang);
    return success(res, result);
  } catch (err) {
    if (err instanceof AIUnavailableError) {
      return fail(res, err.message, 503, 503);
    }
    console.error(err);
    return fail(res, `翻译失败：${err.message}`, 502, 502);
  }
});

// AI 扩写正文（基于标题和草稿）
router.post('/expand', authenticate, async (req, res) => {
  const { title = '', content = '' } = req.body || {};
  if (!String(title).trim() || !String(content).trim()) {
    return fail(res, '请先填写标题和正文草稿');
  }

  try {
    const result = await expandContent({ title, content });
    return success(res, result);
  } catch (err) {
    if (err instanceof AIUnavailableError) {
      return fail(res, err.message, 503, 503);
    }
    console.error(err);
    return fail(res, `扩写失败：${err.message}`, 502, 502);
  }
});

// 发帖自检
router.post('/check', authenticate, async (req, res) => {
  const { title = '', content = '' } = req.body || {};
  if (!String(title).trim() || !String(content).trim()) {
    return fail(res, '标题和正文不能为空');
  }

  try {
    const result = await checkPost({ title, content });
    return success(res, result);
  } catch (err) {
    console.error(err);
    return fail(res, 'AI 自检失败', 1, 500);
  }
});

// 后台 AI 审批
router.post('/posts/:id/review', authenticate, requireAdmin, async (req, res) => {
  try {
    const post = await loadPost(req.params.id);
    if (!post) return notFound(res, '帖子不存在');

    const result = await reviewPost({ title: post.title, content: post.content });

    await pool.query(
      `INSERT INTO post_ai (post_id, review_status, review_risk, review_score, review_reason, reviewed_at)
       VALUES (?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE review_status = VALUES(review_status), review_risk = VALUES(review_risk),
       review_score = VALUES(review_score), review_reason = VALUES(review_reason), reviewed_at = NOW()`,
      [post.id, result.decision, result.risk, result.score, result.reasons.join('\n')]
    );

    return success(res, result);
  } catch (err) {
    console.error(err);
    return fail(res, 'AI 审批失败', 1, 500);
  }
});

export default router;
