import { createContext, useContext } from "react";
import type { Lang, Translations } from "./i18n";
import type { Job, Task } from "./types";
import type { Page, ReportTab } from "./hooks/useRoute";

export interface JobDraft {
  title: string;
  company: string;
  url: string;
  text: string;
  language: string;
  fetchUrl: string;
}

export const emptyJobDraft: JobDraft = {
  title: "",
  company: "",
  url: "",
  text: "",
  language: "en",
  fetchUrl: "",
};

export interface AppContextValue {
  t: Translations;
  lang: Lang;
  busy: boolean;
  setError: (message: string) => void;
  /** Runs an async action with the shared busy/error handling and refreshes list queries afterwards. */
  act: (fn: () => Promise<void>) => Promise<void>;
  go: (page: Exclude<Page, "report">) => void;
  openReport: (id: string, tab?: ReportTab) => void;
  /** Starts following a background task on the progress page. */
  track: (task: Task) => void;
  job: Job | null;
  setJob: (job: Job | null) => void;
  selected: string[];
  setSelected: (ids: string[]) => void;
  jobDraft: JobDraft;
  setJobDraft: (draft: JobDraft) => void;
  loadDemo: () => Promise<void>;
  setupAndRun: () => Promise<void>;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppContext.Provider>");
  return ctx;
}
