import { useMemo, useState } from "react";
import { ChevronsDownUp, ChevronsUpDown, X } from "lucide-react";
import { one, counts } from "../../api";
import { useApp } from "../../app-context";
import { AssessmentCard } from "../../components/AssessmentCard";
import { getStatusLabels } from "../../i18n";
import { useProjects } from "../../hooks/queries";
import { qc } from "../../queryClient";
import type { Analysis, Assessment, Evidence } from "../../types";

export interface Filters {
  status: string;
  priority: string;
  category: string;
  project: string;
  query: string;
}

export const defaultFilters: Filters = {
  status: "all",
  priority: "all",
  category: "all",
  project: "all",
  query: "",
};

export function filterAssessments(rows: Assessment[], f: Filters): Assessment[] {
  const q = f.query.trim().toLowerCase();
  return rows.filter(
    (a) =>
      (f.status === "all" || a.status === f.status) &&
      (f.priority === "all" || a.requirement.priority === f.priority) &&
      (f.category === "all" || a.requirement.category === f.category) &&
      (f.project === "all" || a.evidence.some((e) => e.snapshot_id === f.project)) &&
      (!q ||
        a.requirement.text.toLowerCase().includes(q) ||
        a.explanation.toLowerCase().includes(q) ||
        a.evidence.some(
          (e) => e.quote.toLowerCase().includes(q) || e.path.toLowerCase().includes(q),
        )),
  );
}

export function EvidenceTab({
  report,
  assessments,
  filters,
  setFilters,
  onEvidence,
}: {
  report: Analysis;
  assessments: Assessment[];
  filters: Filters;
  setFilters: (f: Filters) => void;
  onEvidence: (e: Evidence) => void;
}) {
  const { t, act } = useApp();
  const projects = useProjects();
  const statusLabels = getStatusLabels(t);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const visible = useMemo(() => filterAssessments(assessments, filters), [assessments, filters]);
  const categories = useMemo(
    () => [...new Set(assessments.map((a) => a.requirement.category))],
    [assessments],
  );
  const filtered = JSON.stringify(filters) !== JSON.stringify(defaultFilters);
  const allOpen = visible.length > 0 && visible.every((a) => expanded.has(a.id));
  const patch = (change: Partial<Filters>) => setFilters({ ...filters, ...change });
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  return (
    <>
      <div className="counts">
        {counts(assessments).map((c) => (
          <button
            key={c.status}
            className={"count " + c.status + (filters.status === c.status ? " active-filter" : "")}
            aria-pressed={filters.status === c.status}
            onClick={() => patch({ status: filters.status === c.status ? "all" : c.status })}
            title={filters.status === c.status ? t.filterActiveHint : t.filterClickHint}
          >
            <span>{c.count}</span>
            {statusLabels[c.status] || c.status}
          </button>
        ))}
      </div>
      {report.warnings.length > 0 && (
        <div className="notice">
          {report.warnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
        </div>
      )}
      <div className="filters report-toolbar">
        <label className="filters-search">
          {t.searchFilter}
          <input
            type="search"
            placeholder={t.searchPlaceholder}
            value={filters.query}
            onChange={(e) => patch({ query: e.target.value })}
          />
        </label>
        <label>
          {t.statusLabel}
          <select value={filters.status} onChange={(e) => patch({ status: e.target.value })}>
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
          <select value={filters.priority} onChange={(e) => patch({ priority: e.target.value })}>
            <option value="all">{t.allPriorities}</option>
            <option value="required">{t.priorityRequired}</option>
            <option value="preferred">{t.priorityPreferred}</option>
            <option value="unspecified">{t.priorityUnspecified}</option>
          </select>
        </label>
        <label>
          {t.categoryLabel}
          <select value={filters.category} onChange={(e) => patch({ category: e.target.value })}>
            <option value="all">{t.allCategories}</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          {t.projectLabel}
          <select value={filters.project} onChange={(e) => patch({ project: e.target.value })}>
            <option value="all">{t.allProjects}</option>
            {report.snapshots.map((s) => (
              <option key={s.id} value={s.id}>
                {projects.data?.find((p) => p.id === s.project_id)?.name || s.sha.slice(0, 8)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="results-head">
        <h2>
          {t.requirementsAndEvidence} <span className="muted">{visible.length}</span>
        </h2>
        <div className="inline-row wrap">
          {filtered && (
            <button type="button" className="text-button button-sm" onClick={() => setFilters(defaultFilters)}>
              <X size={14} />
              {t.resetFilters}
            </button>
          )}
          {visible.length > 0 && (
            <button
              type="button"
              className="text-button button-sm"
              onClick={() => setExpanded(allOpen ? new Set() : new Set(visible.map((a) => a.id)))}
            >
              {allOpen ? <ChevronsDownUp size={14} /> : <ChevronsUpDown size={14} />}
              {allOpen ? t.collapseAll : t.expandAll}
            </button>
          )}
        </div>
      </div>
      {visible.map((a) => (
        <AssessmentCard
          key={a.id}
          snapshotIds={report.snapshots.map((s) => s.id)}
          a={a}
          open={expanded.has(a.id)}
          onToggle={() => toggle(a.id)}
          evidence={onEvidence}
          review={(status, reason, remove, add) =>
            act(async () => {
              await one(`/assessments/${a.id}/reviews`, {
                status,
                reason,
                remove_chunk_ids: remove,
                add_chunk_ids: add,
              });
              await qc.invalidateQueries({ queryKey: ["assessments", report.id] });
            })
          }
        />
      ))}
      {!visible.length && <div className="card">{t.noMatchingConclusions}</div>}
      <details className="card">
        <summary>{t.reportProvenance}</summary>
        <p>
          Model: {report.model} · pipeline {report.pipeline_version} · requirements v
          {report.requirements_version}
        </p>
        <p>
          {report.usage?.calls || 0} {t.logicalCalls} · {report.usage?.input_tokens || 0}{" "}
          {t.inputTokens} · {report.usage?.output_tokens || 0} {t.outputTokens}
        </p>
        {report.snapshots.map((s) => (
          <p key={s.id}>
            {t.commitLabel} {s.sha}
          </p>
        ))}
      </details>
    </>
  );
}
