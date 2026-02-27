import { Router } from 'express';
import { pool } from '../db/init';

const router = Router();

// List all tasks
router.get('/', async (req, res) => {
  try {
    const { projectId, kanbanColumn, priority } = req.query;

    let query = `
      SELECT t.*, p.name as project_name
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (projectId) {
      query += ` AND t.project_id = $${paramIndex++}`;
      params.push(projectId);
    }
    if (kanbanColumn) {
      query += ` AND t.kanban_column = $${paramIndex++}`;
      params.push(kanbanColumn);
    }
    if (priority) {
      query += ` AND t.priority = $${paramIndex++}`;
      params.push(priority);
    }

    query += ' ORDER BY t.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Get task by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, p.name as project_name
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// Create task
router.post('/', async (req, res) => {
  try {
    const { projectId, title, description, priority, dueDate } = req.body;

    const result = await pool.query(`
      INSERT INTO tasks (project_id, title, description, kanban_column, priority, due_date, created_at)
      VALUES ($1, $2, $3, 'new', $4, $5, $6)
      RETURNING *
    `, [projectId, title, description || '', priority || 'medium', dueDate || null, new Date()]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update task
router.put('/:id', async (req, res) => {
  try {
    const { title, description, kanbanColumn, priority, assignedAgent, dueDate } = req.body;

    const result = await pool.query(`
      UPDATE tasks
      SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        kanban_column = COALESCE($3, kanban_column),
        priority = COALESCE($4, priority),
        assigned_agent = COALESCE($5, assigned_agent),
        due_date = COALESCE($6, due_date),
        updated_at = $7
      WHERE id = $8
      RETURNING *
    `, [title, description, kanbanColumn, priority, assignedAgent, dueDate, new Date(), req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Delete task
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING *', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ message: 'Task deleted', task: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

export default router;
