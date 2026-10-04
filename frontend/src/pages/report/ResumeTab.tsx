import { Check, Copy } from "lucide-react";
import { useApp } from "../../app-context";
import { useCopy } from "../../hooks/useCopy";
import { getStatusLabels } from "../../i18n";
import type { Assessment, Evidence } from "../../types";

const bulletFor = (a: Assessment) => {
  const ev = a.evidence[0];
  const where = ev ? `${ev.path} (L${ev.start}-L${ev.end}) — ${ev.relation}` : "codebase";
  const note = a.limitations?.length ? ` Note: ${a.limitations[0]}` : "";
  return `• ${a.requirement.text}: Implemented in ${where}.${note}`;
};

function BulletCard({ a, onEvidence }: { a: Assessment; onEvidence: (e: Evidence) => void }) {
  const { t } = useApp();
  const { copied, copy } = useCopy();
  const statusLabels = getStatusLabels(t);
  const text = bulletFor(a);
  const ev = a.evidence[0];
  return (
    <div className={`bullet-card ${a.status}`}>
      <div className="bullet-header">
        <p className="bullet-text">{text}</p>
        <button
          className="button"
          title={t.copyBullet}
          aria-label={t.copyBullet}
          onClick={() => copy(text)}
        >
          {copied ? <Check size={15} /> : <Copy size={15} />}
        </button>
      </div>
      <div className="bullet-meta">
        <span className={`pill ${a.status}`}>{statusLabels[a.status] || a.status}</span>
        {ev && (
          <button className="link-button quiet" onClick={() => onEvidence(ev)}>
            {ev.path} (L{ev.start}-L{ev.end})
          </button>
        )}
      </div>
    </div>
  );
}

export function ResumeTab({
  assessments,
  onEvidence,
}: {
  assessments: Assessment[];
  onEvidence: (e: Evidence) => void;
}) {
  const { t } = useApp();
  const { copied, copy } = useCopy();
  const bullets = assessments.filter(
    (a) => ["supported", "partial"].includes(a.status) && a.evidence.length > 0,
  );
  return (
    <>
      <div className="section-title">
        <div>
          <h2>{t.resumeBulletsTitle}</h2>
          <p className="intro">{t.resumeBulletsDesc}</p>
        </div>
        {bullets.length > 0 && (
          <button className="primary" onClick={() => copy(bullets.map(bulletFor).join("\n"))}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? t.copiedAllBullets : t.copyAllBullets}
          </button>
        )}
      </div>
      {bullets.length ? (
        bullets.map((a) => <BulletCard key={a.id} a={a} onEvidence={onEvidence} />)
      ) : (
        <div className="card">{t.noEvidenceBullets}</div>
      )}
    </>
  );
}
