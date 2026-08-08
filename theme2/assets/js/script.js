// ----- Theme menu (this site is one fixed theme — set via <html data-theme> — the
// menu itself is just links out to the sibling subdomains running the other themes) -----
const themeToggle = document.getElementById('themeToggle');
const themeMenu = document.getElementById('themeMenu');
window.themeActivatedAt = performance.now();

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
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeThemeMenu();
});

// ----- Scroll progress + navbar shadow -----
const scrollProgress = document.getElementById('scrollProgress');
window.addEventListener('scroll', () => {
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const pct = docHeight > 0 ? (window.scrollY / docHeight) * 100 : 0;
  scrollProgress.style.width = pct + '%';
}, { passive: true });

// ----- Mobile menu -----
const navToggle = document.getElementById('navToggle');
const mobileMenu = document.getElementById('mobileMenu');
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

// ----- Active nav link on scroll -----
const sections = document.querySelectorAll('section[id], header[id]');
const navLinks = document.querySelectorAll('.nav-link');
const navObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.getAttribute('id');
      navLinks.forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
      });
    }
  });
}, { threshold: 0.4 });
sections.forEach(sec => navObserver.observe(sec));

// ----- Scroll-reveal engine (with stagger support) -----
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

// ----- Lightbox (groups images sharing a data-lightbox-group container) -----
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
const lightboxClose = document.getElementById('lightboxClose');
const lightboxPrev = document.getElementById('lightboxPrev');
const lightboxNext = document.getElementById('lightboxNext');
const lightboxTitle = document.getElementById('lightboxTitle');
const lightboxCaption = document.getElementById('lightboxCaption');
const lightboxCounter = document.getElementById('lightboxCounter');

let galleryImgs = [];
let galleryIndex = 0;

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
function openLightbox(imgs, index) {
  galleryImgs = imgs;
  galleryIndex = index;
  updateLightbox();
  lightbox.classList.add('open');
}
function closeLightbox() {
  lightbox.classList.remove('open');
  lightboxImg.src = '';
}
document.querySelectorAll('[data-lightbox-group]').forEach(group => {
  const imgs = Array.from(group.querySelectorAll('img'));
  imgs.forEach((img, i) => {
    img.addEventListener('click', () => openLightbox(imgs, i));
  });
});
lightboxPrev.addEventListener('click', (e) => {
  e.stopPropagation();
  galleryIndex = (galleryIndex - 1 + galleryImgs.length) % galleryImgs.length;
  updateLightbox();
});
lightboxNext.addEventListener('click', (e) => {
  e.stopPropagation();
  galleryIndex = (galleryIndex + 1) % galleryImgs.length;
  updateLightbox();
});
lightboxClose.addEventListener('click', closeLightbox);
lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
document.addEventListener('keydown', (e) => {
  if (!lightbox.classList.contains('open')) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') lightboxPrev.click();
  if (e.key === 'ArrowRight') lightboxNext.click();
});

// ----- Footer year -----
document.getElementById('year').textContent = new Date().getFullYear();

