# Evaluation

## Dataset and partitions

`evaluation/cases.json` contains 32 manually authored synthetic cases. Each contains a requirement, complete available source strings, relevant file labels, expected state and an explicit rationale. Because these are tiny sources they fit in one chunk; a relevant file identifies the relevant chunk. Cases include concrete implementations, unused dependencies, unsupported documentation, partial container configuration, professional experience, communication, language and prompt injection.

- 8 development cases underpin the demonstration.
- 16 validation cases were inspected while improving retrieval. They are **not** an untouched test set.
- 8 final holdout cases were authored after retrieval adjustments and frozen before the final run. They deliberately vary implementation signatures and runtime technologies. No changes were made to fit their results.

The cases were authored by the implementing assistant, not independently adjudicated by multiple human experts. Review the labels before making research claims. Synthetic fixtures and a tiny sample cannot estimate general-world reliability. A future benchmark should add independently labeled real repositories and multilingual postings.

## Actual executed results

All results below use the deterministic provider. They validate pipeline behavior, not Anthropic model quality. Machine-readable per-case results, timings and confusion matrices are in `evaluation/results-demo-*.json`.

| Partition | Cases | Relevant source retrieved @5 | Valid / emitted citations | False supported |
|---|---:|---:|---:|---:|
| Development | 8 | 5/5 eligible | 6/6 | 0 |
| Validation | 16 | 5/5 eligible | 5/5 | 0 |
| Final holdout | 8 | 5/6 eligible | 1/1 | 0 |
| All (descriptive only) | 32 | 15/16 eligible | 12/12 | 0 |

Final holdout confusion matrix; rows are expected, columns predicted:

| Expected → predicted | supported | partial | not_evidenced | not_verifiable |
|---|---:|---:|---:|---:|
| supported | 1 | 0 | 3 | 0 |
| partial | 0 | 0 | 2 | 0 |
| not_evidenced | 0 | 0 | 1 | 0 |
| not_verifiable | 0 | 0 | 0 | 1 |

The deterministic rules are intentionally specific to demo fixtures: they fail on a valid different React component, a Node Dockerfile, actual PostgreSQL use and a Java alternative. These misses are retained. The validation set also includes an overgenerous partial classification of a documentation-only security claim. Quote validity does not establish semantic relevance.

The final holdout ran in about 0.024 seconds and all 32 in about 0.093 seconds in this environment; these timings cover fixture retrieval/assessment/validation and persistence, not an external model. Zero external calls and zero tokens were used. Per-case timings are recorded. They are not representative LLM latency numbers.

## Metric definitions

- Citation validity: validated exact citations / all emitted citations. When none are emitted, report 0/0, not 100%.
- Retrieval hit@5: cases where at least one labeled relevant chunk appears among the first five / cases with at least one relevant source label. Negative/external cases are excluded from this denominator explicitly.
- Confusion matrix: expected versus effective post-validation state.
- False supported: count of predicted supported when the expected state is different. A conservative model can have zero false supported and still miss many real examples.
- Time: wall-clock seconds measured locally. Returned provider usage includes logical calls, input and output tokens when available. SDK retries can increase network attempts.

## Reproduce

From `backend/`, after installing dependencies:

```sh
../.venv/bin/python ../evaluation/run.py --provider demo --split dev
../.venv/bin/python ../evaluation/run.py --provider demo --split validation
../.venv/bin/python ../evaluation/run.py --provider demo --split holdout
../.venv/bin/python ../evaluation/run.py --provider demo --split all
```

With a server `ANTHROPIC_API_KEY`, explicitly opt into paid external evaluation:

```sh
../.venv/bin/python ../evaluation/run.py --provider real --split holdout
```

The runner uses isolated temporary SQLite storage and writes a separate results file for each provider/split. Real-provider evaluation is **pending**: no real LLM metrics, costs, or success claims have been fabricated. Multilingual extraction has a production prompt and schema but still needs real-provider evaluation. No changes should be tuned against the final holdout without relabeling it as development and creating a new reserve.
