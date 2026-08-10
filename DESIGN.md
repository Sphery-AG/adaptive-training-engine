---
name: Sphere Loop
description: Adaptive training plans for gym members, in a dark orbital interface where every color carries a fixed meaning.
colors:
  void: "oklch(0.1 0.02 260)"
  canvas: "oklch(0.12 0.03 265)"
  surface: "oklch(0.2 0.03 260 / 45%)"
  surface-raised: "oklch(0.15 0.03 265 / 90%)"
  hair: "oklch(1 0 0 / 10%)"
  hair-strong: "oklch(1 0 0 / 22%)"
  bright-sky-cyan: "oklch(0.82 0.14 210)"
  deep-electric-violet: "oklch(0.62 0.22 295)"
  hot-signal-fuchsia: "oklch(0.68 0.28 330)"
  fresh-mint: "oklch(0.79 0.17 165)"
  warm-amber: "oklch(0.83 0.16 85)"
  text-hi: "oklch(0.97 0.01 250)"
  text-mid: "oklch(0.86 0.02 255)"
  text-lo: "oklch(0.72 0.03 255)"
  text-faint: "oklch(0.55 0.03 258)"
typography:
  display:
    fontFamily: "Bebas Neue, system-ui, sans-serif"
    fontSize: "clamp(2rem, 8vw, 3rem)"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.015em"
  headline:
    fontFamily: "Bebas Neue, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "0.015em"
  title:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "10px"
    fontWeight: 600
    letterSpacing: "0.2em"
rounded:
  sm: "12px"
  md: "18px"
  lg: "28px"
  card: "26px"
  pill: "9999px"
spacing:
  xs: "10px"
  sm: "14px"
  md: "16px"
  lg: "28px"
components:
  button-primary:
    textColor: "{colors.void}"
    rounded: "{rounded.pill}"
    height: "56px"
    width: "100%"
    typography: "{typography.title}"
  button-ghost:
    textColor: "{colors.text-mid}"
    rounded: "{rounded.pill}"
    height: "44px"
    width: "100%"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-hi}"
    rounded: "{rounded.card}"
    padding: "16px"
  select-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-hi}"
    rounded: "{rounded.sm}"
    padding: "14px 16px"
  select-row-checked:
    textColor: "{colors.bright-sky-cyan}"
    rounded: "{rounded.sm}"
    padding: "14px 16px"
  nav-item:
    textColor: "{colors.text-faint}"
    typography: "{typography.label}"
    padding: "12px"
  nav-item-active:
    textColor: "{colors.bright-sky-cyan}"
    typography: "{typography.label}"
    padding: "12px"
---

# Design System: Sphere Loop

## Overview

**Creative North Star: "The Orbital Loop"**

A member in training is a body in orbit. The interface is built from rings that
close, accents that hold fixed positions in a semantic orbit, and a habit loop
that comes back around every week. Nothing here is decorative dark-mode styling.
The ring gauge is the signature form, the five accents are a fixed vocabulary
rather than a palette to pick from, and the whole app sits on a near-black void
with a single cyan bloom behind it, the way a lit object sits against deep space.

The voice holds two things at once, and the tension between them is the point.
It is precise, calm, and engineered, because the plan behind it is a real
estimate from real training history and the interface has to be worth trusting:
tabular numerals, exact heart-rate ranges, evidence counts, a plain reason
attached to every change. It is also warm, encouraging, and human, because the
member reading it at 6am is not an analyst. Numbers arrive with a sentence
explaining what they mean. Progress is shown as something you closed, not
something you failed to close. Precision earns the trust; warmth is why anyone
comes back.

It is phone-first without apology. Every surface is designed inside a 448px
column, thumb-reachable, with the primary action pinned to the bottom of the
screen. Depth comes from light, never from shadow: surfaces are flat and
translucent, and a glow appears only where something is live, earned, or
selected.

**Key Characteristics:**
- Near-black void canvas with one radial cyan bloom, never a flat gray
- Five accents with fixed semantic ownership, used sparingly
- Condensed uppercase display type against a geometric body face
- Flat translucent surfaces separated by hairlines, not shadows
- Glow reserved for live, earned, or selected states
- Phone-first single column, bottom-anchored actions

