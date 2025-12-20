import { LLMProvider } from "../models/LLMProvider.js";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdfParseModule = require("pdf-parse");
const PDFParseClass = pdfParseModule.PDFParse;

const mammothModule = require("mammoth");
const mammoth = mammothModule.default || mammothModule;

interface DocumentChunk {
  content: string;
  pageNumber?: number;
  chunkIndex: number;
}

export class RAGService {
  private static instance: RAGService | null = null;
  private documents: Map<string, DocumentChunk[]> = new Map();
  private llmProvider: LLMProvider | null = null;

  getAvailableModels() {
    if (!this.llmProvider) {
      this.llmProvider = new LLMProvider();
    }
    return this.llmProvider.getAvailableModels();
  }

  setLLMProvider(provider: LLMProvider) {
    this.llmProvider = provider;
  }

  constructor() {
    this.llmProvider = new LLMProvider();
  }

  static getInstance(): RAGService {
    if (!RAGService.instance) {
      RAGService.instance = new RAGService();
    }
    return RAGService.instance;
  }

  async indexDocument(documentId: string, text: string): Promise<void> {
    const chunks = this.chunkText(text, 1000);
    const documentChunks: DocumentChunk[] = chunks.map((content, index) => ({
      content,
      chunkIndex: index,
    }));

    this.documents.set(documentId, documentChunks);
    console.log(`✓ Indexed document: ${documentId} (${chunks.length} chunks)`);
    console.log(`✓ Total documents in RAG: ${this.documents.size}`);
    console.log(
      `✓ Document IDs: ${Array.from(this.documents.keys()).join(", ")}`
    );
  }

