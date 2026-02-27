export interface AgentMessage {
  payload: any;
  action?: string;
  sender?: string;
  topic?: string;
  [key: string]: any; // Permite outras propriedades extras sem erro
}

export class AgentOrchestrator {
  constructor(config?: any) {
    // Inicialização
  }

  async start(): Promise<void> {
    console.log("Orchestrator started");
  }

  // O "?" torna o segundo argumento opcional para evitar o erro TS2554
  logToFeed(message: string, agentName?: string): void {
    console.log(`[${agentName || 'System'}]: ${message}`);
  }

  // Aceita 1 ou 2 argumentos para não quebrar nos agentes
  broadcast(message: AgentMessage, extra?: any): void {
    console.log("Broadcasting:", message.action || 'message');
  }

  // Aceita 1 ou 2 argumentos (target e message)
  routeMessage(target: any, message?: any): void {
    console.log(`Routing to ${target}`);
  }

  validateMessage(message: AgentMessage): boolean {
    return message && typeof message.payload !== 'undefined';
  }

  processMessage(message: AgentMessage): void {
    if (!this.validateMessage(message)) {
      throw new Error('Invalid message: payload is undefined');
    }
  }
}
