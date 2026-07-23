// Pre-assemble v2 as a static site → ../docs/v2 (served by GitHub
// Pages under /v2/). Mirrors exactly what server.js does at request
// time; the only addition is the __THANKS_STATIC__ flag so the Page
// dropdown navigates between page-<key>.html files.
//
//   node v2/build.js
const fs = require("fs");
const path = require("path");
const { ROOT, readManifest, readEmbed, assemblePage, assembleIndex } = require("./assemble");

const DOCS = path.join(ROOT, "..", "docs", "v2");
const STATIC_FLAG = "<script>window.__THANKS_STATIC__=true</script>";

fs.rmSync(DOCS, { recursive: true, force: true });
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
console.log("built v2/index.html");

// host pages
for (const [key, entry] of Object.entries(manifest)) {
  const assembled = assemblePage(entry, embed);
  if (!assembled) {
    console.error(`SKIPPED ${key}: placement not found in ${entry.file}`);
    process.exitCode = 1;
    continue;
  }
  fs.writeFileSync(path.join(DOCS, `page-${key}.html`), assembled);
  console.log(`built v2/page-${key}.html (${Math.round(assembled.length / 1024)}KB)`);
}

console.log("done → docs/v2/");
