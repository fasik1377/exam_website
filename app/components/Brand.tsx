import Link from "next/link";

type Props = { href?: string; tone?: "light" | "dark"; size?: "sm" | "md"; subtitle?: string };

/** The እውቀትNET logo mark with its two-tone wordmark. */
export default function Brand({ href = "/", tone = "dark", size = "md", subtitle }: Props) {
  const box = size === "sm" ? "h-9 w-9" : "h-11 w-11";
  return (
    <Link href={href} className="group flex items-center gap-3" aria-label="እውቀትNET home">
      <span className={`${box} grid shrink-0 place-items-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/logo-mark.png" alt="" className="h-full w-full object-contain p-0.5" />
      </span>
      <span className="leading-tight">
        <span className={`block font-amharic font-extrabold tracking-tight ${size === "sm" ? "text-lg" : "text-xl"}`}>
          <span className={tone === "light" ? "text-white" : "text-navy"}>እውቀት</span>
          <span className="text-gold">NET</span>
        </span>
        {subtitle && <span className={`block text-[11px] font-semibold uppercase tracking-[.16em] ${tone === "light" ? "text-white/55" : "text-slate-500"}`}>{subtitle}</span>}
      </span>
    </Link>
  );
}
