export type AdaptationResult = {
  adaptedText: string;
  keywordsUsed: string[];
  matchScore: number;
};

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
