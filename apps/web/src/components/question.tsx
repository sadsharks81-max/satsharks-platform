"use client";

import type { CorrectAnswerView, QuestionAssetView, QuestionChoiceView, QuestionType, Section } from "@satsharks/types";
import { InlineText, RichText } from "@/lib/rich-text";
import { Viz } from "./viz";

export interface QuestionContent {
  section: Section;
  questionType: QuestionType;
  prompt: string;
  passage: string | null;
  choices: QuestionChoiceView[];
  assets: QuestionAssetView[];
  viz: unknown;
}

// Images and figures that belong to the question.
export function Figures({ question }: { question: QuestionContent }) {
  const math = question.section === "math";
  return (
    <>
      {question.assets.map((asset) => (
        // eslint-disable-next-line @next/next/no-img-element -- served by our own API; sizes vary per question
        <img key={asset.url} src={asset.url} alt="Figure for this question" className="mx-auto my-3 h-auto w-full" style={{ maxWidth: asset.maxWidth ?? 400 }} />
      ))}
      {question.viz != null && <Viz viz={question.viz} math={math} />}
    </>
  );
}

// The source marks where a figure belongs in the text with "{viz}". The figure is drawn there;
// without a marker it goes above the text.
const FIGURE_MARKER = "{viz}";

function TextWithFigures({ text, question }: { text: string; question: QuestionContent }) {
  const math = question.section === "math";
  if (!text.includes(FIGURE_MARKER)) {
    return (
      <div>
        <Figures question={question} />
        <RichText text={text} math={math} />
      </div>
    );
  }
  const [before = "", ...rest] = text.split(FIGURE_MARKER);
  return (
    <div>
      {before.trim() !== "" && <RichText text={before} math={math} />}
      <Figures question={question} />
      {/* A second marker would repeat the same figure, so later ones are dropped. */}
      {rest.join(" ").trim() !== "" && <RichText text={rest.join(" ")} math={math} />}
    </div>
  );
}

// Reading & Writing shows the passage (and its figure) beside the question.
export function Passage({ question }: { question: QuestionContent }) {
  return <TextWithFigures text={question.passage ?? ""} question={question} />;
}

export function Prompt({ question }: { question: QuestionContent }) {
  // In Math the figure belongs to the question text; in Reading & Writing it belongs to the passage.
  if (question.section !== "math") return <RichText text={question.prompt} />;
  return <TextWithFigures text={question.prompt} question={question} />;
}

export interface ChoicesProps {
  question: QuestionContent;
  selected: string | null;
  onSelect?: (key: string) => void;
  // Choices the student has crossed out.
  eliminated?: ReadonlySet<string>;
  onToggleEliminate?: (key: string) => void;
  eliminationMode?: boolean;
  // When set, the answer key is shown: correct choice in green, a wrong selection in red.
  correctAnswer?: CorrectAnswerView | null;
  disabled?: boolean;
}