## Colors

A cold, near-monochrome ground with five saturated accents that never trade
jobs.

### Primary
- **Bright Sky Cyan** (`oklch(0.82 0.14 210)`): The physical and cardio voice,
  and the app's default accent. Active navigation, selected controls, the
  fitness ring, focus outlines, and the bloom behind the entire app. If a
  surface needs one accent and has no specific meaning to carry, it is this one.

### Secondary
- **Deep Electric Violet** (`oklch(0.62 0.22 295)`): Cognitive and adaptive
  work. Brain Score, cognitive-motor stimulus, and anything describing how the
  plan changed itself.
- **Hot Signal Fuchsia** (`oklch(0.68 0.28 330)`): The habit loop. Streaks,
  quests, rank, points, and the required-field marker. It is also the far end of
  the primary CTA gradient and the only color permitted to glow behind a button.

### Tertiary
- **Fresh Mint** (`oklch(0.79 0.17 165)`): Positive change only. An improving
  trend, a completed session, a recovery reading that got better.
- **Warm Amber** (`oklch(0.83 0.16 85)`): Caution and low confidence. A cold-start
  estimate, thin evidence, a flagged injury. Never used as decoration.

### Neutral
- **Void** (`oklch(0.1 0.02 260)`): The page ground, under the radial bloom.
- **Canvas** (`oklch(0.12 0.03 265)`): Slightly lifted ground for soft sections.
- **Surface** (`oklch(0.2 0.03 260 / 45%)`): Every card. Translucent by design so
  the bloom reads through it.
- **Hairline** (`oklch(1 0 0 / 10%)`) and **Strong Hairline** (`oklch(1 0 0 / 22%)`):
  The only borders in the system. Strong is for hover and unselected controls.
- **Text ramp**: high `oklch(0.97 0.01 250)` for primary reading, mid
  `oklch(0.86 0.02 255)` for supporting copy, low `oklch(0.72 0.03 255)` and
  faint `oklch(0.55 0.03 258)` for labels and inactive states.

### Named Rules

**The Fixed Orbit Rule.** Each accent owns one meaning: cyan is physical, violet
is cognitive, fuchsia is the habit loop, mint is positive change, amber is
caution. Never pick an accent because a screen needs variety. If a new element
has no meaning in that list, it is neutral.

**The Sparse Accent Rule.** Accent color covers well under 10% of any screen.
The ground is void and hairlines; color marks the one thing that matters. A
screen where three accents compete has already failed.

**The Zone Ramp Exception.** Heart-rate zone bars use the universal training ramp
(`#475569` → `#4ade80` → `#fde047` → `#fb923c` → `#fb7185`, zone 1 to 5), not the
orbit accents. Athletes read this ramp everywhere; overriding it with brand color
would cost comprehension for nothing. This is the only sanctioned palette outside
the orbit, and it applies to zone visualization alone.

## Typography

**Display Font:** Bebas Neue (with `system-ui, sans-serif`)
**Body Font:** Space Grotesk (with `system-ui, sans-serif`)
**Mono Font:** Geist Mono, for tabular figures where alignment matters

**Character:** A condensed all-caps grotesque against a geometric sans with
slightly quirky letterforms. Bebas gives headings athletic compression and
scoreboard energy; Space Grotesk keeps body copy warm and readable rather than
clinical. The pairing is the whole personality in two faces.

### Hierarchy
- **Display** (400, `clamp(2rem, 8vw, 3rem)`, 1.0 line-height, 0.015em): Screen
  titles and hero metrics. Bebas ships one weight, so `font-synthesis-weight` is
  off and faux-bold never appears.
- **Headline** (400, 1.5rem, 1.1): Section headings inside a screen.
- **Title** (600, 1rem, 1.3): Card titles and control labels, in Space Grotesk.
- **Body** (400, 1rem, 1.6): Reading copy, rationale strings, explanations.
- **Label** (600, 10px, 0.2em, uppercase): The `.eyebrow` class. Category markers,
  nav labels, and anything that names a region rather than speaking in it.

### Named Rules

