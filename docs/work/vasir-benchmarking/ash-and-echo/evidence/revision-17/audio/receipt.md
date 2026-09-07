# Landing audio runtime receipt

PASS — Chromium OfflineAudioContext native DSP, 48 kHz stereo. Frozen revision 16 versus current source snapshots and SHA-256 identities are retained alongside this receipt. All four event severities come from the current game collision step on a controlled stone after drops of 24, 80, 300 and 508 logical pixels.

| Height | Baseline peak dBFS | Current peak dBFS | Current body Hz | Current body ms | Current audible tail ms |
|---|---:|---:|---:|---:|---:|
| 24 | -20.7 | -35.7 | 152.1 | 85.7 | 189.4 |
| 80 | -12.9 | -24.4 | 140.4 | 139.9 | 217.9 |
| 300 | -10.4 | -14.6 | 104.7 | 305.8 | 367.1 |
| 508 | -10.4 | -11.6 | 81.1 | 415.0 | 696.3 |

Current tiny RMS is approximately 17.6 dB below its revision 16 counterpart. Current heavy body descends to 30 Hz; tiny ends at approximately 65 Hz. Tiny body duration is approximately 86 ms versus 415 ms for heavy. The audible threshold is absolute amplitude 0.001, not a perceptual loudness standard.

All 16 renders have zero clipped or nonfinite samples. Same source budget per condition: 6 transient sources for suspended landing, 10 with rebound, 9 with attached bell and 13 with bell plus rebound. Each returns to 47 persistent nodes and 9 sources after its tail; disposal disconnects all nodes and issues stop to every source. Offline rendering has already ended when dispose runs, so the nine persistent-source ended callbacks cannot advance the counter; no connected playback remains.

Same-frame and 40 ms rebounds cancel exactly four body gain envelopes, reaching zero 42 ms after the internally scheduled jump time. Both chain oscillators and their gain automation remain byte-for-byte equal to the no-rebound records. Attached-bell rebound likewise preserves all five chain/bell oscillators and gains. No pre-unlock audio nodes are created.

Listen artifact: height-comparison-AB.wav pairs revision 16 then current at each height, ascending 24 → 80 → 300 → 508. candidate-movement-reel.wav additionally contains same-frame rebound, 40 ms rebound, bell and bell-rebound conditions. No listening tool was available; conclusions are objective DSP and automation checks, not a human listening grade.
