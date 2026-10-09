"use client";

import { useState } from "react";

// The laptop on the landing page: a working miniature of the test screen, drawn with the site's
// own styles (not a screenshot). Visitors can pick an answer and mark the question for review.
const CHOICES = [
  { id: "A", text: "3" },
  { id: "B", text: "5" },
  { id: "C", text: "8" },
  { id: "D", text: "15" },
];

function FlagIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill={filled ? "#E0413B" : "none"}
      stroke={filled ? "#B4231F" : "currentColor"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 21V4h11l-1.5 4L16 12H5" />
    </svg>
  );
}

export function LandingTestDemo() {
  const [picked, setPicked] = useState("B");
  const [flagged, setFlagged] = useState(false);

  return (
    <div className="landing-rise relative z-[3] mx-auto max-w-[880px]">
      <div className="rounded-t-[22px] rounded-b-[10px] bg-[#10163D] px-2.5 pb-3.5 pt-2.5 shadow-[0_50px_90px_-40px_rgba(8,12,48,0.75),inset_0_0_0_1px_rgba(255,255,255,0.08)] sm:px-3.5 sm:pb-[18px] sm:pt-3.5">
        <div className="overflow-hidden rounded-[10px] bg-white text-[#0F1535]">
          {/* Test header */}
          <div className="grid grid-cols-3 items-center px-3 py-3 sm:px-[22px] sm:py-3.5">
            <div className="flex min-w-0 flex-col gap-0.5">
              <strong className="truncate text-[13px] sm:text-[15px]">Math: Module 1</strong>
              <span className="text-[11px] text-[#4D5577] sm:text-[13px]">Directions ▾</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <strong className="text-[17px] tabular-nums tracking-wide sm:text-[20px]">31:58</strong>
              <span className="rounded-full border-[1.5px] border-[#0F1535] px-3 text-[10px] font-bold sm:text-[11px]">Hide</span>
            </div>
            <div className="flex justify-end gap-3 sm:gap-5">
              <span className="flex flex-col items-center gap-[3px] text-[10px] text-[#2E3557] sm:text-[11px]">
                <svg aria-hidden viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="#0F1535" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="2" width="14" height="20" rx="2" />
                  <path d="M8 6h8" />
                </svg>
                Calculator
              </span>
              <span className="hidden flex-col items-center gap-[3px] text-[11px] text-[#2E3557] min-[480px]:flex">
                <span className="question-text text-[15px] font-semibold leading-[18px] text-[#0F1535]">x²</span>
                Reference
              </span>
            </div>
          </div>
          <div className="test-rule" />

          {/* Question */}
          <div className="flex flex-col gap-4 px-4 pb-6 pt-5 sm:gap-[18px] sm:px-[clamp(16px,6vw,72px)] sm:pb-[26px] sm:pt-[22px]">
            <div className="flex items-stretch rounded-[2px] bg-[#F0F2F8]">
              <span className="flex w-[38px] items-center justify-center bg-[#0F1535] text-[15px] font-extrabold text-white">4</span>
              <div className="flex flex-1 items-center justify-between px-3 py-2">
                <button
                  type="button"
                  aria-pressed={flagged}
                  onClick={() => setFlagged((value) => !value)}
                  className={`flex cursor-pointer items-center gap-1.5 py-1 text-[13px] ${flagged ? "font-extrabold text-[#B4231F]" : "font-bold text-[#0F1535]"}`}
                >
                  <FlagIcon filled={flagged} />
                  {flagged ? "Marked for Review" : "Mark for Review"}
                </button>
                <span className="rounded-[5px] border-[1.5px] border-[#0F1535] px-[5px] text-[11px] font-extrabold line-through">ABC</span>
              </div>
            </div>
            <p className="question-text m-0 text-[17px] sm:text-[19px]">
              If 3<i>x</i> + 5 = 20, what is the value of <i>x</i>?
            </p>
            <div className="flex flex-col gap-2.5">
              {CHOICES.map((choice) => {
                const selected = picked === choice.id;
                return (
                  <button
                    key={choice.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setPicked(choice.id)}
                    className={`flex min-h-12 cursor-pointer items-center gap-3.5 rounded-[10px] bg-white px-3.5 text-left ${
                      selected ? "border-[2.5px] border-brand-500 shadow-[0_0_0_4px_#E3E8FF]" : "border-[1.5px] border-[#0F1535]"
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 flex-none items-center justify-center rounded-full text-xs font-extrabold ${
                        selected ? "bg-brand-500 text-white" : "border-[1.5px] border-[#0F1535]"
                      }`}
                    >
                      {choice.id}
                    </span>
                    <span className="question-text text-[17px] sm:text-[18px]">{choice.text}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="test-rule" />
          <div className="flex items-center justify-between gap-2 px-3 py-3 sm:grid sm:grid-cols-3 sm:px-[22px]">
            <span className="hidden sm:block" />
            <span className="justify-self-center whitespace-nowrap rounded-lg bg-[#0F1535] px-3 py-1.5 text-[11px] font-bold text-white sm:px-3.5 sm:text-xs">
              Question 4 of 22 ▴
            </span>
            <div className="flex justify-end gap-2">
              <span className="rounded-full bg-brand-500 px-3.5 py-[7px] text-xs font-bold text-white sm:px-[18px] sm:text-[13px]">Back</span>
              <span className="rounded-full bg-brand-500 px-3.5 py-[7px] text-xs font-bold text-white sm:px-[18px] sm:text-[13px]">Next</span>
            </div>
          </div>
        </div>
      </div>
      {/* Laptop base */}
      <div className="-mx-4 flex h-3 justify-center rounded-b-[22px] bg-gradient-to-b from-[#D7DCEC] to-[#A9B1CC] shadow-[0_24px_30px_-18px_rgba(8,12,48,0.6)] sm:-mx-12 sm:h-4">
        <span className="h-1.5 w-[120px] rounded-b-lg bg-[#8E97B5]" />
      </div>
      {/* Module 2 badge */}
      <div className="absolute bottom-[58px] left-[-26px] hidden items-center gap-3 rounded-[14px] border-[1.5px] border-[#0F1535] bg-white px-4 py-3 shadow-[0_16px_34px_-16px_rgba(8,12,48,0.5)] md:flex">
        <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-brand-500">
          <svg aria-hidden viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 17l6-6 4 4 8-8M15 7h6v6" />
          </svg>
        </span>
        <span className="flex flex-col">
          <span className="text-[11px] font-extrabold tracking-[0.08em] text-[#4D5577]">MODULE 2</span>
          <strong className="text-[15px] text-brand-700">Adapts to your score</strong>
        </span>
      </div>
    </div>
  );
}