  async indexPDF(documentId: string, pdfBuffer: Buffer): Promise<void> {
    try {
      if (!pdfBuffer || pdfBuffer.length === 0) {
        throw new Error("PDF buffer is empty");
      }

      if (!PDFParseClass) {
        throw new Error("PDFParse is not available");
      }

      if (typeof PDFParseClass !== "function") {
        throw new Error(
          `PDFParse is not a function, got: ${typeof PDFParseClass}`
        );
      }

      console.log(
        `[PDF] Starting parse for ${documentId}, buffer size: ${pdfBuffer.length}`
      );

      const parser = new (PDFParseClass as any)({ data: pdfBuffer });
      const result = await parser.getText();

      console.log(
        `[PDF] Parse result type: ${typeof result}, has text: ${!!result?.text}`
      );

      if (!result) {
        throw new Error("PDF parsing returned no result");
      }

      if (!result.text) {
        console.warn(
          `[PDF] Result has no text property, result keys: ${Object.keys(
            result
          ).join(", ")}`
        );
        throw new Error("PDF parsing returned no text");
      }

      const text = result.text;
      console.log(`[PDF] Extracted text length: ${text.length}`);

      if (!text || text.trim().length === 0) {
        console.warn(`[PDF] ${documentId} has no extractable text`);
        this.documents.set(documentId, []);
        return;
      }

      const pages = text.split(/\f/).filter((p: string) => p.trim().length > 0);
      console.log(`[PDF] Split into ${pages.length} pages`);
      const chunks: DocumentChunk[] = [];

      pages.forEach((pageText: string, pageNum: number) => {
        const pageChunks = this.chunkText(pageText, 1000);
        pageChunks.forEach((chunk) => {
          chunks.push({
            content: chunk,
            pageNumber: pageNum + 1,
            chunkIndex: chunks.length,
          });
        });
      });

      this.documents.set(documentId, chunks);
      console.log(
        `✓ Indexed PDF: ${documentId} (${pages.length} pages, ${chunks.length} chunks)`
      );
      console.log(`✓ Total documents in RAG: ${this.documents.size}`);
      console.log(
        `✓ Document IDs: ${Array.from(this.documents.keys()).join(", ")}`
      );
    } catch (error) {
      console.error("PDF parsing error:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to parse PDF: ${errorMessage}`);
    }
  }

  async indexDOCX(documentId: string, docxBuffer: Buffer): Promise<void> {
    try {
      if (!docxBuffer || docxBuffer.length === 0) {
        throw new Error("DOCX buffer is empty");
      }

      if (!mammoth) {
        throw new Error("mammoth is not available");
      }

      const result = await mammoth.extractRawText({ buffer: docxBuffer });
      const text = result.value;

      if (!text || text.trim().length === 0) {
        console.warn(`DOCX ${documentId} has no extractable text`);
        this.documents.set(documentId, []);
        return;
      }

      const chunks = this.chunkText(text, 1000);
      const documentChunks: DocumentChunk[] = chunks.map((content, index) => ({
        content,
        chunkIndex: index,
      }));

      this.documents.set(documentId, documentChunks);
      console.log(`✓ Indexed DOCX: ${documentId} (${chunks.length} chunks)`);
      console.log(`✓ Total documents in RAG: ${this.documents.size}`);
      console.log(
        `✓ Document IDs: ${Array.from(this.documents.keys()).join(", ")}`
      );
    } catch (error) {
      console.error("DOCX parsing error:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to parse DOCX: ${errorMessage}`);
    }
  }

  private chunkText(text: string, chunkSize: number): string[] {
    const chunks: string[] = [];
    const sentences = text.split(/[.!?]+\s+/);
    let currentChunk = "";

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > chunkSize && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += (currentChunk ? " " : "") + sentence;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  async search(
    documentId: string,
    query: string,
    topK: number = 3
  ): Promise<DocumentChunk[]> {
    const chunks = this.documents.get(documentId);
    if (!chunks) {
      throw new Error(`Document ${documentId} not found`);
    }

    if (chunks.length === 0) {
      return [];
    }

    const queryLower = query.toLowerCase();
    const isGeneralQuestion =
      queryLower.includes("суть") ||
      queryLower.includes("суть") ||
      queryLower.includes("о чем") ||
      queryLower.includes("что это") ||
      queryLower.includes("описание") ||
      queryLower.includes("кратко") ||
      queryLower.includes("расскажи") ||
      queryLower.length < 20;

    if (isGeneralQuestion) {
      const totalChunks = Math.min(topK * 2, chunks.length);
      return chunks.slice(0, totalChunks);
    }

    const scoredChunks = chunks.map((chunk) => ({
      chunk,
      score: this.simpleRelevanceScore(query, chunk.content),
    }));

    scoredChunks.sort((a, b) => b.score - a.score);

    const topChunks = scoredChunks.slice(0, topK).map((sc) => sc.chunk);

    if (topChunks.length === 0 || scoredChunks[0].score === 0) {
      return chunks.slice(0, Math.min(topK, chunks.length));
    }

    return topChunks;
  }

  private simpleRelevanceScore(query: string, text: string): number {
    const queryWords = query.toLowerCase().split(/\s+/);
    const textLower = text.toLowerCase();
    let score = 0;

    for (const word of queryWords) {
      if (word.length < 3) continue;
      const occurrences = (textLower.match(new RegExp(word, "g")) || []).length;
      score += occurrences;
    }

    return score;
  }

  async queryWithContext(
    documentId: string,
    question: string,
    modelId: string
  ): Promise<string> {
    if (!this.documents.has(documentId)) {
      throw new Error(`Document ${documentId} not found`);
    }

    const chunks = this.documents.get(documentId);
    if (!chunks || chunks.length === 0) {
      throw new Error(`Document ${documentId} has no content`);
    }

    console.log(
      `Searching in document ${documentId} with ${chunks.length} chunks for: ${question}`
    );

    const relevantChunks = await this.search(documentId, question, 5);

    if (relevantChunks.length === 0) {
      return "В загруженном документе не найдено информации, относящейся к вашему вопросу.";
    }

    console.log(`Found ${relevantChunks.length} relevant chunks`);

    const context = relevantChunks
      .map((chunk, i) => `[Фрагмент ${i + 1}]\n${chunk.content}`)
      .join("\n\n");

    const questionLower = question.toLowerCase();
    const isGeneralQuestion =
      questionLower.includes("суть") ||
      questionLower.includes("о чем") ||
      questionLower.includes("что это") ||
      questionLower.includes("описание") ||
      questionLower.includes("кратко") ||
      questionLower.includes("расскажи");

    const prompt = isGeneralQuestion
      ? `Пользователь загрузил документ и спрашивает о его содержании. Проанализируй следующие фрагменты документа и дай подробный ответ на вопрос пользователя.

Содержание документа:
${context}

Вопрос пользователя: ${question}

Дай развернутый ответ на основе информации из документа. Опиши основное содержание, ключевые моменты и важные детали.`
      : `На основе следующих фрагментов загруженного документа ответь на вопрос пользователя. Используй ТОЛЬКО информацию из документа.

Контекст из документа:
${context}

Вопрос пользователя: ${question}

Ответь на основе информации из документа. Если в документе нет ответа на вопрос, так и скажи.`;

    let fullResponse = "";
    try {
      if (!this.llmProvider) {
        this.llmProvider = new LLMProvider();
      }

      const availableModels = this.llmProvider.getAvailableModels();
      console.log(
        `[RAG] Available models: ${availableModels.map((m) => m.id).join(", ")}`
      );
      console.log(`[RAG] Requested model: ${modelId}`);

      let actualModelId = modelId;
      const modelExists = availableModels.find((m) => m.id === modelId);

      if (!modelExists) {
        if (availableModels.length === 0) {
          throw new Error(
            "Нет доступных моделей. Настройте API ключи в .env файле."
          );
        }
        actualModelId = availableModels[0].id;
        console.warn(
          `[RAG] Model ${modelId} not found, using first available: ${actualModelId}`
        );
      }

      console.log(`[RAG] Using model: ${actualModelId}`);
      const stream = this.llmProvider.streamResponse(
        actualModelId,
        "Ты помощник, отвечающий на вопросы на основе предоставленного контекста.",
        [{ role: "user", content: prompt }]
      );

      for await (const chunk of stream) {
        fullResponse += chunk;
      }
    } catch (error) {
      console.error("[RAG] LLM streaming error:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("not found or not configured")) {
        if (!this.llmProvider) {
          this.llmProvider = new LLMProvider();
        }
        const availableModels = this.llmProvider.getAvailableModels();
        if (availableModels.length > 0) {
          throw new Error(
            `Модель не настроена. Доступные модели: ${availableModels
              .map((m) => m.id)
              .join(", ")}. Выберите одну из них в настройках.`
          );
        } else {
          throw new Error(
            "Нет доступных моделей. Настройте API ключи (OPENROUTER_API_KEY или другие) в .env файле."
          );
        }
      }
      throw new Error(`Ошибка при генерации ответа: ${errorMessage}`);
    }

    return fullResponse;
  }

  getDocuments(): string[] {
    return Array.from(this.documents.keys());
  }

  hasDocument(documentId: string): boolean {
    return this.documents.has(documentId);
  }

  deleteDocument(documentId: string): boolean {
    return this.documents.delete(documentId);
  }
}
