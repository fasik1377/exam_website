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

type Applicant = { name: string; email: string; role: "student" | "admin"; subject?: string; grade?: string; stream?: string | null };
const streamName = (stream?: string | null) => (stream === "natural" ? "Natural Science" : stream === "social" ? "Social Science" : "");

/** Tells the super admin(s) that someone registered and is waiting for approval. */
export function notifyNewRegistration(applicant: Applicant, adminEmails: string[]) {
  const roleLabel = applicant.role === "admin" ? "Teacher" : "Student";
  // The owner's address from the environment; other super-admin accounts only as a last resort.
  const to = notifyAddress() || adminEmails.join(", ");
  if (!to) return Promise.resolve({ ok: false, error: "No notification address" });
  const rows: [string, string][] = [["Name", applicant.name], ["Email", applicant.email], ["Role", roleLabel]];
  if (applicant.subject) rows.push(["Subject", applicant.subject]);
  if (applicant.grade) rows.push(["Grade", applicant.grade]);
  if (applicant.stream) rows.push(["Stream", streamName(applicant.stream)]);
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
type Applicant2 = { name: string; email: string; role: "student" | "admin" | string; subject?: string | null; grade?: string | null; stream?: string | null };
const roleWord = (role: string) => (role === "admin" ? "teacher" : "student");
const loginPath = (role: string) => (role === "admin" ? "/admin/login" : "/login");

/** Sent to the applicant right after they register: received, now waiting for approval. */
export function notifyRegistrationReceived(user: Applicant2) {
  const rows: [string, string][] = [["Name", user.name], ["Email", user.email], ["Account type", roleWord(user.role) === "teacher" ? "Teacher" : "Student"]];
  if (user.subject) rows.push(["Subject", user.subject]);
  if (user.grade) rows.push(["Grade", user.grade]);
  if (user.stream) rows.push(["Stream", streamName(user.stream)]);
  rows.push(["Status", "Waiting for approval"]);
  return send(
    user.email,
    "We received your እውቀትNET registration",
    layout(
      "Registration received — waiting for approval",
      `Hi ${user.name}, thank you for registering as a ${roleWord(user.role)} on እውቀትNET. A platform administrator will review your account shortly. You can't sign in yet — we'll email you again as soon as your account is approved.`,
      rows,
    ),
    `Hi ${user.name}, we received your ${roleWord(user.role)} registration on እውቀትNET. Your account is waiting for approval; we'll email you when you can sign in.`,
  );
}

/** Sent when the super admin approves (access granted) or rejects a registration. */
export function notifyDecision(user: Applicant2, approved: boolean) {
  const link = `${siteUrl()}${loginPath(user.role)}`;
  if (approved) {
    const teacher = roleWord(user.role) === "teacher";
    const rows: [string, string][] = [
      ["Account type", teacher ? "Teacher" : "Student"],
      ["Sign in at", link],
      ["Email", user.email],
      ["You can now", teacher ? "Publish questions, upload exam files and answer students" : "Practise exams, see explanations and chat with teachers"],
    ];
    return send(
      user.email,
      "✅ Your እውቀትNET account is approved — you have access now",
      layout("You have access now!", `Hi ${user.name}, good news — your ${roleWord(user.role)} account has been approved. Sign in with the email and password you registered with.`, rows, { label: teacher ? "Go to teacher login" : "Sign in and start practising", href: link }),
      `Hi ${user.name}, your ${roleWord(user.role)} account on እውቀትNET has been approved. You have access now — sign in at ${link}`,
    );
  }
  return send(
    user.email,
    "Your እውቀትNET registration",
    layout("Registration not approved", `Hi ${user.name}, unfortunately your registration was not approved. If you think this is a mistake, please reply to this email.`, []),
    `Hi ${user.name}, unfortunately your registration was not approved.`,
  );
}

type WeeklyWinner = { name: string; email: string; rank: number | null; grade: string | null; score: number; answers: number; correct: number; days: number };
const MEDAL = ["", "🥇", "🥈", "🥉"];

/** Congratulates a student of the week (sent on Saturday at 12:00). */
export function notifyWeeklyTop(w: WeeklyWinner, week: string, perGrade: boolean) {
  const place = `#${w.rank}${perGrade && w.grade ? ` in ${w.grade}` : ""}`;
  return send(
    w.email,
    `${MEDAL[w.rank ?? 0] ?? "🏆"} You're ${place} student of the week on እውቀትNET!`,
    layout(`Congratulations, ${w.name.split(" ")[0]}!`, `You are ${place} student of the week (${week}). Your hard work is paying off — keep it going!`, [
      ["Rank", `${MEDAL[w.rank ?? 0] ?? ""} ${place}`],
      ["Weekly score", `${w.score} / 100`],
      ["Answers", `${w.correct} correct of ${w.answers}`],
      ["Days practised", `${w.days} of 7`],
    ], { label: "See the leaderboard", href: `${siteUrl()}/student` }),
    `Congratulations ${w.name}! You are ${place} student of the week (${week}) on እውቀትNET with a score of ${w.score}/100 (${w.correct} correct of ${w.answers} answers, ${w.days} days).`,
  );
}

/** Tells the platform admin who won this week. */
export function notifyTopStudentsSummary(to: string, winners: WeeklyWinner[], week: string) {
  const rows: [string, string][] = winners.map((w) => [`${MEDAL[w.rank ?? 0] ?? ""} #${w.rank}${w.grade ? ` · ${w.grade}` : ""}`, `${w.name} — ${w.score}/100 (${w.correct}/${w.answers}, ${w.days} days)`]);
  return send(to, `🏆 Students of the week: ${week}`, layout("Students of the week", `These students were announced as the top performers for ${week}. They have been notified.`, rows, { label: "Open the admin dashboard", href: `${siteUrl()}/super-admin?tab=top` }), rows.map((r) => r.join(": ")).join("\n"));
}
