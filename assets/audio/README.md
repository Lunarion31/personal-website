# Background music

`a-few-things-lofi.mp3` is an original instrumental composed and synthesized for
Jamie's portfolio. It uses no external recordings or third-party samples.

The 16-bar, 76 BPM loop combines electric-piano-style major/ninth chords, muted
bass, a sparse melody, and swung drums. It is deliberately mixed quietly and
downloads only after music is requested. No streaming service is involved.

The source is `scripts/render-lofi.py`. Regenerating it requires Python with
NumPy and ffmpeg; the deployed site only needs the included MP3.

To replace it, update the local source URL in each page's `#site-music` audio
element and document the replacement track's license here.
