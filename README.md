# Lunarion

Jamie's personal site. Vercel serves the static files from the repository root. The sidebar's Last.fm feed and visitor counter run on a separate Cloudflare Worker.

## Local preview

```sh
python3 -m http.server 4174 --bind 127.0.0.1
```

Open [the homepage](http://127.0.0.1:4174/). Run the local checks with `node --test`.

## Editing the site

- Edit the homepage and button carousel in `index.html`, the styles in `simple.css` and `editorial.css`, and the sidebar status in `status.js`.
- Edit the animated Lumi artwork in [the observatory preview](previews/observatory.html). Other sites embed [the GIF](static/img/buttons/lumi.gif) and [the original PNG](static/img/buttons/lumi.png) directly. The older PNG at `assets/lumi.png` is also available for hotlinks.
- The share image is `assets/lunarion-observatory.png`. Regenerate it on macOS with Pillow installed using `python3 scripts/render-share-card.py`.
- For the sidebar APIs and D1 database, see [Cloudflare setup](CLOUDFLARE-SETUP.md).
