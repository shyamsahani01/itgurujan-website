// ===================== IT Gurujan — Orbit edition =====================
// Standard site plumbing (nav, reveal engine, lightbox) first, then the WebGL orbital
// flythrough (initOrbitScene) at the bottom.

// ----- Theme menu -----
const themeToggle = document.getElementById('themeToggle');
const themeMenu = document.getElementById('themeMenu');
if (themeToggle && themeMenu) {
  function closeThemeMenu() {
    themeMenu.classList.remove('open');
    themeToggle.setAttribute('aria-expanded', 'false');
  }
  themeToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const willOpen = !themeMenu.classList.contains('open');
    themeMenu.classList.toggle('open', willOpen);
    themeToggle.setAttribute('aria-expanded', String(willOpen));
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.theme-picker')) closeThemeMenu();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeThemeMenu(); });
}

// ----- Scroll progress -----
const scrollProgress = document.getElementById('scrollProgress');
window.addEventListener('scroll', () => {
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const pct = docHeight > 0 ? (window.scrollY / docHeight) * 100 : 0;
  if (scrollProgress) scrollProgress.style.width = pct + '%';
}, { passive: true });

// ----- Mobile menu -----
const navToggle = document.getElementById('navToggle');
const mobileMenu = document.getElementById('mobileMenu');
if (navToggle && mobileMenu) {
  navToggle.addEventListener('click', () => {
    navToggle.classList.toggle('open');
    mobileMenu.classList.toggle('open');
    document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
  });
  mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navToggle.classList.remove('open');
      mobileMenu.classList.remove('open');
      document.body.style.overflow = '';
    });
  });
}

// ----- Active nav link on scroll -----
const navSections = document.querySelectorAll('main section[id], header[id]');
const navLinks = document.querySelectorAll('.nav-link');
const navObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.getAttribute('id');
      navLinks.forEach(link => link.classList.toggle('active', link.getAttribute('href') === `#${id}`));
    }
  });
}, { threshold: 0.4 });
navSections.forEach(sec => navObserver.observe(sec));

// ----- Scroll-reveal engine -----
const revealEls = document.querySelectorAll('[data-reveal]');
revealEls.forEach(el => {
  const group = el.closest('[data-stagger]');
  if (group) {
    const siblings = Array.from(group.querySelectorAll('[data-reveal]'));
    const i = siblings.indexOf(el);
    el.style.transitionDelay = `${Math.min(i * 90, 540)}ms`;
  }
});
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
revealEls.forEach(el => revealObserver.observe(el));

// ----- Lightbox -----
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
const lightboxClose = document.getElementById('lightboxClose');
const lightboxPrev = document.getElementById('lightboxPrev');
const lightboxNext = document.getElementById('lightboxNext');
const lightboxTitle = document.getElementById('lightboxTitle');
const lightboxCaption = document.getElementById('lightboxCaption');
const lightboxCounter = document.getElementById('lightboxCounter');
let galleryImgs = [], galleryIndex = 0;
function updateLightbox() {
  const img = galleryImgs[galleryIndex];
  if (!img) return;
  lightboxImg.src = img.src;
  lightboxImg.alt = img.alt;
  lightboxTitle.textContent = img.getAttribute('data-title') || '';
  lightboxCaption.textContent = img.alt || '';
  const multi = galleryImgs.length > 1;
  lightboxCounter.textContent = multi ? `${galleryIndex + 1} / ${galleryImgs.length}` : '';
  lightboxPrev.style.display = multi ? 'flex' : 'none';
  lightboxNext.style.display = multi ? 'flex' : 'none';
}
function openLightbox(imgs, index) { galleryImgs = imgs; galleryIndex = index; updateLightbox(); lightbox.classList.add('open'); }
function closeLightbox() { lightbox.classList.remove('open'); lightboxImg.src = ''; }
document.querySelectorAll('[data-lightbox-group]').forEach(group => {
  const imgs = Array.from(group.querySelectorAll('img'));
  imgs.forEach((img, i) => img.addEventListener('click', () => openLightbox(imgs, i)));
});
if (lightboxPrev) lightboxPrev.addEventListener('click', (e) => { e.stopPropagation(); galleryIndex = (galleryIndex - 1 + galleryImgs.length) % galleryImgs.length; updateLightbox(); });
if (lightboxNext) lightboxNext.addEventListener('click', (e) => { e.stopPropagation(); galleryIndex = (galleryIndex + 1) % galleryImgs.length; updateLightbox(); });
if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
if (lightbox) {
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') lightboxPrev.click();
    if (e.key === 'ArrowRight') lightboxNext.click();
  });
}

