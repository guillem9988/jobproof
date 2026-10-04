import { useCallback, useMemo, useSyncExternalStore } from "react";

export type Page =
  | "home"
  | "projects"
  | "job"
  | "progress"
  | "history"
  | "settings"
  | "report";

export type ReportTab =
  | "evidence"
  | "resume"
  | "next_steps"
  | "interview"
  | "cover_letter";

export interface Route {
  page: Page;
  reportId: string;
  tab: ReportTab;
}

const PAGES: Page[] = ["home", "projects", "job", "progress", "history", "settings"];
const TABS: ReportTab[] = ["evidence", "resume", "next_steps", "interview", "cover_letter"];

export function parseHash(hash: string): Route {
  const [first = "", id = "", tab = ""] = hash
    .replace(/^#\/?/, "")
    .split("/")
    .map(decodeURIComponent);
  if (first === "report" && id) {
    return {
      page: "report",
      reportId: id,
      tab: TABS.includes(tab as ReportTab) ? (tab as ReportTab) : "evidence",
    };
  }
  const page = PAGES.includes(first as Page) ? (first as Page) : "home";
  return { page, reportId: "", tab: "evidence" };
}

export function formatHash(route: Partial<Route> & { page: Page }): string {
  if (route.page === "home") return "#/";
  if (route.page === "report" && route.reportId) {
    const tab = route.tab && route.tab !== "evidence" ? `/${route.tab}` : "";
    return `#/report/${encodeURIComponent(route.reportId)}${tab}`;
  }
  return `#/${route.page}`;
}

function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

/** Hash-based routing so the current page, report and tab survive reloads and can be shared. */
export function useRoute() {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  const route = useMemo(() => parseHash(hash), [hash]);
  const navigate = useCallback((next: Partial<Route> & { page: Page }) => {
    const target = formatHash(next);
    if (window.location.hash !== target) window.location.hash = target;
  }, []);
  return { route, navigate };
}
