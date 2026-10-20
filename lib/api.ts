import { DatabaseUnavailableError } from "@/lib/db";

export function cleanString(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function isDatabaseError(error: unknown) {
  if (error instanceof DatabaseUnavailableError) return true;
  const name = error instanceof Error ? error.name : "";
  return /^Mongo(ServerSelection|Network|Topology)/.test(name);
}

export function apiError(error: unknown) {
  // Two registrations with the same email at the same moment: the unique index rejects the second.
  const duplicate = error as { code?: number; keyPattern?: Record<string, unknown> };
  if (duplicate?.code === 11000 && duplicate.keyPattern && "email" in duplicate.keyPattern) {
    return Response.json({ error: "An account with this email already exists" }, { status: 409 });
  }
  console.error(error);
  if (isDatabaseError(error)) {
    return Response.json({ error: "The service is temporarily unavailable because the database cannot be reached. Please try again shortly." }, { status: 503 });
  }
  return Response.json({ error: "The request could not be completed" }, { status: 500 });
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? body : {};
  } catch {
    return {};
  }
}
