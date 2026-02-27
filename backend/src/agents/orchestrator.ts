import { Server as SocketIOServer } from 'socket.io';
import cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db/init';

import { LeaderAgent } from './leader.agent';
import { FinancialAgent } from './financial.agent';
import { ComplianceAgent } from './compliance.agent';
import { MessengerAgent } from './messenger.agent';
import { DatabaseAgent } from './database.agent';
import { SpreadsheetAgent } from './spreadsheet.agent';
import { DailyFeedAgent } from './dailyfeed.agent';
import { PurchaseAgent } from './purchase.agent';
import { SummaryAgent } from './summary.agent';

export interface AgentMessage {
  id: string;
  from: string;
  to: string;
  action: string;
  payload: any;
  timestamp: Date;
}

export interface FeedEntry {
  id: string;
  projectId?: string;
  taskId?: string;
  agent: string;
  category: string;
  action: string;
  details?: any;
}

export class AgentOrchestrator {
  private io: SocketIOServer;
  private agents: Map<string, any> = new Map();
  private messageQueue: AgentMessage[] = [];

  constructor(io: SocketIOServer) {
    this.io = io;
    this.initAgents();
  }

  private initAgents(): void {
    const leader = new LeaderAgent(this);
    this.agents.set('leader', leader);
    this.agents.set('financial', new FinancialAgent(this));
    this.agents.set('compliance', new ComplianceAgent(this));
    this.agents.set('messenger', new MessengerAgent(this));
    this.agents.set('database', new DatabaseAgent(this));
    this.agents.set('spreadsheet', new SpreadsheetAgent(this));
    this.agents.set('dailyfeed', new DailyFeedAgent(this));
    this.agents.set('purchase', new PurchaseAgent(this));
    this.agents.set('summary', new SummaryAgent(this));
  }

  async start(): Promise<void> {
    // Start leader agent cronjobs
    const leader = this.agents.get('leader');
    if (leader) {
      await leader.startCronjobs();
    }

    // Socket.io connection handling
    this.io.on('connection', (socket) => {
      console.log('📡 Client connected');

      socket.on('task:create', async (data) => {
        await this.routeMessage({
          id: uuidv4(),
          from: 'user',
          to: 'leader',
          action: 'task:create',
          payload: data,
          timestamp: new Date()
        });
      });

      socket.on('task:move', async (data) => {
        await this.routeMessage({
          id: uuidv4(),
          from: 'user',
          to: 'leader',
          action: 'task:move',
          payload: data,
          timestamp: new Date()
        });
      });

      socket.on('disconnect', () => {
        console.log('📡 Client disconnected');
      });
    });
  }

  async routeMessage(message: AgentMessage): Promise<any> {
    const agent = this.agents.get(message.to);
    if (!agent) {
      console.error(`Agent not found: ${message.to}`);
      return null;
    }

    const result = await agent.handleMessage(message);
    return result;
  }

  async logToFeed(entry: FeedEntry): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query(`
        INSERT INTO feed_logs (id, project_id, task_id, agent, category, action, details, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        uuidv4(),
        entry.projectId || null,
        entry.taskId || null,
        entry.agent,
        entry.category,
        entry.action,
        JSON.stringify(entry.details || {}),
        new Date()
      ]);

      // Emit to connected clients
      this.io.emit('feed:new', entry);
    } finally {
      client.release();
    }
  }

  broadcast(event: string, data: any): void {
    this.io.emit(event, data);
  }

  getAgent(name: string): any {
    return this.agents.get(name);
  }
}