export function Choices({ question, selected, onSelect, eliminated, onToggleEliminate, eliminationMode, correctAnswer, disabled }: ChoicesProps) {
  const math = question.section === "math";
  const revealed = correctAnswer !== undefined && correctAnswer !== null;

  return (
    <div role="radiogroup" aria-label="Answer choices" className="mt-5 space-y-3">
      {question.choices.map((choice) => {
        const isSelected = selected === choice.key;
        const isCorrect = revealed && correctAnswer.choiceKey === choice.key;
        const isWrong = revealed && isSelected && !isCorrect;
        const isEliminated = eliminated?.has(choice.key) ?? false;

        let box = "border-slate-900 bg-white";
        let badge = "border-slate-900 bg-white text-slate-900";
        if (isCorrect) {
          box = "border-green-600 bg-green-50 ring-2 ring-green-600";
          badge = "border-green-600 bg-green-600 text-white";
        } else if (isWrong) {
          box = "border-red-600 bg-red-50 ring-2 ring-red-600";
          badge = "border-red-600 bg-red-600 text-white";
        } else if (isSelected) {
          box = "border-brand-500 bg-brand-50 ring-2 ring-brand-500";
          badge = "border-brand-500 bg-brand-500 text-white";
        }

        return (
          <div key={choice.key} className="flex items-center gap-2">
            <button
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled || !onSelect}
              onClick={() => onSelect?.(choice.key)}
              className={`relative flex min-h-[52px] flex-1 items-center gap-3 rounded-lg border px-3 py-2.5 text-left ${box} ${
                disabled || !onSelect ? "cursor-default" : "cursor-pointer hover:bg-slate-50"
              } ${isEliminated ? "opacity-50" : ""}`}
            >
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${badge}`}>{choice.key}</span>
              <span className="question-text min-w-0 flex-1">
                {choice.text && <InlineText text={choice.text} math={math} />}
                {choice.viz != null && <Viz viz={choice.viz} math={math} />}
              </span>
              {isEliminated && <span aria-hidden className="pointer-events-none absolute inset-x-2 top-1/2 border-t-2 border-slate-900" />}
            </button>
            {eliminationMode && onToggleEliminate && (
              <button
                type="button"
                onClick={() => onToggleEliminate(choice.key)}
                aria-label={isEliminated ? `Restore choice ${choice.key}` : `Cross out choice ${choice.key}`}
                className="flex h-7 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-slate-900 text-xs font-bold hover:bg-slate-100"
              >
                {isEliminated ? "Undo" : <span className="line-through">{choice.key}</span>}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Student-produced response: a short typed answer.
export function ResponseInput({
  value,
  onChange,
  onCommit,
  disabled,
  correctAnswer,
  correct,
}: {
  value: string;
  onChange?: (value: string) => void;
  onCommit?: () => void;
  disabled?: boolean;
  correctAnswer?: CorrectAnswerView | null;
  correct?: boolean | null;
}) {
  const revealed = correctAnswer !== undefined && correctAnswer !== null;
  const tone = !revealed ? "border-slate-900" : correct ? "border-green-600 ring-2 ring-green-600" : "border-red-600 ring-2 ring-red-600";
  // Positive answers fit 5 characters, negative ones 6.
  const maxLength = value.startsWith("-") ? 6 : 5;

  return (
    <div className="mt-5">
      <input
        type="text"
        inputMode="decimal"
        aria-label="Your answer"
        value={value}
        disabled={disabled}
        maxLength={6}
        onChange={(event) => {
          const next = event.target.value.replace(/[^0-9./-]/g, "");
          if (next.length <= (next.startsWith("-") ? 6 : 5)) onChange?.(next);
        }}
        onBlur={onCommit}
        className={`w-36 rounded-lg border bg-white px-3 py-3 text-lg outline-none focus:ring-2 focus:ring-brand-500 ${tone}`}
      />
      <p className="mt-1 text-xs text-slate-500">Up to {maxLength} characters.</p>
      <p className="mt-4 font-serif font-semibold">
        Answer Preview: <span className="font-normal">{value}</span>
      </p>
      {revealed && (
        <p className="mt-3 text-sm">
          <span className="font-semibold">Correct answer:</span> {correctAnswer.acceptedValues.join(" or ")}
        </p>
      )}
    </div>
  );
}

export function ReferenceSheet() {
  const formulas: [string, string][] = [
    ["Circle", "$A = \\pi r^2$, $C = 2\\pi r$"],
    ["Rectangle", "$A = \\ell w$"],
    ["Triangle", "$A = \\frac{1}{2}bh$"],
    ["Right triangle", "$c^2 = a^2 + b^2$"],
    ["30°–60°–90° triangle", "sides $x$, $x\\sqrt{3}$, $2x$"],
    ["45°–45°–90° triangle", "sides $s$, $s$, $s\\sqrt{2}$"],
    ["Rectangular prism", "$V = \\ell wh$"],
    ["Cylinder", "$V = \\pi r^2 h$"],
    ["Sphere", "$V = \\frac{4}{3}\\pi r^3$"],
    ["Cone", "$V = \\frac{1}{3}\\pi r^2 h$"],
    ["Pyramid", "$V = \\frac{1}{3}\\ell wh$"],
  ];
  return (
    <div className="question-text space-y-2">
      <table className="w-full text-sm">
        <tbody>
          {formulas.map(([name, formula]) => (
            <tr key={name} className="border-b border-slate-200">
              <th className="py-2 pr-4 text-left font-semibold">{name}</th>
              <td className="py-2">
                <InlineText text={formula} math />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-sm">The number of degrees of arc in a circle is 360.</p>
      <p className="text-sm">
        The number of radians of arc in a circle is <InlineText text="$2\pi$" math />.
      </p>
      <p className="text-sm">The sum of the measures in degrees of the angles of a triangle is 180.</p>
    </div>
  );
}
