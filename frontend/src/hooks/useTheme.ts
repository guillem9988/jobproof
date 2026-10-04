import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem("jobproof-theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // storage unavailable
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem("jobproof-theme", theme);
    } catch {
      // storage unavailable
    }
  }, [theme]);
  return { theme, toggle: () => setTheme((p) => (p === "dark" ? "light" : "dark")) };
}
