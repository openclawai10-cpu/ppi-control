// Defina a interface que os agentes estão tentando importar
export interface AgentMessage {
  payload: any;
  sender?: string;
  topic?: string;
}

// Renomeie para AgentOrchestrator para bater com os imports dos agentes
export class AgentOrchestrator {
  constructor() {
    // Initialization code
  }

  // Adicione tipagem aos parâmetros para evitar novos erros de compilação
  validateMessage(message: AgentMessage): boolean {
    return message && typeof message.payload !== 'undefined';
  }

  processMessage(message: AgentMessage): void {
    if (!this.validateMessage(message)) {
      throw new Error('Invalid message: payload is undefined');
    }
    const payload = message.payload;
    // Process the payload
  }
}
