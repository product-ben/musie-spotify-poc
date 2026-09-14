# Brief: add three patterns to the musie pattern library

A prompt for Claude Design. Paste it whole; the context it needs is below.

---

## Context

**musie** is a mindfulness product in prototype. A printed card carries a QR
code; scanning it opens a page that plays one track. The therapeutic intent is
that the listener hears the track **without seeing its name or cover art**, so
they are not primed during the exercise. The track is played through Spotify's
official embed, which by Spotify's terms may not be altered or obscured — so
the design keeps the widget intact and simply does not lead with it.

The current prototype lives at `product-ben.github.io/musie-spotify-poc`. The
recommended version, **v0.3.2**, is three full-height panes stacked
vertically with scroll-snap:

1. **Controls** — play/pause, a playback badge, and a cue to scroll on
2. **The nudge** — one large sentence and two buttons, asking whether the
   listener really wants to see the track
3. **The player** — Spotify's embed, untouched

These patterns come out of that prototype. They should be generalised properly,
not lifted verbatim.

## Existing foundations

Colour tokens in use today. Treat these as the starting palette, and rename or
restructure them if the library has a better convention:

| Token | Value | Role |
| --- | --- | --- |
| `--bg` | `#0d1117` | Page ground |
| `--panel` | `#161b22` | Raised surface |
| `--line` | `#272e38` | Borders, dividers |
| `--text` | `#e6edf3` | Primary text |
| `--muted` | `#8b949e` | Secondary text |
| `--accent` | `#1db954` | Primary action (Spotify green) |

Type is a system font stack at a 15px base. Buttons are fully rounded
(`border-radius: 999px`), solid accent for primary, transparent with a
`--line` border for secondary. The product is dark-first.

Note on the accent: it is currently Spotify's brand green, inherited from the
prototype. If musie's audio ever stops coming from Spotify — which is the
likely direction — that colour becomes wrong. Flag whether the library should
carry a musie-owned accent and treat the green as a per-integration token.

---

## What to add

### Root level

**1. A fluid display type scale.** Sizes that grow with the viewport rather
than stepping at breakpoints, for the one large sentence that dominates a
screen.

Requirements:

- Fluid via `clamp()`, but **the minimum and maximum must be in `rem`, not
  `px`**, and the middle term must include a `rem` component — e.g.
  `clamp(1.5rem, 1rem + 2.5vw, 2.5rem)`. A pure `vw` middle term breaks
  browser zoom and ignores the user's font-size preference; that is an
  accessibility failure, not a stylistic choice.
- Define the scale as tokens usable on **any element**. Do not bind a size to
  a heading level — see the open question below.
- Specify line-height and letter-spacing per step. Display sizes need tighter
  values than body text, and the difference is what makes a large sentence
  read as designed rather than merely big.
- Give a measure (`max-width` in `ch`) for each step. Display text at full
  container width is unreadable.

**2. Icon-affordance tokens.** Spacing and sizing for an icon that sits with a
label rather than beside it — the gap between icon and label, and the icon's
own optical size relative to the label. Needed by the CTA variant below.

**3. An embedded-media container.** Third-party embeds have fixed minimum
dimensions and cannot be styled from outside. The library needs a defined
container for them: responsive width, a documented minimum height, and rules
about what may and may not be placed over them.

### Component level

**4. CTA variant: icon stacked with the label.** A button whose icon sits
**above or below** the label rather than inline — used for directional
affordances, where the icon's position reinforces the direction it means. A
downward arrow beneath "Scroll to see the Spotify player" reads as motion
downward in a way an inline arrow does not.

Specify:

- Both variants — icon above, icon below — and when each is right
- How it relates to the existing inline-icon and icon-only variants; if the
  library already has an icon slot, this may be a new `iconPlacement`
  property rather than a separate component
- All states: rest, hover, focus-visible, active, disabled, loading
- Applies across emphasis levels (primary, secondary, ghost)
- Hit target of at least 44×44px regardless of label length
- The icon must be decorative (`aria-hidden`), with the label carrying the
  meaning — a screen reader user gets nothing from "↓"
- Behaviour when the label wraps to two lines

**5. Display text.** The large sentence that fills a pane. One statement,
centred, with a constrained measure.

Specify the semantics explicitly, not just the styling — see the open
question. Include guidance on when to use display text versus a heading, since
the distinction will not be obvious to whoever reaches for it next.

**6. Spotify player embed.** A component wrapping the official Spotify iframe.

This one is unusual because **it carries legal constraints, and they belong in
the documentation**:

- The widget must be displayed in the form Spotify provides, without
  alteration, and must not be obscured "by any other means" — no overlays, no
  blur, no filters, no partial cropping, no scaling that clips it. The
  prototype has a version that blurs it; that version cannot ship and exists
  only as a record of the attempt.
- Playing Spotify content requires showing its cover art and metadata, which
  the widget does by itself. That is the reason it must stay intact.
- Controlling it from your own buttons **is** allowed — Spotify provides an
  IFrame API for exactly that. Custom controls are sanctioned; covering the
  widget is not.
- The Spotify Play Button may not be used for commercial purposes, though it
  may sit on a page carrying advertising.

The component needs: a responsive container, the documented `allow` attribute
(`autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture`),
compact and full height variants (152px and 352px), a loading state, and a
"below the fold" usage note explaining that placing it further down a page is
acceptable where obscuring it is not.

Document the failure mode too: listeners without a Spotify Premium session get
a 30-second preview rather than the full track, and the design must not imply
otherwise.

---

## Open question — please resolve and justify

The large sentence in the nudge pane reads:

> "For the exercise, it would be better to not get influenced by the track name
> and cover"

Is that an `<h1>`, or body text at display size?

**My view: body text, not a heading.** A heading labels a section so it can be
navigated and skipped; this is a sentence addressed to the reader, and it would
be strange to meet as a heading in a screen reader's outline. It is display
*typography* doing the work, not display *hierarchy*.

Which is the real point for the library: **the size step and the semantic
element are separate decisions.** A display scale that can only be reached
through `<h1>` forces heading markup wherever big text is wanted, and that is
how heading outlines get wrecked. Define the scale as tokens; let each context
choose its element.

If a pane needs a heading for landmark navigation, add a visually hidden one
rather than promoting the sentence.

Push back if you disagree — but decide it explicitly and write the reasoning
into the docs, because this is the question everyone will have when they reach
for the pattern.

---

## Deliverables

For each of the six additions:

- Anatomy, with the parts named
- Every variant and state, drawn
- The tokens it consumes, by name
- Responsive behaviour, including the smallest viewport it must survive (a
  phone in landscape, roughly 375×320, is the case that breaks these designs)
- Accessibility notes: semantics, focus order, contrast, hit targets, what
  screen readers announce
- Do and don't examples — for the Spotify embed, the don'ts are the legal
  constraints and should be shown, not just described
- How it fits the existing library; say so if something already covers it

Light and dark are both required. The product is dark-first, and the embed
renders its own dark surface, so check that light mode does not leave it
stranded on a pale page.
