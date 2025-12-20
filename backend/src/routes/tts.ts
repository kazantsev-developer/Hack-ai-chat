import { Router } from "express";
import { TTSService } from "../services/TTSService.js";

const router = Router();
const ttsService = new TTSService();

router.post("/", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    if (!ttsService.isConfigured()) {
      return res.status(503).json({ error: "TTS service not configured" });
    }

    const audioBuffer = await ttsService.textToSpeech(text);

    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Length": audioBuffer.length,
    });

    res.send(audioBuffer);
  } catch (error) {
    console.error("TTS error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "TTS generation failed",
    });
  }
});

router.get("/status", (req, res) => {
  res.json({
    configured: ttsService.isConfigured(),
  });
});

export default router;
