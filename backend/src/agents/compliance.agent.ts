import { v4 as uuidv4 } from 'uuid';
import { AgentOrchestrator, AgentMessage } from './orchestrator';
import { pool } from '../db/init';

export class ComplianceAgent {
  private orchestrator: AgentOrchestrator;
  private name = 'compliance';

  constructor(orchestrator: AgentOrchestrator) {
    this.orchestrator = orchestrator;
  }

  async handleMessage(message: AgentMessage): Promise<any> {
    switch (message.action) {
      case 'payment:verify':
        return await this.verifyPaymentDocs(message.payload);
      case 'document:check':
        return await this.checkDocument(message.payload);
      case 'compliance:audit':
        return await this.runAudit(message.payload);
      case 'glosa:risk':
        return await this.handleGlosaRisk(message.payload);
      default:
        return { error: 'Unknown action' };
    }
  }

  private async verifyPaymentDocs(data: any): Promise<any> {
    const client = await pool.connect();
    try {
      const payment = data.payment;

      // Check required documents for payment
      const result = await client.query(`
        SELECT * FROM documents
        WHERE project_id = $1
        AND metadata::jsonb @> '{"paymentId": "${payment.id}"}'::jsonb
      `, [payment.project_id]);

      const requiredDocs = ['nota_fiscal', 'comprovante', 'termo'];
      const existingDocs = result.rows.map(r => r.type);
      const missingDocs = requiredDocs.filter(d => !existingDocs.includes(d));

      const isCompliant = missingDocs.length === 0;

      await client.query(`
        INSERT INTO compliance_checks (id, project_id, check_type, status, issues, checked_at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        uuidv4(),
        payment.project_id,
        'payment_verification',
        isCompliant ? 'passed' : 'failed',
        JSON.stringify({ missingDocs }),
        new Date()
      ]);

      await this.orchestrator.logToFeed({
        id: uuidv4(),
        projectId: payment.project_id,
        agent: this.name,
        category: 'compliance',
        action: `Verificação de documentos: ${isCompliant ? 'Aprovado' : 'Pendente'}`,
        details: { payment, missingDocs, isCompliant }
      });

      if (!isCompliant) {
        await this.orchestrator.routeMessage({
          id: uuidv4(),
          from: this.name,
          to: 'messenger',
          action: 'alert',
          payload: {
            type: 'compliance_issue',
            payment,
            missingDocs
          },
          timestamp: new Date()
        });
      }

      return { payment, isCompliant, missingDocs };
    } finally {
      client.release();
    }
  }

  private async checkDocument(data: any): Promise<any> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT * FROM documents WHERE id = $1
      `, [data.documentId]);

      const doc = result.rows[0];
      if (!doc) {
        return { error: 'Document not found' };
      }

      // Basic compliance checks
      const checks = {
        hasName: !!doc.name,
        hasType: !!doc.type,
        hasContent: !!doc.content,
        isValid: true
      };

      await this.orchestrator.logToFeed({
        id: uuidv4(),
        projectId: doc.project_id,
        agent: this.name,
        category: 'compliance',
        action: `Documento verificado: ${doc.name}`,
        details: { document: doc, checks }
      });

      return { document: doc, checks };
    } finally {
      client.release();
    }
  }

  async runAudit(projectId: string): Promise<any> {
    const client = await pool.connect();
    try {
      // Get all compliance checks for project
      const checks = await client.query(`
        SELECT * FROM compliance_checks
        WHERE project_id = $1
        ORDER BY checked_at DESC
      `, [projectId]);

      const failedChecks = checks.rows.filter(c => c.status === 'failed');
      const passedChecks = checks.rows.filter(c => c.status === 'passed');

      const auditReport = {
        projectId,
        totalChecks: checks.rows.length,
        passed: passedChecks.length,
        failed: failedChecks.length,
        complianceRate: checks.rows.length > 0
          ? (passedChecks.length / checks.rows.length * 100).toFixed(2)
          : 100,
        issues: failedChecks.map(c => c.issues)
      };

      await this.orchestrator.logToFeed({
        id: uuidv4(),
        projectId: projectId,
        agent: this.name,
        category: 'compliance',
        action: `Auditoria concluída: ${auditReport.complianceRate}% conformidade`,
        details: auditReport
      });

      return auditReport;
    } finally {
      client.release();
    }
  }

  private async handleGlosaRisk(data: any): Promise<any> {
    const client = await pool.connect();
    try {
      // Create risk entries
      for (const risk of data.risks) {
        await client.query(`
          INSERT INTO risks (id, project_id, description, severity, status, identified_at)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          uuidv4(),
          data.projectId,
          risk.description,
          risk.severity,
          'active',
          new Date()
        ]);
      }

      await this.orchestrator.logToFeed({
        id: uuidv4(),
        projectId: data.projectId,
        agent: this.name,
        category: 'glosa',
        action: `Riscos de glosa registrados para ação`,
        details: { risks: data.risks }
      });

      return { handled: true, count: data.risks.length };
    } finally {
      client.release();
    }
  }
}
