"use client";
import { motion } from "framer-motion";
import { useReducedMotionSafe } from "@/app/components/useReducedMotionSafe";
import type { ReactNode } from "react";

type Props = { children: ReactNode; delay?: number; y?: number; className?: string };

/** Fades and lifts its children into view the first time they scroll on screen. */
export default function Reveal({ children, delay = 0, y = 24, className }: Props) {
  const reduce = useReducedMotionSafe();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}
