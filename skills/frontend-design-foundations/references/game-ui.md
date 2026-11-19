# Game UI

For a game's interface: a menu, a HUD, an inventory, a character screen. Read with [Interface](interface/interface.md). A game is read from further away, with a controller in hand and attention somewhere else, and its players already know a set of conventions. That changes the rules.

Every number here names where it comes from. The sources are listed at the end, with where they disagree.

## What gives way in a game

The entry file's list of what no interface ships is written against the average product interface. In a game these rules give way, because players already read the convention:

- **Color on the item itself.** Rarity, element, faction and team are shown in color on the thing, not kept to one accent. Color still never carries meaning alone: pair it with a shape, a pattern, an icon or a word, and let the player change it [XAG 103].
- **Badges.** New, equipped, locked and quest items are marked on the tile. A marker on every state that matters is the point, not clutter.
- **Frames and ornament.** Panels may be framed, textured and ornamented where that belongs to the game's world. One style, held throughout.
- **Density of state.** A tile can carry a name, a count, a rarity and a badge at once, as long as each reads from the couch.

Everything else in the list still holds: no one-sided accent stripes, no gradient text, no emoji as icons, nothing drawn in SVG that should be art.

## Size it for where it is played

Take the screen and the distance from the request, and state them in your answer. If the request names neither, it is a browser window on a desktop, read from arm's length, that must also hold up on a phone. Size it as any web interface is sized, let it reflow, and keep everything the screen is for. Never assume a TV or a controller that was not asked for, and never cut content to suit one.

**On a TV, from a couch.** Only when the request names a TV, a console or a controller.

- Never set text below 24px at 1080p. Set anything the player must read at 28px or more. The platforms agree on the range and not the number: 28px [FIRE], 26px measured ascender to descender [XAG 101], 29pt default and 23pt minimum [HIG], 30px for main text and 24px for supplemental [MS-TV].
- Sizes scale with the screen: 28px at 1080p is 19px at 720p and 56px at 4K [FIRE, XAG 101].
- Keep text and anything interactive inside the inner 90% of the screen: 96px from the sides and 54px from the top and bottom at 1080p [MS-TV, ATV, FIRE]. Backgrounds run to the edge.
- Contrast is 4.5:1 for text and important visuals, 3:1 for text of 52px or more at 1080p, measured against the lowest-contrast part of whatever is behind it [XAG 102]. Put a solid panel or an outline behind text that sits on the game world.
- Use less saturated colors than on a monitor [FIRE].
- Give it the density of a phone, not a desktop. Crossing the screen takes no more than six presses [MS-TV].
- A control is at least 64px tall at 1080p [MS-TV].

**On a handheld**

- Text is never under 9px tall at 1280×800, and 12px is the aim, read from 30cm [DECK].

**On a phone**

- Text is 18px at 100 DPI, scaling with density [XAG 101].
- A control the player uses often is 44×44pt, a lesser one 28×28pt [HIG]. Android asks for 48dp with 8dp between [AND]. Put frequent controls under the thumbs, movement on the left and camera on the right, clear of the system's own areas [HIG].
- A press fires on release, so sliding off cancels it [XAG 107].

**Everywhere**

- Text can be scaled up to 200% without losing content [XAG 101].
- Make room before you set the size. A name at 28px needs a tile or a row wide enough to hold it. Never break a word in the middle, and never let a label spill out of its box. If names do not fit a grid of tiles, use rows with the name beside the picture, or fewer and wider columns.

## Focus, for a controller

For a request that names a controller. A screen for mouse and keyboard keeps the Interface rules for focus.

- One focus mark is always on screen, and it is impossible to miss. It never lands on something hidden or off screen [XAG 113, MS-PAD].
- Make it at least a 2px outline all the way round, with 3:1 contrast between the focused and unfocused look [WCAG 2.4.13], and grow the focused item to between 1.025 and 1.1 times its size [ATV]. Leave room around tiles for that growth.
- Every element can be reached by up, down, left and right. A direction moves to the tile directly beside. Grids do not wrap. A straight list loops from last to first [XAG 112, MS-PAD].
- Focus starts on what the player will act on first, at the top left unless the screen says otherwise [MS-PAD]. In a dialog it goes to the first control and cannot leave until the dialog closes [XAG 113].
- Never move focus without the player's input, and never show a pointer in a menu [HIG].
- Never put an action after a long list. A list of 50 items is 51 presses from the button below it. Put actions beside the list or above it [MS-PAD].
- When the player comes back to a screen, put focus where they left it. Only Apple documents this, as an option in its own toolkit.

## Prompts and confirmation

- Show the glyphs of the controller in the player's hands [HIG, DECK]. Confirm is A on Xbox and back is B [MS-PAD]. On PlayStation 5 confirm is Cross in every region, by press reports and not a published guideline.
- If a button goes back, do not also draw a back button [MS-PAD].
- Prompts sit in the same order in the same place on every screen [XAG 112].
- Never make holding a button the only way to confirm something destructive. Offer review, confirm and undo [XAG 115]. Anywhere a hold is used, offer a toggle too [XAG 107].

## Inventories, equipment and character screens

From the platform guidelines:

