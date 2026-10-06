/**
 * Identity and AI key of the visitor on a public deployment.
 *
 * The workspace token is a random string that only this browser knows; the server keeps just its hash. The AI key
 * lives in sessionStorage (it disappears when the tab closes) and is sent only with the few requests that call a
 * model. Neither is ever put in a URL or written to localStorage next to the key.
 */
import { useSyncExternalStore } from "react";

export type AiProvider = "gemini" | "anthropic" | "openai";
export interface AiSettings {
  provider: AiProvider;
  model: string;
  key: string;
}

const WORKSPACE_KEY = "jobproof-workspace";
const AI_PREFS_KEY = "jobproof-ai";
const AI_KEY_KEY = "jobproof-ai-key";

const memory = new Map<string, string>();

function read(store: "local" | "session", name: string): string {
  try {
    const value = (store === "local" ? localStorage : sessionStorage).getItem(name);
    if (value !== null) return value;
  } catch {
    // storage blocked: fall through to memory
  }
  return memory.get(`${store}:${name}`) ?? "";
}

function write(store: "local" | "session", name: string, value: string) {
  memory.set(`${store}:${name}`, value);
  try {
    (store === "local" ? localStorage : sessionStorage).setItem(name, value);
  } catch {
    // storage blocked: the in-memory copy still works for this page load
  }
}

function remove(store: "local" | "session", name: string) {
  memory.delete(`${store}:${name}`);
  try {
    (store === "local" ? localStorage : sessionStorage).removeItem(name);
  } catch {
    // nothing to remove
  }
}

export function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function workspaceToken(): string {
  const saved = read("local", WORKSPACE_KEY);
  if (/^[A-Za-z0-9_-]{32,64}$/.test(saved)) return saved;
  const token = newToken();
  write("local", WORKSPACE_KEY, token);
  return token;
}

/** Forgets the workspace identity: the next request starts a brand-new, empty workspace. */
export function resetWorkspace() {
  remove("local", WORKSPACE_KEY);
}

// ---- AI settings store (so components re-render when the key is saved or forgotten)

const listeners = new Set<() => void>();
let snapshot: AiSettings | null | undefined;

function load(): AiSettings | null {
  const key = read("session", AI_KEY_KEY);
  if (!key) return null;
  try {
    const prefs = JSON.parse(read("local", AI_PREFS_KEY) || "{}") as Partial<AiSettings>;
    const provider: AiProvider = ["gemini", "anthropic", "openai"].includes(prefs.provider ?? "")
      ? (prefs.provider as AiProvider)
      : "gemini";
    return { provider, model: typeof prefs.model === "string" ? prefs.model : "", key };
  } catch {
    return { provider: "gemini", model: "", key };
  }
}

function emit() {
  snapshot = undefined;
  listeners.forEach((l) => l());
}

export function getAi(): AiSettings | null {
  if (snapshot === undefined) snapshot = load();
  return snapshot;
}

export function saveAi(settings: AiSettings) {
  write("local", AI_PREFS_KEY, JSON.stringify({ provider: settings.provider, model: settings.model }));
  write("session", AI_KEY_KEY, settings.key.trim());
  emit();
}

export function forgetAiKey() {
  remove("session", AI_KEY_KEY);
  emit();
}

export function useAi(): AiSettings | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getAi,
    getAi,
  );
}

/** Only the requests that actually call a model carry the key. */
const AI_ENDPOINTS: [string, RegExp][] = [
  ["POST", /^\/analyses$/],
  ["POST", /^\/analyses\/[^/]+\/cover-letter$/],
  ["POST", /^\/analyses\/[^/]+\/interview\/chat$/],
  ["POST", /^\/job-postings\/[^/]+\/extract-requirements$/],
];

export function usesAi(path: string, method: string, body?: unknown): boolean {
  // The fixture demo runs on the built-in simulator, so it never needs (or receives) the key.
  if ((body as { mode?: string } | undefined)?.mode === "demo") return false;
  const clean = path.split("?")[0];
  return AI_ENDPOINTS.some(([m, re]) => m === method && re.test(clean));
}

export function identityHeaders(
  path: string,
  method: string,
  body?: unknown,
  ai = getAi(),
): Record<string, string> {
  const headers: Record<string, string> = { "X-Workspace": workspaceToken() };
  if (ai && usesAi(path, method, body)) {
    headers["X-AI-Provider"] = ai.provider;
    headers["X-AI-Key"] = ai.key;
    if (ai.model) headers["X-AI-Model"] = ai.model;
  }
  return headers;
}
