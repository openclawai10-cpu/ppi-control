export interface AgentMessage {
    payload: any;
    action?: string;
    sender?: string;
    topic?: string;
    target?: string;
    priority?: number;
    metadata?: Record<string, any>;
    [key: string]: any; // Permite qualquer outra propriedade extra
}

export class AgentOrchestrator {
    private agents: Map<string, any> = new Map();

    constructor(config?: any) {
        // Inicialização flexível para aceitar configs do index.ts
    }

    // Método exigido pelo src/index.ts
    async start(): Promise<void> {
        console.log("🚀 Orchestrator iniciado com sucesso.");
    }

    // Método para os agentes registrarem logs no feed central
    // O '?' garante que aceite 1 ou 2 argumentos (TS2554)
    logToFeed(message: string, agentName?: string): void {
        const timestamp = new Date().toISOString();
        const sender = agentName || 'System';
        console.log(`[${timestamp}] [${sender}]: ${message}`);
    }

    // Método para comunicação em massa (exigido pelo leader e messenger)
    broadcast(message: AgentMessage, sender?: string): void {
        console.log(`📢 Broadcast de ${sender || 'Desconhecido'}: ${message.action}`);
    }

    // Método para envio direcionado (exigido pelo spreadsheet e leader)
    routeMessage(targetOrMessage: any, message?: any): void {
        // Lógica flexível: se receber 2 args é (destino, msg), se 1 é a msg com target interno
        const target = message ? targetOrMessage : targetOrMessage.target;
        console.log(`🎯 Roteando mensagem para: ${target}`);
    }

    // Validação básica de mensagens
    validateMessage(message: AgentMessage): boolean {
        return !!(message && message.payload !== undefined);
    }

    // Processamento genérico
    processMessage(message: AgentMessage): void {
        if (!this.validateMessage(message)) {
            throw new Error('Mensagem inválida: payload ausente.');
        }
        console.log(`Processing: ${message.action}`);
    }
}
