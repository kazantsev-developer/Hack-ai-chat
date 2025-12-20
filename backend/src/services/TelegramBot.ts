import TelegramBot from "node-telegram-bot-api";
import { ChatService } from "./ChatService.js";
import { authService } from "./AuthService.js";
import db from "../database/db.js";

export class TelegramBotService {
  private bot: TelegramBot | null = null;
  private chatService: ChatService;
  private userSessions: Map<number, string> = new Map();

  constructor(chatService: ChatService) {
    this.chatService = chatService;
    this.initialize();
  }

  private initialize() {
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
      console.log(
        "Telegram bot token not configured, skipping bot initialization"
      );
      return;
    }

    try {
      this.bot = new TelegramBot(token, { polling: true });
      this.setupHandlers();
      console.log("Telegram bot initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Telegram bot:", error);
    }
  }

  private setupHandlers() {
    if (!this.bot) return;

    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      const telegramUsername = msg.from?.username;

      if (telegramUsername) {
        const existingUser = authService.getUserByTelegramChatId(chatId);
        if (!existingUser) {
          try {
            const userId = await authService.createUserFromTelegram(
              telegramUsername,
              chatId
            );
            console.log(
              `✓ Новый пользователь зарегистрирован через Telegram: @${telegramUsername} (ID: ${userId})`
            );
            this.bot?.sendMessage(
              chatId,
              `Привет! 👋\n\n✅ Вы успешно зарегистрированы!\n\nЯ AI ассистент. Задайте мне любой вопрос!`
            );
          } catch (error) {
            console.error("Ошибка регистрации через Telegram:", error);
            this.bot?.sendMessage(
              chatId,
              "Привет! Я AI ассистент. Задайте мне любой вопрос!"
            );
          }
        } else {
          this.bot?.sendMessage(
            chatId,
            "Привет! Я AI ассистент. Задайте мне любой вопрос!"
          );
        }
      } else {
        this.bot?.sendMessage(
          chatId,
          "Привет! Я AI ассистент. Задайте мне любой вопрос!"
        );
      }
    });

    this.bot.onText(/\/help/, (msg) => {
      const chatId = msg.chat.id;
      this.bot?.sendMessage(
        chatId,
        "Доступные команды:\n" +
          "/start - Начать диалог\n" +
          "/help - Показать помощь\n" +
          "/clear - Очистить историю\n" +
          "/agent [название] - Сменить агента\n" +
          "/link [код] - Привязать Telegram к аккаунту\n\n" +
          "Просто напишите сообщение для общения с AI!"
      );
    });

    this.bot.onText(/\/clear/, (msg) => {
      const chatId = msg.chat.id;
      const sessionId = this.getOrCreateSession(chatId);
      this.chatService.clearSession(sessionId);
      this.bot?.sendMessage(chatId, "История диалога очищена!");
    });

    this.bot.onText(/\/link (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const userId = parseInt(match?.[1] || "0");

      if (!userId || isNaN(userId)) {
        this.bot?.sendMessage(
          chatId,
          "Использование: /link <user_id>\n\nПосле регистрации на сайте через SMS или Email, вы получите ваш User ID. Используйте его для привязки Telegram аккаунта."
        );
        return;
      }

      try {
        const username = msg.from?.username || `user_${chatId}`;
        const success = await authService.linkTelegram(
          userId,
          username,
          chatId
        );

        if (success) {
          this.bot?.sendMessage(
            chatId,
            `✅ Ваш Telegram аккаунт (@${username}) успешно привязан! Теперь вы можете входить через Telegram, используя ваш username.`
          );
        } else {
          this.bot?.sendMessage(
            chatId,
            "❌ Ошибка привязки. Проверьте правильность User ID."
          );
        }
      } catch (error) {
        console.error("Error linking Telegram:", error);
        this.bot?.sendMessage(
          chatId,
          "Произошла ошибка при привязке аккаунта."
        );
      }
    });

    this.bot.onText(/\/agent (.+)/, (msg, match) => {
      const chatId = msg.chat.id;
      const agentName = match?.[1];

      if (!agentName) {
        this.bot?.sendMessage(chatId, "Укажите название агента");
        return;
      }

      const agentMap: Record<string, string> = {
        общий: "default",
        поддержка: "support",
        копирайтер: "copywriter",
        аналитик: "analyst",
        программист: "coder",
      };

      const agentId = agentMap[agentName.toLowerCase()] || "default";
      const sessionId = this.getOrCreateSession(chatId);
      this.chatService.switchAgent(sessionId, agentId);

      this.bot?.sendMessage(chatId, `Агент изменен на: ${agentName}`);
    });

    this.bot.on("message", async (msg) => {
      if (msg.text?.startsWith("/")) return;

      const chatId = msg.chat.id;
      const text = msg.text;
      const telegramUsername = msg.from?.username;

      if (!text) return;

      try {
        if (telegramUsername) {
          const existingUser = authService.getUserByTelegramChatId(chatId);
          if (!existingUser) {
            try {
              const userId = await authService.createUserFromTelegram(
                telegramUsername,
                chatId
              );
              console.log(
                `✓ Новый пользователь зарегистрирован через Telegram: @${telegramUsername} (ID: ${userId})`
              );
            } catch (error) {
              console.error("Ошибка регистрации через Telegram:", error);
            }
          } else if (!existingUser.telegram_username) {
            const username = telegramUsername.replace("@", "").trim();
            db.prepare(
              `
              UPDATE users 
              SET telegram_username = ?, updated_at = datetime('now')
              WHERE id = ?
            `
            ).run(username, existingUser.id);
          }
        }

        const sessionId = this.getOrCreateSession(chatId);
        const typingMessage = await this.bot?.sendMessage(chatId, "Печатаю...");

        const mockSocket = {
          emit: (event: string, data: any) => {
            if (event === "chat:stream" && data.done) {
              this.bot?.deleteMessage(chatId, typingMessage?.message_id || 0);
              this.bot?.sendMessage(chatId, data.fullMessage || "");
            }
          },
        };

        await this.chatService.handleStreamingMessage(mockSocket as any, {
          message: text,
          sessionId,
          modelId: "gpt-3.5-turbo",
          agentId: "default",
        });
      } catch (error) {
        console.error("Telegram bot error:", error);
        this.bot?.sendMessage(
          chatId,
          "Произошла ошибка при обработке сообщения"
        );
      }
    });
  }

  private getOrCreateSession(chatId: number): string {
    let sessionId = this.userSessions.get(chatId);
    if (!sessionId) {
      sessionId = `telegram_${chatId}_${Date.now()}`;
      this.userSessions.set(chatId, sessionId);
    }
    return sessionId;
  }

  isConfigured(): boolean {
    return this.bot !== null;
  }
}
