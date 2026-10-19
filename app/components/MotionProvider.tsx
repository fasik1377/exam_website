"use client";
import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/** Makes every framer-motion animation respect the visitor's "reduce motion" setting. */
export default function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
