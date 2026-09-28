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
  Settings,
  Key,
  Eye,
  EyeOff,
  Mail,
  Send,
  MessageSquare,
  Bot,
  User,
  Sparkles,
  Globe,
  Upload,
} from "lucide-react";
import { translations, type Lang, getStatusLabels, type Translations } from "./i18n";
import { one, many, request, counts } from "./api";
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
  AppSettings,
  SettingsTestResult,
  GeneratedCoverLetter,
  ChatMessage,
  InterviewChatReply,
  JobUrlFetchResponse,
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
    [reportTab, setReportTab] = useState<"evidence" | "resume" | "interview" | "cover_letter">("evidence"),
    [interviewSubMode, setInterviewSubMode] = useState<"cards" | "chat">("chat"),
    [interviewChatMessages, setInterviewChatMessages] = useState<ChatMessage[]>([]),
    [interviewChatInput, setInterviewChatInput] = useState(""),
    [interviewChatBusy, setInterviewChatBusy] = useState(false),
    [interviewCompleted, setInterviewCompleted] = useState(false),
    [coverLetterTone, setCoverLetterTone] = useState<"balanced" | "technical" | "concise">("balanced"),
    [currentCoverLetter, setCurrentCoverLetter] = useState<GeneratedCoverLetter | null>(null),
    [generatingCoverLetter, setGeneratingCoverLetter] = useState(false),
    [copiedCoverLetter, setCopiedCoverLetter] = useState(false),
    [interviewIndex, setInterviewIndex] = useState(0),
    [interviewTimer, setInterviewTimer] = useState(0),
    [timerActive, setTimerActive] = useState(false),
    [interviewNotes, setInterviewNotes] = useState<Record<number, string>>({}),
    [revealedQuestions, setRevealedQuestions] = useState<Record<number, boolean>>({}),
    [jobTitle, setJobTitle] = useState(""),
    [jobCompany, setJobCompany] = useState(""),
    [jobUrl, setJobUrl] = useState(""),
    [jobText, setJobText] = useState(""),
    [jobLanguage, setJobLanguage] = useState<string>("en"),
    [jobFetchUrlInput, setJobFetchUrlInput] = useState(""),
    [fetchingJobUrl, setFetchingJobUrl] = useState(false),
    [fileNotice, setFileNotice] = useState(""),
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
  const statusLabels = getStatusLabels(t);

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
      request<{ real_provider_configured: boolean; model: string; active_provider?: string }>("/health"),
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
  const appSettings = useQuery({
    queryKey: ["appSettings"],
    queryFn: () => one<AppSettings>("/settings"),
  });
  const [settingsProvider, setSettingsProvider] = useState<"gemini" | "anthropic" | "openai">("gemini");
  const [settingsModel, setSettingsModel] = useState<string>("");
  const [geminiKeyInput, setGeminiKeyInput] = useState<string>("");
  const [anthropicKeyInput, setAnthropicKeyInput] = useState<string>("");
  const [openaiKeyInput, setOpenaiKeyInput] = useState<string>("");
  const [githubTokenInput, setGithubTokenInput] = useState<string>("");
  const [showGeminiKey, setShowGeminiKey] = useState<boolean>(false);
  const [showAnthropicKey, setShowAnthropicKey] = useState<boolean>(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState<boolean>(false);
  const [showGithubToken, setShowGithubToken] = useState<boolean>(false);
  const [testStatus, setTestStatus] = useState<{ testing: boolean; result: SettingsTestResult | null }>({
    testing: false,
    result: null,
  });
  const [settingsSavedAlert, setSettingsSavedAlert] = useState<boolean>(false);

  useEffect(() => {
    if (appSettings.data) {
      const p = (appSettings.data.llm_provider as "gemini" | "anthropic" | "openai") || "gemini";
      setSettingsProvider(p);
      setSettingsModel(appSettings.data.llm_model || "");
    }
  }, [appSettings.data]);

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    await act(async () => {
      const defModel =
        settingsProvider === "openai"
          ? "gpt-6-sol"
          : settingsProvider === "anthropic"
            ? "claude-sonnet-4-6"
            : "gemini-2.5-flash";
      const payload: Partial<{
        llm_provider: string;
        llm_model: string;
        gemini_api_key?: string;
        anthropic_api_key?: string;
        openai_api_key?: string;
        github_token?: string;
      }> = {
        llm_provider: settingsProvider,
        llm_model: settingsModel.trim() || defModel,
      };
      if (geminiKeyInput) payload.gemini_api_key = geminiKeyInput;
      if (anthropicKeyInput) payload.anthropic_api_key = anthropicKeyInput;
      if (openaiKeyInput) payload.openai_api_key = openaiKeyInput;
      if (githubTokenInput) payload.github_token = githubTokenInput;

      await one<AppSettings>("/settings", payload);
      await qc.invalidateQueries({ queryKey: ["appSettings"] });
      await qc.invalidateQueries({ queryKey: ["health"] });
      setGeminiKeyInput("");
      setAnthropicKeyInput("");
      setOpenaiKeyInput("");
      setGithubTokenInput("");
      setSettingsSavedAlert(true);
      setTimeout(() => setSettingsSavedAlert(false), 3000);
    });
  }

  async function handleTestConnection(providerToTest: "gemini" | "anthropic" | "openai" | "github") {
    setTestStatus({ testing: true, result: null });
    try {
      const key =
        providerToTest === "gemini"
          ? geminiKeyInput
          : providerToTest === "anthropic"
            ? anthropicKeyInput
            : providerToTest === "openai"
              ? openaiKeyInput
              : githubTokenInput;
      const defModel =
        providerToTest === "openai"
          ? "gpt-6-sol"
          : providerToTest === "anthropic"
            ? "claude-sonnet-4-6"
            : "gemini-2.5-flash";
      const res = await one<SettingsTestResult>("/settings/test", {
        provider: providerToTest,
        api_key: key || undefined,
        model: settingsModel.trim() || defModel,
      });
      setTestStatus({ testing: false, result: res });
    } catch (err) {
      setTestStatus({
        testing: false,
        result: {
          success: false,
          message: err instanceof Error ? err.message : "Error testing connection",
          latency_ms: 0,
        },
      });
    }
  }

  async function handleClearKeys() {
    await act(async () => {
      await one<AppSettings>("/settings", {
        gemini_api_key: "",
        anthropic_api_key: "",
        openai_api_key: "",
        github_token: "",
      });
      await qc.invalidateQueries({ queryKey: ["appSettings"] });
      await qc.invalidateQueries({ queryKey: ["health"] });
      setGeminiKeyInput("");
      setAnthropicKeyInput("");
      setOpenaiKeyInput("");
      setGithubTokenInput("");
      setTestStatus({ testing: false, result: null });
    });
  }

  async function handleFetchJobUrl() {
    if (!jobFetchUrlInput.trim()) return;
    setFetchingJobUrl(true);
    try {
      const res = await request<JobUrlFetchResponse>("/job-postings/fetch-url", {
        url: jobFetchUrlInput.trim(),
      });
      if (res.title) setJobTitle(res.title);
      if (res.company) setJobCompany(res.company);
      setJobUrl(jobFetchUrlInput.trim());
      setJobText(res.text);
      setFileNotice(t.fileLoadedSuccess);
      setTimeout(() => setFileNotice(""), 3500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setFetchingJobUrl(false);
    }
  }

  function handleJobFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setJobText(content);
        if (!jobTitle) {
          const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
          setJobTitle(cleanName);
        }
        setFileNotice(t.fileLoadedSuccess);
        setTimeout(() => setFileNotice(""), 3500);
      }
    };
    reader.readAsText(file);
  }

  useEffect(() => {
    if (report.data) {
      if (report.data.cover_letter) {
        setCurrentCoverLetter(report.data.cover_letter);
      } else {
        setCurrentCoverLetter(null);
      }
      if (report.data.interview_chat && report.data.interview_chat.length > 0) {
        setInterviewChatMessages(report.data.interview_chat);
        const last = report.data.interview_chat[report.data.interview_chat.length - 1];
        if (
          last.role === "interviewer" &&
          (last.content.toLowerCase().includes("conclu") ||
            last.content.toLowerCase().includes("complet"))
        ) {
          setInterviewCompleted(true);
        } else {
          setInterviewCompleted(false);
        }
      } else {
        setInterviewChatMessages([]);
        setInterviewCompleted(false);
      }
    }
  }, [report.data]);

  async function handleGenerateCoverLetter(tone: "balanced" | "technical" | "concise") {
    if (!report.data) return;
    setGeneratingCoverLetter(true);
    try {
      const res = await request<GeneratedCoverLetter>(`/analyses/${report.data.id}/cover-letter`, {
        language: lang,
        tone,
      });
      setCurrentCoverLetter(res);
      await qc.invalidateQueries({ queryKey: ["report", report.data.id] });
    } catch (err) {
      console.error("Error generating cover letter:", err);
    } finally {
      setGeneratingCoverLetter(false);
    }
  }

  function handleCopyCoverLetter() {
    if (!currentCoverLetter) return;
    const fullText = `${currentCoverLetter.subject}\n\n${currentCoverLetter.body}`;
    navigator.clipboard.writeText(fullText);
    setCopiedCoverLetter(true);
    setTimeout(() => setCopiedCoverLetter(false), 2000);
  }

  function handleDownloadCoverLetter() {
    if (!currentCoverLetter || !report.data) return;
    const blob = new Blob([`${currentCoverLetter.subject}\n\n${currentCoverLetter.body}`], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cover-letter-${report.data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleStartInterviewChat() {
    if (!report.data) return;
    setInterviewChatBusy(true);
    try {
      const res = await request<InterviewChatReply>(`/analyses/${report.data.id}/interview/chat`, {
        messages: [],
        language: lang,
      });
      const initialMsg: ChatMessage = {
        id: "msg-" + Date.now(),
        role: "interviewer",
        content: res.interviewer_reply,
        feedback: res.evaluation_feedback,
        created_at: new Date().toISOString(),
      };
      setInterviewChatMessages([initialMsg]);
      if (res.is_wrap_up) setInterviewCompleted(true);
    } catch (err) {
      console.error("Error starting interview chat:", err);
    } finally {
      setInterviewChatBusy(false);
    }
  }

  async function handleSendCandidateAnswer() {
    if (!report.data || !interviewChatInput.trim() || interviewChatBusy) return;
    const answerText = interviewChatInput.trim();
    setInterviewChatInput("");
    const candidateMsg: ChatMessage = {
      id: "msg-" + Date.now(),
      role: "candidate",
      content: answerText,
      created_at: new Date().toISOString(),
    };
    const updatedMessages = [...interviewChatMessages, candidateMsg];
    setInterviewChatMessages(updatedMessages);
    setInterviewChatBusy(true);
    try {
      const res = await request<InterviewChatReply>(`/analyses/${report.data.id}/interview/chat`, {
        messages: updatedMessages,
        language: lang,
      });
      if (res.evaluation_feedback) {
        candidateMsg.feedback = res.evaluation_feedback;
      }
      const replyMsg: ChatMessage = {
        id: "msg-" + (Date.now() + 1),
        role: "interviewer",
        content: res.interviewer_reply,
        feedback: "",
        created_at: new Date().toISOString(),
      };
      setInterviewChatMessages([...updatedMessages, replyMsg]);
      if (res.is_wrap_up) setInterviewCompleted(true);
      await qc.invalidateQueries({ queryKey: ["report", report.data.id] });
    } catch (err) {
      console.error("Error sending interview answer:", err);
    } finally {
      setInterviewChatBusy(false);
    }
  }

  async function handleResetInterviewChat() {
    if (!report.data) return;
    try {
      await request(`/analyses/${report.data.id}/interview/reset`, {});
      setInterviewChatMessages([]);
      setInterviewCompleted(false);
      await qc.invalidateQueries({ queryKey: ["report", report.data.id] });
    } catch (err) {
      console.error("Error resetting interview chat:", err);
    }
  }


  async function act(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      await qc.invalidateQueries({ queryKey: ["projects"] });
      await qc.invalidateQueries({ queryKey: ["history"] });
      await qc.invalidateQueries({ queryKey: ["jobs"] });
      await qc.invalidateQueries({ queryKey: ["appSettings"] });
      await qc.invalidateQueries({ queryKey: ["health"] });
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
            ["settings", t.navSettings, Settings],
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
                : page === "settings"
                  ? t.navSettings
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
            <span className="pill">{t.badgePrivateLocal}</span>
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
              {t.backendUnreachable}
            </div>
          )}
          {page === "home" && (
            <>
              <div className="eyebrow">{t.yourWorkYourEvidence}</div>
              <h1>{t.tagline}</h1>
              <p className="intro">{t.subtitle}</p>
              <div className="home-grid">
                <section className="card start">
                  <span className="icon-box">
                    <FileText />
                  </span>
                  <h2>{t.homeCardStartTitle}</h2>
                  <p>
                    {t.homeCardStartDesc}
                  </p>
                  <button
                    className="primary"
                    onClick={() => {
                      setJob(null);
                      setSelected([]);
                      setJobTitle("");
                      setJobCompany("");
                      setJobUrl("");
                      setJobText("");
                      setJobFetchUrlInput("");
                      setFileNotice("");
                      setPage("job");
                    }}
                  >
                    {t.navNewAnalysis} <ArrowRight size={17} />
                  </button>
                  <div className="quiet" style={{ marginTop: 12 }}>
                    {health.data?.real_provider_configured ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <span className="pill supported" style={{ fontSize: "0.75rem", padding: "2px 8px" }}>
                          ✓ {health.data.active_provider ? (health.data.active_provider === "gemini" ? "Gemini" : health.data.active_provider === "openai" ? "OpenAI" : "Claude") : "IA"}
                        </span>
                        {t.aiConfigured} · {health.data.model}
                      </span>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                        <span>{t.aiNotConfigured}</span>
                        <button
                          type="button"
                          className="quiet"
                          style={{
                            padding: 0,
                            border: "none",
                            background: "none",
                            textDecoration: "underline",
                            cursor: "pointer",
                            fontWeight: 600,
                          }}
                          onClick={() => setPage("settings")}
                        >
                          {t.openSettingsButton} →
                        </button>
                      </div>
                    )}
                  </div>
                </section>
                <section className="card">
                  <span className="icon-box">
                    <FolderGit2 />
                  </span>
                  <h2>{t.homeCardProjectsTitle}</h2>
                  <p>{t.homeCardProjectsDesc}</p>
                  <button
                    className="button"
                    onClick={() => setPage("projects")}
                  >
                    {t.navProjects} <ArrowRight size={17} />
                  </button>
                  <div className="quiet" style={{ marginTop: 12 }}>
                    <span>{projects.data?.length || 0} {t.projectsConfigured}</span>
                  </div>
                  <button
                    data-testid="test-load-demo"
                    style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "auto" }}
                    aria-hidden="true"
                    tabIndex={-1}
                    onClick={() => act(demo)}
                  />
                </section>
              </div>
              {(history.data || []).length > 0 && (
                <>
                  <section className="section-title">
                    <h2>{t.recentAnalyses}</h2>
                    <button
                      className="text-button"
                      onClick={() => setPage("history")}
                    >
                      {t.viewHistory} <ArrowRight size={16} />
                    </button>
                  </section>
                  <HistoryList
                    rows={(history.data || []).slice(0, 4)}
                    t={t}
                    open={(id) => {
                      setReportId(id);
                      setPage("report");
                    }}
                  />
                </>
              )}
              <div className="principles">
                <p>
                  <strong>{t.principle1Title}</strong>{t.principle1Desc}
                </p>
                <p>
                  <strong>{t.principle2Title}</strong>{t.principle2Desc}
                </p>
                <p>
                  <strong>{t.principle3Title}</strong>{t.principle3Desc}
                </p>
              </div>
            </>
          )}
          {page === "projects" && (
            <>
              <div className="eyebrow">{t.projectsEyebrow}</div>
              <h1>{t.yourProjects}</h1>
              <p className="intro">{t.projectsIntro}</p>
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
                            excludes: f.get("excludes") || "",
                          }
                        : {
                            url: f.get("url"),
                            name: f.get("name"),
                            contribution: f.get("contribution"),
                            excludes: f.get("excludes") || "",
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
                  <>
                    <label>
                      {t.sourceTypeGithub}
                      <input
                        name="url"
                        placeholder={t.githubUrlPlaceholder}
                        required
                      />
                    </label>
                    {appSettings.data?.github_token_configured && (
                      <div style={{ margin: "-6px 0 10px", fontSize: "0.85rem", color: "var(--color-success, #10b981)" }}>
                        ✓ {t.privateRepoTokenNotice}
                      </div>
                    )}
                  </>
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
                    {t.projectNameOptional}
                    <input name="name" />
                  </label>
                  {projectSource === "github" && (
                    <label>
                      {t.branchOrCommitOptional}
                      <input name="ref" />
                    </label>
                  )}
                </div>
                <label>
                  {t.customExcludesLabel}
                  <input
                    name="excludes"
                    placeholder={t.customExcludesPlaceholder}
                  />
                </label>
                <label>
                  {t.yourContribution}
                  <textarea name="contribution" rows={2} />
                </label>
                <button className="primary" disabled={busy}>
                  {projectSource === "local"
                    ? t.importLocalDir
                    : t.importRepository}{" "}
                  <Plus size={17} />
                </button>
              </form>
              {projects.data?.map((p) => (
                <section className="card project" key={p.id}>
                  <div className="section-title">
                    <h2>{p.name}</h2>
                    <span className="pill">
                      {p.demo
                        ? t.badgeFixture
                        : p.local
                          ? t.badgeLocalFolder
                          : t.badgePublicRepo}
                    </span>
                  </div>
                  <p>
                    {p.contribution || t.personalContributionNotDeclared}
                  </p>
                  {snapshots.data
                    ?.filter((s) => s.project_id === p.id)
                    .map((s) => (
                      <details key={s.id}>
                        <summary>
                          {s.file_count} {t.files} · {s.status} ·{" "}
                          {s.partial
                            ? t.partialImport
                            : t.allEligibleImported}{" "}
                          <code>{s.sha.slice(0, 12)}</code>
                        </summary>
                        <p>{t.commitLabel}: {s.sha}</p>
                        <p>
                          {s.bytes.toLocaleString()} {t.bytesImported}{" "}
                          {s.discarded.length} {t.filesExcluded}
                        </p>
                        <ul>
                          {s.discarded.map((d) => (
                            <li key={d.path}>
                              {d.path}: {d.reason}
                            </li>
                          ))}
                        </ul>
                        <SnapshotFiles id={s.id} t={t} />
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
                      {t.importNewSnapshot}
                    </button>
                  )}
                </section>
              ))}
            </>
          )}
          {page === "job" && (
            <>
              <div className="eyebrow">{t.applicationWorkspace}</div>
              <h1>{job ? t.jobReviewTitle : t.jobStartTitle}</h1>
              <p className="intro">
                {job ? t.jobReviewIntro : t.jobStartIntro}
              </p>
              {!job ? (
                <>
                  <div className="card" style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <Globe size={18} />
                      <h2 style={{ fontSize: "1.1rem", margin: 0 }}>{t.fetchJobFromUrl}</h2>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <input
                        type="url"
                        placeholder={t.fetchJobUrlPlaceholder}
                        value={jobFetchUrlInput}
                        onChange={(e) => setJobFetchUrlInput(e.target.value)}
                        style={{ flex: 1, minWidth: 240 }}
                      />
                      <button
                        type="button"
                        disabled={fetchingJobUrl || !jobFetchUrlInput.trim()}
                        onClick={handleFetchJobUrl}
                      >
                        {fetchingJobUrl ? t.fetchingJobUrl : t.fetchJobButton}
                      </button>
                    </div>

                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--color-border, #e2e8f0)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                      <label style={{ fontSize: "0.88rem", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, margin: 0, fontWeight: 500 }}>
                        <Upload size={16} />
                        <span>{t.uploadJobFile}</span>
                        <input
                          type="file"
                          accept=".txt,.md,.text"
                          style={{ display: "none" }}
                          onChange={handleJobFileUpload}
                        />
                      </label>
                      {fileNotice && (
                        <span className="pill supported" style={{ fontSize: "0.8rem" }}>
                          ✓ {fileNotice}
                        </span>
                      )}
                    </div>
                  </div>

                  <form
                    className="card form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void act(async () => {
                        const j = await one<Job>("/job-postings", {
                          title: jobTitle,
                          company: jobCompany,
                          url: jobUrl,
                          text: jobText,
                          language: jobLanguage,
                        });
                        setJob(j);
                      });
                    }}
                  >
                    <div className="two">
                      <label>
                        {t.jobTitleLabel}
                        <input
                          name="title"
                          required
                          value={jobTitle}
                          onChange={(e) => setJobTitle(e.target.value)}
                        />
                      </label>
                      <label>
                        {t.companyLabel}
                        <input
                          name="company"
                          value={jobCompany}
                          onChange={(e) => setJobCompany(e.target.value)}
                        />
                      </label>
                    </div>
                    <label>
                      {t.referenceUrlLabel}
                      <input
                        name="url"
                        type="url"
                        value={jobUrl}
                        onChange={(e) => setJobUrl(e.target.value)}
                      />
                    </label>
                    <label>
                      {t.languageLabel}
                      <select
                        name="language"
                        value={jobLanguage}
                        onChange={(e) => setJobLanguage(e.target.value)}
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
                        value={jobText}
                        onChange={(e) => setJobText(e.target.value)}
                      />
                    </label>
                    <button
                      className="primary"
                      disabled={busy || !jobTitle.trim() || jobText.trim().length < 10}
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
                  <div className="notice">
                    {job.demo
                      ? t.fixtureDemoNotice
                      : t.realAnalysisNotice}
                  </div>
                  <details className="card">
                    <summary>{job.title} · {t.originalPostingSummary}</summary>
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
                    {t.extractRequirements}
                    {job.requirements.length ? ` (${t.extractAgain})` : ""}
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
                            {t.includeInAnalysis}
                          </label>
                          <label>
                            {t.requirementLabel}
                            <input
                              value={r.text}
                              onChange={(e) =>
                                changeReq(r.id, { text: e.target.value })
                              }
                            />
                          </label>
                          <div className="two">
                            <label>
                              {t.priorityLabel}
                              <select
                                value={r.priority}
                                onChange={(e) =>
                                  changeReq(r.id, {
                                    priority: e.target
                                      .value as Requirement["priority"],
                                  })
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
                                    verifiability: e.target
                                      .value as Requirement["verifiability"],
                                  })
                                }
                              >
                                <option value="code">{t.codeEvidence}</option>
                                <option value="limited">{t.limited}</option>
                                <option value="external">
                                  {t.externalEvidenceNeeded}
                                </option>
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
                    {t.addManualRequirement}
                  </button>
                  <section className="card project-picker">
                    <h2>{t.selectProjectSnapshots}</h2>
                    <p>{t.selectProjectDesc}</p>
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
                              {s.sha.slice(0, 12)} · {s.file_count} {t.files} ·{" "}
                              {s.partial ? t.partialImport : t.allEligibleImported}
                            </small>
                          </span>
                        </label>
                      ))}
                    {!snapshots.data?.length && (
                      <button onClick={() => setPage("projects")}>
                        {t.yourProjects}
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
                    {t.saveReviewedRequirements}
                  </button>
                  <div className="action-bar">
                    <span>
                      {
                        job.requirements.filter((r) => r.selected ?? true)
                          .length
                      }{" "}
                      / {job.requirements.length} {t.maxRequirementsNote}
                    </span>
                    <button
                      disabled={
                        busy || !selected.length || !job.requirements.length
                      }
                      className="primary"
                      onClick={() => act(start)}
                    >
                      {t.analyzeEvidence} <ArrowRight size={17} />
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
                  ? t.progressBuildingReport
                  : task.data?.status || t.progressPreparingTask}
              </h1>
              <p aria-live="polite">
                {task.data?.stage || t.waitingForTaskStatus}
              </p>
              <p>{t.progressNotice}</p>
              {["running", "queued"].includes(task.data?.status || "") ? (
                <button
                  onClick={() =>
                    act(async () => {
                      await one("/tasks/" + taskId + "/cancel", {});
                    })
                  }
                >
                  {t.cancelTask}
                </button>
              ) : (
                <button onClick={() => setPage(job ? "job" : "projects")}>
                  {t.retryExplicitly}
                </button>
              )}
            </section>
          )}
          {page === "history" && (
            <>
              <div className="eyebrow">{t.historyEyebrow}</div>
              <h1>{t.historyTitle}</h1>
              <p className="intro">{t.historyDesc}</p>
              <HistoryList
                rows={history.data || []}
                t={t}
                open={(id) => {
                  setReportId(id);
                  setPage("report");
                }}
              />
            </>
          )}
          {page === "settings" && (
            <>
              <div className="eyebrow">{t.settingsEyebrow}</div>
              <h1>{t.settingsTitle}</h1>
              <p className="intro">{t.settingsIntro}</p>

              {settingsSavedAlert && (
                <div className="success-banner" role="status">
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Check size={18} />
                    {t.settingsSaved}
                  </span>
                  <button
                    type="button"
                    aria-label="Dismiss alert"
                    onClick={() => setSettingsSavedAlert(false)}
                    style={{ border: "none", background: "none", cursor: "pointer", padding: 4 }}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              {testStatus.result && (
                <div
                  className={testStatus.result.success ? "success-banner" : "error"}
                  role="alert"
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {testStatus.result.success ? <Check size={18} /> : <X size={18} />}
                    {testStatus.result.message}
                    {testStatus.result.latency_ms > 0 && ` (${testStatus.result.latency_ms}ms)`}
                  </span>
                  <button
                    type="button"
                    aria-label="Dismiss test result"
                    onClick={() => setTestStatus({ testing: false, result: null })}
                    style={{ border: "none", background: "none", cursor: "pointer", padding: 4 }}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              <form className="card form" onSubmit={handleSaveSettings}>
                <h2>{t.aiProviderSection}</h2>
                <label>
                  {t.aiProviderSelect}
                  <select
                    value={settingsProvider}
                    onChange={(e) => {
                      const p = e.target.value as "gemini" | "anthropic" | "openai";
                      setSettingsProvider(p);
                    }}
                  >
                    <option value="gemini">{t.geminiOption}</option>
                    <option value="anthropic">{t.anthropicOption}</option>
                    <option value="openai">{t.openaiOption}</option>
                  </select>
                </label>

                <label style={{ marginTop: 14 }}>
                  {t.customModelLabel}
                  <input
                    type="text"
                    placeholder={
                      settingsProvider === "openai"
                        ? "gpt-6-sol"
                        : settingsProvider === "anthropic"
                          ? "claude-sonnet-4-6"
                          : "gemini-2.5-flash"
                    }
                    value={settingsModel}
                    onChange={(e) => setSettingsModel(e.target.value)}
                    style={{ fontFamily: "monospace", fontSize: "0.9rem" }}
                  />
                  <span className="quiet" style={{ fontSize: "0.8rem", marginTop: 4, display: "block" }}>
                    {t.customModelHelp}
                  </span>
                </label>

                <div style={{ marginTop: 14 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 6,
                    }}
                  >
                    <label style={{ margin: 0, fontWeight: 600 }}>
                      {t.geminiApiKeyLabel}
                    </label>
                    {appSettings.data?.gemini_api_key_configured ? (
                      <span className="pill supported" style={{ fontSize: "0.8rem" }}>
                        ✓ {t.keyConfiguredBadge}: {appSettings.data.gemini_api_key_preview}
                      </span>
                    ) : (
                      <span className="pill not_evidenced" style={{ fontSize: "0.8rem" }}>
                        {t.keyNotConfiguredBadge}
                      </span>
                    )}
                  </div>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <input
                      type={showGeminiKey ? "text" : "password"}
                      placeholder={
                        appSettings.data?.gemini_api_key_configured
                          ? "••••••••••••••••••••••••••••"
                          : "AIzaSy..."
                      }
                      value={geminiKeyInput}
                      onChange={(e) => setGeminiKeyInput(e.target.value)}
                      style={{ paddingRight: 40 }}
                    />
                    <button
                      type="button"
                      aria-label="Toggle Gemini key visibility"
                      onClick={() => setShowGeminiKey(!showGeminiKey)}
                      style={{
                        position: "absolute",
                        right: 8,
                        background: "none",
                        border: "none",
                        padding: 4,
                        cursor: "pointer",
                      }}
                    >
                      {showGeminiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 8,
                      marginTop: 6,
                    }}
                  >
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noreferrer"
                      className="quiet"
                      style={{ fontSize: "0.85rem", textDecoration: "underline" }}
                    >
                      {t.getGeminiKeyLink}
                    </a>
                    <button
                      type="button"
                      disabled={testStatus.testing || (!geminiKeyInput && !appSettings.data?.gemini_api_key_configured)}
                      onClick={() => handleTestConnection("gemini")}
                      style={{ padding: "6px 12px", fontSize: "0.85rem" }}
                    >
                      {testStatus.testing ? t.testingConnection : `${t.testConnection} (Gemini)`}
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: 18 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 6,
                    }}
                  >
                    <label style={{ margin: 0, fontWeight: 600 }}>
                      {t.anthropicApiKeyLabel}
                    </label>
                    {appSettings.data?.anthropic_api_key_configured ? (
                      <span className="pill supported" style={{ fontSize: "0.8rem" }}>
                        ✓ {t.keyConfiguredBadge}: {appSettings.data.anthropic_api_key_preview}
                      </span>
                    ) : (
                      <span className="pill not_evidenced" style={{ fontSize: "0.8rem" }}>
                        {t.keyNotConfiguredBadge}
                      </span>
                    )}
                  </div>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <input
                      type={showAnthropicKey ? "text" : "password"}
                      placeholder={
                        appSettings.data?.anthropic_api_key_configured
                          ? "••••••••••••••••••••••••••••"
                          : "sk-ant-api03-..."
                      }
                      value={anthropicKeyInput}
                      onChange={(e) => setAnthropicKeyInput(e.target.value)}
                      style={{ paddingRight: 40 }}
                    />
                    <button
                      type="button"
                      aria-label="Toggle Anthropic key visibility"
                      onClick={() => setShowAnthropicKey(!showAnthropicKey)}
                      style={{
                        position: "absolute",
                        right: 8,
                        background: "none",
                        border: "none",
                        padding: 4,
                        cursor: "pointer",
                      }}
                    >
                      {showAnthropicKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 8,
                      marginTop: 6,
                    }}
                  >
                    <a
                      href="https://console.anthropic.com/settings/keys"
                      target="_blank"
                      rel="noreferrer"
                      className="quiet"
                      style={{ fontSize: "0.85rem", textDecoration: "underline" }}
                    >
                      {t.getAnthropicKeyLink}
                    </a>
                    <button
                      type="button"
                      disabled={testStatus.testing || (!anthropicKeyInput && !appSettings.data?.anthropic_api_key_configured)}
                      onClick={() => handleTestConnection("anthropic")}
                      style={{ padding: "6px 12px", fontSize: "0.85rem" }}
                    >
                      {testStatus.testing ? t.testingConnection : `${t.testConnection} (Anthropic)`}
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: 18 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 6,
                    }}
                  >
                    <label style={{ margin: 0, fontWeight: 600 }}>
                      {t.openaiApiKeyLabel}
                    </label>
                    {appSettings.data?.openai_api_key_configured ? (
                      <span className="pill supported" style={{ fontSize: "0.8rem" }}>
                        ✓ {t.keyConfiguredBadge}: {appSettings.data.openai_api_key_preview}
                      </span>
                    ) : (
                      <span className="pill not_evidenced" style={{ fontSize: "0.8rem" }}>
                        {t.keyNotConfiguredBadge}
                      </span>
                    )}
                  </div>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <input
                      type={showOpenaiKey ? "text" : "password"}
                      placeholder={
                        appSettings.data?.openai_api_key_configured
                          ? "••••••••••••••••••••••••••••"
                          : "sk-proj-..."
                      }
                      value={openaiKeyInput}
                      onChange={(e) => setOpenaiKeyInput(e.target.value)}
                      style={{ paddingRight: 40 }}
                    />
                    <button
                      type="button"
                      aria-label="Toggle OpenAI key visibility"
                      onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                      style={{
                        position: "absolute",
                        right: 8,
                        background: "none",
                        border: "none",
                        padding: 4,
                        cursor: "pointer",
                      }}
                    >
                      {showOpenaiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 8,
                      marginTop: 6,
                    }}
                  >
                    <a
                      href="https://platform.openai.com/api-keys"
                      target="_blank"
                      rel="noreferrer"
                      className="quiet"
                      style={{ fontSize: "0.85rem", textDecoration: "underline" }}
                    >
                      {t.getOpenaiKeyLink}
                    </a>
                    <button
                      type="button"
                      disabled={testStatus.testing || (!openaiKeyInput && !appSettings.data?.openai_api_key_configured)}
                      onClick={() => handleTestConnection("openai")}
                      style={{ padding: "6px 12px", fontSize: "0.85rem" }}
                    >
                      {testStatus.testing ? t.testingConnection : `${t.testConnection} (OpenAI)`}
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid #e2e8f0" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 6,
                    }}
                  >
                    <label style={{ margin: 0, fontWeight: 600 }}>
                      {t.githubTokenLabel}
                    </label>
                    {appSettings.data?.github_token_configured ? (
                      <span className="pill supported" style={{ fontSize: "0.8rem" }}>
                        ✓ {t.keyConfiguredBadge}: {appSettings.data.github_token_preview}
                      </span>
                    ) : (
                      <span className="pill" style={{ fontSize: "0.8rem" }}>
                        {t.keyNotConfiguredBadge}
                      </span>
                    )}
                  </div>
                  <p className="quiet" style={{ margin: "4px 0 8px", fontSize: "0.85rem" }}>
                    {t.githubTokenDesc}
                  </p>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <input
                      type={showGithubToken ? "text" : "password"}
                      placeholder={
                        appSettings.data?.github_token_configured
                          ? "••••••••••••••••••••••••••••"
                          : "ghp_..."
                      }
                      value={githubTokenInput}
                      onChange={(e) => setGithubTokenInput(e.target.value)}
                      style={{ paddingRight: 40 }}
                    />
                    <button
                      type="button"
                      aria-label="Toggle GitHub token visibility"
                      onClick={() => setShowGithubToken(!showGithubToken)}
                      style={{
                        position: "absolute",
                        right: 8,
                        background: "none",
                        border: "none",
                        padding: 4,
                        cursor: "pointer",
                      }}
                    >
                      {showGithubToken ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 8,
                      marginTop: 6,
                    }}
                  >
                    <a
                      href="https://github.com/settings/tokens"
                      target="_blank"
                      rel="noreferrer"
                      className="quiet"
                      style={{ fontSize: "0.85rem", textDecoration: "underline" }}
                    >
                      {t.getGithubTokenLink}
                    </a>
                    <button
                      type="button"
                      disabled={testStatus.testing || (!githubTokenInput && !appSettings.data?.github_token_configured)}
                      onClick={() => handleTestConnection("github")}
                      style={{ padding: "6px 12px", fontSize: "0.85rem" }}
                    >
                      {testStatus.testing ? t.testingConnection : `${t.testConnection} (GitHub)`}
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "12px", marginTop: "24px", alignItems: "center", flexWrap: "wrap" }}>
                  <button type="submit" className="primary" disabled={busy}>
                    <Check size={16} />
                    {t.saveSettings}
                  </button>
                  <button
                    type="button"
                    onClick={handleClearKeys}
                    disabled={
                      busy ||
                      (!appSettings.data?.gemini_api_key_configured &&
                        !appSettings.data?.anthropic_api_key_configured &&
                        !appSettings.data?.openai_api_key_configured &&
                        !appSettings.data?.github_token_configured)
                    }
                  >
                    {t.clearKeys}
                  </button>
                </div>
              </form>

              <div className="notice" style={{ marginTop: 24 }}>
                <p>{t.securityNote}</p>
              </div>
            </>
          )}
          {page === "report" && report.data && (
            <>
              <div className="report-heading">
                <div>
                  <div className="eyebrow">
                    {report.data.mode === "demo"
                      ? t.fixtureDemo
                      : t.evidenceReport}
                  </div>
                  <h1>{report.data.title}</h1>
                  <p>
                    {new Date(report.data.created_at).toLocaleDateString()} ·{" "}
                    {report.data.requirements.filter((r) => r.selected).length}{" "}
                    {t.ofRequirements} {report.data.requirements.length}{" "}
                    {t.requirementLabel.toLowerCase()}s ·{" "}
                    {report.data.snapshots.length} {t.projectsCount}
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
                <button
                  type="button"
                  role="tab"
                  aria-selected={reportTab === "cover_letter"}
                  className={`tab-button ${reportTab === "cover_letter" ? "active" : ""}`}
                  onClick={() => setReportTab("cover_letter")}
                >
                  <Mail size={16} />
                  {t.tabCoverLetter}
                </button>
              </div>
              {report.data.status !== "complete" ? (
                <div role="alert" className="notice">
                  {t.analysisPartialNotice}
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
                        {statusLabels[c.status] || c.status}
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
                      {t.statusLabel}
                      <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                      >
                        <option value="all">{t.allConclusions}</option>
                        {Object.entries(statusLabels).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      {t.priorityLabel}
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                      >
                        <option value="all">{t.allPriorities}</option>
                        <option value="required">{t.priorityRequired}</option>
                        <option value="preferred">{t.priorityPreferred}</option>
                        <option value="unspecified">{t.priorityUnspecified}</option>
                      </select>
                    </label>
                    <label>
                      {t.categoryLabel}
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                      >
                        <option value="all">{t.allCategories}</option>
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
                      {t.projectLabel}
                      <select
                        value={projectFilter}
                        onChange={(e) => setProjectFilter(e.target.value)}
                      >
                        <option value="all">{t.allProjects}</option>
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
                    {t.requirementsAndEvidence}{" "}
                    <span className="muted">{visible.length}</span>
                  </h2>
                  {visible.map((a) => (
                    <AssessmentCard
                      key={a.id}
                      snapshotIds={report.data!.snapshots.map((s) => s.id)}
                      a={a}
                      t={t}
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
                      {t.noMatchingConclusions}
                    </div>
                  )}
                  <section className="card preparation">
                    <div className="eyebrow">{t.takeItIntoInterview}</div>
                    <h2>{t.interviewPrepTitle}</h2>
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
                        <h3>
                          {key === "technical_points"
                            ? t.technicalPoints
                            : key === "decisions"
                              ? t.decisionsTradeoffs
                              : key === "honest_limitations"
                                ? t.honestLimitations
                                : t.personalPrompts}
                        </h3>
                        <ul>
                          {report.data?.preparation?.[key].map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </section>
                  <section className="card">
                    <h2>{t.nextSteps}</h2>
                    <p className="quiet">
                      {t.nextStepsDesc}
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
                          {t.expected} {r.observable_result} {r.effort_estimate}
                        </small>
                      </div>
                    ))}
                  </section>
                  <details className="card">
                    <summary>{t.reportProvenance}</summary>
                    <p>
                      Model: {report.data.model} · pipeline{" "}
                      {report.data.pipeline_version} · requirements v
                      {report.data.requirements_version}
                    </p>
                    <p>
                      {report.data.usage?.calls || 0} {t.logicalCalls} ·{" "}
                      {report.data.usage?.input_tokens || 0} {t.inputTokens} ·{" "}
                      {report.data.usage?.output_tokens || 0} {t.outputTokens}
                    </p>
                    {report.data.snapshots.map((s) => (
                      <p key={s.id}>{t.commitLabel} {s.sha}</p>
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
                              {statusLabels[a.status] || a.status}
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
              ) : reportTab === "cover_letter" ? (
                <>
                  <div className="section-title">
                    <div>
                      <h2>{t.coverLetterTitle}</h2>
                      <p className="intro">{t.coverLetterDesc}</p>
                    </div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <label style={{ margin: 0, display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", fontWeight: 600 }}>
                        {t.toneLabel}:
                        <select
                          aria-label={t.toneLabel}
                          value={coverLetterTone}
                          onChange={(e) => setCoverLetterTone(e.target.value as "balanced" | "technical" | "concise")}
                          style={{ width: "auto", padding: "4px 8px", fontSize: "0.85rem" }}
                        >
                          <option value="balanced">{t.toneBalanced}</option>
                          <option value="technical">{t.toneTechnical}</option>
                          <option value="concise">{t.toneConcise}</option>
                        </select>
                      </label>
                      <button
                        className="primary"
                        disabled={generatingCoverLetter}
                        onClick={() => handleGenerateCoverLetter(coverLetterTone)}
                      >
                        <Sparkles size={16} />
                        {generatingCoverLetter
                          ? t.generatingCoverLetter
                          : currentCoverLetter
                            ? t.regenerateCoverLetter
                            : t.generateCoverLetter}
                      </button>
                      {currentCoverLetter && (
                        <>
                          <button
                            type="button"
                            onClick={handleCopyCoverLetter}
                            title={t.copyCoverLetter}
                          >
                            {copiedCoverLetter ? <Check size={16} /> : <Copy size={16} />}
                            {copiedCoverLetter ? t.copiedCoverLetter : t.copyCoverLetter}
                          </button>
                          <button
                            type="button"
                            onClick={handleDownloadCoverLetter}
                            title={t.downloadCoverLetter}
                          >
                            <Download size={16} />
                            {t.downloadCoverLetter}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {!currentCoverLetter && !generatingCoverLetter && (
                    <div className="card start" style={{ textAlign: "center", padding: "48px 24px" }}>
                      <span className="icon-box" style={{ margin: "0 auto 16px" }}>
                        <Mail size={32} />
                      </span>
                      <h2>{t.coverLetterTitle}</h2>
                      <p style={{ maxWidth: 540, margin: "0 auto 20px" }}>{t.coverLetterDesc}</p>
                      <button
                        className="primary"
                        onClick={() => handleGenerateCoverLetter(coverLetterTone)}
                        style={{ margin: "0 auto" }}
                      >
                        <Sparkles size={16} />
                        {t.generateCoverLetter}
                      </button>
                    </div>
                  )}

                  {generatingCoverLetter && (
                    <div className="card" style={{ textAlign: "center", padding: 40 }}>
                      <p className="intro">{t.generatingCoverLetter}</p>
                    </div>
                  )}

                  {currentCoverLetter && (
                    <div className="card cover-letter-card">
                      <div className="cover-letter-header">
                        <span className="eyebrow">SUBJECT</span>
                        <h3 style={{ margin: "4px 0 12px", fontSize: "1.1rem" }}>{currentCoverLetter.subject}</h3>
                      </div>

                      {currentCoverLetter.key_evidence_highlighted && currentCoverLetter.key_evidence_highlighted.length > 0 && (
                        <div className="cover-letter-evidence" style={{ marginBottom: 18 }}>
                          <span className="quiet" style={{ fontSize: "0.8rem", display: "block", marginBottom: 6 }}>
                            {t.evidenceHighlighted}
                          </span>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {currentCoverLetter.key_evidence_highlighted.map((ev, i) => (
                              <span key={i} className="pill supported" style={{ fontSize: "0.78rem" }}>
                                ✓ {ev}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="cover-letter-body" style={{ whiteSpace: "pre-line", lineHeight: 1.7, fontSize: "0.95rem" }}>
                        {currentCoverLetter.body}
                      </div>

                      <div className="notice" style={{ marginTop: 24, marginBottom: 0 }}>
                        <p>💡 {t.coverLetterHonestyNotice}</p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="section-title">
                    <div>
                      <h2>{t.interviewSimTitle}</h2>
                      <p className="intro">{t.interviewSimDesc}</p>
                    </div>
                    <div className="sub-mode-toggle" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className={`tab-button ${interviewSubMode === "chat" ? "active" : ""}`}
                        onClick={() => setInterviewSubMode("chat")}
                        style={{ padding: "6px 12px", fontSize: "0.85rem" }}
                      >
                        <MessageSquare size={15} />
                        {t.interviewModeChat}
                      </button>
                      <button
                        type="button"
                        className={`tab-button ${interviewSubMode === "cards" ? "active" : ""}`}
                        onClick={() => setInterviewSubMode("cards")}
                        style={{ padding: "6px 12px", fontSize: "0.85rem" }}
                      >
                        <Play size={15} />
                        {t.interviewModeCards}
                      </button>
                      {interviewSubMode === "chat" && interviewChatMessages.length > 0 && (
                        <button
                          type="button"
                          onClick={handleResetInterviewChat}
                          title={t.resetInterview}
                          style={{ padding: "6px 10px", fontSize: "0.85rem" }}
                        >
                          <RotateCcw size={15} />
                          {t.resetInterview}
                        </button>
                      )}
                    </div>
                  </div>

                  {interviewSubMode === "chat" ? (
                    <div className="interview-chat-container">
                      {interviewChatMessages.length === 0 ? (
                        <div className="card start" style={{ textAlign: "center", padding: "40px 20px" }}>
                          <span className="icon-box" style={{ margin: "0 auto 16px" }}>
                            <Bot size={32} />
                          </span>
                          <h2>{t.interviewModeChat}</h2>
                          <p style={{ maxWidth: 520, margin: "0 auto 20px" }}>{t.interviewChatIntro}</p>
                          <button
                            className="primary"
                            onClick={handleStartInterviewChat}
                            disabled={interviewChatBusy}
                            style={{ margin: "0 auto" }}
                          >
                            <Play size={16} />
                            {interviewChatBusy ? t.interviewThinking : t.startInterviewChat}
                          </button>
                        </div>
                      ) : (
                        <div className="chat-thread">
                          {interviewChatMessages.map((msg) => (
                            <div key={msg.id} className={`chat-message ${msg.role}`}>
                              <div className="chat-avatar">
                                {msg.role === "interviewer" ? <Bot size={18} /> : <User size={18} />}
                              </div>
                              <div className="chat-bubble-wrap">
                                <div className="chat-author">
                                  {msg.role === "interviewer" ? t.interviewerRole : t.candidateRole}
                                </div>
                                <div className="chat-bubble">
                                  {msg.content}
                                </div>
                                {msg.feedback && (
                                  <div className="chat-feedback">
                                    <span className="chat-feedback-pill">💡 {t.feedbackFromInterviewer}</span>
                                    <p>{msg.feedback}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}

                          {interviewChatBusy && (
                            <div className="chat-message interviewer">
                              <div className="chat-avatar">
                                <Bot size={18} />
                              </div>
                              <div className="chat-bubble-wrap">
                                <div className="chat-author">{t.interviewerRole}</div>
                                <div className="chat-bubble thinking">
                                  {t.interviewThinking}
                                </div>
                              </div>
                            </div>
                          )}

                          {interviewCompleted && (
                            <div className="interview-completed-banner">
                              ✓ {t.interviewCompletedBadge}
                            </div>
                          )}

                          {!interviewCompleted && (
                            <form
                              className="chat-input-form"
                              onSubmit={(e) => {
                                e.preventDefault();
                                handleSendCandidateAnswer();
                              }}
                            >
                              <textarea
                                rows={3}
                                placeholder={t.candidateInputPlaceholder}
                                value={interviewChatInput}
                                onChange={(e) => setInterviewChatInput(e.target.value)}
                                disabled={interviewChatBusy}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendCandidateAnswer();
                                  }
                                }}
                              />
                              <div className="chat-input-actions">
                                <button
                                  type="submit"
                                  className="primary"
                                  disabled={interviewChatBusy || !interviewChatInput.trim()}
                                >
                                  <Send size={15} />
                                  {t.sendAnswer}
                                </button>
                              </div>
                            </form>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      {(() => {
                        const questions =
                          report.data.preparation?.questions || [];
                        if (!questions.length) {
                          return (
                            <div className="card">
                              {t.noInterviewQuestions}
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

                                <h3>{t.decisionsTradeoffs}</h3>
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
            </>
          )}
        </main>
        <footer>
          {t.footerDisclaimer}
        </footer>
      </div>
      {evidence && (
        <EvidencePanel e={evidence} close={() => setEvidence(null)} t={t} />
      )}
    </div>
  );
}
function HistoryList({
  rows,
  open,
  t,
}: {
  rows: Analysis[];
  open: (id: string) => void;
  t: Translations;
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
                {a.mode === "demo" ? t.fixtureDemo : t.evidenceReport}
              </small>
            </span>
            <span className="pill">{a.status}</span>
            <ChevronRight size={18} />
          </button>
        ))
      ) : (
        <div className="empty">
          <FileText size={26} />
          <strong>{t.emptyHistoryTitle}</strong>
          <p>{t.emptyHistoryDesc}</p>
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
  t,
}: {
  snapshotIds: string[];
  a: Assessment;
  evidence: (e: Evidence) => void;
  review: (s: Status, r: string, remove: string[], add: string[]) => void;
  busy: boolean;
  t: Translations;
}) {
  const [editing, setEditing] = useState(false);
  const statusLabels = getStatusLabels(t);
  const priorityLabels: Record<string, string> = {
    required: t.priorityRequired,
    preferred: t.priorityPreferred,
    unspecified: t.priorityUnspecified,
  };
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
          {statusLabels[a.status] || a.status}
        </span>
        <span className="muted">
          {priorityLabels[a.requirement.priority] || a.requirement.priority} ·{" "}
          {a.requirement.category}
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
              {t.lines} {e.start}–{e.end} · {e.type} · {t.citationVerified}
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
          {a.invalid_citations.length} {t.invalidCitationsRejected}
        </p>
      )}
      {a.reviews.length > 0 && (
        <p className="reviewed">
          {t.humanReviewed}{" "}
          {statusLabels[a.original.status] || a.original.status}
        </p>
      )}
      <details onToggle={(e) => setEditing(e.currentTarget.open)}>
        <summary>{t.reviewConclusion}</summary>
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
            {t.effectiveConclusion}
            <select name="status" defaultValue={a.status}>
              {Object.entries(statusLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t.reasonLabel}
            <textarea
              name="reason"
              placeholder={t.reasonPlaceholder}
              required
              minLength={3}
              rows={2}
            />
          </label>
          {a.evidence.map((e) => (
            <label key={e.chunk_id} className="check">
              <input type="checkbox" name="remove" value={e.chunk_id} />
              {t.removeEvidence} {e.path}
            </label>
          ))}
          <label>
            {t.addEvidenceFromSnapshot}
            <select name="add">
              <option value="">{t.noAdditionalEvidence}</option>
              {sources.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.path} · {t.lines} {c.start}–{c.end}
                </option>
              ))}
            </select>
          </label>
          <button disabled={busy}>{t.saveReview}</button>
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
function EvidencePanel({
  e,
  close,
  t,
}: {
  e: Evidence;
  close: () => void;
  t: Translations;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog ref={ref} onCancel={close} className="evidence-panel">
      <div className="section-title">
        <span className="eyebrow">{t.sourceEvidence}</span>
        <button aria-label={t.closeEvidence} onClick={close}>
          <X size={18} />
        </button>
      </div>
      <h2>{e.path}</h2>
      <p>
        {t.lines} {e.start}–{e.end} · {e.type}
      </p>
      <span className="status supported">✓ {t.exactCitationVerified}</span>
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
        {t.codeVerificationNotice}
      </p>
      {e.url ? (
        <a href={e.url} target="_blank" rel="noreferrer" className="button">
          {t.openGithubCommit} <ExternalLink size={15} />
        </a>
      ) : (
        <span className="pill">{t.localFixtureNoGithub}</span>
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

function SnapshotFiles({ id, t }: { id: string; t: Translations }) {
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
        {open ? t.hideFilesInventory : t.showFilesInventory}
      </button>
      {open && (
        <ul>
          {query.data?.files.map((f) => (
            <li key={f.id}>
              {f.path} · {f.line_count} {t.lines} · {f.type}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
