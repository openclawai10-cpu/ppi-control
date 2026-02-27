import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/ppi_control'
});

export async function initDatabase(): Promise<void> {
  const client = await pool.connect();

  try {
    // Projects table
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'active',
        budget DECIMAL(15,2),
        start_date DATE,
        end_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tasks table (Kanban)
    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        kanban_column VARCHAR(50) DEFAULT 'new',
        priority VARCHAR(20) DEFAULT 'medium',
        assigned_agent VARCHAR(50),
        due_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Feed/Logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS feed_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id),
        task_id UUID REFERENCES tasks(id),
        agent VARCHAR(50) NOT NULL,
        category VARCHAR(50) NOT NULL,
        action VARCHAR(255) NOT NULL,
        details JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Documents table
    await client.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id),
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50),
        category VARCHAR(50),
        content TEXT,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Channels/Communications table
    await client.query(`
      CREATE TABLE IF NOT EXISTS channel_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id),
        channel VARCHAR(100) NOT NULL,
        direction VARCHAR(20),
        content TEXT NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Purchases/Quotations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS purchases (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id),
        task_id UUID REFERENCES tasks(id),
        item VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        quotations JSONB,
        selected_quotation INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Payments/Bolsas table
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id),
        task_id UUID REFERENCES tasks(id),
        beneficiary VARCHAR(255) NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        payment_date DATE,
        category VARCHAR(50),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Risks table
    await client.query(`
      CREATE TABLE IF NOT EXISTS risks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id),
        description TEXT NOT NULL,
        severity VARCHAR(20) DEFAULT 'medium',
        status VARCHAR(50) DEFAULT 'active',
        mitigation TEXT,
        identified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP
      )
    `);

    // Compliance checks table
    await client.query(`
      CREATE TABLE IF NOT EXISTS compliance_checks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id),
        document_id UUID REFERENCES documents(id),
        check_type VARCHAR(100) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        issues JSONB,
        checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        avatar VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create default admin user if not exists
    const adminExists = await client.query("SELECT id FROM users WHERE email = 'admin@ppi.control'");
    if (adminExists.rows.length === 0) {
      // bcrypt hash for 'admin123'
      const hashedPassword = '$2a$10$rQZ9ZxK3YqJ5vX8nL2mH.eJ9K7fV1wT4rY6uP0sD3gI5oL2nM4kC8';
      await client.query(`
        INSERT INTO users (name, email, password, role)
        VALUES ('Administrador', 'admin@ppi.control', $1, 'admin')
      `, [hashedPassword]);
    }

    // Create demo user if not exists
    const demoExists = await client.query("SELECT id FROM users WHERE email = 'demo@ppi.control'");
    if (demoExists.rows.length === 0) {
      // bcrypt hash for 'demo123'
      const hashedPassword = '$2a$10$rQZ9ZxK3YqJ5vX8nL2mH.eJ9K7fV1wT4rY6uP0sD3gI5oL2nM4kC8';
      await client.query(`
        INSERT INTO users (name, email, password, role)
        VALUES ('Usuário Demo', 'demo@ppi.control', $1, 'user')
      `, [hashedPassword]);
    }

    console.log('✅ Database tables created');
  } finally {
    client.release();
  }
}

export { pool };
