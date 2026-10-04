import { useEffect, useState } from "react";
import { Check, Copy, Download, Mail, Sparkles } from "lucide-react";
import { request } from "../../api";
import { useApp } from "../../app-context";
import { useCopy } from "../../hooks/useCopy";
import { qc } from "../../queryClient";
import type { Analysis, GeneratedCoverLetter } from "../../types";

type Tone = "balanced" | "technical" | "concise";

export function CoverLetterTab({ report }: { report: Analysis }) {
  const { t, lang, setError } = useApp();
  const [tone, setTone] = useState<Tone>("balanced");
  const [letter, setLetter] = useState<GeneratedCoverLetter | null>(report.cover_letter ?? null);
  const [generating, setGenerating] = useState(false);
  const { copied, copy } = useCopy();

  useEffect(() => {
    setLetter(report.cover_letter ?? null);
  }, [report.cover_letter]);

  async function generate() {
    setGenerating(true);
    try {
      setLetter(
        await request<GeneratedCoverLetter>(`/analyses/${report.id}/cover-letter`, {
          language: lang,
          tone,
        }),
      );
      await qc.invalidateQueries({ queryKey: ["report", report.id] });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerating(false);
    }
  }

  const fullText = letter ? `${letter.subject}\n\n${letter.body}` : "";
  function download() {
    const url = URL.createObjectURL(new Blob([fullText], { type: "text/markdown;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `cover-letter-${report.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="section-title">
        <div>
          <h2>{t.coverLetterTitle}</h2>
          <p className="intro">{t.coverLetterDesc}</p>
        </div>
        <div className="inline-row wrap">
          <label className="inline-label">
            {t.toneLabel}:
            <select
              aria-label={t.toneLabel}
              value={tone}
              onChange={(e) => setTone(e.target.value as Tone)}
              className="select-sm"
            >
              <option value="balanced">{t.toneBalanced}</option>
              <option value="technical">{t.toneTechnical}</option>
              <option value="concise">{t.toneConcise}</option>
            </select>
          </label>
          <button className="primary" disabled={generating} onClick={generate}>
            <Sparkles size={16} />
            {generating ? t.generatingCoverLetter : letter ? t.regenerateCoverLetter : t.generateCoverLetter}
          </button>
          {letter && (
            <>
              <button type="button" onClick={() => copy(fullText)} title={t.copyCoverLetter}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? t.copiedCoverLetter : t.copyCoverLetter}
              </button>
              <button type="button" onClick={download} title={t.downloadCoverLetter}>
                <Download size={16} />
                {t.downloadCoverLetter}
              </button>
            </>
          )}
        </div>
      </div>

      {!letter && !generating && (
        <div className="card start centered">
          <span className="icon-box">
            <Mail size={32} />
          </span>
          <h2>{t.coverLetterTitle}</h2>
          <p>{t.coverLetterDesc}</p>
          <button className="primary" onClick={generate}>
            <Sparkles size={16} />
            {t.generateCoverLetter}
          </button>
        </div>
      )}

      {generating && (
        <div className="card centered" role="status" aria-live="polite">
          <p className="intro">{t.generatingCoverLetter}</p>
        </div>
      )}

      {letter && (
        <div className="card cover-letter-card">
          <div className="cover-letter-header">
            <span className="eyebrow">SUBJECT</span>
            <h3>{letter.subject}</h3>
          </div>
          {letter.key_evidence_highlighted && letter.key_evidence_highlighted.length > 0 && (
            <div className="cover-letter-evidence">
              <span className="quiet">{t.evidenceHighlighted}</span>
              <div className="inline-row wrap">
                {letter.key_evidence_highlighted.map((ev, i) => (
                  <span key={i} className="pill supported pill-sm">
                    ✓ {ev}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="cover-letter-body">{letter.body}</div>
          <div className="notice">
            <p>💡 {t.coverLetterHonestyNotice}</p>
          </div>
        </div>
      )}
    </>
  );
}
