---
name: frontend-design-foundations
description: "Build interfaces that look designed, not generated. Use whenever frontend UI is built, edited, polished or reviewed: components, forms, layouts, pages, interaction states, responsive behavior, touch, keyboard, focus and accessibility; for a game interface: a menu, a HUD, an inventory or a character screen, on a TV with a controller, a handheld or a phone; when writing HTML or CSS, or starting a frontend project, component library, visual identity or CSS architecture from nothing: one committed aesthetic direction, canonical BEM markup, class naming, design tokens and shadows; when adding, reviewing or fixing interface animation: transitions, easing, durations, springs, choreography, motion tokens and performance; or when choosing fonts, type scales, hierarchy and numerals, shipping web fonts, or making text survive localization. Holds the rules for what no interface ships, with specific numbers."
license: MIT
metadata:
  gc-owner: "erik"
  gc-capability: "interface-design"
  gc-engine: "agnostic"
  gc-platforms: "agnostic"
  gc-status: "draft"
  gc-tags: "frontend, design-system, interface, components, accessibility, game-ui, html, css, bem, motion, typography"
  gc-source: "https://github.com/erikhazzard/vasir-archive/tree/d04347b0d515d4c3c46b5e012e2c334fdabf83bd/.agents/skills"
  gc-source-skills: "design__building-frontend-interfaces, design__implementing-frontend-css-html, design__animating-interfaces, design__designing-typography"
  gc-source-revision: "d04347b0d515d4c3c46b5e012e2c334fdabf83bd"
---

# Design Frontend Foundations

Build interfaces that look designed, not generated. This package holds the rules for what no interface ships, and procedures for building an interface, for a game's interface, for the markup and CSS, for motion and for type. Each is split so that you read only the part the work needs.

## Never ship these

Left to its defaults, a model draws the same interface every time. These are the marks of that interface. They hold whichever procedure you read, and for any frontend work done while this package is loaded. Each rule says what to do instead.

**Surfaces**

- Never use a colored accent border on one side of a card or list item (border-left/inset-shadow stripes), especially with border-radius. Indicate state with background tint, icon, or a full uniform border instead.
- Never put a border, a radius and a shadow on every group, and never nest a card inside a card. Group with spacing and a shift in background first. Keep the border or the shadow for the one surface that is raised or interactive.
- Never signal elevation with one large blurred shadow or a colored glow. Layer a tight contact shadow under a wider ambient one, both lit from the same direction.
- Never give a nested corner the same radius as its container. Inner radius is outer radius minus the padding between them.
- Never use backdrop blur as decoration. Use it where content really scrolls beneath a fixed surface, and keep it under 20px.

**Images and art**

- Never draw art in SVG. Use `gpt-image-2.6-sunburst` for any image the work needs: illustrations, characters, scenes, textures. SVG is for icons and simple marks. Look for an OpenAI key in the environment before deciding you cannot. If you truly cannot, say so, and make the screen whole without the art: never ship an empty box with a label in it.

**Color**

- Never reach for a purple or indigo gradient, on a hero, a button or a headline, and never set text in a gradient. Choose one accent that belongs to this product, and keep it for the primary action and the current state.
- Never use untinted grey for neutrals, or pure black on pure white. Tint the neutrals toward the accent's hue.
- Never give the accent more than one meaning. Brand, selected, success, warning and danger each get a token of their own, and color never carries state alone: pair it with an icon, a label or a shape.

**Layout**

- Never build a page as a centered hero over three equal cards, each an icon, a heading and two lines. Let the content set the structure: one dominant element, columns of unequal weight, fewer boxes.
- Never use emoji as icons, bullets or section markers. Use one icon family at one stroke weight, matched in weight to the text beside it.
- Never put a pill badge on every piece of metadata, or a small uppercase label above every heading. Use one where it marks the single thing a reader must not miss.
- Never let reading text run the full width of a wide screen. Hold it to 60–75 characters a line.

**Type**

- Never let the font be an accident. Inter, Roboto or Arial arriving by default is the mark. A face chosen for this product is not, and neither is a system stack that the project or the Typography procedure chose on purpose.
- Never carry hierarchy on size alone. Show at least three levels, told apart by weight, color and spacing as well as size.

