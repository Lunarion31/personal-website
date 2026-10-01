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
    let wanted = true;
    let playing = false;
    let starting = false;
    let failed = false;
    let volume = 0.3;
    let resumePosition = 0;
    let request = 0;
    let fadeFrame = null;
    let lastSave = 0;
    let adjustableVolume = true;
    let awaitingGesture = false;

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
        try { audio.volume = level; } catch {}
    };
    setVolume(volume);
    // Some mobile browsers reserve media volume for the device's volume buttons.
    adjustableVolume = Math.abs(audio.volume - volume) < 0.01;
    slider.value = String(Math.round(volume * 100));

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
        const action = starting ? "Cancel background music" : active ? "Pause background music" : "Play background music";
        label.textContent = starting ? "Starting…" : active ? "Lo-fi on" : failed ? "Retry lo-fi" : wanted ? "Resume lo-fi" : "Play lo-fi";
        toggle.setAttribute("aria-pressed", String(active));
        toggle.setAttribute("aria-label", action);
        toggle.setAttribute("aria-busy", String(starting));
        toggle.title = adjustableVolume ? action : `${action}. Use your device's volume buttons to adjust.`;
        player.setAttribute("data-playing", String(active));
        volumeControl.hidden = !active || !adjustableVolume;
    };
    const cancelFade = () => {
        if (fadeFrame !== null) window.cancelAnimationFrame(fadeFrame);
        fadeFrame = null;
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
    const start = async () => {
        if (!wanted || starting || document.hidden) return;
        const token = ++request;
        cancelFade();
        setVolume(volume);
        failed = false;
        awaitingGesture = false;
        starting = true;
        status.textContent = "";
        update();
        save();
        try {
            await audio.play();
            if (token !== request) {
                if (!wanted || document.hidden) audio.pause();
                return;
            }
            starting = false;
            playing = true;
            update();
            save();
        } catch (error) {
            if (token !== request) return;
            starting = false;
            playing = false;
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
        const initialVolume = audio.volume;
        const fade = (now) => {
            const progress = Math.min(1, Math.max(0, (now - began) / 280));
            setVolume(initialVolume * (1 - progress) ** 2);
            if (progress < 1) fadeFrame = window.requestAnimationFrame(fade);
            else {
                fadeFrame = null;
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
        if (wanted && (playing || starting)) {
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
        if (fadeFrame === null) setVolume(volume);
        save();
    });
    audio.addEventListener("loadedmetadata", () => {
        if (!resumePosition || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
        try { audio.currentTime = resumePosition % audio.duration; } catch {}
        resumePosition = 0;
    });
    audio.addEventListener("playing", () => {
        if (!wanted || document.hidden) { audio.pause(); return; }
        awaitingGesture = false;
        playing = true;
        update();
    });
    audio.addEventListener("pause", () => {
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
    update();
    if (wanted) start();
})();