// ----- Footer year -----
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// ===================== THE ORBIT — hand-rolled WebGL solar-system flythrough =====================
// A literal orbital-system metaphor: a glowing amber core sphere (IT Gurujan / ERPNext) with a
// fresnel-glow atmosphere shell, seven smaller orbiting bodies (one per service) on tilted
// elliptical orbits at increasing depth, and a 3D starfield. Scroll position drives a virtual
// camera through the scene via hand-picked keyframes (own math below — raw WebGL, no libraries).
(function initOrbitScene() {
  const canvas = document.getElementById('orbitCanvas');
  const wrap = document.querySelector('.orbit-wrap');
  const stage = document.querySelector('.orbit-stage');
  if (!canvas || !wrap || !stage) return;

  const chapters = Array.from(document.querySelectorAll('.orbit-chapter'));

  // Reduced motion: skip WebGL entirely. CSS collapses .orbit-wrap to normal height and shows
  // every chapter (hero copy, core, all 7 services) stacked as a plain readable list.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    chapters.forEach(el => el.classList.add('is-active'));
    return;
  }

  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) return initOrbit2DFallback(canvas, wrap, chapters);

  // ---------------- math helpers (column-major mat4, matches WebGL's native layout) ----------------
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function smoothstep(t) { return t * t * (3 - 2 * t); }
  function sub3(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function cross3(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function dot3(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function normalize3(v) { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }

  function mat4Perspective(fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
  }
  function mat4LookAt(eye, center, up) {
    const zAxis = normalize3(sub3(eye, center));
    const xAxis = normalize3(cross3(up, zAxis));
    const yAxis = cross3(zAxis, xAxis);
    return new Float32Array([
      xAxis[0], yAxis[0], zAxis[0], 0,
      xAxis[1], yAxis[1], zAxis[1], 0,
      xAxis[2], yAxis[2], zAxis[2], 0,
      -dot3(xAxis, eye), -dot3(yAxis, eye), -dot3(zAxis, eye), 1,
    ]);
  }
  function mat4Multiply(a, b) {
    const out = new Float32Array(16);
    for (let col = 0; col < 4; col++) {
      for (let row = 0; row < 4; row++) {
        let sum = 0;
        for (let k = 0; k < 4; k++) sum += a[k * 4 + row] * b[col * 4 + k];
        out[col * 4 + row] = sum;
      }
    }
    return out;
  }
  function mat4Translation(x, y, z) { return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]); }
  function mat4RotationX(r) { const c = Math.cos(r), s = Math.sin(r); return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]); }
  function mat4RotationY(r) { const c = Math.cos(r), s = Math.sin(r); return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]); }
  function mat4Scale(s) { return new Float32Array([s, 0, 0, 0, 0, s, 0, 0, 0, 0, s, 0, 0, 0, 0, 1]); }

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn('Orbit shader error:', gl.getShaderInfoLog(s)); return null; }
    return s;
  }
  function makeProgram(vertSrc, fragSrc) {
    const vs = compile(gl.VERTEX_SHADER, vertSrc), fs = compile(gl.FRAGMENT_SHADER, fragSrc);
    if (!vs || !fs) return null;
    const p = gl.createProgram();
    gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.warn('Orbit link error:', gl.getProgramInfoLog(p)); return null; }
    return p;
  }

  // ---------------- geometry: a unit lat/long sphere (shared for the core + every orbiting body) ----------------
  function createSphere(latBands, lonBands) {
    const positions = [], normals = [], indices = [];
    for (let lat = 0; lat <= latBands; lat++) {
      const theta = (lat / latBands) * Math.PI, sinT = Math.sin(theta), cosT = Math.cos(theta);
      for (let lon = 0; lon <= lonBands; lon++) {
        const phi = (lon / lonBands) * Math.PI * 2, sinP = Math.sin(phi), cosP = Math.cos(phi);
        const x = cosP * sinT, y = cosT, z = sinP * sinT;
        positions.push(x, y, z); normals.push(x, y, z);
      }
    }
    for (let lat = 0; lat < latBands; lat++) {
      for (let lon = 0; lon < lonBands; lon++) {
        const a = lat * (lonBands + 1) + lon, b = a + lonBands + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    return { positions: new Float32Array(positions), normals: new Float32Array(normals), indices: new Uint16Array(indices) };
  }

  const isSmall = window.innerWidth < 700;
  const sphereGeo = createSphere(isSmall ? 12 : 22, isSmall ? 16 : 28);
  const spherePosBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, spherePosBuf); gl.bufferData(gl.ARRAY_BUFFER, sphereGeo.positions, gl.STATIC_DRAW);
  const sphereNormBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, sphereNormBuf); gl.bufferData(gl.ARRAY_BUFFER, sphereGeo.normals, gl.STATIC_DRAW);
  const sphereIdxBuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereIdxBuf); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sphereGeo.indices, gl.STATIC_DRAW);
  const sphereIdxCount = sphereGeo.indices.length;

  // ---------------- shaders ----------------
  const SPHERE_VS = `
    attribute vec3 aPosition;
    attribute vec3 aNormal;
    uniform mat4 uModel, uView, uProjection;
    varying vec3 vNormal;
    varying vec3 vWorldPos;
    void main() {
      vec4 worldPos = uModel * vec4(aPosition, 1.0);
      vWorldPos = worldPos.xyz;
      vNormal = mat3(uModel) * aNormal;
      gl_Position = uProjection * uView * worldPos;
    }
  `;
  // lit, near-opaque body shader with a built-in rim-light term — used for both the core and the
  // seven orbiting bodies (their own small self-glow, distinct from the core's dedicated shell below).
  const bodyProgram = makeProgram(SPHERE_VS, `
    precision mediump float;
    varying vec3 vNormal; varying vec3 vWorldPos;
    uniform vec3 uColorBase, uColorHot, uLightDir, uCameraPos;
    uniform float uEmissive;
    void main() {
      vec3 N = normalize(vNormal);
      vec3 V = normalize(uCameraPos - vWorldPos);
      float diff = max(dot(N, normalize(uLightDir)), 0.0);
      float fres = pow(1.0 - max(dot(N, V), 0.0), 2.4);
      vec3 color = mix(uColorBase * 0.32, uColorHot, diff * 0.72 + 0.28);
      color += uColorHot * fres * 0.85;
      color += uColorHot * uEmissive;
      gl_FragColor = vec4(color, 1.0);
    }
  `);
  // fresnel-glow atmosphere shell: a slightly larger sphere, backfaces only, additive-blended —
  // the classic limb-glow trick, dedicated to the core per the brief.
  const glowProgram = makeProgram(SPHERE_VS, `
    precision mediump float;
    varying vec3 vNormal; varying vec3 vWorldPos;
    uniform vec3 uGlowColor, uCameraPos;
    uniform float uIntensity;
    void main() {
      vec3 N = normalize(vNormal);
      vec3 V = normalize(uCameraPos - vWorldPos);
      float fres = pow(1.0 - max(dot(N, V), 0.0), 2.1);
      float alpha = fres * uIntensity;
      gl_FragColor = vec4(uGlowColor * fres, alpha);
    }
  `);
  // orbit-path rings: precomputed world-space ellipse line loops (tilted in 3D — real depth, not
  // flat circles), rendered dashed for a "telemetry" HUD feel.
  const ringProgram = makeProgram(`
    attribute vec3 aPosition;
    attribute float aT;
    uniform mat4 uView, uProjection;
    varying float vT;
    void main() {
      vT = aT;
      gl_Position = uProjection * uView * vec4(aPosition, 1.0);
    }
  `, `
    precision mediump float;
    varying float vT;
    uniform vec3 uColor;
    uniform float uAlpha;
    void main() {
      float d = fract(vT * 42.0);
      if (d > 0.58) discard;
      gl_FragColor = vec4(uColor, uAlpha);
    }
  `);
  // starfield: a 3D point cloud lit only by distance-based size falloff + gentle twinkle.
  const starProgram = makeProgram(`
    attribute vec3 aPosition;
    attribute float aSize;
    attribute float aPhase;
    uniform mat4 uView, uProjection;
    uniform float uTime, uPixelRatio;
    varying float vAlpha;
    void main() {
      vec4 viewPos = uView * vec4(aPosition, 1.0);
      gl_Position = uProjection * viewPos;
      float dist = max(1.0, -viewPos.z);
      gl_PointSize = clamp(aSize * uPixelRatio * (60.0 / dist), 1.0, 4.5);
      vAlpha = 0.3 + 0.5 * (0.5 + 0.5 * sin(uTime * 1.4 + aPhase));
    }
  `, `
    precision mediump float;
    varying float vAlpha;
    uniform vec3 uColor;
    void main() {
      vec2 c = gl_PointCoord - 0.5;
      float d = length(c);
      if (d > 0.5) discard;
      gl_FragColor = vec4(uColor, smoothstep(0.5, 0.0, d) * vAlpha);
    }
  `);
  if (!bodyProgram || !glowProgram || !ringProgram || !starProgram) return initOrbit2DFallback(canvas, wrap, chapters);

  const bp = {
    aPosition: gl.getAttribLocation(bodyProgram, 'aPosition'), aNormal: gl.getAttribLocation(bodyProgram, 'aNormal'),
    uModel: gl.getUniformLocation(bodyProgram, 'uModel'), uView: gl.getUniformLocation(bodyProgram, 'uView'),
    uProjection: gl.getUniformLocation(bodyProgram, 'uProjection'), uColorBase: gl.getUniformLocation(bodyProgram, 'uColorBase'),
    uColorHot: gl.getUniformLocation(bodyProgram, 'uColorHot'), uLightDir: gl.getUniformLocation(bodyProgram, 'uLightDir'),
    uCameraPos: gl.getUniformLocation(bodyProgram, 'uCameraPos'), uEmissive: gl.getUniformLocation(bodyProgram, 'uEmissive'),
  };
  const gp = {
    aPosition: gl.getAttribLocation(glowProgram, 'aPosition'), aNormal: gl.getAttribLocation(glowProgram, 'aNormal'),
    uModel: gl.getUniformLocation(glowProgram, 'uModel'), uView: gl.getUniformLocation(glowProgram, 'uView'),
    uProjection: gl.getUniformLocation(glowProgram, 'uProjection'), uGlowColor: gl.getUniformLocation(glowProgram, 'uGlowColor'),
    uCameraPos: gl.getUniformLocation(glowProgram, 'uCameraPos'), uIntensity: gl.getUniformLocation(glowProgram, 'uIntensity'),
  };
  const rp = {
    aPosition: gl.getAttribLocation(ringProgram, 'aPosition'), aT: gl.getAttribLocation(ringProgram, 'aT'),
    uView: gl.getUniformLocation(ringProgram, 'uView'), uProjection: gl.getUniformLocation(ringProgram, 'uProjection'),
    uColor: gl.getUniformLocation(ringProgram, 'uColor'), uAlpha: gl.getUniformLocation(ringProgram, 'uAlpha'),
  };
  const sp = {
    aPosition: gl.getAttribLocation(starProgram, 'aPosition'), aSize: gl.getAttribLocation(starProgram, 'aSize'),
    aPhase: gl.getAttribLocation(starProgram, 'aPhase'), uView: gl.getUniformLocation(starProgram, 'uView'),
    uProjection: gl.getUniformLocation(starProgram, 'uProjection'), uTime: gl.getUniformLocation(starProgram, 'uTime'),
    uPixelRatio: gl.getUniformLocation(starProgram, 'uPixelRatio'), uColor: gl.getUniformLocation(starProgram, 'uColor'),
  };

  // ---------------- the seven orbiting bodies (= the seven services) ----------------
  // Each sits on its own tilted elliptical orbit, staged at increasing depth (-Z) so the camera
  // passes through them in sequence as it flies forward — a real spatial arrangement, not a trick.
  const SERVICE_DEFS = [
    { depth: 8,  a: 2.2, b: 1.5, incl: 0.55, rotY: 0.40,  speed: 0.050, phase0: 0.6, radius: 0.32, mix: 0.04 },
    { depth: 13, a: 2.6, b: 1.7, incl: 0.90, rotY: -0.50, speed: 0.045, phase0: 2.1, radius: 0.34, mix: 0.18 },
    { depth: 18, a: 2.9, b: 1.9, incl: 0.35, rotY: 1.10,  speed: 0.040, phase0: 4.0, radius: 0.38, mix: 0.32 },
    { depth: 23, a: 3.1, b: 2.0, incl: 1.10, rotY: -0.90, speed: 0.038, phase0: 1.2, radius: 0.33, mix: 0.46 },
    { depth: 28, a: 3.3, b: 2.1, incl: 0.50, rotY: 0.80,  speed: 0.035, phase0: 3.3, radius: 0.31, mix: 0.60 },
    { depth: 33, a: 3.5, b: 2.2, incl: 0.85, rotY: -0.30, speed: 0.032, phase0: 5.1, radius: 0.35, mix: 0.75 },
    { depth: 38, a: 3.8, b: 2.4, incl: 0.40, rotY: 1.40,  speed: 0.030, phase0: 0.2, radius: 0.40, mix: 0.90 },
  ];
  SERVICE_DEFS.forEach(b => { b.center = [0, 0, -b.depth]; });

  // local ellipse point (angle) -> world space, applying inclination then Y-rotation then translate
  function orbitLocalToWorld(body, angle) {
    const lx = Math.cos(angle) * body.a, lz = Math.sin(angle) * body.b;
    let y = 0, z = lz;
    const y1 = y * Math.cos(body.incl) - z * Math.sin(body.incl);
    const z1 = y * Math.sin(body.incl) + z * Math.cos(body.incl);
    y = y1; z = z1;
    let x = lx;
    const x2 = x * Math.cos(body.rotY) + z * Math.sin(body.rotY);
    const z2 = -x * Math.sin(body.rotY) + z * Math.cos(body.rotY);
    x = x2; z = z2;
    return [x + body.center[0], y + body.center[1], z + body.center[2]];
  }

  const RING_SEGMENTS = isSmall ? 48 : 80;
  const ringBuffers = SERVICE_DEFS.map((body) => {
    const pos = new Float32Array(RING_SEGMENTS * 3);
    const tAttr = new Float32Array(RING_SEGMENTS);
    for (let i = 0; i < RING_SEGMENTS; i++) {
      const angle = (i / RING_SEGMENTS) * Math.PI * 2;
      const p = orbitLocalToWorld(body, angle);
      pos[i * 3] = p[0]; pos[i * 3 + 1] = p[1]; pos[i * 3 + 2] = p[2];
      tAttr[i] = i / RING_SEGMENTS;
    }
    const posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf); gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STATIC_DRAW);
    const tBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tBuf); gl.bufferData(gl.ARRAY_BUFFER, tAttr, gl.STATIC_DRAW);
    return { posBuf, tBuf };
  });

  // ---------------- starfield: points scattered through a deep 3D shell around the whole scene ----------------
  const STAR_COUNT = isSmall ? 700 : 1500;
  const starPositions = new Float32Array(STAR_COUNT * 3);
  const starSizes = new Float32Array(STAR_COUNT);
  const starPhases = new Float32Array(STAR_COUNT);
  for (let i = 0; i < STAR_COUNT; i++) {
    const r = 30 + Math.random() * 60;
    const theta = Math.random() * Math.PI * 2, phi = Math.acos(2 * Math.random() - 1);
    starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    starPositions[i * 3 + 2] = -Math.random() * 90 + 15; // biased along the flight path
    starSizes[i] = 1 + Math.random() * 2.2;
    starPhases[i] = Math.random() * Math.PI * 2;
  }
  const starPosBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, starPosBuf); gl.bufferData(gl.ARRAY_BUFFER, starPositions, gl.STATIC_DRAW);
  const starSizeBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, starSizeBuf); gl.bufferData(gl.ARRAY_BUFFER, starSizes, gl.STATIC_DRAW);
  const starPhaseBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, starPhaseBuf); gl.bufferData(gl.ARRAY_BUFFER, starPhases, gl.STATIC_DRAW);

  // ---------------- camera flight path ----------------
  // Wide establishing shot -> approach the core -> weave past each of the 7 bodies in sequence
  // (outer bodies staged deeper, so "weaving past" = flying forward through increasing -Z) ->
  // pull away into the starfield as the flythrough hands off to the conventional page below.
  const lastDepth = SERVICE_DEFS[SERVICE_DEFS.length - 1].depth;
  const CAM_STOPS = [
    { t: 0.000, eye: [0, 2.6, 20], look: [0, -0.3, -6], fov: 52 },
    { t: 0.150, eye: [0, 2.1, 17], look: [0, -0.1, -8], fov: 50 },
    { t: 0.230, eye: [0.7, 0.7, 5.6], look: [0, 0, 0], fov: 42 },
    { t: 0.320, eye: [-0.5, 0.45, 4.2], look: [0, 0, 0], fov: 39 },
  ];
  const svcStart = 0.320, svcEnd = 0.958;
  const svcSpan = (svcEnd - svcStart) / SERVICE_DEFS.length;
  SERVICE_DEFS.forEach((body, i) => {
    const tMid = svcStart + (i + 0.5) * svcSpan;
    const lateral = (i % 2 === 0 ? 1 : -1) * (body.a * 0.85 + 1.5);
    const vertical = Math.sin(i * 1.7) * 1.4 + 0.5;
    const distBack = body.a * 2.3 + 1.6;
    CAM_STOPS.push({
      t: tMid,
      eye: [body.center[0] + lateral, body.center[1] + vertical, body.center[2] + distBack],
      look: body.center.slice(),
      fov: 44,
    });
  });
  CAM_STOPS.push({ t: 1.000, eye: [0, 2, lastDepth - 16], look: [0, 0, lastDepth - 42], fov: 58 });

  function camAt(globalT) {
    let k = 0;
    while (k < CAM_STOPS.length - 2 && globalT > CAM_STOPS[k + 1].t) k++;
    const A = CAM_STOPS[k], B = CAM_STOPS[k + 1];
    const span = Math.max(1e-6, B.t - A.t);
    const localT = smoothstep(clamp01((globalT - A.t) / span));
    return {
      eye: [lerp(A.eye[0], B.eye[0], localT), lerp(A.eye[1], B.eye[1], localT), lerp(A.eye[2], B.eye[2], localT)],
      look: [lerp(A.look[0], B.look[0], localT), lerp(A.look[1], B.look[1], localT), lerp(A.look[2], B.look[2], localT)],
      fov: lerp(A.fov, B.fov, localT),
    };
  }

  // ---------------- GL state ----------------
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  const GOLD_BASE = [0.55, 0.34, 0.09], GOLD_HOT = [1.0, 0.72, 0.28];
  const ICE_HOT = [0.86, 0.92, 1.0];
  function mixColor(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }

  let aspect = 1, pixelRatio = 1;
  function resize() {
    const rect = stage.getBoundingClientRect();
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * pixelRatio));
    canvas.height = Math.max(1, Math.round(rect.height * pixelRatio));
    gl.viewport(0, 0, canvas.width, canvas.height);
    aspect = rect.width / rect.height;
  }

  let targetT = 0, displayT = 0;
  function onScroll() {
    const rect = wrap.getBoundingClientRect();
    const total = wrap.offsetHeight - window.innerHeight;
    const effective = total * 0.96;
    targetT = Math.min(1, Math.max(0, effective > 0 ? -rect.top / effective : 0));
  }

  function updateChapters(t) {
    chapters.forEach((el) => {
      const from = parseFloat(el.dataset.from), to = parseFloat(el.dataset.to);
      el.classList.toggle('is-active', t >= from && t <= to);
    });
    wrap.classList.toggle('is-past-intro', t > 0.05);
  }

  function drawSphere(program, loc, model, view, projection, cameraPos, uniforms) {
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, spherePosBuf);
    gl.enableVertexAttribArray(loc.aPosition); gl.vertexAttribPointer(loc.aPosition, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereNormBuf);
    gl.enableVertexAttribArray(loc.aNormal); gl.vertexAttribPointer(loc.aNormal, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereIdxBuf);
    gl.uniformMatrix4fv(loc.uModel, false, model);
    gl.uniformMatrix4fv(loc.uView, false, view);
    gl.uniformMatrix4fv(loc.uProjection, false, projection);
    gl.uniform3f(loc.uCameraPos, cameraPos[0], cameraPos[1], cameraPos[2]);
    uniforms(loc);
    gl.drawElements(gl.TRIANGLES, sphereIdxCount, gl.UNSIGNED_SHORT, 0);
  }

  let running = false, rafId = null;
  const clockStart = performance.now();
  let lastFrameTime = clockStart;

  function render(now) {
    const time = (now - clockStart) / 1000;
    const dt = Math.min(0.1, (now - lastFrameTime) / 1000);
    lastFrameTime = now;
    const ease = 1 - Math.pow(1 - 0.085, dt * 60);
    displayT += (targetT - displayT) * ease;
    updateChapters(displayT);

    const cam = camAt(displayT);
    const view = mat4LookAt(cam.eye, cam.look, [0, 1, 0]);
    const projection = mat4Perspective((cam.fov * Math.PI) / 180, aspect, 0.1, 140);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // 1) starfield — no depth test, drawn first as a backdrop
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(starProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, starPosBuf);
    gl.enableVertexAttribArray(sp.aPosition); gl.vertexAttribPointer(sp.aPosition, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, starSizeBuf);
    gl.enableVertexAttribArray(sp.aSize); gl.vertexAttribPointer(sp.aSize, 1, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, starPhaseBuf);
    gl.enableVertexAttribArray(sp.aPhase); gl.vertexAttribPointer(sp.aPhase, 1, gl.FLOAT, false, 0, 0);
    gl.uniformMatrix4fv(sp.uView, false, view);
    gl.uniformMatrix4fv(sp.uProjection, false, projection);
    gl.uniform1f(sp.uTime, time);
    gl.uniform1f(sp.uPixelRatio, pixelRatio);
    gl.uniform3f(sp.uColor, 0.92, 0.95, 1.0);
    gl.drawArrays(gl.POINTS, 0, STAR_COUNT);

    // 2) opaque pass — core + orbiting bodies, normal depth test/write, backface culled
    gl.enable(gl.DEPTH_TEST); gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.cullFace(gl.BACK);

    const coreModel = mat4Multiply(mat4Translation(0, 0, 0), mat4Multiply(mat4RotationY(time * 0.08), mat4Scale(1.5)));
    drawSphere(bodyProgram, bp, coreModel, view, projection, cam.eye, (loc) => {
      gl.uniform3f(loc.uColorBase, GOLD_BASE[0], GOLD_BASE[1], GOLD_BASE[2]);
      gl.uniform3f(loc.uColorHot, GOLD_HOT[0], GOLD_HOT[1], GOLD_HOT[2]);
      gl.uniform3f(loc.uLightDir, 0.4, 0.7, 0.6);
      gl.uniform1f(loc.uEmissive, 0.34 + Math.sin(time * 0.6) * 0.05);
    });

    SERVICE_DEFS.forEach((body) => {
      const angle = body.phase0 + time * body.speed;
      const pos = orbitLocalToWorld(body, angle);
      const model = mat4Multiply(mat4Translation(pos[0], pos[1], pos[2]), mat4Multiply(mat4RotationY(time * 0.5 + body.phase0), mat4Scale(body.radius)));
      const hot = mixColor(GOLD_HOT, ICE_HOT, body.mix);
      const base = mixColor(GOLD_BASE, [0.32, 0.36, 0.44], body.mix);
      drawSphere(bodyProgram, bp, model, view, projection, cam.eye, (loc) => {
        gl.uniform3f(loc.uColorBase, base[0], base[1], base[2]);
        gl.uniform3f(loc.uColorHot, hot[0], hot[1], hot[2]);
        gl.uniform3f(loc.uLightDir, 0.4, 0.7, 0.6);
        gl.uniform1f(loc.uEmissive, 0.22);
      });
    });

    // 3) translucent pass — orbit rings + the core's fresnel glow shell, depth-tested but not
    // depth-written, additive, drawn after the opaque geometry so they're occluded correctly.
    gl.depthMask(false);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);

    gl.useProgram(ringProgram);
    gl.uniformMatrix4fv(rp.uView, false, view);
    gl.uniformMatrix4fv(rp.uProjection, false, projection);
    ringBuffers.forEach((rb, i) => {
      const t = SERVICE_DEFS[i].mix;
      const c = mixColor([0.85, 0.9, 1.0], [1.0, 0.85, 0.55], 1 - t);
      gl.uniform3f(rp.uColor, c[0], c[1], c[2]);
      gl.uniform1f(rp.uAlpha, 0.34);
      gl.bindBuffer(gl.ARRAY_BUFFER, rb.posBuf);
      gl.enableVertexAttribArray(rp.aPosition); gl.vertexAttribPointer(rp.aPosition, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, rb.tBuf);
      gl.enableVertexAttribArray(rp.aT); gl.vertexAttribPointer(rp.aT, 1, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.LINE_LOOP, 0, RING_SEGMENTS);
    });

    gl.cullFace(gl.FRONT); // backfaces only — the classic atmosphere-glow limb trick
    const glowModel = mat4Multiply(mat4Translation(0, 0, 0), mat4Scale(1.5 * 1.34));
    drawSphere(glowProgram, gp, glowModel, view, projection, cam.eye, (loc) => {
      gl.uniform3f(loc.uGlowColor, GOLD_HOT[0], GOLD_HOT[1], GOLD_HOT[2]);
      gl.uniform1f(loc.uIntensity, 1.5);
    });
    gl.cullFace(gl.BACK);
    gl.depthMask(true);

    rafId = requestAnimationFrame(render);
  }

  function start() { if (running) return; running = true; resize(); onScroll(); rafId = requestAnimationFrame(render); }
  function stop() { running = false; if (rafId) cancelAnimationFrame(rafId); }

  new IntersectionObserver((entries) => {
    entries.forEach(entry => entry.isIntersecting ? start() : stop());
  }, { rootMargin: '200px 0px' }).observe(wrap);

  window.addEventListener('scroll', onScroll, { passive: true });
  let resizeTimer;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 200); });
})();

