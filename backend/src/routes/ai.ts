import { Router } from 'express';
import { pool } from '../db/init';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Análise de riscos com base em padrões históricos
router.get('/risk-analysis/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;

    // Buscar histórico de riscos
    const risks = await pool.query(`
      SELECT severity, status, description, identified_at, resolved_at
      FROM risks
      WHERE project_id = $1
      ORDER BY identified_at DESC
    `, [projectId]);

    // Buscar pagamentos
    const payments = await pool.query(`
      SELECT status, amount, created_at, payment_date
      FROM payments
      WHERE project_id = $1
      ORDER BY created_at DESC
    `, [projectId]);

    // Buscar tarefas
    const tasks = await pool.query(`
      SELECT kanban_column, priority, due_date, created_at
      FROM tasks
      WHERE project_id = $1
    `, [projectId]);

    // Análise de padrões
    const analysis = {
      riscoGlosa: 0,
      riscoAtraso: 0,
      riscoCompliance: 0,
      previsoes: [] as string[],
      recomendacoes: [] as string[],
      score: 0
    };

    // Calcular risco de glosa baseado em:
    // - Pagamentos pendentes por muito tempo
    const pendingPayments = payments.rows.filter(p => p.status === 'pending');
    const oldPending = pendingPayments.filter(p => {
      const days = Math.floor((Date.now() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24));
      return days > 15;
    });

    if (oldPending.length > 0) {
      analysis.riscoGlosa += 30;
      analysis.previsoes.push(`${oldPending.length} pagamento(s) pendente(s) há mais de 15 dias`);
      analysis.recomendacoes.push('Regularizar pagamentos pendentes urgentemente');
    }

    // - Falta de documentação
    const docs = await pool.query(`
      SELECT COUNT(*) as count FROM documents WHERE project_id = $1
    `, [projectId]);

    if (parseInt(docs.rows[0]?.count) < 5) {
      analysis.riscoCompliance += 25;
      analysis.recomendacoes.push('Aumentar documentação do projeto');
    }

    // - Riscos não resolvidos
    const activeRisks = risks.rows.filter(r => r.status === 'active');
    const highRisks = activeRisks.filter(r => r.severity === 'high');

    if (highRisks.length > 0) {
      analysis.riscoGlosa += 20 * highRisks.length;
      analysis.previsoes.push(`${highRisks.length} risco(s) alto não mitigado(s)`);
    }

    // Calcular risco de atraso
    const overdueTasks = tasks.rows.filter(t => {
      if (!t.due_date || t.kanban_column === 'completed') return false;
      return new Date(t.due_date) < new Date();
    });

    if (overdueTasks.length > 0) {
      analysis.riscoAtraso += 25;
      analysis.previsoes.push(`${overdueTasks.length} tarefa(s) com prazo vencido`);
      analysis.recomendacoes.push('Revisar planejamento e redistribuir tarefas');
    }

    // Tarefas de alta prioridade sem alocar
    const unallocatedHigh = tasks.rows.filter(t => 
      t.priority === 'high' && t.kanban_column === 'new'
    );

    if (unallocatedHigh.length > 0) {
      analysis.riscoAtraso += 15;
      analysis.recomendacoes.push('Alocar urgentemente tarefas de alta prioridade');
    }

    // Score geral (0-100, maior = melhor)
    const totalRisk = analysis.riscoGlosa + analysis.riscoAtraso + analysis.riscoCompliance;
    analysis.score = Math.max(0, 100 - totalRisk);

    res.json({
      projectId,
      analysis,
      data: {
        totalRisks: risks.rows.length,
        activeRisks: activeRisks.length,
        totalPayments: payments.rows.length,
        pendingPayments: pendingPayments.length,
        totalTasks: tasks.rows.length,
        overdueTasks: overdueTasks.length
      },
      geradoEm: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Falha na análise' });
  }
});

