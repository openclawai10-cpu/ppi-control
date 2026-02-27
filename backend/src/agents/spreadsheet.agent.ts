import { v4 as uuidv4 } from 'uuid';
import { AgentOrchestrator, AgentMessage } from './orchestrator';

export class SpreadsheetAgent {
  private orchestrator: AgentOrchestrator;
  private name = 'spreadsheet';

  constructor(orchestrator: AgentOrchestrator) {
    this.orchestrator = orchestrator;
  }

  async handleMessage(message: AgentMessage): Promise<any> {
    switch (message.action) {
      case 'spreadsheet:import':
        return await this.importSpreadsheet(message.payload);
      case 'spreadsheet:parse':
        return await this.parseSpreadsheet(message.payload);
      case 'spreadsheet:deliver':
        return await this.deliverToDatabase(message.payload);
      default:
        return { error: 'Unknown action' };
    }
  }

  private async importSpreadsheet(data: any): Promise<any> {
    // Parse spreadsheet data (CSV, XLSX, etc.)
    const rows = data.content.split('\n').map((row: string) => row.split(','));

    const headers = rows[0];
    const records = rows.slice(1).map((row: string[]) => {
      const record: any = {};
      headers.forEach((header: string, index: number) => {
        record[header.trim()] = row[index]?.trim() || '';
      });
      return record;
    });

    await this.orchestrator.logToFeed({
      id: uuidv4(),
      projectId: data.projectId,
      agent: this.name,
      category: 'spreadsheet',
      action: `Planilha importada: ${records.length} registros`,
      details: { headers, recordCount: records.length }
    });

    return { headers, records, count: records.length };
  }

  private async parseSpreadsheet(data: any): Promise<any> {
    const { content, format } = data;

    let parsed: any[] = [];

    if (format === 'csv') {
      const rows = content.split('\n');
      const headers = rows[0].split(',');
      parsed = rows.slice(1).map(row => {
        const values = row.split(',');
        const obj: any = {};
        headers.forEach((h: string, i: number) => {
          obj[h.trim()] = values[i]?.trim();
        });
        return obj;
      });
    }

    return { parsed, format };
  }

  async deliverToDatabase(data: any): Promise<any> {
    // Route to database agent
    const results = [];

    for (const record of data.records) {
      const result = await this.orchestrator.routeMessage({
        id: uuidv4(),
        from: this.name,
        to: 'database',
        action: 'data:store',
        payload: {
          projectId: data.projectId,
          name: record.name || record.id || 'record',
          type: 'spreadsheet_row',
          category: data.category || 'spreadsheet',
          content: JSON.stringify(record),
          metadata: { source: data.source }
        },
        timestamp: new Date()
      });
      results.push(result);
    }

    await this.orchestrator.logToFeed({
      id: uuidv4(),
      projectId: data.projectId,
      agent: this.name,
      category: 'spreadsheet',
      action: `${results.length} registros entregues ao banco de dados`,
      details: { count: results.length }
    });

    return { delivered: results.length, results };
  }
}
