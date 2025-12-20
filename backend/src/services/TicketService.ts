import { Ticket } from "../types/index.js";
import { LLMProvider } from "../models/LLMProvider.js";

export class TicketService {
  private tickets: Map<string, Ticket> = new Map();
  private llmProvider: LLMProvider;

  constructor() {
    this.llmProvider = new LLMProvider();
  }

  async classifyMessage(message: string): Promise<{
    category: Ticket["category"];
    priority: Ticket["priority"];
    suggestedAgent: string;
  }> {
    try {
      const classificationPrompt = `Analyze this user message and classify it:
Message: "${message}"

Respond ONLY with a JSON object in this exact format:
{
  "category": "support" | "sales" | "general" | "technical",
  "priority": "low" | "medium" | "high",
  "suggestedAgent": "support" | "default" | "coder" | "analyst"
}

Classification rules:
- support: customer service issues, complaints, help requests
- sales: pricing, purchase, product inquiries
- technical: bugs, errors, technical problems
- general: casual conversation, general questions

Priority:
- high: urgent issues, system down, critical bugs
- medium: important but not urgent
- low: general questions, feature requests`;

      const models = this.llmProvider.getAvailableModels();
      const modelId = models[0]?.id || "gpt-3.5-turbo";

      let fullResponse = "";
      const stream = this.llmProvider.streamResponse(
        modelId,
        "You are a message classifier. Respond only with valid JSON.",
        [{ role: "user", content: classificationPrompt }]
      );

      for await (const chunk of stream) {
        fullResponse += chunk;
      }

      const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const classification = JSON.parse(jsonMatch[0]);
        return classification;
      }

      return {
        category: "general",
        priority: "medium",
        suggestedAgent: "default",
      };
    } catch (error) {
      console.error("Classification error:", error);
      return {
        category: "general",
        priority: "medium",
        suggestedAgent: "default",
      };
    }
  }

  async createTicket(sessionId: string, firstMessage: string): Promise<Ticket> {
    const classification = await this.classifyMessage(firstMessage);

    const ticket: Ticket = {
      id: `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId,
      category: classification.category,
      priority: classification.priority,
      status: "open",
      assignedAgent: classification.suggestedAgent,
      createdAt: new Date(),
      updatedAt: new Date(),
      summary: firstMessage.substring(0, 100),
    };

    this.tickets.set(ticket.id, ticket);
    console.log(
      `✓ Ticket created: ${ticket.id} [${ticket.category}/${ticket.priority}] → ${ticket.assignedAgent}`
    );

    return ticket;
  }

  getTicket(ticketId: string): Ticket | undefined {
    return this.tickets.get(ticketId);
  }

  getTicketBySession(sessionId: string): Ticket | undefined {
    return Array.from(this.tickets.values()).find(
      (t) => t.sessionId === sessionId
    );
  }

  updateTicketStatus(
    ticketId: string,
    status: Ticket["status"]
  ): Ticket | null {
    const ticket = this.tickets.get(ticketId);
    if (!ticket) return null;

    ticket.status = status;
    ticket.updatedAt = new Date();
    this.tickets.set(ticketId, ticket);

    return ticket;
  }

  getAllTickets(): Ticket[] {
    return Array.from(this.tickets.values());
  }
}
