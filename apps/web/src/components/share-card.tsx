"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ShareCard as ShareCardData } from "@satsharks/types";
import { api } from "@/lib/api";
import { LOGO_PATH, LOGO_SIZE } from "./logo";
import { Button, Card, Notice } from "./ui";

// A score-improvement card for Instagram stories / posts and WhatsApp (1080×1350). Only the
// student's real numbers: first and best full-test totals and the current streak.
const W = 1080;
const H = 1350;
const BRAND = "#324dc7";
const FONT = "Roboto, Arial, sans-serif";

function headline(card: ShareCardData): { big: string; line: string } {
  if (card.first !== null && card.best !== null && card.tests >= 2 && card.best > card.first) {
    return { big: `+${card.best - card.first}`, line: `points on my SAT practice tests: ${card.first} → ${card.best}` };
  }
  if (card.best !== null) return { big: String(card.best), line: "my best SAT practice test score" };
  return { big: `${card.streak}`, line: `day${card.streak === 1 ? "" : "s"} of SAT practice in a row` };
}

function draw(canvas: HTMLCanvasElement, card: ShareCardData, site: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = BRAND;
  ctx.fillRect(0, 0, W, H);
  // A soft lighter wave at the bottom, like the landing page hero.
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath();
  ctx.moveTo(0, H * 0.72);
  ctx.bezierCurveTo(W * 0.3, H * 0.64, W * 0.6, H * 0.82, W, H * 0.7);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();

  // Logo, white.
  const logoW = 420;
  const scale = logoW / LOGO_SIZE.width;
  ctx.save();
  ctx.translate((W - logoW) / 2, 110);
  ctx.scale(scale, scale);
  ctx.fillStyle = "#fff";
  ctx.fill(new Path2D(LOGO_PATH));
  ctx.restore();

  const { big, line } = headline(card);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.font = `700 260px ${FONT}`;
  ctx.fillText(big, W / 2, 640);
  ctx.font = `500 46px ${FONT}`;
  wrap(ctx, line, W / 2, 730, 860, 58);

  ctx.font = `700 44px ${FONT}`;
  const facts = [card.tests > 0 ? `${card.tests} full test${card.tests === 1 ? "" : "s"}` : null, card.streak > 0 ? `${card.streak}-day streak` : null].filter(Boolean).join("  ·  ");
  if (facts) ctx.fillText(facts, W / 2, 940);

  ctx.font = `500 40px ${FONT}`;
  ctx.fillText(card.name, W / 2, 1180);
  ctx.font = `700 42px ${FONT}`;
  ctx.fillText(site, W / 2, 1250);
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(" ");
  let row = "";
  let top = y;
  for (const word of words) {
    const next = row ? `${row} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && row) {
      ctx.fillText(row, x, top);
      row = word;
      top += lineHeight;
    } else row = next;
  }
  if (row) ctx.fillText(row, x, top);
}

export function ShareCard() {
  const card = useQuery({ queryKey: ["student", "share-card"], queryFn: () => api<{ card: ShareCardData }>("/api/student/share-card") });
  const canvas = useRef<HTMLCanvasElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [site, setSite] = useState("");
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setSite(window.location.host);
    setOrigin(window.location.origin);
  }, []);

  const data = card.data?.card;
  const hasSomething = !!data && (data.best !== null || data.streak > 0);
  useEffect(() => {
    if (data && hasSomething && canvas.current) void document.fonts?.ready.then(() => draw(canvas.current!, data, site));
  }, [data, hasSomething, site]);

  const text = data ? `${headline(data).big} ${headline(data).line}. Practising for the SAT on SAT Sharks: ${origin}` : "";

  function blob(): Promise<Blob | null> {
    return new Promise((resolve) => canvas.current?.toBlob(resolve, "image/png") ?? resolve(null));
  }

  async function share() {
    setMessage(null);
    const image = await blob();
    if (!image) return;
    const file = new File([image], "sat-sharks-progress.png", { type: "image/png" });
    // Phones: the share sheet (Instagram, WhatsApp, …) with the image attached.
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text });
      } catch {
        // Closed the share sheet.
      }
      return;
    }
    download(image);
    setMessage("Image saved. Post it on Instagram, or attach it in WhatsApp.");
  }

  function download(image: Blob) {
    const url = URL.createObjectURL(image);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sat-sharks-progress.png";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <Card>
      <h2 className="font-bold">Share your progress</h2>
      <p className="mt-1 text-sm text-slate-600">A card with your real numbers for Instagram or WhatsApp.</p>
      {card.error && (
        <div className="mt-3">
          <Notice tone="error">{card.error.message}</Notice>
        </div>
      )}
      {data && !hasSomething && <p className="mt-3 text-sm text-slate-600">Finish a full test or start a streak to make your card.</p>}
      {data && hasSomething && (
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
          <canvas ref={canvas} width={W} height={H} className="w-full max-w-[240px] rounded-xl border border-slate-900" aria-label="Your progress card" />
          <div className="flex flex-col gap-2">
            <Button onClick={share}>Share image</Button>
            <Button
              variant="outline"
              onClick={async () => {
                const image = await blob();
                if (image) download(image);
                setMessage("Image saved.");
              }}
            >
              Download image
            </Button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(text)}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-slate-900 bg-white px-5 py-2.5 text-center text-sm font-bold text-slate-900 hover:bg-slate-100"
            >
              Send on WhatsApp
            </a>
            {message && <p className="text-xs text-slate-600">{message}</p>}
          </div>
        </div>
      )}
    </Card>
  );
}
