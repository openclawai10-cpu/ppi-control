import { Router } from 'express';
import { pool } from '../db/init';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// List purchases
router.get('/', async (req, res) => {
  try {
    const { projectId, status } = req.query;

    let query = 'SELECT * FROM purchases WHERE 1=1';
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
    res.status(500).json({ error: 'Failed to fetch purchases' });
  }
});

// Get purchase by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM purchases WHERE id = $1', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch purchase' });
  }
});

// Create purchase
router.post('/', async (req, res) => {
  try {
    const { projectId, taskId, item, description } = req.body;

    const result = await pool.query(`
      INSERT INTO purchases (id, project_id, task_id, item, description, status, quotations, created_at)
      VALUES ($1, $2, $3, $4, $5, 'pending_quotations', '[]', $6)
      RETURNING *
    `, [uuidv4(), projectId, taskId, item, description || '', new Date()]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create purchase' });
  }
});

// Add quotation to purchase
router.post('/:id/quotations', async (req, res) => {
  try {
    const { supplier, price, deadline, notes } = req.body;

    // Get current purchase
    const current = await pool.query('SELECT * FROM purchases WHERE id = $1', [req.params.id]);
    const purchase = current.rows[0];

    if (!purchase) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    const quotations = JSON.parse(purchase.quotations || '[]');
    quotations.push({ supplier, price, deadline, notes });

    const status = quotations.length >= 3 ? 'ready_for_comparison' : purchase.status;

    const result = await pool.query(`
      UPDATE purchases
      SET quotations = $1, status = $2, updated_at = $3
      WHERE id = $4
      RETURNING *
    `, [JSON.stringify(quotations), status, new Date(), req.params.id]);

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add quotation' });
  }
});

// Select quotation
router.post('/:id/select', async (req, res) => {
  try {
    const { quotationIndex } = req.body;

    const result = await pool.query(`
      UPDATE purchases
      SET selected_quotation = $1, status = 'selected', updated_at = $2
      WHERE id = $3
      RETURNING *
    `, [quotationIndex, new Date(), req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to select quotation' });
  }
});

// Get purchase dashboard
router.get('/dashboard/summary', async (req, res) => {
  try {
    const { projectId } = req.query;

    let query = `
      SELECT
        status,
        COUNT(*) as count
      FROM purchases
    `;

    const params: any[] = [];
    if (projectId) {
      query += ' WHERE project_id = $1';
      params.push(projectId);
    }

    query += ' GROUP BY status';

    const result = await pool.query(query, params);

    const stats = {
      pending: 0,
      ready: 0,
      selected: 0,
      completed: 0
    };

    for (const row of result.rows) {
      if (row.status === 'pending_quotations') stats.pending = parseInt(row.count);
      else if (row.status === 'ready_for_comparison') stats.ready = parseInt(row.count);
      else if (row.status === 'selected') stats.selected = parseInt(row.count);
      else if (row.status === 'completed') stats.completed = parseInt(row.count);
    }

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch purchase dashboard' });
  }
});

export default router;
