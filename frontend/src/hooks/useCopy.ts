import { useCallback, useEffect, useRef, useState } from "react";

/** Copies text to the clipboard and exposes a short-lived `copied` flag for button feedback. */
export function useCopy(resetMs = 2000) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), resetMs);
      } catch {
        // clipboard unavailable (permissions or insecure context)
      }
    },
    [resetMs],
  );
  return { copied, copy };
}
