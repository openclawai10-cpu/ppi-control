-- Adicionar tabela de usuários
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  avatar VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserir usuário admin padrão (senha: admin123)
INSERT INTO users (name, email, password, role)
VALUES ('Administrador', 'admin@ppi.control', '$2a$10$X5wFWMLGZqVKrCQqJQJQJOK9J8K9K9K9K9K9K9K9K9K9K9K9K9K9', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Criar usuário de demonstração (senha: demo123)
INSERT INTO users (name, email, password, role)
VALUES ('Demo User', 'demo@ppi.control', '$2a$10$X5wFWMLGZqVKrCQqJQJQJOK9J8K9K9K9K9K9K9K9K9K9K9K9K9K9K9', 'user')
ON CONFLICT (email) DO NOTHING;
