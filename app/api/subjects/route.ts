import { apiError } from "@/lib/api";
import { getSubjects } from "@/lib/subjectStore";

/** Public list of active subjects (used by sign-up, practice pages and forms). */
export async function GET() {
  try {
    return Response.json({ subjects: await getSubjects() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}
