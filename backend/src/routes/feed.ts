import { Router } from 'express';
import { pool } from '../db/init';

const router = Router();

// List feed logs
router.get('/', async (req, res) => {
  try {
    const { projectId, agent, category, limit = 100 } = req.query;

    let query = 'SELECT * FROM feed_logs WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (projectId) {
      query += ` AND project_id = $${paramIndex++}`;
      params.push(projectId);
    }
    if (agent) {
      query += ` AND agent = $${paramIndex++}`;
      params.push(agent);
    }
    if (category) {
      query += ` AND category = $${paramIndex++}`;
      params.push(category);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch feed logs' });
  }
});

// Get feed entry by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM feed_logs WHERE id = $1', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Feed entry not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch feed entry' });
  }
});

// Get feed statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const { projectId, days = 7 } = req.query;

    let query = `
      SELECT
        agent,
        category,
        COUNT(*) as count,
        DATE(created_at) as date
      FROM feed_logs
      WHERE created_at >= CURRENT_DATE - INTERVAL '${parseInt(days as string)} days'
    `;
    const params: any[] = [];

    if (projectId) {
      query += ' AND project_id = $1';
      params.push(projectId);
    }

    query += ' GROUP BY agent, category, DATE(created_at) ORDER BY date DESC, count DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch feed statistics' });
  }
});

export default router;