**Motion**

- Never write `transition: all`, and never put one 300ms ease on everything. Name the properties, and let duration follow the size of the thing: 100–150ms for a press or a hover, 150–200ms for a dropdown or a tooltip, 200–300ms for a modal or a drawer. Nothing in product UI runs past 400ms without visible progress.
- Never fade and slide each section in as it scrolls into view, and never take over scrolling. Motion is for a change the user caused or has to follow.
- Never scale an element in from nothing. It enters from 0.95–0.98 of its size with opacity, out of whatever opened it.
- Never animate a change the user made from the keyboard, or one they will see a hundred times a day. Those are instant.
- Never lift a card on hover unless the whole card is one click target, and never put behind hover anything a touch user needs. Hover styles go inside `@media (hover: hover) and (pointer: fine)`.

**Copy and states**

- Never label a button "Submit", "OK" or "Confirm". Name the action and its object: "Save changes", "Delete project".
- Never write filler: "Welcome back!", "Unlock the power of", "No items found". Say what the screen is for, or what the user's situation is and what to do next.
- Never ship only the default state. Hover, pressed, focus-visible, disabled, loading, empty and error are each designed, and no two look alike.

Where the project's own design system does one of these on purpose, the project wins: name the rule it overrides and carry on. The procedures below hold the full tables these numbers come from.

A game interface is the other exception. Players already read its conventions: color on the item for rarity, badges for new and equipped, framed panels. Where those differ from the rules above, the convention wins, and [Game UI](references/game-ui.md) says which rules give way.

## Read only what the work needs

Sizes are what each file costs to load. Start with Interface, then add every row that matches what is being built. A row that matches is not optional: read it before you write code. Anything built whole, a screen, a page or a component library, matches the Motion and Typography rows as well as its own.

| You are asked to | Read | What it gives you |
| --- | --- | --- |
| Build, rewrite, polish or review any interface | [Interface](references/interface/interface.md) (12K) | A quality ladder that puts finishing the task above taste, the form each kind of answer takes, and the craft rules every interface shares: states, type, color, surfaces, layout, icons, motion and performance, with their values. |
| ...and it is a web app or product screen: forms, dialogs, menus, components, touch | add [App](references/interface/app.md) (7K) | The accessibility floor, React component contracts, forms, controls and overlays, touch, and product copy. |
| ...and it is a marketing page, docs, a blog or a changelog | add [Pages](references/interface/pages.md) (1K) | What a hero must say, calls to action, scroll effects, and what docs and changelogs need. |
| ...and it is a game interface: a menu, a HUD, an inventory, a character screen | add [Game UI](references/game-ui.md) (10K) | What gives way in a game, what an inventory or character screen needs, and HUD and type rules. For a request that names a TV, a handheld or a controller, their text sizes, safe areas, focus rules and button prompts. It assumes none of those unless the request does. Every number names its source. |
| Start a frontend, a component library or a visual identity from nothing; write or restructure HTML and CSS | [Markup and CSS](references/html-css/html-css.md) (16K) | Five steps: commit to one aesthetic direction before any code; declare the component contract; then hard rules for selectors (canonical BEM, three classes at most on an element), a canonical token set, motion and accessibility; the order to produce things in; and a self-check. |
| ...and you want to see that contract applied to one component | its [worked example](references/html-css/example.md) (6K) | A notification toast, from direction to finished code. |
| ...and you are writing shadows or an elevation system | its [shadows reference](references/html-css/references/shadows.md) (17K) | A two-stack shadow model, its tokens, and a surface primitive. |
| Build anything with parts that open, close, move or change state: a dialog, a menu, a tooltip, tabs, a drawer, a list that reorders, a value that updates. Or add, review or fix interface animation, or define motion tokens | [Motion](references/motion.md) (35K) | First whether to animate at all, then which easing and how long, springs, stagger, how an exit differs from an entrance, and a recipe with its numbers for a dialog, a toast, a dropdown, a tooltip, an accordion, tabs and a button press. Then performance and accessibility. It starts from no animation and adds only what does a job. |
| Build anything that sets its own type. Or choose fonts, a type scale, hierarchy or numerals; ship web fonts; make text survive translation | [Typography](references/typography.md) (21K) | Stable defaults with personality only where it pays, building blocks to copy, font-shipping rules, and recipes for mobile game UI and web components. |


