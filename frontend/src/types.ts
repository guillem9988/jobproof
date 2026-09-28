export type Status =
  | "supported"
  | "partial"
  | "not_evidenced"
  | "not_verifiable_from_code";
export type Requirement = {
  id: string;
  text: string;
  quote: string;
  offset: number | null;
  category: string;
  priority: "required" | "preferred" | "unspecified";
  verifiability: "code" | "limited" | "external";
  reviewed: boolean;
  provenance: "manual" | "extracted";
  selected: boolean;
};
export type Evidence = {
  chunk_id: string;
  quote: string;
  relation: string;
  path: string;
  start: number;
  end: number;
  type: string;
  snapshot_id: string;
  url: string | null;
  source_text: string;
  source_start: number;
};
export type Assessment = {
  id: string;
  requirement: Requirement;
  status: Status;
  explanation: string;
  limitations: string[];
  evidence: Evidence[];
  original: { status: Status };
  invalid_citations: unknown[];
  reviews: { reason: string; status: Status; created_at: string }[];
};
export type Snapshot = {
  id: string;
  project_id: string;
  sha: string;
  status: string;
  partial: boolean;
  file_count: number;
  bytes: number;
  discarded: { path: string; reason: string }[];
  demo: boolean;
  local?: boolean;
};
export type Project = {
  id: string;
  name: string;
  url: string;
  contribution: string;
  demo: boolean;
  local?: boolean;
  local_path?: string;
  excludes?: string;
};
export type Job = {
  id: string;
  title: string;
  company: string;
  canonical_text: string;
  requirements: Requirement[];
  requirements_version: number;
  demo: boolean;
};
export type Task = {
  type: "import" | "extraction" | "analysis";
  id: string;
  status: string;
  stage: string;
  analysis_id?: string;
  result?: string;
  error?: { message: string };
};
export type Analysis = {
  id: string;
  title: string;
  mode: string;
  status: string;
  created_at: string;
  model: string;
  requirements_version: number;
  pipeline_version: string;
  warnings: string[];
  snapshots: Snapshot[];
  requirements: Requirement[];
  usage?: { calls: number; input_tokens: number; output_tokens: number };
  preparation?: {
    questions: string[];
    technical_points: string[];
    decisions: string[];
    honest_limitations: string[];
    personal_prompts: string[];
    recommendations: {
      requirement_id: string;
      gap: string;
      action: string;
      observable_result: string;
      effort_estimate: string;
    }[];
  };
  cover_letter?: GeneratedCoverLetter;
  interview_chat?: ChatMessage[];
};

export type AppSettings = {
  llm_provider: "gemini" | "anthropic";
  llm_model: string;
  gemini_api_key_configured: boolean;
  gemini_api_key_preview: string;
  anthropic_api_key_configured: boolean;
  anthropic_api_key_preview: string;
  github_token_configured: boolean;
  github_token_preview: string;
  real_provider_configured: boolean;
  active_provider: string;
};

export type SettingsTestResult = {
  success: boolean;
  message: string;
  latency_ms: number;
};

export type GeneratedCoverLetter = {
  subject: string;
  body: string;
  key_evidence_highlighted: string[];
};

export type ChatMessage = {
  id: string;
  role: "interviewer" | "candidate";
  content: string;
  feedback?: string;
  created_at: string;
};

export type InterviewChatReply = {
  evaluation_feedback: string;
  interviewer_reply: string;
  is_wrap_up: boolean;
};

export type JobUrlFetchResponse = {
  title: string;
  company: string;
  text: string;
};

