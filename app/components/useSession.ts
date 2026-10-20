"use client";
import { useCallback, useEffect, useState } from "react";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: "student" | "admin" | "super-admin";
  status: string;
  plan: "free" | "monthly" | "yearly" | "teacher";
  subject?: string;
  grade?: string;
  stream?: "natural" | "social" | null;
};

/** Why the visitor was signed out (e.g. their account signed in on another device). */
export type SignedOutReason = "replaced" | "expired" | "inactive" | "signed-out-everywhere";

type SessionState = { user: SessionUser | null; loading: boolean; unavailable: boolean; reason?: SignedOutReason };

export function dashboardFor(role: SessionUser["role"]) {
  if (role === "super-admin") return "/super-admin";
  if (role === "admin") return "/admin";
  return "/student";
}

async function fetchSession(): Promise<SessionState> {
  try {
    const response = await fetch("/api/auth/me", { cache: "no-store" });
    const data = await response.json();
    return { user: data.user ?? null, loading: false, unavailable: Boolean(data.unavailable), reason: data.reason };
  } catch {
    return { user: null, loading: false, unavailable: false };
  }
}

export function useSession() {
  const [state, setState] = useState<SessionState>({ user: null, loading: true, unavailable: false });

  useEffect(() => {
    let active = true;
    fetchSession().then((next) => active && setState(next));
    return () => { active = false; };
  }, []);

  const refresh = useCallback(() => fetchSession().then(setState), []);

  return { ...state, refresh };
}
