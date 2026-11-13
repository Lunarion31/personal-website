# Lunarion

Jamie's personal site. Vercel serves the static files from the repository root. The sidebar's Last.fm feed and visitor counter run on a separate Cloudflare Worker.

## Local preview

```sh
python3 -m http.server 4174 --bind 127.0.0.1
```

Open [the homepage](http://127.0.0.1:4174/).

## Editing the site

- Edit the homepage and button carousel in `index.html`, the styles in `simple.css` and `editorial.css`, and the sidebar status in `status.js`.
- Other sites embed [the GIF](static/img/buttons/lumi.gif) and [the static PNG](static/img/buttons/lumi.png) directly. The same still is also available at `assets/lumi.png` for existing hotlinks.
- The Konami-code Easter egg lives in `ascii-mode.js` and `ascii-mode.css`; its scenery uses `ascii-landscape.js`, `ascii-sakura.js`, and the licensed libraries in `assets/vendor/`.
- The share image is `assets/lunarion-observatory.png`. Regenerate it on macOS with Pillow installed using `python3 scripts/render-share-card.py`.
- For the sidebar APIs and D1 database, see [Cloudflare setup](CLOUDFLARE-SETUP.md).
