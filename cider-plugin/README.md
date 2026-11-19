# Lunarion Now Playing — Cider 4 plugin

A small publisher for the website's detailed listening panel. Uses the supported Cider PluginKit APIs (`AppleMusic.nowPlayingItem` and `useCiderAudio().source.mediaElement`). It never controls playback, requests an Apple Music account token, sends audio, or connects visitors to your computer.

## What it shares

- Track title, artist, album, Apple Music link, artwork, duration and playback position.
- Real playing/paused state, refreshed on changes and with a 15-second heartbeat. The website treats playback as stopped after 90 seconds without an update.
- A counted play after listening to half the song or four minutes, whichever comes first; songs must exceed 30 seconds. Pauses, buffering, seeks and sleep are excluded. A play UUID prevents duplicate counts if a request is retried.

New Cider totals start from zero. They are **not** your historical Last.fm scrobbles; the site labels them "plays tracked" and "tracking since." Weekly favorites reflect only plays recorded by this plugin. Existing Last.fm history and the visitor table are untouched. Failed uploads retry in memory (up to 100 queued plays); closing Cider discards unsent updates.

## Build

```sh
cd cider-plugin
npm ci --ignore-scripts
npm run build
```

Output: `dist/dev.lunarion.now-playing/plugin.js` and `plugin.yml`.

The provided `lunarion-now-playing.zip` contains those files at the archive root. Cider’s official starter emits `plugin.yml`, not `plugin.json`. In Cider, use Extensions / Plugins to install the local plugin package if your build offers that option. Otherwise use Cider's documented local plugin directory and copy the `dev.lunarion.now-playing` folder there. Restart Cider. This package has been built and tested with a simulated Cider host; installation and playback in the actual app still need verification.

Open **Lunarion · Website music sharing** from Cider's main menu. Set your Worker origin and publishing key, enable sharing, and save. Sharing is off by default. The key is stored only in Cider's local plugin configuration; do not paste it into the website, publish it, or put it in this repository. The bundle does not contain a key.

Cider 4 may not expose the optional DSP audio tap. The plugin also checks standard audio/video elements in same-origin playback frames. If neither source is available, it reports that instead of guessing whether playback is active.

## Worker setup

Run these from the website repository root:

```sh
# Adds two music tables; leaves the existing visitor data alone.
npx wrangler d1 execute VISITORS --remote --config worker/wrangler.jsonc --file migrations/0002-cider-music.sql

# Generate a long random key privately, then paste the SAME key here and in Cider.
npx wrangler secret put CIDER_PUBLISH_TOKEN --config worker/wrangler.jsonc
```

Set `MUSIC_SOURCE` to `cider` in `worker/wrangler.jsonc`'s `vars`, then deploy:

```sh
npx wrangler deploy --config worker/wrangler.jsonc --keep-vars
```

The default remains Last.fm until you explicitly select Cider, so building this plugin does not interrupt the live site.

`POST /api/cider/publish` requires that secret in `Authorization: Bearer …`. It accepts only bounded, validated playback updates. The public website still reads `/api/listening` and `/api/music-stats`; no publisher credentials are shipped to visitors. Artwork must use HTTPS Apple image hosts and links must point to Apple Music. The server stores metadata and counts in the existing D1 binding's new music tables.

## Reference

- Cider SDK: https://github.com/ciderapp/PluginKit
- Official starter: https://github.com/ciderapp/plugin-template
- PluginKit API: https://github.com/ciderapp/PluginKit/blob/main/docs/API%20Documentation.md

### Verified local directory on this Mac

The existing Cider app-data directory on this machine is `~/Library/Application Support/sh.cider.genten/plugins/`. Copy the built `dev.lunarion.now-playing` folder into it, then restart Cider. Use Cider’s Open AppData folder action on other machines instead of relying on older Electron paths from the starter README.

```sh
cp -R "/Users/toaster/personal portfolio/cider-plugin/dist/dev.lunarion.now-playing" "$HOME/Library/Application Support/sh.cider.genten/plugins/"
```
