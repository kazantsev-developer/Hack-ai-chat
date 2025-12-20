import { Router } from "express";
import { ChatService } from "../services/ChatService.js";

const router = Router();
let chatService: ChatService | null = null;

function getChatService(): ChatService {
  if (!chatService) {
    chatService = new ChatService();
  }
  return chatService;
}

router.get("/session/:sessionId", (req, res) => {
  const session = getChatService().getSession(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }
  res.json(session);
});

router.post("/session/:sessionId/switch-agent", (req, res) => {
  const { agentId } = req.body;
  const success = getChatService().switchAgent(req.params.sessionId, agentId);
  if (!success) {
    return res.status(404).json({ error: "Session not found" });
  }
  res.json({ success: true });
});

router.post("/session/:sessionId/switch-model", (req, res) => {
  const { modelId } = req.body;
  const success = getChatService().switchModel(req.params.sessionId, modelId);
  if (!success) {
    return res.status(404).json({ error: "Session not found" });
  }
  res.json({ success: true });
});

router.post("/session/:sessionId/document", (req, res) => {
  const { documentId } = req.body;
  const chatService = getChatService();

  let session = chatService.getSession(req.params.sessionId);
  if (!session) {
    const success = chatService.createSessionIfNotExists(
      req.params.sessionId,
      "default",
      "qwen-2.5-72b"
    );
    if (!success) {
      return res.status(500).json({ error: "Failed to create session" });
    }
  }

  const success = chatService.setDocument(req.params.sessionId, documentId);
  if (!success) {
    return res.status(500).json({ error: "Failed to set document" });
  }

  res.json({ success: true, documentId });
});

router.delete("/session/:sessionId", (req, res) => {
  const success = getChatService().clearSession(req.params.sessionId);
  res.json({ success });
});

export default router;
export { getChatService as chatService };
