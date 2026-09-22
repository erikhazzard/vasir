#!/usr/bin/env python3
"""Screen UTF-8 prose for normalized exact word runs using only the standard library.

This mechanical screen cannot prove semantic originality. It misses paraphrase,
images, and borrowed structures; common wording may be flagged legitimately.
Repeated anchor and match locations are capped and any omissions are reported.
"""

import argparse
from bisect import bisect_right
from collections import defaultdict
from dataclasses import dataclass
import hashlib
import json
import os
from pathlib import Path
import tempfile
import unicodedata


APOSTROPHES = frozenset("'\u2018\u2019\u02bc\uff07")


@dataclass(frozen=True)
class Word:
    value: str
    start: int
    end: int


def tokenize(text):
    """Normalize words while retaining covering spans in the original text.

    Compatibility decomposition before lexing handles characters expanding into
    multiple words. Final NFKC composes combining marks across input characters.
    Such an expanded glyph can belong to more than one word's original span.
    Apostrophes are retained only inside words, never as surrounding quotation.
    """
    words, chars = [], []
    start = end = 0
    pending_apostrophe = False

    def flush():
        nonlocal chars, pending_apostrophe
        if chars:
            value = unicodedata.normalize("NFKC", "".join(chars))
            value = unicodedata.normalize("NFKC", value.casefold())
            words.append(Word(value, start, end))
        chars = []
        pending_apostrophe = False

    for offset, original in enumerate(text):
        for char in unicodedata.normalize("NFKD", original):
            category = unicodedata.category(char)[0]
            if char in APOSTROPHES:
                if chars and not pending_apostrophe:
                    pending_apostrophe = True
                else:
                    flush()
            elif category in "LN":
                if not chars:
                    start = offset
                if pending_apostrophe:
                    chars.append("'")
                    pending_apostrophe = False
                chars.append(char)
                end = offset + 1
            elif category == "M" and chars and not pending_apostrophe:
                chars.append(char)
                end = offset + 1
            else:
                flush()
    flush()
    return words


def read_document(path):
    raw = path.read_bytes()
    text = raw.decode("utf-8")
    words = tokenize(text)
    line_starts = [0] + [i + 1 for i, char in enumerate(text) if char == "\n"]
    metadata = {
        "path": str(path),
        "sha256": hashlib.sha256(raw).hexdigest(),
        "bytes": len(raw),
        "characters": len(text),
        "words": len(words),
        "lines": len(line_starts) - int(text.endswith("\n")) if text else 0,
    }
    return text, words, line_starts, metadata


def span(document, first, stop):
    text, words, line_starts, metadata = document
    start, end = words[first].start, words[stop - 1].end
    first_line = bisect_right(line_starts, start)
    last_line = bisect_right(line_starts, end - 1)
    return {
        "path": metadata["path"],
        "word_start": first,
        "word_end": stop,
        "character_start": start,
        "character_end": end,
        "line_start": first_line,
        "line_end": last_line,
        "column_start": start - line_starts[first_line - 1] + 1,
        "column_end_exclusive": end - line_starts[last_line - 1] + 1,
        "text": text[start:end],
    }


def candidate_index(words, ngram, limit):
    index, skipped = {}, 0
    values = [word.value for word in words]
    for pos in range(len(values) - ngram + 1):
        key = tuple(values[pos:pos + ngram])
        positions = index.setdefault(key, [])
        if len(positions) < limit:
            positions.append(pos)
        else:
            skipped += 1
    return values, index, skipped


def compare(reference, candidate, c_values, index, ngram, limit, groups):
    """Find maximal runs from shared anchors; skip seeds already covered."""
    r_values = [word.value for word in reference[1]]
    anchor_counts, diagonal_end = defaultdict(int), {}
    skipped = 0
    for r_pos in range(len(r_values) - ngram + 1):
        key = tuple(r_values[r_pos:r_pos + ngram])
        c_positions = index.get(key)
        if c_positions is None:
            continue
        anchor_counts[key] += 1
        if anchor_counts[key] > limit:
            skipped += 1
            continue
        for c_pos in c_positions:
            diagonal = r_pos - c_pos
            if diagonal_end.get(diagonal, -1) >= r_pos + ngram:
                continue
            r_first, c_first = r_pos, c_pos
            while (r_first and c_first
                   and r_values[r_first - 1] == c_values[c_first - 1]):
                r_first -= 1
                c_first -= 1
            r_stop, c_stop = r_pos + ngram, c_pos + ngram
            while (r_stop < len(r_values) and c_stop < len(c_values)
                   and r_values[r_stop] == c_values[c_stop]):
                r_stop += 1
                c_stop += 1
            diagonal_end[diagonal] = r_stop
            matched = c_values[c_first:c_stop]
            digest = hashlib.sha256("\0".join(matched).encode("utf-8")).hexdigest()
            group = groups.setdefault(digest, {
                "normalized_words_sha256": digest,
                "normalized_text": " ".join(matched),
                "word_count": len(matched),
                "occurrences_detected": 0,
                "locations": [],
            })
            group["occurrences_detected"] += 1
            if len(group["locations"]) < limit:
                group["locations"].append({
                    "reference": span(reference, r_first, r_stop),
                    "candidate": span(candidate, c_first, c_stop),
                })
    return skipped


