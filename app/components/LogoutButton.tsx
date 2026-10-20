"use client";
import { LogOut } from "lucide-react";
import { useState } from "react";
import { signOut } from "@/app/components/AccountMenu";

export default function LogoutButton({ compact = false, tone = "dark" }: { compact?: boolean; tone?: "light" | "dark" }) {
  const [busy, setBusy] = useState(false);
  const colors = tone === "light" ? "border-white/25 text-white hover:bg-white/10" : "border-slate-200 text-navy hover:border-red-200 hover:bg-red-50 hover:text-red-700";
  return (
    <button onClick={() => { setBusy(true); signOut(); }} disabled={busy} title="Sign out" className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition disabled:opacity-60 ${colors}`}>
      <LogOut size={16} />
      {!compact && (busy ? "Signing out..." : "Sign out")}
    </button>
  );
}
