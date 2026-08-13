(function(){
  "use strict";

  var html = document.documentElement;
  var body = document.body;

  var fineHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------
     Boot: reveal page (avoids flash of unstyled reveal states)
  --------------------------------------------------------- */
  window.addEventListener('load', function(){
    body.classList.remove('hud-loading');
  });
  // Safety net in case load event is delayed by slow assets
  setTimeout(function(){ body.classList.remove('hud-loading'); }, 1200);

  /* ---------------------------------------------------------
     Footer year
  --------------------------------------------------------- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------------------------------------------------------
     Live "telemetry" clock in the hero tickers
  --------------------------------------------------------- */
  var bootTime = Date.now();
  function pad(n){ return String(n).padStart(2, '0'); }
  function updateClocks(){
    var elapsed = Math.floor((Date.now() - bootTime) / 1000);
    var h = pad(Math.floor(elapsed / 3600));
    var m = pad(Math.floor((elapsed % 3600) / 60));
    var s = pad(elapsed % 60);
    var text = 'T+' + h + ':' + m + ':' + s;
    var c1 = document.getElementById('tickerClock1');
    var c2 = document.getElementById('tickerClock2');
    if (c1) c1.textContent = text;
    if (c2) c2.textContent = text;
  }
  updateClocks();
  setInterval(updateClocks, 1000);

  /* ---------------------------------------------------------
     Custom HUD cursor (desktop, fine pointer only)
  --------------------------------------------------------- */
  if (fineHover) {
    html.classList.add('has-hud-cursor');
    var cursor = document.getElementById('hudCursor');
    var cursorLabel = document.getElementById('hudCursorLabel');

    if (cursor) {
      var mouseX = -100, mouseY = -100;
      var curX = -100, curY = -100;
      var raf = null;

      window.addEventListener('mousemove', function(e){
        mouseX = e.clientX;
        mouseY = e.clientY;
        cursor.style.opacity = '1';
        if (reduceMotion) {
          curX = mouseX; curY = mouseY;
          cursor.style.transform = 'translate3d(' + curX + 'px,' + curY + 'px,0)';
        } else if (!raf) {
          loop();
        }
      }, { passive: true });

      window.addEventListener('mouseleave', function(){
        cursor.style.opacity = '0';
      });

      function loop(){
        curX += (mouseX - curX) * 0.22;
        curY += (mouseY - curY) * 0.22;
        cursor.style.transform = 'translate3d(' + curX + 'px,' + curY + 'px,0)';
        if (Math.abs(mouseX - curX) > 0.1 || Math.abs(mouseY - curY) > 0.1) {
          raf = requestAnimationFrame(loop);
        } else {
          raf = null;
        }
      }

      var interactiveSel = 'a, button, input, textarea, [role="button"], .scan-panel, .work-card, .app-card, .comms-row';
      document.addEventListener('mouseover', function(e){
        var target = e.target.closest ? e.target.closest(interactiveSel) : null;
        if (target) {
          cursor.classList.add('is-locked');
          if (cursorLabel) {
            if (target.matches('a, button, [role="button"]')) cursorLabel.textContent = 'ENGAGE';
            else cursorLabel.textContent = 'SCAN';
          }
        }
      });
      document.addEventListener('mouseout', function(e){
        var target = e.target.closest ? e.target.closest(interactiveSel) : null;
        if (target) {
          cursor.classList.remove('is-locked');
        }
      });
    }
  }

  /* ---------------------------------------------------------
     Mobile nav toggle
  --------------------------------------------------------- */
  var navToggle = document.getElementById('navToggle');
  var navLinks = document.getElementById('navLinks');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function(){
      var open = navLinks.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    navLinks.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', function(){
        navLinks.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---------------------------------------------------------
     Editions dropdown
  --------------------------------------------------------- */
  var editionsToggle = document.getElementById('editionsToggle');
  var editionsPanel = document.getElementById('editionsPanel');
  if (editionsToggle && editionsPanel) {
    editionsToggle.addEventListener('click', function(e){
      e.stopPropagation();
      var open = editionsPanel.classList.toggle('is-open');
      editionsToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('click', function(e){
      if (!editionsPanel.contains(e.target) && e.target !== editionsToggle) {
        editionsPanel.classList.remove('is-open');
        editionsToggle.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape') {
        editionsPanel.classList.remove('is-open');
        editionsToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------------------------------------------------------
     Generic reveal observer — data-observe elements
  --------------------------------------------------------- */
  var revealTargets = document.querySelectorAll('[data-observe]');
  var revealObserver;
  if ('IntersectionObserver' in window) {
    revealObserver = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });
    revealTargets.forEach(function(el){ revealObserver.observe(el); });
  } else {
    revealTargets.forEach(function(el){ el.classList.add('is-visible'); });
  }

  /* ---------------------------------------------------------
     Scan-panel counters (services grid)
  --------------------------------------------------------- */
  function animateMatch(panel){
    var target = parseFloat(panel.getAttribute('data-match')) || 0;
    var valEl = panel.querySelector('.match-val');
    panel.classList.add('is-scanning');

    var reveal = function(){
      panel.classList.remove('is-scanning');
      panel.classList.add('is-scanned');
    };

    if (reduceMotion) {
      if (valEl) valEl.textContent = target.toFixed(1);
      reveal();
      return;
    }

    setTimeout(reveal, 950);

    if (!valEl) return;
    var start = null;
    var duration = 950;
    function step(ts){
      if (!start) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      valEl.textContent = (progress * target).toFixed(1);
      if (progress < 1) requestAnimationFrame(step);
      else valEl.textContent = target.toFixed(1);
    }
    requestAnimationFrame(step);
  }

  var scanPanels = document.querySelectorAll('.scan-panel');
  if ('IntersectionObserver' in window) {
    var scanObserver = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if (entry.isIntersecting) {
          animateMatch(entry.target);
          scanObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });
    scanPanels.forEach(function(p){ scanObserver.observe(p); });
  } else {
    scanPanels.forEach(function(p){
      var valEl = p.querySelector('.match-val');
      if (valEl) valEl.textContent = parseFloat(p.getAttribute('data-match')).toFixed(1);
      p.classList.add('is-scanned');
    });
  }

  /* ---------------------------------------------------------
     Scan-sweep reveal — spotlight, work cards, app cards, about
  --------------------------------------------------------- */
  function triggerScan(el){
    if (reduceMotion) {
      el.classList.add('is-scanned');
      return;
    }
    el.classList.add('is-scanning');
    setTimeout(function(){
      el.classList.remove('is-scanning');
      el.classList.add('is-scanned');
    }, 1100);
  }

  var scanElements = document.querySelectorAll('.spotlight__frame, .work-card, .app-card, .about__imgwrap');
  if ('IntersectionObserver' in window) {
    var elObserver = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if (entry.isIntersecting) {
          triggerScan(entry.target);
          elObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.25 });
    scanElements.forEach(function(el){ elObserver.observe(el); });
  } else {
    scanElements.forEach(function(el){ el.classList.add('is-scanned'); });
  }

  /* ---------------------------------------------------------
     Boot sequence — sequential activation on scroll into view
  --------------------------------------------------------- */
  var bootSteps = document.querySelectorAll('.boot-step');
  if ('IntersectionObserver' in window) {
    var bootObserver = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if (entry.isIntersecting) {
          var i = parseInt(getComputedStyle(entry.target).getPropertyValue('--i')) || 0;
          var delay = reduceMotion ? 0 : i * 220;
          setTimeout(function(){
            entry.target.classList.add('is-active');
          }, delay);
          bootObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    bootSteps.forEach(function(s){ bootObserver.observe(s); });
  } else {
    bootSteps.forEach(function(s){ s.classList.add('is-active'); });
  }

})();
