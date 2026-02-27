import { Router } from 'express';
import { pool } from '../db/init';

const router = Router();

// Payment statistics
router.get('/stats', async (req, res) => {
  try {
    const { projectId } = req.query;

    let query = `
      SELECT
        COALESCE(SUM(amount), 0) as total,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as paid,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending
      FROM payments
    `;

    const params: any[] = [];
    if (projectId) {
      query += ' WHERE project_id = $1';
      params.push(projectId);
    }

    const result = await pool.query(query, params);
    const row = result.rows[0];

    res.json({
      total: parseFloat(row.total) || 0,
      paid: parseFloat(row.paid) || 0,
      pending: parseFloat(row.pending) || 0
    });
  } catch (error) {
    console.error('Failed to fetch payment stats:', error);
    res.json({ total: 0, paid: 0, pending: 0 });
  }
});

// List payments
router.get('/', async (req, res) => {
  try {
    const { projectId, status } = req.query;

    let query = 'SELECT * FROM payments WHERE 1=1';
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

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

export default router;
