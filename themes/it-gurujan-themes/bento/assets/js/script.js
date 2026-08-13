(function(){
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ============ Editions dropdown panel ============ */
  var toggle = document.getElementById("editionsToggle");
  var panel = document.getElementById("editionsPanel");
  if (toggle && panel) {
    toggle.addEventListener("click", function(e){
      e.stopPropagation();
      var open = panel.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("click", function(e){
      if (!panel.contains(e.target) && e.target !== toggle) {
        panel.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
    document.addEventListener("keydown", function(e){
      if (e.key === "Escape") {
        panel.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ============ Global cursor spotlight (eased follow) ============ */
  var spot = document.getElementById("spotlight");
  if (spot && !reduceMotion && window.matchMedia("(min-width: 721px)").matches) {
    var targetX = window.innerWidth / 2, targetY = window.innerHeight / 2;
    var curX = targetX, curY = targetY;
    var active = false;

    window.addEventListener("mousemove", function(e){
      targetX = e.clientX; targetY = e.clientY;
      if (!active) { active = true; spot.classList.add("active"); }
    }, { passive: true });

    window.addEventListener("mouseleave", function(){
      active = false;
      spot.classList.remove("active");
    });

    function raf(){
      curX += (targetX - curX) * 0.14;
      curY += (targetY - curY) * 0.14;
      spot.style.transform = "translate(" + curX + "px, " + curY + "px)";
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }

  /* ============ Per-cell local highlight (--mx / --my) ============ */
  if (!reduceMotion) {
    var cells = document.querySelectorAll("[data-cell]");
    cells.forEach(function(cell){
      cell.addEventListener("mousemove", function(e){
        var r = cell.getBoundingClientRect();
        var mx = ((e.clientX - r.left) / r.width) * 100;
        var my = ((e.clientY - r.top) / r.height) * 100;
        cell.style.setProperty("--mx", mx + "%");
        cell.style.setProperty("--my", my + "%");
        cell.classList.add("hovering");
      }, { passive: true });
      cell.addEventListener("mouseleave", function(){
        cell.classList.remove("hovering");
      });
    });
  }

  /* ============ Vertical dot-nav: scroll-spy via IntersectionObserver ============ */
  var dotLinks = document.querySelectorAll(".dotnav a");
  var sections = [];
  dotLinks.forEach(function(link){
    var id = link.getAttribute("href").replace("#", "");
    var el = document.getElementById(id);
    if (el) sections.push({ id: id, el: el, link: link });
  });

  if (sections.length && "IntersectionObserver" in window) {
    var observer = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        var match = sections.find(function(s){ return s.el === entry.target; });
        if (!match) return;
        if (entry.isIntersecting) {
          dotLinks.forEach(function(l){ l.classList.remove("active"); });
          match.link.classList.add("active");
        }
      });
    }, { rootMargin: "-45% 0px -45% 0px", threshold: 0 });

    sections.forEach(function(s){ observer.observe(s.el); });
  }

})();
