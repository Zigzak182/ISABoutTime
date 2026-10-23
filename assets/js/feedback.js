/* Seed — feedback form.
   The site is static, so the form composes a mailto: message rather than
   posting anywhere. Set TO_ADDRESS before publishing, or replace the submit
   handler with a POST to an issue tracker or form service. */
(function () {
  "use strict";

  /* ---- Set this before publishing. ---- */
  var TO_ADDRESS = "maintainer@example.com";

  var form = document.getElementById("feedbackForm");
  if (!form) return;

  function v(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : "";
  }

  function compose() {
    return [
      "Report type: " + v("fKind"),
      "Region / ZIP: " + (v("fRegion") || "not given"),
      "Subject: " + (v("fSubject") || "not given"),
      "Reporter background: " + (v("fCredential") || "not given"),
      "",
      "Detail:",
      v("fDetail") || "(nothing written)",
      "",
      "Source: " + (v("fSource") || "none cited")
    ].join("\n");
  }

  function subject() {
    return "Seed — " + v("fKind") + (v("fSubject") ? ": " + v("fSubject") : "");
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
    var hint = document.getElementById("feedbackHint");
    function done(ok) {
      hint.textContent = ok
        ? "Copied. Paste it into an email or a GitHub issue."
        : "Could not copy automatically — select the preview text below and copy it.";
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(body).then(function () { done(true); }, function () { done(false); });
    } else {
      done(false);
    }
  });
})();
