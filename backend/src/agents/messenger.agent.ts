import { v4 as uuidv4 } from 'uuid';
import { AgentOrchestrator, AgentMessage } from './orchestrator';
import { pool } from '../db/init';

export class MessengerAgent {
  private orchestrator: AgentOrchestrator;
  private name = 'messenger';

  constructor(orchestrator: AgentOrchestrator) {
    this.orchestrator = orchestrator;
  }

  async handleMessage(message: AgentMessage): Promise<any> {
    switch (message.action) {
      case 'notify':
        return await this.sendNotification(message.payload);
      case 'alert':
        return await this.sendAlert(message.payload);
      case 'log':
        return await this.logMessage(message.payload);
      case 'channel:send':
        return await this.sendToChannel(message.payload);
      default:
        return { error: 'Unknown action' };
    }
  }

  private async sendNotification(data: any): Promise<any> {
    const notification = {
      id: uuidv4(),
      type: data.type,
      timestamp: new Date(),
      data: data
    };

    // Broadcast to connected clients
    this.orchestrator.broadcast('notification', notification);

    await this.orchestrator.logToFeed({
      id: uuidv4(),
      projectId: data.projectId,
      taskId: data.taskId,
      agent: this.name,
      category: 'notification',
      action: `Notificação enviada: ${data.type}`,
      details: notification
    });

    return notification;
  }

  private async sendAlert(data: any): Promise<any> {
    const alert = {
      id: uuidv4(),
      type: data.type,
      severity: data.type.includes('deadline') ? 'warning' : 'error',
      timestamp: new Date(),
      data: data
    };

    // Broadcast alert
    this.orchestrator.broadcast('alert', alert);

    await this.orchestrator.logToFeed({
      id: uuidv4(),
      projectId: data.projectId || data.task?.project_id,
      agent: this.name,
      category: 'alert',
      action: `Alerta: ${data.type}`,
      details: alert
    });

    return alert;
  }

  private async logMessage(data: any): Promise<any> {
    const client = await pool.connect();
    try {
      await client.query(`
        INSERT INTO channel_messages (id, project_id, channel, direction, content, metadata, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        uuidv4(),
        data.projectId,
        data.channel || 'system',
        data.direction || 'internal',
        data.content,
        JSON.stringify(data.metadata || {}),
        new Date()
      ]);

      return { logged: true };
    } finally {
      client.release();
    }
  }

  private async sendToChannel(data: any): Promise<any> {
    // This would integrate with external APIs (Slack, Discord, Email, etc.)
    const message = {
      id: uuidv4(),
      channel: data.channel,
      content: data.content,
      sentAt: new Date()
    };

    await this.orchestrator.logToFeed({
      id: uuidv4(),
      projectId: data.projectId,
      agent: this.name,
      category: 'channel',
      action: `Mensagem enviada para ${data.channel}`,
      details: message
    });

    return message;
  }
}
