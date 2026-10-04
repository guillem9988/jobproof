import { useApp } from "../../app-context";
import type { Analysis } from "../../types";

export function NextStepsTab({ report }: { report: Analysis }) {
  const { t } = useApp();
  const prep = report.preparation;
  const sections = [
    ["technical_points", t.technicalPoints],
    ["decisions", t.decisionsTradeoffs],
    ["honest_limitations", t.honestLimitations],
    ["personal_prompts", t.personalPrompts],
  ] as const;
  return (
    <>
      <section className="card preparation">
        <div className="eyebrow">{t.takeItIntoInterview}</div>
        <h2>{t.interviewPrepTitle}</h2>
        {prep?.questions.map((q, i) => (
          <p className="question" key={q}>
            <span>{String(i + 1).padStart(2, "0")}</span>
            {q}
          </p>
        ))}
        {sections.map(([key, title]) => (
          <div key={key}>
            <h3>{title}</h3>
            <ul>
              {prep?.[key].map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>
      <section className="card">
        <h2>{t.nextSteps}</h2>
        <p className="quiet">{t.nextStepsDesc}</p>
        {prep?.recommendations.map((r, i) => (
          <div className="recommendation" key={i}>
            <strong>
              {report.requirements.find((q) => q.id === r.requirement_id)?.text} ·{" "}
              {r.gap.replaceAll("_", " ")}
            </strong>
            <p>{r.action}</p>
            <small>
              {t.expected} {r.observable_result} {r.effort_estimate}
            </small>
          </div>
        ))}
      </section>
    </>
  );
}
