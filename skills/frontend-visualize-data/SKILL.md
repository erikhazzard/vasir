---
name: frontend-visualize-data
description: "Explain data or a concept by showing it. Use to design, audit or implement a web data visualization that makes a defensible argument from validated data: choosing a chart, table or narrative graphic, building it in D3, SVG or React, handling color, uncertainty and annotation, or reviewing one; or to build an offline, D3-first interactive article that explains a technical concept: an explorable explanation, visual tutorial or concept demo, starting from a short set of alignment questions. Not for analyzing gameplay footage or for the interface around the visual."
license: MIT
metadata:
  gc-owner: "erik"
  gc-capability: "interface-design"
  gc-engine: "agnostic"
  gc-platforms: "agnostic"
  gc-status: "draft"
  gc-tags: "data-visualization, d3, charts, interactive-articles, explanation"
  gc-source: "https://github.com/erikhazzard/vasir/tree/d04347b0d515d4c3c46b5e012e2c334fdabf83bd/.agents/skills"
  gc-source-skills: "design__visualizing-data, explaining__creating-interactive-articles"
  gc-source-revision: "d04347b0d515d4c3c46b5e012e2c334fdabf83bd"
---

# Visualize Data and Concepts

Explain something by showing it. One procedure is for data that must be read correctly. The other is for a concept that is easier to play with than to read about.

## Pick the procedure

| You are asked to | Read | What it gives you |
| --- | --- | --- |
| Show data: choose a chart, table or graphic, build it in D3, SVG or React, frame uncertainty, or review a visualization | [Data visualization](references/data-visualization.md) (23K) | The strongest visual argument the data will defend, for a named audience and decision. Its rules are marked by strength: empirical, consensus or house. |
| Explain a technical concept with an explorable article, a visual tutorial or a concept demo | [Interactive articles](references/interactive-articles/interactive-articles.md) (25K, plus three references and a note on supplying D3) | About five alignment questions first, then an offline article built with D3. An article, not a dashboard. An explanation, not a coding tutorial. |

## Telling them apart

- If the reader has to draw a conclusion from numbers, it is data visualization. If the reader has to understand how something works, it is an interactive article.
- An article that contains charts follows the data visualization rules for those charts. Read both only then.
- The article procedure asks its questions before it builds. Ask fewer, or none, only when the user has already answered them, has said not to ask, or the job is a tiny mechanical edit.

## What these procedures assume

- Both target the browser. The article procedure requires D3, which this package does not ship: its `lib/README.md` says where a local copy goes. An article never loads anything from a remote address.
- Data visualization starts from validated data. If the data has not been checked, say so before drawing anything from it.

## What holds for every procedure

- Read the procedure the request needs and no other, unless it sends you to one. The sizes above are what each costs to load.
- A path to a file that ships with a procedure is relative to that procedure's own file. A path the procedure tells you to read, run or write in the project, such as `docs/...`, `tmp/...` or a source file, is relative to the project you are working in, never to this package.
- The destination project's instructions and the user's existing scope come first. A procedure adds judgement. It grants no authority, and it adds no approval step the user did not ask for.
- Each procedure states what it must deliver. Deliver that, and say which procedure you used.

## Other skills

Use these where they are installed. If one is absent, carry on with this package's procedures and say which judgement was not available.

- `frontend-design-foundations` for the interface around the visual: the page it sits in, its controls, type and motion. Its rules for what no interface ships hold for that surrounding interface. What the visual itself says and how it is drawn is decided here.
- `writing-style-prose` for the prose that carries an article.
