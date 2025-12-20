import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    if (
      process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
    ) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else {
      console.warn("SMTP не настроен. Email коды будут выводиться в консоль.");
    }
  }

  async sendVerificationCode(
    email: string,
    code: string,
    language: "ru" | "en" = "ru"
  ): Promise<boolean> {
    const translations = {
      ru: {
        subject: "Код подтверждения для входа",
        text: `Ваш код подтверждения: ${code}\n\nКод действителен в течение 10 минут.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #5f7367;">Код подтверждения</h2>
            <p>Ваш код для входа в систему:</p>
            <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; border-radius: 10px;">
              ${code}
            </div>
            <p style="color: #666; font-size: 14px;">Код действителен в течение 10 минут.</p>
          </div>
        `,
      },
      en: {
        subject: "Verification code for login",
        text: `Your verification code: ${code}\n\nCode is valid for 10 minutes.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #5f7367;">Verification Code</h2>
            <p>Your login code:</p>
            <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; border-radius: 10px;">
              ${code}
            </div>
            <p style="color: #666; font-size: 14px;">Code is valid for 10 minutes.</p>
          </div>
        `,
      },
    };

    const t = translations[language];

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: email,
          subject: t.subject,
          text: t.text,
          html: t.html,
        });
        return true;
      } catch (error) {
        console.error("Ошибка отправки email:", error);
        return false;
      }
    } else {
      console.log(`[EMAIL MOCK] Отправка кода ${code} на ${email}`);
      console.log(`[EMAIL MOCK] ${t.text}`);
      return true;
    }
  }
}

export const emailService = new EmailService();
