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
};
