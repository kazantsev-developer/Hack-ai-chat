import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

class SMSService {
  async sendVerificationCode(
    phone: string,
    code: string,
    language: "ru" | "en" = "ru"
  ): Promise<boolean> {
    const message =
      language === "ru"
        ? `Ваш код подтверждения: ${code}. Действителен 10 минут.`
        : `Your verification code: ${code}. Valid for 10 minutes.`;

    if (process.env.SMS_API_KEY && process.env.SMS_API_URL) {
      try {
        const response = await axios.post(process.env.SMS_API_URL, {
          api_key: process.env.SMS_API_KEY,
          phone,
          message,
        });
        return response.status === 200;
      } catch (error) {
        console.error("Ошибка отправки SMS:", error);
        return false;
      }
    } else {
      console.log(`[SMS MOCK] Отправка кода ${code} на ${phone}`);
      console.log(`[SMS MOCK] ${message}`);
      return true;
    }
  }
}

export const smsService = new SMSService();
