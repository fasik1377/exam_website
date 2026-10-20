import nodemailer, { type Transporter } from "nodemailer";

const globalMail = globalThis as typeof globalThis & { mailer?: Transporter };

function transporter(): Transporter | null {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  if (!globalMail.mailer) {
    const port = Number(SMTP_PORT || 465);
    globalMail.mailer = nodemailer.createTransport({ host: SMTP_HOST, port, secure: port === 465, auth: { user: SMTP_USER, pass: SMTP_PASS } });
  }
  return globalMail.mailer;
}

export const siteUrl = () => (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");

const escape = (value: string) => value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Branded HTML email. `rows` render as a label/value table; values are escaped. */
function layout(title: string, intro: string, rows: [string, string][], button?: { label: string; href: string }) {
  const table = rows.map(([k, v]) => `<tr><td style="padding:6px 0;color:#64748b;width:140px">${escape(k)}</td><td style="padding:6px 0;font-weight:600;color:#0B1F3A">${escape(v)}</td></tr>`).join("");
  const cta = button ? `<a href="${button.href}" style="display:inline-block;margin-top:24px;background:#0B1F3A;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:12px">${escape(button.label)}</a>` : "";
  return `<!doctype html><html><body style="margin:0;background:#f3f6fb;font-family:Segoe UI,Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px">
    <div style="background:#0B1F3A;border-radius:16px 16px 0 0;padding:20px 24px;font-size:20px;font-weight:800;color:#fff">እውቀት<span style="color:#F4B740">NET</span></div>
    <div style="background:#fff;border-radius:0 0 16px 16px;padding:28px 24px;border:1px solid #e2e8f0;border-top:0">
      <h1 style="margin:0 0 8px;font-size:22px;color:#0B1F3A">${escape(title)}</h1>
      <p style="margin:0 0 16px;color:#475569;line-height:1.6">${escape(intro)}</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">${table}</table>
      ${cta}
    </div>
    <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:16px">እውቀትNET · Ethiopian exam preparation</p>
  </div></body></html>`;
}

export type MailResult = { ok: boolean; error?: string };

async function send(to: string, subject: string, html: string, text: string): Promise<MailResult> {
  const mailer = transporter();
  if (!mailer) {
    console.info(`[mail] SMTP not configured — skipped "${subject}" to ${to}`);
    return { ok: false, error: "Email is not configured: set SMTP_HOST, SMTP_USER and SMTP_PASS." };
  }
  try {
    await mailer.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, html, text });
    return { ok: true };
  } catch (error) {
    // Email must never break the request that triggered it.
    console.error("[mail] send failed", error);
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: /535|Username and Password not accepted|Invalid login/i.test(message) ? "Gmail rejected the login — SMTP_PASS must be a 16-character Google App Password, not your normal password." : message };
  }
}

/** Address that receives "new registration" alerts. */
export const notifyAddress = () => process.env.NOTIFY_EMAIL || process.env.SUPER_ADMIN_EMAIL || "";

/** Whether sending is configured, without revealing secrets. */
export function mailStatus() {
  return { configured: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS), from: process.env.MAIL_FROM || process.env.SMTP_USER || "", to: notifyAddress() };
}

/** Sends a test message so the super admin can confirm notifications work. */
export function sendTestEmail(to: string) {
  return send(to, "እውቀትNET test email ✔", layout("Email notifications are working", "This test confirms that እውቀትNET can send you emails about new registrations.", [["Sent", new Date().toUTCString()]]), "Email notifications are working.");
}

/** Password-reset link (valid for 1 hour). */
export function notifyPasswordReset(user: { name: string; email: string }, token: string) {
  const link = `${siteUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  return send(user.email, "Reset your እውቀትNET password", layout("Reset your password", `Hi ${user.name}, we received a request to reset your password. The link below works for 1 hour. If you didn't ask for this, you can ignore this email.`, [], { label: "Choose a new password", href: link }), `Reset your password (valid for 1 hour): ${link}`);
}

type Applicant = { name: string; email: string; role: "student" | "admin"; subject?: string };

/** Tells the super admin(s) that someone registered and is waiting for approval. */
export function notifyNewRegistration(applicant: Applicant, adminEmails: string[]) {
  const roleLabel = applicant.role === "admin" ? "Teacher" : "Student";
  // The owner's address from the environment; other super-admin accounts only as a last resort.
  const to = notifyAddress() || adminEmails.join(", ");
  if (!to) return Promise.resolve({ ok: false, error: "No notification address" });
  const rows: [string, string][] = [["Name", applicant.name], ["Email", applicant.email], ["Role", roleLabel]];
  if (applicant.subject) rows.push(["Subject", applicant.subject]);
  rows.push(["Registered", new Date().toUTCString()]);
  const link = `${siteUrl()}/super-admin?tab=approvals`;
  return send(
    to,
    `New ${roleLabel.toLowerCase()} registration: ${applicant.name}`,
    layout(`New ${roleLabel.toLowerCase()} waiting for approval`, `${applicant.name} has registered on እውቀትNET and cannot sign in until you approve the account.`, rows, { label: "Review and approve", href: link }),
    `New ${roleLabel} registration\n\n${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\nReview: ${link}`,
  );
}

/** Tells an applicant that their account was approved or rejected. */
export function notifyDecision(user: { name: string; email: string }, approved: boolean) {
  const link = `${siteUrl()}/login`;
  return approved
    ? send(user.email, "Your እውቀትNET account is approved", layout("Welcome to እውቀትNET!", `Hi ${user.name}, your account has been approved. You can now sign in and start using the platform.`, [], { label: "Sign in now", href: link }), `Hi ${user.name}, your account has been approved. Sign in: ${link}`)
    : send(user.email, "Your እውቀትNET registration", layout("Registration not approved", `Hi ${user.name}, unfortunately your registration was not approved. If you think this is a mistake, please reply to this email.`, []), `Hi ${user.name}, unfortunately your registration was not approved.`);
}
