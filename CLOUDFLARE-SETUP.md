# GitHub Pages + Cloudflare Worker

The website stays on GitHub Pages. Only the two sidebar APIs run on Cloudflare.

## Dashboard setup

1. In Cloudflare → Workers & Pages, create a Worker named `lunarion-widgets`. In Edit code, replace the starter with `worker/index.mjs`, then deploy.
2. Create a D1 database named `lunarion-visitors`. In its Console, run the SQL from `migrations/0001-visitors.sql`.
3. On the Worker, add a D1 database binding named `VISITORS` pointing to that database.
4. Add a text variable named `ALLOWED_ORIGINS` with this value (no trailing slashes):
   `https://lunarion31.dev,https://lunarion31.github.io,http://127.0.0.1:4174`
   Adjust if your actual website origin differs. Remove localhost after testing if desired.
5. Create a Last.fm API key at https://www.last.fm/api/account/create and add it to the Worker as a **secret** named `LASTFM_API_KEY`. The username LunaClient is already configured. Never put the key in the website or Git repository.
6. Deploy the Worker changes. Paste its `https://lunarion-widgets.…workers.dev` origin into `widget-config.js`.
7. Preview locally, then publish the website through your normal GitHub Pages workflow.

The old `functions/api/` files target Pages Functions and are unused with this setup; `worker/index.mjs` is the backend entry point. `worker/wrangler.jsonc` is an optional CLI starting point; add your D1 binding before CLI deployment.

## Behavior

The browser stores a random UUID in localStorage and sends it to the Worker. The database assigns one number per UUID. Refreshes retain the number; a different browser or cleared storage counts again. No third-party cookies or stored IP addresses are involved. If browser storage is blocked, the counter stays unavailable rather than incrementing on every load. This counts browser identities, not verified unique people, and does not prevent bots from inflating totals.

The Worker allows browser requests only from configured origins. This is a CORS boundary, not authentication. Use a separate database for preview if you do not want testing counted in production.

Music refreshes once a minute while visible. Missing config or API failures show a profile link and counter dashes rather than fake data. The local static preview works with a deployed Worker once its URL is configured.

Cloudflare documentation:
- https://developers.cloudflare.com/workers/wrangler/configuration/
- https://developers.cloudflare.com/d1/get-started/
