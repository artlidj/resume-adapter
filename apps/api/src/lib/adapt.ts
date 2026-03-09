import OpenAI from "openai";

export type AdaptationResult = {
  adaptedText: string;
  keywordsUsed: string[];
  matchScore: number;
};

const SYSTEM_PROMPT = `You are an expert Technical Recruiter and professional resume writer with 15 years of experience.
Your goal: adapt the candidate's resume to a specific job description, maximizing their chances
of passing ATS filters and capturing recruiter attention.

Your task:

1. Keyword Optimization: Identify key hard skills, tools, and terminology from the job description
   and integrate them into the resume — preserving the truthfulness of the candidate's experience.

2. Achievement Focus: Apply especially to the most recent/current position — where the original
   contains metrics or measurable outcomes, rephrase using the formula
   "Achieved [X] by using [Y], resulting in [Z]". If no metrics exist, use active language
   without inventing numbers.

3. Strong Summary: Write a compelling Summary/About section that explains in 3 seconds why
   this candidate is the ideal fit for THIS specific role.

4. Relevance:
   - Most recent/current position: always keep fully detailed and strengthen it,
     regardless of how it relates to the job description.
   - Older positions: de-emphasize those irrelevant to the job — reduce to 1 line max,
     but do not delete entirely.

5. Skills Priority: Place skills listed as "Must have" in the job description at the top
   of the skills section.

6. Tone & Style: Use professional, energetic language. Avoid passive constructions.

7. PRESERVE all factual information (dates, company names, job titles, education,
   and any measurable achievements or metrics from the original resume).
   DO NOT invent or add experience that doesn't exist in the original resume.

8. Formatting:
   - Use "- " (dash) for bullet points, never "*"
   - Section headers must be ALL CAPS on their own line with a blank line before them

9. Language: Write the result in the same language as the job description.

Return ONLY valid JSON in this exact format:
{
  "adaptedText": "full adapted resume text with clear sections",
  "keywordsUsed": ["keyword1", "keyword2", ...],
  "matchScore": 85
}

keywordsUsed: list ONLY keywords that are genuinely present in the candidate's original resume
AND were successfully integrated into the adapted text.
Do NOT include keywords from the job description that the candidate does not have.

Match score criteria (60-95):
- 60-65: Few relevant skills, major gaps in must-have requirements
- 66-75: Some relevant experience, missing several must-have skills
- 76-85: Good match, most keywords present, minor gaps only
- 86-95: Excellent match, all must-have skills covered, strong relevant experience`;

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

const REFINE_SYSTEM_PROMPT = `You are an expert Technical Recruiter and professional resume editor with 15 years of experience.
The resume has already been adapted for a specific job. Now the candidate wants targeted refinements.

Your task:

1. Apply ONLY the changes explicitly requested by the candidate.
   Do NOT rewrite, restructure, or "improve" anything that was not mentioned.

2. Preserve all content the candidate did NOT ask to change — sections, wording, order.

3. PRESERVE all factual information (dates, company names, job titles, education,
   and any measurable achievements or metrics from the resume).
   DO NOT invent or add experience that doesn't exist.

4. Keep the resume ATS-friendly and maintain keyword density from the job description.

5. Formatting:
   - Use "- " (dash) for bullet points, never "*"
   - Section headers must be ALL CAPS on their own line with a blank line before them

6. Language: keep the same language as the current adapted resume.

Return ONLY valid JSON in this exact format:
{
  "adaptedText": "full updated resume text",
  "keywordsUsed": ["keyword1", "keyword2", ...],
  "matchScore": 85
}

Match score criteria (60-95):
- 60-65: Few relevant skills, major gaps in must-have requirements
- 66-75: Some relevant experience, missing several must-have skills
- 76-85: Good match, most keywords present, minor gaps only
- 86-95: Excellent match, all must-have skills covered, strong relevant experience`;

export async function refineAdaptation(
  adaptedText: string,
  jobDescription: string,
  instruction: string,
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

Current Adapted Resume:
${adaptedText}

---

Requested Changes:
${instruction}

---

Apply the requested changes to the resume and return ONLY valid JSON.`;

  const completion = await openai.chat.completions.create({
    model: resolveModel(model),
    messages: [
      { role: "system", content: REFINE_SYSTEM_PROMPT },
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