def positive_integer(value):
    number = int(value)
    if number < 1:
        raise argparse.ArgumentTypeError("must be a positive integer")
    return number


def main():
    parser = argparse.ArgumentParser(
        description="Screen UTF-8 files for normalized exact word runs; write JSON.",
        epilog=("Mechanical screen only: no semantic originality proof. Words use "
                "Unicode letters/numbers, attached marks, and internal apostrophes. "
                "NFKC/casefold and apostrophe unification ignore case and punctuation "
                "between words. Inputs are never written. Repeated locations are "
                "capped; JSON reports omissions. Offsets are zero-based and end-exclusive; "
                "lines and columns are one-based."),
    )
    parser.add_argument("--reference", type=Path, action="append", required=True,
                        help="reference UTF-8 file; repeat for multiple files")
    parser.add_argument("--candidate", type=Path, action="append", required=True,
                        help="candidate UTF-8 file; repeat for multiple files")
    parser.add_argument("--ngram", type=positive_integer, default=8,
                        help="minimum shared word-run length (default: 8)")
    parser.add_argument("--max-locations", type=positive_integer, default=20,
                        help="cap each repeated anchor and matching run's locations (default: 20)")
    parser.add_argument("--output", type=Path, required=True, help="destination JSON file")
    args = parser.parse_args()
    references = list(dict.fromkeys(path.resolve() for path in args.reference))
    candidates = list(dict.fromkeys(path.resolve() for path in args.candidate))
    output = args.output.resolve()
    for path in references + candidates:
        if not path.is_file():
            parser.error(f"input is not a file: {path}")
        if output == path or (output.exists() and os.path.samefile(output, path)):
            parser.error("output must not alias a reference or candidate file")
    if not output.parent.is_dir():
        parser.error(f"output directory does not exist: {output.parent}")

    report = {
        "schema_version": 1,
        "method": "maximal exact runs of NFKC/casefold Unicode words with unified apostrophes",
        "limitations": ("Mechanical overlap screen, not semantic originality proof. "
                        "Paraphrases and borrowed images/structures may be missed; "
                        "common phrases may be flagged. Counts of detected occurrences "
                        "exclude unexamined anchors when caps apply."),
        "offset_convention": "zero-based, end-exclusive characters/words; one-based lines/columns",
        "ngram": args.ngram,
        "max_locations": args.max_locations,
        "references": [],
        "candidates": [],
    }
    reference_metadata = {}
    try:
        for path in candidates:
            candidate = read_document(path)
            values, index, candidate_skipped = candidate_index(
                candidate[1], args.ngram, args.max_locations)
            groups, reference_skipped = {}, 0
            for reference_path in references:
                reference = read_document(reference_path)
                previous = reference_metadata.setdefault(str(reference_path), reference[3])
                if previous["sha256"] != reference[3]["sha256"]:
                    raise ValueError(f"reference changed during screening: {reference_path}")
                reference_skipped += compare(reference, candidate, values, index,
                                             args.ngram, args.max_locations, groups)
                del reference
            flags = list(groups.values())
            detected = sum(flag["occurrences_detected"] for flag in flags)
            returned = sum(len(flag["locations"]) for flag in flags)
            counts = {
                "distinct_matching_runs": len(flags),
                "occurrences_detected": detected,
                "locations_returned": returned,
                "locations_omitted": detected - returned,
                "candidate_anchor_locations_skipped": candidate_skipped,
                "reference_anchor_locations_skipped": reference_skipped,
            }
            report["candidates"].append({
                **candidate[3],
                "complete_for_configured_ngram": not (
                    candidate_skipped or reference_skipped or detected > returned),
                "counts": counts,
                "flags": flags,
            })
            del candidate, values, index, groups
        report["references"] = list(reference_metadata.values())
        # Atomic output leaves no partial report on serialization or write errors.
        temporary_path = None
        try:
            with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8",
                                             dir=output.parent, delete=False) as handle:
                temporary_path = Path(handle.name)
                json.dump(report, handle, ensure_ascii=False, indent=2)
                handle.write("\n")
            os.replace(temporary_path, output)
        finally:
            if temporary_path is not None:
                temporary_path.unlink(missing_ok=True)
    except (OSError, UnicodeError, ValueError) as error:
        parser.error(str(error))


if __name__ == "__main__":
    main()
