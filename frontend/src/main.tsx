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
} from "lucide-react";
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
    [projectFilter, setProjectFilter] = useState("all");
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
        a.evidence.some((e) => e.snapshot_id === projectFilter)),
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
            ["home", "Overview", FileText],
            ["projects", "Projects", FolderGit2],
            ["history", "Analysis history", History],
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
          <span className="pill">Private · Local</span>
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
              <h1>{copy.tagline}</h1>
              <p className="intro">{copy.subtitle}</p>
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
                    New analysis <ArrowRight size={17} />
                  </button>
                  <div className="quiet">
                    {health.data?.real_provider_configured
                      ? "AI provider configured"
                      : "Real analysis needs an Anthropic or Gemini API key on the server."}
                  </div>
                </section>
                <section className="card demo-card">
                  <span className="pill">NO SETUP NEEDED</span>
                  <h2>See what evidence looks like.</h2>
                  <p>
                    Explore two fictional projects and a job posting. Includes
                    clear matches, gaps, and claims that code cannot prove.
                  </p>
                  <button disabled={busy} onClick={() => act(demo)}>
                    Try fixture demo <ArrowRight size={17} />
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
                    const p = await one<Project>("/projects", {
                      url: f.get("url"),
                      name: f.get("name"),
                      contribution: f.get("contribution"),
                    });
                    track(
                      await one<Task>(`/projects/${p.id}/imports`, {
                        ref: f.get("ref"),
                        request_id: crypto.randomUUID(),
                      }),
                    );
                  });
                }}
              >
                <label>
                  Public GitHub repository
                  <input
                    name="url"
                    placeholder="https://github.com/owner/repository"
                    required
                  />
                </label>
                <div className="two">
                  <label>
                    Project name (optional)
                    <input name="name" />
                  </label>
                  <label>
                    Branch or commit (optional)
                    <input name="ref" />
                  </label>
                </div>
                <label>
                  Your contribution (self-declared, unverified)
                  <textarea name="contribution" rows={2} />
                </label>
                <button className="primary" disabled={busy}>
                  Import repository <Plus size={17} />
                </button>
              </form>
              {projects.data?.map((p) => (
                <section className="card project" key={p.id}>
                  <div className="section-title">
                    <h2>{p.name}</h2>
                    <span className="pill">
                      {p.demo ? "Fixture" : "Public repository"}
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
              {report.data.status !== "complete" ? (
                <div role="alert" className="notice">
                  Analysis {report.data.status}. Partial results are not a
                  complete report.
                </div>
              ) : (
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
