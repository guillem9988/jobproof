import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import {
  Check,
  ArrowRight,
  FileText,
  FolderGit2,
  History,
  Plus,
  X,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Search,
  Download,
  Copy,
  Folder,
  Play,
  Pause,
  RotateCcw,
  Moon,
  Sun,
} from "lucide-react";
import { translations, type Lang } from "./i18n";
import { one, many, request, labels, counts } from "./api";
import type {
  Analysis,
  Assessment,
  Evidence,
  Job,
  Project,
  Requirement,
  Snapshot,
  Status,
  Task,
} from "./types";
import "./style.css";
const qc = new QueryClient();
const copy = {
  brand: "JobProof",
  tagline: "Make your experience explainable.",
  subtitle:
    "Connect a job’s requirements to evidence in your projects. Know what you can support, and what needs an honest conversation.",
};
function App() {
  const [page, setPage] = useState(
      localStorage.getItem("jobproof-task") ? "progress" : "home",
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [job, setJob] = useState<Job | null>(null),
    [selected, setSelected] = useState<string[]>([]),
    [taskId, setTaskId] = useState(localStorage.getItem("jobproof-task") || ""),
    [reportId, setReportId] = useState(""),
    [evidence, setEvidence] = useState<Evidence | null>(null),
    [filter, setFilter] = useState("all"),
    [priority, setPriority] = useState("all"),
    [category, setCategory] = useState("all"),
    [projectFilter, setProjectFilter] = useState("all"),
    [searchQuery, setSearchQuery] = useState(""),
    [copied, setCopied] = useState(false),
    [copiedBullets, setCopiedBullets] = useState(false),
    [projectSource, setProjectSource] = useState<"github" | "local">("github"),
    [reportTab, setReportTab] = useState<"evidence" | "resume" | "interview">("evidence"),
    [interviewIndex, setInterviewIndex] = useState(0),
    [interviewTimer, setInterviewTimer] = useState(0),
    [timerActive, setTimerActive] = useState(false),
    [interviewNotes, setInterviewNotes] = useState<Record<number, string>>({}),
    [revealedQuestions, setRevealedQuestions] = useState<Record<number, boolean>>({}),
    [lang, setLang] = useState<Lang>(
      (localStorage.getItem("jobproof-lang") as Lang) || "en",
    ),
    [theme, setTheme] = useState<"light" | "dark">(() => {
      const saved = localStorage.getItem("jobproof-theme");
      if (saved === "light" || saved === "dark") return saved;
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("jobproof-theme", theme);
  }, [theme]);
  const t = translations[lang];

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerActive) {
      interval = setInterval(() => {
        setInterviewTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerActive]);
  const taskHandled = useRef("");
  const health = useQuery({
    queryKey: ["health"],
    queryFn: () =>
      request<{ real_provider_configured: boolean; model: string }>("/health"),
  });
  const projects = useQuery({
    queryKey: ["projects"],
    queryFn: () => many<Project>("/projects"),
  });
  const history = useQuery({
    queryKey: ["history"],
    queryFn: () => many<Analysis>("/analyses"),
  });
  const jobs = useQuery({
    queryKey: ["jobs"],
    queryFn: () => many<Job>("/job-postings"),
  });
  const snapshots = useQuery({
    queryKey: ["snapshots", projects.data?.length, taskId],
    queryFn: async () =>
      (
        await Promise.all(
          (projects.data || []).map((p) =>
            many<Snapshot>(`/projects/${p.id}/snapshots`),
          ),
        )
      ).flat(),
    enabled: !!projects.data,
  });
  const task = useQuery({
    queryKey: ["task", taskId],
    queryFn: () => one<Task>("/tasks/" + taskId),
    enabled: !!taskId,
    refetchInterval: (q) =>
      ["queued", "running"].includes(q.state.data?.status || "queued")
        ? 600
        : false,
  });
  const report = useQuery({
    queryKey: ["report", reportId],
    queryFn: () => one<Analysis>("/analyses/" + reportId),
    enabled: !!reportId,
  });
  const assessments = useQuery({
    queryKey: ["assessments", reportId],
    queryFn: () => many<Assessment>(`/analyses/${reportId}/assessments`),
    enabled: !!reportId,
  });
  async function act(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      await qc.invalidateQueries({ queryKey: ["projects"] });
      await qc.invalidateQueries({ queryKey: ["history"] });
      await qc.invalidateQueries({ queryKey: ["jobs"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Retry.");
    } finally {
      setBusy(false);
    }
  }
  function track(t: Task) {
    localStorage.setItem("jobproof-task", t.id);
    setTaskId(t.id);
    taskHandled.current = "";
    setPage("progress");
  }
  useEffect(() => {
    const t = task.data;
    if (
      !t ||
      ["queued", "running"].includes(t.status) ||
      taskHandled.current === t.id
    )
      return;
    taskHandled.current = t.id;
    localStorage.removeItem("jobproof-task");
    void qc.invalidateQueries({ queryKey: ["snapshots"] });
    void qc.invalidateQueries({ queryKey: ["history"] });
    if (t.status === "complete") {
      if (t.analysis_id) {
        setReportId(t.analysis_id);
        setPage("report");
      } else if (t.type === "extraction" && t.result) {
        void one<Job>("/job-postings/" + t.result).then((j) => {
          setJob(j);
          setPage("job");
        });
      } else setPage("projects");
    } else
      setError(t.error?.message || "Task did not complete. Retry explicitly.");
  }, [task.data, job]);
  async function demo() {
    const d = await request<{ job_id: string; snapshot_ids: string[] }>(
      "/demo",
      {},
    );
    setJob(await one<Job>("/job-postings/" + d.job_id));
    setSelected(d.snapshot_ids);
    setPage("job");
  }
  async function start() {
    if (!job) return;
    const saved = await one<Job>(
      "/job-postings/" + job.id + "/requirements",
      {
        requirements: job.requirements.map((r) => ({ ...r, reviewed: true })),
        version: job.requirements_version,
      },
      "PUT",
    );
    setJob(saved);
    const t = await one<Task>("/analyses", {
      job_id: job.id,
      snapshot_ids: selected,
      mode: job.demo ? "demo" : "real",
      request_id: crypto.randomUUID(),
    });
    track(t);
  }
  function changeReq(id: string, change: Partial<Requirement>) {
    if (job)
      setJob({
        ...job,
        requirements: job.requirements.map((r) =>
          r.id === id ? { ...r, ...change, reviewed: true } : r,
        ),
      });
  }
  const visible = (assessments.data || []).filter(
    (a) =>
      (filter === "all" || a.status === filter) &&
      (priority === "all" || a.requirement.priority === priority) &&
      (category === "all" || a.requirement.category === category) &&
      (projectFilter === "all" ||
        a.evidence.some((e) => e.snapshot_id === projectFilter)) &&
      (!searchQuery.trim() ||
        a.requirement.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.explanation.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.evidence.some(
          (e) =>
            e.quote.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.path.toLowerCase().includes(searchQuery.toLowerCase()),
        )),
  );
  return (
    <div className="app">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={() => setPage("home")}>
          <span className="brand-icon">
            <Check size={22} />
          </span>
          {copy.brand}
        </a>
        <div className="workspace-label">PERSONAL WORKSPACE</div>
        <nav>
          {[
            ["home", t.brand, FileText],
            ["projects", t.navProjects, FolderGit2],
            ["history", t.navHistory, History],
          ].map(([id, title, Icon]) => (
            <button
              key={String(id)}
              className={page === id ? "nav active" : "nav"}
              onClick={() => setPage(String(id))}
            >
              {React.createElement(Icon, { size: 19 })}
              {String(title)}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <ShieldCheck size={21} />
          <strong>Evidence, with context.</strong>
          <p>No hiring scores. No invented experience.</p>
          <span className="local">Local workspace · Single user</span>
        </div>
      </aside>
      <div className="main">
        <header>
          <span>
            Workspace <ChevronRight size={14} />{" "}
            {page === "report"
              ? "Evidence report"
              : page === "job"
                ? "New analysis"
                : page.charAt(0).toUpperCase() + page.slice(1)}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <select
              aria-label="Language selector"
              value={lang}
              onChange={(e) => {
                const l = e.target.value as Lang;
                setLang(l);
                localStorage.setItem("jobproof-lang", l);
              }}
              style={{ width: "auto", padding: "4px 8px", fontSize: "0.85rem" }}
            >
              <option value="en">English</option>
              <option value="ca">Català</option>
              <option value="es">Español</option>
            </select>
            <button
              type="button"
              className="button"
              style={{ padding: "6px 10px", fontSize: "0.85rem" }}
              aria-label={theme === "dark" ? t.themeToggleLight : t.themeToggleDark}
              title={theme === "dark" ? t.themeToggleLight : t.themeToggleDark}
              onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
            >
              {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <span className="pill">Private · Local</span>
          </div>
        </header>
        <main>
          {error && (
            <div className="error" role="alert">
              {error}
              <button aria-label="Dismiss error" onClick={() => setError("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {health.error && (
            <div role="alert" className="error">
              Cannot reach the backend. Start the local API on port 8000, then
              reload.
            </div>
          )}
          {page === "home" && (
            <>
              <div className="eyebrow">YOUR WORK. YOUR EVIDENCE.</div>
              <h1>{t.tagline}</h1>
              <p className="intro">{t.subtitle}</p>
              <div className="home-grid">
                <section className="card start">
                  <span className="icon-box">
                    <FileText />
                  </span>
                  <h2>Prepare a stronger application</h2>
                  <p>
                    Start with a job posting and up to three public
                    repositories. Review every conclusion against its source.
                  </p>
                  <button
                    className="primary"
                    onClick={() => {
                      setJob(null);
                      setSelected([]);
                      setPage("job");
                    }}
                  >
                    {t.navNewAnalysis} <ArrowRight size={17} />
                  </button>
                  <div className="quiet">
                    {health.data?.real_provider_configured
                      ? t.aiConfigured
                      : t.aiNotConfigured}
                  </div>
                </section>
                <section className="card demo-card">
                  <span className="pill">{t.demoBadge}</span>
                  <h2>{t.demoTitle}</h2>
                  <p>{t.demoDesc}</p>
                  <button disabled={busy} onClick={() => act(demo)}>
                    {t.tryDemo} <ArrowRight size={17} />
                  </button>
                  <small>Deterministic fixtures · No external calls</small>
                </section>
              </div>
              <section className="section-title">
                <h2>Recent analyses</h2>
                <button
                  className="text-button"
                  onClick={() => setPage("history")}
                >
                  View history <ArrowRight size={16} />
                </button>
              </section>
              <HistoryList
                rows={(history.data || []).slice(0, 4)}
                open={(id) => {
                  setReportId(id);
                  setPage("report");
                }}
              />
              <div className="principles">
                <p>
                  <strong>01 · Grounded in sources</strong>Every proof links to
                  a file and exact lines.
                </p>
                <p>
                  <strong>02 · Honest about gaps</strong>Missing evidence never
                  means missing ability.
                </p>
                <p>
                  <strong>03 · Yours to review</strong>Correct conclusions while
                  preserving their origin.
                </p>
              </div>
            </>
          )}
          {page === "projects" && (
            <>
              <div className="eyebrow">SOURCE MATERIAL</div>
              <h1>Your projects</h1>
              <p className="intro">
                Import a public repository at a fixed commit. Imported code is
                never executed.
              </p>
              <form
                className="card form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  void act(async () => {
                    const payload =
                      projectSource === "local"
                        ? {
                            local_path: f.get("local_path"),
                            name: f.get("name"),
                            contribution: f.get("contribution"),
                          }
                        : {
                            url: f.get("url"),
                            name: f.get("name"),
                            contribution: f.get("contribution"),
                          };
                    const p = await one<Project>("/projects", payload);
                    track(
                      await one<Task>(`/projects/${p.id}/imports`, {
                        ref: f.get("ref") || "",
                        request_id: crypto.randomUUID(),
                      }),
                    );
                  });
                }}
              >
                <div className="source-toggle">
                  <button
                    type="button"
                    className={`source-option ${projectSource === "github" ? "active" : ""}`}
                    onClick={() => setProjectSource("github")}
                  >
                    <FolderGit2 size={18} />
                    {t.sourceTypeGithub}
                  </button>
                  <button
                    type="button"
                    className={`source-option ${projectSource === "local" ? "active" : ""}`}
                    onClick={() => setProjectSource("local")}
                  >
                    <Folder size={18} />
                    {t.sourceTypeLocal}
                  </button>
                </div>
                {projectSource === "github" ? (
                  <label>
                    {t.sourceTypeGithub}
                    <input
                      name="url"
                      placeholder="https://github.com/owner/repository"
                      required
                    />
                  </label>
                ) : (
                  <label>
                    {t.localPathLabel}
                    <input
                      name="local_path"
                      placeholder={t.localPathPlaceholder}
                      required
                    />
                  </label>
                )}
                <div className="two">
                  <label>
                    Project name (optional)
                    <input name="name" />
                  </label>
                  {projectSource === "github" && (
                    <label>
                      Branch or commit (optional)
                      <input name="ref" />
                    </label>
                  )}
                </div>
                <label>
                  Your contribution (self-declared, unverified)
                  <textarea name="contribution" rows={2} />
                </label>
                <button className="primary" disabled={busy}>
                  {projectSource === "local"
                    ? t.importLocalDir
                    : "Import repository"}{" "}
                  <Plus size={17} />
                </button>
              </form>
              {projects.data?.map((p) => (
                <section className="card project" key={p.id}>
                  <div className="section-title">
                    <h2>{p.name}</h2>
                    <span className="pill">
                      {p.demo
                        ? "Fixture"
                        : p.local
                          ? t.badgeLocalFolder
                          : t.badgePublicRepo}
                    </span>
                  </div>
                  <p>
                    {p.contribution || "Personal contribution not declared."}
                  </p>
                  {snapshots.data
                    ?.filter((s) => s.project_id === p.id)
                    .map((s) => (
                      <details key={s.id}>
                        <summary>
                          {s.file_count} files · {s.status} ·{" "}
                          {s.partial
                            ? "Partial import"
                            : "All eligible fixture/tree files imported"}{" "}
                          <code>{s.sha.slice(0, 12)}</code>
                        </summary>
                        <p>Commit: {s.sha}</p>
                        <p>
                          {s.bytes.toLocaleString()} bytes imported.{" "}
                          {s.discarded.length} files excluded.
                        </p>
                        <ul>
                          {s.discarded.map((d) => (
                            <li key={d.path}>
                              {d.path}: {d.reason}
                            </li>
                          ))}
                        </ul>
                        <SnapshotFiles id={s.id} />
                      </details>
                    ))}
                  {!p.demo && (
                    <button
                      disabled={busy}
                      onClick={() =>
                        act(async () =>
                          track(
                            await one<Task>(`/projects/${p.id}/imports`, {
                              request_id: crypto.randomUUID(),
                            }),
                          ),
                        )
                      }
                    >
                      Import new snapshot
                    </button>
                  )}
                </section>
              ))}
            </>
          )}
          {page === "job" && (
            <>
              <div className="eyebrow">APPLICATION WORKSPACE</div>
              <h1>{job ? "Review the requirements" : "Start with the role"}</h1>
              <p className="intro">
                {job
                  ? "Keep alternatives and priorities intact. Select the requirements you want to examine."
                  : "Paste the original job posting in English, Catalan, or Spanish."}
              </p>
              {!job ? (
                <>
                  <form
                    className="card form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      void act(async () => {
                        const j = await one<Job>("/job-postings", {
                          title: f.get("title"),
                          company: f.get("company"),
                          url: f.get("url"),
                          text: f.get("text"),
                          language: f.get("language"),
                        });
                        setJob(j);
                      });
                    }}
                  >
                    <div className="two">
                      <label>
                        Job title
                        <input name="title" required />
                      </label>
                      <label>
                        Company (optional)
                        <input name="company" />
                      </label>
                    </div>
                    <label>
                      Reference URL (optional, never visited)
                      <input name="url" type="url" />
                    </label>
                    <label>
                      Language
                      <select name="language">
                        <option value="en">English</option>
                        <option value="ca">Català</option>
                        <option value="es">Español</option>
                      </select>
                    </label>
                    <label>
                      Job posting
                      <textarea name="text" required minLength={10} rows={10} />
                    </label>
                    <button className="primary" disabled={busy}>
                      Save posting <ArrowRight size={16} />
                    </button>
                  </form>
                  {jobs.data
                    ?.filter((j) => !j.demo)
                    .map((j) => (
                      <button key={j.id} onClick={() => setJob(j)}>
                        Resume {j.title}
                      </button>
                    ))}
                </>
              ) : (
                <>
                  <div className="notice">
                    {job.demo
                      ? "FIXTURE DEMO — Results come from deterministic fixture rules. Edited requirements may not have a matching rule."
                      : "Real analysis sends the posting and selected, redacted repository excerpts to the configured AI provider. Keys stay on the server."}
                  </div>
                  <details className="card">
                    <summary>{job.title} · Original posting</summary>
                    <pre className="posting">{job.canonical_text}</pre>
                  </details>
                  <button
                    disabled={busy}
                    onClick={() =>
                      act(async () =>
                        track(
                          await one<Task>(
                            `/job-postings/${job.id}/extract-requirements`,
                            {
                              mode: job.demo ? "demo" : "real",
                              request_id: crypto.randomUUID(),
                            },
                          ),
                        ),
                      )
                    }
                  >
                    Extract requirements
                    {job.requirements.length ? " again" : ""}
                  </button>
                  <div className="requirements">
                    {job.requirements.map((r, i) => (
                      <section className="card requirement-edit" key={r.id}>
                        <div className="requirement-number">
                          {String(i + 1).padStart(2, "0")}
                        </div>
                        <div>
                          <label className="check">
                            <input
                              type="checkbox"
                              checked={r.selected ?? true}
                              onChange={(e) =>
                                changeReq(r.id, { selected: e.target.checked })
                              }
                            />
                            Include in analysis
                          </label>
                          <label>
                            Requirement
                            <input
                              value={r.text}
                              onChange={(e) =>
                                changeReq(r.id, { text: e.target.value })
                              }
                            />
                          </label>
                          <div className="two">
                            <label>
                              Priority
                              <select
                                value={r.priority}
                                onChange={(e) =>
                                  changeReq(r.id, {
                                    priority: e.target
                                      .value as Requirement["priority"],
                                  })
                                }
                              >
                                <option value="required">Required</option>
                                <option value="preferred">Preferred</option>
                                <option value="unspecified">Unspecified</option>
                              </select>
                            </label>
                            <label>
                              Verifiable from code
                              <select
                                value={r.verifiability}
                                onChange={(e) =>
                                  changeReq(r.id, {
                                    verifiability: e.target
                                      .value as Requirement["verifiability"],
                                  })
                                }
                              >
                                <option value="code">Code evidence</option>
                                <option value="limited">Limited</option>
                                <option value="external">
                                  External evidence needed
                                </option>
                              </select>
                            </label>
                          </div>
                          <small>
                            {r.provenance === "manual"
                              ? "Manually added · no posting citation"
                              : `Posting excerpt: “${r.quote}” · character ${r.offset}`}
                          </small>
                        </div>
                        <button
                          className="icon-button"
                          aria-label={`Remove ${r.text}`}
                          onClick={() =>
                            setJob({
                              ...job,
                              requirements: job.requirements.filter(
                                (x) => x.id !== r.id,
                              ),
                            })
                          }
                        >
                          <X size={17} />
                        </button>
                      </section>
                    ))}
                  </div>
                  <button
                    onClick={() =>
                      setJob({
                        ...job,
                        requirements: [
                          ...job.requirements,
                          {
                            id: crypto.randomUUID(),
                            text: "New requirement",
                            quote: "",
                            offset: null,
                            category: "technology",
                            priority: "unspecified",
                            verifiability: "code",
                            reviewed: true,
                            provenance: "manual",
                            selected: true,
                          },
                        ],
                      })
                    }
                  >
                    <Plus size={16} />
                    Add manual requirement
                  </button>
                  <section className="card project-picker">
                    <h2>Select project snapshots</h2>
                    <p>Up to three projects. One snapshot per project.</p>
                    {snapshots.data
                      ?.filter(
                        (s) => s.status === "complete" && (!job.demo || s.demo),
                      )
                      .map((s) => (
                        <label className="snapshot-choice" key={s.id}>
                          <input
                            type="checkbox"
                            checked={selected.includes(s.id)}
                            onChange={(e) =>
                              setSelected(
                                e.target.checked
                                  ? [...selected, s.id]
                                  : selected.filter((x) => x !== s.id),
                              )
                            }
                          />
                          <span>
                            <strong>
                              {
                                projects.data?.find(
                                  (p) => p.id === s.project_id,
                                )?.name
                              }
                            </strong>
                            <small>
                              {s.sha.slice(0, 12)} · {s.file_count} files ·{" "}
                              {s.partial ? "Partial import" : "Imported"}
                            </small>
                          </span>
                        </label>
                      ))}
                    {!snapshots.data?.length && (
                      <button onClick={() => setPage("projects")}>
                        Add a project
                      </button>
                    )}
                  </section>
                  <button
                    disabled={busy}
                    onClick={() =>
                      act(async () => {
                        setJob(
                          await one<Job>(
                            `/job-postings/${job.id}/requirements`,
                            {
                              requirements: job.requirements.map((r) => ({
                                ...r,
                                reviewed: true,
                              })),
                              version: job.requirements_version,
                            },
                            "PUT",
                          ),
                        );
                      })
                    }
                  >
                    Save reviewed requirements
                  </button>
                  <div className="action-bar">
                    <span>
                      {
                        job.requirements.filter((r) => r.selected ?? true)
                          .length
                      }{" "}
                      / {job.requirements.length} requirements selected · max 15
                    </span>
                    <button
                      disabled={
                        busy || !selected.length || !job.requirements.length
                      }
                      className="primary"
                      onClick={() => act(start)}
                    >
                      Analyze evidence <ArrowRight size={17} />
                    </button>
                  </div>
                </>
              )}
            </>
          )}
          {page === "progress" && (
            <section className="card progress">
              <span className="icon-box">
                <Search />
              </span>
              <h1>
                {task.data?.status === "running"
                  ? "Building your evidence report"
                  : task.data?.status || "Preparing task"}
              </h1>
              <p aria-live="polite">
                {task.data?.stage || "Waiting for task status"}
              </p>
              <p>
                Progress reflects completed stages. You can reload this page
                safely.
              </p>
              {["running", "queued"].includes(task.data?.status || "") ? (
                <button
                  onClick={() =>
                    act(async () => {
                      await one("/tasks/" + taskId + "/cancel", {});
                    })
                  }
                >
                  Cancel task
                </button>
              ) : (
                <button onClick={() => setPage(job ? "job" : "projects")}>
                  Return and retry explicitly
                </button>
              )}
            </section>
          )}
          {page === "history" && (
            <>
              <div className="eyebrow">YOUR RESEARCH TRAIL</div>
              <h1>Analysis history</h1>
              <p className="intro">
                Each report keeps its requirements, source snapshots and
                original conclusions.
              </p>
              <HistoryList
                rows={history.data || []}
                open={(id) => {
                  setReportId(id);
                  setPage("report");
                }}
              />
            </>
          )}
          {page === "report" && report.data && (
            <>
              <div className="report-heading">
                <div>
                  <div className="eyebrow">
                    {report.data.mode === "demo"
                      ? "FIXTURE DEMO"
                      : "EVIDENCE REPORT"}
                  </div>
                  <h1>{report.data.title}</h1>
                  <p>
                    {new Date(report.data.created_at).toLocaleDateString()} ·{" "}
                    {report.data.requirements.filter((r) => r.selected).length}{" "}
                    of {report.data.requirements.length} requirements ·{" "}
                    {report.data.snapshots.length} projects
                  </p>
                </div>
                <div className="exports">
                  <button
                    className="button"
                    onClick={async () => {
                      try {
                        const res = await fetch(
                          `/api/v1/analyses/${reportId}/export?format=markdown`,
                        );
                        const text = await res.text();
                        await navigator.clipboard.writeText(text);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      } catch {
                        // ignore
                      }
                    }}
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    {copied ? t.copied : t.copyMarkdown}
                  </button>
                  {["markdown", "json"].map((f) => (
                    <a
                      className="button"
                      key={f}
                      href={`/api/v1/analyses/${reportId}/export?format=${f}`}
                    >
                      <Download size={16} />
                      {f === "markdown" ? "Markdown" : "JSON"}
                    </a>
                  ))}
                </div>
              </div>
              <div className="tab-group" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={reportTab === "evidence"}
                  className={`tab-button ${reportTab === "evidence" ? "active" : ""}`}
                  onClick={() => setReportTab("evidence")}
                >
                  <FileText size={16} />
                  {t.tabEvidence}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={reportTab === "resume"}
                  className={`tab-button ${reportTab === "resume" ? "active" : ""}`}
                  onClick={() => setReportTab("resume")}
                >
                  <Check size={16} />
                  {t.tabResumeBullets}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={reportTab === "interview"}
                  className={`tab-button ${reportTab === "interview" ? "active" : ""}`}
                  onClick={() => setReportTab("interview")}
                >
                  <Play size={16} />
                  {t.tabInterviewMode}
                </button>
              </div>
              {report.data.status !== "complete" ? (
                <div role="alert" className="notice">
                  Analysis {report.data.status}. Partial results are not a
                  complete report.
                </div>
              ) : reportTab === "evidence" ? (
                <>
                  <div className="counts">
                    {counts(assessments.data || []).map((c) => (
                      <button
                        key={c.status}
                        className={"count " + c.status}
                        onClick={() => setFilter(c.status)}
                      >
                        <span>{c.count}</span>
                        {labels[c.status]}
                      </button>
                    ))}
                  </div>
                  <div className="notice">
                    {report.data.warnings.map((w) => (
                      <p key={w}>{w}</p>
                    ))}
                  </div>
                  <div className="filters">
                    <label style={{ gridColumn: "1 / -1" }}>
                      {t.searchFilter}
                      <input
                        type="search"
                        placeholder={t.searchPlaceholder}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </label>
                    <label>
                      Status
                      <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                      >
                        <option value="all">All conclusions</option>
                        {Object.entries(labels).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Priority
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                      >
                        <option value="all">All priorities</option>
                        <option value="required">Required</option>
                        <option value="preferred">Preferred</option>
                        <option value="unspecified">Unspecified</option>
                      </select>
                    </label>
                    <label>
                      Category
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                      >
                        <option value="all">All categories</option>
                        {[
                          ...new Set(
                            assessments.data?.map(
                              (a) => a.requirement.category,
                            ),
                          ),
                        ].map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Project
                      <select
                        value={projectFilter}
                        onChange={(e) => setProjectFilter(e.target.value)}
                      >
                        <option value="all">All projects</option>
                        {report.data.snapshots.map((s) => (
                          <option key={s.id} value={s.id}>
                            {projects.data?.find((p) => p.id === s.project_id)
                              ?.name || s.sha.slice(0, 8)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <h2>
                    Requirements & evidence{" "}
                    <span className="muted">{visible.length}</span>
                  </h2>
                  {visible.map((a) => (
                    <AssessmentCard
                      key={a.id}
                      snapshotIds={report.data!.snapshots.map((s) => s.id)}
                      a={a}
                      evidence={setEvidence}
                      busy={busy}
                      review={(status, reason, remove, add) =>
                        act(async () => {
                          await one(`/assessments/${a.id}/reviews`, {
                            status,
                            reason,
                            remove_chunk_ids: remove,
                            add_chunk_ids: add,
                          });
                          await qc.invalidateQueries({
                            queryKey: ["assessments", reportId],
                          });
                        })
                      }
                    />
                  ))}
                  {!visible.length && (
                    <div className="card">
                      No conclusions match these filters.
                    </div>
                  )}
                  <section className="card preparation">
                    <div className="eyebrow">TAKE IT INTO THE INTERVIEW</div>
                    <h2>Prepare the conversation</h2>
                    {report.data.preparation?.questions.map((q, i) => (
                      <p className="question" key={q}>
                        <span>0{i + 1}</span>
                        {q}
                      </p>
                    ))}
                    {(
                      [
                        "technical_points",
                        "decisions",
                        "honest_limitations",
                        "personal_prompts",
                      ] as const
                    ).map((key) => (
                      <div key={key}>
                        <h3>{key.replaceAll("_", " ")}</h3>
                        <ul>
                          {report.data?.preparation?.[key].map((t) => (
                            <li key={t}>{t}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </section>
                  <section className="card">
                    <h2>Next steps</h2>
                    <p className="quiet">
                      Generated from the original analysis. Reconsider these
                      suggestions after a human review.
                    </p>
                    {report.data.preparation?.recommendations.map((r, i) => (
                      <div className="recommendation" key={i}>
                        <strong>
                          {
                            report.data?.requirements.find(
                              (q) => q.id === r.requirement_id,
                            )?.text
                          }{" "}
                          · {r.gap.replaceAll("_", " ")}
                        </strong>
                        <p>{r.action}</p>
                        <small>
                          Expected: {r.observable_result} {r.effort_estimate}
                        </small>
                      </div>
                    ))}
                  </section>
                  <details className="card">
                    <summary>Report provenance</summary>
                    <p>
                      Model: {report.data.model} · pipeline{" "}
                      {report.data.pipeline_version} · requirements v
                      {report.data.requirements_version}
                    </p>
                    <p>
                      {report.data.usage?.calls || 0} logical calls ·{" "}
                      {report.data.usage?.input_tokens || 0} input tokens ·{" "}
                      {report.data.usage?.output_tokens || 0} output tokens
                    </p>
                    {report.data.snapshots.map((s) => (
                      <p key={s.id}>Commit {s.sha}</p>
                    ))}
                  </details>
                </>
              ) : reportTab === "resume" ? (
                <>
                  <div className="section-title">
                    <div>
                      <h2>{t.resumeBulletsTitle}</h2>
                      <p className="intro">{t.resumeBulletsDesc}</p>
                    </div>
                    {(() => {
                      const bullets = (assessments.data || []).filter(
                        (a) =>
                          ["supported", "partial"].includes(a.status) &&
                          a.evidence.length > 0,
                      );
                      const allText = bullets
                        .map((a) => {
                          const firstEv = a.evidence[0];
                          return `• ${a.requirement.text}: Implemented in ${firstEv ? `${firstEv.path} (L${firstEv.start}-L${firstEv.end}) — ${firstEv.relation}` : "codebase"}.${a.limitations?.length ? ` Note: ${a.limitations[0]}` : ""}`;
                        })
                        .join("\n");
                      return (
                        bullets.length > 0 && (
                          <button
                            className="primary"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(allText);
                                setCopiedBullets(true);
                                setTimeout(() => setCopiedBullets(false), 2000);
                              } catch {
                                // ignore
                              }
                            }}
                          >
                            {copiedBullets ? <Check size={16} /> : <Copy size={16} />}
                            {copiedBullets ? t.copiedAllBullets : t.copyAllBullets}
                          </button>
                        )
                      );
                    })()}
                  </div>
                  {(() => {
                    const bullets = (assessments.data || []).filter(
                      (a) =>
                        ["supported", "partial"].includes(a.status) &&
                        a.evidence.length > 0,
                    );
                    if (!bullets.length) {
                      return <div className="card">{t.noEvidenceBullets}</div>;
                    }
                    return bullets.map((a) => {
                      const firstEv = a.evidence[0];
                      const bulletText = `• ${a.requirement.text}: Implemented in ${firstEv ? `${firstEv.path} (L${firstEv.start}-L${firstEv.end}) — ${firstEv.relation}` : "codebase"}.${a.limitations?.length ? ` Note: ${a.limitations[0]}` : ""}`;
                      return (
                        <div key={a.id} className={`bullet-card ${a.status}`}>
                          <div className="bullet-header">
                            <p className="bullet-text">{bulletText}</p>
                            <button
                              className="button"
                              title="Copy bullet"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(bulletText);
                                } catch {
                                  // ignore
                                }
                              }}
                            >
                              <Copy size={15} />
                            </button>
                          </div>
                          <div className="bullet-meta">
                            <span className={`pill ${a.status}`}>
                              {labels[a.status]}
                            </span>
                            {firstEv && (
                              <button
                                className="quiet"
                                style={{
                                  padding: 0,
                                  border: "none",
                                  background: "none",
                                  textDecoration: "underline",
                                }}
                                onClick={() => setEvidence(firstEv)}
                              >
                                {firstEv.path} (L{firstEv.start}-L{firstEv.end})
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </>
              ) : (
                <>
                  <div className="section-title">
                    <div>
                      <h2>{t.interviewSimTitle}</h2>
                      <p className="intro">{t.interviewSimDesc}</p>
                    </div>
                  </div>
                  {(() => {
                    const questions =
                      report.data.preparation?.questions || [];
                    if (!questions.length) {
                      return (
                        <div className="card">
                          No interview questions were generated for this report.
                        </div>
                      );
                    }
                    const qIndex = Math.min(
                      interviewIndex,
                      questions.length - 1,
                    );
                    const qText = questions[qIndex];
                    const isRevealed = !!revealedQuestions[qIndex];
                    const mins = String(
                      Math.floor(interviewTimer / 60),
                    ).padStart(2, "0");
                    const secs = String(interviewTimer % 60).padStart(2, "0");

                    return (
                      <div className="interview-card">
                        <div className="eyebrow">
                          {t.questionOf} {qIndex + 1} / {questions.length}
                        </div>
                        <h2 style={{ fontSize: "1.35rem", marginTop: 8 }}>
                          {qText}
                        </h2>

                        <div className="timer-box">
                          <div className="timer-display">
                            ⏱️ {mins}:{secs}
                          </div>
                          <div className="timer-controls">
                            <button
                              type="button"
                              className={timerActive ? "" : "primary"}
                              onClick={() => setTimerActive(!timerActive)}
                            >
                              {timerActive ? (
                                <Pause size={16} />
                              ) : (
                                <Play size={16} />
                              )}
                              {timerActive ? t.timerPause : t.timerStart}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setTimerActive(false);
                                setInterviewTimer(0);
                              }}
                            >
                              <RotateCcw size={16} />
                              {t.timerReset}
                            </button>
                          </div>
                        </div>

                        <label style={{ marginTop: 16 }}>
                          {t.draftYourAnswer}
                          <textarea
                            rows={4}
                            placeholder={t.draftPlaceholder}
                            value={interviewNotes[qIndex] || ""}
                            onChange={(e) =>
                              setInterviewNotes((prev) => ({
                                ...prev,
                                [qIndex]: e.target.value,
                              }))
                            }
                          />
                        </label>

                        <div style={{ marginTop: 20 }}>
                          <button
                            type="button"
                            className="button"
                            onClick={() =>
                              setRevealedQuestions((prev) => ({
                                ...prev,
                                [qIndex]: !prev[qIndex],
                              }))
                            }
                          >
                            <ShieldCheck size={16} />
                            {isRevealed ? t.hideAnswer : t.revealAnswer}
                          </button>
                        </div>

                        {isRevealed && (
                          <div
                            style={{
                              marginTop: 20,
                              padding: 16,
                              background: "#f8fafc",
                              borderRadius: 8,
                              border: "1px solid #e2e8f0",
                            }}
                          >
                            <h3>{t.technicalPoints}</h3>
                            <ul>
                              {report.data?.preparation?.technical_points.map(
                                (pt) => (
                                  <li key={pt}>{pt}</li>
                                ),
                              )}
                            </ul>

                            <h3>Decisions & Trade-offs</h3>
                            <ul>
                              {report.data?.preparation?.decisions.map((d) => (
                                <li key={d}>{d}</li>
                              ))}
                            </ul>

                            <h3>{t.honestLimitations}</h3>
                            <ul>
                              {report.data?.preparation?.honest_limitations.map(
                                (lim) => (
                                  <li key={lim}>{lim}</li>
                                ),
                              )}
                            </ul>
                          </div>
                        )}

                        <div className="interview-nav">
                          <button
                            type="button"
                            disabled={qIndex === 0}
                            onClick={() => {
                              setInterviewIndex((i) => Math.max(0, i - 1));
                              setInterviewTimer(0);
                              setTimerActive(false);
                            }}
                          >
                            ← {t.prevQuestion}
                          </button>
                          <span>
                            {qIndex + 1} / {questions.length}
                          </span>
                          <button
                            type="button"
                            disabled={qIndex >= questions.length - 1}
                            onClick={() => {
                              setInterviewIndex((i) =>
                                Math.min(questions.length - 1, i + 1),
                              );
                              setInterviewTimer(0);
                              setTimerActive(false);
                            }}
                          >
                            {t.nextQuestion} →
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </>
          )}
        </main>
        <footer>
          JobProof · Evidence supports a conversation. It does not certify
          professional competence.
        </footer>
      </div>
      {evidence && (
        <EvidencePanel e={evidence} close={() => setEvidence(null)} />
      )}
    </div>
  );
}
function HistoryList({
  rows,
  open,
}: {
  rows: Analysis[];
  open: (id: string) => void;
}) {
  return (
    <div className="card history">
      {rows.length ? (
        rows.map((a) => (
          <button key={a.id} onClick={() => open(a.id)}>
            <FileText size={20} />
            <span>
              <strong>{a.title}</strong>
              <small>
                {new Date(a.created_at).toLocaleDateString()} ·{" "}
                {a.mode === "demo" ? "Fixture demo" : "Real analysis"}
              </small>
            </span>
            <span className="pill">{a.status}</span>
            <ChevronRight size={18} />
          </button>
        ))
      ) : (
        <div className="empty">
          <FileText size={26} />
          <strong>Your first report starts here.</strong>
          <p>Try the demo or add a job posting to begin.</p>
        </div>
      )}
    </div>
  );
}
function AssessmentCard({
  a,
  evidence,
  review,
  busy,
  snapshotIds,
}: {
  snapshotIds: string[];
  a: Assessment;
  evidence: (e: Evidence) => void;
  review: (s: Status, r: string, remove: string[], add: string[]) => void;
  busy: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const sources = useQuery({
    queryKey: ["sourceChunks", snapshotIds],
    enabled: editing,
    queryFn: async () =>
      (
        await Promise.all(
          snapshotIds.map((id) =>
            many<{ id: string; path: string; start: number; end: number }>(
              `/snapshots/${id}/chunks`,
            ),
          ),
        )
      ).flat(),
  });
  return (
    <section className="card assessment">
      <div className="section-title">
        <span className={"status " + a.status}>
          {a.status === "supported"
            ? "✓"
            : a.status === "partial"
              ? "◐"
              : a.status === "not_evidenced"
                ? "−"
                : "◇"}{" "}
          {labels[a.status]}
        </span>
        <span className="muted">
          {a.requirement.priority} · {a.requirement.category}
        </span>
      </div>
      <h3>{a.requirement.text}</h3>
      <p>{a.explanation}</p>
      {a.evidence.map((e) => (
        <button
          className="evidence-link"
          key={e.chunk_id + e.quote}
          onClick={() => evidence(e)}
        >
          <FileText size={16} />
          <span>
            {e.path}
            <small>
              Lines {e.start}–{e.end} · {e.type} · citation verified
            </small>
          </span>
          <ChevronRight size={16} />
        </button>
      ))}
      <ul className="limitations">
        {a.limitations.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
      {a.invalid_citations.length > 0 && (
        <p className="error">
          {a.invalid_citations.length} invalid citations rejected.
        </p>
      )}
      {a.reviews.length > 0 && (
        <p className="reviewed">
          Human reviewed · Original: {labels[a.original.status]}
        </p>
      )}
      <details onToggle={(e) => setEditing(e.currentTarget.open)}>
        <summary>Review conclusion</summary>
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            review(
              f.get("status") as Status,
              String(f.get("reason")),
              f.getAll("remove").map(String),
              f.get("add") ? [String(f.get("add"))] : [],
            );
          }}
        >
          <label>
            Effective conclusion
            <select name="status" defaultValue={a.status}>
              {Object.entries(labels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label>
            Reason
            <textarea name="reason" required minLength={3} rows={2} />
          </label>
          {a.evidence.map((e) => (
            <label key={e.chunk_id} className="check">
              <input type="checkbox" name="remove" value={e.chunk_id} />
              Remove evidence: {e.path}
            </label>
          ))}
          <label>
            Add evidence from an analyzed snapshot
            <select name="add">
              <option value="">No additional evidence</option>
              {sources.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.path} · lines {c.start}–{c.end}
                </option>
              ))}
            </select>
          </label>
          <button disabled={busy}>Save human review</button>
        </form>
        {a.reviews.map((r, i) => (
          <p key={i}>
            {r.created_at}: {r.reason}
          </p>
        ))}
      </details>
    </section>
  );
}
function EvidencePanel({ e, close }: { e: Evidence; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog ref={ref} onCancel={close} className="evidence-panel">
      <div className="section-title">
        <span className="eyebrow">SOURCE EVIDENCE</span>
        <button aria-label="Close evidence" onClick={close}>
          <X size={18} />
        </button>
      </div>
      <h2>{e.path}</h2>
      <p>
        Lines {e.start}–{e.end} · {e.type}
      </p>
      <span className="status supported">✓ Exact citation verified</span>
      <p>{e.relation}</p>
      <div className="code">
        {e.source_text.split("\n").map((line, i) => (
          <div
            key={i}
            className={
              i + e.source_start >= e.start && i + e.source_start <= e.end
                ? "highlight"
                : ""
            }
          >
            <span>{i + e.source_start}</span>
            <code>{line || " "}</code>
          </div>
        ))}
      </div>
      <p className="quiet">
        Text presence is verified. Relevance and correctness still require
        judgment. Imported code was not run.
      </p>
      {e.url ? (
        <a href={e.url} target="_blank" rel="noreferrer" className="button">
          Open fixed GitHub commit <ExternalLink size={15} />
        </a>
      ) : (
        <span className="pill">Local fixture · No GitHub source</span>
      )}
    </dialog>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);

function SnapshotFiles({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const query = useQuery({
    queryKey: ["snapshotFiles", id],
    enabled: open,
    queryFn: () =>
      one<{
        files: { id: string; path: string; line_count: number; type: string }[];
      }>("/snapshots/" + id),
  });
  return (
    <div>
      <button onClick={() => setOpen(!open)}>
        {open ? "Hide" : "Show"} imported file inventory
      </button>
      {open && (
        <ul>
          {query.data?.files.map((f) => (
            <li key={f.id}>
              {f.path} · {f.line_count} lines · {f.type}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
