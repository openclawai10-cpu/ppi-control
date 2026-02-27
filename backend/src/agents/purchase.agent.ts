import { v4 as uuidv4 } from 'uuid';
import { AgentOrchestrator, AgentMessage } from './orchestrator';
import { pool } from '../db/init';

export interface Quotation {
  supplier: string;
  price: number;
  deadline: string;
  notes?: string;
}

export class PurchaseAgent {
  private orchestrator: AgentOrchestrator;
  private name = 'purchase';

  constructor(orchestrator: AgentOrchestrator) {
    this.orchestrator = orchestrator;
  }

  async handleMessage(message: AgentMessage): Promise<any> {
    switch (message.action) {
      case 'purchase:create':
        return await this.createPurchase(message.payload);
      case 'purchase:addQuotation':
        return await this.addQuotation(message.payload);
      case 'purchase:compare':
        return await this.compareQuotations(message.payload);
      case 'purchase:select':
        return await this.selectQuotation(message.payload);
      case 'purchase:dashboard':
        return await this.getDashboard(message.payload);
      default:
        return { error: 'Unknown action' };
    }
  }

  private async createPurchase(data: any): Promise<any> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        INSERT INTO purchases (id, project_id, task_id, item, description, status, quotations, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        uuidv4(),
        data.projectId,
        data.taskId,
        data.item,
        data.description || '',
        'pending_quotations',
        JSON.stringify([]),
        new Date()
      ]);

      const purchase = result.rows[0];

      await this.orchestrator.logToFeed({
        id: uuidv4(),
        projectId: data.projectId,
        taskId: data.taskId,
        agent: this.name,
        category: 'purchase',
        action: `Compra criada: ${data.item}`,
        details: { purchase }
      });

      return purchase;
    } finally {
      client.release();
    }
  }

  private async addQuotation(data: any): Promise<any> {
    const client = await pool.connect();
    try {
      // Get current purchase
      const current = await client.query(`
        SELECT * FROM purchases WHERE id = $1
      `, [data.purchaseId]);

      const purchase = current.rows[0];
      if (!purchase) {
        return { error: 'Purchase not found' };
      }

      const quotations: Quotation[] = JSON.parse(purchase.quotations || '[]');
      quotations.push({
        supplier: data.supplier,
        price: data.price,
        deadline: data.deadline,
        notes: data.notes
      });

      const status = quotations.length >= 3 ? 'ready_for_comparison' : 'pending_quotations';

      const result = await client.query(`
        UPDATE purchases
        SET quotations = $1, status = $2, updated_at = $3
        WHERE id = $4
        RETURNING *
      `, [JSON.stringify(quotations), status, new Date(), data.purchaseId]);

      const updated = result.rows[0];

      await this.orchestrator.logToFeed({
        id: uuidv4(),
        projectId: updated.project_id,
        agent: this.name,
        category: 'purchase',
        action: `Cotação adicionada: ${data.supplier} - R$ ${data.price}`,
        details: { purchase: updated, quotationCount: quotations.length }
      });

      return updated;
    } finally {
      client.release();
    }
  }

  async compareQuotations(purchaseId: string): Promise<any> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT * FROM purchases WHERE id = $1
      `, [purchaseId]);

      const purchase = result.rows[0];
      if (!purchase) {
        return { error: 'Purchase not found' };
      }

      const quotations: Quotation[] = JSON.parse(purchase.quotations || '[]');

      if (quotations.length < 3) {
        return {
          error: 'Need at least 3 quotations for comparison',
          currentCount: quotations.length
        };
      }

      // Sort by price
      const sorted = [...quotations].sort((a, b) => a.price - b.price);
      const cheapest = sorted[0];
      const mostExpensive = sorted[sorted.length - 1];
      const average = quotations.reduce((sum, q) => sum + q.price, 0) / quotations.length;

      const comparison = {
        quotations,
        sorted,
        cheapest,
        mostExpensive,
        average,
        savings: mostExpensive.price - cheapest.price,
        savingsPercent: ((mostExpensive.price - cheapest.price) / mostExpensive.price * 100).toFixed(2)
      };

      await this.orchestrator.logToFeed({
        id: uuidv4(),
        projectId: purchase.project_id,
        agent: this.name,
        category: 'purchase',
        action: `Cotações comparadas: ${quotations.length} opções`,
        details: comparison
      });

      return comparison;
    } finally {
      client.release();
    }
  }

  private async selectQuotation(data: any): Promise<any> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT * FROM purchases WHERE id = $1
      `, [data.purchaseId]);

      const purchase = result.rows[0];
      const quotations: Quotation[] = JSON.parse(purchase.quotations || '[]');
      const selected = quotations[data.quotationIndex];

      if (!selected) {
        return { error: 'Invalid quotation index' };
      }

      const updateResult = await client.query(`
        UPDATE purchases
        SET selected_quotation = $1, status = 'selected', updated_at = $2
        WHERE id = $3
        RETURNING *
      `, [data.quotationIndex, new Date(), data.purchaseId]);

      const updated = updateResult.rows[0];

      await this.orchestrator.logToFeed({
        id: uuidv4(),
        projectId: updated.project_id,
        agent: this.name,
        category: 'purchase',
        action: `Cotação selecionada: ${selected.supplier} - R$ ${selected.price}`,
        details: { purchase: updated, selectedQuotation: selected }
      });

      return { purchase: updated, selected };
    } finally {
      client.release();
    }
  }

  async getDashboard(projectId?: string): Promise<any> {
    const client = await pool.connect();
    try {
      let query = `
        SELECT p.*,
          COUNT(CASE WHEN status = 'pending_quotations' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'ready_for_comparison' THEN 1 END) as ready,
          COUNT(CASE WHEN status = 'selected' THEN 1 END) as selected,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
        FROM purchases p
      `;

      if (projectId) {
        query += ' WHERE p.project_id = $1';
      }

      query += ' GROUP BY p.id ORDER BY p.created_at DESC';

      const result = projectId
        ? await client.query(query, [projectId])
        : await client.query(query);

      const stats = {
        total: result.rows.length,
        byStatus: {
          pending: result.rows.filter(r => r.status === 'pending_quotations').length,
          ready: result.rows.filter(r => r.status === 'ready_for_comparison').length,
          selected: result.rows.filter(r => r.status === 'selected').length,
          completed: result.rows.filter(r => r.status === 'completed').length
        },
        purchases: result.rows
      };

      return stats;
    } finally {
      client.release();
    }
  }
}
