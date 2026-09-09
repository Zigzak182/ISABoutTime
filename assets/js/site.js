/* True Tree Care — shared site behavior. Progressive enhancement only:
   every page reads and navigates correctly with this file blocked. */
(function () {
  "use strict";

  /* Mobile nav ------------------------------------------------------ */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("sitenav");

  function isMobile() { return window.matchMedia("(max-width: 900px)").matches; }

  function setNav(open) {
    if (!nav || !toggle) return;
    nav.hidden = !open;
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function syncNav() { setNav(!isMobile()); }

  if (toggle && nav) {
    syncNav();
    window.addEventListener("resize", syncNav);
    toggle.addEventListener("click", function () {
      setNav(toggle.getAttribute("aria-expanded") !== "true");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A" && isMobile()) setNav(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isMobile()) setNav(false);
    });
  }

  /* Footer year ----------------------------------------------------- */
  var y = document.querySelector("[data-year]");
  if (y) y.textContent = String(new Date().getFullYear());
})();

/* Small helpers shared by the platform apps. -------------------------- */
window.TTC = {
  /* Escape untrusted text before it goes anywhere near innerHTML. */
  esc: function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  },

  /* Namespaced localStorage that fails silently in private mode. */
  store: {
    get: function (key, fallback) {
      try {
        var raw = localStorage.getItem("ttc:" + key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set: function (key, value) {
      try { localStorage.setItem("ttc:" + key, JSON.stringify(value)); return true; }
      catch (e) { return false; }
    },
    remove: function (key) {
      try { localStorage.removeItem("ttc:" + key); } catch (e) {}
    }
  },

  /* Fisher-Yates, on a copy. */
  shuffle: function (arr) {
    var a = arr.slice(), i, j, t;
    for (i = a.length - 1; i > 0; i--) {
      j = Math.floor(Math.random() * (i + 1));
      t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  },

  /* Trigger a client-side file download. */
  download: function (filename, text, mime) {
    var blob = new Blob([text], { type: mime || "text/plain;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  },

  /* Tab controller for the .app-tabs / .panel pattern. */
  tabs: function (tablistSel) {
    var list = document.querySelector(tablistSel);
    if (!list) return;
    var buttons = Array.prototype.slice.call(list.querySelectorAll("[data-panel]"));

    function show(id) {
      buttons.forEach(function (b) {
        var on = b.getAttribute("data-panel") === id;
        b.setAttribute("aria-selected", on ? "true" : "false");
        var panel = document.getElementById(b.getAttribute("data-panel"));
        if (panel) panel.hidden = !on;
      });
      if (history.replaceState) history.replaceState(null, "", "#" + id);
    }

    buttons.forEach(function (b) {
      b.addEventListener("click", function () { show(b.getAttribute("data-panel")); });
    });

    var initial = location.hash.replace("#", "");
    var valid = buttons.some(function (b) { return b.getAttribute("data-panel") === initial; });
    show(valid ? initial : buttons[0].getAttribute("data-panel"));
    return { show: show };
  }
};
