(function () {
  "use strict";

  var prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ============================================================
     Editions menu toggle
     ============================================================ */
  var editionsToggle = document.getElementById("editionsToggle");
  var editionsMenu = document.getElementById("editionsMenu");

  if (editionsToggle && editionsMenu) {
    editionsToggle.addEventListener("click", function () {
      var isOpen = !editionsMenu.hidden;
      editionsMenu.hidden = isOpen;
      editionsToggle.setAttribute("aria-expanded", String(!isOpen));
    });

    document.addEventListener("click", function (e) {
      if (!editionsMenu.hidden && !editionsMenu.contains(e.target) && e.target !== editionsToggle) {
        editionsMenu.hidden = true;
        editionsToggle.setAttribute("aria-expanded", "false");
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !editionsMenu.hidden) {
        editionsMenu.hidden = true;
        editionsToggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ============================================================
     Hero chat: thinking -> tool pills -> typewriter response
     ============================================================ */
  var PITCH = "A software development studio specializing in Frappe/ERPNext implementation and customization, AI-powered business tools that actually talk to your live data, and custom websites & mobile apps.";

  var thinking = document.getElementById("thinking");
  var toolPills = document.getElementById("toolPills");
  var aiBubble = document.getElementById("aiBubble");
  var aiMeta = document.getElementById("aiMeta");
  var typewriterText = document.getElementById("typewriterText");
  var typeCursor = document.getElementById("typeCursor");
  var quickReplies = document.getElementById("quickReplies");

  function showFullImmediately() {
    if (thinking) thinking.hidden = true;
    if (toolPills) toolPills.hidden = true;
    if (aiBubble) aiBubble.hidden = false;
    if (typewriterText) typewriterText.textContent = PITCH;
    if (typeCursor) typeCursor.style.display = "none";
    if (aiMeta) aiMeta.hidden = false;
    if (quickReplies) quickReplies.hidden = false;
  }

  function typeWriter(el, text, speed, done) {
    var i = 0;
    (function tick() {
      if (i <= text.length) {
        el.textContent = text.slice(0, i);
        i++;
        setTimeout(tick, speed);
      } else if (done) {
        done();
      }
    })();
  }

  function runHeroSequence() {
    if (prefersReduced) {
      showFullImmediately();
      return;
    }
    // thinking + tool pills visible for ~1.4s
    setTimeout(function () {
      if (thinking) thinking.hidden = true;
      if (toolPills) toolPills.hidden = true;
      if (aiBubble) aiBubble.hidden = false;
      typeWriter(typewriterText, PITCH, 16, function () {
        if (typeCursor) typeCursor.style.display = "none";
        if (aiMeta) aiMeta.hidden = false;
        if (quickReplies) {
          quickReplies.hidden = false;
          quickReplies.style.opacity = "0";
          requestAnimationFrame(function () {
            quickReplies.style.transition = "opacity 0.4s ease";
            quickReplies.style.opacity = "1";
          });
        }
      });
    }, 1500);
  }

  // Kick off once hero is in view (or immediately, it's above the fold)
  if (typewriterText) {
    runHeroSequence();
  }

  /* ============================================================
     File-tree expand/collapse (Work section)
     ============================================================ */
  var fnodeRows = document.querySelectorAll(".fnode__row");
  fnodeRows.forEach(function (row) {
    row.addEventListener("click", function () {
      var expanded = row.getAttribute("aria-expanded") === "true";
      var panel = row.parentElement.querySelector(".fnode__panel");
      row.setAttribute("aria-expanded", String(!expanded));
      if (panel) panel.hidden = expanded;
    });
  });

  /* ============================================================
     Command bar: focus effect on click (visual affordance only)
     ============================================================ */
  var cmdbar = document.getElementById("cmdbar");
  if (cmdbar) {
    cmdbar.addEventListener("click", function (e) {
      if (e.target.closest(".chip")) return; // let links/buttons work normally
      document.getElementById("services").scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth" });
    });
    // Fake ⌘K shortcut -> jump to services as a nod to the placeholder text
    document.addEventListener("keydown", function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        document.getElementById("services").scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth" });
      }
    });
  }
})();
