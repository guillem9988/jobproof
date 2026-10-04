import { useState } from "react";
import { Folder, FolderGit2, Plus } from "lucide-react";
import { one } from "../api";
import { useApp } from "../app-context";
import { EmptyState } from "../components/EmptyState";
import { Skeleton } from "../components/Skeleton";
import { SnapshotFiles } from "../components/SnapshotFiles";
import { useAppSettings, useProjects, useSnapshots } from "../hooks/queries";
import type { Project, Task } from "../types";

export function ProjectsPage() {
  const { t, busy, act, track } = useApp();
  const [source, setSource] = useState<"github" | "local">("github");
  const projects = useProjects();
  const snapshots = useSnapshots();
  const appSettings = useAppSettings();

  const importFromForm = (form: HTMLFormElement) => {
    const f = new FormData(form);
    void act(async () => {
      const common = {
        name: f.get("name"),
        contribution: f.get("contribution"),
        excludes: f.get("excludes") || "",
      };
      const payload =
        source === "local"
          ? { local_path: f.get("local_path"), ...common }
          : { url: f.get("url"), ...common };
      const p = await one<Project>("/projects", payload);
      track(
        await one<Task>(`/projects/${p.id}/imports`, {
          ref: f.get("ref") || "",
          request_id: crypto.randomUUID(),
        }),
      );
    });
  };

  return (
    <>
      <div className="eyebrow">{t.projectsEyebrow}</div>
      <h1>{t.yourProjects}</h1>
      <p className="intro">{t.projectsIntro}</p>
      <form
        className="card form"
        onSubmit={(e) => {
          e.preventDefault();
          importFromForm(e.currentTarget);
        }}
      >
        <div className="source-toggle">
          <button
            type="button"
            aria-pressed={source === "github"}
            className={`source-option ${source === "github" ? "active" : ""}`}
            onClick={() => setSource("github")}
          >
            <FolderGit2 size={18} />
            {t.sourceTypeGithub}
          </button>
          <button
            type="button"
            aria-pressed={source === "local"}
            className={`source-option ${source === "local" ? "active" : ""}`}
            onClick={() => setSource("local")}
          >
            <Folder size={18} />
            {t.sourceTypeLocal}
          </button>
        </div>
        {source === "github" ? (
          <>
            <label>
              {t.sourceTypeGithub}
              <input name="url" placeholder={t.githubUrlPlaceholder} required />
            </label>
            {appSettings.data?.github_token_configured && (
              <div className="field-success">✓ {t.privateRepoTokenNotice}</div>
            )}
          </>
        ) : (
          <label>
            {t.localPathLabel}
            <input name="local_path" placeholder={t.localPathPlaceholder} required />
          </label>
        )}
        <div className="two">
          <label>
            {t.projectNameOptional}
            <input name="name" />
          </label>
          {source === "github" && (
            <label>
              {t.branchOrCommitOptional}
              <input name="ref" />
            </label>
          )}
        </div>
        <label>
          {t.customExcludesLabel}
          <input name="excludes" placeholder={t.customExcludesPlaceholder} />
        </label>
        <label>
          {t.yourContribution}
          <textarea name="contribution" rows={2} />
        </label>
        <button className="primary" disabled={busy}>
          {source === "local" ? t.importLocalDir : t.importRepository} <Plus size={17} />
        </button>
      </form>
      {projects.isLoading && <Skeleton label={t.loadingLabel} />}
      {projects.data?.length === 0 && (
        <EmptyState
          icon={<FolderGit2 />}
          title={t.emptyProjectsTitle}
          description={t.emptyProjectsDesc}
        />
      )}
      {projects.data?.map((p) => (
        <section className="card project" key={p.id}>
          <div className="section-title">
            <h2>{p.name}</h2>
            <span className="pill">
              {p.demo ? t.badgeFixture : p.local ? t.badgeLocalFolder : t.badgePublicRepo}
            </span>
          </div>
          <p>{p.contribution || t.personalContributionNotDeclared}</p>
          {snapshots.data
            ?.filter((s) => s.project_id === p.id)
            .map((s) => (
              <details key={s.id}>
                <summary>
                  {s.file_count} {t.files} · {s.status} ·{" "}
                  {s.partial ? t.partialImport : t.allEligibleImported} <code>{s.sha.slice(0, 12)}</code>
                </summary>
                <p>
                  {t.commitLabel}: {s.sha}
                </p>
                <p>
                  {s.bytes.toLocaleString()} {t.bytesImported} {s.discarded.length} {t.filesExcluded}
                </p>
                <ul>
                  {s.discarded.map((d) => (
                    <li key={d.path}>
                      {d.path}: {d.reason}
                    </li>
                  ))}
                </ul>
                <SnapshotFiles id={s.id} />
              </details>
            ))}
          {!p.demo && (
            <button
              disabled={busy}
              onClick={() =>
                act(async () =>
                  track(
                    await one<Task>(`/projects/${p.id}/imports`, {
                      request_id: crypto.randomUUID(),
                    }),
                  ),
                )
              }
            >
              {t.importNewSnapshot}
            </button>
          )}
        </section>
      ))}
    </>
  );
}
