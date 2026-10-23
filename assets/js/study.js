/* ============================================================
   Seed — ISA study platform
   ------------------------------------------------------------
   Three modes over one content set: reference reading by domain,
   flashcard drilling, and a scored practice exam.

   Quiz choices are shuffled per question at render time. The
   underlying bank is authored with the correct answer in a fixed
   position; shuffling stops a repeat user from pattern-matching
   position instead of content.

   Progress persists in localStorage and never leaves the browser.
   ============================================================ */
(function () {
  "use strict";

  var E = SEED.esc;
  var S = window.SEED_STUDY;
  if (!S) return;

  var domainName = {};
  S.domains.forEach(function (d) { domainName[d.id] = d.name; });

  /* ================= Reference ================= */

  function renderReference() {
    var el = document.getElementById("domainList");
    if (!el) return;
    el.innerHTML = S.domains.map(function (d) {
      return '<details class="domain" id="d-' + E(d.id) + '">' +
        "<summary>" + E(d.name) +
        '<span class="weight">' + d.weight + "% of study time</span></summary>" +
        '<div class="domain-body">' +
          '<p class="muted">' + E(d.summary) + "</p>" +
          "<h4>Key points</h4><ul>" +
          d.keyPoints.map(function (k) { return "<li>" + E(k) + "</li>"; }).join("") +
          "</ul>" +
          "<h4>Terms</h4><dl>" +
          d.terms.map(function (t) {
            return '<div class="term"><dt>' + E(t.t) + "</dt><dd>" + E(t.d) + "</dd></div>";
          }).join("") +
          "</dl>" +
        "</div></details>";
    }).join("");
  }

  /* ================= Flashcards ================= */

  var fc = { deck: [], i: 0, flipped: false, known: SEED.store.get("fcKnown", {}) };

  function fcFilter() {
    var sel = document.getElementById("fcDomain");
    var d = sel ? sel.value : "all";
    return S.flashcards.filter(function (c) { return d === "all" || c.domain === d; });
  }

  function fcBuild(shuffle) {
    fc.deck = fcFilter();
    if (shuffle) fc.deck = SEED.shuffle(fc.deck);
    fc.i = 0;
    fc.flipped = false;
    fcRender();
  }

  function cardKey(c) { return c.domain + "|" + c.q.slice(0, 40); }

  function fcRender() {
    var card = document.getElementById("flashcard");
    if (!card) return;

    if (!fc.deck.length) {
      card.innerHTML = '<div class="flashcard-inner"><div class="flashcard-face">' +
                       '<p class="q">No cards in this domain.</p></div></div>';
      return;
    }

    var c = fc.deck[fc.i];
    card.classList.toggle("is-flipped", fc.flipped);
    card.innerHTML =
      '<div class="flashcard-inner">' +
        '<div class="flashcard-face">' +
          '<p class="tiny muted" style="margin-bottom:.8rem">' + E(domainName[c.domain]) + "</p>" +
          '<p class="q">' + E(c.q) + "</p>" +
          '<p class="tiny muted" style="margin-top:1.2rem">Click, or press Space, to reveal</p>' +
        "</div>" +
        '<div class="flashcard-face flashcard-back">' +
          '<p class="a">' + E(c.a) + "</p>" +
        "</div>" +
      "</div>";

    document.getElementById("fcCount").textContent = (fc.i + 1) + " / " + fc.deck.length;
    var known = Object.keys(fc.known).length;
    document.getElementById("fcKnown").textContent = known + " marked known";

    var bar = document.getElementById("fcBar");
    if (bar) bar.style.width = ((fc.i + 1) / fc.deck.length * 100) + "%";

    var mark = document.getElementById("fcMark");
    if (mark) mark.textContent = fc.known[cardKey(c)] ? "Marked known ✓" : "Mark as known";
  }

  function fcStep(n) {
    if (!fc.deck.length) return;
    fc.i = (fc.i + n + fc.deck.length) % fc.deck.length;
    fc.flipped = false;
    fcRender();
  }

  /* ================= Practice exam ================= */

  var qz = { items: [], i: 0, answered: [], score: 0, done: false };

  function qzBuild() {
    var sel = document.getElementById("qzDomain");
    var d = sel ? sel.value : "all";
    var count = parseInt(document.getElementById("qzCount").value, 10) || 20;

    var pool = S.quiz.filter(function (q) { return d === "all" || q.domain === d; });
    pool = SEED.shuffle(pool).slice(0, count);

    /* Shuffle the choices too, tracking where the correct one landed. */
    qz.items = pool.map(function (q) {
      var order = SEED.shuffle(q.choices.map(function (_, i) { return i; }));
      return {
        q: q.q,
        domain: q.domain,
        explain: q.explain,
        choices: order.map(function (i) { return q.choices[i]; }),
        answer: order.indexOf(q.answer)
      };
    });

    qz.i = 0; qz.answered = []; qz.score = 0; qz.done = false;
    qzRender();
  }

  function qzRender() {
    var el = document.getElementById("quizBody");
    if (!el) return;

    if (!qz.items.length) {
      el.innerHTML = '<p class="empty">Choose a domain and length, then start a session.</p>';
      return;
    }

    if (qz.done) { qzResults(el); return; }

    var it = qz.items[qz.i];
    var picked = qz.answered[qz.i];
    var settled = picked !== undefined;

    var html =
      '<div class="progress" style="margin-bottom:1.1rem">' +
        "<span>Question " + (qz.i + 1) + " of " + qz.items.length + "</span>" +
        '<span class="score-bar"><span style="width:' +
          ((qz.i) / qz.items.length * 100) + '%"></span></span>' +
        "<span>" + qz.score + " correct</span>" +
      "</div>" +
      '<p class="tiny muted" style="margin-bottom:.4rem">' + E(domainName[it.domain]) + "</p>" +
      '<h3 style="margin-bottom:1rem">' + E(it.q) + "</h3>";

    it.choices.forEach(function (c, i) {
      var cls = "choice";
      if (settled) {
        if (i === it.answer) cls += " is-correct";
        else if (i === picked) cls += " is-wrong";
      }
      html += '<button type="button" class="' + cls + '" data-choice="' + i + '"' +
              (settled ? " disabled" : "") + '>' +
              '<span class="key">' + "ABCD"[i] + "</span><span>" + E(c) + "</span></button>";
    });

    if (settled) {
      html += '<div class="explain"><strong>' +
              (picked === it.answer ? "Correct. " : "Not quite. ") +
              "</strong>" + E(it.explain) + "</div>" +
              '<div class="row" style="margin-top:1.1rem">' +
              '<button type="button" class="btn btn-primary" id="qzNext">' +
              (qz.i === qz.items.length - 1 ? "See results" : "Next question") + "</button></div>";
    }

    el.innerHTML = html;

    Array.prototype.forEach.call(el.querySelectorAll("[data-choice]"), function (b) {
      b.addEventListener("click", function () {
        var pick = parseInt(b.getAttribute("data-choice"), 10);
        qz.answered[qz.i] = pick;
        if (pick === it.answer) qz.score++;
        qzRender();
      });
    });

    var next = document.getElementById("qzNext");
    if (next) {
      next.addEventListener("click", function () {
        if (qz.i === qz.items.length - 1) { qz.done = true; qzSave(); }
        else qz.i++;
        qzRender();
      });
    }
  }

  function qzSave() {
    var hist = SEED.store.get("quizHistory", []);
    hist.push({
      date: new Date().toISOString().slice(0, 10),
      score: qz.score,
      total: qz.items.length,
      domain: document.getElementById("qzDomain").value
    });
    SEED.store.set("quizHistory", hist.slice(-40));
    renderHistory();
  }

  function qzResults(el) {
    var pct = Math.round(qz.score / qz.items.length * 100);
    var verdict = pct >= 85 ? "Strong. This is the range you want to be sitting in before exam day."
                : pct >= 76 ? "Passing range on most scored assessments, but with no margin. Drill the misses."
                : pct >= 60 ? "Reachable. Work the domains you missed, not the ones you already know."
                : "Build the reference reading back in before drilling more questions.";

    /* Which domains cost the most points. */
    var byDomain = {};
    qz.items.forEach(function (it, i) {
      var d = byDomain[it.domain] || (byDomain[it.domain] = { right: 0, total: 0 });
      d.total++;
      if (qz.answered[i] === it.answer) d.right++;
    });
    var weak = Object.keys(byDomain)
      .map(function (k) { return { id: k, r: byDomain[k].right, t: byDomain[k].total }; })
      .filter(function (d) { return d.r < d.t; })
      .sort(function (a, b) { return (a.r / a.t) - (b.r / b.t); });

    el.innerHTML =
      '<div class="center" style="padding:1rem 0 1.5rem">' +
        '<p class="eyebrow">Session complete</p>' +
        '<div style="font-size:3.4rem;font-weight:700;line-height:1;font-family:var(--mono)">' + pct + "%</div>" +
        '<p class="muted">' + qz.score + " of " + qz.items.length + " correct</p>" +
        '<p class="lede" style="margin:1rem auto 0">' + E(verdict) + "</p>" +
      "</div>" +
      (weak.length
        ? '<div class="card" style="margin-bottom:1.1rem"><h3>Where to spend your next session</h3><ul style="padding-left:1.1rem;margin:0">' +
          weak.map(function (d) {
            return "<li><strong>" + E(domainName[d.id]) + "</strong> — " + d.r + " of " + d.t + " correct</li>";
          }).join("") + "</ul></div>"
        : '<div class="card" style="margin-bottom:1.1rem"><p class="mb0">Clean sweep — every domain in this session was correct.</p></div>') +
      '<div class="row"><button type="button" class="btn btn-primary" id="qzAgain">New session</button>' +
      '<button type="button" class="btn btn-ghost" id="qzReview">Review the misses</button></div>' +
      '<div id="qzReviewOut" style="margin-top:1.2rem"></div>';

    document.getElementById("qzAgain").addEventListener("click", qzBuild);
    document.getElementById("qzReview").addEventListener("click", function () {
      var out = document.getElementById("qzReviewOut");
      var misses = qz.items.map(function (it, i) { return { it: it, pick: qz.answered[i] }; })
                           .filter(function (m) { return m.pick !== m.it.answer; });
      out.innerHTML = misses.length
        ? misses.map(function (m) {
            return '<div class="card" style="margin-bottom:.8rem">' +
              '<p class="tiny muted" style="margin-bottom:.3rem">' + E(domainName[m.it.domain]) + "</p>" +
              "<p><strong>" + E(m.it.q) + "</strong></p>" +
              '<p class="small" style="color:var(--risk-extreme);margin:.2rem 0">You chose: ' +
                E(m.it.choices[m.pick]) + "</p>" +
              '<p class="small" style="color:var(--risk-low);margin:.2rem 0">Correct: ' +
                E(m.it.choices[m.it.answer]) + "</p>" +
              '<div class="explain">' + E(m.it.explain) + "</div></div>";
          }).join("")
        : '<p class="muted">Nothing missed.</p>';
    });
  }

  function renderHistory() {
    var el = document.getElementById("quizHistory");
    if (!el) return;
    var hist = SEED.store.get("quizHistory", []);
    if (!hist.length) {
      el.innerHTML = '<p class="tiny muted mb0">No sessions recorded yet. Scores stay in this browser only.</p>';
      return;
    }
    var recent = hist.slice(-8).reverse();
    el.innerHTML = '<div class="table-scroll"><table><thead><tr><th>Date</th><th>Domain</th><th>Score</th></tr></thead><tbody>' +
      recent.map(function (h) {
        var pct = Math.round(h.score / h.total * 100);
        return "<tr><td>" + E(h.date) + "</td><td>" +
               E(h.domain === "all" ? "All domains" : (domainName[h.domain] || h.domain)) +
               "</td><td><strong>" + pct + "%</strong> <span class='muted'>(" + h.score + "/" + h.total + ")</span></td></tr>";
      }).join("") + "</tbody></table></div>";
  }

  /* ================= Init ================= */

  function fillDomainSelects() {
    ["fcDomain", "qzDomain"].forEach(function (id) {
      var sel = document.getElementById(id);
      if (!sel) return;
      S.domains.forEach(function (d) {
        var o = document.createElement("option");
        o.value = d.id;
        o.textContent = d.name;
        sel.appendChild(o);
      });
    });
  }

  function init() {
    if (!document.getElementById("domainList")) return;

    SEED.tabs("#studyTabs");
    fillDomainSelects();
    renderReference();
    fcBuild(false);
    renderHistory();

    var card = document.getElementById("flashcard");
    if (card) {
      card.addEventListener("click", function () { fc.flipped = !fc.flipped; fcRender(); });
    }
    document.getElementById("fcPrev").addEventListener("click", function () { fcStep(-1); });
    document.getElementById("fcNext").addEventListener("click", function () { fcStep(1); });
    document.getElementById("fcShuffle").addEventListener("click", function () { fcBuild(true); });
    document.getElementById("fcDomain").addEventListener("change", function () { fcBuild(false); });
    document.getElementById("fcMark").addEventListener("click", function () {
      if (!fc.deck.length) return;
      var k = cardKey(fc.deck[fc.i]);
      if (fc.known[k]) delete fc.known[k]; else fc.known[k] = 1;
      SEED.store.set("fcKnown", fc.known);
      fcRender();
    });
    document.getElementById("fcReset").addEventListener("click", function () {
      fc.known = {};
      SEED.store.set("fcKnown", {});
      fcRender();
    });

    document.getElementById("qzStart").addEventListener("click", qzBuild);
    document.getElementById("qzClear").addEventListener("click", function () {
      SEED.store.remove("quizHistory");
      renderHistory();
    });

    /* Keyboard: space flips, arrows step — only while the flashcard panel is open. */
    document.addEventListener("keydown", function (e) {
      var panel = document.getElementById("panel-cards");
      if (!panel || panel.hidden) return;
      if (/^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(document.activeElement.tagName)) return;
      if (e.key === " ") { e.preventDefault(); fc.flipped = !fc.flipped; fcRender(); }
      else if (e.key === "ArrowRight") fcStep(1);
      else if (e.key === "ArrowLeft") fcStep(-1);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
