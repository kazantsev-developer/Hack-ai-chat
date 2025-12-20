import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { Message } from "../types/index.js";

export interface LLMConfig {
  apiKey: string;
  model: string;
  provider:
    | "openai"
    | "anthropic"
    | "groq"
    | "gemini"
    | "ollama"
    | "deepseek"
    | "openrouter";
}

export class LLMProvider {
  private openai: OpenAI | null = null;
  private anthropic: Anthropic | null = null;
  private groq: OpenAI | null = null;
  private ollama: OpenAI | null = null;
  private deepseek: OpenAI | null = null;
  private openrouter: OpenAI | null = null;
  private models: Map<string, LLMConfig> = new Map();

  constructor() {
    if (process.env.OPENROUTER_API_KEY) {
      this.openrouter = new OpenAI({
        apiKey: process.env.OPENROUTER_API_KEY,
        baseURL: "https://openrouter.ai/api/v1",
      });

      this.models.set("qwen-2.5-72b", {
        apiKey: process.env.OPENROUTER_API_KEY,
        model: "qwen/qwen-2.5-72b-instruct",
        provider: "openrouter",
      });
      this.models.set("mistral-7b", {
        apiKey: process.env.OPENROUTER_API_KEY,
        model: "mistralai/mistral-7b-instruct:free",
        provider: "openrouter",
      });
    }

    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      this.models.set("gpt-4", {
        apiKey: process.env.OPENAI_API_KEY,
        model: "gpt-4",
        provider: "openai",
      });
      this.models.set("gpt-3.5-turbo", {
        apiKey: process.env.OPENAI_API_KEY,
        model: "gpt-3.5-turbo",
        provider: "openai",
      });
      this.models.set("gpt-4-turbo", {
        apiKey: process.env.OPENAI_API_KEY,
        model: "gpt-4-turbo-preview",
        provider: "openai",
      });
    }

    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      this.models.set("claude-3-opus", {
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: "claude-3-opus-20240229",
        provider: "anthropic",
      });
      this.models.set("claude-3-sonnet", {
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: "claude-3-sonnet-20240229",
        provider: "anthropic",
      });
    }

    if (process.env.GROQ_API_KEY) {
      this.groq = new OpenAI({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: "https://api.groq.com/openai/v1",
      });

      this.models.set("llama3-70b", {
        apiKey: process.env.GROQ_API_KEY,
        model: "llama3-70b-8192",
        provider: "groq",
      });
      this.models.set("llama3-8b", {
        apiKey: process.env.GROQ_API_KEY,
        model: "llama3-8b-8192",
        provider: "groq",
      });
      this.models.set("mixtral-8x7b", {
        apiKey: process.env.GROQ_API_KEY,
        model: "mixtral-8x7b-32768",
        provider: "groq",
      });
      this.models.set("gemma-7b", {
        apiKey: process.env.GROQ_API_KEY,
        model: "gemma-7b-it",
        provider: "groq",
      });
    }

    if (process.env.OLLAMA_BASE_URL) {
      this.ollama = new OpenAI({
        apiKey: "ollama",
        baseURL: process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1",
      });

      this.models.set("llama3.2", {
        apiKey: "ollama",
        model: "llama3.2:3b",
        provider: "ollama",
      });
      this.models.set("llama3.1", {
        apiKey: "ollama",
        model: "llama3.1:8b",
        provider: "ollama",
      });
      this.models.set("mistral", {
        apiKey: "ollama",
        model: "mistral:7b",
        provider: "ollama",
      });
    }
  }

  async *streamResponse(
    modelId: string,
    systemPrompt: string,
    messages: Message[],
    abortSignal?: AbortSignal
  ): AsyncGenerator<string, void, unknown> {
    const config = this.models.get(modelId);
    if (!config) {
      throw new Error(`Model ${modelId} not found or not configured`);
    }

    if (config.provider === "openrouter") {
      yield* this.streamOpenRouter(
        config.model,
        systemPrompt,
        messages,
        abortSignal
      );
    } else if (config.provider === "openai") {
      yield* this.streamOpenAI(
        config.model,
        systemPrompt,
        messages,
        abortSignal
      );
    } else if (config.provider === "anthropic") {
      yield* this.streamAnthropic(
        config.model,
        systemPrompt,
        messages,
        abortSignal
      );
    } else if (config.provider === "groq") {
      yield* this.streamGroq(config.model, systemPrompt, messages, abortSignal);
    } else if (config.provider === "ollama") {
      yield* this.streamOllama(
        config.model,
        systemPrompt,
        messages,
        abortSignal
      );
    } else if (config.provider === "gemini") {
      yield* this.streamGemini(
        config.model,
        systemPrompt,
        messages,
        abortSignal
      );
    } else {
      throw new Error(`Unsupported provider: ${config.provider}`);
    }
  }

  private async *streamOpenRouter(
    model: string,
    systemPrompt: string,
    messages: Message[],
    abortSignal?: AbortSignal
  ): AsyncGenerator<string, void, unknown> {
    if (!this.openrouter) {
      throw new Error("OpenRouter not configured");
    }

    const formattedMessages: Array<{
      role: "system" | "user" | "assistant";
      content: string;
    }> = [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    const stream = await this.openrouter.chat.completions.create({
      model,
      messages: formattedMessages,
      stream: true,
    });

    try {
      for await (const chunk of stream) {
        if (abortSignal?.aborted) {
          break;
        }
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      if (abortSignal?.aborted) {
        return;
      }
      throw error;
    }
  }

  private async *streamOpenAI(
    model: string,
    systemPrompt: string,
    messages: Message[],
    abortSignal?: AbortSignal
  ): AsyncGenerator<string, void, unknown> {
    if (!this.openai) {
      throw new Error("OpenAI not configured");
    }

    const formattedMessages: Array<{
      role: "system" | "user" | "assistant";
      content: string;
    }> = [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    const stream = await this.openai.chat.completions.create({
      model,
      messages: formattedMessages,
      stream: true,
    });

    try {
      for await (const chunk of stream) {
        if (abortSignal?.aborted) {
          break;
        }
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      if (abortSignal?.aborted) {
        return;
      }
      throw error;
    }
  }

  private async *streamAnthropic(
    model: string,
    systemPrompt: string,
    messages: Message[],
    abortSignal?: AbortSignal
  ): AsyncGenerator<string, void, unknown> {
    if (!this.anthropic) {
      throw new Error("Anthropic not configured");
    }

    const formattedMessages = messages.map((m) => ({
      role: m.role === "user" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    }));

    try {
      const stream = await (this.anthropic as any).messages.create({
        model,
        system: systemPrompt,
        messages: formattedMessages,
        max_tokens: 4096,
        stream: true,
      });

      for await (const chunk of stream) {
        if (abortSignal?.aborted) {
          break;
        }
        if (
          chunk.type === "content_block_delta" &&
          chunk.delta?.type === "text_delta"
        ) {
          yield chunk.delta.text;
        }
      }
    } catch (error) {
      if (abortSignal?.aborted) {
        return;
      }
      console.error("Anthropic streaming error:", error);
      throw error;
    }
  }

  private async *streamGroq(
    model: string,
    systemPrompt: string,
    messages: Message[],
    abortSignal?: AbortSignal
  ): AsyncGenerator<string, void, unknown> {
    if (!this.groq) {
      throw new Error("Groq not configured");
    }

    const formattedMessages: Array<{
      role: "system" | "user" | "assistant";
      content: string;
    }> = [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    const stream = await this.groq.chat.completions.create({
      model,
      messages: formattedMessages,
      stream: true,
      temperature: 0.7,
      max_tokens: 8192,
    });

    try {
      for await (const chunk of stream) {
        if (abortSignal?.aborted) {
          break;
        }
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      if (abortSignal?.aborted) {
        return;
      }
      throw error;
    }
  }

  private async *streamOllama(
    model: string,
    systemPrompt: string,
    messages: Message[],
    abortSignal?: AbortSignal
  ): AsyncGenerator<string, void, unknown> {
    if (!this.ollama) {
      throw new Error("Ollama not configured");
    }

    const formattedMessages: Array<{
      role: "system" | "user" | "assistant";
      content: string;
    }> = [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    const stream = await this.ollama.chat.completions.create({
      model,
      messages: formattedMessages,
      stream: true,
    });

    try {
      for await (const chunk of stream) {
        if (abortSignal?.aborted) {
          break;
        }
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      if (abortSignal?.aborted) {
        return;
      }
      throw error;
    }
  }

  private async *streamGemini(
    model: string,
    systemPrompt: string,
    messages: Message[],
    abortSignal?: AbortSignal
  ): AsyncGenerator<string, void, unknown> {
    throw new Error(
      "Gemini support coming soon - install @google/generative-ai"
    );
  }

  getAvailableModels(): Array<{ id: string; name: string; provider: string }> {
    return Array.from(this.models.entries()).map(([id, config]) => {
      let name = id;

      if (id === "qwen-2.5-72b") {
        name = "Qwen 2.5 72B";
      } else if (id === "mistral-7b") {
        name = "Mistral 7B";
      }

      return {
        id,
        name,
        provider: config.provider,
      };
    });
  }
}