// ----- No-WebGL fallback: a lightweight 2D starfield + pulsing core dot, and the chapters
// collapse to the same stacked "normal list" layout the reduced-motion path uses. -----
function initOrbit2DFallback(canvas, wrap, chapters) {
  wrap.classList.add('orbit-static');
  chapters.forEach(el => el.classList.add('is-active'));
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  let stars = [], running = false, rafId = null;
  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.round((rect.width * rect.height) / 4000);
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * rect.width, y: Math.random() * rect.height,
      r: Math.random() * 1.4 + 0.3, phase: Math.random() * Math.PI * 2,
    }));
  }
  function tick(t) {
    const rect = canvas.getBoundingClientRect();
    const g = ctx.createRadialGradient(rect.width / 2, rect.height / 2, 0, rect.width / 2, rect.height / 2, Math.max(rect.width, rect.height) * 0.6);
    g.addColorStop(0, 'rgba(20,15,8,1)'); g.addColorStop(1, 'rgba(8,7,10,1)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, rect.width, rect.height);
    stars.forEach(s => {
      const tw = 0.35 + 0.35 * Math.sin(t / 1400 + s.phase);
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(230,235,255,${tw.toFixed(3)})`; ctx.fill();
    });
    const pulse = 0.7 + 0.3 * Math.sin(t / 900);
    const cx = rect.width / 2, cy = rect.height * 0.42;
    const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 70 * pulse);
    coreGrad.addColorStop(0, 'rgba(255,217,138,0.9)'); coreGrad.addColorStop(1, 'rgba(242,169,59,0)');
    ctx.fillStyle = coreGrad; ctx.beginPath(); ctx.arc(cx, cy, 70 * pulse, 0, Math.PI * 2); ctx.fill();
    rafId = requestAnimationFrame(tick);
  }
  function start() { if (running) return; running = true; resize(); rafId = requestAnimationFrame(tick); }
  function stop() { running = false; if (rafId) cancelAnimationFrame(rafId); }
  new IntersectionObserver((entries) => { entries.forEach(e => e.isIntersecting ? start() : stop()); }, { threshold: 0 }).observe(canvas);
  let resizeTimer;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 200); });
}
