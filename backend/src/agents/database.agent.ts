import { v4 as uuidv4 } from 'uuid';
import { AgentOrchestrator, AgentMessage } from './orchestrator';
import { pool } from '../db/init';

export class DatabaseAgent {
  private orchestrator: AgentOrchestrator;
  private name = 'database';

  constructor(orchestrator: AgentOrchestrator) {
    this.orchestrator = orchestrator;
  }

  async handleMessage(message: AgentMessage): Promise<any> {
    switch (message.action) {
      case 'data:store':
        return await this.storeData(message.payload);
      case 'data:query':
        return await this.queryData(message.payload);
      case 'data:update':
        return await this.updateData(message.payload);
      case 'data:categorize':
        return await this.categorizeData(message.payload);
      case 'data:export':
        return await this.exportData(message.payload);
      default:
        return { error: 'Unknown action' };
    }
  }

  private async storeData(data: any): Promise<any> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        INSERT INTO documents (id, project_id, name, type, category, content, metadata, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        uuidv4(),
        data.projectId,
        data.name,
        data.type || 'document',
        data.category || 'general',
        data.content,
        JSON.stringify(data.metadata || {}),
        new Date()
      ]);

      const doc = result.rows[0];

      await this.orchestrator.logToFeed({
        id: uuidv4(),
        projectId: data.projectId,
        agent: this.name,
        category: 'database',
        action: `Dados armazenados: ${data.name}`,
        details: { document: doc }
      });

      return doc;
    } finally {
      client.release();
    }
  }

  private async queryData(data: any): Promise<any> {
    const client = await pool.connect();
    try {
      let query = 'SELECT * FROM documents WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (data.projectId) {
        query += ` AND project_id = $${paramIndex++}`;
        params.push(data.projectId);
      }
      if (data.category) {
        query += ` AND category = $${paramIndex++}`;
        params.push(data.category);
      }
      if (data.type) {
        query += ` AND type = $${paramIndex++}`;
        params.push(data.type);
      }

      query += ' ORDER BY created_at DESC';

      if (data.limit) {
        query += ` LIMIT $${paramIndex++}`;
        params.push(data.limit);
      }

      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  private async updateData(data: any): Promise<any> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        UPDATE documents
        SET content = $1, metadata = $2, updated_at = $3
        WHERE id = $4
        RETURNING *
      `, [
        data.content,
        JSON.stringify(data.metadata || {}),
        new Date(),
        data.documentId
      ]);

      const doc = result.rows[0];

      await this.orchestrator.logToFeed({
        id: uuidv4(),
        projectId: doc.project_id,
        agent: this.name,
        category: 'database',
        action: `Dados atualizados: ${doc.name}`,
        details: { document: doc }
      });

      return doc;
    } finally {
      client.release();
    }
  }

  private async categorizeData(data: any): Promise<any> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        UPDATE documents
        SET category = $1, updated_at = $2
        WHERE id = $3
        RETURNING *
      `, [data.category, new Date(), data.documentId]);

      const doc = result.rows[0];

      await this.orchestrator.logToFeed({
        id: uuidv4(),
        projectId: doc.project_id,
        agent: this.name,
        category: 'database',
        action: `Documento categorizado como: ${data.category}`,
        details: { document: doc }
      });

      return doc;
    } finally {
      client.release();
    }
  }

  private async exportData(data: any): Promise<any> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT * FROM documents WHERE project_id = $1
      `, [data.projectId]);

      const exportData = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        type: row.type,
        category: row.category,
        content: row.content,
        createdAt: row.created_at
      }));

      await this.orchestrator.logToFeed({
        id: uuidv4(),
        projectId: data.projectId,
        agent: this.name,
        category: 'database',
        action: `Dados exportados: ${exportData.length} documentos`,
        details: { count: exportData.length }
      });

      return exportData;
    } finally {
      client.release();
    }
  }
}
