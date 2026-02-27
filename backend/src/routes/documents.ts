import { Router } from 'express';
import { pool } from '../db/init';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import * as path from 'path';

const router = Router();

const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }
});

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const { projectId, name, category } = req.body;
    const file = req.file;

    let docType = 'document';
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (['.zip', '.rar', '.7z'].includes(ext)) {
      docType = 'archive';
    } else if (ext === '.pdf') {
      docType = 'pdf';
    } else if (['.xlsx', '.xls', '.csv'].includes(ext)) {
      docType = 'spreadsheet';
    } else if (['.png', '.jpg', '.jpeg', '.gif'].includes(ext)) {
      docType = 'image';
    }

    const fileContent = file.buffer.toString('base64');

    const result = await pool.query(`
      INSERT INTO documents (id, project_id, name, type, category, content, metadata, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      uuidv4(),
      projectId || null,
      name || file.originalname,
      docType,
      category || 'general',
      fileContent,
      JSON.stringify({
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        extension: ext,
        uploadedAt: new Date().toISOString()
      }),
      new Date()
    ]);

    const document = result.rows[0];

    await pool.query(`
      INSERT INTO feed_logs (id, project_id, agent, category, action, details, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      uuidv4(),
      projectId || null,
      'database',
      'document',
      `Arquivo enviado: ${name || file.originalname}`,
      JSON.stringify({ documentId: document.id, size: file.size, type: docType }),
      new Date()
    ]);

    res.status(201).json({
      success: true,
      document: {
        id: document.id,
        name: document.name,
        type: document.type,
        category: document.category,
        size: file.size,
        extension: ext
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Falha ao fazer upload do arquivo' });
  }
});

router.get('/:id/download', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM documents WHERE id = $1', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }

    const doc = result.rows[0];
    const metadata = doc.metadata || {};

    const fileBuffer = Buffer.from(doc.content, 'base64');

    res.setHeader('Content-Type', metadata.mimetype || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${metadata.originalName || doc.name}"`);
    res.send(fileBuffer);
  } catch (error) {
    res.status(500).json({ error: 'Falha ao baixar arquivo' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { projectId, category, type } = req.query;

    let query = 'SELECT id, project_id, name, type, category, created_at, metadata FROM documents WHERE 1=1';
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
    
    const documents = result.rows.map(doc => ({
      ...doc,
      metadata: {
        size: doc.metadata?.size || 0,
        originalName: doc.metadata?.originalName || doc.name,
        mimeType: doc.metadata?.mimetype || 'unknown',
        extension: doc.metadata?.extension || ''
      }
    }));

    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: 'Falha ao buscar documentos' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM documents WHERE id = $1 RETURNING *', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }

    res.json({ success: true, message: 'Documento excluído' });
  } catch (error) {
    res.status(500).json({ error: 'Falha ao excluir documento' });
  }
});

export default router;
