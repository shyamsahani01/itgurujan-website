# IT Gurujan — Studio Website

Source for [itgurujan.com](https://itgurujan.com) — the marketing site for IT Gurujan, a software development studio specializing in Frappe/ERPNext implementation, AI-powered business tools, and custom web/mobile apps.

Static site, no build step, no framework — plain HTML/CSS/JS.

## Features

- **Four switchable themes** — Cinematic (dark, WebGL particle/3D scene), Signature (alternating light/dark sections), Experience (heavier 3D scene with a code-generated "IG" monogram), and Light. Picked via the navbar icon, persisted in `localStorage`.
- **Real WebGL, not a decoration** — the Cinematic/Experience hero scenes are hand-written WebGL: a depth-sorted particle field plus procedurally generated 3D geometry (torus, icosahedra, and a custom "IG" monogram built from code, not an imported model), with mouse-driven parallax. Falls back to a 2D canvas if WebGL isn't available, and respects `prefers-reduced-motion`.
- **Lightbox gallery** for project screenshots, with keyboard navigation.
- Fully responsive, mobile menu, scroll-reveal animations.

## Structure

```
index.html              Single-page site — hero, services, product spotlight, work, process, about, contact
assets/
  css/style.css          All styling, incl. the theme system (CSS custom properties + [data-theme] overrides)
  js/script.js           Theme picker, scroll/reveal logic, lightbox, WebGL scene
  img/                   Screenshots, project images, brand assets
```

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
