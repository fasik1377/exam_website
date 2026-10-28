"use client";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import AccountMenu from "@/app/components/AccountMenu";
import BackButton from "@/app/components/BackButton";
import Brand from "@/app/components/Brand";

// The editor reads saved work from the browser, so it renders on the client only.
const Editor = dynamic(() => import("./Playground").then((m) => m.PlaygroundWithHandoff), {
  ssr: false,
  loading: () => <div className="h-[min(82vh,860px)] min-h-[560px] animate-pulse rounded-3xl bg-slate-100" />,
});

export default function PlaygroundPage() {
  return <Suspense><Page /></Suspense>;
}

function Page() {
  const subject = useSearchParams().get("subject") || "";
  return (
    <main className="min-h-screen bg-[#f3f6fb] text-navy">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-3">
          <div className="flex items-center gap-2 sm:gap-4"><BackButton href="/student" label="Back" /><Brand size="sm" subtitle="Code playground" /></div>
          <AccountMenu />
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-5">
        <p className="text-xs font-bold uppercase tracking-[.16em] text-royal">{subject || "Web development"}</p>
        <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">Try it yourself</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">Write HTML, CSS and JavaScript and see the result straight away. Your work is saved in this browser. Pick an example to get started.</p>
        <div className="mt-5"><Editor storageKey={subject ? `page:${subject}` : "page"} title={subject ? `${subject} playground` : "Code playground"} /></div>
      </div>
    </main>
  );
}
