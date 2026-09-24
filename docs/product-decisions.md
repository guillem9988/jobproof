# Product decisions

The target user is a recent computer-science graduate preparing applications across technology, product, AI and data. The central need is to distinguish a defensible example from an unsupported claim. The main report pairs each requirement with its source instead of collapsing everything into a score.

The MVP deliberately uses text postings, public repositories and a local single-user database. CV parsing, private OAuth, job-site scraping, automatic applications, email, collaboration and payments are excluded. Three projects and fifteen selected requirements keep the review burden and external model context small. Partial scope remains visible; dropping difficult requirements cannot produce a claim that the entire posting is covered.

Four states separate supported, partial, not evidenced and not verifiable. Failure, invalid citation, partial import and human review are separate dimensions. No result implies hiring probability, verified authorship, successful execution or professional tenure. A Dockerfile can support container configuration but cannot establish a production deployment.

A deterministic demo makes the whole workflow available without accounts. It is explicitly narrow and does not pretend to assess arbitrary wording. The real provider is a separate integration and fails clearly when its key is missing.

Human reviews preserve the original conclusion and require a reason. They can add/remove evidence only from selected immutable snapshots. Suggestions are not silently regenerated when a person changes a conclusion; they are labeled as generated from the original report.

The visual direction is an evidence workspace: restrained blue/slate palette, clear text states, readable code panel and a compact four-state summary. Native labels, buttons, checkboxes, selects, details and modal dialog provide keyboard behavior without a large component library. Desktop and 390px mobile flows are exercised; formal assistive-technology testing remains pending. UI strings are English. The copy layer is a starting point for localization; full internationalization is not claimed.

Hypotheses to validate with real users:

- Can a graduate locate the source behind a conclusion without help?
- Do users understand that missing evidence does not imply missing competence?
- Which automatic conclusions do users correct, and why?
- Do source-backed interview prompts produce more accurate explanations of personal contribution?
- How often do file caps, lexical retrieval or multilingual phrasing hide relevant evidence?

Measure task completion, time to inspect a citation, correction reasons, misunderstanding rates and whether users can explain limitations. Do not optimize for a higher supported count or an artificial hiring score.
