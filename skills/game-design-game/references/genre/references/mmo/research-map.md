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

## Retention Architecture Research Layer

| Primitive | Primary sources | What evidence supports | What it does not prove | Design translation |
|---|---|---|---|---|
| Need satisfaction | Ryan/Rigby/Przybylski SDT/PENS | Autonomy, competence, and relatedness are central motivational lenses for games | Does not automatically tell which MMO feature to ship | Review every feature for need satisfaction, not just engagement |
| Common identity / common bond | Kraut/Resnick/Ren online community design | Community attachment can come from group identity or personal bonds | Does not imply one attachment type is always superior | Build both world/faction/profession identity and small-group bonds |
| Social graph retention | Kawale/Pal/Srivastava EQII churn; Shen brokerage/closure | Network position matters; brokerage and closure map different social capital | Does not prove a single universal churn formula | Design for missing-person value, weak-tie repetition, and cohort durability |
| Apprenticeship | Lave/Wenger communities of practice | Newcomers learn by legitimate peripheral participation | Does not replace explicit UI/tutorials | Give new players real low-blame useful roles |
| Adaptive mastery | DDA and productive persistence/wheel-spinning work | The same repeated failure can mean learning or stuckness | DDA alone does not create meaning | Diagnose stuckness type before changing difficulty |
| Avatar/ownership | Avatar identification and psychological ownership literature | Self-representation and ownership can increase attachment | Does not justify pay-to-status or hostage ownership | Let player identity persist through avatar, home, tools, profession, maps, and authored history |
| Team cognition | Shared mental models / transactive memory literature | Teams perform better when members share task models and know who knows what | Does not imply all coordination should be formalized | Build route, caller, expertise, backup, and post-failure model surfaces |
| Commons governance | Ostrom common-pool resource principles | Robust commons require boundaries, monitoring, sanctions, conflict resolution, nested governance | Does not transfer mechanically to games without adaptation | Shared resources need player law, not just public/private/instanced toggles |
| Reputation | Resnick/Tadelis/Jøsang trust and reputation systems | Reputation reduces information asymmetry among strangers | Global scores can distort behavior | Use contextual reputation tied to specific obligations |
| Recommendation / serendipity | Beyond-accuracy recommender work | Diversity, novelty, serendipity matter beyond accuracy | Does not provide MMO culture policy by itself | Treat matchmaking and surfacing as culture design |
| UGC ecology | UGC/editor surveys | UGC shifts games toward collaborative ecosystems | Does not solve curation or canon | AI lowers authoring friction; systems must validate, route, curate, and canonize |
| Experience memory | Peak-end / meaningful games research | Remembered experience and meaning are not average fun | Does not mean every session needs melodrama | Design peaks, recovery, endings, and next-return hooks |
| Healthy passion | Harmonious vs obsessive passion in games | Different engagement styles have different wellbeing implications | Does not make all high engagement harmful | Prefer life-compatible chosen return over captivity |

