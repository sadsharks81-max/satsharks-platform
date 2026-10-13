// Outgoing email through Resend's HTTP API (https://resend.com/docs/api-reference/emails/send-email).
// Plain fetch: one endpoint does not justify another dependency.
import { createLogger, toErrorMessage } from "@satsharks/utils";
import { env, isProduction } from "../config/env";

const logger = createLogger("email");
const RESEND_ENDPOINT = "https://api.resend.com/emails";

interface Email {
  to: string;
  subject: string;
  html: string;
  text: string;
}

// a***@example.com: enough to trace a delivery problem without putting addresses in the logs.
const maskEmail = (email: string) => email.replace(/^(.)[^@]*/, "$1***");

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);

async function send(email: Email): Promise<void> {
  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) {
    throw new Error("Email is not configured: set RESEND_API_KEY and RESEND_FROM_EMAIL in .env");
  }
  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.RESEND_FROM_EMAIL, to: [email.to], subject: email.subject, html: email.html, text: email.text }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    // Resend answers { name, message } on errors; the body never contains the API key.
    const body = await response.text().catch(() => "");
    throw new Error(`Resend answered ${response.status}: ${body.slice(0, 300)}`);
  }
}

export const emailService = {
  isConfigured(): boolean {
    return Boolean(env.RESEND_API_KEY && env.RESEND_FROM_EMAIL);
  },

  // Never throws: the caller answers the same way whether or not the email went out, so a failure
  // here must not reveal whether the address has an account. Failures are logged instead.
  async sendPasswordReset(to: string, name: string, link: string, expiresInMinutes: number): Promise<void> {
    if (!this.isConfigured() && !isProduction) {
      // Development without Resend: print the link so the flow can still be tried locally.
      logger.warn("Email not configured; password reset link printed here instead of sent", { to, resetLink: link });
      return;
    }
    try {
      await send({
        to,
        subject: "Reset your SAT Sharks password",
        text: [
          `Hi ${name},`,
          "",
          "We received a request to reset the password for your SAT Sharks account.",
          `Open this link to choose a new password (it works once and expires in ${expiresInMinutes} minutes):`,
          link,
          "",
          "If you did not ask for this, ignore this email. Your password will not change.",
        ].join("\n"),
        html: `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#0f172a;max-width:520px">
  <p style="font-size:22px;font-weight:700;color:#324dc7;margin:0 0 16px">SAT Sharks</p>
  <p>Hi ${escapeHtml(name)},</p>
  <p>We received a request to reset the password for your SAT Sharks account.</p>
  <p style="margin:24px 0"><a href="${escapeHtml(link)}" style="background:#324dc7;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:8px;display:inline-block">Choose a new password</a></p>
  <p style="font-size:13px;color:#475569">The link works once and expires in ${expiresInMinutes} minutes. If the button does not work, copy this address into your browser:<br><span style="word-break:break-all">${escapeHtml(link)}</span></p>
  <p style="font-size:13px;color:#475569">If you did not ask for this, ignore this email. Your password will not change.</p>
</div>`,
      });
      logger.info("Password reset email sent", { to: maskEmail(to) });
    } catch (error) {
      logger.error("Password reset email failed", { to: maskEmail(to), error: toErrorMessage(error) });
    }
  },

  // Streak reminders and the weekly progress email. `lines` are plain sentences; `rows` a small
  // label/value table. Ends with a button and a line on how to turn these emails off.
  // Returns whether it was sent (false = not configured or failed; logged).
  async sendProgress(
    to: string,
    message: { subject: string; greeting: string; lines: string[]; rows?: [string, string][]; button: { label: string; link: string }; settingsLink: string },
  ): Promise<boolean> {
    if (!this.isConfigured()) {
      if (!isProduction) logger.warn("Email not configured; progress email not sent", { to, subject: message.subject });
      return false;
    }
    const rows = message.rows ?? [];
    try {
      await send({
        to,
        subject: message.subject,
        text: [
          message.greeting,
          "",
          ...message.lines,
          ...(rows.length ? ["", ...rows.map(([label, value]) => `${label}: ${value}`)] : []),
          "",
          `${message.button.label}: ${message.button.link}`,
          "",
          `To stop these emails, change your email choices on ${message.settingsLink}`,
        ].join("\n"),
        html: `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#0f172a;max-width:520px">
  <p style="font-size:22px;font-weight:700;color:#324dc7;margin:0 0 16px">SAT Sharks</p>
  <p>${escapeHtml(message.greeting)}</p>
  ${message.lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("\n  ")}
  ${
    rows.length
      ? `<table style="border-collapse:collapse;margin:16px 0;width:100%">${rows
          .map(
            ([label, value]) =>
              `<tr><td style="padding:6px 0;border-bottom:1px solid #e2e8f0;color:#475569">${escapeHtml(label)}</td><td style="padding:6px 0;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700">${escapeHtml(value)}</td></tr>`,
          )
          .join("")}</table>`
      : ""
  }
  <p style="margin:24px 0"><a href="${escapeHtml(message.button.link)}" style="background:#324dc7;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:8px;display:inline-block">${escapeHtml(message.button.label)}</a></p>
  <p style="font-size:12px;color:#64748b">You get this because email reminders are on in your SAT Sharks account. <a href="${escapeHtml(message.settingsLink)}" style="color:#324dc7">Change your email choices</a>.</p>
</div>`,
      });
      logger.info("Progress email sent", { to: maskEmail(to), subject: message.subject });
      return true;
    } catch (error) {
      logger.error("Progress email failed", { to: maskEmail(to), error: toErrorMessage(error) });
      return false;
    }
  },
};
