import { Router } from "express";
import multer from "multer";
import { createMockAdaptation } from "../lib/adapt.js";
import { resolveUserId } from "../lib/auth.js";
import { hasSupabaseConfig, saveAdaptationLog } from "../lib/supabase.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

const allowedExtensions = new Set(["pdf", "doc", "docx", "txt"]);

function getExtension(filename: string): string {
  const parts = filename.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

export const adaptRouter = Router();

adaptRouter.post("/adapt", upload.single("resumeFile"), async (req, res) => {
  const startedAt = Date.now();
  const authRequired = (process.env.AUTH_REQUIRED ?? "true") === "true";
  const supabaseReady = hasSupabaseConfig();

  const file = req.file;
  const jobDescription = typeof req.body.jobDescription === "string" ? req.body.jobDescription.trim() : "";

  if (authRequired && !supabaseReady) {
    return res.status(500).json({ error: "Supabase is not configured on API server" });
  }

  const userId = await resolveUserId(req);
  if (authRequired && !userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!file) {
    return res.status(400).json({ error: "resumeFile is required" });
  }

  if (!jobDescription) {
    return res.status(400).json({ error: "jobDescription is required" });
  }

  const extension = getExtension(file.originalname);
  if (!allowedExtensions.has(extension)) {
    return res.status(400).json({ error: "Unsupported file format. Allowed: PDF, DOC, DOCX, TXT" });
  }

  const result = createMockAdaptation(jobDescription, file.originalname);

  const durationMs = Date.now() - startedAt;
  try {
    await saveAdaptationLog({
      userId,
      sourceFilename: file.originalname,
      status: "success",
      jobDescriptionLength: jobDescription.length,
      matchScore: result.matchScore,
      keywordsUsed: result.keywordsUsed,
      durationMs,
      errorMessage: null
    });
  } catch (error) {
    console.error(error);
  }

  return res.json({
    adaptedText: result.adaptedText,
    keywordsUsed: result.keywordsUsed,
    matchScore: result.matchScore
  });
});
