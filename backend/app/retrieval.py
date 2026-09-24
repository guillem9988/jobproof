import math
import re
from collections import Counter

from .core import all_records, normalize
from .ingestion import stable_url

ALIASES = {
    "python": ["py"],
    "react": ["tsx", "jsx"],
    "tests": ["test", "pytest", "assert"],
    "testing": ["test", "pytest", "assert"],
    "proves": ["test", "pytest", "assert"],
    "pruebas": ["test", "pytest", "assert"],
    "api": ["fastapi", "endpoint", "route"],
    "database": ["sql", "sqlite", "postgresql"],
    "seguretat": ["security", "authorization"],
    "security": ["authorization", "owner_id", "encryption", "secure"],
    "deployment": ["docker", "dockerfile", "deploy"],
    "desplegament": ["docker", "deploy"],
}


def tokens(text):
    return re.findall(r"[\w]+", text.lower())


def retrieve(requirement, snapshots, k=5):
    chunks = [c for c in all_records("chunk") if c["snapshot_id"] in snapshots]
    if not chunks:
        return []
    query = tokens(requirement)
    expanded = query + [a for t in query for a in ALIASES.get(t, [])]
    corpus = [tokens(c["path"] + " " + c["text"]) or ["empty"] for c in chunks]
    # Positive BM25 IDF avoids zero scores when a term occurs in half a tiny corpus.
    frequencies = [Counter(doc) for doc in corpus]
    average_length = sum(map(len, corpus)) / len(corpus)
    scores = []
    for doc, frequency in zip(corpus, frequencies):
        score = 0.0
        for term in set(expanded):
            df = sum(term in f for f in frequencies)
            tf = frequency[term]
            idf = math.log1p((len(corpus) - df + 0.5) / (df + 0.5))
            score += idf * tf * 2.5 / (tf + 1.5 * (0.25 + 0.75 * len(doc) / average_length))
        scores.append(score)
    ranked = sorted(zip(chunks, scores), key=lambda x: x[1], reverse=True)
    return [c for c, score in ranked if score > 0][:k]


def validate_assessment(result, sent, snapshots, requirement):
    original = result.model_dump()
    evidence, invalid = [], []
    by_id = {c["id"]: c for c in sent}
    for cite in result.evidence:
        chunk = by_id.get(cite.chunk_id)
        quote = normalize(cite.quote)
        if not chunk or chunk["snapshot_id"] not in snapshots or quote not in chunk["text"]:
            invalid.append(cite.model_dump())
            continue
        offset = chunk["text"].index(quote)
        start = chunk["start"] + chunk["text"][:offset].count("\n")
        end = start + quote.count("\n")
        if end > chunk["end"]:
            invalid.append(cite.model_dump())
            continue
        evidence.append(
            {
                **cite.model_dump(),
                "quote": quote,
                "path": chunk["path"],
                "start": start,
                "end": end,
                "type": chunk["type"],
                "snapshot_id": chunk["snapshot_id"],
                "url": stable_url(chunk, start, end),
                "validation": "valid",
                "source_text": chunk["text"],
                "source_start": chunk["start"],
            }
        )
    effective = result.status
    limitations = list(result.limitations)
    if effective in {"supported", "partial"} and not evidence:
        effective = "not_evidenced"
        limitations.append("No valid citations remained after server validation.")
    text = requirement.get("text", "").lower()
    employment = bool(
        re.search(
            r"(?:professional|profesional|laboral).*(?:experience|experiència|experiencia)|(?:years|anys|años).*(?:experience|experiència|experiencia)",
            text,
        )
    )
    if (
        employment
        or requirement["verifiability"] == "external"
        or requirement["category"]
        in {
            "experience",
            "language",
            "communication",
            "leadership",
        }
    ):
        effective = "not_verifiable_from_code"
    return {
        "original": original,
        "status": effective,
        "explanation": result.explanation,
        "limitations": limitations,
        "evidence": evidence,
        "invalid_citations": invalid,
        "contradictions": result.contradictions,
        "reviews": [],
    }
