(() => {
  const section = document.querySelector('.cinema-scroll');
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const track = document.querySelector('.sights-track');
  const sightsControls = document.querySelector('.sights-controls');
  const prevBtn = document.querySelector('.sight-prev');
  const nextBtn = document.querySelector('.sight-next');
  const originalCards = Array.from(document.querySelectorAll('.sight-card'));

  let targetMouseX = 0;
  let targetMouseY = 0;
  let mouseX = 0;
  let mouseY = 0;
  let targetScroll = 0;
  let smoothScroll = 0;
  let initialized = false;
  let rafPending = false;
  let sightCards = [];
  const originalSightCount = originalCards.length;
  let activeSight = originalSightCount;

  function clamp(v, min = 0, max = 1) {
    return Math.min(max, Math.max(min, v));
  }

  function smoothstep(e0, e1, v) {
    const x = clamp((v - e0) / (e1 - e0));
    return x * x * (3 - 2 * x);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function segmentInOut(s, a, b, c, d) {
    const enter = smoothstep(a, b, s);
    const exit = smoothstep(c, d, s);
    return { enter, exit, active: enter * (1 - exit) };
  }

  function getScrollDistance() {
    return clamp(
      -section.getBoundingClientRect().top,
      0,
      section.offsetHeight - window.innerHeight
    );
  }

  function requestTick() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(update);
  }

  function update() {
    rafPending = false;

    targetScroll = getScrollDistance();
    if (!initialized || reduceMotion.matches) {
      smoothScroll = targetScroll;
      initialized = true;
    } else {
      smoothScroll = lerp(smoothScroll, targetScroll, 0.14);
    }
    if (Math.abs(smoothScroll - targetScroll) < 0.08) smoothScroll = targetScroll;

    mouseX = lerp(mouseX, targetMouseX, 0.12);
    mouseY = lerp(mouseY, targetMouseY, 0.12);

    const frame2 = segmentInOut(smoothScroll, 560, 900, 1300, 1620);
    const frame3 = segmentInOut(smoothScroll, 1760, 2140, 2540, 2700);
    const progress = clamp(smoothScroll / 2700);
    const introExit = smoothstep(90, 650, smoothScroll);
    const sightsEnterRaw = smoothstep(2760, 3560, smoothScroll);
    const sightsEnter = Math.pow(sightsEnterRaw, 1.55);
    const sightsControlsEnter = smoothstep(3360, 3660, smoothScroll);
    const blurActive = clamp(frame2.active + frame3.active);
    const frame2Opacity = frame2.active * (1 - frame3.enter);
    const splitDrift = Math.pow(frame2.enter, 1.5);
    const panel2Opacity = frame2.active * (1 - frame2.exit);
    const panel3Opacity = frame3.active * (1 - frame3.exit);
    const backScale = 0.76 + progress * 0.2 + frame2.enter * 0.18 + frame3.enter * 0.16;
    const sharedHeroY = progress * -74;
    const sharedHeroScale = progress * 0.23;
    const sightsScreenTop = Math.min(220, Math.max(112, window.innerHeight * 0.19)) - 50;
    const sightsParentTop = window.innerHeight - (window.innerHeight - sightsScreenTop) / backScale;

    const mxVal = reduceMotion.matches ? 0 : mouseX;
    const myVal = reduceMotion.matches ? 0 : mouseY;
    root.style.setProperty('--mx', mxVal.toFixed(4));
    root.style.setProperty('--my', myVal.toFixed(4));

    root.style.setProperty('--back-opacity', String(1 - frame2.active * 0.06));
    root.style.setProperty('--back-x', `${mouseX * -12}px`);
    root.style.setProperty('--back-y', `${mouseY * -4}px`);
    root.style.setProperty('--back-scale', String(backScale));
    root.style.setProperty('--four-y', `${10 + progress * 10}vh`);
    root.style.setProperty('--four-scale', String(0.78 + progress * 0.16));
    root.style.setProperty('--bazaar-y', `${20 - progress * 8}vh`);
    root.style.setProperty('--blur-px', `${blurActive * 14}px`);
    root.style.setProperty('--back-brightness', String(1 - blurActive * 0.255));
    root.style.setProperty('--bazaar-blur-px', `${frame2.active * 14}px`);
    root.style.setProperty(
      '--bazaar-brightness',
      String(1 - frame2.active * 0.255 - frame3.active * 0.06)
    );
    root.style.setProperty('--bazaar-saturation', String(1 + frame3.active * 0.18));
    root.style.setProperty('--shade-opacity', '1');
    root.style.setProperty('--shade-z', frame2.active > 0.02 ? '2' : '0');
    root.style.setProperty('--shade-top-alpha', String(blurActive * 0.465));
    root.style.setProperty('--shade-mid-alpha', String(blurActive * 0.42));
    root.style.setProperty('--shade-bottom-alpha', String(blurActive * 0.51));

    root.style.setProperty('--title-y', `${introExit * -210}px`);
    root.style.setProperty('--title-scale', String(1 - introExit * 0.08));
    root.style.setProperty('--title-opacity', String(1 - introExit));

    root.style.setProperty('--bridge-x', `calc(-50% + ${mouseX * 18}px)`);
    root.style.setProperty('--bridge-y', `${mouseY * 8 + sharedHeroY - frame2.exit * 760}px`);
    root.style.setProperty('--bridge-bottom', `${5 - frame2.enter * 13}vh`);
    root.style.setProperty('--bridge-width', `${67.2 + frame2.enter * 37.8}vw`);
    root.style.setProperty(
      '--bridge-scale',
      String(1.02 + sharedHeroScale + frame2.exit * 0.46)
    );

    root.style.setProperty(
      '--split-left-x',
      `calc(-50% + ${-splitDrift * 46}vw + ${mouseX * 22}px)`
    );
    root.style.setProperty(
      '--split-left-y',
      `${mouseY * 10 + sharedHeroY - splitDrift * 180}px`
    );
    root.style.setProperty(
      '--split-left-scale',
      String(1 + sharedHeroScale + frame2.enter * 0.74)
    );
    root.style.setProperty(
      '--split-right-x',
      `calc(-50% + ${splitDrift * 46}vw + ${mouseX * 22}px)`
    );
    root.style.setProperty(
      '--split-right-y',
      `${mouseY * 10 + sharedHeroY - splitDrift * 180}px`
    );
    root.style.setProperty(
      '--split-right-scale',
      String(1 + sharedHeroScale + frame2.enter * 0.74)
    );

    root.style.setProperty('--frame2-opacity', String(frame2Opacity));
    root.style.setProperty('--frame2-x', `calc(-50% + ${mouseX * 10}px)`);
    root.style.setProperty(
      '--frame2-y',
      `calc(-50% + ${mouseY * 8 - frame2.exit * 150}px)`
    );
    root.style.setProperty(
      '--frame2-scale',
      String(1.06 + frame2.enter * 0.08 + frame2.exit * 0.08)
    );

    root.style.setProperty('--intro-copy-y', `${introExit * 90}px`);
    root.style.setProperty('--intro-copy-opacity', String(1 - introExit));
    root.style.setProperty('--panel2-opacity', String(panel2Opacity));
    root.style.setProperty(
      '--panel2-y',
      `calc(-50% + ${-frame2.exit * 86 + (1 - frame2.enter) * 58}px)`
    );
    root.style.setProperty('--panel3-opacity', String(panel3Opacity));
    root.style.setProperty(
      '--panel3-y',
      `calc(-50% + ${-frame3.exit * 86 + (1 - frame3.enter) * 58}px)`
    );

    root.style.setProperty('--sights-opacity', String(sightsEnter));
    root.style.setProperty('--sights-controls-opacity', String(sightsControlsEnter));
    sightsControls.classList.toggle('is-ready', sightsControlsEnter > 0.98);
    root.style.setProperty('--sights-visibility', sightsEnter > 0.01 ? 'visible' : 'hidden');
    root.style.setProperty('--sights-y', '0px');
    root.style.setProperty('--sights-enter-x', `${(1 - sightsEnter) * 420}vw`);
    root.style.setProperty('--sights-scale', String(1 / backScale));
    root.style.setProperty('--sights-top', `${sightsParentTop}px`);
    root.style.setProperty('--sights-screen-top', `${sightsScreenTop}px`);

    const scrollDelta = Math.abs(smoothScroll - targetScroll);
    const mouseDeltaX = Math.abs(mouseX - targetMouseX);
    const mouseDeltaY = Math.abs(mouseY - targetMouseY);
    if (scrollDelta > 0.08 || mouseDeltaX > 0.001 || mouseDeltaY > 0.001) {
      requestTick();
    }
  }

  function updateSightSlider() {
    if (!sightCards.length) return;
    const cardWidth = sightCards[0].offsetWidth;
    const gap = parseFloat(getComputedStyle(track).columnGap || '0');
    root.style.setProperty('--sights-shift', `${-(cardWidth + gap) * activeSight}px`);
    sightCards.forEach((card) => {
      card.classList.toggle('is-active', Number(card.dataset.sightIndex) === activeSight);
    });
  }

  function moveSightSlider(dir) {
    activeSight += dir;
    updateSightSlider();
  }

  function selectSightCard(card) {
    const idx = Number(card.dataset.sightIndex);
    if (Number.isFinite(idx)) {
      activeSight = idx;
      updateSightSlider();
    }
  }

  function jumpSightSlider(i) {
    track.classList.add('is-jumping');
    activeSight = i;
    updateSightSlider();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        track.classList.remove('is-jumping');
      });
    });
  }

  function normalizeSightSlider() {
    if (activeSight >= originalSightCount * 2) {
      jumpSightSlider(activeSight - originalSightCount);
    } else if (activeSight < originalSightCount) {
      jumpSightSlider(activeSight + originalSightCount);
    }
  }

  function setupSightSlider() {
    track.replaceChildren();
    const clones = [];
    for (let setIndex = 0; setIndex < 3; setIndex += 1) {
      originalCards.forEach((card, cardIndex) => {
        const clone = card.cloneNode(true);
        clone.dataset.sightIndex = String(setIndex * originalSightCount + cardIndex);
        track.appendChild(clone);
        clones.push(clone);
      });
    }
    sightCards = clones;
    activeSight = originalSightCount;

    sightCards.forEach((card) => {
      card.addEventListener('click', () => selectSightCard(card));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectSightCard(card);
        }
      });
    });

    track.addEventListener('transitionend', normalizeSightSlider);

    updateSightSlider();
  }

  window.addEventListener('scroll', requestTick, { passive: true });
  window.addEventListener('resize', () => {
    updateSightSlider();
    requestTick();
  });
  window.addEventListener(
    'pointermove',
    (e) => {
      targetMouseX = e.clientX / window.innerWidth - 0.5;
      targetMouseY = e.clientY / window.innerHeight - 0.5;
      requestTick();
    },
    { passive: true }
  );

  prevBtn.addEventListener('click', () => moveSightSlider(-1));
  nextBtn.addEventListener('click', () => moveSightSlider(1));

  window.addEventListener('load', () => {
    setupSightSlider();
    requestTick();
  });
})();
