# Recreating a website design from a reference video

A reusable recipe for "I have a video of a website design I like, build something like it" requests. Written after building the **Voyage** theme (`theme4/`) from a 13-second reference clip. Keep this file up to date if the process changes — it's meant to be reused, not a one-off note.

## Why this exists

This exact request had been asked for before and didn't get built — the video was acknowledged but never actually opened and translated into a real theme. The first fix was "extract frames and read them" — an improvement, but still not enough: the first attempt at Voyage sampled frames sparsely (every other frame at 2fps) and read about half of *those*, and shipped four separate static-looking background decorations. The user's response was blunt and correct: "video me bahut saare cool animaction hai... apan ne wo 5% use kiya hai" (the video has a lot of cool animation, we only used 5% of it). Re-watching properly — 6fps, every single frame, in order — showed the real structure: **one continuous particle system that morphs shape for the whole scroll**, not a handful of poses. That distinction is the actual lesson here, not "extract frames" in the abstract.

## Step 1 — Actually watch the whole video, at high enough density, frame by frame

Claude Code cannot open a video directly, but it can pull still frames and read those as images. No paid tooling needed:

```bash
# ffmpeg isn't always installed, and apt install needs sudo (a password prompt).
# imageio-ffmpeg ships a static ffmpeg binary and installs to the user's own
# ~/.local — no sudo, no system changes:
pip3 install --user --break-system-packages imageio-ffmpeg

FFMPEG=$(python3 -c "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())")

# Check duration/resolution first so the frame count is sane:
$FFMPEG -i "/path/to/video.mp4" 2>&1 | grep -E "Duration|Stream"

# Pull frames — 6fps for anything with continuous motion/morphing (most of these videos).
# 2fps is only safe for something that's genuinely a slideshow of static screens.
mkdir -p /tmp/frames
$FFMPEG -i "/path/to/video.mp4" -vf "fps=6" -q:v 2 /tmp/frames/f%03d.jpg -y
```

Then **read every single frame, in order, with the Read tool** — not every other one, not a "representative sample." A 13-second clip at 6fps is ~80 frames; that's a real but affordable number of Read calls, and it's the difference between seeing a shape mid-transition (a ring literally splitting into two funnels) versus seeing only its start and end state and guessing what happened between them. Skipping frames to save time is exactly how the first Voyage attempt reduced a continuous morphing particle system down to four disconnected static poses — it wasn't a fidelity trade-off, it was missing information.

Two follow-up questions worth answering while watching, not after:
- **Is this actually one continuous thing, or several discrete things?** If a shape at frame 20 and a shape at frame 40 look different, watch frames 21–39 before assuming they're separate "scenes" — they're very often one object deforming.
- **What text/UI is on screen only briefly?** Loading states, counters, stat cards that fly in and out, labels that change — these read as noise in a sparse sample and as clear, describable beats in a dense one.

**Resources needed:** none paid, no API keys, no GPU. Just `pip3 install --user` rights, which every environment has. This is the whole "resource" question answered — nothing extra to ask the user for at this step.

## Step 2 — Read the frames like a design spec, not just "cool visuals"

For each distinct scene/section in the video, write down (mentally or in scratch notes):
- **Copy**: exact headline text, kicker/eyebrow labels, button labels, any body copy visible.
- **Layout**: where is text anchored (centered vs. left-aligned), how much breathing room, is there a product screenshot or is it text-only over a background scene.
- **Motion language**: what's actually animating — a particle field, a morphing shape, an orbit, a wave — and roughly how (colour gradient direction, speed, whether it reacts to scroll/mouse).
- **Chrome**: nav style (full-width bar vs. floating pill), button style (filled gradient vs. glass/outline), typography weight and casing.

This becomes the checklist the rebuild gets judged against — not a vague "cosmic vibe."

## Step 3 — Identify the *engine*, not just the poses

Once every frame is read, name the actual mechanism before writing any code. For Voyage, the mechanism was: one particle field, a few thousand points, that has a different target shape at each point in the scroll, with positions interpolated between neighbouring shapes as the user scrolls — not eight separate animations. That single sentence is what a "static decorations behind content" build misses entirely, no matter how good each individual decoration looks. If the reference is scroll-driven, sketch the scroll-progress timeline (what shape/state owns which portion of scroll `t ∈ [0,1]`) before touching a canvas — that timeline *is* the spec.

