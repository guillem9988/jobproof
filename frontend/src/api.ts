import { identityHeaders } from "./ai";

export async function request<T>(
  path: string,
  body?: unknown,
  method = body ? "POST" : "GET",
): Promise<T> {
  const r = await fetch("/api/v1" + path, {
    method,
    headers: { "Content-Type": "application/json", ...identityHeaders(path, method, body) },
    body: body ? JSON.stringify(body) : undefined,
  });
  // A sleeping or restarting host answers with an HTML error page, not JSON.
  const data: unknown = await r.json().catch(() => null);
  if (data === null)
    throw new Error(
      `The server did not answer correctly (HTTP ${r.status}). Try again in a moment.`,
    );
  if (!r.ok) {
    const e = data as { error?: { message: string }; detail?: unknown };
    throw new Error(
      e.error?.message ||
        JSON.stringify(e.detail) ||
        "Request failed. Try again.",
    );
  }
  return data as T;
}
export async function one<T>(
  path: string,
  body?: unknown,
  method?: string,
): Promise<T> {
  const d = await request<{ id: string; data: object }>(path, body, method);
  return { id: d.id, ...d.data } as T;
}
export async function many<T>(path: string): Promise<T[]> {
  const d = await request<{ id: string; data: object }[]>(path);
  return d.map((x) => ({ id: x.id, ...x.data }) as T);
}
export const labels = {
  supported: "Supported",
  partial: "Partial",
  not_evidenced: "Not evidenced",
  not_verifiable_from_code: "Not verifiable",
};
export function counts(rows: { status: keyof typeof labels }[]) {
  return Object.keys(labels).map((s) => ({
    status: s as keyof typeof labels,
    count: rows.filter((r) => r.status === s).length,
  }));
}
