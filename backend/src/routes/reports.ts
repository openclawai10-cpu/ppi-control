import { Router } from 'express';
import { pool } from '../db/init';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Exportar relatório financeiro (CSV/Excel)
router.get('/financial/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { format = 'csv' } = req.query;

    const payments = await pool.query(`
      SELECT 
        p.beneficiary as "Beneficiário",
        p.amount as "Valor",
        p.status as "Status",
        p.payment_date as "Data Pagamento",
        p.category as "Categoria",
        p.notes as "Observações",
        p.created_at as "Criado em"
      FROM payments p
      WHERE p.project_id = $1
      ORDER BY p.created_at DESC
    `, [projectId]);

    const project = await pool.query('SELECT name FROM projects WHERE id = $1', [projectId]);
    const projectName = project.rows[0]?.name || 'Projeto';

    if (format === 'csv') {
      const headers = Object.keys(payments.rows[0] || {}).join(',');
      const rows = payments.rows.map(row => 
        Object.values(row).map(v => `"${v || ''}"`).join(',')
      ).join('\n');

      const csv = `${headers}\n${rows}`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${projectName.replace(/\s+/g, '_')}_financeiro.csv"`);
      res.send('\ufeff' + csv); // BOM for Excel
    } else {
      res.json({ payments: payments.rows, project: projectName });
    }
  } catch (error) {
    res.status(500).json({ error: 'Falha ao exportar relatório' });
  }
});

// Exportar lista de bolsistas (CSV)
router.get('/bolsistas/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;

    const bolsistas = await pool.query(`
      SELECT 
        beneficiary as "Nome",
        amount as "Valor Bolsa",
        status as "Status",
        category as "Categoria",
        notes as "Função"
      FROM payments
      WHERE project_id = $1
      ORDER BY beneficiary
    `, [projectId]);

    const project = await pool.query('SELECT name FROM projects WHERE id = $1', [projectId]);
    const projectName = project.rows[0]?.name || 'Projeto';

    const headers = Object.keys(bolsistas.rows[0] || {}).join(',');
    const rows = bolsistas.rows.map(row => 
      Object.values(row).map(v => `"${v || ''}"`).join(',')
    ).join('\n');

    const csv = `${headers}\n${rows}`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${projectName.replace(/\s+/g, '_')}_bolsistas.csv"`);
    res.send('\ufeff' + csv);
  } catch (error) {
    res.status(500).json({ error: 'Falha ao exportar lista' });
  }
});

// Exportar relatório de riscos
router.get('/riscos/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;

    const riscos = await pool.query(`
      SELECT 
        description as "Descrição",
        severity as "Severidade",
        status as "Status",
        mitigation as "Mitigação",
        identified_at as "Identificado em",
        resolved_at as "Resolvido em"
      FROM risks
      WHERE project_id = $1
      ORDER BY 
        CASE severity 
          WHEN 'high' THEN 1 
          WHEN 'medium' THEN 2 
          ELSE 3 
        END,
        identified_at DESC
    `, [projectId]);

    const project = await pool.query('SELECT name FROM projects WHERE id = $1', [projectId]);
    const projectName = project.rows[0]?.name || 'Projeto';

    const headers = Object.keys(riscos.rows[0] || {}).join(',');
    const rows = riscos.rows.map(row => 
      Object.values(row).map(v => `"${v || ''}"`).join(',')
    ).join('\n');

    const csv = `${headers}\n${rows}`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${projectName.replace(/\s+/g, '_')}_riscos.csv"`);
    res.send('\ufeff' + csv);
  } catch (error) {
    res.status(500).json({ error: 'Falha ao exportar riscos' });
  }
});

// Relatório de prestação de contas (consolidado)
router.get('/prestacao-contas/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { startDate, endDate } = req.query;

    // Buscar projeto
    const project = await pool.query(`
      SELECT name, budget, start_date, end_date 
      FROM projects WHERE id = $1
    `, [projectId]);

    // Buscar pagamentos no período
    const payments = await pool.query(`
      SELECT 
        COUNT(*) as total_pagamentos,
        SUM(amount) as valor_total,
        SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as pago,
        SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pendente
      FROM payments
      WHERE project_id = $1
      ${startDate ? 'AND created_at >= $2' : ''}
      ${endDate ? 'AND created_at <= $3' : ''}
    `, [projectId, startDate, endDate].filter(Boolean));

    // Buscar tarefas concluídas
    const tasks = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN kanban_column = 'completed' THEN 1 END) as concluidas
      FROM tasks
      WHERE project_id = $1
    `, [projectId]);

    // Buscar documentos
    const docs = await pool.query(`
      SELECT COUNT(*) as total
      FROM documents
      WHERE project_id = $1
    `, [projectId]);

    // Buscar riscos
    const risks = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolvidos
      FROM risks
      WHERE project_id = $1
    `, [projectId]);

    const report = {
      projeto: project.rows[0],
      periodo: { startDate, endDate },
      financeiro: payments.rows[0],
      tarefas: tasks.rows[0],
      documentos: docs.rows[0],
      riscos: risks.rows[0],
      geradoEm: new Date().toISOString()
    };

    res.json(report);
  } catch (error) {
    res.status(500).json({ error: 'Falha ao gerar relatório' });
  }
});

export default router;
