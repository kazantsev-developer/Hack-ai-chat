import { Router } from "express";
import multer from "multer";
import { RAGService } from "../services/RAGService.js";

const router = Router();
const ragService = RAGService.getInstance();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const documentId = `doc_${Date.now()}`;
    const mimetype = req.file.mimetype || "";
    const filename = req.file.originalname || "";
    const lowerFilename = filename.toLowerCase();

    console.log(
      `Uploading file: ${filename}, mimetype: ${mimetype}, size: ${req.file.size}`
    );

    if (mimetype === "application/pdf" || lowerFilename.endsWith(".pdf")) {
      await ragService.indexPDF(documentId, req.file.buffer);
    } else if (
      mimetype ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mimetype === "application/msword" ||
      lowerFilename.endsWith(".docx") ||
      lowerFilename.endsWith(".doc")
    ) {
      await ragService.indexDOCX(documentId, req.file.buffer);
    } else if (mimetype === "text/plain" || lowerFilename.endsWith(".txt")) {
      const text = req.file.buffer.toString("utf-8");
      await ragService.indexDocument(documentId, text);
    } else {
      const text = req.file.buffer.toString("utf-8");
      await ragService.indexDocument(documentId, text);
    }

    res.json({
      documentId,
      message: "Document indexed successfully",
      size: req.file.size,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Upload failed",
    });
  }
});

router.post("/query", async (req, res) => {
  try {
    const { documentId, question, modelId } = req.body;

    if (!documentId || !question) {
      return res
        .status(400)
        .json({ error: "documentId and question are required" });
    }

    const answer = await ragService.queryWithContext(
      documentId,
      question,
      modelId || "gpt-3.5-turbo"
    );

    res.json({ answer });
  } catch (error) {
    console.error("Query error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Query failed",
    });
  }
});

router.get("/documents", (req, res) => {
  const documents = ragService.getDocuments();
  res.json({ documents });
});

router.delete("/documents/:documentId", (req, res) => {
  const { documentId } = req.params;
  const deleted = ragService.deleteDocument(documentId);

  if (!deleted) {
    return res.status(404).json({ error: "Document not found" });
  }

  res.json({ message: "Document deleted successfully" });
});

export default router;
