import { ArrowRight, Globe, Play, Plus, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { one, request } from "../api";
import { useApp } from "../app-context";
import { useJobs, useSnapshots, useProjects } from "../hooks/queries";
import type { Job, JobUrlFetchResponse, Requirement, Task } from "../types";

export function JobPage() {
  const {
    t,
    busy,
    act,
    go,
    setError,
    job,
    setJob,
    selected,
    setSelected,
    jobDraft: draft,
    setJobDraft,
    setupAndRun,
    track,
  } = useApp();
  const jobs = useJobs();
  const snapshots = useSnapshots();
  const projects = useProjects();
  const [fetching, setFetching] = useState(false);
  const [notice, setNotice] = useState("");
  const noticeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(noticeTimer.current), []);

  const patch = (change: Partial<typeof draft>) => setJobDraft({ ...draft, ...change });
  const flashNotice = (message: string) => {
    setNotice(message);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(""), 3500);
  };

  async function fetchFromUrl() {
    const url = draft.fetchUrl.trim();
    if (!url) return;
    setFetching(true);
    try {
      const res = await request<JobUrlFetchResponse>("/job-postings/fetch-url", { url });
      setJobDraft({
        ...draft,
        title: res.title || draft.title,
        company: res.company || draft.company,
        url,
        text: res.text,
      });
      flashNotice(t.fileLoadedSuccess);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setFetching(false);
    }
  }

  function loadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;
      setJobDraft({
        ...draft,
        text: content,
        title: draft.title || file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
      });
      flashNotice(t.fileLoadedSuccess);
    };
    reader.readAsText(file);
  }

  const reviewed = (j: Job) => j.requirements.map((r) => ({ ...r, reviewed: true }));
  const saveRequirements = (j: Job) =>
    one<Job>(
      `/job-postings/${j.id}/requirements`,
      { requirements: reviewed(j), version: j.requirements_version },
      "PUT",
    );

  function changeReq(id: string, change: Partial<Requirement>) {
    if (job)
      setJob({
        ...job,
        requirements: job.requirements.map((r) =>
          r.id === id ? { ...r, ...change, reviewed: true } : r,
        ),
      });
  }

  async function startAnalysis() {
    if (!job) return;
    const saved = await saveRequirements(job);
    setJob(saved);
    track(
      await one<Task>("/analyses", {
        job_id: job.id,
        snapshot_ids: selected,
        mode: job.demo ? "demo" : "real",
        request_id: crypto.randomUUID(),
      }),
    );
  }

  return (
    <>
      <div className="eyebrow">{t.applicationWorkspace}</div>
      <h1>{job ? t.jobReviewTitle : t.jobStartTitle}</h1>
      <p className="intro">{job ? t.jobReviewIntro : t.jobStartIntro}</p>
      {!job ? (
        <>
          <div className="quick-start">
            <span>{t.homeCardSetupRunDesc}</span>
            <button type="button" className="primary button-sm" onClick={setupAndRun} disabled={busy}>
              <Play size={14} fill="currentColor" /> {t.buttonSetupAndRun}
            </button>
          </div>
          <div className="card fetch-card">
            <div className="inline-row">
              <Globe size={18} />
              <h2>{t.fetchJobFromUrl}</h2>
            </div>
            <div className="inline-row wrap">
              <input
                type="url"
                aria-label={t.fetchJobFromUrl}
                placeholder={t.fetchJobUrlPlaceholder}
                value={draft.fetchUrl}
                onChange={(e) => patch({ fetchUrl: e.target.value })}
                className="grow"
              />
              <button
                type="button"
                disabled={fetching || !draft.fetchUrl.trim()}
                onClick={fetchFromUrl}
              >
                {fetching ? t.fetchingJobUrl : t.fetchJobButton}
              </button>
            </div>
            <div className="fetch-divider inline-row between wrap">
              <label className="file-picker">
                <Upload size={16} />
                <span>{t.uploadJobFile}</span>
                <input type="file" accept=".txt,.md,.text" onChange={loadFile} />
              </label>
              <span role="status" aria-live="polite">
                {notice && <span className="pill supported pill-sm">✓ {notice}</span>}
              </span>
            </div>
          </div>

          <form
            className="card form"
            onSubmit={(e) => {
              e.preventDefault();
              void act(async () => {
                setJob(
                  await one<Job>("/job-postings", {
                    title: draft.title,
                    company: draft.company,
                    url: draft.url,
                    text: draft.text,
                    language: draft.language,
                  }),
                );
              });
            }}
          >
            <div className="two">
              <label>
                {t.jobTitleLabel}
                <input
                  name="title"
                  required
                  value={draft.title}
                  onChange={(e) => patch({ title: e.target.value })}
                />
              </label>
              <label>
                {t.companyLabel}
                <input
                  name="company"
                  value={draft.company}
                  onChange={(e) => patch({ company: e.target.value })}
                />
              </label>
            </div>
            <label>
              {t.referenceUrlLabel}
              <input
                name="url"
                type="url"
                value={draft.url}
                onChange={(e) => patch({ url: e.target.value })}
              />
            </label>
            <label>
              {t.languageLabel}
              <select
                name="language"
                value={draft.language}
                onChange={(e) => patch({ language: e.target.value })}
              >
                <option value="en">English</option>
                <option value="ca">Català</option>
                <option value="es">Español</option>
              </select>
            </label>
            <label>
              {t.jobPostingLabel}
              <textarea
                name="text"
                required
                minLength={10}
                rows={10}
                value={draft.text}
                onChange={(e) => patch({ text: e.target.value })}
              />
            </label>
            <button
              className="primary"
              disabled={busy || !draft.title.trim() || draft.text.trim().length < 10}
            >
              {t.savePosting} <ArrowRight size={16} />
            </button>
          </form>
          {jobs.data
            ?.filter((j) => !j.demo)
            .map((j) => (
              <button key={j.id} onClick={() => setJob(j)}>
                {t.resumePosting} {j.title}
              </button>
            ))}
        </>
      ) : (
        <>
          <div className="notice">{job.demo ? t.fixtureDemoNotice : t.realAnalysisNotice}</div>
          <details className="card">
            <summary>
              {job.title} · {t.originalPostingSummary}
            </summary>
            <pre className="posting">{job.canonical_text}</pre>
          </details>
          <button
            disabled={busy}
            onClick={() =>
              act(async () =>
                track(
                  await one<Task>(`/job-postings/${job.id}/extract-requirements`, {
                    mode: job.demo ? "demo" : "real",
                    request_id: crypto.randomUUID(),
                  }),
                ),
              )
            }
          >
            {t.extractRequirements}
            {job.requirements.length ? ` (${t.extractAgain})` : ""}
          </button>
          <div className="requirements">
            {job.requirements.map((r, i) => (
              <section className="card requirement-edit" key={r.id}>
                <div className="requirement-number">{String(i + 1).padStart(2, "0")}</div>
                <div>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={r.selected ?? true}
                      onChange={(e) => changeReq(r.id, { selected: e.target.checked })}
                    />
                    {t.includeInAnalysis}
                  </label>
                  <label>
                    {t.requirementLabel}
                    <input value={r.text} onChange={(e) => changeReq(r.id, { text: e.target.value })} />
                  </label>
                  <div className="two">
                    <label>
                      {t.priorityLabel}
                      <select
                        value={r.priority}
                        onChange={(e) =>
                          changeReq(r.id, { priority: e.target.value as Requirement["priority"] })
                        }
                      >
                        <option value="required">{t.priorityRequired}</option>
                        <option value="preferred">{t.priorityPreferred}</option>
                        <option value="unspecified">{t.priorityUnspecified}</option>
                      </select>
                    </label>
                    <label>
                      {t.verifiableFromCode}
                      <select
                        value={r.verifiability}
                        onChange={(e) =>
                          changeReq(r.id, {
                            verifiability: e.target.value as Requirement["verifiability"],
                          })
                        }
                      >
                        <option value="code">{t.codeEvidence}</option>
                        <option value="limited">{t.limited}</option>
                        <option value="external">{t.externalEvidenceNeeded}</option>
                      </select>
                    </label>
                  </div>
                  <small>
                    {r.provenance === "manual"
                      ? t.manuallyAddedNoCitation
                      : `${t.postingExcerptPrefix} “${r.quote}” · ${t.characterPrefix} ${r.offset}`}
                  </small>
                </div>
                <button
                  className="icon-button"
                  aria-label={`Remove ${r.text}`}
                  onClick={() =>
                    setJob({ ...job, requirements: job.requirements.filter((x) => x.id !== r.id) })
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
            {t.addManualRequirement}
          </button>
          <section className="card project-picker">
            <h2>{t.selectProjectSnapshots}</h2>
            <p>{t.selectProjectDesc}</p>
            {snapshots.data
              ?.filter((s) => s.status === "complete" && (!job.demo || s.demo))
              .map((s) => (
                <label className="snapshot-choice" key={s.id}>
                  <input
                    type="checkbox"
                    checked={selected.includes(s.id)}
                    onChange={(e) =>
                      setSelected(
                        e.target.checked ? [...selected, s.id] : selected.filter((x) => x !== s.id),
                      )
                    }
                  />
                  <span>
                    <strong>{projects.data?.find((p) => p.id === s.project_id)?.name}</strong>
                    <small>
                      {s.sha.slice(0, 12)} · {s.file_count} {t.files} ·{" "}
                      {s.partial ? t.partialImport : t.allEligibleImported}
                    </small>
                  </span>
                </label>
              ))}
            {!snapshots.data?.length && <button onClick={() => go("projects")}>{t.yourProjects}</button>}
          </section>
          <button
            disabled={busy}
            onClick={() =>
              act(async () => {
                setJob(await saveRequirements(job));
              })
            }
          >
            {t.saveReviewedRequirements}
          </button>
          <div className="action-bar">
            <span>
              {job.requirements.filter((r) => r.selected ?? true).length} / {job.requirements.length}{" "}
              {t.maxRequirementsNote}
            </span>
            <button
              disabled={busy || !selected.length || !job.requirements.length}
              className="primary"
              onClick={() => act(startAnalysis)}
            >
              {t.analyzeEvidence} <ArrowRight size={17} />
            </button>
          </div>
        </>
      )}
    </>
  );
}
