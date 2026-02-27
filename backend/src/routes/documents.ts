import { Router } from 'express';
import { pool } from '../db/init';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';

const router = Router();

// Configurar multer para upload em memória
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Upload de arquivo
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const { projectId, name, category } = req.body;
    const file = req.file;

    // Converter arquivo para base64 para armazenamento
    const fileContent = file.buffer.toString('base64');
    const mimeType = file.mimetype;

    // Determinar tipo do arquivo
    let docType = 'document';
    if (mimeType.includes('pdf')) docType = 'pdf';
    else if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || file.originalname.endsWith('.csv')) docType = 'spreadsheet';
    else if (mimeType.includes('image')) docType = 'image';
    else if (mimeType.includes('word') || file.originalname.endsWith('.doc')) docType = 'document';

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
        mimeType: mimeType,
        size: file.size,
        uploadedAt: new Date().toISOString()
      }),
      new Date()
    ]);

    const document = result.rows[0];

    // Log no feed
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
        size: file.size
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Falha ao fazer upload do arquivo' });
  }
});

// Download de arquivo
router.get('/:id/download', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM documents WHERE id = $1', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }

    const doc = result.rows[0];
    const metadata = doc.metadata || {};

    // Decodificar base64
    const fileBuffer = Buffer.from(doc.content, 'base64');

    res.setHeader('Content-Type', metadata.mimetype || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${metadata.originalName || doc.name}"`);
    res.send(fileBuffer);
  } catch (error) {
    res.status(500).json({ error: 'Falha ao baixar arquivo' });
  }
});

// Listar documentos
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
    
    // Remover conteúdo base64 da listagem
    const documents = result.rows.map(doc => ({
      ...doc,
      metadata: {
        ...doc.metadata,
        size: doc.metadata?.size || 0,
        originalName: doc.metadata?.originalName || doc.name,
        mimeType: doc.metadata?.mimetype || 'unknown'
      }
    }));

    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: 'Falha ao buscar documentos' });
  }
});

export default router;
