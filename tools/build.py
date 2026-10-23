#!/usr/bin/env python3
"""
Seed — static page assembler.

Every page is plain HTML with no runtime dependencies, but the shared
header, footer and <head> block would otherwise be copy-pasted nine
times. This script stitches each body fragment in src/ into the shared
shell and writes the finished pages.

The generated .html files ARE committed, so the site deploys to any
static host with no build step. Run this only when editing the shell
or a fragment:

    python3 tools/build.py
"""

import hashlib
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src")

BRAND_MARK = '''<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
  <path d="M24 44V21" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" fill="none"/>
  <path d="M23.2 32.5c-1.2-7.2-6.6-11.2-14.2-10.6.4 7.2 6 11.8 14.2 10.6z"
        fill="currentColor" opacity=".78"/>
  <path d="M24.8 26.5c1.3-8.3 7.4-12.8 15.6-12.1-.4 8.3-6.4 13.4-15.6 12.1z"
        fill="currentColor"/>
</svg>'''

# TreePlot's only third-party dependency. If someone has run
# tools/vendor-leaflet.sh the local copy wins, which makes the site fully
# self-hosted and guarantees the map library is available offline. Otherwise
# we fall back to the CDN and the service worker warms it at install time.
LEAFLET_CDN = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/"
LEAFLET_LOCAL = "assets/vendor/leaflet/"


def leaflet_sources():
    """Return (css_ref, js_ref, is_local)."""
    local_js = os.path.join(ROOT, LEAFLET_LOCAL, "leaflet.js")
    local_css = os.path.join(ROOT, LEAFLET_LOCAL, "leaflet.css")
    if os.path.exists(local_js) and os.path.exists(local_css):
        return LEAFLET_LOCAL + "leaflet.css", LEAFLET_LOCAL + "leaflet.js", True
    return LEAFLET_CDN + "leaflet.css", LEAFLET_CDN + "leaflet.js", False


NAV_ITEMS = [
    ("index.html",     "Home"),
    ("tools.html",     "Tools"),
    ("reference.html", "Reference"),
    ("about.html",     "About"),
    ("feedback.html",  "Feedback"),
]

SHELL = '''<!DOCTYPE html>
<html lang="en" data-page="{slug}" data-base="{base}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="theme-color" content="#1e5631">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:type" content="website">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ctext y='26' font-size='26'%3E%F0%9F%8C%B1%3C/text%3E%3C/svg%3E">
<link rel="apple-touch-icon" href="{base}assets/img/apple-touch-icon.png">
<link rel="manifest" href="{base}manifest.webmanifest">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Seed">
<link rel="stylesheet" href="{base}assets/css/main.css">
{extra_css}</head>
<body>
<a class="skip" href="#main">Skip to content</a>

<header class="site-head">
  <div class="wrap">
    <a class="brand" href="{base}index.html">
      {mark}
      <span>Seed<small>Arboriculture toolkit</small></span>
    </a>
    <button class="nav-toggle" aria-expanded="false" aria-controls="sitenav">Menu</button>
    <nav class="nav" id="sitenav" aria-label="Main">
{nav}
    </nav>
  </div>
</header>

<main id="main">
{body}
</main>

<footer class="site-foot">
  <div class="wrap">
    <div class="grid grid-4">
      <div>
        <strong style="font-size:1.05rem">Seed</strong>
        <p class="small" style="color:#b0a898;margin-top:.5rem">
          Free, open tools for arborists. Everything runs in your browser —
          no account, no server, and nothing leaves the device.
        </p>
      </div>
      <div>
        <h4>Tools</h4>
        <ul>
          <li><a href="{base}app/risk.html">Liability vs. Asset</a></li>
          <li><a href="{base}app/planting.html">Planting Guide by ZIP</a></li>
          <li><a href="{base}app/study.html">ISA Study Guide</a></li>
          <li><a href="{base}app/plot.html">TreePlot GPS</a></li>
        </ul>
      </div>
      <div>
        <h4>Reference</h4>
        <ul>
          <li><a href="{base}reference.html#assessment">Risk Assessment</a></li>
          <li><a href="{base}reference.html#pruning">Pruning &amp; Structure</a></li>
          <li><a href="{base}reference.html#health">Plant Health Care</a></li>
          <li><a href="{base}reference.html#planting">Species Selection</a></li>
          <li><a href="{base}reference.html#construction">Construction Protection</a></li>
        </ul>
      </div>
      <div>
        <h4>Project</h4>
        <ul>
          <li><a href="{base}about.html">About Seed</a></li>
          <li><a href="{base}feedback.html">Report an issue</a></li>
          <li><a href="{base}feedback.html#contribute">Contribute data</a></li>
        </ul>
      </div>
    </div>
    <div class="foot-legal">
      <span>&copy; <span data-year>2026</span> Seed.</span>
      <span>Decision support for qualified arborists — not a substitute for one.</span>
      <span>Study material is original and is not ISA-endorsed.</span>
    </div>
  </div>
</footer>

<script src="{base}assets/js/site.js"></script>
{extra_js}</body>
</html>
'''


def build_nav(active, base):
    out = []
    for href, label in NAV_ITEMS:
        cur = ' aria-current="page"' if href == active else ""
        out.append('      <a href="%s%s"%s>%s</a>' % (base, href, cur, label))
    return "\n".join(out)


def parse_fragment(path):
    """Fragment format: leading `key: value` lines, blank line, then HTML."""
    text = open(path, encoding="utf-8").read()
    meta, body = {}, text
    if "\n\n" in text:
        head, rest = text.split("\n\n", 1)
        if re.match(r"^[a-z_]+:", head.strip().splitlines()[0] or ""):
            for line in head.strip().splitlines():
                k, _, v = line.partition(":")
                meta[k.strip()] = v.strip()
            body = rest
    return meta, body.strip()


