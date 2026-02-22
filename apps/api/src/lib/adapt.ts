import OpenAI from "openai";

export type AdaptationResult = {
  adaptedText: string;
  keywordsUsed: string[];
  matchScore: number;
};

const SYSTEM_PROMPT = `You are an expert resume optimizer for ATS (Applicant Tracking Systems).

Your task:
1. Adapt the candidate's resume to match the job description
2. Use terminology and keywords from the job description
3. Reframe experience to highlight relevant skills
4. PRESERVE all factual information (dates, company names, job titles, education)
5. DO NOT invent or add experience that doesn't exist
6. Make the resume ATS-friendly (clear structure, keyword-rich)

Return ONLY valid JSON in this exact format:
{
  "adaptedText": "full adapted resume text with clear sections — use the same language as the original resume (e.g. SUMMARY/ОПЫТ РАБОТЫ/etc.)",
  "keywordsUsed": ["keyword1", "keyword2", ...],
  "matchScore": 85
}

Match score should be 60-95 based on how well the candidate's background fits the job.`;

function extractKeywords(input: string): string[] {
  const stopWords = new Set([
    "with",
    "that",
    "this",
    "from",
    "have",
    "will",
    "your",
    "about",
    "into",
    "their",
    "where",
    "which",
    "работа",
    "опыт",
    "навыки",
    "обязанности",
    "требования"
  ]);

  const words = input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 4 && !stopWords.has(word));

  const unique = Array.from(new Set(words));
  return unique.slice(0, 8);
}

export function createMockAdaptation(jobDescription: string, filename: string): AdaptationResult {
  const keywordsUsed = extractKeywords(jobDescription);
  const text = [
    "SUMMARY",
    "Candidate profile is reframed for ATS readability and vacancy terminology.",
    "",
    "EXPERIENCE",
    "Experience is preserved as-is, with wording aligned to vacancy language.",
    "",
    "SKILLS",
    keywordsUsed.length > 0 ? keywordsUsed.join(", ") : "communication, project coordination, analytics",
    "",
    "SOURCE FILE",
    filename
  ].join("\n");

  return {
    adaptedText: text,
    keywordsUsed,
    matchScore: keywordsUsed.length > 0 ? Math.min(94, 58 + keywordsUsed.length * 4) : 58
  };
}

const ALLOWED_MODELS = ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-4.1"] as const;
type AllowedModel = (typeof ALLOWED_MODELS)[number];

function resolveModel(requested?: string): AllowedModel {
  if (requested && (ALLOWED_MODELS as readonly string[]).includes(requested)) {
    return requested as AllowedModel;
  }
  return "gpt-4o-mini";
}

export async function createAdaptation(
  resumeText: string,
  jobDescription: string,
  model?: string
): Promise<AdaptationResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || apiKey === "your_openai_api_key_here") {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const openai = new OpenAI({ apiKey });

  const userPrompt = `Job Description:
${jobDescription}

---

Candidate's Resume:
${resumeText}

---

Adapt this resume for the job description above. Return ONLY valid JSON.`;

  const completion = await openai.chat.completions.create({
    model: resolveModel(model),
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt }
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_tokens: 3000
  });

  const raw = completion.choices[0]?.message?.content?.trim();
  if (!raw) {
    throw new Error("Empty response from OpenAI");
  }

  // Strip markdown code fences if model returned them despite json_object mode
  const responseText = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");

  let parsed: AdaptationResult;
  try {
    parsed = JSON.parse(responseText);
  } catch {
    throw new Error(`Invalid JSON response from OpenAI: ${responseText.slice(0, 200)}`);
  }

  if (!parsed.adaptedText || !Array.isArray(parsed.keywordsUsed) || typeof parsed.matchScore !== "number") {
    throw new Error("Response missing required fields");
  }

  return {
    adaptedText: parsed.adaptedText,
    keywordsUsed: parsed.keywordsUsed,
    matchScore: Math.max(60, Math.min(95, parsed.matchScore))
  };
}
