---
title: Design System
---

# Tinta sobre Creme

The landing page, this documentation site and the two small operator pages all
run on one design system. It is written down here because a project about not
claiming things you cannot show should not have an interface that decorates
itself with things that mean nothing.

Three rules generate almost all of it:

1. **Ink on cream.** One warm paper background, one turquoise ink. No dark
   surfaces, no gradients, no glassmorphism, no drop shadow doing work a
   hairline can do — and no filled blocks of colour anywhere except a primary
   button, which is an action rather than a label. Emphasis is made with a
   drawn mark, not with a coloured box.
2. **Nothing decorative unless it is also true.** The counted marks count real
   things. The three state chips are the three real states. The seal in the
   mark is the seal in the ledger.
3. **Marks are drawn, not placed.** Every stroke on the page is a stroke: it
   draws itself in along its own path, and it is allowed to be uneven.

## Colour

<div className="fp-figure">

**Table 1: The palette, and where each colour is allowed**

| Token | Value | Used for | Contrast on cream |
|---|---|---|---|
| `--cream` | `#f4f0e5` | the page | — |
| `--cream-deep` | `#ebe5d6` | cards, wells | — |
| `--ink` | `#0e3d3f` | body text, headings | 10.5:1 |
| `--ink-soft` | `#427070` | secondary text | 4.8:1 |
| `--turquoise` | `#0a7575` | links, buttons, eyebrows, PROVOU | 4.8:1 |
| `--turquoise-bright` | `#14a8a0` | brush strokes only, never text | — |
| `--vermilion` | `#c0391b` | NÃO PROVOU, destructive | 4.8:1 |
| `--amber` | `#92590f` | in flight: "checking the source…" | 5.0:1 |

</div>

The ink is a deep teal rather than a navy, on purpose: the whole palette stays
inside one hue family, so turquoise reads as the project's colour rather than
as an accent borrowed onto a neutral. Every colour that carries text clears
4.5:1 against the page.

Colour is never the only signal. Each of the three states carries its name in
words as well as its treatment, because a reader who cannot separate the
turquoise chip from the vermilion one still has to be able to read the ledger.

## Type

Three faces, each with one job.

- **Cormorant Garamond** — display. Headlines, card titles, the step numbers,
  and the one number in a statistic. A serif at large sizes is what keeps a
  minimal page from reading as a template.
- **Inter** — everything you actually read: body copy, labels, buttons.
- **IBM Plex Mono** — the machine's own voice. Signatures, handles, amounts
  read off a statement, and the three state chips. If a string came from a
  chain or a bank rather than from a person, it is set in mono.

The **eyebrow** is the system's connective tissue: 11px, weight 500, `0.18em`
letterspacing, uppercase. Section labels, table headers and card kickers all
use it, so the structure of a page is legible before a word of it is read.

## The mark

A claw holding a proof seal, drawn as four ink strokes and nothing else. The
claw is ZeroClaw; the seal is the only thing that can stamp an entry. It takes
its colour from `currentColor`, so one file serves the header, the hero and the
favicon without a second copy in a second colour.

The **lockup** sets `falou` quietly, in italic display, and `PROVOU` in the
machine's own face — mono — with a stamp drawn around it: twice round, by
hand, in the same ink as the mark. It is deliberately *not* reversed out of a
filled block. A saturated rectangle would be the loudest thing on a page made
entirely of strokes and hairlines, and it would be shouting rather than
stamping. Circling the word that matters is the gesture a person actually
makes on a printed page, and it belongs to the same hand that drew everything
else.

The same restraint applies to the three state chips: one shape, three inks.
<span className="fp-state fp-state--falou">FALOU</span> in soft ink behind a
hairline, <span className="fp-state fp-state--provou">PROVOU</span> in
turquoise over a faint turquoise wash, and
<span className="fp-state fp-state--nao">NÃO PROVOU</span> in vermilion. Which
state an entry is in is read from the word and its colour, never from one of
the three being louder than the other two.

## Ink

**Brush strokes** are two or three offset paths at descending opacity, pushed
through an `feTurbulence` displacement filter so the edges are never
mechanical. That layering is what reads as gouache rather than as a vector
line. They are used large, asymmetric and bled off the edge — hero corners,
section rules, behind a closing call to action. They are never used small, and
never as an icon.

**Counted marks** are four uprights and a diagonal fifth, drawn by hand with a
slight wobble so no two are identical. They appear only where something real is
being counted: two live bots, three custody patterns. A tally that counts
nothing would be exactly the kind of decorative claim this project exists to
refuse.

## Motion

Motion is used for one thing: showing that something was *drawn*. Strokes paint
themselves in along `stroke-dashoffset` over about 1.3 seconds; content rises
10 pixels and settles as it enters the viewport; the demo card cycles a claim
through checking and into proof on a four-second loop.

None of it is load-bearing. Under `prefers-reduced-motion: reduce` every
animation stops, and — importantly — anything that animates *from* `opacity: 0`
is pinned back to visible, so a reader who asked for less movement gets a
finished page rather than an empty one.

## Layout and responsiveness

- One shell, `1100px` maximum, `1.5rem` of side padding at every width.
- Section rhythm is `3.5rem` of vertical padding on a phone and `6rem` from
  48rem up.
- Display type is set with `clamp()` rather than at breakpoints, so a headline
  is proportional to the screen instead of jumping between two fixed sizes.
- Wide content — tables, signatures, code — scrolls inside its own box. The
  page body never scrolls sideways at any width.
- Long unbroken strings (a Solana signature, a bot handle) get
  `overflow-wrap: anywhere`, because a 88-character base58 string will
  otherwise widen a phone layout on its own.

## Where it is implemented

<div className="fp-figure">

**Table 2: One system, three surfaces**

| File | Surface |
|---|---|
| `landing/styles.css` | the landing page — the whole system, as custom properties, no build step |
| `docs/src/css/custom.css` | this site — the same tokens, mapped onto Infima's variables |
| `docs/src/components/ink/` | `Mark`, `BrushStroke` and `TallyMarks` as React components |
| `docs/src/pages/index.module.css` | this site's front page |
| `pix-rail/connect-page/index.html` | the one-time bank-connection page |
| `tooling/actions-server/*.html` | the mainnet Blink test pages |

</div>

The tokens are duplicated rather than shared, because the landing page has no
build step and importing a stylesheet across three deployment targets would buy
less than it costs. They are kept in sync by hand; the colour table above is
the source of truth.
