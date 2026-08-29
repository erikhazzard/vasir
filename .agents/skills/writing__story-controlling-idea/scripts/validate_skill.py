#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
REQUIRED_GENRES = {
    'action', 'horror', 'crime', 'love', 'performance',
    'western', 'society', 'thriller', 'war'
}
REQUIRED_HEADINGS = [
    '## Mandatory Genre Contract',
    '## Value Spectrum',
    '## Genre Conventions',
    '## Obligatory Moments',
    '## Conscious Objects of Desire',
    '## Genre Spine',
    '## Twenty-Skeletal-Scene Map',
    '## Subgenres',
    '## Controlling-Idea Value Rules',
    '## Genre Validation Checklist',
]

errors = []

for rel in ['SKILL.md', 'README.md', 'references/genre-index.md',
            'references/genre-map.json', 'references/genre-reference-template.md',
            'references/controlling-idea-method.md',
            'references/philosophy-source-protocol.md',
            'references/quality-rubric.md', 'tests/acceptance-tests.md']:
    if not (ROOT / rel).exists():
        errors.append(f'Missing required file: {rel}')

map_path = ROOT / 'references' / 'genre-map.json'
try:
    genre_map = json.loads(map_path.read_text(encoding='utf-8'))
except Exception as exc:
    genre_map = {}
    errors.append(f'Invalid genre-map.json: {exc}')

if set(genre_map) != REQUIRED_GENRES:
    errors.append(f'genre-map keys mismatch: {set(genre_map)}')

for slug in sorted(REQUIRED_GENRES):
    path = ROOT / 'references' / 'genres' / f'{slug}.md'
    if not path.exists():
        errors.append(f'Missing genre file: {path.relative_to(ROOT)}')
        continue
    text = path.read_text(encoding='utf-8')
    for field in ['global_value_axis:', 'positive_pole:', 'negative_pole:', 'core_event:', 'core_emotion:']:
        if field not in text:
            errors.append(f'{slug}: missing frontmatter field {field}')
    for heading in REQUIRED_HEADINGS:
        if heading not in text:
            errors.append(f'{slug}: missing heading containing {heading!r}')
    if 'the controlling idea’s Value must resolve' not in text:
        errors.append(f'{slug}: missing mandatory value-lock statement')
    entry = genre_map.get(slug, {})
    if entry.get('reference') != f'references/genres/{slug}.md':
        errors.append(f'{slug}: JSON reference mismatch')
    if entry.get('global_value_axis') and entry['global_value_axis'] not in text:
        errors.append(f'{slug}: JSON axis not found in markdown')

skill_text = (ROOT / 'SKILL.md').read_text(encoding='utf-8') if (ROOT / 'SKILL.md').exists() else ''
for phrase in [
    'The **Value is a convention of the global genre**',
    'Never allow philosophy to replace the genre value',
    'A dilemma is not a climax',
    'Read `references/genre-index.md`',
]:
    if phrase not in skill_text:
        errors.append(f'SKILL.md missing governing phrase: {phrase}')

if errors:
    print('VALIDATION FAILED')
    for error in errors:
        print(f'- {error}')
    sys.exit(1)

print(f'VALIDATION PASSED: {len(REQUIRED_GENRES)} genre files and all required skill assets are present.')
