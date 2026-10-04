import { useEffect, useRef, useState } from "react";
import { Bot, MessageSquare, Pause, Play, RotateCcw, Send, ShieldCheck, User } from "lucide-react";
import { request } from "../../api";
import { useApp } from "../../app-context";
import { qc } from "../../queryClient";
import type { Analysis, ChatMessage, InterviewChatReply } from "../../types";

const isWrapUp = (msgs: ChatMessage[]) => {
  const last = msgs[msgs.length - 1];
  if (!last || last.role !== "interviewer") return false;
  const c = last.content.toLowerCase();
  return c.includes("conclu") || c.includes("complet");
};

function ChatMode({ report }: { report: Analysis }) {
  const { t, lang, setError } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>(report.interview_chat ?? []);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState(() => isWrapUp(report.interview_chat ?? []));
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const server = report.interview_chat ?? [];
    setMessages(server);
    setCompleted(isWrapUp(server));
  }, [report.interview_chat]);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  }, [messages.length, busy]);

  const fail = (err: unknown) => setError(err instanceof Error ? err.message : String(err));
  const newId = (offset = 0) => "msg-" + (Date.now() + offset);

  async function start() {
    setBusy(true);
    try {
      const res = await request<InterviewChatReply>(`/analyses/${report.id}/interview/chat`, {
        messages: [],
        language: lang,
      });
      setMessages([
        {
          id: newId(),
          role: "interviewer",
          content: res.interviewer_reply,
          feedback: res.evaluation_feedback,
          created_at: new Date().toISOString(),
        },
      ]);
      if (res.is_wrap_up) setCompleted(true);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    const answer = input.trim();
    if (!answer || busy) return;
    setInput("");
    const candidate: ChatMessage = {
      id: newId(),
      role: "candidate",
      content: answer,
      created_at: new Date().toISOString(),
    };
    const updated = [...messages, candidate];
    setMessages(updated);
    setBusy(true);
    try {
      const res = await request<InterviewChatReply>(`/analyses/${report.id}/interview/chat`, {
        messages: updated,
        language: lang,
      });
      const withFeedback = res.evaluation_feedback
        ? updated.map((m) => (m.id === candidate.id ? { ...m, feedback: res.evaluation_feedback } : m))
        : updated;
      setMessages([
        ...withFeedback,
        {
          id: newId(1),
          role: "interviewer",
          content: res.interviewer_reply,
          feedback: "",
          created_at: new Date().toISOString(),
        },
      ]);
      if (res.is_wrap_up) setCompleted(true);
      await qc.invalidateQueries({ queryKey: ["report", report.id] });
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    try {
      await request(`/analyses/${report.id}/interview/reset`, {});
      setMessages([]);
      setCompleted(false);
      await qc.invalidateQueries({ queryKey: ["report", report.id] });
    } catch (err) {
      fail(err);
    }
  }

  return (
    <>
      {messages.length > 0 && (
        <div className="chat-toolbar">
          <button type="button" onClick={reset} title={t.resetInterview} className="button-sm">
            <RotateCcw size={15} />
            {t.resetInterview}
          </button>
        </div>
      )}
      <div className="interview-chat-container">
        {messages.length === 0 ? (
          <div className="card start centered">
            <span className="icon-box">
              <Bot size={32} />
            </span>
            <h2>{t.interviewModeChat}</h2>
            <p>{t.interviewChatIntro}</p>
            <button className="primary" onClick={start} disabled={busy}>
              <Play size={16} />
              {busy ? t.interviewThinking : t.startInterviewChat}
            </button>
          </div>
        ) : (
          <div className="chat-thread" role="log" aria-live="polite" aria-label={t.interviewModeChat}>
            {messages.map((msg) => (
              <div key={msg.id} className={`chat-message ${msg.role}`}>
                <div className="chat-avatar">
                  {msg.role === "interviewer" ? <Bot size={18} /> : <User size={18} />}
                </div>
                <div className="chat-bubble-wrap">
                  <div className="chat-author">
                    {msg.role === "interviewer" ? t.interviewerRole : t.candidateRole}
                  </div>
                  <div className="chat-bubble">{msg.content}</div>
                  {msg.feedback && (
                    <div className="chat-feedback">
                      <span className="chat-feedback-pill">💡 {t.feedbackFromInterviewer}</span>
                      <p>{msg.feedback}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div className="chat-message interviewer">
                <div className="chat-avatar">
                  <Bot size={18} />
                </div>
                <div className="chat-bubble-wrap">
                  <div className="chat-author">{t.interviewerRole}</div>
                  <div className="chat-bubble thinking">{t.interviewThinking}</div>
                </div>
              </div>
            )}
            {completed && <div className="interview-completed-banner">✓ {t.interviewCompletedBadge}</div>}
            {!completed && (
              <form
                className="chat-input-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void send();
                }}
              >
                <textarea
                  rows={3}
                  aria-label={t.candidateRole}
                  placeholder={t.candidateInputPlaceholder}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={busy}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                />
                <div className="chat-input-actions">
                  <button type="submit" className="primary" disabled={busy || !input.trim()}>
                    <Send size={15} />
                    {t.sendAnswer}
                  </button>
                </div>
              </form>
            )}
            <div ref={endRef} />
          </div>
        )}
      </div>
    </>
  );
}

function CardsMode({ report }: { report: Analysis }) {
  const { t } = useApp();
  const questions = report.preparation?.questions || [];
  const [index, setIndex] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  if (!questions.length) return <div className="card">{t.noInterviewQuestions}</div>;

  const q = Math.min(index, questions.length - 1);
  const isRevealed = !!revealed[q];
  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");
  const move = (to: number) => {
    setIndex(to);
    setSeconds(0);
    setRunning(false);
  };
  const prep = report.preparation;

  return (
    <div className="interview-card">
      <div className="eyebrow">
        {t.questionOf} {q + 1} / {questions.length}
      </div>
      <h2 className="interview-question">{questions[q]}</h2>

      <div className="timer-box">
        <div className="timer-display" role="timer" aria-label={`${mins}:${secs}`}>
          ⏱️ {mins}:{secs}
        </div>
        <div className="timer-controls">
          <button type="button" className={running ? "" : "primary"} onClick={() => setRunning(!running)}>
            {running ? <Pause size={16} /> : <Play size={16} />}
            {running ? t.timerPause : t.timerStart}
          </button>
          <button
            type="button"
            onClick={() => {
              setRunning(false);
              setSeconds(0);
            }}
          >
            <RotateCcw size={16} />
            {t.timerReset}
          </button>
        </div>
      </div>

      <label className="draft-label">
        {t.draftYourAnswer}
        <textarea
          rows={4}
          placeholder={t.draftPlaceholder}
          value={notes[q] || ""}
          onChange={(e) => setNotes((prev) => ({ ...prev, [q]: e.target.value }))}
        />
      </label>

      <div className="reveal-row">
        <button
          type="button"
          className="button"
          aria-expanded={isRevealed}
          onClick={() => setRevealed((prev) => ({ ...prev, [q]: !prev[q] }))}
        >
          <ShieldCheck size={16} />
          {isRevealed ? t.hideAnswer : t.revealAnswer}
        </button>
      </div>

      {isRevealed && (
        <div className="reveal-panel">
          <h3>{t.technicalPoints}</h3>
          <ul>{prep?.technical_points.map((pt) => <li key={pt}>{pt}</li>)}</ul>
          <h3>{t.decisionsTradeoffs}</h3>
          <ul>{prep?.decisions.map((d) => <li key={d}>{d}</li>)}</ul>
          <h3>{t.honestLimitations}</h3>
          <ul>{prep?.honest_limitations.map((l) => <li key={l}>{l}</li>)}</ul>
        </div>
      )}

      <div className="interview-nav">
        <button type="button" disabled={q === 0} onClick={() => move(Math.max(0, q - 1))}>
          ← {t.prevQuestion}
        </button>
        <span>
          {q + 1} / {questions.length}
        </span>
        <button
          type="button"
          disabled={q >= questions.length - 1}
          onClick={() => move(Math.min(questions.length - 1, q + 1))}
        >
          {t.nextQuestion} →
        </button>
      </div>
    </div>
  );
}

export function InterviewTab({ report }: { report: Analysis }) {
  const { t } = useApp();
  const [mode, setMode] = useState<"chat" | "cards">("chat");
  return (
    <>
      <div className="section-title">
        <div>
          <h2>{t.interviewSimTitle}</h2>
          <p className="intro">{t.interviewSimDesc}</p>
        </div>
        <div className="inline-row wrap">
          <button
            type="button"
            aria-pressed={mode === "chat"}
            className={`tab-button button-sm ${mode === "chat" ? "active" : ""}`}
            onClick={() => setMode("chat")}
          >
            <MessageSquare size={15} />
            {t.interviewModeChat}
          </button>
          <button
            type="button"
            aria-pressed={mode === "cards"}
            className={`tab-button button-sm ${mode === "cards" ? "active" : ""}`}
            onClick={() => setMode("cards")}
          >
            <Play size={15} />
            {t.interviewModeCards}
          </button>
        </div>
      </div>
      {mode === "chat" ? <ChatMode report={report} /> : <CardsMode report={report} />}
    </>
  );
}
