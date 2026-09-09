/* ============================================================
   True Tree Care — Planting guide by ZIP code
   ------------------------------------------------------------
   Resolves a ZIP to an approximate hardiness zone and planting
   region, then scores every species in the database against the
   site constraints the user describes.

   The scoring is deliberately transparent: every point awarded
   or withheld is reported back, so the recommendation can be
   argued with rather than merely accepted.
   ============================================================ */
(function () {
  "use strict";

  var E = TTC.esc;
  var SPECIES = window.TTC_SPECIES || [];
  var ZONES = window.TTC_ZONES;

  var state = { site: null, results: [], excluded: [] };

  /* ---------- Scoring ---------- */

  function scoreSpecies(sp, site) {
    var pts = 0, why = [], blockers = [];

    /* Hard filter: hardiness. Species zones are whole numbers; a site at
       6b (6.5) is inside a [3,8] species and outside a [7,10] one. */
    if (site.zoneValue < sp.zones[0]) {
      blockers.push("Not hardy here — rated to zone " + sp.zones[0] + ", site is zone " + site.zone + ".");
    } else if (site.zoneValue > sp.zones[1] + 0.5) {
      blockers.push("Needs more winter chill or less heat than zone " + site.zone + " provides.");
    } else {
      var margin = Math.min(site.zoneValue - sp.zones[0], sp.zones[1] - site.zoneValue);
      pts += Math.min(10, Math.round(margin * 3));
      if (margin < 1) why.push("At the edge of its hardiness range — site it in a protected spot.");
      else why.push("Comfortably hardy in zone " + site.zone + ".");
    }

    /* Hard filter: regionally inappropriate. */
    if (sp.avoid.indexOf(site.region) !== -1) {
      blockers.push("Not recommended in the " + site.regionName + " — " +
                    (sp.liability[0] || "poor regional performance") + ".");
    } else if (sp.regions.indexOf(site.region) !== -1) {
      pts += 30;
      why.push("Proven performer in the " + site.regionName + ".");
    } else {
      pts += 5;
      why.push("Not a regional standard here — verify local performance before specifying.");
    }

    /* Species-level verdict. */
    if (sp.verdict === "asset") { pts += 25; }
    else if (sp.verdict === "situational") { pts += 8; }
    else { blockers.push("Classified as a liability species: " + (sp.liability[0] || "known chronic problems") + "."); }

    /* Utility lines overhead. */
    if (site.utility) {
      if (sp.utility) { pts += 20; why.push("Mature height stays clear of typical distribution lines."); }
      else blockers.push("Matures to " + sp.size[1] + " ft — will conflict with overhead lines.");
    }

    /* Available planting strip / rooting width. */
    if (site.strip && sp.strip > site.strip) {
      blockers.push("Needs about " + sp.strip + " ft of soil width; you have " + site.strip + " ft.");
    } else if (site.strip) {
      pts += 8;
    }

    /* Setback from structures — mature spread must fit. */
    if (site.setback) {
      var halfSpread = sp.size[3] / 2;
      if (halfSpread > site.setback) {
        pts -= 15;
        why.push("Mature spread of " + sp.size[3] + " ft will reach the structure at a " +
                 site.setback + " ft setback — plan for clearance pruning or move it out.");
      } else {
        pts += 8;
        why.push("Mature spread fits the " + site.setback + " ft setback.");
      }
    }

    /* Soil drainage. */
    if (site.drainage && sp.soil.drainage.indexOf(site.drainage) === -1) {
      pts -= 20;
      why.push("Does not favor " + site.drainage + " soil conditions.");
    } else if (site.drainage) {
      pts += 12;
      why.push("Suited to " + site.drainage + " soil.");
    }

    /* Soil pH. */
    if (site.ph) {
      var ph = parseFloat(site.ph);
      if (ph < sp.soil.ph[0] || ph > sp.soil.ph[1]) {
        pts -= 22;
        why.push("Tolerates pH " + sp.soil.ph[0] + "–" + sp.soil.ph[1] +
                 "; at pH " + ph + " expect nutrient availability problems, typically chlorosis.");
      } else {
        pts += 10;
        why.push("Within its pH " + sp.soil.ph[0] + "–" + sp.soil.ph[1] + " tolerance.");
      }
    }

    /* De-icing salt or coastal spray. */
    if (site.salt === "high") {
      if (sp.soil.salt >= 3) { pts += 14; why.push("High salt tolerance."); }
      else if (sp.soil.salt === 2) { pts += 4; }
      else blockers.push("Salt-sensitive — will decline in a high-salt exposure.");
    } else if (site.salt === "moderate") {
      if (sp.soil.salt >= 2) pts += 8;
      else { pts -= 12; why.push("Limited salt tolerance for a salted street or drive."); }
    }

    /* Compaction. */
    if (site.compacted) {
      if (sp.soil.compact >= 3) { pts += 12; why.push("Handles compacted urban soil."); }
      else if (sp.soil.compact === 2) { pts += 3; }
      else { pts -= 18; why.push("Intolerant of compaction — decompaction work is a prerequisite."); }
    }

    /* Regional moisture regime. */
    if (site.rain === "arid" || site.rain === "semiarid") {
      if (sp.soil.drought >= 3) { pts += 12; why.push("Genuinely drought-adapted for a dry climate."); }
      else if (sp.soil.drought === 2) { pts += 2; }
      else { pts -= 16; why.push("Will need permanent supplemental irrigation in this climate."); }
    }

    /* Light. */
    if (site.sun && sp.sun.indexOf(site.sun) === -1) {
      pts -= 20;
      why.push("Does not perform in " + (site.sun === "shade" ? "shade" : site.sun + " sun") + ".");
    } else if (site.sun) {
      pts += 6;
    }

    /* Purpose. */
    if (site.purpose === "shade") {
      if (sp.size[1] >= 45) { pts += 14; why.push("Large canopy — real shade and stormwater interception."); }
      else if (sp.size[1] >= 30) pts += 5;
      else { pts -= 8; why.push("Too small to deliver meaningful shade."); }
    } else if (site.purpose === "ornamental") {
      if (sp.size[1] <= 30) { pts += 14; why.push("Small-tree scale suits an ornamental focal point."); }
      else pts -= 4;
    } else if (site.purpose === "screen") {
      if (sp.size[2] >= 12 && sp.size[1] >= 25) { pts += 12; why.push("Density and height suit a screen planting."); }
    } else if (site.purpose === "wildlife") {
      if (sp.native.indexOf(site.region) !== -1) { pts += 18; why.push("Native to this region — highest wildlife and insect food-web value."); }
      else pts -= 6;
    } else if (site.purpose === "street") {
      if (sp.strip <= 6 && sp.verdict === "asset") { pts += 14; why.push("Proven street-tree structure and footprint."); }
    }

    /* Longevity is the quiet driver of lifetime value. */
    if (sp.lifespan >= 150) { pts += 10; why.push("Multi-century potential — the best lifetime return per planting dollar."); }
    else if (sp.lifespan >= 90) pts += 5;
    else if (sp.lifespan < 40) { pts -= 8; why.push("Short-lived — plan on replacing it within a working lifetime."); }

    /* Native bonus independent of stated purpose. */
    if (sp.native.indexOf(site.region) !== -1 && site.purpose !== "wildlife") pts += 6;

    return { sp: sp, score: pts, why: why, blockers: blockers };
  }

  function run(site) {
    var scored = SPECIES.map(function (sp) { return scoreSpecies(sp, site); });
    var ok = scored.filter(function (r) { return !r.blockers.length; });
    var no = scored.filter(function (r) { return r.blockers.length; });

    ok.sort(function (a, b) { return b.score - a.score; });

    var max = ok.length ? ok[0].score : 1;
    ok.forEach(function (r) { r.match = Math.max(5, Math.round((r.score / max) * 100)); });

    /* The "do not plant" list is the other half of the liability question:
       which locally common trees are actively bad choices here. */
    var dont = SPECIES.filter(function (sp) {
      return sp.verdict === "liability" &&
             (sp.avoid.indexOf(site.region) !== -1 ||
              (site.zoneValue >= sp.zones[0] && site.zoneValue <= sp.zones[1] + 0.5));
    });

    return { ok: ok, no: no, dont: dont };
  }

  /* ---------- Rendering ---------- */

  function traitPills(sp) {
    var p = [];
    p.push('<span class="pill pill-' + (sp.verdict === "asset" ? "asset" : sp.verdict === "liability" ? "liability" : "caution") + '">' +
           (sp.verdict === "asset" ? "Asset" : sp.verdict === "liability" ? "Liability" : "Situational") + "</span>");
    p.push('<span class="pill">Zones ' + sp.zones[0] + "–" + sp.zones[1] + "</span>");
    p.push('<span class="pill">' + sp.size[0] + "–" + sp.size[1] + " ft tall</span>");
    if (sp.utility) p.push('<span class="pill pill-asset">Fits under wires</span>');
    if (sp.soil.salt >= 3) p.push('<span class="pill">Salt tolerant</span>');
    if (sp.soil.drought >= 3) p.push('<span class="pill">Drought tolerant</span>');
    if (sp.soil.compact >= 3) p.push('<span class="pill">Compaction tolerant</span>');
    if (sp.lifespan >= 150) p.push('<span class="pill">Long-lived</span>');
    return p.join("");
  }

  function speciesCard(r, site) {
    var sp = r.sp;
    var html = '<article class="species-card">' +
      "<header><h3>" + E(sp.common) + '</h3><span class="sci">' + E(sp.sci) + "</span>" +
      (r.match ? '<span class="match-score">' + r.match + "% match</span>" : "") +
      "</header>" +
      '<div class="traits">' + traitPills(sp) + "</div>";

    if (sp.cultivars && sp.cultivars.length) {
      html += "<dl><dt>Specify</dt><dd>" + sp.cultivars.map(function (c) {
        return "<strong>" + E(c.name) + "</strong> — " + E(c.note);
      }).join("<br>") + "</dd></dl>";
    }

    html += "<dl>" +
      "<dt>Mature size</dt><dd>" + sp.size[0] + "–" + sp.size[1] + " ft tall, " +
        sp.size[2] + "–" + sp.size[3] + " ft spread</dd>" +
      "<dt>Growth</dt><dd>" + E(sp.growth) + ", roughly " + sp.lifespan + "-year useful life</dd>" +
      "<dt>Soil</dt><dd>pH " + sp.soil.ph[0] + "–" + sp.soil.ph[1] + "; " + sp.soil.drainage.join(", ") + "</dd>" +
      "<dt>Min. strip</dt><dd>" + sp.strip + " ft of soil width</dd>" +
      "</dl>";

    html += '<details style="margin-top:.7rem"><summary class="small" style="cursor:pointer;font-weight:650">' +
            "Why this scored where it did</summary>" +
            '<ul class="small muted" style="padding-left:1.1rem;margin:.5rem 0 0">' +
            r.why.map(function (w) { return "<li>" + E(w) + "</li>"; }).join("") +
            "</ul>";

    if (sp.asset.length) {
      html += '<p class="small" style="margin:.7rem 0 .2rem"><strong>Asset case</strong></p>' +
              '<ul class="small muted" style="padding-left:1.1rem;margin:0">' +
              sp.asset.map(function (a) { return "<li>" + E(a) + "</li>"; }).join("") + "</ul>";
    }
    if (sp.liability.length) {
      html += '<p class="small" style="margin:.7rem 0 .2rem"><strong>Liability case</strong></p>' +
              '<ul class="small muted" style="padding-left:1.1rem;margin:0">' +
              sp.liability.map(function (a) { return "<li>" + E(a) + "</li>"; }).join("") + "</ul>";
    }
    if (sp.pests.length) {
      html += '<p class="small muted" style="margin:.7rem 0 0"><strong>Watch for:</strong> ' +
              E(sp.pests.join("; ")) + "</p>";
    }
    html += "</details></article>";
    return html;
  }

  function render(site, res) {
    var out = document.getElementById("plantResults");

    var html =
      '<div class="card" style="margin-bottom:1.4rem">' +
        '<div class="row" style="gap:1.2rem;align-items:flex-start">' +
          '<div class="zone-badge"><b>' + E(site.zone) + "</b> USDA zone</div>" +
          "<div style=\"flex:1;min-width:220px\">" +
            "<strong>" + E(site.city) + ", " + E(site.state) + "</strong>" +
            '<p class="small muted" style="margin:.25rem 0 0">' + E(site.regionName) + " &middot; " +
            E(site.rain) + " moisture regime</p>" +
          "</div>" +
        "</div>" +
        '<p class="small muted" style="margin:.9rem 0 0">' + E(site.regionNote) + "</p>" +
        '<p class="tiny muted" style="margin:.6rem 0 0">Zone is estimated from the ZIP prefix ' +
        E(site.prefix) + '. Elevation, urban heat island and cold-air drainage shift the real zone by ' +
        "half a zone or more, and soil pH cannot be predicted from a ZIP at all. Confirm on site.</p>" +
      "</div>";

    if (!res.ok.length) {
      html += '<p class="empty">No species in the database clear every constraint you set. ' +
              "Loosen the strictest one — usually the planting strip width or the utility line requirement.</p>";
    } else {
      html += "<h2 style=\"margin-bottom:.3rem\">Recommended for this site</h2>" +
              '<p class="lede small" style="margin-bottom:1.2rem">' + res.ok.length +
              " species clear every constraint, ranked by fit. Expand any card to see the reasoning.</p>" +
              '<div class="grid grid-2">' +
              res.ok.slice(0, 24).map(function (r) { return speciesCard(r, site); }).join("") +
              "</div>";
    }

    if (res.dont.length) {
      html += '<h2 style="margin:2.5rem 0 .3rem">Do not plant here</h2>' +
              '<p class="lede small" style="margin-bottom:1.2rem">These are commonly sold in this ' +
              "climate and are liabilities regardless of price or availability.</p>" +
              '<div class="grid grid-2">' +
              res.dont.map(function (sp) { return speciesCard({ sp: sp, why: [], match: 0 }, site); }).join("") +
              "</div>";
    }

    out.innerHTML = html;
    out.setAttribute("tabindex", "-1");
    out.focus({ preventScroll: true });
    out.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ---------- Wire up ---------- */

  function init() {
    var form = document.getElementById("plantForm");
    if (!form) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var zip = document.getElementById("zip").value;
      var loc = ZONES.lookup(zip);
      var err = document.getElementById("zipError");

      if (!loc) {
        err.textContent = "That does not look like a US ZIP code. Enter five digits, e.g. 27601.";
        err.hidden = false;
        return;
      }
      err.hidden = true;

      var site = {
        zip: loc.zip, prefix: loc.prefix, state: loc.state, city: loc.city,
        region: loc.region, regionName: loc.regionName, regionNote: loc.regionNote,
        zone: loc.zone, zoneValue: loc.zoneValue, rain: loc.rain,
        purpose: document.getElementById("purpose").value,
        sun: document.getElementById("sun").value,
        drainage: document.getElementById("drainage").value,
        ph: document.getElementById("ph").value,
        salt: document.getElementById("salt").value,
        strip: parseFloat(document.getElementById("strip").value) || 0,
        setback: parseFloat(document.getElementById("setback").value) || 0,
        utility: document.getElementById("utility").checked,
        compacted: document.getElementById("compacted").checked
      };

      state.site = site;
      TTC.store.set("lastZip", site.zip);
      render(site, run(site));
    });

    var last = TTC.store.get("lastZip", "");
    if (last) document.getElementById("zip").value = last;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
