import { v4 as uuidv4 } from 'uuid';
import { AgentOrchestrator, AgentMessage } from './orchestrator';
import { pool } from '../db/init';

export class FinancialAgent {
  private orchestrator: AgentOrchestrator;
  private name = 'financial';

  constructor(orchestrator: AgentOrchestrator) {
    this.orchestrator = orchestrator;
  }

  async handleMessage(message: AgentMessage): Promise<any> {
    switch (message.action) {
      case 'payment:create':
        return await this.createPayment(message.payload);
      case 'payment:register':
        return await this.registerPayment(message.payload);
      case 'payment:validate':
        return await this.validatePayment(message.payload);
      case 'risk:check':
        return await this.checkRisks(message.payload);
      case 'glosa:detect':
        return await this.detectGlosa(message.payload);
      case 'deadline:check':
        return await this.checkDeadlines(message.payload);
      default:
        return { error: 'Unknown action' };
    }
  }

  private async createPayment(data: any): Promise<any> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        INSERT INTO payments (id, project_id, task_id, beneficiary, amount, status, category, notes, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
        uuidv4(),
        data.projectId,
        data.taskId,
        data.beneficiary,
        data.amount,
        'pending',
        data.category || 'bolsa',
        data.notes || '',
        new Date()
      ]);

      const payment = result.rows[0];

      await this.orchestrator.logToFeed({
        id: uuidv4(),
        projectId: data.projectId,
        taskId: data.taskId,
        agent: this.name,
        category: 'financial',
        action: `Pagamento criado: ${data.beneficiary} - R$ ${data.amount}`,
        details: { payment }
      });

      return payment;
    } finally {
      client.release();
    }
  }

  private async registerPayment(data: any): Promise<any> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        UPDATE payments
        SET status = 'paid', payment_date = $1, updated_at = $2
        WHERE id = $3
        RETURNING *
      `, [data.paymentDate || new Date(), new Date(), data.paymentId]);

      const payment = result.rows[0];

      await this.orchestrator.logToFeed({
        id: uuidv4(),
        projectId: payment.project_id,
        taskId: payment.task_id,
        agent: this.name,
        category: 'financial',
        action: `Pagamento registrado: ${payment.beneficiary} - R$ ${payment.amount}`,
        details: { payment }
      });

      // Notify compliance to verify documentation
      await this.orchestrator.routeMessage({
        id: uuidv4(),
        from: this.name,
        to: 'compliance',
        action: 'payment:verify',
        payload: { payment },
        timestamp: new Date()
      });

      return payment;
    } finally {
      client.release();
    }
  }

  private async validatePayment(data: any): Promise<any> {
    const client = await pool.connect();
    try {
      // Get payment details
      const result = await client.query(`
        SELECT p.*, t.title as task_title
        FROM payments p
        LEFT JOIN tasks t ON p.task_id = t.id
        WHERE p.id = $1
      `, [data.paymentId]);

      const payment = result.rows[0];
      if (!payment) {
        return { error: 'Payment not found' };
      }

      // Validation checks
      const validations = {
        amountValid: payment.amount > 0,
        beneficiaryValid: !!payment.beneficiary,
        projectValid: !!payment.project_id
      };

      const isValid = Object.values(validations).every(v => v);

      await this.orchestrator.logToFeed({
        id: uuidv4(),
        projectId: payment.project_id,
        taskId: payment.task_id,
        agent: this.name,
        category: 'financial',
        action: `Pagamento ${isValid ? 'validado' : 'inválido'}: ${payment.beneficiary}`,
        details: { payment, validations, isValid }
      });

      return { payment, validations, isValid };
    } finally {
      client.release();
    }
  }

  async checkRisks(projectId?: string): Promise<any> {
    const client = await pool.connect();
    try {
      let query = `
        SELECT p.*, pr.name as project_name
        FROM payments p
        LEFT JOIN projects pr ON p.project_id = pr.id
        WHERE p.status = 'pending'
        AND p.created_at < CURRENT_DATE - INTERVAL '15 days'
      `;

      if (projectId) {
        query += ' AND p.project_id = $1';
      }

      const result = projectId
        ? await client.query(query, [projectId])
        : await client.query(query);

      const risks = [];

      for (const payment of result.rows) {
        const risk = {
          type: 'delayed_payment',
          paymentId: payment.id,
          severity: 'high',
          description: `Pagamento pendente há mais de 15 dias: ${payment.beneficiary}`
        };

        await client.query(`
          INSERT INTO risks (id, project_id, description, severity, status, identified_at)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          uuidv4(),
          payment.project_id,
          risk.description,
          'high',
          'active',
          new Date()
        ]);

        risks.push(risk);
      }

      if (risks.length > 0) {
        await this.orchestrator.logToFeed({
          id: uuidv4(),
          projectId: projectId,
          agent: this.name,
          category: 'risk',
          action: `${risks.length} risco(s) identificado(s)`,
          details: { risks }
        });
      }

      return risks;
    } finally {
      client.release();
    }
  }

  private async detectGlosa(projectId: string): Promise<any> {
    const client = await pool.connect();
    try {
      // Check for potential glosa situations
      const payments = await client.query(`
        SELECT * FROM payments
        WHERE project_id = $1
        AND status = 'paid'
      `, [projectId]);

      const documents = await client.query(`
        SELECT * FROM documents
        WHERE project_id = $1
        AND category = 'compliance'
      `, [projectId]);

      const glosaRisks = [];

      // Check for payments without proper documentation
      for (const payment of payments.rows) {
        const hasDoc = documents.rows.some(
          doc => JSON.parse(doc.metadata || '{}').paymentId === payment.id
        );

        if (!hasDoc) {
          glosaRisks.push({
            type: 'missing_documentation',
            paymentId: payment.id,
            severity: 'high',
            description: `Pagamento sem documentação de suporte: ${payment.beneficiary}`
          });
        }
      }

      if (glosaRisks.length > 0) {
        await this.orchestrator.logToFeed({
          id: uuidv4(),
          projectId: projectId,
          agent: this.name,
          category: 'glosa',
          action: `${glosaRisks.length} risco(s) de glosa identificado(s)`,
          details: { glosaRisks }
        });

        // Notify compliance
        await this.orchestrator.routeMessage({
          id: uuidv4(),
          from: this.name,
          to: 'compliance',
          action: 'glosa:risk',
          payload: { projectId, risks: glosaRisks },
          timestamp: new Date()
        });
      }

      return glosaRisks;
    } finally {
      client.release();
    }
  }

  private async checkDeadlines(projectId?: string): Promise<any> {
    const client = await pool.connect();
    try {
      let query = `
        SELECT * FROM payments
        WHERE payment_date IS NOT NULL
        AND payment_date <= CURRENT_DATE + INTERVAL '7 days'
        AND status != 'paid'
      `;

      if (projectId) {
        query += ' AND project_id = $1';
      }

      const result = projectId
        ? await client.query(query, [projectId])
        : await client.query(query);

      return result.rows;
    } finally {
      client.release();
    }
  }
}
