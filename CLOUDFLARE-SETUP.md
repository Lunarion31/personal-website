# Sidebar widgets on Cloudflare

Vercel serves the website. The Cloudflare Worker serves the two sidebar APIs.

## Dashboard setup

1. In Cloudflare → Workers & Pages, create a Worker named `lunarion-widgets`. In Edit code, replace the starter with `worker/index.mjs`, then deploy.
2. Create a D1 database named `lunarion-visitors`. In its Console, run the SQL from `migrations/0001-visitors.sql`.
3. On the Worker, add a D1 database binding named `VISITORS` pointing to that database.
4. Add a text variable named `ALLOWED_ORIGINS` with this value (no trailing slashes):
   `https://www.lunarion31.dev,https://lunarion31.dev,http://127.0.0.1:4174`
   Include any additional Vercel or custom domains from which you serve the site. Remove localhost after testing if desired.
5. Create a Last.fm API key at https://www.last.fm/api/account/create and add it to the Worker as a **secret** named `LASTFM_API_KEY`. The username LunaClient is already configured. Never put the key in the website or Git repository.
6. Deploy the Worker changes. Paste its `https://lunarion-widgets.…workers.dev` origin into `widget-config.js`.
7. Preview locally, then publish the website through the Vercel project connected to this repository.

For CLI deployments, add your D1 binding and set the deployed origin list in `worker/wrangler.jsonc`.

## Behavior

The browser creates a fresh random UUID in memory for each page load and sends it to the Worker. The existing `visitors` table assigns one number per token, so every refresh or new page load now counts as a visit. The same in-memory token can be reused for retries without counting that load twice. Browser storage is not required, and no third-party cookies or stored IP addresses are involved. This counts page visits, including repeat visitors and bots, rather than unique people.

The count continues from the existing database; earlier numbers were assigned to browser identities. No database migration or Worker redeployment is needed for this change. The counter shows the total when this page load was registered; it does not poll or increment while the page sits open.

The Worker allows browser requests only from configured origins. This is a CORS boundary, not authentication. Use a separate database for preview if you do not want testing counted in production.

Music refreshes once a minute while visible. Missing config or API failures show a profile link and counter dashes rather than fake data. The local static preview works with a deployed Worker once its URL is configured.

Cloudflare documentation:
- https://developers.cloudflare.com/workers/wrangler/configuration/
- https://developers.cloudflare.com/d1/get-started/
