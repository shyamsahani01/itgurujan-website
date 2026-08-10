# IT Gurujan — Studio Website (Voyage theme)

Source for the **Voyage** variant of [itgurujan.com](https://itgurujan.com) — the marketing site for IT Gurujan, a software development studio specializing in Frappe/ERPNext implementation, AI-powered business tools, and custom web/mobile apps.

Static site, no build step, no framework — plain HTML/CSS/JS. This folder is deployed to `theme4.itgurujan.com`.

## What "Voyage" is

Built to recreate a specific reference video — an "AI overdoes a simple brief" showcase of a pure-black cosmic scroll site. The video isn't a few static decorated sections; it's **one continuous particle field that morphs shape as you scroll**: a boot sequence, a woven-light ring forming out of chaos, splitting into twin funnels, merging into a flythrough tunnel, opening into a beam that braids into a DNA double-helix (with stat cards flying in/out), unspooling into a terrain ridge, dipping into a real gravity well, collapsing into a black hole, and dissolving into a spiral galaxy. See [`../RECREATING-VIDEO-DESIGNS.md`](../RECREATING-VIDEO-DESIGNS.md) — including the note on watching the full video frame-by-frame, not a sparse sample — for the reusable recipe.

The first build of this theme replicated the individual "poses" (ring / terrain / black hole / galaxy) as four separate decorative canvases sitting behind normal content. That undersold the source by a lot — the fluid, unbroken morph *is* the effect. It was rebuilt as **one scroll-pinned particle system** instead:

| Reference video beat | Where it landed here |
|---|---|
| Boot sequence, ring forming out of chaos, kicker + headline + dual CTA | `.chapter-hero`, t ≈ 0–0.17 of the journey |
| Twin funnels → tunnel flythrough | unlabeled, t ≈ 0.17–0.36 — pure shape, no copy, matching the video |
| Beam → braided double-strand → DNA helix, stat cards flying in/out | t ≈ 0.30–0.60 — 3 real credentials ("6+ Years", "3 Live Builds", "Hindi + English") instead of invented SaaS metrics |
| Terrain ridge dipping into a gravity well | `.chapter-dune`, t ≈ 0.60–0.79 — teases the Gurujan Chat Bot section below |
| Full black hole (event horizon) | t ≈ 0.80–0.84, pure shape |
| Spiral galaxy | `.chapter-galaxy`, t ≈ 0.84–1.0 — teases the in-house app family below |
| Numbered kickers ("01 —", "02 —" …) | Every section tag on the page, `01` through `10` |
| Floating pill nav, glass CTA buttons, no gradient fills | Global — overrides `.navbar`, `.btn-primary`, `.btn-ghost` |

**Deliberately not replicated:** the source video also renames its own nav logo per scroll chapter (STRUCTURE → FLOW → VOYAGE → COSMOS) as part of its joke about an AI going overboard. Doing that here would mean the site's own brand name changing while you scroll — good for a satire reel, bad for a real business's nav — so IT Gurujan's nav stays IT Gurujan throughout.

## Structure

```
index.html              Single-page site — journey hero, services, product spotlight, work, process, about, contact
assets/
  css/style.css          Shared with every theme folder — theme system via [data-theme], "voyage" block is theme-specific
  js/script.js            Shared with every theme folder — theme picker, scroll/reveal, lightbox, WebGL hero (themes 1–3), Voyage's journey engine
  img/                   Screenshots, project images, brand assets
```

`assets/css/style.css` and `assets/js/script.js` are **byte-identical** across `theme1/`, `theme2/`, `theme3/`, `theme4/` and the repo root — one shared pair of files, deployed five times, switched by the `data-theme` attribute on `<html>` in each folder's own `index.html`. When you edit either file, copy it into all five folders before deploying (see the root README's deployment note).

## The journey engine (Voyage-only)

`initJourneyScene()` in `script.js` is a no-op if `#journeyCanvas` isn't present, so the shared file stays safe on themes 1–3 and the root. How it works:

- `.journey-wrap` is a tall (`600vh`) wrapper; `.journey-stage` is `position: sticky; top: 0; height: 100vh` inside it, so the canvas + copy stay pinned to the viewport for the whole scroll run.
- Every particle gets a fixed `(u, v)` coordinate pair, generated once from a deterministic hash of its index — **not** re-randomized per frame. Each shape (ring, tunnel, beam, helix, dune, gravity well, black hole, galaxy) is a pure function `(u, v) → {x, y, hue, alpha, size}`. Because the same particle index maps through every shape function, the whole cloud reads as one object deforming, not a cut between scenes.
- A keyframe schedule maps global scroll-progress `t ∈ [0,1]` to the two neighbouring shape functions; every particle is drawn at the position lerped (with a smoothstep ease) between them, every frame.
- `.journey-chapter` and `.journey-stat` elements carry `data-from`/`data-to` attributes; a scroll listener toggles their `.is-active` class based on where `t` currently sits — that's the copy/stat-card choreography, driven by the same `t` as the particles.
- `prefers-reduced-motion` skips the whole pinned/animated experience entirely: no scroll-jack, no canvas, just the hero chapter's copy shown in place.

## Running locally

No build step — just serve the folder statically, e.g.:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Deployment

Deployed via SFTP to Hostinger, to the `theme4.itgurujan.com` subdomain. When `style.css` or `script.js` change, bump the `?v=N` query string on their `<link>`/`<script>` tags in **every** theme's `index.html` (they share the same cached files) — static assets are cached for 7 days at the edge, and the version bump is what forces a fresh fetch.

## Stack

Vanilla HTML/CSS/JS · Google Fonts (Inter, Sora, JetBrains Mono) · Canvas2D scroll-pinned particle-morph journey · zero dependencies.
