# Lunarion personal portfolio

Standalone copy of the blue Lunarion portfolio. All pages, artwork, fonts,
animations, sounds, and tests are included locally. This folder does not
depend on Spark's frontend folder and contains no Git history or deployment
credentials.

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
