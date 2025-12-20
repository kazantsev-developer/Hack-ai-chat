import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import chatRoutes, { chatService } from "./routes/chat.js";
import agentRoutes from "./routes/agents.js";
import modelsRoutes from "./routes/models.js";
import ttsRoutes from "./routes/tts.js";
import ticketsRoutes from "./routes/tickets.js";
import ragRoutes from "./routes/rag.js";
import authRoutes from "./routes/auth.js";
import { TelegramBotService } from "./services/TelegramBot.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
  })
);
app.use(express.json());

app.use("/api/chat", chatRoutes);
app.use("/api/agents", agentRoutes);
app.use("/api/models", modelsRoutes);
app.use("/api/tts", ttsRoutes);
app.use("/api/tickets", ticketsRoutes);
app.use("/api/rag", ragRoutes);
app.use("/api/auth", authRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("chat:message", async (data) => {
    console.log("Received message:", data);
    await chatService().handleStreamingMessage(socket, data);
  });

  socket.on("chat:stop", (data: { sessionId: string }) => {
    console.log("Stop requested for session:", data.sessionId);
    chatService().handleStop(data.sessionId);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5001;

const telegramBot = new TelegramBotService(chatService());

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket ready`);
  console.log(
    `Frontend: ${process.env.FRONTEND_URL || "http://localhost:5173"}`
  );

  if (
    !process.env.OPENAI_API_KEY &&
    !process.env.ANTHROPIC_API_KEY &&
    !process.env.GROQ_API_KEY &&
    !process.env.OPENROUTER_API_KEY
  ) {
    console.warn("Warning: No LLM API keys configured");
  } else {
    if (process.env.OPENAI_API_KEY) console.log("OpenAI configured");
    if (process.env.ANTHROPIC_API_KEY) console.log("Anthropic configured");
    if (process.env.GROQ_API_KEY) console.log("Groq configured");
    if (process.env.OPENROUTER_API_KEY) console.log("OpenRouter configured");
    if (process.env.OLLAMA_BASE_URL) console.log("Ollama configured");
  }

  if (telegramBot.isConfigured()) {
    console.log("Telegram bot configured");
  }

  if (process.env.ELEVENLABS_API_KEY) {
    console.log("ElevenLabs TTS configured");
  }
});
