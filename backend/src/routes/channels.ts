import { Router } from 'express';
import { pool } from '../db/init';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// List channel messages
router.get('/messages', async (req, res) => {
  try {
    const { projectId, channel, limit = 100 } = req.query;

    let query = 'SELECT * FROM channel_messages WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (projectId) {
      query += ` AND project_id = $${paramIndex++}`;
      params.push(projectId);
    }
    if (channel) {
      query += ` AND channel = $${paramIndex++}`;
      params.push(channel);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch channel messages' });
  }
});

// Send message to channel
router.post('/messages', async (req, res) => {
  try {
    const { projectId, channel, direction, content, metadata } = req.body;

    const result = await pool.query(`
      INSERT INTO channel_messages (id, project_id, channel, direction, content, metadata, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [uuidv4(), projectId, channel, direction || 'outbound', content, JSON.stringify(metadata || {}), new Date()]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create channel message' });
  }
});

// List available channels
router.get('/list', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT channel, COUNT(*) as message_count
      FROM channel_messages
      GROUP BY channel
      ORDER BY message_count DESC
    `);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
});

export default router;
