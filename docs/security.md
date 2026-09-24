# Security and data handling

This is a single-user local app, bound to 127.0.0.1. It is not a secure public multi-user deployment. Public hosting would need authentication, authorization on every resource, tenant isolation, per-user rate/cost limits, CSRF/session design, audit controls and operational monitoring.

Keys are server environment variables loaded from `jobproof/.env`; that file is ignored. The browser receives only a configured/not-configured flag and model identifier. SQLite and exports can contain private user-entered job or review text: store them as personal documents. Exports include cited snippets, not full source files or provider keys. Do not put credentials in free-text fields.

GitHub import accepts only canonical HTTPS owner/repository forms. It constructs API requests on `api.github.com`, encodes references, rejects redirects and verifies public repository metadata even with an optional server token. It excludes common credential paths, `.env`, key files, binary/generated/dependency content, symlinks and submodules. File counts, per-file bytes and total text are capped. Rate-limit/forbidden responses expose retry headers when available. Nothing downloaded is executed, installed or treated as a command.

Before persistence and provider submission, obvious API tokens, assignment-style secrets and private-key blocks are redacted. Newlines are preserved so source line references stay aligned. This is not a complete secret detector and may over-redact ordinary data. It does not make an arbitrary repository safe to transmit. Imported text is UTF-8 only.

Prompt-injection defense combines restricted source acquisition, no model tools, narrow schemas, per-requirement retrieved context, server-side IDs and quote checks, conservative states and adversarial tests. A README instruction is always document data. Valid but irrelevant citations remain possible: these defenses do not guarantee semantic correctness.

The real provider receives redacted posting text for extraction, requirement text and selected excerpts for assessment, and validated assessment summaries for interview preparation. GitHub receives metadata/tree/blob requests. The demo makes neither kind of external request. SDK retries can send the same content more than once. Cancellation cannot retract data already transmitted.

React renders strings as text and never uses arbitrary README HTML or `dangerouslySetInnerHTML`. External evidence links are built by the server. CORS is limited to the local frontend, and write requests reject foreign browser Origin headers. No provider response may execute code, navigate, send messages or modify local files. API errors and worker failures avoid stack traces and raw SDK payloads.

Tests cover hostile URLs, sensitive exclusions, unknown redirects, injection fixtures, malicious job HTML, changed quotes, foreign snapshot evidence and redaction. They are not a penetration test or an audit.

Outbound payloads are sanitized as structured string values before JSON escaping. This handles multiline secret blocks without corrupting JSON and preserves character positions needed by posting citations. The original posting remains local; redaction is still pattern-based and not a guarantee that all sensitive information has been detected. Regression tests inspect the actual official SDK request using an in-memory transport.
