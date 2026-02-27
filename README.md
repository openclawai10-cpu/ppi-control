# PPI Control - Sistema Multiagentes para Gestão de Projetos

Sistema de gestão de projetos do Programa Prioritário de Informática (PPI Softex) baseado em arquitetura multiagentes.

## 🎯 Objetivo

Automatizar e centralizar a gestão de projetos estratégicos que envolvem recursos públicos para inovação, incluindo:
- Gestão de prazos
- Controle financeiro
- Processos de compras
- Pagamento de bolsas
- Organização documental
- Prestação de contas
- Auditoria e compliance

## 🏗️ Arquitetura

### Frontend
- React + TypeScript
- TailwindCSS
- Abas: Feed, Kanban, Canais, Dashboards

### Backend
- Node.js + Express
- PostgreSQL (banco de dados)
- APIs RESTful

### Agentes (Multi-Agent System)
| Agente | Responsabilidade |
|--------|------------------|
| **Líder** | Coordena sistema, cronjobs, relatórios |
| **Financeiro** | Monitora riscos, glosas, prazos |
| **Compliance** | Analisa documentos, monitora conformidade |
| **Mensageiro** | Registra logs, envia notificações |
| **Banco de Dados** | Gere, categoriza, recebe feed diário |
| **Planilhas** | Entrega planilhas ao banco de dados |
| **Feed Diário** | Coleta e envia dados ao final do dia |
| **Compras** | Realiza 3 cotações, gera dashboard |
| **Resumo** | Gera dashboards e resumos por área |

## 📊 Módulos

### 1. Feed do Sistema (Log)
- Registro de ações por categoria
- Filtro por projeto
- Trilha de auditoria

### 2. Centro de Controle (Kanban)
- 4 colunas: Novos → Alocados → Em Andamento → Concluídos
- Drag & drop
- Filtro por projeto/agente

### 3. Canais de Comunicação
- Histórico de comunicações
- Integração via API

### 4. Banco de Dados
- Organização de planilhas
- Documentos indexados
- Busca e filtros

## 🚀 Instalação

```bash
# Clone o repositório
git clone https://github.com/openclawai10/ppi-control.git

# Backend
cd ppi-control/backend
npm install
npm run dev

# Frontend
cd ppi-control/frontend
npm install
npm run dev
```

## 📁 Estrutura do Projeto

```
ppi-control/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── utils/
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── agents/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── models/
│   │   └── utils/
│   └── package.json
├── docs/
│   └── arquitetura.md
└── README.md
```

## 🔄 Fluxo Exemplo: Pagamento de Bolsas

1. **Líder** cria tarefa "Pagamento de Bolsas – Mês 01"
2. **Agente de Bolsas** valida lista de bolsistas
3. **Agente Financeiro** registra pagamento
4. **Agente de Compliance** verifica documentação
5. **Sistema** registra tudo no feed
6. **Tarefa** marcada como concluída

## 📝 Licença

MIT
