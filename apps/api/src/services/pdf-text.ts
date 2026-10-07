// Text of a PDF, line by line, with a blank line wherever the PDF shows a paragraph gap.
//
// Plain PDF text extraction (pdf-parse and similar) returns one line per visual line and drops the
// space between paragraphs, so "Text 1" / "Text 2" passages and separate formula lines would run
// together. Here the lines are rebuilt from pdf.js text positions: a vertical gap clearly larger
// than the page's usual line spacing becomes an empty line. The upload parser then joins wrapped lines
// back into paragraphs and keeps those breaks.
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

// A paragraph break: a gap between baselines larger than this many line heights, and clearly larger
// than the page's usual line spacing.
const PARAGRAPH_GAP = 1.6;
const PARAGRAPH_GAP_OVER_USUAL = 1.4;

interface Line {
  y: number;
  height: number;
  text: string;
}

export async function readPdfText(data: Buffer): Promise<string> {
  const loading = getDocument({
    data: new Uint8Array(data),
    // Text only: no fonts, scripts or network access are needed.
    disableFontFace: true,
    isEvalSupported: false,
    useSystemFonts: false,
    verbosity: 0,
  });
  const pdf = await loading.promise;
  try {
    const pages: string[] = [];
    for (let number = 1; number <= pdf.numPages; number += 1) {
      const page = await pdf.getPage(number);
      const content = await page.getTextContent();
      const lines: Line[] = [];
      for (const item of content.items) {
        if (!("str" in item)) continue;
        // transform[5] is the baseline, measured upwards from the bottom of the page.
        const y = item.transform[5] as number;
        const height = Math.max(item.height, 1);
        const last = lines[lines.length - 1];
        // Superscripts and subscripts sit a little off the baseline but belong to the same line.
        if (last && Math.abs(last.y - y) < Math.max(last.height, height) * 0.6) {
          last.text += item.str;
          last.height = Math.max(last.height, height);
        } else if (item.str !== "" || item.hasEOL) {
          lines.push({ y, height, text: item.str });
        }
      }
      // The page's usual distance between lines, so 1.5 or double line spacing is not mistaken for
      // paragraph gaps.
      const gaps = lines.slice(1).map((line, index) => lines[index]!.y - line.y).filter((gap) => gap > 0).sort((a, b) => a - b);
      const usual = gaps.length > 0 ? gaps[Math.floor(gaps.length / 2)]! : 0;
      const out: string[] = [];
      lines.forEach((line, index) => {
        const previous = lines[index - 1];
        const gap = previous ? previous.y - line.y : 0;
        if (previous && gap > previous.height * PARAGRAPH_GAP && gap > usual * PARAGRAPH_GAP_OVER_USUAL) out.push("");
        out.push(line.text.trimEnd());
      });
      pages.push(out.join("\n"));
      page.cleanup();
    }
    return pages.join("\n");
  } finally {
    await loading.destroy();
  }
}
