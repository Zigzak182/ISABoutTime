/* True Tree Care — contact form.
   The site is static, so the form composes a mailto: message rather than
   posting anywhere. Set TO_ADDRESS before publishing, or replace the submit
   handler with a POST to whatever form service you prefer. */
(function () {
  "use strict";

  /* ---- Set this before publishing. ---- */
  var TO_ADDRESS = "office@example.com";

  var form = document.getElementById("contactForm");
  if (!form) return;

  function v(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : "";
  }

  function compose() {
    var lines = [
      "Service requested: " + v("cService"),
      "Urgency: " + v("cUrgency"),
      "",
      "Name: " + v("cName"),
      "Email: " + v("cEmail"),
      "Phone: " + (v("cPhone") || "not given"),
      "Property ZIP: " + v("cZip"),
      "",
      "Number of trees: " + v("cCount"),
      "Approx. trunk diameter: " + (v("cDbh") ? v("cDbh") + " in at 4.5 ft" : "not measured"),
      "Target beneath/beside: " + (v("cTarget") || "not described"),
      "",
      "What they are seeing:",
      v("cNotes") || "(nothing written)"
    ];
    return lines.join("\n");
  }

  function subject() {
    return "Assessment request — " + v("cService") + " — " + (v("cName") || "no name") +
           " (" + (v("cZip") || "no ZIP") + ")";
  }

  function showPreview(body) {
    document.getElementById("preview").textContent = body;
    document.getElementById("previewCard").hidden = false;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var body = compose();
    showPreview(body);
    window.location.href = "mailto:" + TO_ADDRESS +
      "?subject=" + encodeURIComponent(subject()) +
      "&body=" + encodeURIComponent(body);
  });

  document.getElementById("copyBtn").addEventListener("click", function () {
    var body = subject() + "\n\n" + compose();
    showPreview(body);
    var hint = document.getElementById("contactHint");
    function done(ok) {
      hint.textContent = ok
        ? "Copied. Paste it into an email to " + TO_ADDRESS + "."
        : "Could not copy automatically — select the preview text below and copy it.";
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(body).then(function () { done(true); }, function () { done(false); });
    } else {
      done(false);
    }
  });
})();
