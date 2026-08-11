// ----- Voyage theme: "the journey", WebGL rewrite (v2 — matched frame-by-frame to reference) -----
// The Canvas2D version of this engine (same shape math, same scroll-morph architecture) hit a
// hard ceiling: real glow/bloom needs either per-pixel blur (measured ~12fps full-canvas, ~24fps
// even blurring a small buffer — canvas 2D compositing cost here is dominated by destination
// area, not source size) or doubling per-particle draw calls (also ~2x frame cost). A GPU can do
// real bloom for a fraction of that cost, because it's a shader running once per pixel on
// dedicated hardware instead of a JS loop touching a software-rasterized canvas. This file is
// the same "one continuous particle field, scroll-driven keyframe morph" engine, rendered with
// Three.js `Points` (a custom shader for soft, *oriented/elongated* per-particle falloff — see
// aAngle/aStretch below) and postprocessing.UnrealBloomPass for the actual glow halo.
//
// v2 rewrite notes (full native-resolution, screen-cropped frame read of the reference video):
// the reference isn't a random point scatter — every shape reads as dense, fine FLOW LINES (hair-
// strand ribbing on the hero sphere, coiled strands on the DNA helix, horizontal wave-lines on the
// dune, tangential swirl-lines on the black hole) plus a bright FRESNEL RIM on every silhouette
// edge (edges glow much brighter than the interior — classic grazing-angle falloff). Neither of
// those survived into v1. Fixed here via: (a) per-particle `angle`/`stretch` fields so the point
// sprite renders as a short oriented streak instead of a circle (shape functions compute the local
// flow-tangent direction), (b) a rim-brightness term computed per shape from data the shape math
// already has (surface depth / band position / radial position), and (c) a real two-strand DNA
// double-helix chapter with connecting rungs + a bright central core-thread, replacing the old
// featureless "beam" chapter that had no equivalent in the reference at all.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