// ----- Hero 3D scene (Cinematic mood) -----
// Real WebGL: a rotating glass-glow torus rendered with a lit + fresnel shader from
// hand-rolled perspective/rotation matrices, plus a depth-sorted particle field behind it.
(function initHeroScene() {
  const heroCanvas = document.getElementById('heroCanvas');
  if (!heroCanvas || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const hero = heroCanvas.closest('.hero');

  const gl = heroCanvas.getContext('webgl') || heroCanvas.getContext('experimental-webgl');
  if (!gl) return initHeroField2DFallback(heroCanvas, hero);

  // ---- tiny column-major mat4 helpers ----
  function mat4Perspective(fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
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
  function mat4ScaleXYZ(sx, sy, sz) { return new Float32Array([sx, 0, 0, 0, 0, sy, 0, 0, 0, 0, sz, 0, 0, 0, 0, 1]); }

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn('Hero WebGL shader error:', gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }
  function makeProgram(vertSrc, fragSrc) {
    const vs = compile(gl.VERTEX_SHADER, vertSrc);
    const fs = compile(gl.FRAGMENT_SHADER, fragSrc);
    if (!vs || !fs) return null;
    const p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      console.warn('Hero WebGL link error:', gl.getProgramInfoLog(p));
      return null;
    }
    return p;
  }

  // ---- particle field (background depth cue) ----
  const particleProgram = makeProgram(`
    attribute vec3 aPosition;
    uniform vec2 uMouse;
    uniform float uTime;
    uniform float uPixelRatio;
    varying float vAlpha;
    void main() {
      float z = aPosition.z;
      float parallax = (1.0 - z) * 0.18;
      vec2 pos = aPosition.xy + uMouse * parallax;
      pos.y += sin(uTime * 0.06 + aPosition.x * 4.0) * 0.015 * (1.0 - z);
      pos.x += cos(uTime * 0.05 + aPosition.y * 4.0) * 0.01 * (1.0 - z);
      gl_Position = vec4(pos, 0.0, 1.0);
      gl_PointSize = mix(2.2, 0.5, z) * uPixelRatio;
      vAlpha = mix(0.85, 0.12, z);
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
  if (!particleProgram) return initHeroField2DFallback(heroCanvas, hero);

  const COUNT = 420;
  const particlePositions = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    particlePositions[i * 3] = Math.random() * 2 - 1;
    particlePositions[i * 3 + 1] = Math.random() * 2 - 1;
    particlePositions[i * 3 + 2] = Math.pow(Math.random(), 1.6);
  }
  const particleBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, particleBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, particlePositions, gl.STATIC_DRAW);
  const p_aPosition = gl.getAttribLocation(particleProgram, 'aPosition');
  const p_uMouse = gl.getUniformLocation(particleProgram, 'uMouse');
  const p_uTime = gl.getUniformLocation(particleProgram, 'uTime');
  const p_uColor = gl.getUniformLocation(particleProgram, 'uColor');
  const p_uPixelRatio = gl.getUniformLocation(particleProgram, 'uPixelRatio');

  // ---- rotating torus (hero centerpiece) ----
  const torusProgram = makeProgram(`
    attribute vec3 aPosition;
    attribute vec3 aNormal;
    uniform mat4 uModel;
    uniform mat4 uProjection;
    varying vec3 vNormal;
    varying vec3 vViewPos;
    void main() {
      vec4 viewPos = uModel * vec4(aPosition, 1.0);
      gl_Position = uProjection * viewPos;
      vNormal = mat3(uModel) * aNormal;
      vViewPos = viewPos.xyz;
    }
  `, `
    precision mediump float;
    varying vec3 vNormal;
    varying vec3 vViewPos;
    uniform vec3 uColor;
    uniform vec3 uLightDir;
    void main() {
      vec3 N = normalize(vNormal);
      vec3 V = normalize(-vViewPos);
      float diffuse = max(dot(N, normalize(uLightDir)), 0.0);
      float fresnel = pow(1.0 - max(dot(N, V), 0.0), 2.2);
      vec3 color = uColor * (0.16 + diffuse * 0.5) + uColor * fresnel * 1.4;
      float alpha = 0.32 + diffuse * 0.22 + fresnel * 0.55;
      gl_FragColor = vec4(color, alpha);
    }
  `);
  if (!torusProgram) return initHeroField2DFallback(heroCanvas, hero);

  function createTorus(radius, tube, radialSeg, tubularSeg) {
    const positions = [], normals = [], indices = [];
    for (let j = 0; j <= radialSeg; j++) {
      for (let i = 0; i <= tubularSeg; i++) {
        const u = (i / tubularSeg) * Math.PI * 2;
        const v = (j / radialSeg) * Math.PI * 2;
        const cx = radius * Math.cos(u), cy = radius * Math.sin(u);
        const x = (radius + tube * Math.cos(v)) * Math.cos(u);
        const y = (radius + tube * Math.cos(v)) * Math.sin(u);
        const z = tube * Math.sin(v);
        positions.push(x, y, z);
        const nx = x - cx, ny = y - cy, nz = z;
        const len = Math.hypot(nx, ny, nz) || 1;
        normals.push(nx / len, ny / len, nz / len);
      }
    }
    for (let j = 1; j <= radialSeg; j++) {
      for (let i = 1; i <= tubularSeg; i++) {
        const a = (tubularSeg + 1) * j + i - 1;
        const b = (tubularSeg + 1) * (j - 1) + i - 1;
        const c = (tubularSeg + 1) * (j - 1) + i;
        const d = (tubularSeg + 1) * j + i;
        indices.push(a, b, d, b, c, d);
      }
    }
    return { positions: new Float32Array(positions), normals: new Float32Array(normals), indices: new Uint16Array(indices) };
  }
  const torus = createTorus(1, 0.34, 48, 96);
  const torusPosBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, torusPosBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, torus.positions, gl.STATIC_DRAW);
  const torusNormalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, torusNormalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, torus.normals, gl.STATIC_DRAW);
  const torusIndexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, torusIndexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, torus.indices, gl.STATIC_DRAW);
  const t_aPosition = gl.getAttribLocation(torusProgram, 'aPosition');
  const t_aNormal = gl.getAttribLocation(torusProgram, 'aNormal');
  const t_uModel = gl.getUniformLocation(torusProgram, 'uModel');
  const t_uProjection = gl.getUniformLocation(torusProgram, 'uProjection');
  const t_uColor = gl.getUniformLocation(torusProgram, 'uColor');
  const t_uLightDir = gl.getUniformLocation(torusProgram, 'uLightDir');

  // ---- plasma ring (Nebula theme) — noise-jagged torus, warm-to-cool gradient by screen height ----
  const plasmaProgram = makeProgram(`
    attribute vec3 aPosition;
    attribute vec3 aNormal;
    uniform mat4 uModel;
    uniform mat4 uProjection;
    varying vec3 vNormal;
    varying vec3 vViewPos;
    void main() {
      vec4 viewPos = uModel * vec4(aPosition, 1.0);
      gl_Position = uProjection * viewPos;
      vNormal = mat3(uModel) * aNormal;
      vViewPos = viewPos.xyz;
    }
  `, `
    precision mediump float;
    varying vec3 vNormal;
    varying vec3 vViewPos;
    uniform vec3 uColorWarm;
    uniform vec3 uColorCool;
    uniform vec3 uLightDir;
    uniform float uHeightScale;
    void main() {
      vec3 N = normalize(vNormal);
      vec3 V = normalize(-vViewPos);
      float diffuse = max(dot(N, normalize(uLightDir)), 0.0);
      float fresnel = pow(1.0 - max(dot(N, V), 0.0), 2.0);
      float t = clamp(vViewPos.y / uHeightScale * 0.5 + 0.5, 0.0, 1.0);
      vec3 base = mix(uColorCool, uColorWarm, t);
      vec3 color = base * (0.16 + diffuse * 0.28) + base * fresnel * 0.9;
      float alpha = 0.3 + diffuse * 0.12 + fresnel * 0.4;
      gl_FragColor = vec4(color, alpha);
    }
  `);

  function createPlasmaRing(radius, tube, radialSeg, tubularSeg) {
    const positions = [], normals = [], indices = [];
    function tubeAt(u) {
      return tube * (1 + 0.28 * Math.sin(u * 6) + 0.18 * Math.sin(u * 11 + 1.3) + 0.12 * Math.sin(u * 19 + 0.7));
    }
    for (let j = 0; j <= radialSeg; j++) {
      for (let i = 0; i <= tubularSeg; i++) {
        const u = (i / tubularSeg) * Math.PI * 2;
        const v = (j / radialSeg) * Math.PI * 2;
        const tr = tubeAt(u);
        const cx = radius * Math.cos(u), cy = radius * Math.sin(u);
        const x = (radius + tr * Math.cos(v)) * Math.cos(u);
        const y = (radius + tr * Math.cos(v)) * Math.sin(u);
        const z = tr * Math.sin(v);
        positions.push(x, y, z);
        const nx = x - cx, ny = y - cy, nz = z;
        const len = Math.hypot(nx, ny, nz) || 1;
        normals.push(nx / len, ny / len, nz / len);
      }
    }
    for (let j = 1; j <= radialSeg; j++) {
      for (let i = 1; i <= tubularSeg; i++) {
        const a = (tubularSeg + 1) * j + i - 1;
        const b = (tubularSeg + 1) * (j - 1) + i - 1;
        const c = (tubularSeg + 1) * (j - 1) + i;
        const d = (tubularSeg + 1) * j + i;
        indices.push(a, b, d, b, c, d);
      }
    }
    return { positions: new Float32Array(positions), normals: new Float32Array(normals), indices: new Uint16Array(indices) };
  }
  const plasma = createPlasmaRing(1.3, 0.19, 28, 90);
  const plasmaPosBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, plasmaPosBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, plasma.positions, gl.STATIC_DRAW);
  const plasmaNormalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, plasmaNormalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, plasma.normals, gl.STATIC_DRAW);
  const plasmaIndexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, plasmaIndexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, plasma.indices, gl.STATIC_DRAW);
  const pl_aPosition = gl.getAttribLocation(plasmaProgram, 'aPosition');
  const pl_aNormal = gl.getAttribLocation(plasmaProgram, 'aNormal');
  const pl_uModel = gl.getUniformLocation(plasmaProgram, 'uModel');
  const pl_uProjection = gl.getUniformLocation(plasmaProgram, 'uProjection');
  const pl_uColorWarm = gl.getUniformLocation(plasmaProgram, 'uColorWarm');
  const pl_uColorCool = gl.getUniformLocation(plasmaProgram, 'uColorCool');
  const pl_uLightDir = gl.getUniformLocation(plasmaProgram, 'uLightDir');
  const pl_uHeightScale = gl.getUniformLocation(plasmaProgram, 'uHeightScale');

  // ---- orbiting icosahedra (Experience theme only — a second and third body for a heavier scene) ----
  function createIcosahedron(radius) {
    const t = (1 + Math.sqrt(5)) / 2;
    const verts = [
      [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
      [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
      [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
    ];
    const faces = [
      [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
      [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
      [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
      [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
    ];
    const positions = [], normals = [], indices = [];
    verts.forEach((v) => {
      const len = Math.hypot(v[0], v[1], v[2]);
      const nx = v[0] / len, ny = v[1] / len, nz = v[2] / len;
      positions.push(nx * radius, ny * radius, nz * radius);
      normals.push(nx, ny, nz);
    });
    faces.forEach((f) => indices.push(f[0], f[1], f[2]));
    return { positions: new Float32Array(positions), normals: new Float32Array(normals), indices: new Uint16Array(indices) };
  }
  const ico = createIcosahedron(1);
  const icoPosBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, icoPosBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, ico.positions, gl.STATIC_DRAW);
  const icoNormalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, icoNormalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, ico.normals, gl.STATIC_DRAW);
  const icoIndexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, icoIndexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, ico.indices, gl.STATIC_DRAW);

  // ---- "IG" monogram — a bespoke 3D model built from code, not a stock primitive ----
  // A unit cube, reused for every block: each letter-block is just this cube
  // non-uniformly scaled + translated into place. Real, custom, bespoke to this brand.
  function createBox() {
    const positions = [
      -.5, -.5, .5, .5, -.5, .5, .5, .5, .5, -.5, .5, .5, // front
      .5, -.5, -.5, -.5, -.5, -.5, -.5, .5, -.5, .5, .5, -.5, // back
      -.5, .5, .5, .5, .5, .5, .5, .5, -.5, -.5, .5, -.5, // top
      -.5, -.5, -.5, .5, -.5, -.5, .5, -.5, .5, -.5, -.5, .5, // bottom
      .5, -.5, .5, .5, -.5, -.5, .5, .5, -.5, .5, .5, .5, // right
      -.5, -.5, -.5, -.5, -.5, .5, -.5, .5, .5, -.5, .5, -.5, // left
    ];
    const normals = [
      0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
      0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
      0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
      0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
      1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
      -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
    ];
    const indices = [];
    for (let f = 0; f < 6; f++) { const o = f * 4; indices.push(o, o + 1, o + 2, o, o + 2, o + 3); }
    return { positions: new Float32Array(positions), normals: new Float32Array(normals), indices: new Uint16Array(indices) };
  }
  const box = createBox();
  const boxPosBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, boxPosBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, box.positions, gl.STATIC_DRAW);
  const boxNormalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, boxNormalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, box.normals, gl.STATIC_DRAW);
  const boxIndexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, boxIndexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, box.indices, gl.STATIC_DRAW);

  // "I" (one block) + "G" (five blocks: top, left, bottom, right-lower, inward tab)
  const MONOGRAM_PARTS = [
    { t: [-1.1, 0, 0], s: [0.4, 2.2, 0.4] }, // I
    { t: [0.35, 0.925, 0], s: [1.5, 0.35, 0.35] }, // G top
    { t: [-0.225, 0, 0], s: [0.35, 2.2, 0.35] }, // G left
    { t: [0.35, -0.925, 0], s: [1.5, 0.35, 0.35] }, // G bottom
    { t: [0.925, -0.575, 0], s: [0.35, 1.0, 0.35] }, // G right-lower
    { t: [0.55, -0.575, 0], s: [0.75, 0.35, 0.35] }, // G inward tab
  ];

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);

  let mouseX = 0, mouseY = 0, targetX = 0, targetY = 0;
  hero.addEventListener('pointermove', (e) => {
    const rect = hero.getBoundingClientRect();
    targetX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    targetY = -((e.clientY - rect.top) / rect.height - 0.5) * 2;
  });

  let running = false, rafId = null, aspect = 1;
  let projection = mat4Perspective(Math.PI / 4, 1, 0.1, 20);
  function resize() {
    const rect = hero.getBoundingClientRect();
    const ratio = Math.min(devicePixelRatio, 2);
    heroCanvas.width = rect.width * ratio;
    heroCanvas.height = rect.height * ratio;
    gl.viewport(0, 0, heroCanvas.width, heroCanvas.height);
    aspect = rect.width / rect.height;
    projection = mat4Perspective(Math.PI / 4, aspect, 0.1, 20);
  }

  function drawBody(posBuf, normBuf, idxBuf, indexCount, model, color) {
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.enableVertexAttribArray(t_aPosition);
    gl.vertexAttribPointer(t_aPosition, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, normBuf);
    gl.enableVertexAttribArray(t_aNormal);
    gl.vertexAttribPointer(t_aNormal, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
    gl.uniformMatrix4fv(t_uModel, false, model);
    gl.uniformMatrix4fv(t_uProjection, false, projection);
    gl.uniform3f(t_uColor, color[0], color[1], color[2]);
    gl.uniform3f(t_uLightDir, 0.4, 0.6, 0.7);
    gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);
  }

  function tick(t) {
    const theme = document.documentElement.getAttribute('data-theme');
    if (theme === 'light') {
      // Light theme has no dark canvas to draw into (additive glow doesn't read on a white ground) — skip the work.
      rafId = requestAnimationFrame(tick);
      return;
    }
    mouseX += (targetX - mouseX) * 0.04;
    mouseY += (targetY - mouseY) * 0.04;
    gl.clear(gl.COLOR_BUFFER_BIT);

    const exp = theme === 'experience';
    const neb = theme === 'nebula';
    const elapsed = t - (window.themeActivatedAt || 0);
    const introT = Math.min(1, Math.max(0, elapsed / 1100));
    const eased = 1 - Math.pow(1 - introT, 3); // easeOutCubic "materialize" pop

    // particles — denser/brighter in Experience, warm+cool tinted in Nebula (a starfield, not a flat color)
    gl.useProgram(particleProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, particleBuffer);
    gl.enableVertexAttribArray(p_aPosition);
    gl.vertexAttribPointer(p_aPosition, 3, gl.FLOAT, false, 0, 0);
    gl.uniform2f(p_uMouse, mouseX * (exp || neb ? 0.1 : 0.06), mouseY * (exp || neb ? 0.1 : 0.06));
    gl.uniform1f(p_uTime, t / 1000);
    gl.uniform1f(p_uPixelRatio, Math.min(devicePixelRatio, 2) * (exp || neb ? 1.25 : 1));
    if (neb) {
      const third = Math.floor(COUNT / 3);
      gl.uniform3f(p_uColor, 255 / 255, 107 / 255, 74 / 255);
      gl.drawArrays(gl.POINTS, 0, third);
      gl.uniform3f(p_uColor, 240 / 255, 240 / 255, 255 / 255);
      gl.drawArrays(gl.POINTS, third, third);
      gl.uniform3f(p_uColor, 74 / 255, 201 / 255, 255 / 255);
      gl.drawArrays(gl.POINTS, third * 2, COUNT - third * 2);
    } else {
      gl.uniform3f(p_uColor, 43 / 255, 127 / 255, 209 / 255);
      gl.drawArrays(gl.POINTS, 0, COUNT);
    }

    gl.useProgram(torusProgram);
    const indigo = [43 / 255, 127 / 255, 209 / 255];
    const periwinkle = [95 / 255, 195 / 255, 232 / 255];

    if (exp) {
      // centered "IG" monogram — bespoke 3D model built from code, not a stock shape.
      // Mostly Y-axis spin (plus a gentle mouse tilt) so the letters stay readable as they turn.
      // large and centered — the screenshots will overlap parts of it, same tradeoff the ring made
      const monoX = 0;
      const monoY = 0.15;
      const scale = 1.7 * (0.3 + 0.7 * eased);
      // gentle sway, not a full spin — the monogram should stay readable as "IG", not tumble past legible angles
      const swayY = Math.sin(t / 3200) * 0.5 + mouseX * 0.35;
      const swayX = Math.sin(t / 4100) * 0.12 + mouseY * 0.15;
      const groupTransform = mat4Multiply(
        mat4Translation(monoX, monoY, -3.6),
        mat4Multiply(mat4Multiply(mat4RotationY(swayY), mat4RotationX(swayX)), mat4Scale(scale))
      );
      MONOGRAM_PARTS.forEach((part) => {
        const partLocal = mat4Multiply(mat4Translation(part.t[0], part.t[1], part.t[2]), mat4ScaleXYZ(part.s[0], part.s[1], part.s[2]));
        const model = mat4Multiply(groupTransform, partLocal);
        drawBody(boxPosBuffer, boxNormalBuffer, boxIndexBuffer, box.indices.length, model, indigo);
      });

      // two gems orbiting tightly around the monogram — heavier scene, without sweeping across the text
      const orbitR = 1.7 * eased;
      const a1 = t / 2200;
      const ico1 = mat4Multiply(
        mat4Translation(monoX + Math.cos(a1) * orbitR, monoY + Math.sin(a1 * 0.7) * 0.4, -3.6 + Math.sin(a1) * 0.5),
        mat4Multiply(mat4Multiply(mat4RotationY(t / 900), mat4RotationX(t / 1300)), mat4Scale(0.16 * eased))
      );
      drawBody(icoPosBuffer, icoNormalBuffer, icoIndexBuffer, ico.indices.length, ico1, periwinkle);

      const a2 = t / 2600 + Math.PI;
      const ico2 = mat4Multiply(
        mat4Translation(monoX + Math.cos(a2) * orbitR * 0.85, monoY + Math.sin(a2 * 0.9) * 0.35, -3.6 + Math.sin(a2) * 0.5),
        mat4Multiply(mat4Multiply(mat4RotationY(t / 1100), mat4RotationX(t / 1500)), mat4Scale(0.11 * eased))
      );
      drawBody(icoPosBuffer, icoNormalBuffer, icoIndexBuffer, ico.indices.length, ico2, indigo);
    } else if (neb) {
      // centered plasma ring — noise-jagged torus with a warm-to-cool gradient, facing the camera like a portal.
      // Sized/positioned numerically (see the matrix math check) so it stays within the projected frame at any aspect.
      const ringBaseScale = aspect > 1.3 ? 1.15 : 0.58;
      const scale = ringBaseScale * (0.3 + 0.7 * eased);
      const model = mat4Multiply(
        mat4Translation(0, 0.1, -4.5),
        mat4Multiply(mat4Multiply(mat4RotationX(Math.PI / 6.5 + mouseY * 0.25), mat4RotationY(t / 2600 + mouseX * 0.4)), mat4Scale(scale))
      );
      gl.useProgram(plasmaProgram);
      gl.bindBuffer(gl.ARRAY_BUFFER, plasmaPosBuffer);
      gl.enableVertexAttribArray(pl_aPosition);
      gl.vertexAttribPointer(pl_aPosition, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, plasmaNormalBuffer);
      gl.enableVertexAttribArray(pl_aNormal);
      gl.vertexAttribPointer(pl_aNormal, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, plasmaIndexBuffer);
      gl.uniformMatrix4fv(pl_uModel, false, model);
      gl.uniformMatrix4fv(pl_uProjection, false, projection);
      gl.uniform3f(pl_uColorWarm, 255 / 255, 107 / 255, 74 / 255);
      gl.uniform3f(pl_uColorCool, 74 / 255, 201 / 255, 255 / 255);
      gl.uniform3f(pl_uLightDir, 0.3, 0.7, 0.6);
      gl.uniform1f(pl_uHeightScale, scale * 1.5);
      gl.drawElements(gl.TRIANGLES, plasma.indices.length, gl.UNSIGNED_SHORT, 0);
    } else {
      // small ambient ring tucked behind the hero content
      const offsetX = aspect > 1.3 ? 1.05 : 1.35;
      const offsetY = aspect > 1.3 ? 0.35 : 1.15;
      const scale = 1 * (0.3 + 0.7 * eased);
      const model = mat4Multiply(
        mat4Translation(offsetX, offsetY, -3.4),
        mat4Multiply(mat4Multiply(mat4RotationY(t / 2600 + mouseX * 0.4), mat4RotationX(Math.PI / 5 + mouseY * 0.3)), mat4Scale(scale))
      );
      drawBody(torusPosBuffer, torusNormalBuffer, torusIndexBuffer, torus.indices.length, model, indigo);
    }

    rafId = requestAnimationFrame(tick);
  }
  function start() { if (running) return; running = true; resize(); rafId = requestAnimationFrame(tick); }
  function stop() { running = false; if (rafId) cancelAnimationFrame(rafId); }

  new IntersectionObserver((entries) => {
    entries.forEach(entry => entry.isIntersecting ? start() : stop());
  }, { threshold: 0 }).observe(hero);

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 200);
  });
})();

function initHeroField2DFallback(heroCanvas, hero) {
  const ctx = heroCanvas.getContext('2d');
  let particles = [], running = false, rafId = null;
  function resize() {
    const rect = hero.getBoundingClientRect();
    heroCanvas.width = rect.width * devicePixelRatio;
    heroCanvas.height = rect.height * devicePixelRatio;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    const count = Math.round((rect.width * rect.height) / 22000);
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * rect.width, y: Math.random() * rect.height,
      r: Math.random() * 1.6 + 0.4, vy: Math.random() * 0.12 + 0.03,
      vx: (Math.random() - 0.5) * 0.05, phase: Math.random() * Math.PI * 2,
    }));
  }
  function tick(t) {
    const rect = hero.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    particles.forEach(p => {
      p.y -= p.vy; p.x += p.vx;
      if (p.y < -4) p.y = rect.height + 4;
      if (p.x < -4) p.x = rect.width + 4;
      if (p.x > rect.width + 4) p.x = -4;
      const twinkle = 0.35 + 0.35 * Math.sin(t / 1400 + p.phase);
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(139,143,232,${twinkle.toFixed(3)})`; ctx.fill();
    });
    rafId = requestAnimationFrame(tick);
  }
  function start() { if (running) return; running = true; resize(); rafId = requestAnimationFrame(tick); }
  function stop() { running = false; if (rafId) cancelAnimationFrame(rafId); }
  new IntersectionObserver((entries) => {
    entries.forEach(entry => entry.isIntersecting ? start() : stop());
  }, { threshold: 0 }).observe(hero);
  let resizeTimer;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 200); });
}
