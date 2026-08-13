(function(){
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ============================================================
     DECRYPT / TEXT-SCRAMBLE EFFECT
     Reusable vanilla-JS scramble-to-real-text animation.
     Wraps each character in a span, cycles through random glyphs
     with variable per-character settle timing, then locks in the
     real character. Whitespace is preserved as-is (no scrambling).
     ============================================================ */
  var GLYPHS = '!<>-_\\/[]{}—=+*^?#$%&01ΞΔΨΩλπ01';

  function decryptText(el, opts){
    opts = opts || {};
    var original = el.textContent;
    var chars = original.split('');
    var duration = opts.duration || 900;      // total ms for the whole word/line
    var perCharSpread = opts.spread || 500;    // how staggered char settle times are

    if (reduceMotion) {
      el.textContent = original; // no-op, already correct
      return;
    }

    // Build spans up front so layout width is stable during the scramble.
    el.textContent = '';
    var spans = chars.map(function(ch){
      var span = document.createElement('span');
      span.className = 'decrypt-char';
      span.textContent = ch === ' ' ? ' ' : ch;
      el.appendChild(span);
      return span;
    });

    var startTime = performance.now();
    // Each character gets its own randomized settle point along the timeline
    // so the reveal doesn't look like a uniform typewriter sweep.
    var settleAt = chars.map(function(ch, i){
      if (ch === ' ') return 0;
      var base = (i / chars.length) * perCharSpread;
      var jitter = Math.random() * (duration - perCharSpread);
      return base + jitter;
    });
    var locked = chars.map(function(){ return false; });

    function tick(now){
      var elapsed = now - startTime;
      var allLocked = true;

      for (var i = 0; i < chars.length; i++){
        if (chars[i] === ' ') continue;
        if (locked[i]) continue;

        if (elapsed >= settleAt[i]){
          spans[i].textContent = chars[i];
          spans[i].classList.add('decrypt-settled');
          locked[i] = true;
        } else {
          allLocked = false;
          // re-roll glyph every frame-ish for a lively scramble
          spans[i].textContent = GLYPHS[(Math.random() * GLYPHS.length) | 0];
        }
      }

      if (!allLocked){
        requestAnimationFrame(tick);
      }
    }

    requestAnimationFrame(tick);
  }

  /* Hero: run on load */
  function initHeroDecrypt(){
    var el = document.querySelector('[data-decrypt-trigger="load"]');
    if (!el) return;
    if (reduceMotion){ return; }
    // slight delay so it starts right as the vault unlocks
    setTimeout(function(){
      decryptText(el, { duration: 1100, spread: 650 });
    }, 250);
  }

  /* Section headings: run on scroll into view, once each */
  function initScrollDecrypt(){
    var targets = document.querySelectorAll('.section-title[data-decrypt]');
    if (!targets.length) return;

    if (reduceMotion){
      return; // leave text as-is
    }

    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if (entry.isIntersecting){
          decryptText(entry.target, { duration: 750, spread: 400 });
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });

    targets.forEach(function(t){ io.observe(t); });
  }

  /* ============================================================
     ENTRY / AUTH SEQUENCE
     ============================================================ */
  function initAuthGate(){
    var gate = document.getElementById('auth-gate');
    var site = document.getElementById('site');
    var body = document.body;

    if (!gate || !site) return;

    function unlock(){
      gate.classList.add('gate-hidden');
      site.classList.add('site-unlocked');
      body.classList.remove('pre-auth');
      gate.setAttribute('aria-hidden', 'true');
      setTimeout(function(){
        initHeroDecrypt();
      }, reduceMotion ? 0 : 150);
    }

    if (reduceMotion){
      // Skip straight to unlocked hero, no animated sequence at all.
      gate.style.display = 'none';
      site.classList.add('site-unlocked');
      body.classList.remove('pre-auth');
      initHeroDecrypt();
      return;
    }

    var log = document.getElementById('auth-log');
    var barFill = document.getElementById('auth-bar-fill');
    var skipBtn = document.getElementById('auth-skip');

    var lines = [
      'VERIFYING ACCESS...',
      'DECRYPTING PROFILE...',
      'LOADING CLEARANCE DATA...',
      'ACCESS GRANTED'
    ];

    var totalDuration = 2000; // ms, within the 1.5-2.5s spec
    var stepDelay = totalDuration / lines.length;
    var doneCalled = false;

    function finish(){
      if (doneCalled) return;
      doneCalled = true;
      clearTimeout(barTimer);
      lines.forEach(function(_, i){ clearTimeout(lineTimers[i]); });
      unlock();
    }

    var lineTimers = [];
    lines.forEach(function(text, i){
      lineTimers[i] = setTimeout(function(){
        var p = document.createElement('p');
        p.className = 'auth-log-line' + (text === 'ACCESS GRANTED' ? ' ok' : '');
        p.innerHTML = '<span class="tick">' + (text === 'ACCESS GRANTED' ? '✓' : '›') + '</span> ' + text;
        log.appendChild(p);
      }, i * stepDelay);
    });

    var barTimer = setTimeout(function(){}, 0);
    var barStart = performance.now();
    function animateBar(now){
      var elapsed = now - barStart;
      var pct = Math.min(100, (elapsed / totalDuration) * 100);
      barFill.style.width = pct + '%';
      if (pct < 100){
        requestAnimationFrame(animateBar);
      }
    }
    requestAnimationFrame(animateBar);

    barTimer = setTimeout(finish, totalDuration + 250);

    if (skipBtn){
      skipBtn.addEventListener('click', finish);
    }
  }

  /* ============================================================
     REDACTED-BAR DECLASSIFY (case files)
     ============================================================ */
  function initRedactReveal(){
    var lines = document.querySelectorAll('.redact-line[data-redact]');
    if (!lines.length) return;

    if (reduceMotion){
      lines.forEach(function(l){ l.classList.add('declassified'); });
      return;
    }

    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if (entry.isIntersecting){
          var target = entry.target;
          var group = target.closest('.casefile-body');
          var siblings = group ? Array.prototype.slice.call(group.querySelectorAll('.redact-line[data-redact]')) : [target];
          var idx = siblings.indexOf(target);
          var delay = Math.max(0, idx) * 130;
          setTimeout(function(){
            target.classList.add('declassified');
          }, delay);
          io.unobserve(target);
        }
      });
    }, { threshold: 0.3 });

    lines.forEach(function(l){ io.observe(l); });
  }

  /* ============================================================
     PROTOCOL STEP CHECKLIST (process section)
     ============================================================ */
  function initProtocolSteps(){
    var steps = document.querySelectorAll('.protocol-step[data-step]');
    if (!steps.length) return;

    if (reduceMotion){
      steps.forEach(function(s){ s.classList.add('checked'); });
      return;
    }

    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if (entry.isIntersecting){
          entry.target.classList.add('checked');
        }
      });
    }, { threshold: 0.5 });

    steps.forEach(function(s){ io.observe(s); });
  }

  /* ============================================================
     VAULT CARD TAP-TO-UNLOCK (touch devices without hover)
     ============================================================ */
  function initVaultCardTap(){
    var cards = document.querySelectorAll('.vault-card');
    cards.forEach(function(card){
      card.addEventListener('click', function(){
        cards.forEach(function(c){ if (c !== card) c.classList.remove('tapped'); });
        card.classList.toggle('tapped');
      });
    });
  }

  /* ============================================================
     MOBILE NAV TOGGLE
     ============================================================ */
  function initMobileNav(){
    var toggle = document.getElementById('navToggle');
    var nav = document.getElementById('mobileNav');
    if (!toggle || !nav) return;

    toggle.addEventListener('click', function(){
      var isOpen = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    nav.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', function(){
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ============================================================
     INIT
     ============================================================ */
  document.addEventListener('DOMContentLoaded', function(){
    initAuthGate();
    initScrollDecrypt();
    initRedactReveal();
    initProtocolSteps();
    initVaultCardTap();
    initMobileNav();
  });

})();
