import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronRight,
  Loader2,
  FileText,
  FolderGit2,
  History,
  Moon,
  Settings,
  ShieldCheck,
  Sun,
  X,
} from "lucide-react";
import { one, request } from "./api";
import { AppContext, emptyJobDraft, type AppContextValue } from "./app-context";
import { useHealth, useHistory, useProjects, useTask } from "./hooks/queries";
import { useRoute, type Page, type ReportTab } from "./hooks/useRoute";
import { useSlow } from "./hooks/useSlow";
import { useTheme } from "./hooks/useTheme";
import { translations, type Lang } from "./i18n";
import { HistoryPage } from "./pages/HistoryPage";
import { HomePage } from "./pages/HomePage";
import { JobPage } from "./pages/JobPage";
import { ProgressPage } from "./pages/ProgressPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { ReportPage } from "./pages/report/ReportPage";
import { SettingsPage } from "./pages/SettingsPage";
import { qc } from "./queryClient";
import type { Job, Task } from "./types";

const BRAND = "JobProof";
const LANGS: Lang[] = ["ca", "en", "es"];

function storedLang(): Lang {
  try {
    const saved = localStorage.getItem("jobproof-lang");
    if (LANGS.includes(saved as Lang)) return saved as Lang;
  } catch {
    // storage unavailable
  }
  return "en";
}

const storedTask = () => {
  try {
    return localStorage.getItem("jobproof-task") || "";
  } catch {
    return "";
  }
};

