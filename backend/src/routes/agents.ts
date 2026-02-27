import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// List available agents
router.get('/', (req, res) => {
  const agents = [
    { id: 'leader', name: 'Líder', description: 'Coordena sistema, cronjobs, relatórios' },
    { id: 'financial', name: 'Financeiro', description: 'Monitora riscos, glosas, prazos' },
    { id: 'compliance', name: 'Compliance', description: 'Analisa documentos, monitora conformidade' },
    { id: 'messenger', name: 'Mensageiro', description: 'Registra logs, envia notificações' },
    { id: 'database', name: 'Banco de Dados', description: 'Gere, categoriza, recebe feed diário' },
    { id: 'spreadsheet', name: 'Planilhas', description: 'Entrega planilhas ao banco de dados' },
    { id: 'dailyfeed', name: 'Feed Diário', description: 'Coleta e envia dados ao final do dia' },
    { id: 'purchase', name: 'Compras', description: 'Realiza 3 cotações, gera dashboard' },
    { id: 'summary', name: 'Resumo', description: 'Gera dashboards e resumos por área' }
  ];

  res.json(agents);
});

// Send action to agent
router.post('/:agentId/action', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { action, payload } = req.body;

    const orchestrator = req.app.get('orchestrator');

    if (!orchestrator) {
      return res.status(500).json({ error: 'Orchestrator not initialized' });
    }

    const result = await orchestrator.routeMessage({
      id: uuidv4(),
      from: 'user',
      to: agentId,
      action: action,
      payload: payload,
      timestamp: new Date()
    });

    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to route message to agent' });
  }
});

export default router;
