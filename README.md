# IT Gurujan — Studio Website

Source for [itgurujan.com](https://itgurujan.com) — the marketing site for IT Gurujan, a software development studio specializing in Frappe/ERPNext implementation, AI-powered business tools, and custom web/mobile apps.

Static site, no build step, no framework — plain HTML/CSS/JS.

## Features

- **Five switchable themes**, each its own subdomain/folder, picked via the navbar pill and persisted in `localStorage`:
  - **Cinematic** (`theme1/`, `theme1.itgurujan.com`) — dark, WebGL particle field + rotating glass torus.
  - **Experience** (`theme2/`, `theme2.itgurujan.com`) — heavier 3D scene with a code-generated "IG" monogram.
  - **Light** (`/`, `itgurujan.com`) — fully light, no dark base.
  - **Nebula** (`theme3/`, `theme3.itgurujan.com`) — warm/cool plasma portal ring, colourful starfield.
  - **Voyage** (`theme4/`, `theme4.itgurujan.com`) — pure-black cosmic scroll journey recreating a reference video: aurora portal hero, particle terrain with a gravity well, a black-hole vortex divider, and a galaxy of orbit rings. See [`theme4/README.md`](theme4/README.md) and [`RECREATING-VIDEO-DESIGNS.md`](RECREATING-VIDEO-DESIGNS.md) for how it was built from the source video.
- **Real WebGL, not a decoration** — every dark theme's hero scene is hand-written WebGL: a depth-sorted particle field plus procedurally generated 3D geometry (torus, icosahedra, a plasma ring, and a custom "IG" monogram built from code, not an imported model), with mouse-driven parallax. Falls back to a 2D canvas if WebGL isn't available, and respects `prefers-reduced-motion`.
- **Lightbox gallery** for project screenshots, with keyboard navigation.
- Fully responsive, mobile menu, scroll-reveal animations.

## Structure

```
index.html               Light theme (this folder is also the site root)
theme1/ theme2/ theme3/ theme4/   One folder per other theme, same layout as below
assets/
  css/style.css           Shared across all five folders — theme system via [data-theme] overrides
  js/script.js            Shared across all five folders — theme picker, scroll/reveal, lightbox, WebGL + Canvas2D scenes
  img/                    Screenshots, project images, brand assets
```

`assets/css/style.css` and `assets/js/script.js` are **byte-identical** in every theme folder — one shared pair of files, deployed five times. Edit them in one place, then copy into all five folders before deploying.

## Running locally

No build step — just serve the folder statically, e.g.:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Deployment

Deployed via SFTP to Hostinger. When `style.css` or `script.js` change, bump the `?v=N` query string on their `<link>`/`<script>` tags in `index.html` — static assets are cached for 7 days at the edge, and the version bump is what forces a fresh fetch.

## Stack

Vanilla HTML/CSS/JS · Google Fonts (Inter, Sora, JetBrains Mono) · raw WebGL (no Three.js) · zero dependencies.
