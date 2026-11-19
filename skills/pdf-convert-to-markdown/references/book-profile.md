# Per-book profile checklist

Create and freeze a machine-readable project profile before promotion. Derive
values from the new source and evidence; do not copy a prior book's values.

At minimum record:

```yaml
schema_version: 1
book:
  id: <safe-stable-id>
  title: <source title>
source:
  path: source/original.pdf
  bytes: <derived>
  sha256: <derived>
  page_count: <derived>
  encrypted: <derived>
render:
  dpi: <declared>
  pages:
    - page: 1
      media_box: <derived>
      crop_box: <derived>
      rotation: <derived>
      render_pixels: <derived>
      pdf_to_render_matrix: <derived>
text_evidence:
  native_extractors: <observed tools and versions>
  ocr_languages: <configured>
  ocr_psm: <configured>
  adjudicated_delta_manifest: <path, once accepted>
classification_policy:
  version: <sealed policy/tool hash>
  repeated_overlays: <source-specific reviewed patterns>
  unknown_text_action: REVIEW_REQUIRED
  unknown_visual_action: REVIEW_REQUIRED
chapters:
  accepted_manifest: <path, once reviewed>
  ownership_granularity: page-or-region-range
visuals:
  allow_multiple_per_page: true
  preserve_original_formats: true
  accepted_inventory: <path, once reviewed>
  review_roles: <required producer/reviewer separation>
canonical:
  native_generation: <content-addressed ID, once built>
  visual_generation: <content-addressed ID, once built>
release:
  accepted_review_bindings: <fresh paths/hashes/seals>
  expected_counts_source: accepted-manifests
```

The accepted chapter manifest must support a transition within a page when the
source does. Each visual record should include page, source bbox/XRef or vector
group, original format, source hash, `contains_visible_text`, semantic type,
ASCII treatment, and required review criteria.

Counts in compiler gates should be derived from frozen accepted universes.
Freeze exact hashes and review seals only after the new book's independent
reviews pass; never use another book's trust anchors.
