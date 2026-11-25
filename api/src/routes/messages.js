import express from 'express';
import pool from '../config/db.js';
import { success, fail, notFound, forbidden } from '../utils/response.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// 是否互相关注（私信的前提）
async function isMutual(a, b) {
  const [[relation]] = await pool.query(
    `SELECT EXISTS(SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?) AS ab,
            EXISTS(SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?) AS ba`,
    [a, b, b, a]
  );
  return !!(relation.ab && relation.ba);
}

// 未读消息总数
router.get('/unread', authenticate, async (req, res) => {
  try {
    const [[row]] = await pool.query(
      'SELECT COUNT(*) AS total FROM messages WHERE receiver_id = ? AND is_read = 0',
      [req.user.id]
    );
    return success(res, { total: row.total });
  } catch (err) {
    return fail(res, '获取未读消息失败', 1, 500);
  }
});

// 会话列表（每个对话对象最近一条消息 + 未读数）
router.get('/conversations', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.username, u.nickname, u.avatar,
              m.content AS last_content, m.created_at AS last_at, m.sender_id AS last_sender_id,
              (SELECT COUNT(*) FROM messages um
                WHERE um.sender_id = u.id AND um.receiver_id = ? AND um.is_read = 0) AS unread
       FROM (
         SELECT CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END AS peer_id,
                MAX(id) AS last_id
         FROM messages
         WHERE sender_id = ? OR receiver_id = ?
         GROUP BY peer_id
       ) t
       JOIN users u ON u.id = t.peer_id
       JOIN messages m ON m.id = t.last_id
       ORDER BY m.created_at DESC
       LIMIT 50`,
      [req.user.id, req.user.id, req.user.id, req.user.id]
    );
    return success(res, rows);
  } catch (err) {
    return fail(res, '获取会话列表失败', 1, 500);
  }
});

// 与某用户的聊天记录（同时标记对方发来的消息为已读）
router.get('/:userId', authenticate, async (req, res) => {
  const peerId = parseInt(req.params.userId);
  const pageSize = Math.min(parseInt(req.query.pageSize || '50'), 100);
  const before = parseInt(req.query.before || '0');

  if (!peerId || peerId === req.user.id) {
    return fail(res, '不能与自己聊天');
  }

  try {
    const [peers] = await pool.query(
      'SELECT id, username, nickname, avatar FROM users WHERE id = ? AND status = 1',
      [peerId]
    );
    if (!peers.length) return notFound(res, '用户不存在');

    const mutual = await isMutual(req.user.id, peerId);
    if (!mutual) return forbidden(res, '互相关注后才能查看私信');

    const params = [req.user.id, peerId, peerId, req.user.id];
    let sql = `SELECT id, sender_id, receiver_id, content, is_read, created_at
               FROM messages
               WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))`;
    if (before) {
      sql += ' AND id < ?';
      params.push(before);
    }
    sql += ' ORDER BY id DESC LIMIT ?';
    params.push(pageSize);

    const [rows] = await pool.query(sql, params);

    await pool.query(
      'UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ? AND is_read = 0',
      [peerId, req.user.id]
    );

    return success(res, {
      peer: peers[0],
      mutual,
      list: rows.reverse(),
      hasMore: rows.length === pageSize,
    });
  } catch (err) {
    return fail(res, '获取聊天记录失败', 1, 500);
  }
});

// 发送私信
router.post('/:userId', authenticate, async (req, res) => {
  const peerId = parseInt(req.params.userId);
  const content = String(req.body?.content || '').trim();

  if (!peerId || peerId === req.user.id) {
    return fail(res, '不能给自己发消息');
  }
  if (!content) return fail(res, '消息内容不能为空');
  if (content.length > 1000) return fail(res, '单条消息不能超过 1000 字');

  try {
    const [peers] = await pool.query(
      'SELECT id FROM users WHERE id = ? AND status = 1',
      [peerId]
    );
    if (!peers.length) return notFound(res, '用户不存在');

    const mutual = await isMutual(req.user.id, peerId);
    if (!mutual) return forbidden(res, '互相关注后才能发送私信');

    const [result] = await pool.query(
      'INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)',
      [req.user.id, peerId, content]
    );

    return success(res, {
      id: result.insertId,
      sender_id: req.user.id,
      receiver_id: peerId,
      content,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    return fail(res, '发送消息失败', 1, 500);
  }
});

export default router;
