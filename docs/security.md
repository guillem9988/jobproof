# Security and data handling

This is a single-user local app, bound to 127.0.0.1. It is not a secure public multi-user deployment. Public hosting would need authentication, authorization on every resource, tenant isolation, per-user rate/cost limits, CSRF/session design, audit controls and operational monitoring. The only supported way to publish it is the read-mostly **hosted mode** described below.

Keys are server environment variables loaded from `jobproof/.env`; that file is ignored. The browser receives only a configured/not-configured flag and model identifier. SQLite and exports can contain private user-entered job or review text: store them as personal documents. Exports include cited snippets, not full source files or provider keys. Do not put credentials in free-text fields.

GitHub import accepts only canonical HTTPS owner/repository forms. It constructs API requests on `api.github.com`, encodes references, rejects redirects and verifies public repository metadata even with an optional server token. It excludes common credential paths, `.env`, key files, binary/generated/dependency content, symlinks and submodules. File counts, per-file bytes and total text are capped. Rate-limit/forbidden responses expose retry headers when available. Nothing downloaded is executed, installed or treated as a command.

Before persistence and provider submission, obvious API tokens, assignment-style secrets and private-key blocks are redacted. Newlines are preserved so source line references stay aligned. This is not a complete secret detector and may over-redact ordinary data. It does not make an arbitrary repository safe to transmit. Imported text is UTF-8 only.

Prompt-injection defense combines restricted source acquisition, no model tools, narrow schemas, per-requirement retrieved context, server-side IDs and quote checks, conservative states and adversarial tests. A README instruction is always document data. Valid but irrelevant citations remain possible: these defenses do not guarantee semantic correctness.

The real provider receives redacted posting text for extraction, requirement text and selected excerpts for assessment, and validated assessment summaries for interview preparation. GitHub receives metadata/tree/blob requests. The demo makes neither kind of external request. SDK retries can send the same content more than once. Cancellation cannot retract data already transmitted.

React renders strings as text and never uses arbitrary README HTML or `dangerouslySetInnerHTML`. External evidence links are built by the server. CORS is limited to the local frontend, and write requests reject foreign browser Origin headers. No provider response may execute code, navigate, send messages or modify local files. API errors and worker failures avoid stack traces and raw SDK payloads.

Tests cover hostile URLs, sensitive exclusions, unknown redirects, injection fixtures, malicious job HTML, changed quotes, foreign snapshot evidence and redaction. They are not a penetration test or an audit.

Outbound payloads are sanitized as structured string values before JSON escaping. This handles multiline secret blocks without corrupting JSON and preserves character positions needed by posting citations. The original posting remains local; redaction is still pattern-based and not a guarantee that all sensitive information has been detected. Regression tests inspect the actual official SDK request using an in-memory transport.

## Hosted mode (public demo)

`HOSTED_MODE=true` exists because the default mode trusts its user: anyone who can reach the API could read the server's filesystem (`local_path` imports), make the server request arbitrary URLs, spend the server's AI quota, and overwrite the keys stored for everyone. Hosted mode removes those capabilities instead of adding accounts:

- **Blocked at the API (403, `hosted_mode`)**: project creation and imports, job posting creation, URL fetching, requirement extraction, human reviews, task cancellation, and settings read-write/test. The check is in middleware, so it applies whatever the frontend does.
- **No real providers**: `provider()` always returns the demo provider and real-mode analyses are rejected. Keys in the environment or database are ignored, `GET /settings` reports nothing configured, and `/health` reports `model: demo`.
- **Fixture data only**: lists and lookups hide records that are not fixtures, so data created before hosted mode was enabled is not exposed. Use a fresh database anyway.
- **No shared-state mutation**: `PUT /requirements` is a no-op, the demo analysis is deduplicated per fixture input, and cover letters and interview chats are returned but not saved.
- **Rate limiting**: write requests are limited per client address (the last `X-Forwarded-For` hop, which our own proxy added; earlier hops can be spoofed). The limiter is in memory, so it assumes one instance.
- **URL fetching guard**: independently of the mode, `/job-postings/fetch-url` now rejects non-public hosts (loopback, private, link-local, metadata addresses), re-checks every redirect hop, and caps the response at 2 MB. It resolves the host before connecting, so a DNS-rebinding race is still theoretically possible; the endpoint is disabled entirely in hosted mode.
- **CORS**: set `ALLOWED_ORIGINS` to the frontend origin. With `*` the app logs a warning at startup, because the Origin check on writes is then disabled.

Hosted mode is a demo hardening, not multi-user support. It has not been penetration tested.

## Browser hardening and dependencies

- **Security headers** are sent by the API (including the static frontend it serves and every error or blocked response) and by Vercel (`frontend/vercel.json`; a test keeps the two lists identical): a Content-Security-Policy with `script-src 'self'` and no inline scripts, `frame-ancestors 'none'`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy` and HSTS. API responses are `Cache-Control: no-store`.
- The build never inlines assets as `data:` URIs (`assetsInlineLimit: 0`), which is what lets the policy keep `font-src 'self'`. The full demo flow was exercised in a browser against the policy with zero violations.
- In hosted mode the interactive API docs (`/docs`, `/redoc`, `/openapi.json`) are disabled.
- Dependabot opens weekly update PRs, and CI audits production dependencies on every push and weekly (`pnpm audit --prod`, `pip-audit`).

