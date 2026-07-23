// Shared page-assembly logic — used by server.js (at request time)
// and build.js (to pre-assemble the static GitHub Pages site).
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;                       // prototype/
const PAGES_DIR = path.join(ROOT, "..", "pages");

function readManifest() {
  try {
    return JSON.parse(fs.readFileSync(path.join(PAGES_DIR, "pages.json"), "utf8"));
  } catch {
    return {};
  }
}

function readEmbed() {
  return fs.readFileSync(path.join(ROOT, "embed.html"), "utf8");
}

/* SingleFile stamps snapshots with a lock-down CSP (no 'self' in
   style-src/script-src), which blocks our injected assets. Swap it
   for one that also allows same-origin — external requests stay
   blocked, so the snapshot remains inert. */
const RELAXED_CSP = `<meta http-equiv=content-security-policy content="default-src 'none'; font-src 'self' data:; img-src 'self' data:; style-src 'self' 'unsafe-inline'; media-src 'self' data:; script-src 'self' 'unsafe-inline' data:; object-src 'self' data:; frame-src 'self' data:; connect-src 'self';">`;
function relaxCsp(html) {
  return html.replace(/<meta[^>]*content-security-policy[^>]*>/i, () => RELAXED_CSP);
}

/* Inject the embed into a saved partner page per its manifest entry.
   embedHtml is passed in so callers can prepend flags (build.js adds
   the static-mode marker). Returns null if the placement is missing. */
function assemblePage(entry, embedHtml) {
  const html = relaxCsp(fs.readFileSync(path.join(PAGES_DIR, entry.file), "utf8"));
  const pageCss = entry.css ? `<style>${[].concat(entry.css).join("\n")}</style>` : "";
  // per-page brand tokens (accent, unit bg…) read by carousel.js on load
  const tokens = entry.tokens
    ? `<script>window.__PAGE_TOKENS__=${JSON.stringify(entry.tokens)}</script>`
    : "";
  const embed = tokens + pageCss + embedHtml;

  if (entry.inject === "thanks-iframe") {
    const re = /<iframe[^>]*?data-thanks=embed[\s\S]*?<\/iframe>/;
    if (!re.test(html)) return null;
    const override = "<style>#thanks-widget{height:auto!important}</style>";
    return html.replace(re, () => override + embed);
  }

  if (entry.inject === "before-anchor") {
    const i = html.indexOf(entry.anchor);
    if (i === -1) return null;
    return html.slice(0, i) + embed + html.slice(i);
  }

  if (entry.inject === "into-placement") {
    const re = new RegExp(`<div[^>]*id=["']?${entry.placement}["']?[^>]*>`, "i");
    const m = html.match(re);
    if (!m) return null;
    const idx = m.index + m[0].length;
    const hide = `<style>#${entry.placement} > :not(.thanks-proto){display:none!important}</style>`;
    return html.slice(0, idx) + hide + embed + html.slice(idx);
  }

  return null;
}

function assembleIndex(embedHtml) {
  const shell = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  return shell.replace("<!--THANKS_EMBED-->", embedHtml);
}

module.exports = { ROOT, PAGES_DIR, readManifest, readEmbed, relaxCsp, assemblePage, assembleIndex };
