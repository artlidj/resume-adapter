import mammoth from "mammoth";

export async function parseResumeFile(buffer: Buffer, filename: string): Promise<string> {
  const ext = filename.toLowerCase().split(".").pop();

  if (ext === "pdf") {
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buffer);
    return data.text.trim();
  }

  if (ext === "docx" || ext === "doc") {
    const result = await mammoth.extractRawText({ buffer });
    return result.value.trim();
  }

  if (ext === "txt") {
    return buffer.toString("utf-8").trim();
  }

  throw new Error(`Unsupported file format: ${ext}`);
}
