export interface AgentMessage {
  payload: any;
  action?: string;   // Adicionado: Necessário para os agentes
  sender?: string;
  topic?: string;
}

export class AgentOrchestrator {
  constructor(config?: any) { // Aceita argumento se o index.ts passar um
    // Initialization code
  }

  // Método exigido pelo src/index.ts
  async start(): Promise<void> {
    console.log("Orchestrator started");
  }

  // Método exigido por quase todos os agentes
  logToFeed(message: string, agentName: string): void {
    console.log(`[${agentName}]: ${message}`);
  }

  // Método exigido para comunicação em massa
  broadcast(message: AgentMessage): void {
    console.log("Broadcasting message:", message.action);
  }

  // Método exigido para envio direcionado
  routeMessage(target: string, message: AgentMessage): void {
    console.log(`Routing message to ${target}`);
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
