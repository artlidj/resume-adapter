import { Router } from "express";

export const fetchContentRouter = Router();

fetchContentRouter.get("/fetch-content", async (req, res) => {
  const url = typeof req.query.url === "string" ? req.query.url.trim() : "";

  if (!url) {
    return res.status(400).json({ error: "url is required" });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return res.status(400).json({ error: "Invalid URL" });
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return res.status(400).json({ error: "Only HTTP and HTTPS URLs are supported" });
  }

  try {
    // Google Docs — export as plain text
    const gdocMatch = url.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/);
    if (gdocMatch) {
      const docId = gdocMatch[1];
      const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
      const response = await fetch(exportUrl);

      if (!response.ok) {
        return res.status(422).json({
          error: "Не удалось загрузить документ. Убедитесь что документ открыт для просмотра по ссылке."
        });
      }

      const text = await response.text();
      return res.json({ text: text.trim() });
    }

    // Generic URL — fetch HTML and strip tags
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ResumeAdapter/1.0)" },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      return res.status(422).json({ error: `Сервер вернул ошибку: HTTP ${response.status}` });
    }

    const html = await response.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (text.length < 100) {
      return res.status(422).json({ error: "Не удалось извлечь текст со страницы." });
    }

    return res.json({ text });
  } catch (error) {
    console.error("[fetch-content] error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: "Не удалось получить содержимое по ссылке.", details: message });
  }
});
