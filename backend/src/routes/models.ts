import { Router } from "express";
import { LLMProvider } from "../models/LLMProvider.js";

const router = Router();

router.get("/", (req, res) => {
  const llmProvider = new LLMProvider();
  const models = llmProvider.getAvailableModels();
  res.json(models);
});

export default router;
