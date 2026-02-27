-- PPI Control - Dados de Demonstração
-- Projeto: Residência Tecnológica em Software

-- Limpar dados existentes
TRUNCATE TABLE feed_logs, compliance_checks, risks, payments, purchases, channel_messages, documents, tasks, projects CASCADE;

-- ============================================
-- PROJETOS
-- ============================================

INSERT INTO projects (id, name, description, status, budget, start_date, end_date, created_at) VALUES
('11111111-1111-1111-1111-111111111111', 
 'Residência Tecnológica em Software - Edição 2024',
 'Programa de capacitação em desenvolvimento de software com foco em inovação tecnológica. Inclui bolsas de estudo, mentoria e projetos práticos.',
 'active', 
 850000.00, 
 '2024-01-15', 
 '2024-12-31', 
 NOW() - INTERVAL '2 months'),

('22222222-2222-2222-2222-222222222222',
 'Plataforma de Inovação Aberta',
 'Desenvolvimento de plataforma digital para conectar startups, universidades e empresas em projetos colaborativos de P&D.',
 'active',
 420000.00,
 '2024-03-01',
 '2024-11-30',
 NOW() - INTERVAL '1 month'),

('33333333-3333-3333-3333-333333333333',
 'Capacitação TIC64 - Backend',
 'Formação de desenvolvedores backend com foco em arquitetura de microsserviços, APIs RESTful e banco de dados.',
 'active',
 320000.00,
 '2024-02-01',
 '2024-08-31',
 NOW() - INTERVAL '3 weeks');

-- ============================================
-- TAREFAS (Kanban)
-- ============================================

-- Coluna: Novos
INSERT INTO tasks (id, project_id, title, description, kanban_column, priority, assigned_agent, due_date, created_at) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 
 'Pagamento de Bolsas - Março/2024',
 'Processar pagamento mensal das 45 bolsas da residência tecnológica',
 'new', 'high', NULL, '2024-03-05', NOW() - INTERVAL '2 days'),

('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111',
 'Aquisição de Licenças de Software',
 'Comprar 30 licenças JetBrains para os residentes',
 'new', 'medium', 'purchase', '2024-03-15', NOW() - INTERVAL '1 day'),

('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222',
 'Contratação de Consultoria UX/UI',
 'Selecionar empresa de consultoria para redesign da plataforma',
 'new', 'high', NULL, '2024-03-20', NOW()),

('dddddddd-dddd-dddd-dddd-dddddddddddd', '33333333-3333-3333-3333-333333333333',
 'Renovação de Equipamentos do Lab',
 'Comprar 15 notebooks para laboratório de desenvolvimento',
 'new', 'high', 'purchase', '2024-03-10', NOW());

-- Coluna: Alocados
INSERT INTO tasks (id, project_id, title, description, kanban_column, priority, assigned_agent, due_date, created_at) VALUES
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111',
 'Validação de Frequência - Fevereiro',
 'Verificar registros de frequência dos 45 residentes do mês anterior',
 'allocated', 'high', 'compliance', '2024-03-03', NOW() - INTERVAL '4 days'),

('ffffffff-ffff-ffff-ffff-ffffffffffff', '11111111-1111-1111-1111-111111111111',
 'Prestação de Contas - Trimestre 1',
 'Preparar documentação para prestação de contas do primeiro trimestre',
 'allocated', 'high', 'financial', '2024-04-05', NOW() - INTERVAL '1 week'),

('gggggggg-gggg-gggg-gggg-gggggggggggg', '22222222-2222-2222-2222-222222222222',
 'Integração com API de Pagamentos',
 'Implementar gateway de pagamento na plataforma',
 'allocated', 'medium', 'database', '2024-03-25', NOW() - INTERVAL '3 days');

-- Coluna: Em Andamento
INSERT INTO tasks (id, project_id, title, description, kanban_column, priority, assigned_agent, due_date, created_at) VALUES
('hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhhhh', '11111111-1111-1111-1111-111111111111',
 'Pagamento de Bolsas - Fevereiro/2024',
 'Processar pagamento das 45 bolsas do mês de fevereiro',
 'in_progress', 'high', 'financial', '2024-02-28', NOW() - INTERVAL '2 weeks'),

('iiiiiiii-iiii-iiii-iiii-iiiiiiiiiiii', '33333333-3333-3333-3333-333333333333',
 'Elaboração de Relatório Técnico',
 'Preparar relatório parcial de atividades do TIC64',
 'in_progress', 'medium', 'summary', '2024-03-01', NOW() - INTERVAL '1 week'),

