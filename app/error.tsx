"use client";
import { Home, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import Brand from "@/app/components/Brand";

/** Friendly fallback when a page crashes, instead of the browser's blank error. */
export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <main className="grid min-h-dvh place-items-center bg-[#f3f6fb] px-5 text-center text-navy">
      <div className="max-w-md">
        <div className="flex justify-center"><Brand /></div>
        <h1 className="mt-8 text-2xl font-extrabold">Something went wrong on this page</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Please try again. If it keeps happening, go back to the home page — your progress is saved.</p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <button onClick={reset} className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy px-5 py-3 text-sm font-bold text-white hover:bg-royal"><RotateCcw size={16} /> Try again</button>
          <Link href="/" className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold hover:border-royal"><Home size={16} /> Home</Link>
        </div>
      </div>
    </main>
  );
}
