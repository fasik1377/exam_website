"use client";
import { motion, useInView } from "framer-motion";
import { Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const MESSAGES = [
  { from: "teacher", text: "Hello! Which part of the question would you like me to explain?" },
  { from: "student", text: "How do I solve 2(x + 4) = 18?" },
  { from: "teacher", text: "Divide both sides by 2 first: x + 4 = 9. Then subtract 4 — so x = 5. 🎉" },
];

/** A chat preview that "types" its messages one by one when scrolled into view. */
export default function SupportChat() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!inView || shown >= MESSAGES.length) return;
    const id = window.setTimeout(() => setShown((n) => n + 1), shown === 0 ? 300 : 1400);
    return () => window.clearTimeout(id);
  }, [inView, shown]);

  const typing = inView && shown < MESSAGES.length;
  const nextFrom = MESSAGES[shown]?.from;

  return (
    <div ref={ref} className="glass rounded-2xl p-5">
      <div className="flex items-center gap-3 border-b border-white/10 pb-4">
        <span className="relative grid h-11 w-11 place-items-center rounded-full bg-gold font-extrabold text-navy">
          T<span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-navy bg-green-400" />
        </span>
        <div>
          <p className="font-bold">Teacher Hana</p>
          <p className="text-xs text-white/60">Mathematics support · Online</p>
        </div>
      </div>
      <div className="flex min-h-56 flex-col gap-3 py-5">
        {MESSAGES.slice(0, shown).map((message, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.from === "teacher" ? "self-start rounded-tl-sm bg-white/12 text-white" : "self-end rounded-tr-sm bg-gold font-medium text-navy"}`}
          >
            {message.text}
          </motion.div>
        ))}
        {typing && shown > 0 && (
          <div className={`flex gap-1 rounded-2xl px-4 py-3 ${nextFrom === "teacher" ? "self-start bg-white/12" : "self-end bg-gold/70"}`} aria-label="typing">
            {[0, 1, 2].map((dot) => (
              <motion.span key={dot} className="h-1.5 w-1.5 rounded-full bg-current opacity-70" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.8, repeat: Infinity, delay: dot * 0.15 }} />
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm text-white/50">
        <span className="flex-1">Type your question...</span>
        <Send size={16} />
      </div>
    </div>
  );
}
