import { Router } from 'express';
import { pool } from '../db/init';

const router = Router();

// List all projects
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;

    let query = 'SELECT * FROM projects WHERE 1=1';
    const params: any[] = [];

    if (status) {
      query += ' AND status = $1';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Get project by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM projects WHERE id = $1', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// Create project
router.post('/', async (req, res) => {
  try {
    const { name, description, budget, startDate, endDate } = req.body;

    const result = await pool.query(`
      INSERT INTO projects (name, description, budget, start_date, end_date, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [name, description || '', budget || 0, startDate || null, endDate || null, new Date()]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Update project
router.put('/:id', async (req, res) => {
  try {
    const { name, description, status, budget, startDate, endDate } = req.body;

    const result = await pool.query(`
      UPDATE projects
      SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        status = COALESCE($3, status),
        budget = COALESCE($4, budget),
        start_date = COALESCE($5, start_date),
        end_date = COALESCE($6, end_date),
        updated_at = $7
      WHERE id = $8
      RETURNING *
    `, [name, description, status, budget, startDate, endDate, new Date(), req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Delete project
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM projects WHERE id = $1 RETURNING *', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ message: 'Project deleted', project: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

export default router;
