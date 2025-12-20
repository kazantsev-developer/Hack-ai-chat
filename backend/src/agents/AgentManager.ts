import { Agent } from "../types/index.js";

export class AgentManager {
  private agents: Map<string, Agent> = new Map();

  constructor() {
    this.loadDefaultAgents();
  }

  private loadDefaultAgents(): void {
    this.agents.set("default", {
      id: "default",
      name: "Assistant",
      systemPrompt:
        "You are a helpful, friendly AI assistant. Provide clear, accurate, and concise responses.",
      description: "General purpose assistant for any task",
    });

    this.agents.set("support", {
      id: "support",
      name: "Support",
      systemPrompt:
        "You are a customer support specialist. Be polite, empathetic, and solution-oriented. Always prioritize customer satisfaction.",
      description: "Customer support and problem resolution",
    });

    this.agents.set("coder", {
      id: "coder",
      name: "Coder",
      systemPrompt:
        "You are an expert programmer. Help with code, debugging, and technical explanations. Provide clean, efficient solutions.",
      description: "Programming and technical assistance",
    });
  }

  getAgent(agentId: string): Agent | null {
    return this.agents.get(agentId) || null;
  }

  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  createAgent(agent: Omit<Agent, "id">): Agent {
    const id = `custom_${Date.now()}`;
    const newAgent: Agent = { ...agent, id };
    this.agents.set(id, newAgent);
    return newAgent;
  }

  updateAgent(agentId: string, updates: Partial<Agent>): Agent | null {
    const agent = this.agents.get(agentId);
    if (!agent) return null;

    const updated = { ...agent, ...updates, id: agentId };
    this.agents.set(agentId, updated);
    return updated;
  }

  deleteAgent(agentId: string): boolean {
    const defaultAgents = ["default", "support", "coder"];
    if (defaultAgents.includes(agentId)) {
      return false;
    }
    return this.agents.delete(agentId);
  }
}
