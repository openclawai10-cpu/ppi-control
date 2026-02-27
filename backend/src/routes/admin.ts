import { Router } from 'express';
import { pool } from '../db/init';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();

// Executar seed de dados de demonstração
router.post('/seed', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const seedPath = path.join(__dirname, '../../seed.sql');
    const seedSQL = fs.readFileSync(seedPath, 'utf8');
    
    await client.query(seedSQL);
    
    res.json({ 
      success: true, 
      message: 'Dados de demonstração inseridos com sucesso!',
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Falha ao executar seed',
      details: error 
    });
  } finally {
    client.release();
  }
});

// Limpar todos os dados
router.post('/clear', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query(`
      TRUNCATE TABLE feed_logs, compliance_checks, risks, payments, 
      purchases, channel_messages, documents, tasks, projects CASCADE
    `);
    
    res.json({ 
      success: true, 
      message: 'Todos os dados foram removidos',
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Falha ao limpar dados' 
    });
  } finally {
    client.release();
  }
});

export default router;