**The One Weight Rule.** Bebas Neue has a single weight. Never apply
`font-weight` above 400 to display type, and never let the browser synthesize it.
Emphasis in display type comes from size, never from weight.

**The Tabular Numbers Rule.** Any number that updates in place — heart rate,
elapsed time, points, percent complete — carries `.tabular`. Digits must not
shift horizontally as they change.

## Layout

A single phone-first column. Content sits in a 448px (`max-w-md`) container,
centered, with 16px side padding; intake screens widen to 576px (`max-w-xl`) for
longer reading. There is no desktop layout and no sidebar: the app is designed
for a member holding a phone in a gym, and wider viewports simply center the
same column.

Vertical rhythm runs on 10 / 14 / 16 / 28px steps. Cards separate by 10px in a
list and 16px between groups; a section header clears 28px above its content.

Two elements are pinned rather than scrolled: the primary action sits in a
sticky footer with a gradient scrim fading up from the background, and the
bottom navigation is fixed with `env(safe-area-inset-bottom)` padding so it
clears the home indicator. Both exist so the member's thumb never travels.

**The Thumb Reach Rule.** The primary action of any screen is within reach at the
bottom of the viewport. A member mid-session should never scroll to continue.

## Elevation & Depth

This system is flat with emissive glow. Cards cast no shadows. Separation comes
from three things: a translucent surface fill over the void, a hairline border,
and the radial bloom reading through from behind. Stacking more shadow onto a
surface would flatten the atmosphere, not deepen it.

Glow is the only light in the system, and it is a state signal rather than a
finish. Something glows when it is live, earned, or selected. Nothing glows at
rest.

### Shadow Vocabulary
- **Accent glow** (`box-shadow: 0 18px 55px -14px oklch(0.68 0.28 330 / 0.55)`):
  Under the primary CTA when it is enabled. Disappears on the disabled state.
- **Ring glow** (`filter: drop-shadow(0 0 9px <ring color>)`): On the progress
  stroke of a ring gauge, in whatever accent that ring carries.
- **Zone glow** (`0 0 9px rgba(...)`): On a filled heart-rate zone bar, tinted to
  that zone's ramp color. Zone 1 does not glow.

### Named Rules

**The Earned Light Rule.** Glow marks live, earned, or selected. A disabled
button, a locked medal, and a resting card do not glow. If everything glows,
nothing reads as achieved.

## Shapes

Soft-edged and generous throughout. The radius scale runs 12px for small
controls, 18px for mid-size surfaces, and 28px for large containers, with 26px as
the established hero-card value and full pills for actions and status chips.

Every action is a pill: primary CTAs, skip links, chips, and the toggles inside
the segmented control. Every container is a rounded rectangle with a hairline.
There are no square corners and no heavy borders anywhere in the system.

The ring is the signature silhouette. Circular progress with a rounded stroke
cap, sweeping clockwise from the top, center reserved for a number and its label.
It carries the fitness estimate, Body and Brain scores, and the monthly rank, and
it should be the first thing considered whenever a new completion metric needs a
form.

## Components

### Buttons
- **Shape:** Full pill (`9999px`), full width, 56px tall for primary.
- **Primary:** The cyan-to-fuchsia gradient
  (`linear-gradient(135deg, cyan 0%, fuchsia 118%)`) with dark void text for
  contrast, plus the accent glow beneath.
- **Disabled:** 25% opacity, glow removed, `not-allowed` cursor. The gradient
  stays, so the control still reads as the primary action, just unavailable.
- **Ghost:** 44px tall, no fill, mid-tone text that brightens to white on hover.
  Used for Skip and other retreats.

### Selection rows and chips
- **Style:** Translucent surface card, hairline border, 12px radius, 14px/16px
  padding. Built on real `<input type="radio|checkbox">` visually hidden behind a
  styled sibling, so keyboard and screen-reader behavior comes from the platform.
- **Selected:** Border shifts to cyan and the fill becomes cyan at 14% alpha.
  Selection is shown by border and tint, never by a checkmark alone.
- **Hover:** Border steps from hairline to strong hairline. No movement, no
  shadow.
- **Info flip:** Rows carrying an explanation flip 180° on the Y axis over 500ms
  to reveal it. The explanation is a peer of the control, not a tooltip.

