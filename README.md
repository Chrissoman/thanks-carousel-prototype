# Thanks Offers Carousel — Prototype

Interaction prototype for the Thanks offers carousel that embeds inline in
partner payment-confirmation pages. Interaction mechanics are modelled on
Apple's "Get the highlights" media-card gallery: everything — card text,
dim/scale, and the pagination pill handoff — is driven by a single
continuous scroll-position variable, scrubbed live by the trackpad rather
than animated on timers.

## Run

```
node prototype/server.js
```

Open http://localhost:4599 — the bare carousel. Use the ⚙ settings panel
(bottom right) to fine-tune every behaviour, save/share presets as JSON,
and switch host pages.

## Host pages

`pages/` holds SingleFile snapshots of real partner pages. The server
injects the carousel into each partner's Thanks placement at serve time —
snapshots stay pristine. Registered in `pages/pages.json`:

| Page | Placement |
| --- | --- |
| Humanitix (dark + light) | replaces the Thanks iframe in `#thanks-widget` |
| Oztix | replaces the Thanks iframe in `#thanks-widget` |
| eBay checkout success | mounts inside partner div `#placement100685` |

To add a page: save it with the SingleFile browser extension, drop the
`.html` into `pages/`, add a manifest entry (`thanks-iframe`,
`before-anchor`, or `into-placement` + optional per-page `css`).

## Structure

- `prototype/embed.html` — the embed fragment (single source of truth)
- `prototype/carousel.js` — shell logic: scroll/snap/autoplay/dots/config
- `prototype/styles.css` — all styles, scoped under `.thanks-proto`
- `prototype/fonts/` — Gramatika (Thanks brand font)
- `prototype/server.js` — static server + host-page assembly

⚠️ The page snapshots contain real order/customer details — keep this
repo private unless they're scrubbed.
