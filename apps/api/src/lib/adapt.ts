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

// ─── Two-step pipeline prompts (s1-v5 + s2-v3, finalized 2026-04-12) ────────

const STEP1_PROMPT = `You are a technical resume alignment engine.

GOAL
Reorder and restructure the resume to maximize relevance to the job description.
Do NOT rewrite, rephrase, or add anything new.

CRITICAL RULES
- Do NOT add any content that is not already in the resume
- Do NOT invent skills, terms, or phrases from the job description
- Do NOT rewrite or rephrase any text
- Do NOT touch the Summary/О себе section — leave it exactly as-is
- You may ONLY reorder sections and bullet points

PROCESS
1. Extract MUST-HAVE skills and requirements from the job description.
2. Find where they appear in the resume (existing content only).
3. Reorder Skills sections and bullets to put MUST-HAVE matches first.
4. Reorder Experience bullets within each job to lead with most relevant ones.

SUMMARY
- Copy the original summary EXACTLY, word for word.
- Do NOT change a single word.

EXPERIENCE
- Keep ALL bullet points — do NOT remove any
- You may reorder bullets within a job to put most relevant first
- Do NOT rephrase or rewrite

DATES
- Copy ALL dates exactly as they appear in the original resume.
- Do NOT change, correct, or infer any dates.

SKILLS
- Keep ALL skills exactly as written
- Reorder skill SECTIONS so the most relevant section comes first
- Within each section, reorder items to put MUST-HAVE matches first
- Do NOT add new items
- Do NOT merge or remove items

OUTPUT
Return full resume in Markdown.
No explanations.

BEFORE OUTPUT — VERIFY:
For each skill bullet in your output, confirm it appears
verbatim in the original resume. If not — remove it.`;

const STEP2_PROMPT = `You are a senior resume strategist focused on persuasive positioning and targeted adaptation.

GOAL
Reposition and strengthen the resume for the specific role in the job description.
Do NOT compress. Do NOT reduce bullet points. Do NOT invent experience.

CRITICAL RULES
- Do NOT add bullet points that don't exist in the input resume
- Do NOT remove bullet points
- Do NOT invent experience, skills, or tools that don't exist in the resume
- Do NOT change dates, company names, or job titles
- You may rewrite wording, adapt language, and remove irrelevant skill sections

PERSUASIVE PRINCIPLES
- Replace weak language with strong, confident language
- Frame actions as ownership and impact
- Emphasize scale, complexity, and outcomes
- Make the candidate sound like a high-level operator for THIS specific role

AVOID
- "able to", "capable of", "involved in", "responsible for"
- "способен", "развиваюсь", "участвовал"

USE
- Lead, Drive, Deliver, Own, Build, Scale, Transform

SUMMARY
- You MUST rewrite the summary for THIS specific job description.
- Identify the target role from the job description.
- Open with the candidate's most relevant experience for that role.
- Use terminology directly from the job description where supported by the candidate's real background.
- Remove or de-emphasize framing irrelevant to the target role.
- Keep all original facts — do NOT invent experience.
- Keep same length or longer.

EXPERIENCE
- Rewrite bullets to sound stronger and more relevant to the target role
- Use terminology from the job description where genuinely supported by the content
- Keep ALL bullet points — do NOT remove any
- Keep all original facts and metrics
- Old positions (10+ years ago) with no direct relevance to the TARGET ROLE
  from the job description — remove entirely.
  Relevance = overlap with product management, strategy, technology,
  or domain knowledge required by the role.
  Physical labor or construction crew management does NOT qualify as relevant.
- Keep at least 2 positions.

SKILLS
- Remove entire skill SECTIONS that have zero relevance to the job description
- For remaining sections: rewrite each item using terminology from the job description
  where genuinely supported by the candidate's actual skills
- Keep ALL items within relevant sections — do NOT add or remove individual items
- Keep section headers exactly as written in the input
- Do NOT invent skills that don't exist
- Do NOT upgrade skill scope or level — rewrite terminology only within
  the same level of expertise. "Работа с данными" does NOT support
  "data pipelines" or "MLOps". "Интеграция API" does NOT support "ETL"

BEFORE OUTPUT — VERIFY:
1. Count bullet points per job in your output vs the input — must match exactly.
   Added or removed bullets → fix before output.
2. Check section headers — must match input exactly. Renamed → revert.
3. Check Skills items count per section — must match input.
4. Check each skill item: does the core concept exist in the input resume?
   "data pipelines", "MLOps", "ETL" → if not in input, revert to original wording.
5. Old positions (10+ years ago, zero product/strategy/technology overlap) → removed. OK.

OUTPUT
Return full resume in Markdown.
No explanations.`;

// ─── Models ──────────────────────────────────────────────────────────────────

const ALLOWED_MODELS = ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-4.1"] as const;
type AllowedModel = (typeof ALLOWED_MODELS)[number];

function resolveModel(requested?: string): AllowedModel {
  if (requested && (ALLOWED_MODELS as readonly string[]).includes(requested)) {
    return requested as AllowedModel;
  }
  return "gpt-4o-mini";
}

export async function createAdaptationTwoStep(
  resumeText: string,
  jobDescription: string,
  model?: string
): Promise<AdaptationResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || apiKey === "your_openai_api_key_here") {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const openai = new OpenAI({ apiKey });
  const resolvedModel = resolveModel(model ?? "gpt-4.1-mini");

  // Step 1: Structural Alignment — reorder only, no rewriting
  const step1Completion = await openai.chat.completions.create({
    model: resolvedModel,
    messages: [
      { role: "system", content: STEP1_PROMPT },
      {
        role: "user",
        content: `Job Description:\n${jobDescription}\n\n---\n\nCandidate's Resume:\n${resumeText}`
      }
    ],
    temperature: 0.3,
    max_tokens: 4096
  });

  const alignedResume = step1Completion.choices[0]?.message?.content?.trim();
  if (!alignedResume) {
    throw new Error("Step 1 returned empty response");
  }

  // Step 2: Persuasive Strengthening — reposition for the role
  const step2Completion = await openai.chat.completions.create({
    model: resolvedModel,
    messages: [
      { role: "system", content: STEP2_PROMPT },
      {
        role: "user",
        content: `Job Description:\n${jobDescription}\n\n---\n\nAligned Resume:\n${alignedResume}`
      }
    ],
    temperature: 0.5,
    max_tokens: 4096
  });

  const adaptedText = step2Completion.choices[0]?.message?.content?.trim();
  if (!adaptedText) {
    throw new Error("Step 2 returned empty response");
  }

  // Keywords extracted from job description (ATS evaluator to be added later)
  const keywordsUsed = extractKeywords(jobDescription);

  // Estimate match score based on keyword overlap
  const adaptedLower = adaptedText.toLowerCase();
  const matched = keywordsUsed.filter((kw) => adaptedLower.includes(kw));
  const matchScore = Math.max(60, Math.min(95, 60 + matched.length * 5));

  return { adaptedText, keywordsUsed, matchScore };
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
