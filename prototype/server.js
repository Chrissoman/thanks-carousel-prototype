// Prototype server: static files + host-page assembly.
//
//   /                 → index.html with the embed fragment inserted (bare view)
//   /?page=<key>      → saved partner page (SingleFile snapshot) with the
//                       Thanks embed iframe replaced by our carousel, per
//                       the manifest in ../pages/pages.json
//   /pages.json       → the manifest (feeds the settings-panel dropdown)
//   /styles.css etc.  → static assets
//
// Snapshots stay pristine on disk — all surgery happens at serve time.
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;                       // prototype/
const PAGES_DIR = path.join(ROOT, "..", "pages");
const PORT = 4599;
const TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};

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

/* Inject the embed into a saved partner page per its manifest entry.
   Returns the assembled HTML, or null if the placement wasn't found. */
/* SingleFile stamps snapshots with a lock-down CSP (no 'self' in
   style-src/script-src), which blocks our injected assets. Swap it
   for one that also allows same-origin — external requests stay
   blocked, so the snapshot remains inert. */
const RELAXED_CSP = `<meta http-equiv=content-security-policy content="default-src 'none'; font-src 'self' data:; img-src 'self' data:; style-src 'self' 'unsafe-inline'; media-src 'self' data:; script-src 'self' 'unsafe-inline' data:; object-src 'self' data:; frame-src 'self' data:; connect-src 'self';">`;
function relaxCsp(html) {
  return html.replace(/<meta[^>]*content-security-policy[^>]*>/i, () => RELAXED_CSP);
}

function assemblePage(entry) {
  const html = relaxCsp(fs.readFileSync(path.join(PAGES_DIR, entry.file), "utf8"));
  // per-page placement CSS from the manifest (array of rule strings)
  const pageCss = entry.css ? `<style>${[].concat(entry.css).join("\n")}</style>` : "";
  const embed = pageCss + readEmbed();

  if (entry.inject === "thanks-iframe") {
    // The partner's placement slot holds <iframe data-thanks=embed …>…</iframe>
    // (SingleFile captures the whole widget into it — can be ~1MB).
    // Replace the iframe with our embed and free the slot's fixed height.
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
    // Partner-designated placement div: mount inside it and hide its
    // existing children (safer than excising a huge minified subtree).
    const re = new RegExp(`<div[^>]*id=["']?${entry.placement}["']?[^>]*>`, "i");
    const m = html.match(re);
    if (!m) return null;
    const idx = m.index + m[0].length;
    const hide = `<style>#${entry.placement} > :not(.thanks-proto){display:none!important}</style>`;
    return html.slice(0, idx) + hide + embed + html.slice(idx);
  }

  return null;
}

http
  .createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    const urlPath = decodeURIComponent(url.pathname);

    try {
      // manifest for the settings dropdown
      if (urlPath === "/pages.json") {
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify(readManifest()));
      }

      // root: bare view, or a host page via ?page=
      if (urlPath === "/" || urlPath === "/index.html") {
        const pageKey = url.searchParams.get("page");
        if (pageKey) {
          const entry = readManifest()[pageKey];
          if (!entry) { res.writeHead(404); return res.end("Unknown page: " + pageKey); }
          const assembled = assemblePage(entry);
          if (!assembled) { res.writeHead(500); return res.end("Placement not found in " + entry.file); }
          res.writeHead(200, { "Content-Type": "text/html" });
          return res.end(assembled);
        }
        const shell = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
        res.writeHead(200, { "Content-Type": "text/html" });
        return res.end(shell.replace("<!--THANKS_EMBED-->", readEmbed()));
      }

      // static assets
      const filePath = path.join(ROOT, urlPath);
      if (!filePath.startsWith(ROOT)) { res.writeHead(403); return res.end("Forbidden"); }
      const data = fs.readFileSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { "Content-Type": TYPES[ext] || "application/octet-stream" });
      return res.end(data);
    } catch (e) {
      res.writeHead(e.code === "ENOENT" ? 404 : 500);
      return res.end(e.code === "ENOENT" ? "Not found" : "Server error: " + e.message);
    }
  })
  .listen(PORT, () => console.log(`serving ${ROOT} on http://localhost:${PORT}`));