// Previsão de necessidades futuras
router.get('/forecast/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { months = 3 } = req.query;

    // Buscar histórico de pagamentos
    const payments = await pool.query(`
      SELECT 
        DATE_TRUNC('month', created_at) as mes,
        SUM(amount) as total
      FROM payments
      WHERE project_id = $1 AND status = 'paid'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY mes DESC
      LIMIT 6
    `, [projectId]);

    // Calcular média mensal
    const avgMonthly = payments.rows.reduce((sum, p) => sum + parseFloat(p.total || 0), 0) / Math.max(payments.rows.length, 1);

    // Previsão simples (média móvel)
    const forecast = [];
    for (let i = 1; i <= parseInt(months as string); i++) {
      const date = new Date();
      date.setMonth(date.getMonth() + i);
      forecast.push({
        mes: date.toISOString().split('T')[0].substring(0, 7),
        previsto: avgMonthly,
        confianca: Math.max(50, 100 - i * 10)
      });
    }

    // Buscar tarefas pendentes
    const pendingTasks = await pool.query(`
      SELECT COUNT(*) as count FROM tasks
      WHERE project_id = $1 AND kanban_column != 'completed'
    `, [projectId]);

    res.json({
      projectId,
      mediaMensal: avgMonthly,
      previsao: forecast,
      tarefasPendentes: parseInt(pendingTasks.rows[0]?.count || 0),
      recomendacao: avgMonthly > 0 
        ? `Previsão de necessidade de R$ ${(avgMonthly * parseInt(months as string)).toFixed(2)} nos próximos ${months} meses`
        : 'Sem dados suficientes para previsão',
      geradoEm: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Falha na previsão' });
  }
});

// Sugestões automáticas baseadas em IA
router.get('/suggestions/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;

    const suggestions = [];

    // Buscar dados do projeto
    const [tasks, payments, risks, docs] = await Promise.all([
      pool.query(`SELECT * FROM tasks WHERE project_id = $1`, [projectId]),
      pool.query(`SELECT * FROM payments WHERE project_id = $1`, [projectId]),
      pool.query(`SELECT * FROM risks WHERE project_id = $1`, [projectId]),
      pool.query(`SELECT * FROM documents WHERE project_id = $1`, [projectId])
    ]);

    // Análise de tarefas
    const newTasks = tasks.rows.filter(t => t.kanban_column === 'new');
    if (newTasks.length > 3) {
      suggestions.push({
        type: 'task',
        priority: 'medium',
        title: 'Acúmulo de tarefas',
        description: `Você tem ${newTasks.length} tarefas não alocadas. Considere distribuir as responsabilidades.`,
        action: 'Alocar tarefas'
      });
    }

    // Análise de pagamentos
    const pendingPayments = payments.rows.filter(p => p.status === 'pending');
    if (pendingPayments.length > 0) {
      const total = pendingPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
      suggestions.push({
        type: 'payment',
        priority: 'high',
        title: 'Pagamentos pendentes',
        description: `${pendingPayments.length} pagamento(s) totalizando R$ ${total.toFixed(2)} aguardando processamento.`,
        action: 'Processar pagamentos'
      });
    }

    // Análise de riscos
    const highRisks = risks.rows.filter(r => r.severity === 'high' && r.status === 'active');
    if (highRisks.length > 0) {
      suggestions.push({
        type: 'risk',
        priority: 'high',
        title: 'Riscos críticos',
        description: `${highRisks.length} risco(s) de alta severidade identificado(s) sem mitigação.`,
        action: 'Mitigar riscos'
      });
    }

    // Análise de documentação
    if (docs.rows.length < 5) {
      suggestions.push({
        type: 'document',
        priority: 'low',
        title: 'Documentação insuficiente',
        description: 'O projeto possui pouca documentação. Isso pode dificultar auditorias.',
        action: 'Adicionar documentos'
      });
    }

    // Análise de prazos
    const overdueTasks = tasks.rows.filter(t => {
      if (!t.due_date || t.kanban_column === 'completed') return false;
      return new Date(t.due_date) < new Date();
    });

    if (overdueTasks.length > 0) {
      suggestions.push({
        type: 'deadline',
        priority: 'high',
        title: 'Prazos vencidos',
        description: `${overdueTasks.length} tarefa(s) com prazo vencido.`,
        action: 'Revisar prazos'
      });
    }

    res.json({
      projectId,
      suggestions: suggestions.sort((a, b) => {
        const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
        return order[a.priority] - order[b.priority];
      }),
      total: suggestions.length,
      geradoEm: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Falha ao gerar sugestões' });
  }
});

