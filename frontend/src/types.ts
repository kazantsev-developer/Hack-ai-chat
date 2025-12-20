export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: Date;
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
