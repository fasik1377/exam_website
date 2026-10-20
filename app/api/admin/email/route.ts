import { apiError, cleanString, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { mailStatus, notifyAddress, sendTestEmail } from "@/lib/mail";

/** Is email configured, and where do registration alerts go? */
export async function GET() {
  try {
    const auth = await requireUser(["super-admin"]); if (auth.error) return auth.error;
    return Response.json(mailStatus());
  } catch (error) { return apiError(error); }
}

/** Sends a test email (to the notification address by default) and reports the exact result. */
export async function POST(request: Request) {
  try {
    const auth = await requireUser(["super-admin"]); if (auth.error) return auth.error;
    const body = await readJson(request);
    const to = cleanString(body.to, 160) || notifyAddress() || auth.user.email;
    const result = await sendTestEmail(to);
    return Response.json({ ...result, to }, { status: result.ok ? 200 : 502 });
  } catch (error) { return apiError(error); }
}
