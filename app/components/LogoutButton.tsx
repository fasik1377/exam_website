"use client";
import { LogOut } from "lucide-react";
import { useState } from "react";

export default function LogoutButton({ compact = false, tone = "dark" }: { compact?: boolean; tone?: "light" | "dark" }) {
  const [busy, setBusy] = useState(false);
  async function signOut() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    // Full navigation so every client cache forgets the previous session.
    window.location.href = "/";
  }
  const colors = tone === "light" ? "border-white/25 text-white hover:bg-white/10" : "border-slate-200 text-navy hover:border-red-200 hover:bg-red-50 hover:text-red-700";
  return (
    <button onClick={signOut} disabled={busy} title="Sign out" className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition disabled:opacity-60 ${colors}`}>
      <LogOut size={16} />
      {!compact && (busy ? "Signing out..." : "Sign out")}
    </button>
  );
}
