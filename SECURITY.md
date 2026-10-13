# Security policy

## Reporting a vulnerability

Please report security problems privately through GitHub: **Security → Report a vulnerability** on this repository. Do not open a public issue for a vulnerability. You can expect an acknowledgement within a few days.

## What is in scope

JobProof is a single-user tool that you run yourself. Do not expose it to the internet; if you must, the only supported way is **hosted mode** (`HOSTED_MODE=true`), a read-mostly public demo. See [`docs/security.md`](docs/security.md) for exactly what it blocks and what it does not guarantee.

In scope:

- hosted mode bypasses (reaching the filesystem, making the server fetch internal URLs, using or changing server credentials, reading data that is not demo data)
- credential leakage (API keys or tokens appearing in responses, logs, exports or the repository)
- injection or script execution through job postings, repositories or model output

Out of scope: running the default (local) mode on a public host without hosted mode, and findings that need local access to the machine running JobProof.

## Secrets

API keys are never committed. Locally they live in `.env` or in the local SQLite database and are never sent to the browser (only a masked preview). A public deployment must not hold real provider keys; hosted mode ignores them.

## Dependencies

Dependabot proposes updates weekly and CI audits production dependencies (`pnpm audit --prod`, `pip-audit`).
