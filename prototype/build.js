// Pre-assemble the prototype as a static site → ../docs
// (served by GitHub Pages). Mirrors exactly what server.js does at
// request time; the only addition is the __THANKS_STATIC__ flag so
// the Page dropdown navigates between page-<key>.html files.
//
//   node prototype/build.js
const fs = require("fs");
const path = require("path");
const { ROOT, readManifest, readEmbed, assemblePage, assembleIndex } = require("./assemble");

const DOCS = path.join(ROOT, "..", "docs");
const STATIC_FLAG = "<script>window.__THANKS_STATIC__=true</script>";

// clear the v1 output only — docs/v2 belongs to the v2 build
for (const f of fs.existsSync(DOCS) ? fs.readdirSync(DOCS) : []) {
  if (f !== "v2") fs.rmSync(path.join(DOCS, f), { recursive: true, force: true });
}
fs.mkdirSync(path.join(DOCS, "fonts"), { recursive: true });

// assets
for (const f of ["styles.css", "carousel.js"]) {
  fs.copyFileSync(path.join(ROOT, f), path.join(DOCS, f));
}
for (const f of fs.readdirSync(path.join(ROOT, "fonts"))) {
  fs.copyFileSync(path.join(ROOT, "fonts", f), path.join(DOCS, "fonts", f));
}
fs.mkdirSync(path.join(DOCS, "assets"), { recursive: true });
for (const f of fs.readdirSync(path.join(ROOT, "assets"))) {
  fs.copyFileSync(path.join(ROOT, "assets", f), path.join(DOCS, "assets", f));
}

const manifest = readManifest();
fs.writeFileSync(path.join(DOCS, "pages.json"), JSON.stringify(manifest, null, 2));

const embed = STATIC_FLAG + readEmbed();

// bare view
fs.writeFileSync(path.join(DOCS, "index.html"), assembleIndex(embed));
console.log("built index.html");

// host pages
for (const [key, entry] of Object.entries(manifest)) {
  const assembled = assemblePage(entry, embed);
  if (!assembled) {
    console.error(`SKIPPED ${key}: placement not found in ${entry.file}`);
    process.exitCode = 1;
    continue;
  }
  fs.writeFileSync(path.join(DOCS, `page-${key}.html`), assembled);
  console.log(`built page-${key}.html (${Math.round(assembled.length / 1024)}KB)`);
}

// GitHub Pages: skip Jekyll processing
fs.writeFileSync(path.join(DOCS, ".nojekyll"), "");
console.log("done → docs/");
