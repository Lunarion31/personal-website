(() => {
    const audio = document.getElementById("site-music");
    const toggle = document.querySelector(".site-music-toggle");
    if (!audio || !toggle) return;

    const label = toggle.querySelector(".site-music-label");
    const player = toggle.closest(".site-music-player");
    const volumeControl = player.querySelector(".site-music-volume");
    const slider = volumeControl.querySelector("input");
    const status = player.querySelector(".site-music-status");
    const storageKey = "jamie-background-music";
    const introActive = () => document.documentElement.classList.contains("spark-home-intro");
    let wanted = true;
    let playing = false;
    let starting = false;
    let failed = false;
    let volume = 0.3;
    let resumePosition = 0;
    let request = 0;
    let fadeFrame = null;
    let fadeDirection = null;
    let lastSave = 0;
    let adjustableVolume = true;
    let awaitingGesture = false;
    let musicContext = null;
    let musicGain = null;

    try {
        const saved = JSON.parse(window.sessionStorage.getItem(storageKey));
        if (saved) {
            // Upgrade the old opt-in default, but keep explicit pauses made in autoplay mode.
            if (saved.version === 2 && typeof saved.enabled === "boolean") wanted = saved.enabled;
            if (Number.isFinite(saved.volume)) volume = Math.max(0, Math.min(1, saved.volume));
            if (Number.isFinite(saved.position) && saved.position >= 0) resumePosition = saved.position;
        }
    } catch {
        // Music still works when private browsing restricts preference storage.
    }

    const setVolume = (level) => {
        try {
            if (musicGain) musicGain.gain.value = level;
            else audio.volume = level;
        } catch {}
    };
    const currentVolume = () => musicGain ? musicGain.gain.value : audio.volume;
    // Some mobile browsers reserve media volume for the device's volume buttons.
    const volumeProbe = volume === 0.5 ? 0.25 : 0.5;
    setVolume(volumeProbe);
    adjustableVolume = Math.abs(audio.volume - volumeProbe) < 0.01;
    setVolume(volume);
    slider.value = String(Math.round(volume * 100));
    const prepareMobileGain = () => {
        if (adjustableVolume || musicContext) return;
        const Constructor = window.AudioContext || window.webkitAudioContext;
        if (!Constructor) return;
        let context;
        try {
            // iOS reserves media-element volume for hardware; a local gain can still fade it.
            context = new Constructor();
            const gain = context.createGain();
            gain.gain.value = 0;
            gain.connect(context.destination);
            context.createMediaElementSource(audio).connect(gain);
            musicContext = context;
            musicGain = gain;
            adjustableVolume = true;
        } catch {
            context?.close().catch(() => {});
        }
    };

    const save = () => {
        try {
            window.sessionStorage.setItem(storageKey, JSON.stringify({
                version: 2,
                enabled: wanted,
                volume,
                position: audio.readyState > 0 && Number.isFinite(audio.currentTime) ? audio.currentTime : resumePosition,
            }));
        } catch {}
    };
    const update = () => {
        const active = wanted && playing && !audio.paused;
        const waiting = wanted && introActive();
        const action = starting || waiting ? "Cancel background music" : active ? "Pause background music" : "Play background music";
        label.textContent = waiting ? "After intro" : starting ? "Starting…" : active ? "Lo-fi on" : failed ? "Retry lo-fi" : wanted ? "Resume lo-fi" : "Play lo-fi";
        toggle.setAttribute("aria-pressed", String(active));
        toggle.setAttribute("aria-label", action);
        toggle.setAttribute("aria-busy", String(starting || waiting));
        toggle.title = adjustableVolume ? action : `${action}. Use your device's volume buttons to adjust.`;
        player.setAttribute("data-playing", String(active));
        volumeControl.hidden = !active || !adjustableVolume;
    };
    const cancelFade = () => {
        if (fadeFrame !== null) window.cancelAnimationFrame(fadeFrame);
        fadeFrame = null;
        fadeDirection = null;
    };
    const pauseImmediately = () => {
        request++;
        starting = false;
        awaitingGesture = false;
        cancelFade();
        audio.pause();
        playing = false;
        setVolume(volume);
        update();
    };
    const fadeIn = (initialVolume) => {
        cancelFade();
        if (!adjustableVolume || volume === initialVolume) { setVolume(volume); return; }
        const began = performance.now();
        fadeDirection = "in";
        setVolume(initialVolume);
        const fade = (now) => {
            if (!wanted || audio.paused || document.hidden || introActive()) { pauseImmediately(); return; }
            const progress = Math.min(1, Math.max(0, (now - began) / 1200));
            const eased = progress * progress * (3 - 2 * progress);
            setVolume(initialVolume + (volume - initialVolume) * eased);
            if (progress < 1) fadeFrame = window.requestAnimationFrame(fade);
            else { fadeFrame = null; fadeDirection = null; setVolume(volume); }
        };
        fadeFrame = window.requestAnimationFrame(fade);
    };
    const start = async () => {
        if (!wanted || starting || document.hidden || introActive() || (playing && !audio.paused && fadeDirection !== "out")) return;
        const token = ++request;
        prepareMobileGain();
        const alreadyPlaying = !audio.paused;
        const initialVolume = alreadyPlaying ? currentVolume() : 0;
        cancelFade();
        // Ask for audible playback at the chosen native volume, then silence it before the first frame.
        // The mobile gain starts at zero without altering the media element's autoplay eligibility.
        if (musicGain || alreadyPlaying) setVolume(initialVolume);
        else setVolume(volume);
        failed = false;
        awaitingGesture = false;
        starting = true;
        status.textContent = "";
        update();
        save();
        try {
            const resumed = musicContext?.resume().catch(() => {});
            const playback = audio.play();
            setVolume(initialVolume);
            await playback;
            if (musicContext && musicContext.state !== "running" && token === request) {
                let timer;
                try {
                    await Promise.race([resumed, new Promise(resolve => { timer = window.setTimeout(resolve, 500); })]);
                } finally { window.clearTimeout(timer); }
                if (token === request && musicContext.state !== "running") {
                    audio.pause();
                    throw Object.assign(new Error("Audio needs a user gesture"), { name: "NotAllowedError" });
                }
            }
            if (token !== request) {
                if (!wanted || document.hidden || introActive()) audio.pause();
                return;
            }
            starting = false;
            playing = true;
            fadeIn(initialVolume);
            update();
            save();
        } catch (error) {
            if (token !== request) return;
            starting = false;
            playing = false;
            setVolume(volume);
            if (error?.name === "NotAllowedError") {
                awaitingGesture = true;
                status.textContent = "Your browser blocked autoplay. Click, tap, or press a key to start the music, or press play.";
            } else {
                wanted = false;
                failed = true;
                status.textContent = "The music could not load. Press play to try again.";
            }
            update();
            save();
        }
    };
    const pauseGently = () => {
        request++;
        starting = false;
        awaitingGesture = false;
        cancelFade();
        if (audio.paused || !adjustableVolume || document.hidden) {
            pauseImmediately();
            return;
        }
        const began = performance.now();
        const initialVolume = currentVolume();
        fadeDirection = "out";
        const fade = (now) => {
            const progress = Math.min(1, Math.max(0, (now - began) / 280));
            setVolume(initialVolume * (1 - progress) ** 2);
            if (progress < 1) fadeFrame = window.requestAnimationFrame(fade);
            else {
                fadeFrame = null;
                fadeDirection = null;
                audio.pause();
                playing = false;
                setVolume(volume);
                update();
                save();
            }
        };
        fadeFrame = window.requestAnimationFrame(fade);
    };

    toggle.addEventListener("click", () => {
        if (wanted && (playing || starting || introActive())) {
            wanted = false;
            failed = false;
            status.textContent = "";
            pauseGently();
            update();
            save();
        } else {
            wanted = true;
            start();
        }
    });
    const resumeOnGesture = (event) => {
        if (!event.isTrusted || !awaitingGesture || !wanted || starting || document.hidden ||
            event.target?.closest?.(".site-music-player")) return;
        if (event.type === "keydown" && (event.ctrlKey || event.metaKey || event.altKey ||
            ["Control", "Meta", "Alt", "Shift", "Escape"].includes(event.key))) return;
        start();
    };
    // Real activation is needed for audible autoplay; wheel input alone cannot grant it.
    for (const type of ["pointerdown", "touchend", "click", "keydown"]) {
        document.addEventListener(type, resumeOnGesture, { passive: true });
    }
    slider.addEventListener("input", () => {
        const value = Number(slider.value);
        if (!Number.isFinite(value)) return;
        volume = Math.max(0, Math.min(1, value / 100));
        if (fadeDirection === "in") {
            if (volume === 0) { cancelFade(); setVolume(0); }
            else fadeIn(currentVolume());
        } else if (fadeFrame === null) setVolume(volume);
        save();
    });
    audio.addEventListener("loadedmetadata", () => {
        if (!resumePosition || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
        try { audio.currentTime = resumePosition % audio.duration; } catch {}
        resumePosition = 0;
    });
    audio.addEventListener("playing", () => {
        if (!wanted || document.hidden || introActive()) { audio.pause(); return; }
        if (musicContext && musicContext.state !== "running") return;
        awaitingGesture = false;
        playing = true;
        update();
    });
    audio.addEventListener("pause", () => {
        cancelFade();
        playing = false;
        update();
    });
    audio.addEventListener("error", () => {
        pauseImmediately();
        wanted = false;
        failed = true;
        status.textContent = "The music could not load. Press play to try again.";
        update();
        save();
    });
    audio.addEventListener("timeupdate", () => {
        if (performance.now() - lastSave < 2000) return;
        lastSave = performance.now();
        save();
    });
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) { save(); pauseImmediately(); }
        else if (wanted) start();
    });
    window.addEventListener("pagehide", () => { save(); pauseImmediately(); });
    window.addEventListener("pageshow", () => { if (wanted && audio.paused) start(); });
    window.addEventListener("spark:home-intro-end", () => { if (wanted) start(); });
    window.addEventListener("spark:home-intro-play", () => {
        if (introActive()) { save(); pauseImmediately(); }
    });
    update();
    if (wanted) start();
})();
