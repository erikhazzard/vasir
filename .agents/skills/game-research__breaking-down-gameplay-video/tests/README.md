# Regression tests

The suite exercises the failures that motivated the rebuilt skill:

- 24/30/50/60/120 fps timestamp handling;
- VFR preservation;
- 16:9, 4:3, vertical, and non-square-pixel aspect handling;
- verified film-strip PTS labels, including the old 30-fps half-time regression;
- real-frame sampling and contact-sheet lineage;
- typed missing audio;
- fail-closed invalid input;
- camera-transform output that does not silently become player motion;
- unknown inter-file gaps;
- schema-valid examples and workspace indexes.

Run from the package root:

```bash
python -m pytest -q
```
