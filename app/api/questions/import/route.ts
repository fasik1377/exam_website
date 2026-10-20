import { apiError } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { MAX_UPLOAD_BYTES, UnsupportedDocumentError, documentText } from "@/lib/documentText";
import { parseQuestions } from "@/lib/questionParser";

export const runtime = "nodejs";

/** Reads an uploaded exam document and returns the questions found in it for the teacher to review (nothing is saved). */
export async function POST(request: Request) {
  try {
    const auth = await requireUser(["admin", "super-admin"]);
    if (auth.error) return auth.error;
    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) return Response.json({ error: "Choose a file to upload" }, { status: 400 });
    if (file.size > MAX_UPLOAD_BYTES) return Response.json({ error: "The file is larger than 10 MB" }, { status: 413 });
    const { text, notes } = await documentText(file.name, await file.arrayBuffer());
    const { questions, warnings } = parseQuestions(text);
    if (questions.length > 300) return Response.json({ error: "A single upload can contain at most 300 questions. Split the file and try again." }, { status: 400 });
    return Response.json({ fileName: file.name, questions, warnings: [...notes, ...warnings] });
  } catch (error) {
    if (error instanceof UnsupportedDocumentError) return Response.json({ error: error.message }, { status: 400 });
    return apiError(error);
  }
}
