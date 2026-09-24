# Architecture

## Boundaries

`app/ingestion.py` owns GitHub URL validation, known-domain API requests, commit resolution, exclusion rules, redaction and chunk construction. `retrieval.py` owns lexical search and deterministic citation checks. `providers.py` owns the protocol, deterministic fixture provider and official Anthropic adapter. `main.py` orchestrates versioned operations and exports; React only edits, polls and presents server results.

The local deployment is one FastAPI process and one Vite frontend. SQLite persistence is managed through SQLAlchemy; Alembic revision `001` creates an indexed records table. Each record has an immutable ID, a kind and a JSON aggregate. Projects, snapshots, source files, chunks, jobs, tasks, analyses and assessments are separately addressable. Requirements are versioned inside jobs and copied into each analysis. Evidence, original model results and append-only review decisions live in assessment aggregates. Recommendations are embedded in the analysis's preparation result. This sacrifices relational constraints for a compact MVP; API logic and regression tests enforce links. Do not scale this directly to multiple processes/users.

## Imports and search

Imports resolve branch/ref to a concrete 40-character SHA, then use tree/blob APIs. They never clone or execute code. Unknown redirects, private repositories and non-200 responses fail. Tree truncation and excluded files make the snapshot partial. A failed/cancelled import remains incomplete and cannot be selected. Reimport creates a new snapshot, leaving previous files and links intact.

Newlines normalize CRLF/CR to LF. Redaction precedes storage and hashing and preserves newline counts, including removed private-key blocks. Chunks use 40-line windows with 8-line overlap. File hashes refer to normalized, redacted content; they are not Git object hashes. Sources are categorized as implementation, test intent, documentation declaration or configuration. No execution-result source is inferred from ordinary tests.

BM25 uses `k1=1.5`, `b=0.75`, and positive IDF `log(1 + (N-df+0.5)/(df+0.5))`. Tokenization is Unicode word matching over path and text. The positive variant avoids zero scores in tiny two-document corpora. An explicit small alias dictionary expands technical words and some Catalan/Spanish terms. Only positively matching chunks enter top-5. This is understandable, cheap and directly testable. It can miss semantic paraphrases; the evaluation exposes that. No vectors or embedding services are used.

## Citation contract

A model may emit only chunk ID, exact quote and relation. The validator checks membership in the actual sent set and selected snapshots, normalizes newlines, requires an exact substring, and calculates line offsets itself. It constructs the GitHub link from stored owner/repository, commit SHA and quoted path. The model never controls filenames, URLs or line numbers. Invalid citations are recorded separately and excluded from effective evidence. `supported` or `partial` without a valid citation becomes `not_evidenced`. External-verifiability requirements cannot be supported by the automatic validator.

Text identity is not entailment: a model can cite irrelevant real text. This remains a model-evaluation and human-review concern, not something a substring test solves. Source panels communicate that distinction.

## Provider bounds and traceability

The provider protocol has extraction, assessment and preparation operations. The Anthropic adapter uses Pydantic structured parsing, checks stop reason and parsed output, has a timeout and bounded SDK retries, and supplies no tools. The default is one call per selected requirement plus one preparation call; extraction is its own task. Call budgets count logical SDK calls; network retry attempts can increase actual requests by up to `1 + MAX_RETRIES` per logical call. Context limits count excerpt characters, not tokenizer tokens. Model output tokens are bounded per call.

Reports store model, pipeline/prompt versions, selected snapshots, requirement version, limits and returned token usage. No pricing is inferred. On failures, partial assessments remain inspectable by API but cannot be exported as a completed report. Usage for a failed in-flight call may be unavailable.

## Task behavior

Tasks persist before entering a thread executor (default two workers; queue capped at eight). The single-process lock makes concurrent duplicate analysis submissions with the same request ID share one task. A new request ID is an explicit new attempt; old reports are never automatically reused after requirements or sources change. Use a unique ID for each operation intent. Requirements use an optimistic version check to reject stale edits.

The browser persists the active task ID; polling resumes after reload. On startup, queued/running tasks become interrupted and unfinished imports become incomplete. There is no automatic retry after restart. Cancellation is checked before each new stage and between imported files. An in-flight HTTP call may complete and be charged; subsequent stages stop. Run only one server process for these guarantees.

## API

Routes are under `/api/v1`, with `/health` alias and generated `/docs`. Resource responses use `{id, data}` envelopes; structured operation inputs, requirements, provider outputs and health have Pydantic schemas. `data` intentionally remains an aggregate dictionary in OpenAPI rather than a fully expanded entity schema. Long operations return a task envelope. Resource validation returns a safe 400, stale requirement edits 409, framework input validation 422, and disallowed browser origins 403. Task failures have `{code,message}` and never include stack traces.

## Official references consulted

- [Anthropic structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs): Python `messages.parse` and Pydantic output parsing.
- [Anthropic model overview](https://platform.claude.com/docs/en/models/overview): configurable model identifiers.
- [GitHub trees](https://docs.github.com/en/rest/git/trees) and [blobs](https://docs.github.com/en/rest/git/blobs): immutable source traversal and truncation.

Checked during implementation on 2026-09-24. The installed SDK is locked; model availability is external and can change.

## Reliability update — pipeline 1.1

Provider inputs are redacted recursively before JSON serialization. Outbound posting redaction preserves character offsets and individual newline positions, so requirements after an obscured secret can still cite the original canonical posting. Tests use the installed official SDK with an in-memory HTTP transport; they check real request serialization and response parsing, but do not establish live model quality.

Task start and terminal transitions share the cancellation lock. Analysis status is persisted before a task announces completion, so a polling client never opens an unfinished report after a completed task. Queue capacity is checked before creating the analysis aggregate, avoiding orphan queued analyses. Completed extraction tasks return their posting ID and the browser resumes that posting after reload.
