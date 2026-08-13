// IT Gurujan — "Kinetic" edition — vanilla JS only

(function(){
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Full-screen overlay menu ---------- */
  var toggle = document.getElementById("menuToggle");
  var menu = document.getElementById("overlayMenu");

  if (toggle && menu){
    toggle.addEventListener("click", function(){
      var open = menu.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      document.body.classList.toggle("menu-open", open);
    });

    menu.querySelectorAll("a").forEach(function(link){
      link.addEventListener("click", function(){
        menu.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
        document.body.classList.remove("menu-open");
      });
    });
  }

  /* ---------- Cursor-following aurora blob ---------- */
  var blob = document.getElementById("blob");
  if (blob && !reduceMotion && window.matchMedia("(min-width: 721px)").matches){
    var targetX = window.innerWidth / 2;
    var targetY = window.innerHeight / 2;
    var curX = targetX;
    var curY = targetY;

    window.addEventListener("mousemove", function(e){
      targetX = e.clientX;
      targetY = e.clientY;
    });

    function animateBlob(){
      curX += (targetX - curX) * 0.08;
      curY += (targetY - curY) * 0.08;
      blob.style.transform = "translate(" + curX + "px, " + curY + "px)";
      requestAnimationFrame(animateBlob);
    }
    requestAnimationFrame(animateBlob);
  }

})();