## Telling them apart

- **Interface and Markup and CSS.** Markup and CSS decides what the interface looks like and how its code is written: the direction, the class names, the tokens. Interface decides how its parts behave and how well they are finished. Interface does not choose the look. Where the project already has a direction, that one stands.
- **Motion and Typography go deeper than Interface, and a build reads both.** Interface carries the short version: the tokens, which easing suits which kind of change, the type rules every interface shares. That is enough for a small change to something that exists. It is not enough for a build. Motion holds what each moving part needs: its recipe, with durations, easing, starting scale and exit. Typography holds the scale, the numerals, font shipping, and recipes for game text and component text. From Motion, a build uses the checklist, the reasoning chain, the easing reference, choreography, exits, the component recipes, performance and accessibility. The rest of it is for reviews and for designing a motion system.
- **Where they disagree.** Markup and CSS has a short motion contract and a stance on fonts of its own, and it does not always agree with the specialists. It calls 200–300ms typical where Motion and Interface go shorter. It eases exits in and out where Motion eases a permanent exit in. It rules out a system font stack where Typography offers one as a default. A specialist decides its own subject, with one exception: in something built from nothing, the typeface is the one its direction chose in Markup and CSS, and Typography decides how that face is used.
- **One set of token names.** The names are the canonical set in Markup and CSS: `--duration-200`, `--ease-out`, `--space-4` and the rest. Interface uses them. Motion writes its examples with names of its own, such as `--duration-fast` and `--ease-default`, which is the same curve as `--ease-out`. In a project, keep the canonical names and take the values from Motion, adding a token only for a curve the canonical set lacks.
- **Motion here and game feel.** This is interface motion: menus, modals, feedback, loading. How a game's actions feel is juice in `game-build-game`.

## Using more than one

- **A new app screen:** Markup and CSS, Interface, App, Motion and Typography. About 91K.
- **A game menu, HUD, inventory or character screen:** Markup and CSS, Interface, Game UI, Motion and Typography. About 94K.
- **A landing page:** Markup and CSS, Interface, Pages, Motion and Typography. About 85K.
- **A change to something that exists:** Interface and the one add-on that matches it, plus Motion if the change moves and Typography if it sets type.

Read Markup and CSS first when starting from nothing, for the direction, then the rest. The worked example and the shadows reference are the only files to leave closed unless the work is about what they hold.

Every duration, easing curve, scale and size you write comes from one of these files. Before you answer, check each transition and animation in what you built against the Motion recipe for that kind of part.


## What these procedures assume

- All are written for the web platform: HTML, CSS and the browser. Game UI is for a game interface built that way, and gives its sizes at 1920 by 1080 with how they scale.
- App's section on components is written for React: `asChild`, refs, controlled and uncontrolled state. The rest of it applies to any web interface.
- Markup and CSS is opinionated on purpose: BEM, tokens, no utility classes, no Tailwind. If the project already has a different CSS architecture, the project's wins, and its direction step and naming tests are still worth using.

## What holds for every procedure

- Read every procedure the work matches, and none it does not. The sizes above are what each costs to load.
- A path to a file that ships with a procedure is relative to that procedure's own file. A path the procedure tells you to read, run or write in the project, such as `docs/...`, `tmp/...` or a source file, is relative to the project you are working in, never to this package.
- The destination project's instructions and the user's existing scope come first. A procedure adds judgement. It grants no authority, and it adds no approval step the user did not ask for.
- Each procedure states what it must deliver. Deliver that, and say which procedure you used.

## Other skills

Use these where they are installed. If one is absent, carry on with this package's procedures and say which judgement was not available.

- `frontend-visualize-data` for anything that shows data or explains a concept by showing it: a chart, a graph, a figure on a dashboard, an explorable article. Load it as soon as the work involves one. It decides what the visual says and how it is drawn. This package still decides the interface around it.
