#!/usr/bin/env python3
"""
True Tree Care — static page assembler.

Every page is plain HTML with no runtime dependencies, but the shared
header, footer and <head> block would otherwise be copy-pasted nine
times. This script stitches each body fragment in src/ into the shared
shell and writes the finished pages.

The generated .html files ARE committed, so the site deploys to any
static host with no build step. Run this only when editing the shell
or a fragment:

    python3 tools/build.py
"""

import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src")

BRAND_MARK = '''<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
  <path d="M24 4c-6 0-10 4.4-10 9.6 0 1.2.2 2.3.6 3.3C11 18.2 9 21.2 9 24.7 9 29.3 12.8 33 17.6 33H22v5.5c0 .6-.4 1.1-1 1.3l-4 1.2c-.6.2-1 .7-1 1.3 0 .4.3.7.7.7h14.6c.4 0 .7-.3.7-.7 0-.6-.4-1.1-1-1.3l-4-1.2c-.6-.2-1-.7-1-1.3V33h4.4C35.2 33 39 29.3 39 24.7c0-3.5-2-6.5-5.6-7.8.4-1 .6-2.1.6-3.3C34 8.4 30 4 24 4z"
        fill="currentColor" opacity=".9"/>
  <path d="M24 42V20m0 6 5-5m-5 11-6-6" stroke="var(--bg)" stroke-width="2.1"
        stroke-linecap="round" fill="none"/>
</svg>'''

NAV_ITEMS = [
    ("index.html",     "Home"),
    ("services.html",  "Services"),
    ("about.html",     "About"),
    ("platform.html",  "Platform"),
    ("contact.html",   "Contact"),
]

SHELL = '''<!DOCTYPE html>
<html lang="en" data-page="{slug}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="theme-color" content="#1e5631">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:type" content="website">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ctext y='26' font-size='26'%3E%F0%9F%8C%B3%3C/text%3E%3C/svg%3E">
<link rel="stylesheet" href="{base}assets/css/main.css">
{extra_css}</head>
<body>
<a class="skip" href="#main">Skip to content</a>

<header class="site-head">
  <div class="wrap">
    <a class="brand" href="{base}index.html">
      {mark}
      <span>True Tree Care<small>ISA Certified Arborist</small></span>
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
        <strong style="font-size:1.05rem">True Tree Care</strong>
        <p class="small" style="color:#b0a898;margin-top:.5rem">
          Arboriculture built on evidence, not guesswork. Every recommendation
          traces back to species, site and structure.
        </p>
      </div>
      <div>
        <h4>Services</h4>
        <ul>
          <li><a href="{base}services.html#assessment">Risk Assessment</a></li>
          <li><a href="{base}services.html#pruning">Pruning &amp; Structure</a></li>
          <li><a href="{base}services.html#health">Plant Health Care</a></li>
          <li><a href="{base}services.html#planting">Planting &amp; Selection</a></li>
          <li><a href="{base}services.html#construction">Construction Protection</a></li>
        </ul>
      </div>
      <div>
        <h4>Platform</h4>
        <ul>
          <li><a href="{base}app/risk.html">Liability vs. Asset</a></li>
          <li><a href="{base}app/planting.html">Planting Guide by ZIP</a></li>
          <li><a href="{base}app/study.html">ISA Study Guide</a></li>
          <li><a href="{base}app/plot.html">TreePlot GPS</a></li>
        </ul>
      </div>
      <div>
        <h4>Contact</h4>
        <ul>
          <li><a href="{base}contact.html">Request an assessment</a></li>
          <li><a href="{base}about.html">Credentials</a></li>
        </ul>
        <p class="small" style="color:#b0a898;margin-top:.8rem">
          Set your service area, phone and email in
          <span class="mono">src/</span> before publishing.
        </p>
      </div>
    </div>
    <div class="foot-legal">
      <span>&copy; <span data-year>2026</span> True Tree Care.</span>
      <span>ISA Certified Arborist on staff.</span>
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

        extra_css = ""
        for href in meta.get("css", "").split():
            pre = "" if href.startswith("http") else base
            extra_css += '<link rel="stylesheet" href="%s%s">\n' % (pre, href)

        extra_js = ""
        for src in meta.get("js", "").split():
            pre = "" if src.startswith("http") else base
            extra_js += '<script src="%s%s"></script>\n' % (pre, src)

        html = SHELL.format(
            slug=os.path.splitext(os.path.basename(out_rel))[0],
            title=meta.get("title", "True Tree Care"),
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


if __name__ == "__main__":
    main()
