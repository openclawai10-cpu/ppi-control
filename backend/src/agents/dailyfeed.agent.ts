import cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';
import { AgentOrchestrator, AgentMessage } from './orchestrator';
import { pool } from '../db/init';

export class DailyFeedAgent {
  private orchestrator: AgentOrchestrator;
  private name = 'dailyfeed';
  private dailyData: any[] = [];

  constructor(orchestrator: AgentOrchestrator) {
    this.orchestrator = orchestrator;
    this.initCronjob();
  }

  private initCronjob(): void {
    // Collect data and send to database at end of day (23:00)
    cron.schedule('0 23 * * *', async () => {
      await this.sendDailyData();
    });
  }

  async handleMessage(message: AgentMessage): Promise<any> {
    switch (message.action) {
      case 'feed:collect':
        return await this.collectData(message.payload);
      case 'feed:send':
        return await this.sendDailyData();
      case 'feed:get':
        return await this.getDailySummary();
      default:
        return { error: 'Unknown action' };
    }
  }

  private async collectData(data: any): Promise<any> {
    this.dailyData.push({
      ...data,
      collectedAt: new Date()
    });

    await this.orchestrator.logToFeed({
      id: uuidv4(),
      projectId: data.projectId,
      agent: this.name,
      category: 'feed',
      action: `Dado coletado: ${data.type || 'item'}`,
      details: data
    });

    return { collected: true, dailyTotal: this.dailyData.length };
  }

  async sendDailyData(): Promise<any> {
    if (this.dailyData.length === 0) {
      return { sent: false, message: 'No data to send' };
    }

    const dataToSend = [...this.dailyData];
    const groupedData = this.groupByProject(dataToSend);

    const results = [];

    for (const [projectId, items] of Object.entries(groupedData)) {
      const result = await this.orchestrator.routeMessage({
        id: uuidv4(),
        from: this.name,
        to: 'database',
        action: 'data:store',
        payload: {
          projectId: projectId === 'undefined' ? null : projectId,
          name: `daily_feed_${new Date().toISOString().split('T')[0]}`,
          type: 'daily_feed',
          category: 'feed',
          content: JSON.stringify(items),
          metadata: {
            date: new Date().toISOString().split('T')[0],
            itemCount: (items as any[]).length
          }
        },
        timestamp: new Date()
      });
      results.push(result);
    }

    await this.orchestrator.logToFeed({
      id: uuidv4(),
      agent: this.name,
      category: 'feed',
      action: `Feed diário enviado: ${dataToSend.length} itens`,
      details: { count: dataToSend.length, projects: Object.keys(groupedData) }
    });

    // Clear daily data
    this.dailyData = [];

    return { sent: true, count: dataToSend.length, results };
  }

  async getDailySummary(): Promise<any> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT * FROM feed_logs
        WHERE created_at::date = CURRENT_DATE
        ORDER BY created_at DESC
      `);

      const summary = {
        date: new Date().toISOString().split('T')[0],
        totalActivities: result.rows.length,
        byAgent: this.groupBy(result.rows, 'agent'),
        byCategory: this.groupBy(result.rows, 'category')
      };

      return summary;
    } finally {
      client.release();
    }
  }

  private groupByProject(data: any[]): Record<string, any[]> {
    return data.reduce((acc, item) => {
      const key = item.projectId || 'general';
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {} as Record<string, any[]>);
  }

  private groupBy(data: any[], key: string): Record<string, number> {
    return data.reduce((acc, item) => {
      const value = item[key] || 'unknown';
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
}