('jjjjjjjj-jjjj-jjjj-jjjj-jjjjjjjjjjjj', '22222222-2222-2222-2222-222222222222',
 'Desenvolvimento do Dashboard',
 'Criar painel de métricas para usuários da plataforma',
 'in_progress', 'medium', 'database', '2024-03-18', NOW() - INTERVAL '5 days');

-- Coluna: Concluídos
INSERT INTO tasks (id, project_id, title, description, kanban_column, priority, assigned_agent, due_date, created_at) VALUES
('kkkkkkkk-kkkk-kkkk-kkkk-kkkkkkkkkkkk', '11111111-1111-1111-1111-111111111111',
 'Seleção de Candidatos - Turma 2024',
 'Processo seletivo com 180 candidatos para 45 vagas',
 'completed', 'high', 'leader', '2024-01-10', NOW() - INTERVAL '2 months'),

('llllllll-llll-llll-llll-llllllllllll', '11111111-1111-1111-1111-111111111111',
 'Pagamento de Bolsas - Janeiro/2024',
 'Primeiro pagamento do programa de residência',
 'completed', 'high', 'financial', '2024-02-05', NOW() - INTERVAL '1 month'),

('mmmmmmmm-mmmm-mmmm-mmmm-mmmmmmmmmmmm', '33333333-3333-3333-3333-333333333333',
 'Matrícula dos Alunos',
 'Processo de matrícula dos 30 alunos do TIC64',
 'completed', 'medium', 'messenger', '2024-02-10', NOW() - INTERVAL '6 weeks');

-- ============================================
-- PAGAMENTOS / BOLSAS
-- ============================================

INSERT INTO payments (id, project_id, task_id, beneficiary, amount, status, payment_date, category, notes, created_at) VALUES
-- Janeiro - Pago
('p1', '11111111-1111-1111-1111-111111111111', 'llllllll-llll-llll-llll-llllllllllll', 
 'Ana Carolina Silva Santos', 1800.00, 'paid', '2024-02-05', 'bolsa', 'Bolsista - Desenvolvimento Backend', NOW() - INTERVAL '1 month'),
('p2', '11111111-1111-1111-1111-111111111111', 'llllllll-llll-llll-llll-llllllllllll',
 'Bruno Oliveira Costa', 1800.00, 'paid', '2024-02-05', 'bolsa', 'Bolsista - Desenvolvimento Frontend', NOW() - INTERVAL '1 month'),
('p3', '11111111-1111-1111-1111-111111111111', 'llllllll-llll-llll-llll-llllllllllll',
 'Carla Mendes Pereira', 1800.00, 'paid', '2024-02-05', 'bolsa', 'Bolsista - DevOps', NOW() - INTERVAL '1 month'),
('p4', '11111111-1111-1111-1111-111111111111', 'llllllll-llll-llll-llll-llllllllllll',
 'Daniel Rodrigues Lima', 1800.00, 'paid', '2024-02-05', 'bolsa', 'Bolsista - QA/Testing', NOW() - INTERVAL '1 month'),
('p5', '11111111-1111-1111-1111-111111111111', 'llllllll-llll-llll-llll-llllllllllll',
 'Eduarda Ferreira Alves', 1800.00, 'paid', '2024-02-05', 'bolsa', 'Bolsista - Data Science', NOW() - INTERVAL '1 month'),

-- Fevereiro - Em processamento
('p6', '11111111-1111-1111-1111-111111111111', 'hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhhhh',
 'Ana Carolina Silva Santos', 1800.00, 'pending', NULL, 'bolsa', 'Bolsista - Desenvolvimento Backend', NOW() - INTERVAL '3 days'),
('p7', '11111111-1111-1111-1111-111111111111', 'hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhhhh',
 'Bruno Oliveira Costa', 1800.00, 'pending', NULL, 'bolsa', 'Bolsista - Desenvolvimento Frontend', NOW() - INTERVAL '3 days'),
('p8', '11111111-1111-1111-1111-111111111111', 'hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhhhh',
 'Carla Mendes Pereira', 1800.00, 'pending', NULL, 'bolsa', 'Bolsista - DevOps', NOW() - INTERVAL '3 days'),

-- TIC64 - Janeiro Pago
('p9', '33333333-3333-3333-3333-333333333333', NULL,
 'Felipe Santos Araújo', 1500.00, 'paid', '2024-02-10', 'bolsa', 'Bolsista TIC64 - Backend', NOW() - INTERVAL '6 weeks'),