// Health check do projeto
router.get('/health/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;

    const [project, tasks, payments, risks, docs] = await Promise.all([
      pool.query(`SELECT * FROM projects WHERE id = $1`, [projectId]),
      pool.query(`SELECT kanban_column, priority FROM tasks WHERE project_id = $1`, [projectId]),
      pool.query(`SELECT status, amount FROM payments WHERE project_id = $1`, [projectId]),
      pool.query(`SELECT severity, status FROM risks WHERE project_id = $1`, [projectId]),
      pool.query(`SELECT COUNT(*) as count FROM documents WHERE project_id = $1`, [projectId])
    ]);

    if (!project.rows[0]) {
      return res.status(404).json({ error: 'Projeto não encontrado' });
    }

    // Calcular métricas
    const metrics = {
      tarefas: {
        total: tasks.rows.length,
        concluidas: tasks.rows.filter(t => t.kanban_column === 'completed').length,
        emAndamento: tasks.rows.filter(t => t.kanban_column === 'in_progress').length,
        atrasadas: tasks.rows.filter(t => t.priority === 'high' && t.kanban_column === 'new').length
      },
      financeiro: {
        total: payments.rows.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0),
        pago: payments.rows.filter(p => p.status === 'paid').reduce((sum, p) => sum + parseFloat(p.amount || 0), 0),
        pendente: payments.rows.filter(p => p.status === 'pending').reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
      },
      riscos: {
        total: risks.rows.length,
        ativos: risks.rows.filter(r => r.status === 'active').length,
        altos: risks.rows.filter(r => r.severity === 'high' && r.status === 'active').length
      },
      documentos: parseInt(docs.rows[0]?.count || 0)
    };

    // Calcular score de saúde (0-100)
    let healthScore = 100;

    // Penalizar por tarefas atrasadas
    healthScore -= metrics.tarefas.atrasadas * 5;

    // Penalizar por riscos altos
    healthScore -= metrics.riscos.altos * 10;

    // Penalizar por pagamentos pendentes
    const pendingPercent = metrics.financeiro.total > 0 
      ? (metrics.financeiro.pendente / metrics.financeiro.total) * 100 
      : 0;
    if (pendingPercent > 30) healthScore -= 15;

    // Penalizar por falta de documentação
    if (metrics.documentos < 3) healthScore -= 10;

    healthScore = Math.max(0, Math.min(100, healthScore));

    // Determinar status
    let status = 'healthy';
    if (healthScore < 50) status = 'critical';
    else if (healthScore < 75) status = 'warning';

    res.json({
      projectId,
      projectName: project.rows[0].name,
      status,
      healthScore,
      metrics,
      recomendacoes: status !== 'healthy' ? [
        healthScore < 50 ? 'Ação imediata necessária' : 'Atenção requerida',
        metrics.riscos.altos > 0 ? 'Mitigar riscos de alta severidade' : null,
        metrics.tarefas.atrasadas > 0 ? 'Alocar tarefas pendentes' : null,
        pendingPercent > 30 ? 'Regularizar pagamentos pendentes' : null
      ].filter(Boolean) : [],
      verificadoEm: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Falha ao verificar saúde' });
  }
});

export default router;
