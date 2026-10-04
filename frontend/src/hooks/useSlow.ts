import { useEffect, useState } from "react";

/** True once `pending` has lasted longer than `ms`, so quick loads never flash a message. */
export function useSlow(pending: boolean, ms = 2500) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!pending) {
      setSlow(false);
      return;
    }
    const id = setTimeout(() => setSlow(true), ms);
    return () => clearTimeout(id);
  }, [pending, ms]);
  return slow;
}
