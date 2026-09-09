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

  /* Service worker -------------------------------------------------- */
  /* The site root is injected at build time so registration works whether
     the site is served from a domain root or a project subpath, and from
     pages one directory deep. */
  var base = document.documentElement.getAttribute("data-base") || "";

  function toast(message, actionLabel, onAction) {
    var el = document.createElement("div");
    el.className = "toast";
    el.setAttribute("role", "status");

    var text = document.createElement("span");
    text.textContent = message;
    el.appendChild(text);

    if (actionLabel) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn-sm";
      btn.textContent = actionLabel;
      btn.addEventListener("click", function () { onAction(el); });
      el.appendChild(btn);
    }

    var close = document.createElement("button");
    close.type = "button";
    close.className = "toast-close";
    close.setAttribute("aria-label", "Dismiss");
    close.innerHTML = "&times;";
    close.addEventListener("click", function () { el.remove(); });
    el.appendChild(close);

    document.body.appendChild(el);
    return el;
  }

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register(base + "sw.js", { scope: base || "./" })
        .then(function (reg) {
          /* A worker already waiting means a previous visit downloaded an
             update that this tab has not adopted yet. */
          if (reg.waiting && navigator.serviceWorker.controller) offerUpdate(reg.waiting);

          reg.addEventListener("updatefound", function () {
            var next = reg.installing;
            if (!next) return;
            next.addEventListener("statechange", function () {
              /* No controller means this is the very first install — that is
                 not an update, and prompting for it would be nonsense. */
              if (next.state === "installed" && navigator.serviceWorker.controller) {
                offerUpdate(next);
              }
            });
          });
        })["catch"](function (err) {
          console.warn("Service worker registration failed:", err && err.message);
        });

      /* controllerchange also fires on the very first install, when the new
         worker calls clients.claim(). Reloading then would bounce every
         first-time visitor for no reason, so only reload when the user
         actually asked for the update. */
      navigator.serviceWorker.addEventListener("controllerchange", function () {
        if (!updateRequested) return;
        updateRequested = false;
        window.location.reload();
      });
    });
  }

  var updateRequested = false;

  function offerUpdate(worker) {
    toast("A new version is ready.", "Reload", function (el) {
      updateRequested = true;
      el.remove();
      worker.postMessage({ type: "SKIP_WAITING" });
    });
  }

  /* Offline indicator ----------------------------------------------- */
  /* Worth surfacing on a field tool: knowing you are offline explains why
     map tiles outside the cached area are blank. */
  var offlineBadge = null;
  function syncOnline() {
    if (navigator.onLine) {
      if (offlineBadge) { offlineBadge.remove(); offlineBadge = null; }
    } else if (!offlineBadge) {
      offlineBadge = document.createElement("div");
      offlineBadge.className = "offline-badge";
      offlineBadge.setAttribute("role", "status");
      offlineBadge.textContent = "Offline — working from cached data";
      document.body.appendChild(offlineBadge);
    }
  }
  window.addEventListener("online", syncOnline);
  window.addEventListener("offline", syncOnline);
  syncOnline();
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
