import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  BorderStyle,
  LevelFormat,
  AlignmentType
} from "docx";

export type DocxGeneratorInput = {
  adaptedText: string;
  keywordsUsed: string[];
  matchScore: number;
};

const FONT = "Calibri";
const SIZE_NAME = 36;    // 18pt — имя кандидата
const SIZE_CONTACT = 20; // 10pt — контактные данные
const SIZE_BODY = 24;    // 12pt — основной текст
const SIZE_HEADING = 26; // 13pt — заголовки секций

// 1cm = 567 twips, 1.5cm ≈ 850 twips
const MARGIN = 850;

const BULLET_REFERENCE = "resume-bullets";

function isBulletLine(line: string): boolean {
  return /^[-•]\s+/.test(line.trim());
}

function stripBulletPrefix(line: string): string {
  return line.trim().replace(/^[-•]\s+/, "");
}

export async function generateResumeDocx(input: DocxGeneratorInput): Promise<Buffer> {
  const { adaptedText } = input;

  const sections = parseAdaptedText(adaptedText);
  const children: Paragraph[] = [];

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const isFirstSection = i === 0;

    // Section heading
    if (section.heading) {
      children.push(
        new Paragraph({
          spacing: { before: 520, after: 160 },
          border: {
            bottom: { color: "aaaaaa", space: 1, style: BorderStyle.SINGLE, size: 4 }
          },
          children: [
            new TextRun({ text: section.heading, font: FONT, size: SIZE_HEADING, bold: true })
          ]
        })
      );
    }

    for (let j = 0; j < section.lines.length; j++) {
      const line = section.lines[j];
      if (!line.trim()) continue;

      // First section without heading: first line = name, rest = contacts
      if (isFirstSection && section.heading === null) {
        if (j === 0) {
          children.push(
            new Paragraph({
              spacing: { after: 60 },
              children: [
                new TextRun({ text: line.trim(), font: FONT, size: SIZE_NAME, bold: true })
              ]
            })
          );
          continue;
        } else {
          children.push(
            new Paragraph({
              spacing: { after: 40 },
              children: [
                new TextRun({ text: line.trim(), font: FONT, size: SIZE_BODY, color: "444444" })
              ]
            })
          );
          continue;
        }
      }

      // Bullet line
      if (isBulletLine(line)) {
        children.push(
          new Paragraph({
            numbering: { reference: BULLET_REFERENCE, level: 0 },
            spacing: { after: 80 },
            children: [
              new TextRun({ text: stripBulletPrefix(line), font: FONT, size: SIZE_BODY })
            ]
          })
        );
        continue;
      }

      // Regular body line
      children.push(
        new Paragraph({
          spacing: { after: 120, line: 276 },
          children: [
            new TextRun({ text: line, font: FONT, size: SIZE_BODY })
          ]
        })
      );
    }
  }

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: BULLET_REFERENCE,
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "\u2022",
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: { indent: { left: 720, hanging: 360 } },
                run: { font: FONT, size: SIZE_BODY }
              }
            }
          ]
        }
      ]
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN }
          }
        },
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
    /^(SUMMARY|PROFESSIONAL SUMMARY|EXPERIENCE|WORK EXPERIENCE|SKILLS|TECHNICAL SKILLS|EDUCATION|PROJECTS|CERTIFICATIONS|ACHIEVEMENTS|LANGUAGES|ABOUT)$/i,
    /^(РЕЗЮМЕ|КРАТКОЕ РЕЗЮМЕ|О СЕБЕ|ОПЫТ|ОПЫТ РАБОТЫ|ПРОФЕССИОНАЛЬНЫЙ ОПЫТ|НАВЫКИ|ТЕХНИЧЕСКИЕ НАВЫКИ|КЛЮЧЕВЫЕ НАВЫКИ|ОБРАЗОВАНИЕ|ПРОЕКТЫ|СЕРТИФИКАТЫ|ДОСТИЖЕНИЯ|ЯЗЫКИ|КОНТАКТЫ)$/i
  ];

  for (const line of lines) {
    const trimmed = line.trim();
    const isHeading = headingPatterns.some((pattern) => pattern.test(trimmed));

    if (isHeading) {
      if (currentSection) sections.push(currentSection);
      currentSection = { heading: trimmed, lines: [] };
    } else if (currentSection) {
      currentSection.lines.push(line);
    } else {
      currentSection = { heading: null, lines: [line] };
    }
  }

  if (currentSection) sections.push(currentSection);

  return sections;
}
