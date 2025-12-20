export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: Date;
}

export interface ChatSession {
  id: string;
  messages: Message[];
  agentId: string;
  modelId: string;
  ticketId?: string;
  documentId?: string;
}

export interface Agent {
  id: string;
  name: string;
  systemPrompt: string;
  description: string;
}

export interface Model {
  id: string;
  name: string;
  provider: string;
}

export interface Ticket {
  id: string;
  sessionId: string;
  category: "support" | "sales" | "general" | "technical";
  priority: "low" | "medium" | "high";
  status: "open" | "in_progress" | "resolved" | "closed";
  assignedAgent: string;
  createdAt: Date;
  updatedAt: Date;
  summary: string;
}
