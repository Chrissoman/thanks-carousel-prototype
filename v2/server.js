// v2 server: static files + host-page assembly (port 4600 — the v1
// prototype keeps 4599).
//
//   /                 → index.html with the embed fragment inserted (bare view)
//   /?page=<key>      → saved partner page (SingleFile snapshot) with the
//                       Thanks embed injected per ../pages/pages.json
//   /pages.json       → the manifest (feeds the settings-panel dropdown)
//   /styles.css etc.  → static assets
//
// Snapshots stay pristine on disk — all surgery happens at serve time.
// Assembly logic lives in assemble.js (shared with build.js, which
// pre-assembles the same output as a static site for GitHub Pages).
const http = require("http");
const fs = require("fs");
const path = require("path");
const { ROOT, readManifest, readEmbed, assemblePage, assembleIndex } = require("./assemble");

const PORT = 4600;
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
          const assembled = assemblePage(entry, readEmbed());
          if (!assembled) { res.writeHead(500); return res.end("Placement not found in " + entry.file); }
          res.writeHead(200, { "Content-Type": "text/html" });
          return res.end(assembled);
        }
        res.writeHead(200, { "Content-Type": "text/html" });
        return res.end(assembleIndex(readEmbed()));
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
