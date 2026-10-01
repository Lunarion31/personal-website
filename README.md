# A few things — Jamie's personal portfolio

An artsy newspaper-inspired portfolio with Bodoni Moda headlines, blue-ink
illustrations, paper texture, and responsive editorial columns. All pages, artwork, fonts,
animations, sounds, and tests are included locally. This folder does not
depend on Spark's frontend folder and contains no Git history or deployment
credentials.

`newspaper.css` contains the current theme, layered after the shared interaction
styles in `site.css` and interior-page styles in `pages.css`. The existing
intro, smooth scrolling, page slides, optional sounds, and reduced-motion
behavior are retained.

Original blue-ink editorial drawings live in `assets/art/`: a music-and-games
still life, an engraved eye, folded-paper correspondence, and a small comet.
They are lightweight, locally hosted SVGs with no external image dependencies.

## Optional background music

The floating **Play lo-fi** control plays an original 50-second instrumental
loop, independently of UI sounds. Music is off on a fresh tab; the MP3 is not
preloaded. Playback pauses when the page is hidden and fades when switched off.
Volume and playback position are remembered in session storage for this tab.
Between page loads it resumes from that position when the browser permits;
if autoplay is blocked, press **Resume lo-fi**. Browsers that reserve volume
for hardware controls use the device volume buttons instead of the slider.

The included track is under `assets/audio/`; its reproducible composition is
`scripts/render-lofi.py`. Regeneration needs NumPy and ffmpeg, but deployment
has no new build dependencies or external music services.

## Local preview

From this folder:

```sh
python3 -m http.server 4174 --bind 127.0.0.1
```

Open http://127.0.0.1:4174/. Use an HTTP server rather than opening index.html
directly, because assets and navigation use root-relative paths.

## Verification

```sh
node --test tests/*.test.cjs
```

## Deployment

Use a separate hosting project from Spark. For Vercel, select the Other
framework preset, leave the build command unset, and serve the project root.
No environment variables are required. Contact links open email or public
profiles; the former demo-request endpoint returns HTTP 410 and sends no mail.

The canonical sharing URLs currently use https://lunarion31.dev/.
The blue social preview is assets/lunarion-share-blue.jpg.

The Spark artwork remains as a project illustration. Bundled font and Lenis
licenses are included under assets/fonts and assets/vendor.
# personal-website
