import katex from "katex";
import { Fragment, type ReactNode } from "react";

// Question text uses a small markup: **bold**, *italic*, __underline__, "- " bullet lines,
// runs of underscores for a blank, and (in Math only) $inline$ and $$display$$ LaTeX.
//
// Reading & Writing text uses "$" for money, so LaTeX is only parsed when `math` is set.
// Everything is rendered as React nodes. The only raw HTML is KaTeX's own output, which escapes
// its input.

function renderMath(source: string, display: boolean, key: number): ReactNode {
  const html = katex.renderToString(source, { displayMode: display, throwOnError: false, strict: "ignore" });
  return <span key={key} dangerouslySetInnerHTML={{ __html: html }} />;
}

const MARKUP = /(\*\*[^*]+?\*\*|__[^_]+?__|\*[^*\s][^*\n]*?\*|_{3,})/;
const MARKUP_WITH_MATH = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\*\*[^*]+?\*\*|__[^_]+?__|\*[^*\s][^*\n]*?\*|_{3,})/;

function renderInline(text: string, math: boolean): ReactNode[] {
  return text.split(math ? MARKUP_WITH_MATH : MARKUP).map((part, index) => {
    if (index % 2 === 0) return <Fragment key={index}>{part}</Fragment>;
    if (math && part.startsWith("$$")) return renderMath(part.slice(2, -2), true, index);
    if (math && part.startsWith("$")) return renderMath(part.slice(1, -1), false, index);
    if (part.startsWith("**")) return <strong key={index}>{renderInline(part.slice(2, -2), math)}</strong>;
    if (part.startsWith("__") && !/^_+$/.test(part)) return <u key={index}>{renderInline(part.slice(2, -2), math)}</u>;
    if (part.startsWith("*")) return <em key={index}>{renderInline(part.slice(1, -1), math)}</em>;
    // A blank to fill in.
    return (
      <span key={index} aria-label="blank" className="mx-0.5 inline-block w-16 border-b border-current align-baseline">
        &nbsp;
      </span>
    );
  });
}

// Some source text carries line breaks as the two characters "\n".
const normalize = (text: string) => text.replace(/\\n/g, "\n").replace(/\r/g, "");

export function InlineText({ text, math = false }: { text: string; math?: boolean }) {
  return <>{renderInline(normalize(text).replace(/\n+/g, " "), math)}</>;
}

export function RichText({ text, math = false }: { text: string; math?: boolean }) {
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];
  const flush = () => {
    if (bullets.length === 0) return;
    blocks.push(
      <ul key={`list-${blocks.length}`}>
        {bullets.map((bullet, index) => (
          <li key={index}>{renderInline(bullet, math)}</li>
        ))}
      </ul>,
    );
    bullets = [];
  };

  for (const line of normalize(text).split("\n")) {
    const bullet = /^\s*[-•]\s+(.*)$/.exec(line);
    if (bullet) {
      bullets.push(bullet[1]!);
      continue;
    }
    flush();
    if (line.trim() !== "") blocks.push(<p key={`p-${blocks.length}`}>{renderInline(line, math)}</p>);
  }
  flush();
  return <div className="question-text">{blocks}</div>;
}

// For places that cannot hold markup (SVG labels): markup characters removed, LaTeX approximated.
export function toPlainText(text: string): string {
  return normalize(text)
    .replace(/\$+/g, "")
    .replace(/\*\*|__/g, "")
    .replace(/\^\\circ|\^\{\\circ\}/g, "°")
    .replace(/\\sqrt\{([^}]*)\}/g, "√$1")
    .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, (_match, top: string, bottom: string) => {
      const wrap = (part: string) => (part.length > 1 ? `(${part})` : part);
      return `${wrap(top)}/${wrap(bottom)}`;
    })
    // Escaped symbols such as \% and \$ are just the symbol.
    .replace(/\\([%$&#_])/g, "$1")
    .replace(/\\pi/g, "π")
    .replace(/\\(?:text|mathrm)\{([^}]*)\}/g, "$1")
    .replace(/\\[a-zA-Z]+/g, "")
    .replace(/[{}]/g, "")
    .trim();
}
