/* ============================================================
   Seed — Liability vs. Asset assessment
   ------------------------------------------------------------
   Two analyses, one verdict.

   1. RISK. The likelihood-of-failure / likelihood-of-impact /
      consequences structure used in the ISA tree risk assessment
      framework, implemented as the two published matrices.

   2. VALUE. A benefit ledger covering condition, remaining useful
      life, canopy contribution, function delivered, structural
      defects, maintenance burden and infrastructure conflict.

   The verdict is the net of the two. This is a decision-support
   worksheet for a qualified arborist, not a substitute for an
   on-site assessment by one.
   ============================================================ */
(function () {
  "use strict";

  var E = SEED.esc;

  /* ---------- ISA-style risk matrices ---------- */

  var LOF = ["improbable", "possible", "probable", "imminent"];
  var LOI = ["very-low", "low", "medium", "high"];

  /* Matrix 1 — likelihood of failure & impact.
     Rows: likelihood of failure. Columns: likelihood of impacting a target. */
  var M1 = {
    improbable: ["unlikely", "unlikely",       "unlikely",        "unlikely"],
    possible:   ["unlikely", "unlikely",       "unlikely",        "somewhat"],
    probable:   ["unlikely", "unlikely",       "somewhat",        "likely"],
    imminent:   ["unlikely", "somewhat",       "likely",          "very-likely"]
  };

  /* Matrix 2 — risk rating.
     Rows: likelihood of failure & impact. Columns: consequences. */
  var M2 = {
    "unlikely":    ["low", "low",      "low",      "low"],
    "somewhat":    ["low", "low",      "moderate", "moderate"],
    "likely":      ["low", "moderate", "high",     "high"],
    "very-likely": ["low", "moderate", "high",     "extreme"]
  };

  var CONSEQ = ["negligible", "minor", "significant", "severe"];

  var LABEL = {
    improbable: "Improbable", possible: "Possible", probable: "Probable", imminent: "Imminent",
    "very-low": "Very low", low: "Low", medium: "Medium", high: "High",
    unlikely: "Unlikely", somewhat: "Somewhat likely", likely: "Likely", "very-likely": "Very likely",
    negligible: "Negligible", minor: "Minor", significant: "Significant", severe: "Severe",
    moderate: "Moderate", extreme: "Extreme"
  };

  function rateRisk(lof, loi, conseq) {
    var row = M1[lof];
    if (!row) return null;
    var lofi = row[LOI.indexOf(loi)];
    var rating = M2[lofi][CONSEQ.indexOf(conseq)];
    return { lofi: lofi, rating: rating };
  }

  /* ---------- Value ledger ---------- */

  var CONDITION = { excellent: 25, good: 18, fair: 10, poor: 2, dead: 0 };
  var RULE      = { "40+": 20, "20-40": 14, "10-20": 8, "5-10": 3, "0-5": 0 };
  var RISK_COST = { low: -3, moderate: -14, high: -28, extreme: -40 };

  /* Canopy contribution scales with trunk diameter, which is the only
     dimension most owners can measure reliably. */
  function canopyPoints(dbh) {
    if (!dbh || dbh <= 0) return 0;
    return Math.min(20, Math.round(Math.pow(dbh, 0.75) * 1.9));
  }

  /* Open-grown crown spread runs roughly 2.2 ft per inch of DBH for
     mature broadleaf trees. Used only for a planning-level estimate. */
  function canopyArea(dbh) {
    if (!dbh || dbh <= 0) return 0;
    var spread = dbh * 2.2;
    return Math.PI * Math.pow(spread / 2, 2);
  }

  /* Rough annual ecosystem-service value. i-Tree style benefit modeling
     puts combined stormwater, energy, air quality and carbon value in the
     range of roughly $0.05-$0.10 per sq ft of canopy per year in a
     temperate US city. We use the low end so the number is defensible. */
  var VALUE_PER_SQFT = 0.06;

  function checkedValues(name) {
    return Array.prototype.slice
      .call(document.querySelectorAll('input[name="' + name + '"]:checked'))
      .map(function (el) { return { value: el.value, label: el.getAttribute("data-label") || el.value }; });
  }

  function val(id) {
    var el = document.getElementById(id);
    return el ? el.value : "";
  }

  /* ---------- Assessment ---------- */

  function assess() {
    var lof = val("lof"), loi = val("loi"), conseq = val("conseq");
    var risk = rateRisk(lof, loi, conseq);
    if (!risk) return null;

    var dbh = parseFloat(val("dbh")) || 0;
    var condition = val("condition");
    var rule = val("rule");

    var ledger = [];
    var score = 0;

    function add(label, points, detail) {
      if (points === 0 && !detail) return;
      score += points;
      ledger.push({ label: label, points: points, detail: detail || "" });
    }

    /* --- Asset side --- */
    add("Condition and vigor — " + condition.charAt(0).toUpperCase() + condition.slice(1),
        CONDITION[condition] || 0);
    add("Remaining useful life — " + (rule === "40+" ? "over 40 years" : rule + " years"), RULE[rule] || 0);

    if (dbh > 0) {
      add("Canopy contribution (" + dbh + " in DBH, ~" + Math.round(canopyArea(dbh)).toLocaleString() +
          " sq ft crown)", canopyPoints(dbh));
    }

    var funcs = checkedValues("func");
    if (funcs.length) {
      add("Functions delivered: " + funcs.map(function (f) { return f.label; }).join(", "),
          Math.min(10, funcs.length * 2));
    }

    var species = val("species");
    var sp = null;
    if (species) {
      sp = (window.SEED_SPECIES || []).filter(function (s) { return s.id === species; })[0] || null;
    }
    if (sp) {
      if (sp.verdict === "asset") add("Species is a proven long-term performer — " + sp.common, 12);
      else if (sp.verdict === "situational") add("Species is site-dependent — " + sp.common, 2);
      else add("Species is a known liability — " + sp.common, -15,
               sp.liability[0] || "");
    }

    /* --- Liability side --- */
    add("Risk rating — " + LABEL[risk.rating], RISK_COST[risk.rating]);

    var defects = checkedValues("defect");
    defects.forEach(function (d) { add("Structural defect: " + d.label, -4); });

    var burdens = checkedValues("burden");
    burdens.forEach(function (b) { add("Maintenance burden: " + b.label, -4); });

    var conflicts = checkedValues("conflict");
    conflicts.forEach(function (c) { add("Infrastructure conflict: " + c.label, -5); });

    if (document.getElementById("invasive") && document.getElementById("invasive").checked) {
      add("Listed invasive or prohibited species", -20);
    }

    /* --- Verdict --- */
    var verdict, vclass, headline;
    var speciesCapped = false;
    if (condition === "dead") {
      verdict = "Liability — remove";
      vclass = "v-extreme";
      headline = "A dead tree has no remaining benefit and its failure likelihood only increases. " +
                 "Remove it, and remove it sooner rather than later — dead wood gets more dangerous to " +
                 "climb and rig every season it stands.";
    } else if (risk.rating === "extreme") {
      verdict = "Liability — mitigate immediately";
      vclass = "v-extreme";
      headline = "An extreme rating means failure is likely and the consequences are severe. " +
                 "This overrides every benefit the tree provides. Restrict access to the target area " +
                 "today and mitigate before anything else is scheduled.";
    } else if (sp && sp.verdict === "liability" && score >= -10) {
      /* The species itself is the constraint. However well it is performing
         today, the correct advice is a planned replacement rather than a
         retention plan built on a tree with a known terminal problem. */
      speciesCapped = true;
      verdict = "Marginal — manage, and plan the replacement";
      vclass = "v-high";
      headline = sp.common + " carries a problem no maintenance fixes: " +
                 (sp.liability[0] || "known chronic structural or invasive issues") + ". " +
                 "It may be delivering real canopy today, so this is not necessarily an urgent removal — " +
                 "but plant the successor now, offset from this root plate, and do not replace in kind.";
    } else if (score >= 45) {
      verdict = "Asset — retain and maintain";
      vclass = "v-low";
      headline = "This tree returns more than it costs. Protect it: keep the root zone mulched and " +
                 "undisturbed, and put it on a routine inspection cycle rather than waiting for a problem.";
    } else if (score >= 15) {
      verdict = "Asset with conditions";
      vclass = "v-moderate";
      headline = "Worth keeping, but not as it stands. The items below are the difference between an " +
                 "asset and a future claim — address them and reassess.";
    } else if (score >= -10) {
      verdict = "Marginal — manage or plan replacement";
      vclass = "v-high";
      headline = "The costs and the benefits are close to even. Either commit to the mitigation work, " +
                 "or start a planned replacement now so the successor tree has fifteen years of growth " +
                 "before this one has to come out.";
    } else {
      verdict = "Liability — plan removal and replacement";
      vclass = "v-extreme";
      headline = "The ongoing risk, maintenance and conflict costs exceed what this tree returns. " +
                 "Plan a removal and specify a replacement suited to the site.";
    }

    /* --- Recommended actions --- */
    var actions = [];
    if (risk.rating === "extreme" || risk.rating === "high") {
      actions.push("Restrict or relocate the target where possible — moving a parking spot or a play " +
                   "set is the cheapest risk mitigation that exists.");
      actions.push("Schedule mitigation on a defined timeline and put the timeline in writing.");
    }
    if (defects.some(function (d) { return d.value === "codominant"; })) {
      actions.push("Codominant stems with included bark: evaluate for end-weight reduction, and consider " +
                   "a cable system only if the union is otherwise sound.");
    }
    if (defects.some(function (d) { return d.value === "decay"; })) {
      actions.push("Advance to a Level 3 assessment — resistance drilling or sonic tomography — to quantify " +
                   "remaining sound wood before deciding.");
    }
    if (defects.some(function (d) { return d.value === "root"; })) {
      actions.push("Root plate movement or severed roots: this is the defect category with the least " +
                   "warning and the worst outcome. Treat as urgent.");
    }
    if (defects.some(function (d) { return d.value === "topped"; })) {
      actions.push("Previously topped: begin restoration pruning to re-establish dominant leaders among " +
                   "the epicormic sprouts, over several cycles.");
    }
    if (conflicts.some(function (c) { return c.value === "utility"; })) {
      actions.push("Utility conflict: coordinate with the line-clearance utility contractor. Only qualified " +
                   "line-clearance arborists may work inside the minimum approach distance.");
    }
    if (conflicts.some(function (c) { return c.value === "hardscape"; })) {
      actions.push("Hardscape conflict: consider root-friendly paving repair — flexible pavers, ramping, or " +
                   "root bridging — before root cutting, which trades a trip hazard for a failure hazard.");
    }
    if (conflicts.some(function (c) { return c.value === "foundation"; })) {
      actions.push("Structure proximity: verify actual mature spread against the setback. Most 'roots are " +
                   "cracking my foundation' calls are soil moisture movement, not roots — investigate before removing.");
    }
    if (burdens.some(function (b) { return b.value === "pest"; })) {
      actions.push("Chronic pest pressure: price the treatment over a ten-year horizon and compare it " +
                   "honestly against replacement with a resistant species.");
    }
    if (rule === "0-5" || rule === "5-10") {
      actions.push("Short remaining life: plant the replacement now, offset from the existing root plate, " +
                   "so canopy is already established when this tree comes out.");
    }
    if (condition === "poor" || condition === "fair") {
      actions.push("Excavate the root flare before anything else. Girdling roots and deep planting cause " +
                   "more landscape tree decline than every insect and disease combined.");
    }
    if (sp && sp.verdict === "liability") {
      actions.push("Species itself is the problem: " + (sp.liability[0] || "known structural or invasive issues") +
                   ". Do not replace in kind.");
    }
    if (!actions.length) {
      actions.push("Maintain a 2-4 inch mulch ring out to the dripline, held 3-6 inches off the trunk.");
      actions.push("Re-inspect on a defined cycle — annually for mature trees near targets is a reasonable default.");
    }

    return {
      risk: risk, lof: lof, loi: loi, conseq: conseq,
      score: score, ledger: ledger, verdict: verdict, vclass: vclass,
      headline: headline, actions: actions, speciesCapped: speciesCapped,
      dbh: dbh, area: canopyArea(dbh),
      annual: canopyArea(dbh) * VALUE_PER_SQFT,
      species: sp
    };
  }

  /* ---------- Rendering ---------- */

  function renderMatrix(el, result) {
    var rows = ["very-likely", "likely", "somewhat", "unlikely"];
    var html = '<table class="matrix"><caption class="sr-only">Risk rating matrix</caption><thead><tr>' +
               '<th scope="col">Failure &amp; impact</th>';
    CONSEQ.forEach(function (c) { html += '<th scope="col">' + LABEL[c] + "</th>"; });
    html += "</tr></thead><tbody>";
    rows.forEach(function (r) {
      html += '<tr><th scope="row">' + LABEL[r] + "</th>";
      M2[r].forEach(function (cell, i) {
        var hit = (r === result.risk.lofi && CONSEQ[i] === result.conseq);
        html += '<td class="m-' + cell + (hit ? " is-hit" : "") + '"' +
                (hit ? ' aria-label="Your result: ' + LABEL[cell] + '"' : "") + ">" +
                LABEL[cell] + "</td>";
      });
      html += "</tr>";
    });
    html += "</tbody></table>";
    el.innerHTML = html;
  }

  function render(result) {
    var out = document.getElementById("result");
    if (!result) { out.innerHTML = '<p class="empty">Complete the risk section to see a verdict.</p>'; return; }

    var pos = result.ledger.filter(function (l) { return l.points > 0; });
    var neg = result.ledger.filter(function (l) { return l.points < 0; });

    function rows(list) {
      if (!list.length) return '<p class="tiny muted">None recorded.</p>';
      return '<div class="ledger">' + list.map(function (l) {
        return '<div class="ledger-row"><span>' + E(l.label) +
               (l.detail ? '<br><span class="tiny muted">' + E(l.detail) + "</span>" : "") +
               '</span><span class="ledger-val ' + (l.points > 0 ? "val-pos" : "val-neg") + '">' +
               (l.points > 0 ? "+" : "") + l.points + "</span></div>";
      }).join("") + "</div>";
    }

    var html =
      '<div class="verdict ' + result.vclass + '">' +
        "<h2>" + E(result.verdict) + "</h2>" +
        "<p>" + E(result.headline) + "</p>" +
      "</div>" +

      '<div class="stat-row" style="margin:1.2rem 0">' +
        '<div class="stat"><b>' + LABEL[result.risk.rating] + "</b><span>Risk rating</span></div>" +
        '<div class="stat"><b>' + (result.score > 0 ? "+" : "") + result.score + "</b><span>Net value score</span></div>" +
        (result.dbh > 0
          ? '<div class="stat"><b>$' + Math.round(result.annual) + "</b><span>Est. annual benefit</span></div>" +
            '<div class="stat"><b>' + Math.round(result.area).toLocaleString() + "</b><span>Est. crown sq ft</span></div>"
          : "") +
      "</div>" +

      '<div class="card" style="margin-bottom:1.1rem">' +
        "<h3>How the risk rating was reached</h3>" +
        '<p class="small muted">Likelihood of failure <strong>' + LABEL[result.lof] +
        "</strong> combined with likelihood of impacting a target <strong>" + LABEL[result.loi] +
        "</strong> gives a likelihood of failure and impact of <strong>" + LABEL[result.risk.lofi] +
        "</strong>. Crossed against <strong>" + LABEL[result.conseq] +
        "</strong> consequences, that is a <strong>" + LABEL[result.risk.rating] + "</strong> risk.</p>" +
        '<div class="table-scroll" id="matrixWrap"></div>' +
      "</div>" +

      '<div class="grid grid-2" style="margin-bottom:1.1rem">' +
        '<div class="card"><h3>What this tree returns</h3>' + rows(pos) + "</div>" +
        '<div class="card"><h3>What this tree costs</h3>' + rows(neg) + "</div>" +
      "</div>" +

      '<div class="card">' +
        "<h3>Recommended actions</h3>" +
        "<ol style=\"padding-left:1.2rem;font-size:.92rem\">" +
          result.actions.map(function (a) { return "<li style=\"margin-bottom:.45rem\">" + E(a) + "</li>"; }).join("") +
        "</ol>" +
        '<p class="tiny muted" style="margin-top:1rem;margin-bottom:0">' +
          "This worksheet documents a judgment; it does not make one. A Level 2 basic assessment by a " +
          "qualified arborist — a systematic 360-degree ground inspection of the tree, root collar and site — " +
          "is what the rating above should be built on." +
        "</p>" +
      "</div>";

    out.innerHTML = html;
    renderMatrix(document.getElementById("matrixWrap"), result);

    if (result.dbh > 0) {
      var note = document.createElement("p");
      note.className = "tiny muted";
      note.style.marginTop = ".6rem";
      note.textContent = "Benefit estimate uses an open-grown crown spread of about 2.2 ft per inch of " +
        "trunk diameter and $" + VALUE_PER_SQFT.toFixed(2) + " per sq ft of canopy per year — a deliberately " +
        "conservative planning figure, not an i-Tree run.";
      out.appendChild(note);
    }
  }

  /* ---------- Wire up ---------- */

  function populateSpecies() {
    var sel = document.getElementById("species");
    if (!sel || !window.SEED_SPECIES) return;
    var sorted = window.SEED_SPECIES.slice().sort(function (a, b) {
      return a.common.localeCompare(b.common);
    });
    sorted.forEach(function (s) {
      var o = document.createElement("option");
      o.value = s.id;
      o.textContent = s.common + " (" + s.sci + ")";
      sel.appendChild(o);
    });
  }

  function init() {
    var form = document.getElementById("assessForm");
    if (!form) return;
    populateSpecies();

    function update() { render(assess()); }

    form.addEventListener("input", update);
    form.addEventListener("change", update);
    form.addEventListener("submit", function (e) { e.preventDefault(); update(); });

    var reset = document.getElementById("resetBtn");
    if (reset) {
      reset.addEventListener("click", function () {
        form.reset();
        update();
      });
    }

    var printBtn = document.getElementById("printBtn");
    if (printBtn) printBtn.addEventListener("click", function () { window.print(); });

    update();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
