import db from "../database/db.js";
import { emailService } from "./EmailService.js";
import { smsService } from "./SMSService.js";

function generateCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, "");
  return cleaned.length >= 10 && cleaned.length <= 15;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export class AuthService {
  async requestSMSCode(
    phone: string,
    language: "ru" | "en" = "ru"
  ): Promise<{ success: boolean; message: string; code?: string }> {
    if (!isValidPhone(phone)) {
      return {
        success: false,
        message:
          language === "ru"
            ? "Неверный формат номера телефона"
            : "Invalid phone number format",
      };
    }

    const cleanedPhone = phone.replace(/\D/g, "");
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    db.exec(`
      DELETE FROM verification_codes 
      WHERE user_identifier = ? AND type = 'sms' AND used = 0 AND expires_at < datetime('now')
    `);

    db.prepare(
      `
      INSERT INTO verification_codes (user_identifier, code, type, expires_at)
      VALUES (?, ?, 'sms', ?)
    `
    ).run(cleanedPhone, code, expiresAt.toISOString());

    const sent = await smsService.sendVerificationCode(phone, code, language);

    if (sent) {
      const isMock = !process.env.SMS_API_KEY || !process.env.SMS_API_URL;
      return {
        success: true,
        message:
          language === "ru"
            ? isMock
              ? `Код отправлен (SMS не настроен, код: ${code})`
              : "Код отправлен на ваш номер телефона"
            : isMock
            ? `Code sent (SMS not configured, code: ${code})`
            : "Code sent to your phone number",
        code: isMock ? code : undefined,
      };
    } else {
      return {
        success: false,
        message:
          language === "ru" ? "Ошибка отправки SMS" : "SMS sending error",
      };
    }
  }

  async requestEmailCode(
    email: string,
    language: "ru" | "en" = "ru"
  ): Promise<{ success: boolean; message: string; code?: string }> {
    if (!isValidEmail(email)) {
      return {
        success: false,
        message:
          language === "ru" ? "Неверный формат email" : "Invalid email format",
      };
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    db.exec(`
      DELETE FROM verification_codes 
      WHERE user_identifier = ? AND type = 'email' AND used = 0 AND expires_at < datetime('now')
    `);

    db.prepare(
      `
      INSERT INTO verification_codes (user_identifier, code, type, expires_at)
      VALUES (?, ?, 'email', ?)
    `
    ).run(email.toLowerCase(), code, expiresAt.toISOString());

    const sent = await emailService.sendVerificationCode(email, code, language);

    if (sent) {
      const isMock =
        !process.env.SMTP_HOST ||
        !process.env.SMTP_USER ||
        !process.env.SMTP_PASS;
      return {
        success: true,
        message:
          language === "ru"
            ? isMock
              ? `Код отправлен. Проверьте консоль сервера или настройте SMTP. Код: ${code}`
              : "Код отправлен на ваш email"
            : isMock
            ? `Code sent. Check server console or configure SMTP. Code: ${code}`
            : "Code sent to your email",
        code: isMock ? code : undefined,
      };
    } else {
      return {
        success: false,
        message:
          language === "ru" ? "Ошибка отправки email" : "Email sending error",
      };
    }
  }

  async verifySMSCode(
    phone: string,
    code: string,
    telegramUsername?: string
  ): Promise<{ success: boolean; userId?: number; message: string }> {
    const cleanedPhone = phone.replace(/\D/g, "");

    const verification = db
      .prepare(
        `
      SELECT * FROM verification_codes
      WHERE user_identifier = ? AND code = ? AND type = 'sms' AND used = 0 AND expires_at > datetime('now')
      ORDER BY created_at DESC
      LIMIT 1
    `
      )
      .get(cleanedPhone, code) as any;

    if (!verification) {
      return {
        success: false,
        message: "Неверный или истекший код",
      };
    }

    db.prepare(`UPDATE verification_codes SET used = 1 WHERE id = ?`).run(
      verification.id
    );

    let user = db
      .prepare(`SELECT * FROM users WHERE phone = ?`)
      .get(cleanedPhone) as any;

    if (!user) {
      const result = db
        .prepare(
          `
        INSERT INTO users (phone, created_at, updated_at)
        VALUES (?, datetime('now'), datetime('now'))
      `
        )
        .run(cleanedPhone);
      user = { id: result.lastInsertRowid, phone: cleanedPhone };
    }

    if (telegramUsername) {
      const username = telegramUsername.replace("@", "").trim();
      if (username) {
        db.prepare(
          `
          UPDATE users 
          SET telegram_username = ?, updated_at = datetime('now')
          WHERE id = ?
        `
        ).run(username, user.id);
      }
    }

    return {
      success: true,
      userId: user.id,
      message: "Успешная авторизация",
    };
  }

  async verifyEmailCode(
    email: string,
    code: string,
    telegramUsername?: string
  ): Promise<{ success: boolean; userId?: number; message: string }> {
    const normalizedEmail = email.toLowerCase();

    const verification = db
      .prepare(
        `
      SELECT * FROM verification_codes
      WHERE user_identifier = ? AND code = ? AND type = 'email' AND used = 0 AND expires_at > datetime('now')
      ORDER BY created_at DESC
      LIMIT 1
    `
      )
      .get(normalizedEmail, code) as any;

    if (!verification) {
      return {
        success: false,
        message: "Неверный или истекший код",
      };
    }

    db.prepare(`UPDATE verification_codes SET used = 1 WHERE id = ?`).run(
      verification.id
    );

    let user = db
      .prepare(`SELECT * FROM users WHERE email = ?`)
      .get(normalizedEmail) as any;

    if (!user) {
      const result = db
        .prepare(
          `
        INSERT INTO users (email, created_at, updated_at)
        VALUES (?, datetime('now'), datetime('now'))
      `
        )
        .run(normalizedEmail);
      user = { id: result.lastInsertRowid, email: normalizedEmail };
    }

    if (telegramUsername) {
      const username = telegramUsername.replace("@", "").trim();
      if (username) {
        db.prepare(
          `
          UPDATE users 
          SET telegram_username = ?, updated_at = datetime('now')
          WHERE id = ?
        `
        ).run(username, user.id);
      }
    }

    return {
      success: true,
      userId: user.id,
      message: "Успешная авторизация",
    };
  }

  async linkTelegram(
    userId: number,
    telegramUsername: string,
    telegramChatId?: number
  ): Promise<boolean> {
    try {
      db.prepare(
        `
        UPDATE users 
        SET telegram_username = ?, telegram_chat_id = ?, updated_at = datetime('now')
        WHERE id = ?
      `
      ).run(telegramUsername.replace("@", ""), telegramChatId || null, userId);
      return true;
    } catch (error) {
      console.error("Ошибка привязки Telegram:", error);
      return false;
    }
  }

  async loginWithTelegram(
    telegramUsername: string,
    telegramChatId?: number
  ): Promise<{ success: boolean; userId?: number; message: string }> {
    const username = telegramUsername.replace("@", "").trim();
    let user = db
      .prepare(`SELECT * FROM users WHERE telegram_username = ?`)
      .get(username) as any;

    if (!user) {
      if (telegramChatId) {
        const userId = await this.createUserFromTelegram(
          telegramUsername,
          telegramChatId
        );
        return {
          success: true,
          userId,
          message: "Успешная регистрация и авторизация",
        };
      } else {
        return {
          success: false,
          message:
            "Пользователь не найден. Отправьте сообщение боту для автоматической регистрации.",
        };
      }
    }

    if (telegramChatId && !user.telegram_chat_id) {
      db.prepare(
        `
        UPDATE users 
        SET telegram_chat_id = ?, updated_at = datetime('now')
        WHERE id = ?
      `
      ).run(telegramChatId, user.id);
    }

    return {
      success: true,
      userId: user.id,
      message: "Успешная авторизация",
    };
  }

  async createUserFromTelegram(
    telegramUsername: string,
    telegramChatId: number
  ): Promise<number> {
    const username = telegramUsername.replace("@", "").trim();
    if (!username) {
      throw new Error("Telegram username is required");
    }

    const existingUser = db
      .prepare(`SELECT * FROM users WHERE telegram_username = ?`)
      .get(username) as any;

    if (existingUser) {
      if (!existingUser.telegram_chat_id) {
        db.prepare(
          `
          UPDATE users 
          SET telegram_chat_id = ?, updated_at = datetime('now')
          WHERE id = ?
        `
        ).run(telegramChatId, existingUser.id);
      }
      return existingUser.id;
    }

    const result = db
      .prepare(
        `
      INSERT INTO users (telegram_username, telegram_chat_id, created_at, updated_at)
      VALUES (?, ?, datetime('now'), datetime('now'))
    `
      )
      .run(username, telegramChatId);

    return result.lastInsertRowid as number;
  }

  getUserByTelegramUsername(telegramUsername: string): any {
    const username = telegramUsername.replace("@", "").trim();
    return db
      .prepare(`SELECT * FROM users WHERE telegram_username = ?`)
      .get(username);
  }

  getUserByTelegramChatId(chatId: number): any {
    return db
      .prepare(`SELECT * FROM users WHERE telegram_chat_id = ?`)
      .get(chatId);
  }

  getUserById(userId: number): any {
    return db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId);
  }
}

export const authService = new AuthService();