('p10', '33333333-3333-3333-3333-333333333333', NULL,
 'Gabriela Lima Souza', 1500.00, 'paid', '2024-02-10', 'bolsa', 'Bolsista TIC64 - Backend', NOW() - INTERVAL '6 weeks');

-- ============================================
-- COMPRAS / COTAÇÕES
-- ============================================

INSERT INTO purchases (id, project_id, task_id, item, description, status, quotations, selected_quotation, created_at) VALUES
('c1', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
 'Licenças JetBrains IntelliJ IDEA',
 '30 licenças anuais para desenvolvimento Java/Kotlin',
 'selected',
 '[{"supplier":"Distribuidor Tech Solutions","price":28500.00,"deadline":"5 dias úteis","notes":"Inclui suporte técnico"},{"supplier":"Software House Brasil","price":29400.00,"deadline":"7 dias úteis","notes":"Garantia de 2 anos"},{"supplier":"Revenda Autorizada JetBrains","price":31200.00,"deadline":"3 dias úteis","notes":"Suporte premium incluído"}]'::jsonb,
 0,
 NOW() - INTERVAL '2 days'),

('c2', '33333333-3333-3333-3333-333333333333', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
 'Notebooks Dell Inspiron 15',
 '15 notebooks para laboratório - i7, 16GB RAM, 512GB SSD',
 'ready_for_comparison',
 '[{"supplier":"Dell Brasil","price":82500.00,"deadline":"15 dias úteis","notes":"Garantia de 3 anos onsite"},{"supplier":"Magazine Empresas","price":79800.00,"deadline":"10 dias úteis","notes":"Garantia de 2 anos"},{"supplier":"Amazon Business","price":78200.00,"deadline":"8 dias úteis","notes":"Frete grátis"}]'::jsonb,
 NULL,
 NOW() - INTERVAL '1 day'),

('c3', '22222222-2222-2222-2222-222222222222', 'cccccccc-cccc-cccc-cccc-cccccccccccc',
 'Consultoria UX/UI - Redesign Plataforma',
 'Consultoria de 3 meses para redesign completo da interface',
 'pending_quotations',
 '[]'::jsonb,
 NULL,
 NOW()),

('c4', '11111111-1111-1111-1111-111111111111', NULL,
 'Serviços de Cloud AWS',
 'Créditos AWS para hospedagem da plataforma de inovação',
 'completed',
 '[{"supplier":"AWS Direct","price":15000.00,"deadline":"Imediato","notes":"Créditos anuais"},{"supplier":"AWS Partner Network","price":14500.00,"deadline":"2 dias","notes":"Parceiro certificado"},{"supplier":"Cloud Services Brasil","price":16000.00,"deadline":"1 dia","notes":"Suporte 24/7"}]'::jsonb,
 1,
 NOW() - INTERVAL '2 weeks');

-- ============================================
-- DOCUMENTOS
-- ============================================

INSERT INTO documents (id, project_id, name, type, category, content, metadata, created_at) VALUES
('d1', '11111111-1111-1111-1111-111111111111',
 'Edital de Seleção 2024',
 'pdf', 'compliance',
 'Documento oficial do processo seletivo para o programa de residência tecnológica...',
 '{"pages": 15, "version": "2.0", "approved_by": "Coordenação PPI"}'::jsonb,
 NOW() - INTERVAL '2 months'),

('d2', '11111111-1111-1111-1111-111111111111',
 'Lista de Bolsistas - Fevereiro 2024',
 'spreadsheet', 'financial',
 'Nome,CPF,Valor_Bolsa,Data_Pagamento,Status
Ana Carolina Silva Santos,123.456.789-00,1800.00,05/02/2024,Pago
Bruno Oliveira Costa,234.567.890-11,1800.00,05/02/2024,Pago
Carla Mendes Pereira,345.678.901-22,1800.00,05/02/2024,Pago',
 '{"total_bolsistas": 45, "valor_total": 81000.00, "mes_referencia": "02/2024"}'::jsonb,
 NOW() - INTERVAL '3 weeks'),

('d3', '11111111-1111-1111-1111-111111111111',
 'Termo de Compromisso - Modelo',
 'contract', 'compliance',
 'TERMO DE COMPROMISSO DE BOLSISTA
Programa Prioritário de Informática - PPI Softex
Residência Tecnológica em Software...',
 '{"template": true, "version": "3.1"}'::jsonb,
 NOW() - INTERVAL '2 months'),

('d4', '22222222-2222-2222-2222-222222222222',
 'Especificação Técnica - Plataforma',
 'document', 'general',
 'Documento de especificação técnica da Plataforma de Inovação Aberta...',
 '{"pages": 45, "status": "em_revisao"}'::jsonb,
 NOW() - INTERVAL '3 weeks'),

