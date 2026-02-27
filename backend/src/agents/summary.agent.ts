import { v4 as uuidv4 } from 'uuid';
import { AgentOrchestrator, AgentMessage } from './orchestrator';
import { pool } from '../db/init';

export class SummaryAgent {
  private orchestrator: AgentOrchestrator;
  private name = 'summary';

  constructor(orchestrator: AgentOrchestrator) {
    this.orchestrator = orchestrator;
  }

  async handleMessage(message: AgentMessage): Promise<any> {
    switch (message.action) {
      case 'summary:project':
        return await this.getProjectSummary(message.payload);
      case 'summary:financial':
        return await this.getFinancialSummary(message.payload);
      case 'summary:tasks':
        return await this.getTasksSummary(message.payload);
      case 'summary:risks':
        return await this.getRisksSummary(message.payload);
      case 'dashboard:generate':
        return await this.generateDashboard(message.payload);
      default:
        return { error: 'Unknown action' };
    }
  }

  async getProjectSummary(projectId: string): Promise<any> {
    const client = await pool.connect();
    try {
      const project = await client.query(`
        SELECT * FROM projects WHERE id = $1
      `, [projectId]);

      const tasks = await client.query(`
        SELECT kanban_column, COUNT(*) as count FROM tasks WHERE project_id = $1 GROUP BY kanban_column
      `, [projectId]);

      const payments = await client.query(`
        SELECT status, COUNT(*) as count, SUM(amount) as total
        FROM payments WHERE project_id = $1 GROUP BY status
      `, [projectId]);

      const documents = await client.query(`
        SELECT category, COUNT(*) as count FROM documents WHERE project_id = $1 GROUP BY category
      `, [projectId]);

      const risks = await client.query(`
        SELECT severity, COUNT(*) as count FROM risks WHERE project_id = $1 GROUP BY severity
      `, [projectId]);

      const summary = {
        project: project.rows[0],
        tasks: {
          byColumn: tasks.rows,
          total: tasks.rows.reduce((sum: number, r: any) => sum + parseInt(r.count), 0)
        },
        financial: {
          byStatus: payments.rows,
          totalPaid: payments.rows
            .filter((r: any) => r.status === 'paid')
            .reduce((sum: number, r: any) => sum + parseFloat(r.total || 0), 0),
          totalPending: payments.rows
            .filter((r: any) => r.status === 'pending')
            .reduce((sum: number, r: any) => sum + parseFloat(r.total || 0), 0)
        },
        documents: {
          byCategory: documents.rows,
          total: documents.rows.reduce((sum: number, r: any) => sum + parseInt(r.count), 0)
        },
        risks: {
          bySeverity: risks.rows,
          total: risks.rows.reduce((sum: number, r: any) => sum + parseInt(r.count), 0)
        }
      };

      await this.orchestrator.logToFeed({
        id: uuidv4(),
        projectId: projectId,
        agent: this.name,
        category: 'summary',
        action: 'Resumo do projeto gerado',
        details: { summary }
      });

      return summary;
    } finally {
      client.release();
    }
  }

  async getFinancialSummary(projectId?: string): Promise<any> {
    const client = await pool.connect();
    try {
      let query = `
        SELECT
          COUNT(*) as total_payments,
          SUM(amount) as total_amount,
          AVG(amount) as average_amount,
          COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
          SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as paid_amount,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
          SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_amount
        FROM payments
      `;

      if (projectId) {
        query += ' WHERE project_id = $1';
      }

      const result = projectId
        ? await client.query(query, [projectId])
        : await client.query(query);

      const summary = result.rows[0];

      return {
        total: {
          count: parseInt(summary.total_payments || 0),
          amount: parseFloat(summary.total_amount || 0),
          average: parseFloat(summary.average_amount || 0)
        },
        paid: {
          count: parseInt(summary.paid_count || 0),
          amount: parseFloat(summary.paid_amount || 0)
        },
        pending: {
          count: parseInt(summary.pending_count || 0),
          amount: parseFloat(summary.pending_amount || 0)
        }
      };
    } finally {
      client.release();
    }
  }

  async getTasksSummary(projectId?: string): Promise<any> {
    const client = await pool.connect();
    try {
      let query = `
        SELECT kanban_column, priority, COUNT(*) as count
        FROM tasks
      `;

      if (projectId) {
        query += ' WHERE project_id = $1';
      }

      query += ' GROUP BY kanban_column, priority ORDER BY kanban_column, priority';

      const result = projectId
        ? await client.query(query, [projectId])
        : await client.query(query);

      const byColumn: Record<string, number> = {};
      const byPriority: Record<string, number> = { low: 0, medium: 0, high: 0 };

      for (const row of result.rows) {
        byColumn[row.kanban_column] = (byColumn[row.kanban_column] || 0) + parseInt(row.count);
        byPriority[row.priority] = (byPriority[row.priority] || 0) + parseInt(row.count);
      }

      return {
        byColumn,
        byPriority,
        total: Object.values(byColumn).reduce((sum, v) => sum + v, 0),
        details: result.rows
      };
    } finally {
      client.release();
    }
  }

  async getRisksSummary(projectId?: string): Promise<any> {
    const client = await pool.connect();
    try {
      let query = `
        SELECT severity, status, COUNT(*) as count
        FROM risks
      `;

      if (projectId) {
        query += ' WHERE project_id = $1';
      }

      query += ' GROUP BY severity, status ORDER BY severity, status';

      const result = projectId
        ? await client.query(query, [projectId])
        : await client.query(query);

      const bySeverity: Record<string, number> = { low: 0, medium: 0, high: 0 };
      const byStatus: Record<string, number> = { active: 0, resolved: 0 };

      for (const row of result.rows) {
        bySeverity[row.severity] = (bySeverity[row.severity] || 0) + parseInt(row.count);
        byStatus[row.status] = (byStatus[row.status] || 0) + parseInt(row.count);
      }

      return {
        bySeverity,
        byStatus,
        total: Object.values(bySeverity).reduce((sum, v) => sum + v, 0),
        details: result.rows
      };
    } finally {
      client.release();
    }
  }

  async generateDashboard(area: string, projectId?: string): Promise<any> {
    let dashboard: any = {};

    switch (area) {
      case 'financial':
        dashboard = await this.getFinancialSummary(projectId);
        break;
      case 'tasks':
        dashboard = await this.getTasksSummary(projectId);
        break;
      case 'risks':
        dashboard = await this.getRisksSummary(projectId);
        break;
      case 'overview':
        if (projectId) {
          dashboard = await this.getProjectSummary(projectId);
        }
        break;
      default:
        dashboard = {
          error: 'Unknown area',
          available: ['financial', 'tasks', 'risks', 'overview']
        };
    }

    await this.orchestrator.logToFeed({
      id: uuidv4(),
      projectId: projectId,
      agent: this.name,
      category: 'dashboard',
      action: `Dashboard gerado: ${area}`,
      details: { area, projectId }
    });

    return dashboard;
  }
}
