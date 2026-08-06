# Landing page

Static, no build step — plain HTML/CSS. Deployed separately from the
Docusaurus docs site (`docs/`) and from the ZeroClaw agent config itself.

## Preview locally

```
cd landing
python3 -m http.server 8899
```

Open `http://localhost:8899`.

## Editing

- `index.html` — all copy and structure, plus the brush strokes and counted
  marks, inlined as SVG because the page has no build step to bundle them.
- `styles.css` — the whole design system. Palette, type scale, the
  `falou`/`PROVOU` lockup, the state chips, the looping demo animation and the
  responsive rules, all driven by custom properties declared at the top of the
  file.
- `assets/mark.svg` — the mark (a claw holding a proof seal, drawn as ink
  strokes), used as both the favicon and the header icon.
- `assets/qr-*.svg` — the two Telegram bot QR codes, in ink on cream.

The design system is **Tinta sobre Creme**, shared with the docs site and the
operator pages. It is written down in full — palette with contrast ratios, type
roles, motion rules, responsive behaviour — in
`docs/docs/project/design-system.md`. Change a token here, change it there.

Three things to keep intact when editing:

1. **Nothing is filled.** There is no block of solid colour on the page except
   the primary button, which is an action rather than a label. `PROVOU` is
   emphasised by a stamp *drawn around it*, and the three state chips are one
   shape in three inks. A saturated rectangle would be the loudest thing on a
   page made entirely of strokes and hairlines.
2. **Counted marks only appear where something real is counted.** Two bots,
   three custody patterns. A tally that counts nothing is exactly the kind of
   decorative claim this project exists to refuse.
3. **Anything that animates from `opacity: 0` must be pinned back to visible
   under `prefers-reduced-motion`.** Otherwise the page is blank for the
   readers who asked for less movement.

Every factual claim on this page (the mainnet signature, the custody bullets,
the bot links) should stay in sync with `docs/docs/how-it-works/security.md`
and `docs/docs/evidence/validation.md` in the main documentation site — don't
let this page drift into a stronger claim than what's actually documented and
tested there.
