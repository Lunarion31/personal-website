-- One anonymous browser token per visitor; no IP addresses or account details.
CREATE TABLE IF NOT EXISTS visitors (
  number INTEGER PRIMARY KEY,
  token TEXT NOT NULL UNIQUE
);
