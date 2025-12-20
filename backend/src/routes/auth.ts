import express from "express";
import { authService } from "../services/AuthService.js";

const router = express.Router();

router.post("/request-sms-code", async (req, res) => {
  try {
    const { phone, language } = req.body;
    if (!phone) {
      return res
        .status(400)
        .json({ success: false, message: "Phone is required" });
    }
    const result = await authService.requestSMSCode(phone, language || "ru");
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("Error requesting SMS code:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

router.post("/request-email-code", async (req, res) => {
  try {
    const { email, language } = req.body;
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }
    const result = await authService.requestEmailCode(email, language || "ru");
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("Error requesting email code:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

router.post("/verify-sms-code", async (req, res) => {
  try {
    const { phone, code, telegramUsername } = req.body;
    if (!phone || !code) {
      return res
        .status(400)
        .json({ success: false, message: "Phone and code are required" });
    }
    const result = await authService.verifySMSCode(
      phone,
      code,
      telegramUsername
    );
    if (result.success) {
      res.json({
        success: true,
        userId: result.userId,
        message: result.message,
      });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("Error verifying SMS code:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.post("/verify-email-code", async (req, res) => {
  try {
    const { email, code, telegramUsername } = req.body;
    if (!email || !code) {
      return res
        .status(400)
        .json({ success: false, message: "Email and code are required" });
    }
    const result = await authService.verifyEmailCode(
      email,
      code,
      telegramUsername
    );
    if (result.success) {
      res.json({
        success: true,
        userId: result.userId,
        message: result.message,
      });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("Error verifying email code:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.post("/login-telegram", async (req, res) => {
  try {
    const { telegramUsername } = req.body;
    if (!telegramUsername) {
      return res
        .status(400)
        .json({ success: false, message: "Telegram username is required" });
    }
    const result = await authService.loginWithTelegram(telegramUsername);
    if (result.success) {
      res.json({
        success: true,
        userId: result.userId,
        message: result.message,
      });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error("Error logging in with Telegram:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.post("/link-telegram", async (req, res) => {
  try {
    const { userId, telegramUsername, telegramChatId } = req.body;
    if (!userId || !telegramUsername) {
      return res.status(400).json({
        success: false,
        message: "UserId and telegram username are required",
      });
    }
    const success = await authService.linkTelegram(
      userId,
      telegramUsername,
      telegramChatId
    );
    if (success) {
      res.json({
        success: true,
        message: "Telegram account linked successfully",
      });
    } else {
      res
        .status(400)
        .json({ success: false, message: "Failed to link Telegram account" });
    }
  } catch (error) {
    console.error("Error linking Telegram:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

export default router;
