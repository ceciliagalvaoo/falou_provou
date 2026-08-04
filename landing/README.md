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

- `index.html` — all copy and structure.
- `styles.css` — the whole design system (palette, type, the `falou`/`PROVOU` lockup, the states cards, the looping demo animation) as CSS custom properties at the top of the file.
- `assets/mark.svg` — the claw + stamp mark, used as both the favicon and the header/hero icon.

Every factual claim on this page (the mainnet signature, the custody bullets, the bot links) should stay in sync with `docs/docs/security.md` and `docs/docs/validation.md` in the main documentation site — don't let this page drift into a stronger claim than what's actually documented and tested there.
