import { Search } from "lucide-react";
import { useApp } from "../app-context";
import type { Task } from "../types";

export function ProgressPage({
  task,
  onCancel,
  onRetry,
}: {
  task?: Task;
  onCancel: () => void;
  onRetry: () => void;
}) {
  const { t } = useApp();
  const running = ["running", "queued"].includes(task?.status || "");
  return (
    <section className="card progress" aria-busy={running}>
      <span className="icon-box">
        <Search />
      </span>
      <h1>{task?.status === "running" ? t.progressBuildingReport : task?.status || t.progressPreparingTask}</h1>
      <p aria-live="polite">{task?.stage || t.waitingForTaskStatus}</p>
      <p>{t.progressNotice}</p>
      {running ? (
        <button onClick={onCancel}>{t.cancelTask}</button>
      ) : (
        <button onClick={onRetry}>{t.retryExplicitly}</button>
      )}
    </section>
  );
}
