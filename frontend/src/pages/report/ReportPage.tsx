import { useEffect, useState } from "react";
import { Check, Copy, Download, FileText, ListChecks, Mail, Play } from "lucide-react";
import { useApp } from "../../app-context";
import { EmptyState } from "../../components/EmptyState";
import { EvidencePanel } from "../../components/EvidencePanel";
import { Skeleton } from "../../components/Skeleton";
import { Tabs, panelId, tabId, type TabItem } from "../../components/Tabs";
import { useAssessments, useReport } from "../../hooks/queries";
import { useCopy } from "../../hooks/useCopy";
import type { ReportTab } from "../../hooks/useRoute";
import type { Evidence } from "../../types";
import { CoverLetterTab } from "./CoverLetterTab";
import { EvidenceTab, defaultFilters } from "./EvidenceTab";
import { InterviewTab } from "./InterviewTab";
import { NextStepsTab } from "./NextStepsTab";
import { ResumeTab } from "./ResumeTab";

const PREFIX = "report";

export function ReportPage({
  reportId,
  tab,
  onTabChange,
}: {
  reportId: string;
  tab: ReportTab;
  onTabChange: (tab: ReportTab) => void;
}) {
  const { t, go } = useApp();
  const report = useReport(reportId);
  const assessments = useAssessments(reportId);
  const [filters, setFilters] = useState(defaultFilters);
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const { copied, copy } = useCopy();
  // The interview tab keeps drafts and a running timer, so once opened it stays mounted.
  const [interviewVisited, setInterviewVisited] = useState(tab === "interview");
  useEffect(() => {
    if (tab === "interview") setInterviewVisited(true);
  }, [tab]);

  if (report.isLoading) return <Skeleton label={t.loadingLabel} lines={5} />;
  if (!report.data) {
    return (
      <EmptyState
        icon={<FileText />}
        title={t.reportLoadError}
        description={t.emptyHistoryDesc}
        action={
          <button className="primary" onClick={() => go("history")}>
            {t.navHistory}
          </button>
        }
      />
    );
  }
  const r = report.data;
  const rows = assessments.data ?? [];
  const items: TabItem<ReportTab>[] = [
    { id: "evidence", label: t.tabEvidence, icon: <FileText size={16} /> },
    { id: "resume", label: t.tabResumeBullets, icon: <Check size={16} /> },
    { id: "next_steps", label: t.tabNextSteps, icon: <ListChecks size={16} /> },
    { id: "interview", label: t.tabInterviewMode, icon: <Play size={16} /> },
    { id: "cover_letter", label: t.tabCoverLetter, icon: <Mail size={16} /> },
  ];
  const exportUrl = (format: string) => `/api/v1/analyses/${reportId}/export?format=${format}`;
  const panel = (id: ReportTab, hidden: boolean, children: React.ReactNode) => (
    <div
      role="tabpanel"
      id={panelId(PREFIX, id)}
      aria-labelledby={tabId(PREFIX, id)}
      hidden={hidden}
    >
      {children}
    </div>
  );

  return (
    <>
      <div className="report-heading">
        <div>
          <div className="eyebrow">{r.mode === "demo" ? t.fixtureDemo : t.evidenceReport}</div>
          <h1>{r.title}</h1>
          <p>
            {new Date(r.created_at).toLocaleDateString()} ·{" "}
            {r.requirements.filter((q) => q.selected).length} {t.ofRequirements} {r.requirements.length}{" "}
            {t.requirementLabel.toLowerCase()}s · {r.snapshots.length} {t.projectsCount}
          </p>
        </div>
        <div className="exports">
          <button
            className="button"
            onClick={async () => {
              try {
                await copy(await (await fetch(exportUrl("markdown"))).text());
              } catch {
                // network failure: leave the button unchanged
              }
            }}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? t.copied : t.copyMarkdown}
          </button>
          {["markdown", "json"].map((f) => (
            <a className="button" key={f} href={exportUrl(f)}>
              <Download size={16} />
              {f === "markdown" ? "Markdown" : "JSON"}
            </a>
          ))}
        </div>
      </div>
      <Tabs items={items} value={tab} onChange={onTabChange} label={t.reportTabs} prefix={PREFIX} />
      {r.status !== "complete" ? (
        <div role="alert" className="notice">
          {t.analysisPartialNotice}
        </div>
      ) : (
        <>
          {tab === "evidence" &&
            panel(
              "evidence",
              false,
              <EvidenceTab
                report={r}
                assessments={rows}
                filters={filters}
                setFilters={setFilters}
                onEvidence={setEvidence}
              />,
            )}
          {tab === "resume" &&
            panel("resume", false, <ResumeTab assessments={rows} onEvidence={setEvidence} />)}
          {tab === "next_steps" && panel("next_steps", false, <NextStepsTab report={r} />)}
          {tab === "cover_letter" && panel("cover_letter", false, <CoverLetterTab report={r} />)}
          {interviewVisited && panel("interview", tab !== "interview", <InterviewTab report={r} />)}
        </>
      )}
      {evidence && <EvidencePanel e={evidence} close={() => setEvidence(null)} />}
    </>
  );
}
