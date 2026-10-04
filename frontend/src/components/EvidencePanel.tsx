import { useEffect, useRef } from "react";
import { ExternalLink, X } from "lucide-react";
import { useApp } from "../app-context";
import type { Evidence } from "../types";

export function EvidencePanel({ e, close }: { e: Evidence; close: () => void }) {
  const { t } = useApp();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={close}
      onClick={(ev) => {
        // a click on the backdrop targets the dialog element itself
        if (ev.target === ev.currentTarget) close();
      }}
      className="evidence-panel"
      aria-label={`${t.sourceEvidence}: ${e.path}`}
    >
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
              i + e.source_start >= e.start && i + e.source_start <= e.end ? "highlight" : ""
            }
          >
            <span>{i + e.source_start}</span>
            <code>{line || " "}</code>
          </div>
        ))}
      </div>
      <p className="quiet">{t.codeVerificationNotice}</p>
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