- Give more than one way to find an item in a large inventory: tabs to filter, and sort or search [XAG 112].
- Show rarity in color with a second mark, and let the player change the colors [XAG 103]. Orange against blue survives the common kinds of color blindness best [GAG], though no pair is safe alone [HIG].
- An item that cannot be used says why, with a lock or a line of text. Greying it out is not enough [XAG 103].
- Selling, dropping or destroying can be reviewed, confirmed and undone [XAG 115].

From this library's own test, four builds of one inventory screen judged blind by two models. These are what the judges rewarded, not established rules:

- Name the item on its tile or beside it. A grid of unnamed icons makes the player move the cursor onto each one to learn what it is. Give the name room: in a second test one build set names at 24px on tiles too narrow for them, the words broke in the middle, and both judges marked it down for it.
- Open on the fullest useful view, such as all items. A category tab with seven items in a grid of thirty reads as empty.
- Show what equipping would change, as a number with an arrow and a color, in the item's panel and on the character's own stats. Say what it replaces.
- Label every equipment slot.
- Give the character's attributes, combat numbers and resistances their own view when the screen has room for it.

## HUD

- Ask two things of each element: is it drawn in the game's space, and does it exist in the game's fiction [THESIS]. An overlay suits detailed information. Something drawn in the world suits location and direction [THESIS].
- Putting an element in the fiction does not make it more immersive, and one that does not fit the setting feels wrong [THESIS].
- Something essential that appears briefly goes near where the player is looking. Something always present can sit at the edge [GAG].

## Type

- Keep a decorative face for large text, and offer a plain one for anything read at length [XAG 101, ATV]. Avoid thin and light weights [HIG].
- All caps is for a label of one or two words [XAG 101].
- Numbers that change use `tabular-nums`. Use a slashed zero where O and 0 can be confused [MDN].
- A line of text is no more than 80 characters, 40 in Chinese, Japanese or Korean, at 1.5 line spacing [XAG 101].
- Leave room for translation. A label of ten characters or fewer can triple, one of 11 to 20 can double, and long text grows by about a third [W3C].

## Subtitles

- No more than 40 characters a line and two lines, on a solid background the player can adjust, with the speaker named at each change [XAG 104, GAG].
- They are at least as large as other text [XAG 104]. One guideline asks for 46px at 1080p [GAG].

## Feel

- A press is answered within 100ms [NIELSEN].
- A transition runs between 100 and 500ms: about 100ms for feedback, 200 to 300ms for a larger change, and shorter going out than coming in [NNG].
- Confirm, back and move each have their own sound. The sound of moving focus is the quietest, and has a few variations [MS-SOUND]. Vibration can be switched off and is never the only signal [XAG 110].
- A held direction repeats after a short delay. No platform publishes the timing, so tune it by hand.

## Sources

Read in November 2026. Where two disagree, both are given above.

- **XAG**: Xbox Accessibility Guidelines 101 (text), 102 (contrast), 103 (color), 104 (subtitles), 107 (input), 110 (haptics), 112 (navigation), 113 (focus), 115 (errors), Microsoft. `learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/`
- **MS-TV**, **MS-PAD**, **MS-SOUND**: "Designing for Xbox and TV" (2020, archived), "Gamepad and remote control interactions" (2020), "Sound" (2026), Microsoft. `learn.microsoft.com/en-us/windows/apps/design/`. Sizes are given in effective pixels and doubled here for 1080p.
- **HIG**: Apple Human Interface Guidelines: layout, typography, focus and selection, game controls, accessibility. `developer.apple.com/design/human-interface-guidelines/`
- **ATV**: Android TV design guides: layouts, focus system, navigation, typography, Google. `developer.android.com/design/ui/tv/guides/`. Its layouts page gives two different side margins.
- **FIRE**: Fire TV "Design and User Experience Guidelines", Amazon. `developer.amazon.com/docs/fire-tv/design-and-user-experience-guidelines.html`
- **DECK**: Steam Deck compatibility review criteria, Valve. `partner.steamgames.com/doc/steamdeck/compat`
- **GAG**: Game Accessibility Guidelines. `gameaccessibilityguidelines.com/full-list/`
- **WCAG**: WCAG 2.2, Focus Appearance, W3C, 2023. `w3.org/WAI/WCAG22/Understanding/focus-appearance`
- **AND**: "Touch target size", Android Accessibility Help, Google. `support.google.com/accessibility/android/answer/7101858`
- **THESIS**: Fagerholt and Lorentzon, "Beyond the HUD: User Interfaces for Increased Player Immersion in FPS Games", Chalmers, 2009. `publications.lib.chalmers.se/records/fulltext/111921.pdf`
- **NIELSEN**: Jakob Nielsen, "Response Times: The 3 Important Limits", 1993. `nngroup.com/articles/response-times-3-important-limits/`
- **NNG**: Page Laubheimer, "Executing UX Animations", Nielsen Norman Group, 2020. `nngroup.com/articles/animation-duration/`
- **W3C**: "Text size in translation", W3C Internationalization. `w3.org/International/articles/article-text-size`
- **MDN**: `font-variant-numeric`. `developer.mozilla.org/en-US/docs/Web/CSS/font-variant-numeric`

Not found in any source that could be opened: rules for grid against list, the equip flow, what a detail panel holds, hold-to-repeat timing, and Nintendo's confirm and cancel convention. Three conference talks on game interfaces exist only as video and are not drawn on: Dead Space (Ignacio, 2013), Destiny (Candland, 2016) and Hearthstone (Sakamoto, 2015).