## Step 4 — Map every chapter of that engine onto *real* content, don't invent filler

The biggest trap is copying the video's generic SaaS copy verbatim ("Everything revolves around one thing — your growth") onto a site that sells something else entirely. Instead, for each chapter/beat in the timeline from Step 3, ask "which real section of *this* business's site could this back, honestly?" For IT Gurujan's Voyage theme:

| Video chapter (by scroll-t) | Honest real-content match |
|---|---|
| Boot + ring forming, kicker + big headline | The actual hero — same brand headline, new chrome |
| Tunnel flythrough (pure shape, no text in the source either) | Left as pure shape — not every beat needs manufactured copy |
| Beam → DNA helix, with flying stat cards | Real credentials as the stat cards ("6+ Years ERPNext", "3 Live Builds", "Hindi + English") instead of invented SaaS metrics like "22%+ performance" |
| Terrain dipping into a gravity well | Teaser copy for the AI chatbot product section — "grounded in real data" is a genuine, true echo of the metaphor |
| Black hole (brief, pure shape in the source too) | Left as pure shape — a transition beat, not content |
| Spiral galaxy | Teaser copy for the literal family of in-house apps (HR Next / Health / Bill Gurujan) — an actual small ecosystem, not a metaphor stretch |

If a beat doesn't have an honest content match anywhere on the site, it's fine to leave it as pure visual transition rather than manufacture a fake headline just to tick a box — the source video does this too (long stretches with no text at all).

One deliberate cut is worth naming explicitly to the user rather than silently dropping: the source video renames its own nav logo per chapter (STRUCTURE → FLOW → VOYAGE → COSMOS) as part of its own joke about an AI overdoing a brief. That's fine for a satire reel; it's not fine for a real business's nav to relabel itself mid-scroll. Skip gags like that on purpose, and say so.

## Step 5 — Build with what the project already uses, don't add dependencies to chase fidelity

Check the existing stack before reaching for a new library. This site is vanilla HTML/CSS/JS with hand-written WebGL and zero dependencies (see the root `README.md`). The journey engine stayed inside that: one `<canvas>`, `position: sticky` for the pin (no scroll-jacking library), a plain scroll listener computing progress, and a hand-written particle-morph loop — no Three.js, no GSAP, no ScrollTrigger. A real depth-sorted 3D version (actual WebGL geometry instead of 2D points, real GLSL noise) would look closer still, but that's a genuinely bigger, riskier build. **Surface that trade-off to the user rather than silently picking one**: "I can get very close with what the site already uses (free, zero new risk); a shader/3D-library version would look even closer but costs real dev time and can break in subtler ways." Let them choose if it matters — usually the vanilla version is close enough.

## Step 6 — Don't screenshot-loop to verify

Per this user's standing preference (see memory `feedback_no_screenshot_testing`), don't burn turns on screenshot → tweak → screenshot cycles for visual verification — that applies to this website work too, not just the mobile apps it was first said about. Build carefully, review the diff/code by eye, serve it locally (`python3 -m http.server`) so the user can check it themselves, and say plainly what to look at. If something in the build is genuinely uncertain, say so rather than silently shipping a guess.

## Checklist for next time

1. `pip3 install --user --break-system-packages imageio-ffmpeg` → extract **every** frame at a density that actually captures the motion (6fps default, not 2fps) → read **every** frame, in order, not a sparse sample.
2. Name the underlying engine/mechanism before coding — is it one continuous system (a morph, a scroll-pin) or genuinely several discrete pieces? Sketch the scroll-progress timeline if it's scroll-driven; that timeline is the spec.
3. Map each chapter/beat of that timeline to a real, honest content section — pure-shape/no-text beats in the source can stay pure-shape here too, and gags specific to the source (e.g. a nav that relabels itself) get cut on purpose, not by accident.
4. Reuse the project's existing stack/patterns before adding a dependency; flag the fidelity/effort trade-off if a step up (shaders, a 3D lib) would matter.
5. No screenshot-loop verification — build carefully, serve locally, tell the user what to check.
