import { useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, FileText } from "lucide-react";
import { many } from "../api";
import { useApp } from "../app-context";
import { getStatusLabels } from "../i18n";
import type { Assessment, Evidence, Status } from "../types";

const STATUS_ICON: Record<string, string> = {
  supported: "✓",
  partial: "◐",
  not_evidenced: "−",
};

export function AssessmentCard({
  a,
  evidence,
  review,
  snapshotIds,
  open,
  onToggle,
}: {
  snapshotIds: string[];
  a: Assessment;
  evidence: (e: Evidence) => void;
  review: (s: Status, r: string, remove: string[], add: string[]) => void;
  open: boolean;
  onToggle: () => void;
}) {
  const { t, busy } = useApp();
  const bodyId = useId();
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
    <section className={`card assessment${open ? " open" : ""}`}>
      <div className="section-title">
        <span className={"status " + a.status}>
          {STATUS_ICON[a.status] ?? "◇"} {statusLabels[a.status] || a.status}
        </span>
        <span className="muted">
          {priorityLabels[a.requirement.priority] || a.requirement.priority} ·{" "}
          {a.requirement.category}
        </span>
      </div>
      <h3>{a.requirement.text}</h3>
      <p>{a.explanation}</p>
      <button
        type="button"
        className="assessment-toggle"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={onToggle}
      >
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        {open ? t.hideDetails : t.showDetails}
        <span className="assessment-meta">
          {a.evidence.length > 0 && (
            <span className="pill">
              {a.evidence.length} {t.sourcesCount}
            </span>
          )}
          {a.reviews.length > 0 && <span className="pill reviewed-pill">{t.humanReviewed.split("·")[0].trim()}</span>}
        </span>
      </button>
      <div id={bodyId} hidden={!open}>
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
            {t.humanReviewed} {statusLabels[a.original.status] || a.original.status}
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
      </div>
    </section>
  );
}
