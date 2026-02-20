import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle
} from "docx";

export type DocxGeneratorInput = {
  adaptedText: string;
  keywordsUsed: string[];
  matchScore: number;
};

export async function generateResumeDocx(input: DocxGeneratorInput): Promise<Buffer> {
  const { adaptedText, keywordsUsed, matchScore } = input;

  const sections = parseAdaptedText(adaptedText);
  const children: Paragraph[] = [];

  // Header: Match Score
  children.push(
    new Paragraph({
      text: `ATS Match Score: ${matchScore}%`,
      heading: HeadingLevel.HEADING_2,
      alignment: AlignmentType.RIGHT,
      spacing: { after: 200 }
    })
  );

  // Keywords section
  if (keywordsUsed.length > 0) {
    children.push(
      new Paragraph({
        text: "Key Skills Highlighted",
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 100, after: 100 }
      })
    );
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: keywordsUsed.join(" • "),
            color: "1e40af",
            bold: true
          })
        ],
        spacing: { after: 300 },
        border: {
          bottom: {
            color: "d1d5db",
            space: 1,
            style: BorderStyle.SINGLE,
            size: 6
          }
        }
      })
    );
  }

  // Main content sections
  for (const section of sections) {
    if (section.heading) {
      children.push(
        new Paragraph({
          text: section.heading,
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 300, after: 150 }
        })
      );
    }

    for (const line of section.lines) {
      if (line.trim()) {
        children.push(
          new Paragraph({
            text: line,
            spacing: { after: 120 }
          })
        );
      }
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children
      }
    ]
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer;
}

type Section = {
  heading: string | null;
  lines: string[];
};

function parseAdaptedText(text: string): Section[] {
  const lines = text.split("\n");
  const sections: Section[] = [];
  let currentSection: Section | null = null;

  const headingPatterns = [
    /^(SUMMARY|EXPERIENCE|SKILLS|EDUCATION|PROJECTS|CERTIFICATIONS|ACHIEVEMENTS)/i,
    /^(Резюме|Опыт работы|Навыки|Образование|Проекты|Сертификаты|Достижения)/i
  ];

  for (const line of lines) {
    const trimmed = line.trim();

    const isHeading = headingPatterns.some((pattern) => pattern.test(trimmed));

    if (isHeading) {
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = {
        heading: trimmed.toUpperCase(),
        lines: []
      };
    } else if (currentSection) {
      currentSection.lines.push(line);
    } else {
      if (!currentSection) {
        currentSection = { heading: null, lines: [] };
      }
      currentSection.lines.push(line);
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  return sections;
}
