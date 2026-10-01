const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "site-music.js"), "utf8");
const key = "jamie-background-music";
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };

function harness({ saved = { version: 2, enabled: false }, mode = "running", hidden = false, storageBlocked = false, systemVolume = false } = {}) {
    class Events {
        constructor() { this.listeners = new Map(); }
        addEventListener(type, callback) {
            const callbacks = this.listeners.get(type) || [];
            callbacks.push(callback);
            this.listeners.set(type, callbacks);
        }
        dispatch(type, event = {}) { for (const callback of this.listeners.get(type) || []) callback({ type, ...event }); }
    }
    const document = new Events();
    const window = new Events();
    const audio = new Events();
    const toggle = new Events();
    const slider = new Events();
    const player = { attributes: {}, setAttribute(name, value) { this.attributes[name] = value; } };
    const label = { textContent: "Play lo-fi" };
    const status = { textContent: "" };
    const volumeControl = { hidden: true, querySelector: () => slider };
    toggle.attributes = {};
    toggle.setAttribute = (name, value) => { toggle.attributes[name] = value; };
    toggle.querySelector = () => label;
    toggle.closest = () => player;
    player.querySelector = selector => selector === ".site-music-volume" ? volumeControl : status;
    document.querySelector = () => toggle;
    document.getElementById = () => audio;
    document.hidden = hidden;
    audio.paused = true;
    audio.currentTime = 0;
    audio.readyState = 0;
    audio.duration = 50;
    audio.mode = mode;
    audio.playCalls = 0;
    audio.pauseCalls = 0;
    audio.pending = [];
    let mediaVolume = 1;
    Object.defineProperty(audio, "volume", {
        get: () => mediaVolume,
        set: value => { if (!systemVolume) mediaVolume = value; },
    });
    const finishPlay = () => {
        if (!audio.readyState) { audio.readyState = 2; audio.dispatch("loadedmetadata"); }
        audio.paused = false;
        audio.dispatch("playing");
    };
    audio.play = () => {
        audio.playCalls++;
        if (audio.mode === "blocked") return Promise.reject(Object.assign(new Error("Blocked"), { name: "NotAllowedError" }));
        if (audio.mode === "failed") return Promise.reject(new Error("Unavailable"));
        if (audio.mode === "pending") return new Promise(resolve => audio.pending.push(() => { finishPlay(); resolve(); }));
        finishPlay();
        return Promise.resolve();
    };
    audio.pause = () => {
        audio.pauseCalls++;
        audio.paused = true;
        audio.dispatch("pause");
    };
    const storage = new Map(saved ? [[key, JSON.stringify(saved)]] : []);
    window.sessionStorage = {
        getItem(name) { if (storageBlocked) throw new Error("Storage blocked"); return storage.get(name) ?? null; },
        setItem(name, value) { if (storageBlocked) throw new Error("Storage blocked"); storage.set(name, value); },
    };
    let milliseconds = 0;
    let sequence = 0;
    const frames = new Map();
    window.requestAnimationFrame = callback => { frames.set(++sequence, callback); return sequence; };
    window.cancelAnimationFrame = id => frames.delete(id);
    const advance = ms => {
        milliseconds += ms;
        const callbacks = [...frames.values()];
        frames.clear();
        for (const callback of callbacks) callback(milliseconds);
    };
    vm.runInContext(source, vm.createContext({ document, window, performance: { now: () => milliseconds } }));
    return { document, window, audio, toggle, slider, label, status, volumeControl, storage, advance,
        state: () => JSON.parse(storage.get(key) || "null"),
        click: async () => { toggle.dispatch("click"); await flush(); },
    };
}

test("fresh tabs attempt autoplay once at the existing volume", async () => {
    const h = harness({ saved: null });
    await flush();
    assert.equal(h.audio.playCalls, 1);
    assert.equal(h.audio.volume, 0.3);
    assert.equal(h.label.textContent, "Lo-fi on");
    assert.equal(h.toggle.attributes["aria-pressed"], "true");
    assert.equal(h.state().version, 2);
    assert.equal(h.state().enabled, true);
    assert.equal(h.volumeControl.hidden, false);
    h.window.dispatch("pageshow");
    assert.equal(h.audio.playCalls, 1);
});

