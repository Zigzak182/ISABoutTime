/* ============================================================
   True Tree Care — TreePlot GPS
   ------------------------------------------------------------
   Field inventory tool. Captures a tree's position from the
   device GPS (or a map tap), records the attributes an arborist
   actually needs, and exports GeoJSON or CSV for a real GIS.

   Everything is stored in this browser's localStorage. Nothing
   is uploaded anywhere, which also means: export before you
   clear site data, and export before you change devices.
   ============================================================ */
(function () {
  "use strict";

  var E = TTC.esc;
  var STORE = "plotTrees";

  var map = null, layer = null, meMarker = null, meCircle = null, didFit = false;
  var trees = TTC.store.get(STORE, []);
  var watchId = null;
  var lastFix = null;
  var pendingLatLng = null;

  var COND_COLOR = {
    excellent: "#2f7a45", good: "#6aa84f", fair: "#c9962c",
    poor: "#d2792b", dead: "#b3352b"
  };

  /* ---------- Persistence ---------- */

  function save() {
    if (!TTC.store.set(STORE, trees)) {
      flash("Could not save — browser storage is full or blocked. Export your data now.", true);
    }
  }

  function flash(msg, bad) {
    var el = document.getElementById("plotFlash");
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    el.style.borderLeftColor = bad ? "var(--risk-extreme)" : "var(--canopy)";
    clearTimeout(flash._t);
    flash._t = setTimeout(function () { el.hidden = true; }, 6000);
  }

  /* ---------- Map ---------- */

  function initMap() {
    if (typeof L === "undefined") {
      document.getElementById("map").innerHTML =
        '<div class="empty" style="padding:3rem 1.5rem">' +
        "<strong>Map library unavailable.</strong><br>" +
        "TreePlot needs an internet connection to load the map tiles. " +
        "GPS capture, the tree list and export all still work below." +
        "</div>";
      return false;
    }

    map = L.map("map", { zoomControl: true }).setView([39.5, -98.35], 4);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    layer = L.layerGroup().addTo(map);

    map.on("click", function (e) {
      pendingLatLng = { lat: e.latlng.lat, lng: e.latlng.lng, acc: null, src: "map" };
      openDialog();
    });

    return true;
  }

  function pinIcon(color) {
    return L.divIcon({
      className: "",
      html: '<div class="pin" style="background:' + color + '"></div>',
      iconSize: [22, 22],
      iconAnchor: [11, 20],
      popupAnchor: [0, -18]
    });
  }

  function drawTrees() {
    if (!layer) return;
    layer.clearLayers();
    trees.forEach(function (t) {
      var m = L.marker([t.lat, t.lng], { icon: pinIcon(COND_COLOR[t.condition] || "#6aa84f") });
      m.bindPopup(
        "<strong>" + E(t.species || "Unidentified") + "</strong><br>" +
        (t.dbh ? E(t.dbh) + " in DBH &middot; " : "") + E(t.condition) + " condition<br>" +
        "Risk: " + E(t.risk || "not rated") + "<br>" +
        (t.notes ? "<em>" + E(t.notes) + "</em><br>" : "") +
        '<span style="font-family:monospace;font-size:.85em">' +
          t.lat.toFixed(6) + ", " + t.lng.toFixed(6) +
          (t.acc ? " (±" + Math.round(t.acc) + " m)" : "") +
        "</span>"
      );
      m.addTo(layer);
    });

    /* Fit to the inventory once, on load. Re-fitting after every save would
       yank the view away from someone walking a site adding trees. */
    if (trees.length && map && !didFit) {
      didFit = true;
      var b = L.latLngBounds(trees.map(function (t) { return [t.lat, t.lng]; }));
      map.fitBounds(b.pad(0.25), { maxZoom: 19 });
    }
  }

  /* Explicit "show everything" for when the user does want to zoom out. */
  function fitAll() {
    if (!map || !trees.length) return;
    var b = L.latLngBounds(trees.map(function (t) { return [t.lat, t.lng]; }));
    map.fitBounds(b.pad(0.25), { maxZoom: 19 });
  }

  /* ---------- GPS ---------- */

  function startGPS() {
    if (!navigator.geolocation) {
      flash("This browser does not support geolocation.", true);
      return;
    }
    var btn = document.getElementById("gpsBtn");
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
      btn.textContent = "Start GPS";
      document.getElementById("gpsReadout").textContent = "GPS off";
      return;
    }

    btn.textContent = "Stop GPS";
    document.getElementById("gpsReadout").textContent = "Acquiring…";

    watchId = navigator.geolocation.watchPosition(function (pos) {
      lastFix = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        acc: pos.coords.accuracy
      };
      document.getElementById("gpsReadout").textContent =
        lastFix.lat.toFixed(6) + ", " + lastFix.lng.toFixed(6) + "  ±" + Math.round(lastFix.acc) + " m";
      document.getElementById("plotHereBtn").disabled = false;

      if (map) {
        var ll = [lastFix.lat, lastFix.lng];
        if (!meMarker) {
          meMarker = L.circleMarker(ll, {
            radius: 6, color: "#fff", weight: 2, fillColor: "#3b7ea1", fillOpacity: 1
          }).addTo(map).bindPopup("You are here");
          meCircle = L.circle(ll, {
            radius: lastFix.acc, color: "#3b7ea1", weight: 1, fillOpacity: .08
          }).addTo(map);
          map.setView(ll, 19);
        } else {
          meMarker.setLatLng(ll);
          meCircle.setLatLng(ll).setRadius(lastFix.acc);
        }
      }
    }, function (err) {
      document.getElementById("gpsReadout").textContent = "GPS unavailable";
      flash("Location error: " + err.message + ". On the web, geolocation requires HTTPS.", true);
      watchId = null;
      document.getElementById("gpsBtn").textContent = "Start GPS";
    }, { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 });
  }

  /* ---------- Record dialog ---------- */

  function openDialog(existing) {
    var dlg = document.getElementById("treeDialog");
    var f = document.getElementById("treeForm");
    f.reset();

    document.getElementById("editId").value = existing ? existing.id : "";
    if (existing) {
      document.getElementById("tSpecies").value = existing.species || "";
      document.getElementById("tDbh").value = existing.dbh || "";
      document.getElementById("tCondition").value = existing.condition || "good";
      document.getElementById("tRisk").value = existing.risk || "low";
      document.getElementById("tNotes").value = existing.notes || "";
      pendingLatLng = { lat: existing.lat, lng: existing.lng, acc: existing.acc, src: existing.src };
    }

    document.getElementById("dialogCoords").textContent = pendingLatLng
      ? pendingLatLng.lat.toFixed(6) + ", " + pendingLatLng.lng.toFixed(6) +
        (pendingLatLng.acc ? "  ±" + Math.round(pendingLatLng.acc) + " m GPS" : "  (placed on map)")
      : "No position";

    document.getElementById("deleteBtn").hidden = !existing;
    if (typeof dlg.showModal === "function") dlg.showModal();
    else dlg.setAttribute("open", "");
  }

  function closeDialog() {
    var dlg = document.getElementById("treeDialog");
    if (typeof dlg.close === "function") dlg.close();
    else dlg.removeAttribute("open");
  }

  function saveTree(e) {
    e.preventDefault();
    if (!pendingLatLng) { closeDialog(); return; }

    var id = document.getElementById("editId").value;
    var rec = {
      id: id || ("t" + Date.now() + Math.random().toString(36).slice(2, 6)),
      lat: pendingLatLng.lat,
      lng: pendingLatLng.lng,
      acc: pendingLatLng.acc,
      src: pendingLatLng.src,
      species: document.getElementById("tSpecies").value.trim(),
      dbh: parseFloat(document.getElementById("tDbh").value) || null,
      condition: document.getElementById("tCondition").value,
      risk: document.getElementById("tRisk").value,
      notes: document.getElementById("tNotes").value.trim(),
      recorded: new Date().toISOString()
    };

    if (id) {
      trees = trees.map(function (t) { return t.id === id ? rec : t; });
    } else {
      trees.push(rec);
    }

    save();
    drawTrees();
    renderList();
    closeDialog();
    flash(id ? "Tree updated." : "Tree recorded.");
  }

  /* ---------- List & stats ---------- */

  function renderList() {
    var el = document.getElementById("treeList");
    if (!el) return;

    if (!trees.length) {
      el.innerHTML = '<p class="empty">No trees plotted yet. Start GPS and tap ' +
                     '<strong>Plot tree here</strong>, or click anywhere on the map.</p>';
    } else {
      el.innerHTML = trees.slice().reverse().map(function (t) {
        return '<button type="button" class="tree-row" data-id="' + E(t.id) + '">' +
          '<span class="dot" style="background:' + (COND_COLOR[t.condition] || "#6aa84f") + '"></span>' +
          "<span><strong>" + E(t.species || "Unidentified") + "</strong>" +
          '<br><span class="meta">' +
            (t.dbh ? t.dbh + '" DBH &middot; ' : "") + E(t.condition) + " &middot; " + E(t.risk) + " risk" +
          "</span></span>" +
          '<span class="meta mono">' + t.lat.toFixed(4) + "<br>" + t.lng.toFixed(4) + "</span>" +
          "</button>";
      }).join("");

      Array.prototype.forEach.call(el.querySelectorAll("[data-id]"), function (b) {
        b.addEventListener("click", function () {
          var t = trees.filter(function (x) { return x.id === b.getAttribute("data-id"); })[0];
          if (!t) return;
          if (map) map.setView([t.lat, t.lng], 20);
          openDialog(t);
        });
      });
    }

    renderStats();
  }

  function renderStats() {
    var el = document.getElementById("plotStats");
    if (!el) return;

    var n = trees.length;
    var withDbh = trees.filter(function (t) { return t.dbh; });
    var avgDbh = withDbh.length
      ? (withDbh.reduce(function (a, t) { return a + t.dbh; }, 0) / withDbh.length).toFixed(1)
      : "—";
    var atRisk = trees.filter(function (t) { return t.risk === "high" || t.risk === "extreme"; }).length;

    /* Count case-insensitively so "Red Maple" and "red maple" are one
       species, but keep the first spelling seen for display. */
    var counts = {}, display = {};
    trees.forEach(function (t) {
      var raw = (t.species || "Unidentified").trim();
      var key = raw.toLowerCase();
      counts[key] = (counts[key] || 0) + 1;
      if (!display[key]) display[key] = raw;
    });
    var speciesCount = Object.keys(counts).length;

    /* The 10-20-30 guideline, applied to whatever has been inventoried. */
    var top = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; })[0];
    var topShare = n ? Math.round(counts[top] / n * 100) : 0;

    el.innerHTML =
      '<div class="stat"><b>' + n + "</b><span>Trees plotted</span></div>" +
      '<div class="stat"><b>' + speciesCount + "</b><span>Distinct species</span></div>" +
      '<div class="stat"><b>' + avgDbh + '"</b><span>Average DBH</span></div>' +
      '<div class="stat"><b>' + atRisk + "</b><span>High or extreme risk</span></div>";

    var note = document.getElementById("diversityNote");
    if (note) {
      if (!n) { note.hidden = true; }
      else {
        note.hidden = false;
        note.innerHTML = topShare > 10
          ? "<strong>Diversity flag.</strong> " + E(display[top]) + " is " + topShare + "% of this inventory. " +
            "The 10-20-30 guideline caps any single species at 10% of a population — this planting is " +
            "exposed to a single pest or disease event."
          : "<strong>Diversity looks reasonable.</strong> No single species exceeds 10% of the " +
            "inventory, which is the threshold the 10-20-30 guideline sets.";
      }
    }
  }

  /* ---------- Export / import ---------- */

  function toGeoJSON() {
    return JSON.stringify({
      type: "FeatureCollection",
      features: trees.map(function (t) {
        return {
          type: "Feature",
          geometry: { type: "Point", coordinates: [t.lng, t.lat] },
          properties: {
            id: t.id, species: t.species, dbh_in: t.dbh, condition: t.condition,
            risk: t.risk, notes: t.notes, gps_accuracy_m: t.acc,
            position_source: t.src, recorded: t.recorded
          }
        };
      })
    }, null, 2);
  }

  function toCSV() {
    var cols = ["id", "species", "dbh_in", "condition", "risk", "latitude", "longitude",
                "gps_accuracy_m", "position_source", "notes", "recorded"];
    function cell(v) {
      if (v === null || v === undefined) return "";
      var s = String(v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }
    var rows = trees.map(function (t) {
      return [t.id, t.species, t.dbh, t.condition, t.risk, t.lat, t.lng,
              t.acc, t.src, t.notes, t.recorded].map(cell).join(",");
    });
    return cols.join(",") + "\n" + rows.join("\n");
  }

  function importGeoJSON(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var gj = JSON.parse(reader.result);
        if (!gj || gj.type !== "FeatureCollection" || !Array.isArray(gj.features)) {
          throw new Error("Not a GeoJSON FeatureCollection");
        }
        var added = 0;
        gj.features.forEach(function (f) {
          if (!f.geometry || f.geometry.type !== "Point") return;
          var c = f.geometry.coordinates, p = f.properties || {};
          if (!isFinite(c[0]) || !isFinite(c[1])) return;
          trees.push({
            id: "t" + Date.now() + Math.random().toString(36).slice(2, 6),
            lng: c[0], lat: c[1],
            acc: p.gps_accuracy_m || null,
            src: p.position_source || "import",
            species: p.species || "",
            dbh: p.dbh_in || null,
            condition: COND_COLOR[p.condition] ? p.condition : "good",
            risk: p.risk || "low",
            notes: p.notes || "",
            recorded: p.recorded || new Date().toISOString()
          });
          added++;
        });
        save(); drawTrees(); renderList();
        flash("Imported " + added + " tree" + (added === 1 ? "" : "s") + ".");
      } catch (err) {
        flash("Could not read that file: " + err.message, true);
      }
    };
    reader.readAsText(file);
  }

  /* ---------- Init ---------- */

  function init() {
    if (!document.getElementById("map")) return;

    initMap();
    drawTrees();
    renderList();

    document.getElementById("gpsBtn").addEventListener("click", startGPS);
    document.getElementById("fitBtn").addEventListener("click", function () {
      if (!trees.length) { flash("Nothing plotted yet.", true); return; }
      fitAll();
    });

    document.getElementById("plotHereBtn").addEventListener("click", function () {
      if (!lastFix) { flash("No GPS fix yet — start GPS and wait for a position.", true); return; }
      pendingLatLng = { lat: lastFix.lat, lng: lastFix.lng, acc: lastFix.acc, src: "gps" };
      openDialog();
    });

    document.getElementById("treeForm").addEventListener("submit", saveTree);
    document.getElementById("cancelBtn").addEventListener("click", closeDialog);

    document.getElementById("deleteBtn").addEventListener("click", function () {
      var id = document.getElementById("editId").value;
      if (!id) return;
      trees = trees.filter(function (t) { return t.id !== id; });
      save(); drawTrees(); renderList(); closeDialog();
      flash("Tree removed.");
    });

    document.getElementById("exportGeo").addEventListener("click", function () {
      if (!trees.length) { flash("Nothing to export yet.", true); return; }
      TTC.download("treeplot-" + new Date().toISOString().slice(0, 10) + ".geojson",
                   toGeoJSON(), "application/geo+json");
    });

    document.getElementById("exportCsv").addEventListener("click", function () {
      if (!trees.length) { flash("Nothing to export yet.", true); return; }
      TTC.download("treeplot-" + new Date().toISOString().slice(0, 10) + ".csv",
                   toCSV(), "text/csv;charset=utf-8");
    });

    document.getElementById("importFile").addEventListener("change", function (e) {
      if (e.target.files && e.target.files[0]) importGeoJSON(e.target.files[0]);
      e.target.value = "";
    });

    document.getElementById("clearAll").addEventListener("click", function () {
      if (!trees.length) return;
      if (!confirm("Delete all " + trees.length + " plotted trees from this browser? " +
                   "Export first if you want to keep them — this cannot be undone.")) return;
      trees = [];
      save(); drawTrees(); renderList();
      flash("All trees cleared.");
    });

    /* Species datalist from the platform database. */
    var dl = document.getElementById("speciesList");
    if (dl && window.TTC_SPECIES) {
      window.TTC_SPECIES.forEach(function (s) {
        var o = document.createElement("option");
        o.value = s.common;
        o.label = s.sci;
        dl.appendChild(o);
      });
    }

    window.addEventListener("beforeunload", function () {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
