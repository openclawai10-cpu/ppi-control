import { Router } from 'express';
import { pool } from '../db/init';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Configuração do webhook do Teams
interface TeamsConfig {
  webhookUrl: string;
  enabled: boolean;
  project_id?: string;
}

// Enviar notificação para Teams
async function sendTeamsNotification(webhookUrl: string, message: {
  title: string;
  text: string;
  themeColor?: string;
  sections?: any[];
}) {
  if (!webhookUrl) return false;

  const card = {
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    "themeColor": message.themeColor || "0076D7",
    "summary": message.title,
    "sections": [{
      "activityTitle": message.title,
      "text": message.text,
      ...(message.sections && { "sections": message.sections })
    }]
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(card)
    });
    return response.ok;
  } catch (error) {
    console.error('Teams notification failed:', error);
    return false;
  }
}

// Configurar webhook do Teams
router.post('/config', async (req, res) => {
  try {
    const { projectId, webhookUrl, enabled } = req.body;

    // Salvar configuração (em produção, usar tabela própria)
    // Por ora, retornamos sucesso

    res.json({ 
      success: true, 
      message: 'Configuração salva com sucesso',
      config: { projectId, webhookUrl, enabled }
    });
  } catch (error) {
    res.status(500).json({ error: 'Falha ao salvar configuração' });
  }
});

// Enviar alerta de tarefa
router.post('/alert/task', async (req, res) => {
  try {
    const { webhookUrl, task, project } = req.body;

    const sent = await sendTeamsNotification(webhookUrl, {
      title: `📋 Nova Tarefa: ${task.title}`,
      text: `**Projeto:** ${project.name}\n**Prioridade:** ${task.priority}\n**Prazo:** ${task.dueDate || 'Não definido'}`,
      themeColor: task.priority === 'high' ? 'FF0000' : '0076D7'
    });

    res.json({ success: sent });
  } catch (error) {
    res.status(500).json({ error: 'Falha ao enviar notificação' });
  }
});

// Enviar alerta de risco
router.post('/alert/risk', async (req, res) => {
  try {
    const { webhookUrl, risk, project } = req.body;

    const severityColors: Record<string, string> = {
      high: 'FF0000',
      medium: 'FFA500',
      low: '00FF00'
    };

    const sent = await sendTeamsNotification(webhookUrl, {
      title: `⚠️ Risco Identificado`,
      text: `**Projeto:** ${project.name}\n**Severidade:** ${risk.severity}\n**Descrição:** ${risk.description}`,
      themeColor: severityColors[risk.severity] || '0076D7'
    });

    res.json({ success: sent });
  } catch (error) {
    res.status(500).json({ error: 'Falha ao enviar alerta' });
  }
});

// Enviar resumo diário
router.post('/daily-summary', async (req, res) => {
  try {
    const { webhookUrl, projectId } = req.body;

    // Buscar dados do dia
    const today = new Date().toISOString().split('T')[0];

    const [tasks, payments, risks] = await Promise.all([
      pool.query(`
        SELECT COUNT(*) as count FROM tasks 
        WHERE project_id = $1 AND DATE(created_at) = $2
      `, [projectId, today]),
      pool.query(`
        SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total 
        FROM payments WHERE project_id = $1 AND DATE(created_at) = $2
      `, [projectId, today]),
      pool.query(`
        SELECT COUNT(*) as count FROM risks 
        WHERE project_id = $1 AND DATE(identified_at) = $2
      `, [projectId, today])
    ]);

    const project = await pool.query('SELECT name FROM projects WHERE id = $1', [projectId]);

    const sent = await sendTeamsNotification(webhookUrl, {
      title: `📊 Resumo Diário - ${project.rows[0]?.name || 'Projeto'}`,
      text: `
**📅 Data:** ${today}

**📋 Tarefas criadas:** ${tasks.rows[0]?.count || 0}
**💰 Pagamentos processados:** ${payments.rows[0]?.count || 0} (R$ ${payments.rows[0]?.total || 0})
**⚠️ Riscos identificados:** ${risks.rows[0]?.count || 0}
      `.trim(),
      themeColor: '0076D7'
    });

    res.json({ success: sent });
  } catch (error) {
    res.status(500).json({ error: 'Falha ao enviar resumo' });
  }
});

// Enviar alerta de prazo próximo
router.post('/alert/deadline', async (req, res) => {
  try {
    const { webhookUrl, tasks, project } = req.body;

    const taskList = tasks.map((t: any) => 
      `• **${t.title}** - Vence em ${t.due_date}`
    ).join('\n');

    const sent = await sendTeamsNotification(webhookUrl, {
      title: `⏰ Alerta de Prazos Próximos`,
      text: `**Projeto:** ${project.name}\n\n**Tarefas com prazo próximo:**\n${taskList}`,
      themeColor: 'FFA500'
    });

    res.json({ success: sent });
  } catch (error) {
    res.status(500).json({ error: 'Falha ao enviar alerta' });
  }
});

export default router;