('d5', '33333333-3333-3333-3333-333333333333',
 'Plano de Ensino - TIC64 Backend',
 'document', 'general',
 'Plano de ensino do curso de capacitação em desenvolvimento backend...',
 '{"carga_horaria": 400, "modulos": 8}'::jsonb,
 NOW() - INTERVAL '1 month'),

('d6', '11111111-1111-1111-1111-111111111111',
 'Nota Fiscal - AWS Credits',
 'pdf', 'financial',
 'Nota fiscal referente à aquisição de créditos AWS...',
 '{"numero_nf": "123456", "valor": 14500.00, "data": "15/02/2024"}'::jsonb,
 NOW() - INTERVAL '2 weeks');

-- ============================================
-- RISCOS
-- ============================================

INSERT INTO risks (id, project_id, description, severity, status, mitigation, identified_at, resolved_at) VALUES
('r1', '11111111-1111-1111-1111-111111111111',
 'Atraso na validação de frequência pode impactar pagamento de bolsas',
 'high', 'active',
 'Automatizar coleta de frequência e criar alertas com 5 dias de antecedência',
 NOW() - INTERVAL '1 week', NULL),

('r2', '11111111-1111-1111-1111-111111111111',
 'Documentação de prestação de contas incompleta para o trimestre',
 'medium', 'active',
 'Designar responsável para compilar documentação até 25/03',
 NOW() - INTERVAL '3 days', NULL),

('r3', '22222222-2222-2222-2222-222222222222',
 'Possível glosa por falta de evidências de execução do projeto',
 'high', 'active',
 'Solicitar relatórios de progresso semanais e armazenar no sistema',
 NOW() - INTERVAL '5 days', NULL),

('r4', '33333333-3333-3333-3333-333333333333',
 'Equipamentos do laboratório com garantia vencendo',
 'low', 'resolved',
 'Renovação de garantia contratada em 10/02/2024',
 NOW() - INTERVAL '1 month', NOW() - INTERVAL '2 weeks'),

('r5', '11111111-1111-1111-1111-111111111111',
 'Bolsista pode desistir durante o programa',
 'medium', 'active',
 'Manter lista de candidatos em espera para reposição',
 NOW() - INTERVAL '2 weeks', NULL);

-- ============================================
-- FEED / LOGS
-- ============================================

INSERT INTO feed_logs (id, project_id, task_id, agent, category, action, details, created_at) VALUES
-- Últimas atividades
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
 'purchase', 'purchase', 'Cotação selecionada: Distribuidor Tech Solutions - R$ 28.500,00',
 '{"item": "Licenças JetBrains", "savings": 2700.00}'::jsonb,
 NOW() - INTERVAL '2 days'),

(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
 'compliance', 'compliance', 'Iniciada validação de frequência - 45 bolsistas',
 '{"total": 45, "validados": 32}'::jsonb,
 NOW() - INTERVAL '1 day'),

(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhhhh',
 'financial', 'financial', 'Lote de pagamento criado - 45 bolsas de Fevereiro',
 '{"total": 81000.00, "bolsistas": 45}'::jsonb,
 NOW() - INTERVAL '3 days'),

(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'llllllll-llll-llll-llll-llllllllllll',
 'leader', 'task', 'Tarefa concluída: Seleção de Candidatos - Turma 2024',
 '{"candidatos": 180, "aprovados": 45}'::jsonb,
 NOW() - INTERVAL '2 months'),

(gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'jjjjjjjj-jjjj-jjjj-jjjj-jjjjjjjjjjjj',
 'database', 'task', 'Desenvolvimento do Dashboard iniciado',
 '{"sprint": 3, "estimativa_dias": 15}'::jsonb,
 NOW() - INTERVAL '5 days'),

(gen_random_uuid(), '33333333-3333-3333-3333-333333333333', 'iiiiiiii-iiii-iiii-iiii-iiiiiiiiiiii',
 'summary', 'report', 'Relatório técnico parcial gerado',
 '{"paginas": 12, "modulo": "Backend APIs"}'::jsonb,
 NOW() - INTERVAL '1 week'),

(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', NULL,
 'compliance', 'risk', 'Risco identificado: Atraso na validação de frequência',
 '{"severity": "high", "impacto": "pagamento_bolsas"}'::jsonb,
 NOW() - INTERVAL '1 week'),

(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', NULL,
 'messenger', 'alert', 'Alerta: Tarefa "Pagamento de Bolsas - Março" vence em 5 dias',
 '{"task_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}'::jsonb,
 NOW() - INTERVAL '4 hours'),

