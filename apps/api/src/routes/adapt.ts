import { Router } from "express";
import multer from "multer";
import { createAdaptation } from "../lib/adapt.js";
import { parseResumeFile } from "../lib/parser.js";
import { resolveUserId } from "../lib/auth.js";
import { hasSupabaseConfig, saveAdaptationLog } from "../lib/supabase.js";
import { generateResumeDocx } from "../lib/docx-generator.js";

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
  const rawResumeText = typeof req.body.resumeText === "string" ? req.body.resumeText.trim() : "";
  const jobDescription = typeof req.body.jobDescription === "string" ? req.body.jobDescription.trim() : "";
  const model = typeof req.body.model === "string" ? req.body.model : undefined;

  if (authRequired && !supabaseReady) {
    return res.status(500).json({ error: "Supabase is not configured on API server" });
  }

  const userId = await resolveUserId(req);
  if (authRequired && !userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!file && !rawResumeText) {
    return res.status(400).json({ error: "Either resumeFile or resumeText is required" });
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

  let resumeText: string;
  if (rawResumeText) {
    resumeText = rawResumeText;
  } else {
    const extension = getExtension(file!.originalname);
    if (!allowedExtensions.has(extension)) {
      return res.status(400).json({ error: "Unsupported file format. Allowed: PDF, DOC, DOCX, TXT" });
    }

    if (!allowedMimeTypes.has(file!.mimetype)) {
      return res.status(400).json({ error: "Invalid file type" });
    }
    try {
      resumeText = await parseResumeFile(file!.buffer, file!.originalname);
    } catch (parseError) {
      console.error("[adapt] parseResumeFile failed:", parseError);
      return res.status(422).json({ error: "Could not extract text from the uploaded file." });
    }

    if (!resumeText) {
      return res.status(422).json({ error: "The uploaded file appears to be empty or unreadable." });
    }
  }

  let result;
  try {
    result = await createAdaptation(resumeText, jobDescription, model);
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    console.error("[adapt] createAdaptation failed:", errorMessage);

    try {
      await saveAdaptationLog({
        userId,
        sourceFilename: file?.originalname ?? "url-input",
        status: "error",
        jobDescriptionLength: jobDescription.length,
        matchScore: null,
        keywordsUsed: [],
        durationMs,
        errorMessage
      });
    } catch (logError) {
      console.error(logError);
    }

    return res.status(500).json({
      error: "Failed to adapt resume",
      details: errorMessage
    });
  }

  const durationMs = Date.now() - startedAt;
  try {
    await saveAdaptationLog({
      userId,
      sourceFilename: file?.originalname ?? "url-input",
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

adaptRouter.post("/adapt/download", async (req, res) => {
  try {
    const { adaptedText, keywordsUsed, matchScore } = req.body;

    if (!adaptedText || typeof adaptedText !== "string") {
      return res.status(400).json({ error: "adaptedText is required" });
    }

    if (!Array.isArray(keywordsUsed)) {
      return res.status(400).json({ error: "keywordsUsed must be an array" });
    }

    if (typeof matchScore !== "number") {
      return res.status(400).json({ error: "matchScore must be a number" });
    }

    const buffer = await generateResumeDocx({
      adaptedText,
      keywordsUsed,
      matchScore
    });

    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `adapted-resume-${timestamp}.docx`;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", buffer.length);

    return res.send(buffer);
  } catch (error) {
    console.error("DOCX generation error:", error);
    return res.status(500).json({ error: "Failed to generate DOCX file" });
  }
});
