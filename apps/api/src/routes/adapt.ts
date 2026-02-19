import { Router } from "express";
import multer from "multer";
import { createMockAdaptation } from "../lib/adapt.js";
import { parseResumeFile } from "../lib/parser.js";
import { resolveUserId } from "../lib/auth.js";
import { hasSupabaseConfig, saveAdaptationLog } from "../lib/supabase.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

const allowedExtensions = new Set(["pdf", "doc", "docx", "txt"]);
const allowedMimeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain"
]);
const JOB_DESCRIPTION_MIN = 50;
const JOB_DESCRIPTION_MAX = 20000;

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

  if (jobDescription.length < JOB_DESCRIPTION_MIN) {
    return res.status(400).json({ error: `Job description is too short (min ${JOB_DESCRIPTION_MIN} characters)` });
  }

  if (jobDescription.length > JOB_DESCRIPTION_MAX) {
    return res.status(400).json({ error: `Job description is too long (max ${JOB_DESCRIPTION_MAX} characters)` });
  }

  const extension = getExtension(file.originalname);
  if (!allowedExtensions.has(extension)) {
    return res.status(400).json({ error: "Unsupported file format. Allowed: PDF, DOC, DOCX, TXT" });
  }

  if (!allowedMimeTypes.has(file.mimetype)) {
    return res.status(400).json({ error: "Invalid file type" });
  }

  let resumeText: string;
  try {
    resumeText = await parseResumeFile(file.buffer, file.originalname);
  } catch {
    return res.status(422).json({ error: "Could not extract text from the uploaded file." });
  }

  if (!resumeText) {
    return res.status(422).json({ error: "The uploaded file appears to be empty or unreadable." });
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
