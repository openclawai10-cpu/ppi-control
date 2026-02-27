import cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';
import { AgentOrchestrator, AgentMessage } from './orchestrator';
import { pool } from '../db/init';

export class LeaderAgent {
  private orchestrator: AgentOrchestrator;
  private name = 'leader';

  constructor(orchestrator: AgentOrchestrator) {
    this.orchestrator = orchestrator;
  }

  async startCronjobs(): Promise<void> {
    // Daily summary at 18:00
    cron.schedule('0 18 * * *', async () => {
      await this.generateDailyReport();
    });

    // Check deadlines every hour
    cron.schedule('0 * * * *', async () => {
      await this.checkDeadlines();
    });

    // Weekly report on Monday at 09:00
    cron.schedule('0 9 * * 1', async () => {
      await this.generateWeeklyReport();
    });

    await this.orchestrator.logToFeed({
      id: uuidv4(),
      agent: this.name,
      category: 'system',
      action: 'Cronjobs iniciados',
      details: { schedules: ['daily-summary', 'deadline-check', 'weekly-report'] }
    });
  }

  async handleMessage(message: AgentMessage): Promise<any> {
    switch (message.action) {
      case 'task:create':
        return await this.createTask(message.payload);
      case 'task:move':
        return await this.moveTask(message.payload);
      case 'task:assign':
        return await this.assignTask(message.payload);
      case 'report:daily':
        return await this.generateDailyReport();
      case 'report:weekly':
        return await this.generateWeeklyReport();
      default:
        return { error: 'Unknown action' };
    }
  }

  private async createTask(data: any): Promise<any> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        INSERT INTO tasks (id, project_id, title, description, column, priority, due_date, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        uuidv4(),
        data.projectId,
        data.title,
        data.description || '',
        'new',
        data.priority || 'medium',
        data.dueDate || null,
        new Date()
      ]);

      const task = result.rows[0];

      await this.orchestrator.logToFeed({
        id: uuidv4(),
        projectId: data.projectId,
        taskId: task.id,
        agent: this.name,
        category: 'task',
        action: `Tarefa criada: ${data.title}`,
        details: { task }
      });

      // Notify messenger agent
      await this.orchestrator.routeMessage({
        id: uuidv4(),
        from: this.name,
        to: 'messenger',
        action: 'notify',
        payload: {
          type: 'task_created',
          taskId: task.id,
          title: data.title
        },
        timestamp: new Date()
      });

      return task;
    } finally {
      client.release();
    }
  }

  private async moveTask(data: any): Promise<any> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        UPDATE tasks SET column = $1, updated_at = $2 WHERE id = $3
        RETURNING *
      `, [data.column, new Date(), data.taskId]);

      const task = result.rows[0];

      await this.orchestrator.logToFeed({
        id: uuidv4(),
        projectId: task.project_id,
        taskId: task.id,
        agent: this.name,
        category: 'task',
        action: `Tarefa movida para: ${data.column}`,
        details: { task, newColumn: data.column }
      });

      this.orchestrator.broadcast('task:updated', task);

      return task;
    } finally {
      client.release();
    }
  }

  private async assignTask(data: any): Promise<any> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        UPDATE tasks SET assigned_agent = $1, column = 'allocated', updated_at = $2
        WHERE id = $3
        RETURNING *
      `, [data.agent, new Date(), data.taskId]);

      const task = result.rows[0];

      await this.orchestrator.logToFeed({
        id: uuidv4(),
        projectId: task.project_id,
        taskId: task.id,
        agent: this.name,
        category: 'task',
        action: `Tarefa alocada para: ${data.agent}`,
        details: { task, assignedAgent: data.agent }
      });

      // Route task to assigned agent
      await this.orchestrator.routeMessage({
        id: uuidv4(),
        from: this.name,
        to: data.agent,
        action: 'task:assigned',
        payload: { task },
        timestamp: new Date()
      });

      return task;
    } finally {
      client.release();
    }
  }

  private async generateDailyReport(): Promise<any> {
    const client = await pool.connect();
    try {
      // Get today's activity
      const result = await client.query(`
        SELECT * FROM feed_logs
        WHERE created_at::date = CURRENT_DATE
        ORDER BY created_at DESC
      `);

      const tasks = await client.query(`
        SELECT column, COUNT(*) as count FROM tasks
        GROUP BY column
      `);

      const report = {
        date: new Date().toISOString().split('T')[0],
        activities: result.rows,
        taskSummary: tasks.rows,
        generatedBy: this.name
      };

      await this.orchestrator.logToFeed({
        id: uuidv4(),
        agent: this.name,
        category: 'report',
        action: 'Relatório diário gerado',
        details: report
      });

      return report;
    } finally {
      client.release();
    }
  }

  private async generateWeeklyReport(): Promise<any> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT * FROM feed_logs
        WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
        ORDER BY created_at DESC
      `);

      const report = {
        period: 'weekly',
        activities: result.rows,
        generatedBy: this.name,
        generatedAt: new Date()
      };

      await this.orchestrator.logToFeed({
        id: uuidv4(),
        agent: this.name,
        category: 'report',
        action: 'Relatório semanal gerado',
        details: report
      });

      return report;
    } finally {
      client.release();
    }
  }

  private async checkDeadlines(): Promise<void> {
    const client = await pool.connect();
    try {
      // Check for tasks due in next 48 hours
      const result = await client.query(`
        SELECT t.*, p.name as project_name
        FROM tasks t
        LEFT JOIN projects p ON t.project_id = p.id
        WHERE t.due_date IS NOT NULL
        AND t.due_date <= CURRENT_DATE + INTERVAL '48 hours'
        AND t.column NOT IN ('completed', 'done')
      `);

      for (const task of result.rows) {
        await this.orchestrator.routeMessage({
          id: uuidv4(),
          from: this.name,
          to: 'messenger',
          action: 'alert',
          payload: {
            type: 'deadline_warning',
            task: task
          },
          timestamp: new Date()
        });
      }
    } finally {
      client.release();
    }
  }
}
