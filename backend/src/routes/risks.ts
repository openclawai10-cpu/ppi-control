import { Router } from 'express';
import { pool } from '../db/init';

const router = Router();

// Risk statistics
router.get('/stats', async (req, res) => {
  try {
    const { projectId } = req.query;

    let query = `
      SELECT
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved,
        COUNT(CASE WHEN severity = 'high' THEN 1 END) as high,
        COUNT(CASE WHEN severity = 'medium' THEN 1 END) as medium,
        COUNT(CASE WHEN severity = 'low' THEN 1 END) as low
      FROM risks
    `;

    const params: any[] = [];
    if (projectId) {
      query += ' WHERE project_id = $1';
      params.push(projectId);
    }

    const result = await pool.query(query, params);
    const row = result.rows[0];

    res.json({
      active: parseInt(row.active) || 0,
      resolved: parseInt(row.resolved) || 0,
      high: parseInt(row.high) || 0,
      medium: parseInt(row.medium) || 0,
      low: parseInt(row.low) || 0
    });
  } catch (error) {
    console.error('Failed to fetch risk stats:', error);
    res.json({ active: 0, resolved: 0, high: 0, medium: 0, low: 0 });
  }
});

// List risks
router.get('/', async (req, res) => {
  try {
    const { projectId, status, severity } = req.query;

    let query = 'SELECT * FROM risks WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (projectId) {
      query += ` AND project_id = $${paramIndex++}`;
      params.push(projectId);
    }
    if (status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(status);
    }
    if (severity) {
      query += ` AND severity = $${paramIndex++}`;
      params.push(severity);
    }

    query += ' ORDER BY identified_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch risks' });
  }
});

export default router;
