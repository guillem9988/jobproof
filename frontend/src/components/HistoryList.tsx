import { ChevronRight, FileText } from "lucide-react";
import { useApp } from "../app-context";
import type { Analysis } from "../types";

export function HistoryList({ rows, open }: { rows: Analysis[]; open: (id: string) => void }) {
  const { t } = useApp();
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
