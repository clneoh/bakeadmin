#!/usr/bin/env python3
"""Pull the visible text back out of a PDF built by marketing/build_*.py.

Why this exists: the PDF builders use fpdf2's core Helvetica, which is
latin-1 only. A stray emoji, a Chinese glyph or a leftover **bold** marker
does not fail the build - it silently prints as `?` or as literal asterisks
in the PDF the baker is about to read. The only way to catch that is to read
the finished file back.

Usage:
    python3 pdftext.py <file.pdf>            # report
    python3 pdftext.py <file.pdf> --text     # dump the whole text
"""
import re
import sys
import zlib


def extract(path):
    raw = open(path, "rb").read()
    chunks = []
    for m in re.finditer(rb"stream\r?\n(.*?)\r?\nendstream", raw, re.S):
        try:
            chunks.append(zlib.decompress(m.group(1)))
        except Exception:
            pass  # not a Flate stream (an image, or already uncompressed)
    body = b"\n".join(chunks).decode("latin-1", "replace")

    out = []
    for m in re.finditer(r"\((?:\\.|[^()\\])*\)|\[(?:[^\[\]]|\\.)*\]", body):
        s = m.group(0)
        if s.startswith("["):
            # a TJ array: concatenate just its strings
            s = "".join(re.findall(r"\((?:\\.|[^()\\])*\)", s))
        out.append(s[1:-1])
    t = " ".join(out)
    t = t.replace("\\(", "(").replace("\\)", ")").replace("\\\\", "\\")
    return re.sub(r"\s+", " ", t)


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return 1
    path = sys.argv[1]
    text = extract(path)

    if "--text" in sys.argv:
        print(text)
        return 0

    bad = sorted({c for c in text if ord(c) > 255})
    versions = sorted(set(re.findall(r"v\d+[a-z]?", text)))

    print(f"{path}")
    print(f"  characters        : {len(text)}")
    print(f"  literal '**' left : {text.count('**')}   <- must be 0")
    print(f"  non-latin-1 chars : {bad[:20] if bad else 'none'}   <- must be none")
    print(f"  version strings   : {versions}")

    # A "?" sitting *inside* a word cannot be real prose - it is a glyph that
    # clean()'s latin-1 fallback swallowed. A "?" at the end of a sentence is fine.
    swallowed = re.findall(r"\S*\w\?\w\S*", text)

    problems = []
    if text.count("**"):
        problems.append("literal ** markers (a cell() helper ate a markdown string)")
    if bad:
        problems.append(f"characters outside latin-1: {bad}")
    if swallowed:
        problems.append(f"swallowed glyph(s): {sorted(set(swallowed))[:5]}")
    print(f"  '?' inside a word : {sorted(set(swallowed))[:5] if swallowed else 'none'}   <- must be none")
    print("  VERDICT           : " + ("FAIL - " + "; ".join(problems) if problems else "ok"))
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
