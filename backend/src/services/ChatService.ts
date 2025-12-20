import { Socket } from "socket.io";
import { LLMProvider } from "../models/LLMProvider.js";
import { AgentManager } from "../agents/AgentManager.js";
import { TicketService } from "./TicketService.js";
import { RAGService } from "./RAGService.js";
import { Message, ChatSession } from "../types/index.js";

interface StreamController {
  abortController: AbortController;
  isAborted: boolean;
}

export class ChatService {
  private sessions: Map<string, ChatSession> = new Map();
  private documentIds: Map<string, string> = new Map();
  private activeStreams: Map<string, StreamController> = new Map();
  private llmProvider: LLMProvider;
  private agentManager: AgentManager;
  private ticketService: TicketService;
  private ragService: RAGService;

  constructor() {
    this.llmProvider = new LLMProvider();
    this.agentManager = new AgentManager();
    this.ticketService = new TicketService();
    this.ragService = RAGService.getInstance();
    this.ragService.setLLMProvider(this.llmProvider);
  }

  async handleStreamingMessage(
    socket: Socket,
    data: {
      message: string;
      sessionId: string;
      modelId: string;
      agentId?: string;
    }
  ): Promise<void> {
    const { message, sessionId, modelId, agentId } = data;

    const streamController: StreamController = {
      abortController: new AbortController(),
      isAborted: false,
    };
    this.activeStreams.set(sessionId, streamController);

    try {
      let session = this.sessions.get(sessionId);
      if (!session) {
        const savedDocumentId = this.documentIds.get(sessionId);
        session = {
          id: sessionId,
          messages: [],
          agentId: agentId || "default",
          modelId,
          documentId: savedDocumentId,
        };
        this.sessions.set(sessionId, session);
        console.log(
          `Created new session ${sessionId} with documentId: ${
            session.documentId || "none"
          }`
        );

        const ticket = await this.ticketService.createTicket(
          sessionId,
          message
        );
        session.ticketId = ticket.id;
        session.agentId = ticket.assignedAgent;
      } else {
        const savedDocumentId = this.documentIds.get(sessionId);
        if (savedDocumentId && !session.documentId) {
          session.documentId = savedDocumentId;
        }
        console.log(
          `Using existing session ${sessionId} with documentId: ${
            session.documentId || "none"
          }`
        );
        if (agentId && session.agentId !== agentId) {
          session.agentId = agentId;
        }
        if (session.modelId !== modelId) {
          session.modelId = modelId;
        }
      }

      const userMessage: Message = {
        role: "user",
        content: message,
        timestamp: new Date(),
      };
      session.messages.push(userMessage);

      const agent = this.agentManager.getAgent(session.agentId);
      let systemPrompt = agent?.systemPrompt || "You are a helpful assistant.";

      let responseText = "";
      let useRAG = false;

      if (session.documentId) {
        console.log(
          `[RAG] Using document ${session.documentId} for query: ${message}`
        );
        try {
          const allDocuments = this.ragService.getDocuments();
          console.log(`[RAG] All documents in RAG: ${allDocuments.join(", ")}`);
          console.log(`[RAG] Looking for document: ${session.documentId}`);

          const hasDocument = this.ragService.hasDocument(session.documentId);
          if (!hasDocument) {
            console.warn(
              `[RAG] Document ${session.documentId} not found in RAG service`
            );
            console.warn(
              `[RAG] Available documents: ${allDocuments.join(", ")}`
            );
            responseText = `Ошибка: Документ с ID ${
              session.documentId
            } не найден в системе. Доступные документы: ${
              allDocuments.length > 0 ? allDocuments.join(", ") : "нет"
            }. Пожалуйста, загрузите документ заново.`;
            useRAG = true;
          } else {
            console.log(`[RAG] Document found, querying...`);
            responseText = await this.ragService.queryWithContext(
              session.documentId,
              message,
              modelId
            );
            console.log(
              `[RAG] Response received, length: ${responseText.length}`
            );
            if (responseText.length === 0) {
              console.warn(`[RAG] Empty response from RAG service`);
              responseText =
                "Не удалось получить ответ на основе документа. Попробуйте переформулировать вопрос.";
              useRAG = true;
            } else {
              useRAG = true;
            }
          }
        } catch (error) {
          console.error("[RAG] Query error:", error);
          console.error(
            "[RAG] Error details:",
            error instanceof Error ? error.stack : String(error)
          );
          responseText = `Ошибка при обработке документа: ${
            error instanceof Error ? error.message : String(error)
          }. Попробуйте загрузить документ заново.`;
          useRAG = true;
        }
      } else {
        console.log(`[RAG] No documentId in session ${sessionId}`);
      }

      let stream;
      if (useRAG && responseText) {
        const chunks = responseText.split("");
        stream = (async function* () {
          for (const chunk of chunks) {
            if (
              streamController.isAborted ||
              streamController.abortController.signal.aborted
            )
              break;
            yield chunk;
            await new Promise((resolve) => setTimeout(resolve, 10));
          }
        })();
      } else {
        try {
          const availableModels = this.llmProvider.getAvailableModels();
          let actualModelId = modelId;

          if (availableModels.length === 0) {
            throw new Error(
              "Нет доступных моделей. Настройте API ключи в .env файле."
            );
          }

          const modelExists = availableModels.find((m) => m.id === modelId);
          if (!modelExists) {
            actualModelId = availableModels[0].id;
            console.warn(
              `[Chat] Model ${modelId} not found, using first available: ${actualModelId}`
            );
          }

          stream = this.llmProvider.streamResponse(
            actualModelId,
            systemPrompt,
            session.messages,
            streamController.abortController.signal
          );
        } catch (error) {
          console.error("[Chat] LLM error:", error);
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          throw new Error(`Ошибка при генерации ответа: ${errorMessage}`);
        }
      }

      let fullResponse = "";
      try {
        for await (const chunk of stream) {
          if (streamController.isAborted) {
            console.log(`[Chat] Stream aborted for session ${sessionId}`);
            break;
          }
          fullResponse += chunk;
          socket.emit("chat:stream", {
            sessionId,
            chunk,
            done: false,
          });
        }
      } catch (error) {
        if (!streamController.isAborted) {
          throw error;
        }
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: fullResponse,
        timestamp: new Date(),
      };
      session.messages.push(assistantMessage);

      if (!streamController.isAborted) {
        socket.emit("chat:stream", {
          sessionId,
          chunk: "",
          done: true,
          fullMessage: fullResponse,
        });
      }
    } catch (error) {
      if (!streamController.isAborted) {
        console.error("Error in handleStreamingMessage:", error);
        socket.emit("chat:error", {
          sessionId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    } finally {
      this.activeStreams.delete(sessionId);
    }
  }

  handleStop(sessionId: string): void {
    const streamController = this.activeStreams.get(sessionId);
    if (streamController) {
      streamController.isAborted = true;
      streamController.abortController.abort();
      console.log(`[Chat] Stream stopped for session ${sessionId}`);
    }
  }

  getSession(sessionId: string): ChatSession | undefined {
    return this.sessions.get(sessionId);
  }

  switchAgent(sessionId: string, agentId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.agentId = agentId;
    return true;
  }

  switchModel(sessionId: string, modelId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.modelId = modelId;
    return true;
  }

  clearSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  createSessionIfNotExists(
    sessionId: string,
    agentId: string,
    modelId: string
  ): boolean {
    if (this.sessions.has(sessionId)) {
      return true;
    }
    const session: ChatSession = {
      id: sessionId,
      messages: [],
      agentId,
      modelId,
    };
    this.sessions.set(sessionId, session);
    return true;
  }

  setDocument(sessionId: string, documentId: string): boolean {
    this.documentIds.set(sessionId, documentId);
    let session = this.sessions.get(sessionId);
    if (!session) {
      session = {
        id: sessionId,
        messages: [],
        agentId: "default",
        modelId: "qwen-2.5-72b",
        documentId,
      };
      this.sessions.set(sessionId, session);
      console.log(`✓ Created session ${sessionId} with document ${documentId}`);
    } else {
      session.documentId = documentId;
      console.log(
        `✓ Document ${documentId} set for existing session ${sessionId}`
      );
    }
    return true;
  }

  clearDocument(sessionId: string): void {
    this.documentIds.delete(sessionId);
    const session = this.sessions.get(sessionId);
    if (session) {
      session.documentId = undefined;
    }
  }

  getTicketService(): TicketService {
    return this.ticketService;
  }
}
