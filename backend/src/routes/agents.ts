import { Router } from "express";
import { AgentManager } from "../agents/AgentManager.js";

const router = Router();
const agentManager = new AgentManager();

router.get("/", (req, res) => {
  const agents = agentManager.getAllAgents();
  res.json(agents);
});

router.get("/:agentId", (req, res) => {
  const agent = agentManager.getAgent(req.params.agentId);
  if (!agent) {
    return res.status(404).json({ error: "Agent not found" });
  }
  res.json(agent);
});

router.post("/", (req, res) => {
  const { name, systemPrompt, description } = req.body;

  if (!name || !systemPrompt) {
    return res
      .status(400)
      .json({ error: "Name and systemPrompt are required" });
  }

  const agent = agentManager.createAgent({ name, systemPrompt, description });
  res.status(201).json(agent);
});

router.put("/:agentId", (req, res) => {
  const updated = agentManager.updateAgent(req.params.agentId, req.body);
  if (!updated) {
    return res.status(404).json({ error: "Agent not found" });
  }
  res.json(updated);
});

router.delete("/:agentId", (req, res) => {
  const success = agentManager.deleteAgent(req.params.agentId);
  if (!success) {
    return res
      .status(400)
      .json({ error: "Cannot delete default agents or agent not found" });
  }
  res.json({ success: true });
});

export default router;