test("an explicit click plays independently of UI sounds and saves the tab preference", async () => {
    const h = harness();
    await h.click();
    assert.equal(h.audio.playCalls, 1);
    assert.equal(h.audio.paused, false);
    assert.equal(h.label.textContent, "Lo-fi on");
    assert.equal(h.toggle.attributes["aria-pressed"], "true");
    assert.equal(h.state().enabled, true);
    assert.equal(h.volumeControl.hidden, false);
    assert.doesNotMatch(source, /localStorage|sparkSound|AudioContext|fetch\(/);
});

test("switching music off fades gently and preserves the paused position", async () => {
    const h = harness();
    await h.click();
    h.audio.currentTime = 14;
    await h.click();
    assert.equal(h.state().enabled, false);
    assert.equal(h.toggle.attributes["aria-pressed"], "false");
    h.advance(140);
    assert.ok(h.audio.volume > 0 && h.audio.volume < 0.3);
    assert.equal(h.audio.paused, false);
    h.advance(140);
    assert.equal(h.audio.paused, true);
    assert.equal(h.audio.volume, 0.3);
    assert.equal(h.state().position, 14);
});

test("the volume slider works, including mute, without changing playback preference", async () => {
    const h = harness();
    await h.click();
    h.slider.value = "10";
    h.slider.dispatch("input");
    assert.equal(h.audio.volume, 0.1);
    assert.equal(h.state().volume, 0.1);
    h.slider.value = "0";
    h.slider.dispatch("input");
    assert.equal(h.audio.volume, 0);
    assert.equal(h.state().enabled, true);
});

test("page navigation restores position and volume for an opted-in tab", async () => {
    const h = harness({ saved: { enabled: true, position: 72, volume: 0.2 } });
    await flush();
    assert.equal(h.audio.currentTime, 22);
    assert.equal(h.audio.volume, 0.2);
    h.audio.currentTime = 31;
    h.window.dispatch("pagehide");
    assert.equal(h.audio.paused, true);
    const next = harness({ saved: h.state() });
    await flush();
    assert.equal(next.audio.currentTime, 31);
    assert.equal(next.audio.paused, false);
});

test("autoplay rejection shows a truthful resume control and retries on a tap", async () => {
    const h = harness({ saved: { enabled: true, position: 8, volume: 0.3 }, mode: "blocked" });
    await flush();
    assert.equal(h.audio.paused, true);
    assert.equal(h.label.textContent, "Resume lo-fi");
    assert.equal(h.toggle.attributes["aria-pressed"], "false");
    assert.match(h.status.textContent, /press play/);
    h.audio.mode = "running";
    await h.click();
    assert.equal(h.audio.paused, false);
    assert.equal(h.audio.currentTime, 8);
});

test("hidden tabs pause immediately and honor the tab's playback preference", async () => {
    const h = harness();
    h.document.hidden = true;
    h.document.dispatch("visibilitychange");
    h.document.hidden = false;
    h.document.dispatch("visibilitychange");
    assert.equal(h.audio.playCalls, 0);
    await h.click();
    h.document.hidden = true;
    h.document.dispatch("visibilitychange");
    assert.equal(h.audio.paused, true);
    assert.equal(h.state().enabled, true);
    h.document.hidden = false;
    h.document.dispatch("visibilitychange");
    await flush();
    assert.equal(h.audio.paused, false);
});

test("restoring an opted-in hidden document does not start inaudible background playback", async () => {
    const h = harness({ saved: { enabled: true, position: 9, volume: 0.3 }, hidden: true });
    await flush();
    assert.equal(h.audio.playCalls, 0);
    assert.equal(h.label.textContent, "Resume lo-fi");
});

test("muting while playback is pending prevents a late play promise from starting music", async () => {
    const h = harness({ mode: "pending" });
    await h.click();
    assert.equal(h.label.textContent, "Starting…");
    await h.click();
    h.audio.pending[0]();
    await flush();
    assert.equal(h.audio.paused, true);
    assert.equal(h.state().enabled, false);
});

test("turning music back on interrupts an unfinished fade", async () => {
    const h = harness();
    await h.click();
    await h.click();
    h.advance(100);
    await h.click();
    h.advance(1000);
    assert.equal(h.audio.paused, false);
    assert.equal(h.audio.volume, 0.3);
    assert.equal(h.state().enabled, true);
});

test("storage restrictions do not break play or pause", async () => {
    const h = harness({ storageBlocked: true });
    await flush();
    assert.equal(h.audio.paused, false);
    await h.click();
    h.advance(300);
    assert.equal(h.audio.paused, true);
    await h.click();
    assert.equal(h.audio.paused, false);
});

test("failed music requests show retry instead of claiming playback", async () => {
    const h = harness({ mode: "failed" });
    await h.click();
    assert.equal(h.label.textContent, "Retry lo-fi");
    assert.equal(h.toggle.attributes["aria-pressed"], "false");
    assert.equal(h.state().enabled, false);
    h.audio.mode = "running";
    await h.click();
    h.audio.dispatch("error");
    assert.equal(h.audio.paused, true);
    assert.equal(h.label.textContent, "Retry lo-fi");
});

test("hardware-only volume browsers hide the nonfunctional slider", async () => {
    const h = harness({ systemVolume: true });
    await h.click();
    assert.equal(h.volumeControl.hidden, true);
    assert.match(h.toggle.title, /device's volume buttons/);
    await h.click();
    assert.equal(h.audio.paused, true);
});

test("time updates checkpoint playback and explicit pauses survive page reloads", async () => {
    const h = harness();
    await h.click();
    h.audio.currentTime = 19;
    h.advance(2100);
    h.audio.dispatch("timeupdate");
    assert.equal(h.state().position, 19);
    const fresh = harness({ saved: null });
    assert.equal(fresh.audio.playCalls, 1);
    await h.click();
    h.advance(300);
    const muted = harness({ saved: h.state() });
    assert.equal(muted.audio.playCalls, 0);
});

test("the old opt-in default is upgraded without losing saved volume or position", async () => {
    const h = harness({ saved: { enabled: false, volume: 0.45, position: 21 } });
    await flush();
    assert.equal(h.audio.paused, false);
    assert.equal(h.audio.currentTime, 21);
    assert.equal(h.audio.volume, 0.45);
    assert.equal(h.state().version, 2);
    await h.click();
    h.advance(300);
    const reload = harness({ saved: h.state() });
    await flush();
    assert.equal(reload.audio.playCalls, 0);
    assert.equal(reload.audio.currentTime, 0);
    assert.equal(reload.audio.volume, 0.45);
});

test("blocked autoplay retries on a trusted click, tap, or key press exactly once", async () => {
    for (const type of ["pointerdown", "touchend", "click", "keydown"]) {
        const h = harness({ saved: null, mode: "blocked" });
        await flush();
        assert.equal(h.audio.playCalls, 1);
        assert.equal(h.audio.paused, true);
        assert.match(h.status.textContent, /blocked autoplay/);
        h.audio.mode = "running";
        h.document.dispatch(type, { isTrusted: true, key: "Enter" });
        await flush();
        assert.equal(h.audio.paused, false, type);
        assert.equal(h.status.textContent, "");
        h.document.dispatch(type, { isTrusted: true, key: "Enter" });
        await flush();
        assert.equal(h.audio.playCalls, 2, "ordinary interactions cannot restart music");
    }
});

test("synthetic input, scrolling, shortcuts, and music controls do not trigger fallback autoplay", async () => {
    const h = harness({ saved: null, mode: "blocked" });
    await flush();
    h.audio.mode = "running";
    h.document.dispatch("pointerdown", { isTrusted: false });
    h.document.dispatch("wheel", { isTrusted: true });
    for (const key of ["Control", "Meta", "Alt", "Shift", "Escape"]) {
        h.document.dispatch("keydown", { isTrusted: true, key });
    }
    for (const modifier of ["ctrlKey", "metaKey", "altKey"]) {
        h.document.dispatch("keydown", { isTrusted: true, key: "k", [modifier]: true });
    }
    h.document.dispatch("pointerdown", { isTrusted: true, target: { closest: () => true } });
    await flush();
    assert.equal(h.audio.playCalls, 1);
    await h.click();
    assert.equal(h.audio.playCalls, 2);
    assert.equal(h.audio.paused, false);
});

test("autoplay never overrides a manual pause after navigation or subsequent gestures", async () => {
    const h = harness({ saved: null });
    await flush();
    await h.click();
    h.advance(300);
    h.document.dispatch("pointerdown", { isTrusted: true });
    h.document.dispatch("keydown", { isTrusted: true, key: "Enter" });
    h.window.dispatch("pageshow");
    h.document.hidden = true;
    h.document.dispatch("visibilitychange");
    h.document.hidden = false;
    h.document.dispatch("visibilitychange");
    await flush();
    assert.equal(h.audio.playCalls, 1);
    assert.equal(h.audio.paused, true);
    const next = harness({ saved: h.state() });
    await flush();
    next.document.dispatch("click", { isTrusted: true });
    assert.equal(next.audio.playCalls, 0);
});

test("new hidden tabs defer autoplay until visible, and then use the normal gesture fallback", async () => {
    const h = harness({ saved: null, hidden: true, mode: "blocked" });
    await flush();
    assert.equal(h.audio.playCalls, 0);
    h.document.dispatch("click", { isTrusted: true });
    assert.equal(h.audio.playCalls, 0);
    h.document.hidden = false;
    h.document.dispatch("visibilitychange");
    await flush();
    assert.equal(h.audio.playCalls, 1);
    h.document.hidden = true;
    h.document.dispatch("visibilitychange");
    h.document.dispatch("pointerdown", { isTrusted: true });
    assert.equal(h.audio.playCalls, 1);
    h.audio.mode = "running";
    h.document.hidden = false;
    h.document.dispatch("visibilitychange");
    await flush();
    assert.equal(h.audio.paused, false);
});

test("a missing autoplay asset requires an explicit retry, not ordinary interaction", async () => {
    const h = harness({ saved: null, mode: "failed" });
    await flush();
    assert.equal(h.label.textContent, "Retry lo-fi");
    h.audio.mode = "running";
    h.document.dispatch("click", { isTrusted: true });
    assert.equal(h.audio.playCalls, 1);
    await h.click();
    assert.equal(h.audio.paused, false);
});

test("all routes include one accessible local player outside page transitions", () => {
    for (const route of ["", "about", "contact", "privacy", "terms"]) {
        const html = fs.readFileSync(path.join(root, route, "index.html"), "utf8");
        assert.equal([...html.matchAll(/class="site-music-player"/g)].length, 1);
        assert.match(html, /aria-label="Background music"/);
        assert.match(html, /class="site-music-toggle" type="button" aria-label="Play background music" aria-pressed="false"/);
        assert.match(html, /aria-controls="site-music"/);
        assert.match(html, /<audio id="site-music" src="\/assets\/audio\/lofi-midnight-club\.mp3" loop preload="none"/);
        assert.doesNotMatch(html.match(/<audio\b[^>]+>/)[0], /autoplay/);
        assert.ok(html.indexOf('class="site-music-player"') < html.indexOf('<main id="main"'));
        assert.ok(html.indexOf('class="site-music-player"') > html.indexOf('</header>'));
        assert.match(html, /Music volume/);
        assert.match(html, /class="site-music-status" role="status"/);
    }
    const music = fs.readFileSync(path.join(root, "assets/audio/lofi-midnight-club.mp3"));
    assert.equal(music.subarray(0, 3).toString(), "ID3");
    assert.ok(music.length > 1000000 && music.length < 3000000);
    const credits = fs.readFileSync(path.join(root, "assets/audio/README.md"), "utf8");
    assert.match(credits, /Lofi Midnight Club/);
    assert.match(credits, /Alex Morgan/);
    assert.match(credits, /https:\/\/pixabay.com\/service\/terms\//);
    assert.match(fs.readFileSync(path.join(root, "terms/index.html"), "utf8"), /Background music:.*Lofi Midnight Club.*Alex Morgan.*Pixabay Content License/);
    const css = fs.readFileSync(path.join(root, "music.css"), "utf8");
    assert.match(css, /\.site-music-player\s*\{[^}]*position: fixed/);
    assert.match(css, /prefers-reduced-motion: reduce/);
    assert.match(css, /@media print\s*\{\s*\.site-music-player \{ display: none; \}/);
    assert.match(fs.readFileSync(path.join(root, "privacy/index.html"), "utf8"), /background music preferences, volume, and playback position/);
});
