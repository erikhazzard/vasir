# Methodological foundations

This skill operationalizes complementary research and practice traditions without requiring outside research during execution:

- **System identification (Lennart Ljung):** observed data constrain candidate models; selection requires predictions and validation; no model can contain information absent from the trace.
- **MDA and systems design (Hunicke, LeBlanc, Zubek; Adams/Dormans; Sellers; Zubek):** rendered dynamics are most directly visible; mechanics and player experience are distinct inferential layers.
- **Measurement science (NIST uncertainty guidance):** a number is incomplete without a defined measurand, method, unit, uncertainty, count, and validity scope.
- **Sequential video analysis (Heath, Hindmarsh, Luff; Derry et al.):** order, duration, overlap, and transition are evidence; sparse stills are navigational, not equivalent to sequence.
- **Provenance (W3C PROV):** sources, extraction activities, evidence artifacts, claims, and outputs retain explicit derivation links.
- **Specification mining (Ammons, Bodik, Larus):** recurring traces can suggest protocols and state machines, but inferred behavior inherits trace coverage and requires validation.
- **Game-user research and player modeling (Drachen, Mirza-Babaei, Nacke; Yannakakis et al.; Ericsson/Simon):** behavior, cognition, affect, and report are distinct constructs; player hypotheses remain bounded by their input signals.
- **Active learning and experimental design (Angluin; Montgomery):** when models diverge, the highest-value observation is the one on which they predict different outcomes. In this passive-only skill, search the supplied footage for internal natural experiments and record—not require—what unseen probe would have resolved the fork.
- **Game feel and latency measurement (Swink; end-to-end HCI latency methods):** video can measure visible state timing, animation, hit stop, camera, and feedback cadence; it cannot establish physical-input-to-photon latency without synchronized input evidence.

These foundations determine the architecture:

```text
sequence → source-grounded evidence → measurement → candidate models
         → validation/conflict/typed unknown → baseline choice
         → behavioral fixture → report and reconstruction spec
```

The report may be decisive; the evidence graph may not be dishonest. When original internals remain non-identifiable, preserve the equivalence class and choose the smallest footage-faithful implementation for the baseline clone.
