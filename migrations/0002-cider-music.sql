-- Separate from the existing visitor counter. No historical Last.fm data is replaced.
CREATE TABLE IF NOT EXISTS music_now_playing (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  track_json TEXT,
  playing INTEGER NOT NULL DEFAULT 0,
  position REAL NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS music_plays (
  play_id TEXT PRIMARY KEY,
  song_id TEXT NOT NULL,
  name TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT NOT NULL,
  image TEXT NOT NULL,
  url TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  listened REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS music_plays_started ON music_plays(started_at);