(gen_random_uuid(), NULL, NULL,
 'leader', 'system', 'Relatório diário gerado automaticamente',
 '{"tarefas_concluidas": 3, "pagamentos_processados": 5, "riscos_mitigados": 1}'::jsonb,
 NOW() - INTERVAL '1 day'),

(gen_random_uuid(), '33333333-3333-3333-3333-333333333333', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
 'purchase', 'purchase', '3 cotações recebidas para Notebooks Dell',
 '{"menor_preco": 78200.00, "economia_potencial": 4300.00}'::jsonb,
 NOW() - INTERVAL '1 day'),

-- Atividades mais antigas
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'kkkkkkkk-kkkk-kkkk-kkkk-kkkkkkkkkkkk',
 'leader', 'task', 'Processo seletivo iniciado',
 '{"vagas": 45, "inscricoes": 180}'::jsonb,
 NOW() - INTERVAL '2 months'),

(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'llllllll-llll-llll-llll-llllllllllll',
 'financial', 'financial', 'Pagamento processado: Janeiro/2024',
 '{"valor_total": 81000.00, "bolsistas": 45}'::jsonb,
 NOW() - INTERVAL '1 month'),

(gen_random_uuid(), '33333333-3333-3333-3333-333333333333', 'mmmmmmmm-mmmm-mmmm-mmmm-mmmmmmmmmmmm',
 'messenger', 'notification', 'Matrícula concluída para 30 alunos',
 '{"turma": "TIC64-2024"}'::jsonb,
 NOW() - INTERVAL '6 weeks');

-- ============================================
-- CANAIS DE COMUNICAÇÃO
-- ============================================

INSERT INTO channel_messages (id, project_id, channel, direction, content, metadata, created_at) VALUES
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'email-coordenacao', 'outbound',
 'Envio de relatório mensal de atividades para coordenação do PPI',
 '{"destinatario": "coordenacao@ppisoftex.org.br"}'::jsonb,
 NOW() - INTERVAL '1 week'),

(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'slack-residencia', 'outbound',
 '📢 Lembrete: Prazo de submissão de projetos hoje às 18h',
 '{"canal": "#residencia-2024"}'::jsonb,
 NOW() - INTERVAL '3 days'),

(gen_random_uuid(), '33333333-3333-3333-3333-333333333333', 'whatsapp-tic64', 'outbound',
 '⚠️ Aula de amanhã remarcada para quinta-feira às 14h',
 '{"grupo": "TIC64 Backend 2024"}'::jsonb,
 NOW() - INTERVAL '2 days'),

(gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'email-stakeholders', 'outbound',
 'Convite para reunião de acompanhamento trimestral',
 '{"data": "15/03/2024", "hora": "10:00"}'::jsonb,
 NOW() - INTERVAL '5 days'),

(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'slack-residencia', 'inbound',
 'Bolsista solicitou alteração de projeto',
 '{"bolsista_id": "p1", "novo_projeto": "Plataforma de Inovação"}'::jsonb,
 NOW() - INTERVAL '4 days');

-- ============================================
-- COMPLIANCE CHECKS
-- ============================================

INSERT INTO compliance_checks (id, project_id, document_id, check_type, status, issues, checked_at) VALUES
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'd1',
 'document_verification', 'passed',
 '{"issues": []}'::jsonb,
 NOW() - INTERVAL '2 months'),

(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'd2',
 'payment_verification', 'passed',
 '{"issues": [], "bolsistas_validados": 45}'::jsonb,
 NOW() - INTERVAL '3 weeks'),

(gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'd4',
 'document_verification', 'failed',
 '{"issues": ["Especificação técnica desatualizada", "Faltam diagramas de arquitetura"]}'::jsonb,
 NOW() - INTERVAL '1 week'),

(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', NULL,
 'frequency_validation', 'pending',
 '{"issues": [], "bolsistas_verificados": 32, "total": 45}'::jsonb,
 NOW() - INTERVAL '1 day');

-- ============================================
-- FIM DO SEED
-- ============================================

SELECT 'Seed concluído com sucesso!' as status,
       (SELECT COUNT(*) FROM projects) as projetos,
       (SELECT COUNT(*) FROM tasks) as tarefas,
       (SELECT COUNT(*) FROM payments) as pagamentos,
       (SELECT COUNT(*) FROM purchases) as compras,
       (SELECT COUNT(*) FROM documents) as documentos,
       (SELECT COUNT(*) FROM feed_logs) as logs,
       (SELECT COUNT(*) FROM risks) as riscos;
