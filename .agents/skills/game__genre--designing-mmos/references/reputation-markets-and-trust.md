# Reputation, Markets, and Trust

Use this when designing trading, player services, contracts, crafting, delivery, guild recruitment, leadership, teaching, or public service economies.

## Core prior rewrite

Bad default: reputation is a global rating, popularity count, or generic commendation.

Replacement: reputation should be contextual proof attached to repeated obligations. Trust is about whether this actor reliably does this kind of thing under these terms.

## Contextual reputation channels

| Obligation | Proof |
|---|---|
| crafting | fulfilled commissions, quality, delivery time, material handling |
| courier/logistics | route completion, loss rate, risk tier |
| raid/PvP leadership | rejoin rate, clear/attempt history, learner outcomes, dispute rate |
| teaching | learner retention, endorsements, mechanic-specific success |
| trade | escrow completion, dispute history, price reliability |
| governance | rule stewardship, arbitration history, treasury logs |
| hosting | event recurrence, guest return, rule clarity |
| AI/player contracts | accepted terms, adjudication outcomes, breach history |

## Design rules

1. Keep reputation contextual.
2. Attach proof to transactions and obligations, not vibes.
3. Make laundering expensive.
4. Let reputation decay or reset only where appropriate.
5. Separate skill, trust, generosity, popularity, and wealth.
6. Give players dispute/appeal and correction paths.
7. Do not expose reputation in ways that create permanent underclasses from early mistakes.

## Market trust stack

```text
identity continuity → terms → escrow/logs → completion proof → contextual reputation → dispute path → restoration/recovery
```

## AI-native implications

AI agents can issue, broker, summarize, and adjudicate contracts, but reputation must still point to grounded outcomes. Do not let fluent generated claims substitute for verified completion.
