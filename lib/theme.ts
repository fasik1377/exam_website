export type Theme = "light" | "dark";
export const THEME_KEY = "theme";

/**
 * Runs before the page paints (inlined in <head>) so there is never a flash of the wrong theme:
 * the saved choice wins, otherwise the device's light/dark setting.
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";var d=document.documentElement;d.classList.toggle("dark",t==="dark");d.style.colorScheme=t;}catch(e){}})();`;
