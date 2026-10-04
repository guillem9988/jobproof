import { ArrowRight, FileText, FolderGit2, Play } from "lucide-react";
import { useApp } from "../app-context";
import { HistoryList } from "../components/HistoryList";
import { HostedNotice } from "../components/HostedNotice";
import { useHealth, useHistory, useProjects } from "../hooks/queries";

const providerName = (p?: string) =>
  p ? (p === "gemini" ? "Gemini" : p === "openai" ? "OpenAI" : "Claude") : "IA";

export function HomePage({ onNewAnalysis }: { onNewAnalysis: () => void }) {
  const { t, busy, hosted, go, act, openReport, loadDemo, setupAndRun } = useApp();
  const health = useHealth();
  const projects = useProjects();
  const history = useHistory();
  const recent = history.data ?? [];
  return (
    <>
      <div className="eyebrow">{t.yourWorkYourEvidence}</div>
      <h1>{t.tagline}</h1>
      <p className="intro">{t.subtitle}</p>
      {hosted && <HostedNotice />}
      <div className="home-grid">
        {!hosted && (
          <section className="card start">
            <span className="icon-box">
              <FileText />
            </span>
            <h2>{t.homeCardStartTitle}</h2>
            <p>{t.homeCardStartDesc}</p>
            <button className="primary" onClick={onNewAnalysis}>
              {t.navNewAnalysis} <ArrowRight size={17} />
            </button>
            <div className="quiet card-note">
              {health.data?.real_provider_configured ? (
                <span className="inline-row">
                  <span className="pill supported pill-sm">
                    ✓ {providerName(health.data.active_provider)}
                  </span>
                  {t.aiConfigured} · {health.data.model}
                </span>
              ) : (
                <div className="inline-row between">
                  <span>{t.aiNotConfigured}</span>
                  <button type="button" className="link-button" onClick={() => go("settings")}>
                    {t.openSettingsButton} →
                  </button>
                </div>
              )}
            </div>
          </section>
        )}
        {!hosted && (
          <section className="card">
            <span className="icon-box">
              <FolderGit2 />
            </span>
            <h2>{t.homeCardProjectsTitle}</h2>
            <p>{t.homeCardProjectsDesc}</p>
            <button className="button" onClick={() => go("projects")}>
              {t.navProjects} <ArrowRight size={17} />
            </button>
            <div className="quiet card-note">
              <span>
                {projects.data?.length || 0} {t.projectsConfigured}
              </span>
            </div>
            <button
              data-testid="test-load-demo"
              className="test-hook"
              aria-hidden="true"
              tabIndex={-1}
              onClick={() => act(loadDemo)}
            />
          </section>
        )}
        {hosted && (
          <button
            data-testid="test-load-demo"
            className="test-hook"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => act(loadDemo)}
          />
        )}
        <section className="card highlight">
          <span className="icon-box accent">
            <Play size={20} fill="currentColor" />
          </span>
          <h2>{t.homeCardSetupRunTitle}</h2>
          <p>{t.homeCardSetupRunDesc}</p>
          <button className="primary" disabled={busy} onClick={setupAndRun}>
            <Play size={16} fill="currentColor" /> {t.buttonSetupAndRun}
          </button>
          <div className="quiet card-note">
            <span>{t.homeCardSetupRunNote}</span>
          </div>
        </section>
      </div>
      {recent.length > 0 && (
        <>
          <section className="section-title">
            <h2>{t.recentAnalyses}</h2>
            <button className="text-button" onClick={() => go("history")}>
              {t.viewHistory} <ArrowRight size={16} />
            </button>
          </section>
          <HistoryList rows={recent.slice(0, 4)} open={(id) => openReport(id)} />
        </>
      )}
      <div className="principles">
        <p>
          <strong>{t.principle1Title}</strong>
          {t.principle1Desc}
        </p>
        <p>
          <strong>{t.principle2Title}</strong>
          {t.principle2Desc}
        </p>
        <p>
          <strong>{t.principle3Title}</strong>
          {t.principle3Desc}
        </p>
      </div>
    </>
  );
}
