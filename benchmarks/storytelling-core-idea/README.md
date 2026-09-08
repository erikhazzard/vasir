# Core idea

This is one twelve-case response benchmark under **Writing > Storytelling > Core idea**. It compares an explanation of an existing story with and without the frozen `writing-storytelling` skill. The contestant receives only `What is the core idea of [specified work/version]?`; the treatment adds the skill invocation and frozen skill material. The exact questions, ten-dimension rubric, edition identifiers, and judge-only evidence live in [benchmark.json](benchmark.json).

This initial edition is **open knowledge**: neither condition receives the story text or the judge's fact packet. It therefore measures remembered story knowledge together with interpretation and explanation. It cannot isolate interpretive skill from familiarity. All questions are in English, and translated works identify the English version used for checking.

## Corpus

| Case | Medium | Specified work | Curatorial popularity band |
| --- | --- | --- | --- |
| `breaking-bad` | Television | Vince Gilligan, *Breaking Bad*, original 2008–2013 series, all five seasons | Broad; requested repeat |
| `the-matrix` | Film | The Wachowskis, *The Matrix*, 1999 theatrical film | Broad |
| `parasite` | Film | Bong Joon Ho, *Parasite*, 2019 theatrical film | Broad |
| `frankenstein-1818` | Novel | Mary Shelley, *Frankenstein*, 1818 text | Broad |
| `things-fall-apart` | Novel | Chinua Achebe, *Things Fall Apart*, 1958 | Broad |
| `a-dolls-house` | Theatre | Henrik Ibsen, *A Doll's House*, 1879, Sharp translation, original ending | Broad |
| `a-separation` | Film | Asghar Farhadi, *A Separation*, 2011 | Less broad |
| `close-up` | Film | Abbas Kiarostami, *Close-up*, 1990, Criterion subtitled release | Less broad |
| `convenience-store-woman` | Novel | Sayaka Murata, *Convenience Store Woman*, Takemori translation | Less broad |
| `the-memory-police` | Novel | Yoko Ogawa, *The Memory Police*, Snyder translation | Less broad |
| `death-and-the-kings-horseman` | Theatre | Wole Soyinka, *Death and the King's Horseman*, 1975 play | Less broad |
| `my-mister` | Television | Park Hae-young / Kim Won-seok, *My Mister*, 2018, all sixteen episodes | Less broad |

The bands are a **curatorial popularity proxy**, relative to this mixed-media, English-question set. They are not measured audience counts, claims that a work is obscure in its home culture, or evidence about model training data. Actual training exposure is unknown for every work. Several works in the less-broad band are major national or international successes. The set deliberately includes different forms, settings, languages, and kinds of closure; it is not representative of world storytelling.

Breaking Bad repeats the earlier exploratory question at the user's request. It is useful continuity, not a novel holdout. A title search of the active storytelling package found no named matches for these twelve works; that reduces direct worked-example reuse but cannot establish absence of indirect overlap or previous model exposure. The substantial Lord of the Rings, Snape, and Star Wars worked examples are outside this corpus.

## Scoring

Each of two independent providers gives an integer from 1 to 10 in the same ten dimensions used in the earlier experiment: accuracy, orientation, theme clarity and interconnectedness, causal explanation, character, concrete support, depth, nuance, prose clarity, and relevance. Every dimension has weight 10%. Anchors at 1, 5, and 10 describe weak, middling, and strong observable performance; intermediate integers express the differences between those anchors.

The raw mean stays on a 1–10 scale. The site's 100-point display is `10 × mean`, so a rating of 1 maps to 10, not zero. There are no semantic score caps. The numerical scale is declared explicitly and is not interchangeable with the engineering benchmarks' 0–4 ratings.

The rubric rewards a defensible, supported interpretation. It does not require a fixed moral, a positive character arc, a value-because-cause sentence, a specified essay length, or a particular craft vocabulary. There is **no automatic reward for verbosity, quotations, jargon, plot volume, or number of examples**. Concise answers can earn full credit; additional words must contribute useful reasoning. Dimensions overlap, so ten ratings do not provide ten independent measurements.

The [methodology](methodology.md) specifies matching, blinding, weighting, failures, factual uncertainty, and resource accounting. The [runbook](RUNBOOK.md) covers the dedicated runner, provider filtering, safe recovery and guarded publication. Scored execution must freeze this source and the actual runtime before generation. The run declaration, not this document, owns the final model cohort, reasoning settings, trial count, and date. No results are asserted here.

## Factual evidence

Every case has a bounded judge-only packet with factual anchors, nonexclusive interpretive possibilities, factual traps, edition details, and source URLs checked on 2026-09-07. The packets are withheld from contestants and must be supplied identically to both judge providers. Their purpose is checking, not teaching an expected thesis.

Sources include public-domain primary texts, studio or broadcaster material, creator and translator interviews, and a small number of explicitly labeled authoritative secondary checks. A publisher's guide or a distributor's critical essay is not mislabeled as the author's voice. Production scripts are primary artifacts but may differ from released films; the specified release controls. The source records say when an artifact is hosted by a third party or when only an indexed passage could be checked. Full copyrighted works are not copied into this benchmark.

The packets are not exhaustive. In particular, the Memory Police packet does not fully verify its late bodily disappearances, and My Mister's official previews do not establish every detail of its final episode. Missing packet coverage does not prove an answer wrong. Consequential doubtful claims must remain visible in the judge's rationale, with their factual uncertainty, rather than silently becoming verified evidence. These limits apply to the broad cases too.

The analysis is developmental. It has no human calibration panel, no random sample of works, and no demonstration of unseen-work generalization. Blind labels and judges from two providers reduce direct identity cues but cannot remove style preference, shared factual blind spots, or recognition of the skill's language. Report full answers and judgments alongside scores so readers can inspect these limits.