(function initJourneyScene() {
  const canvas = document.getElementById('journeyCanvas');
  const wrap = document.querySelector('.journey-wrap');
  const stage = document.querySelector('.journey-stage');
  const flashEl = document.querySelector('.journey-flash');
  if (!canvas || !wrap || !stage) return;

  const chapters = Array.from(document.querySelectorAll('.journey-chapter'));
  const stats = Array.from(document.querySelectorAll('.journey-stat'));

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const first = document.querySelector('.journey-chapter.chapter-hero');
    if (first) first.classList.add('is-active');
    return;
  }

  function hash(i, salt) {
    const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
    return x - Math.floor(x);
  }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smoothstep(t) { return t * t * (3 - 2 * t); }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  // HSL (hue 0-360, sat/light 0-100, matching the CSS-style values the shape functions already
  // return) -> RGB 0..1, for writing into the WebGL colour buffer.
  const tmpColor = new THREE.Color();
  function hslToRgb(h, s, l, out) {
    tmpColor.setHSL(((h % 360) + 360) % 360 / 360, s / 100, l / 100);
    out[0] = tmpColor.r; out[1] = tmpColor.g; out[2] = tmpColor.b;
  }

  let particles = [];
  let bgStars = [];
  function buildParticles() {
    // A WebGL point cloud costs one draw call regardless of count; the real per-particle cost is
    // the CPU-side shape math below, which is cheap trig — this density is still comfortably sub-
    // frame on real hardware.
    const n = window.innerWidth < 700 ? 6500 : 12000;
    particles = Array.from({ length: n }, (_, i) => ({
      u: hash(i, 1.7), v: hash(i, 5.3), r1: hash(i, 9.1), r2: hash(i, 13.4),
    }));
    const sn = window.innerWidth < 700 ? 200 : 380;
    bgStars = Array.from({ length: sn }, (_, i) => ({
      x: (hash(i, 21.4) - 0.5) * 2, y: (hash(i, 33.9) - 0.5) * 2, size: 1.2 + hash(i, 44.2) * 2.2,
      base: 0.15 + hash(i, 55.6) * 0.35, phase: hash(i, 66.8) * Math.PI * 2,
      speed: 0.6 + hash(i, 77.3) * 1.1,
    }));
  }
  buildParticles();

  // ---- shape functions: (p, time) -> {x, y, hue, sat?, light?, alpha, size, angle?, stretch?} ---
  // `angle` (radians) + `stretch` (elongation factor, 1 = circular dot) let the shader draw an
  // oriented streak instead of a soft circle — this is what turns a point cloud into the video's
  // "flow line" texture. Shapes that should read as fine dust (galaxy core, funnel/tunnel) leave
  // stretch low/near-1.
  function ringHue(a) {
    const s = (Math.sin(a) + 1) / 2;
    return lerp(355, 190, s);
  }
  function ringChaos(p, time) {
    const theta = p.v * Math.PI;
    const phi = p.u * Math.PI * 2 + time * 0.08;
    const sx = Math.sin(theta) * Math.cos(phi);
    const sy = Math.cos(theta);
    const sz = Math.sin(theta) * Math.sin(phi); // discarded depth axis — doubles as a fresnel term
    const turb = (p.r2 - 0.5) * 0.5 + Math.sin(time * 0.7 + p.u * 15 + p.v * 10) * 0.15;
    const R = 1 + turb;
    const vLine = Math.abs(((p.u * 24) % 1) - 0.5) < 0.12;
    const rim = Math.pow(1 - Math.min(1, Math.abs(sz)), 2.4);
    return {
      x: sx * R, y: sy * R * 0.95, hue: lerp(355, 190, (1 - sy) / 2),
      alpha: ((vLine ? 0.42 : 0.22) + p.r1 * 0.14) * (0.45 + rim * 0.75),
      size: (vLine ? 1.3 : 0.95) * (1 + rim * 0.5),
      angle: Math.PI / 2 + sx * 0.35, stretch: 2.0 + rim * 1.2,
    };
  }
  function ringClean(p, time) {
    // Settled hero shape: a genuinely FILLED disc (matches the reference — the sphere never reads
    // as hollow once it settles), not a thin outer band. `radialT` uses sqrt(p.v) so particles are
    // uniformly area-distributed across the whole disc instead of clustering at the centre.
    const a = p.u * Math.PI * 2 + time * 0.05;
    const radialT = Math.sqrt(p.v);
    const weave = Math.sin(a * 14 + radialT * 30) * 0.03 + Math.sin(a * 7 - radialT * 18 + time * 0.3) * 0.02;
    const rad = radialT * 1.02 + weave + (p.r2 - 0.5) * 0.02;
    const x = Math.cos(a) * rad, y = Math.sin(a) * rad * 0.94;
    const rim = smoothstep(0.5, 1.0, radialT);
    return {
      x, y, hue: ringHue(a),
      alpha: (0.2 + p.r1 * 0.1) * (1 + rim * 1.3),
      size: 0.9 * (1 + rim * 0.5),
      angle: Math.PI / 2 + Math.cos(a) * 0.35, stretch: 1.8 + rim * 1.3,
    };
  }
  function flowV(p, time, speed) { return (p.v + time * speed) % 1; }
  function edgeFade(v) { return Math.min(1, v * 14, (1 - v) * 14); }
  function twinFunnel(p, time) {
    // Particles sit on the *surface* of a cone (full 360° around at each height v), which is
    // correct — but viewed front-on with an orthographic camera and no near/far distinction, the
    // front and back arcs of that circle overlap in projection and the whole thing reads as one
    // flat, hard-edged, solid triangle instead of a hollow translucent tube. `nearness` (from
    // sin(a), the axis the camera can't otherwise see) fakes that depth cue back in: the near wall
    // stays bright, the far wall fades — which is also what breaks the silhouette out of a straight
    // taper into a rounded one.
    const side = p.u < 0.5 ? -1 : 1;
    const u2 = p.u < 0.5 ? p.u * 2 : (p.u - 0.5) * 2;
    const a = u2 * Math.PI * 2 + time * 0.04;
    const v = p.v;
    const wobble = 1 + 0.07 * Math.sin(a * 5 + v * 20 + time * 0.5) + 0.035 * Math.sin(a * 11 - v * 8 + time * 0.8);
    const radius = lerp(0.82, 0.04, Math.pow(v, 1.4)) * wobble;
    const converge = side * lerp(0.5, 0.02, v);
    const hue = side < 0 ? lerp(196, 224, v) : lerp(330, 300, v);
    const nearness = (Math.sin(a) + 1) / 2;
    const x = Math.cos(a) * radius + converge;
    return {
      x, y: lerp(-0.85, 0.95, v),
      hue, alpha: 0.12 + nearness * 0.5 + p.r1 * 0.12, size: lerp(1.5, 0.7, v) * (0.65 + nearness * 0.6),
      angle: Math.PI / 2 + x * 0.3, stretch: 1.3 + (1 - nearness) * 0.4,
    };
  }
  function tunnel(p, time) {
    const v = flowV(p, time, 0.05);
    const a = p.u * Math.PI * 2;
    const wobble = 1 + 0.06 * Math.sin(a * 6 - v * 22 + time * 0.6) + 0.03 * Math.sin(a * 13 + v * 9);
    const radius = lerp(1.0, 0.05, Math.pow(v, 1.3)) * wobble;
    const x = Math.cos(a) * radius;
    const nearness = (Math.sin(a) + 1) / 2;
    return {
      x, y: lerp(-1, 1.1, v), hue: lerp(210, 280, v),
      alpha: (0.1 + nearness * 0.45) * edgeFade(v), size: lerp(1.7, 0.6, v) * (0.65 + nearness * 0.6),
      angle: Math.PI / 2 + x * 0.3, stretch: 1.4,
    };
  }
  // DNA double helix: two coiled strands + periodic connecting "rungs" (base pairs) + a bright
  // central core-thread — this whole chapter was missing before (the old "beam" was a single
  // static vertical line with none of these). ~70% strand particles, ~18% rungs, ~12% core glow.
  function helixTangentAngle(strand, phase) {
    const dxdv = strand * Math.cos(phase) * 0.32 * (Math.PI * 4);
    return Math.atan2(2.2, dxdv);
  }
  function helix(p, time) {
    const v = flowV(p, time, 0.025);
    const phase = v * Math.PI * 4;
    const y = lerp(-1.1, 1.1, v);
    const fade = edgeFade(v);
    if (p.r1 < 0.18) {
      // rung: a short cross-bar connecting the two strands, quantized to discrete slots along v so
      // rungs read as periodic "steps" rather than a continuous smear.
      const slots = 24;
      const slotV = Math.round(v * slots) / slots;
      const slotPhase = slotV * Math.PI * 4;
      const half = Math.sin(slotPhase) * 0.32;
      const cross = (p.r2 - 0.5) * 2;
      const x = half * cross;
      const slotY = lerp(-1.1, 1.1, slotV);
      return {
        x, y: slotY, hue: 178, alpha: 0.4 * edgeFade(slotV), size: 0.85,
        angle: Math.atan2(0.001, half || 0.001), stretch: 1.7,
      };
    }
    if (p.r1 < 0.30) {
      // bright central core thread
      const jitter = (p.r2 - 0.5) * 0.04;
      return { x: jitter, y, hue: 190, sat: 40, light: 78, alpha: 0.5 * fade, size: 1.1, angle: Math.PI / 2, stretch: 2.6 };
    }
    const strand = p.u < 0.5 ? 1 : -1;
    const strandX = strand * Math.sin(phase) * 0.32;
    return {
      x: strandX, y, hue: 186, alpha: 0.5 * fade, size: 1.15,
      angle: helixTangentAngle(strand, phase), stretch: 3.2,
    };
  }
  function duneHue(u) {
    return u < 0.5 ? lerp(185, 275, u * 2) : lerp(275, 375, (u - 0.5) * 2) % 360;
  }
  function duneRidge(u, time) { return Math.sin(u * 9 + 1.4 + time * 0.35) * 0.14 + Math.sin(u * 15.5 - 0.6 + time * 0.55) * 0.07; }
  function duneAngle(u, time) {
    const eps = 0.01;
    const d = (duneRidge(Math.min(1, u + eps), time) - duneRidge(Math.max(0, u - eps), time)) / (2 * eps);
    return Math.atan2(d * 0.5, 2.6);
  }
  function dune(p, time) {
    const u = p.u;
    const x = lerp(-1.3, 1.3, u);
    const y = 0.15 + duneRidge(u, time) + (p.v - 0.5) * 0.5;
    return {
      x, y, hue: duneHue(u), alpha: Math.max(0.04, 0.5 - Math.abs(p.v - 0.5) * 0.8), size: 1.0,
      angle: duneAngle(u, time), stretch: 3.4,
    };
  }
  function gravityDip(p, time) {
    const u = p.u;
    const x = lerp(-1.3, 1.3, u);
    const dipAmt = Math.exp(-Math.pow((u - 0.5) * 3.2, 2)) * 1.15;
    const y = 0.1 + duneRidge(u, time) * 0.7 + dipAmt + (p.v - 0.5) * Math.max(0.08, 0.5 - dipAmt * 0.35);
    return {
      x, y, hue: duneHue(u), alpha: Math.max(0.04, 0.5 - Math.abs(p.v - 0.5) * 0.8), size: 1.0,
      angle: duneAngle(u, time) + dipAmt * 0.4, stretch: 3.2,
    };
  }
  function blackHoleHue(wrap) {
    return wrap < 0.5 ? lerp(196, 275, wrap * 2) : lerp(275, 375, (wrap - 0.5) * 2) % 360;
  }
  function blackHole(p, time) {
    const a = p.u * Math.PI * 2 + time * 0.5 * (1 - p.v * 0.85);
    const rad = lerp(0.06, 1.3, Math.pow(p.v, 0.6));
    const wrap = (Math.sin(a) + 1) / 2;
    const rim = Math.pow(1 - p.v, 1.6);
    return {
      x: Math.cos(a) * rad, y: Math.sin(a) * rad,
      hue: blackHoleHue(wrap), alpha: p.v < 0.05 ? 0 : (0.4 - p.v * 0.18) * (0.6 + rim * 1.0),
      size: lerp(0.6, 1.3, p.v) * (1 + rim * 0.4),
      angle: a + Math.PI / 2, stretch: 2.6 + rim * 0.9,
    };
  }
  const GALAXY_TILT = -0.22, GALAXY_SQUASH = 0.27;
  function galaxyHue(angle) {
    const side = (Math.cos(angle) + 1) / 2;
    return lerp(205, 340, side);
  }
  function galaxyTiltPoint(ex, ey) {
    return {
      x: ex * Math.cos(GALAXY_TILT) - ey * Math.sin(GALAXY_TILT),
      y: ex * Math.sin(GALAXY_TILT) + ey * Math.cos(GALAXY_TILT) + galaxyPushNorm,
    };
  }
  // The core reads as a lit sphere in the reference (bright/white on one side, deeper orange on the
  // other), not a flat glowing disc — approximate that with a fake hemisphere normal + a fixed
  // "sun direction" and shade per-particle from the dot product.
  const GALAXY_LIGHT = { x: -0.55, y: 0.62, z: 0.56 };
  function coreShade(ex, ey, coreR) {
    const rad2 = ex * ex + ey * ey;
    const z = Math.sqrt(Math.max(0, coreR * coreR - rad2));
    const len = Math.sqrt(rad2 + z * z) || 1;
    const dot = (ex / len) * GALAXY_LIGHT.x + (ey / len) * GALAXY_LIGHT.y + (z / len) * GALAXY_LIGHT.z;
    return clamp01(dot * 0.5 + 0.5);
  }
  function grainOf(p) { return 0.55 + (((p.r1 * 37.7 + p.r2 * 59.3) % 1)) * 0.9; }
  function galaxy(p, time) {
    if (p.v < 0.20) {
      // sqrt(r1): uniform area spread across the core disc, so particles don't all pile up at the
      // exact centre — that pile-up is what was clipping the whole core to solid white regardless
      // of the shading below (dozens of additive-blended layers saturate long before any one
      // particle's own alpha does).
      const coreR = 0.21;
      const ang = p.u * Math.PI * 2;
      const rad = Math.sqrt(p.r1) * coreR;
      const ex = Math.cos(ang) * rad, ey = Math.sin(ang) * rad * 0.82;
      const pt = galaxyTiltPoint(ex, ey);
      const shadeRaw = coreShade(ex, ey, coreR);
      const shade = Math.pow(shadeRaw, 1.4); // push contrast: shadow side stays dim/coloured, lit side blows toward white
      const grain = grainOf(p);
      return {
        ...pt, hue: lerp(24, 42, shadeRaw), sat: lerp(70, 20, shade), light: lerp(30, 95, shade),
        alpha: (0.08 + shade * 0.55) * (0.7 + grain * 0.5), size: (0.8 + shade * 1.1) * (0.65 + grain * 0.4),
        angle: 0, stretch: 1.1,
      };
    }
    if (p.v < 0.60) {
      const dT = (p.v - 0.20) / 0.40;
      const radius = lerp(0.16, 0.46, dT) + (p.r1 - 0.5) * 0.05;
      const angle = p.u * Math.PI * 2 + time * 0.04;
      const pt = galaxyTiltPoint(Math.cos(angle) * radius, Math.sin(angle) * radius * GALAXY_SQUASH);
      // coarse angular clumping so the disk reads as dusty/textured, not a smooth gradient wash
      const clump = 0.3 + 0.75 * Math.pow((Math.sin(angle * 5.3 + dT * 9) + 1) / 2, 2) * (0.5 + grainOf(p) * 0.5);
      return { ...pt, hue: galaxyHue(angle), light: 60, sat: 82, alpha: Math.max(0.04, 0.36 - dT * 0.18) * clump, size: (1.0 + clump * 0.7), angle: angle + Math.PI / 2 + GALAXY_TILT, stretch: 2.4 };
    }
    const rT = (p.v - 0.60) / 0.40;
    const radius = lerp(0.52, 0.7, rT) + (p.r1 - 0.5) * 0.035;
    const angle = p.u * Math.PI * 2 + time * 0.04 + rT * 0.15;
    const pt = galaxyTiltPoint(Math.cos(angle) * radius, Math.sin(angle) * radius * GALAXY_SQUASH);
    const ringHueVal = lerp(200, 232, (Math.cos(angle) + 1) / 2);
    return { ...pt, hue: ringHueVal, light: 68, sat: 92, alpha: 0.6, size: 1.5, angle: angle + Math.PI / 2 + GALAXY_TILT, stretch: 3.0 };
  }

  const stops = [
    { t: 0.000, fn: ringChaos },
    { t: 0.055, fn: ringClean },
    { t: 0.150, fn: ringClean },
    { t: 0.220, fn: twinFunnel },
    { t: 0.300, fn: tunnel },
    { t: 0.320, fn: helix },
    { t: 0.480, fn: helix },
    { t: 0.560, fn: dune },
    { t: 0.615, fn: dune },
    { t: 0.735, fn: gravityDip },
    { t: 0.800, fn: blackHole },
    { t: 0.860, fn: galaxy },
    { t: 1.000, fn: galaxy },
  ];
  function shapeAt(globalT) {
    let k = 0;
    while (k < stops.length - 2 && globalT > stops[k + 1].t) k++;
    const a = stops[k], b = stops[k + 1];
    const span = Math.max(1e-6, b.t - a.t);
    return { fnA: a.fn, fnB: b.fn, localT: smoothstep(Math.min(1, Math.max(0, (globalT - a.t) / span))) };
  }

  // ---- Three.js setup ----
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  camera.position.z = 5;

  // World units: shape-space "1.0" should cover the same fraction of the screen the Canvas2D
  // version did (`scale = min(w,h) * 0.42` there, against a full pixel dimension) — the camera
  // frustum's shorter axis spans -1..1 below, so a matching 0.84 world-scale here reproduces the
  // same visual proportions.
  const WORLD_SCALE = 0.84;

  const PARTICLE_PX = 2.7; // base on-screen point *thickness*; `stretch` elongates the long axis
  const particleGeo = new THREE.BufferGeometry();
  const particleMat = new THREE.ShaderMaterial({
    uniforms: { uPixelRatio: { value: 1 } },
    vertexShader: `
      attribute float aSize;
      attribute vec3 aColor;
      attribute float aAlpha;
      attribute float aAngle;
      attribute float aStretch;
      uniform float uPixelRatio;
      varying vec3 vColor;
      varying float vAlpha;
      varying float vAngle;
      varying float vStretch;
      void main() {
        vColor = aColor;
        vAlpha = aAlpha;
        vAngle = aAngle;
        vStretch = aStretch;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uPixelRatio * aStretch;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vAlpha;
      varying float vAngle;
      varying float vStretch;
      void main() {
        vec2 d = gl_PointCoord - vec2(0.5);
        float c = cos(vAngle), s = sin(vAngle);
        vec2 dr = vec2(d.x * c + d.y * s, -d.x * s + d.y * c);
        float dist = length(vec2(dr.x, dr.y * vStretch)) * 2.0;
        // taper the streak's long-axis ends a touch faster than a pure ellipse so it reads as a
        // soft line segment rather than a lozenge.
        float endTaper = smoothstep(1.0, 0.75, abs(dr.x) * 2.0);
        float falloff = smoothstep(1.0, 0.0, dist) * mix(1.0, endTaper, step(1.5, vStretch));
        float a = vAlpha * falloff;
        if (a < 0.006) discard;
        gl_FragColor = vec4(vColor, a);
      }
    `,
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
  });
  const particlePoints = new THREE.Points(particleGeo, particleMat);
  scene.add(particlePoints);

  const starGeo = new THREE.BufferGeometry();
  const starMat = particleMat.clone();
  const starPoints = new THREE.Points(starGeo, starMat);
  scene.add(starPoints);

  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.65, 0.3, 0.4);
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());

  let w = 0, h = 0, galaxyPushNorm = 0.7;
  function resize() {
    const dpr = Math.min(devicePixelRatio, 2);
    w = window.innerWidth; h = window.innerHeight;
    const aspect = w / h;
    if (aspect >= 1) { camera.left = -aspect; camera.right = aspect; camera.top = 1; camera.bottom = -1; }
    else { camera.left = -1; camera.right = 1; camera.top = 1 / aspect; camera.bottom = -1 / aspect; }
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h);
    composer.setSize(w, h);
    bloomPass.setSize(w, h);
    particleMat.uniforms.uPixelRatio.value = dpr;
    starMat.uniforms.uPixelRatio.value = dpr;
    // Same reasoning as the Canvas2D version: the galaxy needs to clear the chapter text block, a
    // fixed fraction of *viewport height* — converted here from pixels into shape-space units via
    // the current camera's vertical half-extent (camera.top world-units span h/2 CSS px).
    galaxyPushNorm = (0.68 * camera.top) / WORLD_SCALE;
    buildParticles();
    buildStarBuffers();
  }

  function buildStarBuffers() {
    const n = bgStars.length;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = bgStars[i].x * (camera.right); pos[i * 3 + 1] = bgStars[i].y * (camera.top); pos[i * 3 + 2] = 0;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    starGeo.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    starGeo.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(n), 1));
    starGeo.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(n).fill(PARTICLE_PX * 0.85), 1));
    starGeo.setAttribute('aAngle', new THREE.BufferAttribute(new Float32Array(n), 1));
    starGeo.setAttribute('aStretch', new THREE.BufferAttribute(new Float32Array(n).fill(1), 1));
  }

  function updateChapters(t) {
    chapters.forEach((el) => {
      const from = parseFloat(el.dataset.from), to = parseFloat(el.dataset.to);
      el.classList.toggle('is-active', t >= from && t <= to);
    });
    stats.forEach((el) => {
      const from = parseFloat(el.dataset.from), to = parseFloat(el.dataset.to);
      el.classList.toggle('is-active', t >= from && t <= to);
    });
  }

  let targetT = 0;
  function onScroll() {
    const rect = wrap.getBoundingClientRect();
    const total = wrap.offsetHeight - window.innerHeight;
    const effective = total * 0.85;
    targetT = Math.min(1, Math.max(0, effective > 0 ? -rect.top / effective : 0));
  }

  let displayT = 0;
  let running = false, rafId = null;
  const clockStart = performance.now();

  function flashAmount(t) {
    const d = Math.abs(t - 0.830) / 0.026;
    return d >= 1 ? 0 : Math.pow(1 - d, 2);
  }

  const posAttr = () => particleGeo.getAttribute('position');
  const colAttr = () => particleGeo.getAttribute('aColor');
  const alphaAttr = () => particleGeo.getAttribute('aAlpha');
  const sizeAttr = () => particleGeo.getAttribute('aSize');
  const angleAttr = () => particleGeo.getAttribute('aAngle');
  const stretchAttr = () => particleGeo.getAttribute('aStretch');
  const rgbTmp = [0, 0, 0];

  function ensureParticleBuffers() {
    const n = particles.length;
    particleGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    particleGeo.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    particleGeo.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(n), 1));
    particleGeo.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(n), 1));
    particleGeo.setAttribute('aAngle', new THREE.BufferAttribute(new Float32Array(n), 1));
    particleGeo.setAttribute('aStretch', new THREE.BufferAttribute(new Float32Array(n), 1));
  }

  let lastFrameTime = performance.now();
  function render(now) {
    const time = (now - clockStart) / 1000;
    const dt = Math.min(0.1, (now - lastFrameTime) / 1000);
    lastFrameTime = now;
    // Exponential decay expressed per *second*, not per frame — `+= gap * 0.08` was tuned at an
    // assumed 60fps and silently becomes a much slower catch-up on any slower device (a dropped
    // frame there isn't just choppier, the scroll response itself lags further behind).
    const ease = 1 - Math.pow(1 - 0.08, dt * 60);
    displayT += (targetT - displayT) * ease;
    updateChapters(displayT);
    const { fnA, fnB, localT } = shapeAt(displayT);

    const pos = posAttr(), col = colAttr(), alp = alphaAttr(), siz = sizeAttr();
    const ang = angleAttr(), str = stretchAttr();
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const A = fnA(p, time), B = fnB(p, time);
      const x = lerp(A.x, B.x, localT), y = lerp(A.y, B.y, localT);
      const hue = lerp(A.hue, B.hue, localT);
      const sat = lerp(A.sat ?? 92, B.sat ?? 92, localT);
      const light = lerp(A.light ?? 68, B.light ?? 68, localT);
      const size = lerp(A.size, B.size, localT);
      const stretch = lerp(A.stretch ?? 1, B.stretch ?? 1, localT);
      const angle = lerp(A.angle ?? 0, B.angle ?? 0, localT);
      const twinkle = 0.68 + 0.36 * Math.sin(time * 1.8 + p.r1 * 62.8 + p.r2 * 11);
      const alpha = Math.min(1, lerp(A.alpha, B.alpha, localT) * twinkle);
      // Every shape function was written against Canvas2D's y-down convention (matching the
      // original engine, and easier to reason about against video frames read top-to-bottom).
      // Three.js/WebGL is y-up, so this is the one place that gets flipped, rather than
      // rewriting every shape function's sign conventions.
      pos.array[i * 3] = x * WORLD_SCALE; pos.array[i * 3 + 1] = -y * WORLD_SCALE; pos.array[i * 3 + 2] = 0;
      hslToRgb(hue, sat, light, rgbTmp);
      col.array[i * 3] = rgbTmp[0]; col.array[i * 3 + 1] = rgbTmp[1]; col.array[i * 3 + 2] = rgbTmp[2];
      alp.array[i] = alpha;
      siz.array[i] = size * PARTICLE_PX;
      ang.array[i] = -angle; // y-flip above mirrors angles too; undo that for the streak orientation
      str.array[i] = Math.max(1, stretch);
    }
    pos.needsUpdate = true; col.needsUpdate = true; alp.needsUpdate = true; siz.needsUpdate = true;
    ang.needsUpdate = true; str.needsUpdate = true;

    const sCol = starGeo.getAttribute('aColor'), sAlp = starGeo.getAttribute('aAlpha');
    for (let i = 0; i < bgStars.length; i++) {
      const s = bgStars[i];
      const tw = Math.max(0, s.base + Math.sin(time * s.speed + s.phase) * s.base * 0.8);
      sCol.array[i * 3] = 0.82; sCol.array[i * 3 + 1] = 0.86; sCol.array[i * 3 + 2] = 1.0;
      sAlp.array[i] = tw;
    }
    sCol.needsUpdate = true; sAlp.needsUpdate = true;

    if (flashEl) {
      const flash = flashAmount(displayT);
      flashEl.style.opacity = flash > 0.002 ? flash.toFixed(3) : '0';
    }

    composer.render();
    rafId = requestAnimationFrame(render);
  }
  function start() { if (running) return; running = true; rafId = requestAnimationFrame(render); }
  function stop() { running = false; if (rafId) cancelAnimationFrame(rafId); }

  resize();
  ensureParticleBuffers();
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { resize(); ensureParticleBuffers(); onScroll(); }, 150);
  });
  new IntersectionObserver((entries) => {
    entries.forEach((entry) => (entry.isIntersecting ? start() : stop()));
  }, { rootMargin: '200px 0px' }).observe(wrap);
})();