### Cards
- **Corner:** 26px for hero and metric cards, 18px in lists.
- **Background:** Translucent surface at 45%, so the bloom reads through.
- **Border:** Hairline, strengthening on hover for interactive cards only.
- **Shadow:** None. See Elevation.
- **Padding:** 16px standard, 20-28px vertical for metric tiles that center their
  content.

### Inputs
- **Style:** Same translucent surface and hairline as cards, 12px radius.
- **Focus:** A 2px cyan outline at 2px offset, keyboard-only via
  `:focus-visible`. Pointer users never see it.
- **Slider:** Accent-filled track to the current value, plain white-at-10% after
  it, with a 20px accent thumb carrying a soft accent halo.

### Navigation
- **Style:** Fixed bottom bar, background at 95% opacity with a backdrop blur,
  hairline top border, four items spaced evenly in the 448px column.
- **States:** Active is cyan with an `aria-current="page"`; inactive is faint and
  brightens to mid on hover. Icon above a 10px uppercase label.
- **Safe area:** Bottom padding adds `env(safe-area-inset-bottom)`.

### Ring gauge (signature)
The system's defining component. An SVG circle rotated -90° so the fill sweeps
clockwise from top, with a rounded cap and a drop-shadow glow in the ring's own
color. The fill animates over 900ms on `cubic-bezier(0.22, 1, 0.36, 1)`. The
center is a slot: a display-type number over an eyebrow label. Color is passed in
by the caller so the ring inherits the orbit meaning of whatever it measures.

### Rank medal (signature)
A gradient coin with twin ribbons and a star, in metal colors per tier: bronze
`#d08a4b`, silver `#cdd5e0`, gold `#f6c945`, platinum `#a7e8df`, diamond
`#b9e0ff`, each with a darker trim. Locked tiers render grayscale. These metals
sit outside the orbit palette on purpose, because a medal has to look like metal
to read as one.

### Motion
Two animations, both on `cubic-bezier(0.22, 1, 0.36, 1)` and both fully disabled
under `prefers-reduced-motion: reduce`:
- **pop** (350ms): A metric that just changed scales 0.96 → 1.04 → 1. This is how
  an adaptive update announces itself.
- **screen-in** (340ms): Intake screens enter with a 10px rise and fade.

## Do's and Don'ts

### Do:
- **Do** assign accents by meaning, not by variety. Cyan physical, violet
  cognitive, fuchsia habit loop, mint positive change, amber caution.
- **Do** keep accent coverage under 10% of a screen. The void and hairlines carry
  the layout.
- **Do** put every number that updates in place on `.tabular`.
- **Do** pin the primary action to the bottom of the viewport in a sticky footer
  with a background scrim.
- **Do** pair a metric with a plain sentence saying what it means. Precision is
  the trust, warmth is the reason anyone returns.
- **Do** reach for the ring gauge first when a new completion or progress metric
  needs a form.
- **Do** respect `prefers-reduced-motion` on every animation added.
- **Do** use real form inputs behind styled siblings, so platform keyboard and
  screen-reader behavior comes for free.

### Don't:
- **Don't** add a drop shadow to a card. Depth is surface alpha, hairline, and
  the bloom.
- **Don't** let anything glow at rest. Glow means live, earned, or selected.
- **Don't** apply a weight above 400 to Bebas Neue or let the browser synthesize
  one.
- **Don't** introduce a sixth accent, or restyle the heart-rate zone ramp into
  brand colors.
- **Don't** build a desktop layout, sidebar, or dense data table. Wider viewports
  center the same phone column.
- **Don't** drift toward a light fitness-tracker look: white cards, stock
  illustrations, or a generic blue primary.
- **Don't** drift toward a corporate SaaS dashboard: gray chrome, chart-library
  defaults, or a data grid.
- **Don't** drift toward a crypto/AI dark dashboard, which is the nearest and
  most dangerous neighbor. The difference is discipline: fixed accent meanings,
  glow only on earned state, and generous space. Glassmorphism everywhere,
  everything glowing, and purple gradients with no hierarchy are the failure
  mode.
