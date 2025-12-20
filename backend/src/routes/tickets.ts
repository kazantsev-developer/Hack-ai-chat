import { Router } from "express";
import { chatService } from "./chat.js";

const router = Router();

router.get("/", (req, res) => {
  const ticketService = chatService().getTicketService();
  const tickets = ticketService.getAllTickets();
  res.json(tickets);
});

router.get("/:ticketId", (req, res) => {
  const { ticketId } = req.params;
  const ticketService = chatService().getTicketService();
  const ticket = ticketService.getTicket(ticketId);

  if (!ticket) {
    return res.status(404).json({ error: "Ticket not found" });
  }

  res.json(ticket);
});

router.patch("/:ticketId/status", (req, res) => {
  const { ticketId } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: "Status is required" });
  }

  const ticketService = chatService().getTicketService();
  const ticket = ticketService.updateTicketStatus(ticketId, status);

  if (!ticket) {
    return res.status(404).json({ error: "Ticket not found" });
  }

  res.json(ticket);
});

export default router;