export function App() {
  const { route, navigate } = useRoute();
  const { theme, toggle: toggleTheme } = useTheme();
  const [lang, setLang] = useState<Lang>(storedLang);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [job, setJob] = useState<Job | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [jobDraft, setJobDraft] = useState(emptyJobDraft);
  const [taskId, setTaskId] = useState(storedTask);
  const taskHandled = useRef("");
  const mainRef = useRef<HTMLElement>(null);
  const t = translations[lang];

  const health = useHealth();
  const projects = useProjects();
  const history = useHistory();
  const task = useTask(taskId);
  const hosted = !!health.data?.hosted;
  // No answer yet: either the request is slow or it already failed and is being retried.
  const slow = useSlow(health.isPending);
  const waking = !health.data && !health.isError && (slow || health.failureCount > 0);

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem("jobproof-lang", lang);
    } catch {
      // storage unavailable
    }
  }, [lang]);

  // A task that was running when the page closed resumes on the progress page.
  useEffect(() => {
    if (!window.location.hash && storedTask()) navigate({ page: "progress" });
  }, [navigate]);

  const pageLabel: Record<Page, string> = {
    home: t.brand,
    projects: t.navProjects,
    history: t.navHistory,
    settings: t.navSettings,
    job: t.navNewAnalysis,
    progress: t.progressBuildingReport,
    report: t.evidenceReport,
  };

  useEffect(() => {
    document.title = `${pageLabel[route.page]} · ${BRAND}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.page, lang]);

  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    mainRef.current?.focus({ preventScroll: true });
  }, [route.page, route.reportId]);

  const act = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      for (const key of ["projects", "history", "jobs", "appSettings", "health"]) {
        await qc.invalidateQueries({ queryKey: [key] });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Retry.");
    } finally {
      setBusy(false);
    }
  }, []);

  const go = useCallback((page: Exclude<Page, "report">) => navigate({ page }), [navigate]);
  const openReport = useCallback(
    (id: string, tab?: ReportTab) => navigate({ page: "report", reportId: id, tab }),
    [navigate],
  );

  const track = useCallback(
    (started: Task) => {
      try {
        localStorage.setItem("jobproof-task", started.id);
      } catch {
        // storage unavailable
      }
      setTaskId(started.id);
      taskHandled.current = "";
      navigate({ page: "progress" });
    },
    [navigate],
  );

  useEffect(() => {
    const done = task.data;
    if (!done || ["queued", "running"].includes(done.status) || taskHandled.current === done.id) return;
    taskHandled.current = done.id;
    try {
      localStorage.removeItem("jobproof-task");
    } catch {
      // storage unavailable
    }
    void qc.invalidateQueries({ queryKey: ["snapshots"] });
    void qc.invalidateQueries({ queryKey: ["history"] });
    if (done.status === "complete") {
      if (done.analysis_id) {
        openReport(done.analysis_id);
      } else if (done.type === "extraction" && done.result) {
        void one<Job>("/job-postings/" + done.result).then((j) => {
          setJob(j);
          navigate({ page: "job" });
        });
      } else {
        navigate({ page: "projects" });
      }
    } else {
      setError(done.error?.message || "Task did not complete. Retry explicitly.");
    }
  }, [task.data, navigate, openReport]);

  const loadDemo = useCallback(async () => {
    const d = await request<{ job_id: string; snapshot_ids: string[] }>("/demo", {});
    setJob(await one<Job>("/job-postings/" + d.job_id));
    setSelected(d.snapshot_ids);
    navigate({ page: "job" });
  }, [navigate]);

  const setupAndRun = useCallback(
    () =>
      act(async () => {
        const d = await request<{ job_id: string; snapshot_ids: string[] }>("/demo", {});
        const loaded = await one<Job>("/job-postings/" + d.job_id);
        setJob(loaded);
        setSelected(d.snapshot_ids);
        const saved = await one<Job>(
          "/job-postings/" + loaded.id + "/requirements",
          {
            requirements: loaded.requirements.map((r) => ({
              ...r,
              reviewed: true,
            })),
            version: loaded.requirements_version,
          },
          "PUT",
        );
        setJob(saved);
        track(
          await one<Task>("/analyses", {
            job_id: loaded.id,
            snapshot_ids: d.snapshot_ids,
            mode: loaded.demo ? "demo" : "real",
            request_id: crypto.randomUUID(),
          }),
        );
      }),
    [act, track],
  );

  const ctx: AppContextValue = {
    t,
    lang,
    busy,
    hosted,
    setError,
    act,
    go,
    openReport,
    track,
    job,
    setJob,
    selected,
    setSelected,
    jobDraft,
    setJobDraft,
    loadDemo,
    setupAndRun,
  };

  type NavItem = [Exclude<Page, "report" | "progress" | "job">, string, typeof FileText, number?];
  const navAll: NavItem[] = [
    ["home", t.brand, FileText],
    ["projects", t.navProjects, FolderGit2, projects.data?.length],
    ["history", t.navHistory, History, history.data?.length],
    ["settings", t.navSettings, Settings],
  ];
  const nav = navAll.filter(([id]) => !(hosted && id === "settings"));
  const provider = health.data?.active_provider;

  return (
    <AppContext.Provider value={ctx}>
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          mainRef.current?.focus();
        }}
      >
        {t.skipToContent}
      </a>
      <div className="app">
        <aside className="sidebar">
          <a
            className="brand"
            href="#/"
            onClick={(e) => {
              e.preventDefault();
              go("home");
            }}
          >
            <span className="brand-icon">
              <Check size={22} />
            </span>
            {BRAND}
          </a>
          <div className="workspace-label">{t.workspaceLabel}</div>
          <nav aria-label={t.primaryNav}>
            {nav.map(([id, title, Icon, count]) => (
              <button
                key={id}
                className={route.page === id ? "nav active" : "nav"}
                aria-current={route.page === id ? "page" : undefined}
                onClick={() => go(id)}
                aria-label={title}
              >
                <Icon size={19} />
                <span className="nav-label">{title}</span>
                {!!count && (
                  <span className="pill pill-sm" aria-hidden="true">
                    {count}
                  </span>
                )}
              </button>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <ShieldCheck size={21} className="sidebar-shield" />
            <strong>{t.sidebarTitle}</strong>
            <p>{t.sidebarNote}</p>
            <span className="local">
              <span className="pulse-dot" />
              {hosted ? t.sidebarHosted : t.sidebarLocal}
            </span>
          </div>
        </aside>
        <div className="main">
          <header>
            <span>
              {t.breadcrumbWorkspace} <ChevronRight size={14} aria-hidden="true" /> {pageLabel[route.page]}
            </span>
            <div className="header-actions">
              <select
                aria-label={t.languageSelector}
                className="select-sm"
                value={lang}
                onChange={(e) => setLang(e.target.value as Lang)}
              >
                <option value="en">English</option>
                <option value="ca">Català</option>
                <option value="es">Español</option>
              </select>
              <button
                type="button"
                className="button button-sm"
                aria-label={theme === "dark" ? t.themeToggleLight : t.themeToggleDark}
                title={theme === "dark" ? t.themeToggleLight : t.themeToggleDark}
                onClick={toggleTheme}
              >
                {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
              </button>
              {health.data?.real_provider_configured ? (
                <span className="pill supported provider-pill" title={health.data.model}>
                  <span className="pulse-dot" />
                  <span>
                    {provider
                      ? provider === "gemini"
                        ? "Gemini"
                        : provider === "openai"
                          ? "OpenAI"
                          : "Claude"
                      : "IA"}
                  </span>
                  <span className="dim">·</span>
                  <span className="mono">{health.data.model}</span>
                </span>
              ) : (
                <span className="pill">{hosted ? t.hostedBadge : t.badgePrivateLocal}</span>
              )}
            </div>
          </header>
          <main id="main" ref={mainRef} tabIndex={-1}>
            {error && (
              <div className="error" role="alert">
                {error}
                <button aria-label={t.dismiss} onClick={() => setError("")}>
                  <X size={16} />
                </button>
              </div>
            )}
            {waking && (
              <div className="notice waking-notice" role="status" aria-live="polite">
                <Loader2 size={18} className="spin" aria-hidden="true" />
                <div>
                  <strong>{t.serverWakingTitle}</strong>
                  <p>{t.serverWakingDesc}</p>
                </div>
              </div>
            )}
            {health.isError && (
              <div role="alert" className="error">
                {t.backendUnreachable}
                <button onClick={() => void health.refetch()}>{t.backendRetry}</button>
              </div>
            )}
            {route.page === "home" && (
              <HomePage
                onNewAnalysis={() => {
                  setJob(null);
                  setSelected([]);
                  setJobDraft(emptyJobDraft);
                  go("job");
                }}
              />
            )}
            {route.page === "projects" && <ProjectsPage />}
            {route.page === "job" && <JobPage />}
            {route.page === "progress" && (
              <ProgressPage
                task={task.data}
                onCancel={() =>
                  act(async () => {
                    await one("/tasks/" + taskId + "/cancel", {});
                  })
                }
                onRetry={() => go(job ? "job" : "projects")}
              />
            )}
            {route.page === "history" && <HistoryPage />}
            {route.page === "settings" && <SettingsPage />}
            {route.page === "report" && (
              <ReportPage
                key={route.reportId}
                reportId={route.reportId}
                tab={route.tab}
                onTabChange={(tab) => openReport(route.reportId, tab)}
              />
            )}
          </main>
          <footer>{t.footerDisclaimer}</footer>
        </div>
      </div>
    </AppContext.Provider>
  );
}
