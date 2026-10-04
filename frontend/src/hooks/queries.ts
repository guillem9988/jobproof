import { useQuery } from "@tanstack/react-query";
import { many, one, request } from "../api";
import type { Analysis, AppSettings, Assessment, Job, Project, Snapshot, Task } from "../types";

export const useHealth = () =>
  useQuery({
    queryKey: ["health"],
    queryFn: () =>
      request<{
        real_provider_configured: boolean;
        model: string;
        active_provider?: string;
        hosted?: boolean;
      }>(
        "/health",
      ),
  });

export const useProjects = () =>
  useQuery({ queryKey: ["projects"], queryFn: () => many<Project>("/projects") });

export const useHistory = () =>
  useQuery({ queryKey: ["history"], queryFn: () => many<Analysis>("/analyses") });

export const useJobs = () =>
  useQuery({ queryKey: ["jobs"], queryFn: () => many<Job>("/job-postings") });

export const useSnapshots = () =>
  useQuery({ queryKey: ["snapshots"], queryFn: () => many<Snapshot>("/snapshots") });

export const useAppSettings = () =>
  useQuery({ queryKey: ["appSettings"], queryFn: () => one<AppSettings>("/settings") });

export const useReport = (id: string) =>
  useQuery({
    queryKey: ["report", id],
    queryFn: () => one<Analysis>("/analyses/" + id),
    enabled: !!id,
  });

export const useAssessments = (id: string) =>
  useQuery({
    queryKey: ["assessments", id],
    queryFn: () => many<Assessment>(`/analyses/${id}/assessments`),
    enabled: !!id,
  });

/** Polls an in-flight task, backing off from 600 ms to 3 s the longer it runs. */
export const useTask = (id: string) =>
  useQuery({
    queryKey: ["task", id],
    queryFn: () => one<Task>("/tasks/" + id),
    enabled: !!id,
    refetchInterval: (q) => {
      if (!["queued", "running"].includes(q.state.data?.status || "queued")) return false;
      const polls = q.state.dataUpdateCount;
      return polls < 10 ? 600 : polls < 30 ? 1500 : 3000;
    },
  });
