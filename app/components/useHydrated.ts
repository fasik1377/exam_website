"use client";
import { useSyncExternalStore } from "react";

const noop = () => () => {};

/**
 * False while the page is being pre-rendered (and during hydration), true in the browser after.
 * Use it for anything that depends on the current date or time, so the pre-built HTML and the
 * browser never disagree (React error #418).
 */
export function useHydrated() {
  return useSyncExternalStore(noop, () => true, () => false);
}
