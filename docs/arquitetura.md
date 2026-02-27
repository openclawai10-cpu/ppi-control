# Arquitetura do Sistema PPI Control

## Visão Geral

O PPI Control é um sistema multiagentes para gestão de projetos do Programa Prioritário de Informática (PPI Softex). O sistema automatiza e centraliza a gestão de projetos que envolvem recursos públicos para inovação.

## Componentes Principais

### Frontend (React + TypeScript)

```
frontend/
├── src/
│   ├── components/     # Componentes reutilizáveis
│   │   └── Layout.tsx  # Layout principal com sidebar
│   ├── pages/          # Páginas da aplicação
│   │   ├── Feed.tsx    # Feed de logs do sistema
│   │   ├── Kanban.tsx  # Centro de controle (Kanban)
│   │   ├── Channels.tsx # Canais de comunicação
│   │   ├── Dashboard.tsx # Dashboards e resumos
│   │   ├── Projects.tsx # Gestão de projetos
│   │   ├── Documents.tsx # Banco de documentos
│   │   └── Purchases.tsx # Gestão de compras
│   ├── App.tsx         # Roteamento principal
│   └── main.tsx        # Entry point
```

### Backend (Node.js + Express + TypeScript)

```
backend/
├── src/
│   ├── agents/         # Sistema multiagentes
│   │   ├── orchestrator.ts    # Orquestrador de agentes
│   │   ├── leader.agent.ts    # Agente líder
│   │   ├── financial.agent.ts # Agente financeiro
│   │   ├── compliance.agent.ts # Agente de compliance
│   │   ├── messenger.agent.ts # Agente mensageiro
│   │   ├── database.agent.ts  # Agente do banco de dados
│   │   ├── spreadsheet.agent.ts # Agente de planilhas
│   │   ├── dailyfeed.agent.ts # Agente de feed diário
│   │   ├── purchase.agent.ts  # Agente de compras
│   │   └── summary.agent.ts   # Agente de resumos
│   ├── routes/         # Rotas da API
│   ├── db/             # Inicialização do banco
│   └── index.ts        # Entry point
```

### Banco de Dados (PostgreSQL)

Tabelas principais:
- `projects` - Projetos
- `tasks` - Tarefas (Kanban)
- `feed_logs` - Feed de logs
- `documents` - Documentos
- `channel_messages` - Mensagens de canais
- `purchases` - Compras e cotações
- `payments` - Pagamentos e bolsas
- `risks` - Riscos identificados
- `compliance_checks` - Verificações de compliance

## Sistema Multiagentes

### Agentes

| Agente | Responsabilidade | Ações Principais |
|--------|------------------|------------------|
| **Líder** | Coordenação geral | Criar tarefas, mover tarefas, relatórios, cronjobs |
| **Financeiro** | Gestão financeira | Criar pagamentos, registrar pagamentos, detectar riscos, glosas |
| **Compliance** | Conformidade | Verificar documentos, auditoria, risco de glosa |
| **Mensageiro** | Comunicação | Notificações, alertas, logs, canais |
| **Banco de Dados** | Persistência | Armazenar, consultar, atualizar, categorizar dados |
| **Planilhas** | Integração | Importar, parsear, entregar ao banco |
| **Feed Diário** | Coleta | Coletar dados, enviar ao banco ao fim do dia |
| **Compras** | Aquisições | Criar compra, adicionar cotações, comparar, selecionar |
| **Resumo** | Dashboards | Resumos por projeto, financeiro, tarefas, riscos |

### Comunicação entre Agentes

Os agentes se comunicam através do `AgentOrchestrator`:

```typescript
interface AgentMessage {
  id: string;
  from: string;
  to: string;
  action: string;
  payload: any;
  timestamp: Date;
}
```

### Cronjobs

O agente líder executa automaticamente:
- **Relatório diário**: 18:00
- **Verificação de prazos**: a cada hora
- **Relatório semanal**: Segunda-feira 09:00

## Fluxo de Exemplo: Pagamento de Bolsas

```
1. Usuário → Líder: Criar tarefa "Pagamento de Bolsas – Mês 01"
2. Líder → Kanban: Tarefa criada (coluna: novo)
3. Líder → Mensageiro: Notificar criação
4. Usuário → Líder: Alocar tarefa
5. Líder → Financeiro: Tarefa alocada
6. Financeiro → Banco de Dados: Criar pagamentos
7. Financeiro → Compliance: Verificar documentos
8. Compliance → Mensageiro: Alertar se pendências
9. Financeiro → Banco de Dados: Registrar pagamentos
10. Mensageiro → Feed: Log de todas ações
11. Tarefa → Concluída
```

## API REST

### Endpoints

| Rota | Descrição |
|------|-----------|
| `GET/POST /api/tasks` | Tarefas |
| `GET/POST /api/projects` | Projetos |
| `GET /api/feed` | Feed de logs |
| `POST /api/agents/:id/action` | Enviar ação para agente |
| `GET/POST /api/documents` | Documentos |
| `GET/POST /api/channels/messages` | Canais |
| `GET/POST /api/purchases` | Compras |

## WebSocket (Socket.IO)

Eventos em tempo real:
- `task:create` - Criar tarefa
- `task:move` - Mover tarefa
- `task:updated` - Tarefa atualizada
- `feed:new` - Novo item no feed
- `notification` - Notificação
- `alert` - Alerta

## Segurança

- Variáveis de ambiente para credenciais
- Validação de entrada nas APIs
- Logs de auditoria no feed
- Trilhas completas de ações

## Próximos Passos

1. Implementar autenticação JWT
2. Integrar com APIs externas (email, Slack)
3. Adicionar mais validações de compliance
4. Implementar dashboard de métricas em tempo real
5. Adicionar exportação de relatórios PDF
