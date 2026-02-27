import { Router } from 'express';
import { pool } from '../db/init';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// List documents
router.get('/', async (req, res) => {
  try {
    const { projectId, category, type } = req.query;

    let query = 'SELECT * FROM documents WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (projectId) {
      query += ` AND project_id = $${paramIndex++}`;
      params.push(projectId);
    }
    if (category) {
      query += ` AND category = $${paramIndex++}`;
      params.push(category);
    }
    if (type) {
      query += ` AND type = $${paramIndex++}`;
      params.push(type);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Get document by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM documents WHERE id = $1', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

// Create document
router.post('/', async (req, res) => {
  try {
    const { projectId, name, type, category, content, metadata } = req.body;

    const result = await pool.query(`
      INSERT INTO documents (id, project_id, name, type, category, content, metadata, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [uuidv4(), projectId, name, type || 'document', category || 'general', content, JSON.stringify(metadata || {}), new Date()]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create document' });
  }
});

// Update document
router.put('/:id', async (req, res) => {
  try {
    const { name, type, category, content, metadata } = req.body;

    const result = await pool.query(`
      UPDATE documents
      SET
        name = COALESCE($1, name),
        type = COALESCE($2, type),
        category = COALESCE($3, category),
        content = COALESCE($4, content),
        metadata = COALESCE($5, metadata),
        updated_at = $6
      WHERE id = $7
      RETURNING *
    `, [name, type, category, content, JSON.stringify(metadata), new Date(), req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update document' });
  }
});

// Delete document
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM documents WHERE id = $1 RETURNING *', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({ message: 'Document deleted', document: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

export default router;
