# Research Map for Massive MMO Social Systems

Use this to trace a design claim to its source before treating it as doctrine.

## Evidence discipline

For each research-backed claim, keep this chain explicit:

```text
source → what the source actually supports → what it does not prove → design translation
```

## Primitive map

| Primitive | Canonical games | Source spine | What the source supports | Design translation |
|---|---|---|---|---|
| Third places and social architecture | WoW / EQII | Ducheneaut et al., “Virtual Third Places”; Shen, “Mapping the social world of EverQuest II” | MMO sociality is shaped by designed social architecture; place and affordances matter; many players still choose diffuse sociability or solo play. | Design true third places, not just traffic hubs. |
| Brokerage vs closure | EQII | Shen, Monge, Williams, “Virtual Brokerage and Closure” | Brokerage predicts task performance; closure predicts trust. | Build both weak-tie and strong-tie surfaces. |
| Institution stress and aging | EQII / WoW | Poor & Skoric, “Death of a Guild, Birth of a Network”; Ducheneaut et al., guild survival work | Guilds face personal, subgroup, guild, game, and company-level stress; strong subgroups can fragment institutions. | Design for lifecycle, succession, dormancy, and overlap. |
| Group mergers | Online groups broadly | Kiene et al., “Managing Organizational Culture in Online Group Mergers” | Growth via merger has real cultural and coordination costs. | Build merger/split tools and cultural translation surfaces. |
| Sovereignty and coalition formation | EVE | Bramson et al., “Diplomatic Relations in a Virtual World” | Alliance size, power, and geographic proximity shape coalition behavior; structural balance theory explains much of observed diplomacy. | Treat geography, power, and coalition behavior as designed systems. |
| Governance in proprietary worlds | EQ / WoW | Humphreys, “Ruling the virtual world” | Control is exercised by developers, publishers, and players in proprietary spaces. | Operator governance is part of design, not an afterthought. |
| Ritual and commitment | WoW | Simpson et al., “Virtual Rituals” | Social focus during ritual events and emotional investment predict commitment better than purely material focus. | Treat civic rituals and festivals as commitment architecture. |
| Quitting and dormant identity | EVE | Bergstrom, “Temporary Break or Permanent Departure?” | Quitting is not a simple binary; players move through temporary and recurring departure states. | Design for dormancy and returnability, not just churn recapture. |
| Player-authored narratives and narrative substrates | UO lineage / persistent worlds | Gustafsson et al., “Reifying and Managing Emergent Narratives”; “Co-Designers Not Troublemakers” | Persistent worlds can reveal, invite, and preserve player-created narratives; narrative traces can be represented and managed. | Build systems for authored history, not just dev-authored story. |
| Cartography as coordination | Games broadly | Toups Dugas et al., “Analyzing the Design of Game Cartography Interfaces” | Persistently modifiable maps expand planning and coordination. | Treat maps as shared command surfaces. |
| AI games window | AI-native games | NFX, “AI Games Are Coming” | AI-native games are constrained by inference speed/cost, model quality, memory management, and still-forming founder mental models; the “window” is opening. | Use as a market/technology timing lens, not as sufficient design doctrine. |
| LLMs in games state of field | Games broadly | Sweetser, “Large Language Models and Video Games: A Preliminary Scoping Review” | Early LLM/game work clusters around game AI, development, narrative, and research/reviews. | The field is broad; do not equate AI-native design with NPC chatter only. |
| Generative agents | Agent simulation | Park et al., “Generative Agents” | Memory, reflection, and planning can generate believable local and emergent social behavior in simulated agents. | Use persistent memory and reflection for agent worlds, but keep grounding and cost in mind. |
| LLM-human collaborative questing | Minecraft | Rao et al., “Collaborative Quest Completion with LLM-driven NPCs in Minecraft” | Human players and LLM NPCs can complement each other; players often compensate for the AI’s missing world grounding. | AI-native quest systems need explicit grounding and collaborative role design. |
| Player-driven narrative emergence | LLM narrative systems | Peng et al., “Player-Driven Emergence in LLM-Driven Game Narrative” | Non-deterministic LLM interaction can create emergent narrative nodes beyond the authored premise. | AI can expand narrative possibility, but emergent content needs curation, provenance, and canon policy. |
| Hybrid authorial control | Interactive narrative | Sun et al., “Drama Llama” | Storylet structure plus LLM generation can increase responsiveness while preserving authorial control. | Prefer hybrid systems over unbounded improvisation for important world content. |
| Live multiplayer control boundary for AI agents | Multiplayer AI agents | “Controlling LLM Characters in Live Multiplayer Games”; CASCADE-style bounded-autonomy work | Shared multiplayer worlds need AI characters that are executable, socially coherent, and steerable rather than totally free-form. | Separate conversational freedom from action execution and steering. |

## High-confidence conclusions

- Massive worlds need both brokerage and closure.
- Guilds and institutions age; they do not just recruit.
- Maps and rituals are social infrastructure.
- Player-authored history requires explicit scaffolding.
- AI-native MMO design is not about infinite content alone; it is about law, provenance, grounding, canon, and human usefulness.

## Common overclaims to avoid

- “One feature killed community.”
- “Population equals society.”
- “AI removes the need for authored systems.”
- “Personalization is always good.”
- “If content is infinite, progression and quest design stay conceptually the same.”

## Read next

- `ai-native-mmo-worlds.md`
- `mmo-calibration.md`
- `mmo-pattern-library.md`
