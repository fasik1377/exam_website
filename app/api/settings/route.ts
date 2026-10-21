import { apiError } from "@/lib/api";
import { getSettings } from "@/lib/settings";

/** Public: whether students currently pay after a number of free questions. */
export async function GET() {
  try {
    return Response.json(await getSettings());
  } catch (error) { return apiError(error); }
}
