import { apiError, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getSettings, saveSettings } from "@/lib/settings";

export async function GET() {
  try {
    const auth = await requireUser(["super-admin"]); if (auth.error) return auth.error;
    return Response.json(await getSettings());
  } catch (error) { return apiError(error); }
}

/** Turn student payment on/off and set how many questions per subject are free. */
export async function PATCH(request: Request) {
  try {
    const auth = await requireUser(["super-admin"]); if (auth.error) return auth.error;
    const body = await readJson(request);
    const current = await getSettings();
    const paymentRequired = body.paymentRequired === undefined ? current.paymentRequired : body.paymentRequired === true;
    const freeQuestions = body.freeQuestions === undefined ? current.freeQuestions : Number(body.freeQuestions);
    if (!Number.isInteger(freeQuestions) || freeQuestions < 0 || freeQuestions > 100) return Response.json({ error: "Free questions must be a whole number between 0 and 100" }, { status: 400 });
    const value = { paymentRequired, freeQuestions };
    await saveSettings(value, auth.user.email);
    return Response.json(value);
  } catch (error) { return apiError(error); }
}