# Files the service worker precaches. Order is irrelevant; the hash is taken
# over the sorted list so the version is stable across machines.
PRECACHE_GLOBS = [
    "index.html", "tools.html", "reference.html", "about.html", "feedback.html",
    "app/risk.html", "app/planting.html", "app/study.html", "app/plot.html",
    "assets/css/main.css", "assets/css/app.css",
    "assets/js/site.js", "assets/js/risk.js", "assets/js/planting.js",
    "assets/js/study.js", "assets/js/plot.js", "assets/js/feedback.js",
    "data/species.js", "data/zones.js", "data/study.js",
    "assets/img/icon-192.png", "assets/img/icon-512.png",
    "assets/img/icon-maskable-512.png", "assets/img/apple-touch-icon.png",
    "manifest.webmanifest",
]


def build_service_worker():
    """Generate sw.js with a precache list and a content-derived version.

    Hashing the actual bytes means a copy edit in one fragment retires the
    old cache automatically. Hand-maintained cache versions drift, and a
    stale service worker is the single worst failure mode of an offline app.
    """
    template_path = os.path.join(ROOT, "tools", "sw-template.js")
    if not os.path.exists(template_path):
        print("  (no sw-template.js — skipping service worker)")
        return None

    digest = hashlib.sha256()
    present = []
    for rel in sorted(PRECACHE_GLOBS):
        path = os.path.join(ROOT, rel)
        if not os.path.exists(path):
            print("  WARNING: precache target missing: %s" % rel)
            continue
        present.append(rel)
        digest.update(rel.encode("utf-8"))
        with open(path, "rb") as fh:
            digest.update(fh.read())

    css_ref, js_ref, leaflet_local = leaflet_sources()
    vendor_urls = []
    if leaflet_local:
        # Same-origin: fold it into the shell so it is versioned with everything
        # else. Includes the images leaflet.css references — unused by TreePlot's
        # divIcon markers today, but precaching them means a default marker or a
        # layers control added later still works offline.
        vendor_files = []
        vendor_root = os.path.join(ROOT, LEAFLET_LOCAL)
        for dirpath, _dirnames, filenames in os.walk(vendor_root):
            for fn in sorted(filenames):
                if os.path.splitext(fn)[1] not in (".js", ".css", ".png", ".svg"):
                    continue  # LICENSE and VENDORED.txt are provenance, not runtime
                abs_path = os.path.join(dirpath, fn)
                vendor_files.append(os.path.relpath(abs_path, ROOT).replace(os.sep, "/"))
        for rel in sorted(vendor_files):
            present.append(rel)
            digest.update(rel.encode("utf-8"))
            with open(os.path.join(ROOT, rel), "rb") as fh:
                digest.update(fh.read())
    else:
        # Cross-origin: warm it at install so the map library is present offline
        # regardless of which page the visitor happened to install from.
        vendor_urls = [css_ref, js_ref]
        digest.update("|".join(vendor_urls).encode("utf-8"))

    version = digest.hexdigest()[:12]

    # "./" so the worker resolves against its own scope and the site works
    # from a subpath (a GitHub Pages project site) without reconfiguration.
    urls = ["./"] + ["./" + rel for rel in present]

    sw = open(template_path, encoding="utf-8").read()
    sw = sw.replace("__VERSION__", version)
    sw = sw.replace("__PRECACHE__", json.dumps(urls, indent=2))
    sw = sw.replace("__VENDOR_PRECACHE__", json.dumps(vendor_urls, indent=2))

    with open(os.path.join(ROOT, "sw.js"), "w", encoding="utf-8") as fh:
        fh.write(sw)
    return version, len(present)


def main():
    if not os.path.isdir(SRC):
        sys.exit("missing src/ directory")

    written = []
    for name in sorted(os.listdir(SRC)):
        if not name.endswith(".html"):
            continue
        meta, body = parse_fragment(os.path.join(SRC, name))
        out_rel = meta.get("out", name)
        base = "../" if "/" in out_rel else ""
        # Active nav: an app page highlights Platform.
        active = meta.get("nav", os.path.basename(out_rel))

        css_ref, js_ref, _local = leaflet_sources()

        extra_css = ""
        for href in meta.get("css", "").split():
            if href == "@leaflet-css":
                href = css_ref
            pre = "" if href.startswith("http") else base
            extra_css += '<link rel="stylesheet" href="%s%s">\n' % (pre, href)

        extra_js = ""
        for src in meta.get("js", "").split():
            if src == "@leaflet-js":
                src = js_ref
            pre = "" if src.startswith("http") else base
            extra_js += '<script src="%s%s"></script>\n' % (pre, src)

        html = SHELL.format(
            slug=os.path.splitext(os.path.basename(out_rel))[0],
            title=meta.get("title", "Seed"),
            desc=meta.get("desc", ""),
            base=base,
            mark=BRAND_MARK,
            nav=build_nav(active, base),
            body=body,
            extra_css=extra_css,
            extra_js=extra_js,
        )

        dest = os.path.join(ROOT, out_rel)
        os.makedirs(os.path.dirname(dest) or ROOT, exist_ok=True)
        with open(dest, "w", encoding="utf-8") as fh:
            fh.write(html)
        written.append(out_rel)

    print("built %d pages:" % len(written))
    for w in written:
        print("  " + w)

    result = build_service_worker()
    if result:
        version, count = result
        _, _, leaflet_local = leaflet_sources()
        print("built sw.js: version %s, %d precached files" % (version, count))
        print("leaflet: %s" % ("vendored locally (no third-party requests)" if leaflet_local
                               else "CDN (run tools/vendor-leaflet.sh to self-host)"))


if __name__ == "__main__":
    main()
