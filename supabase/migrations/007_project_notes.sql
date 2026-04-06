-- Optional internal notes (may include @mention markup from app UI)
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS notes text;

COMMENT ON COLUMN projects.notes IS 'Optional internal notes with optional @mentions of users';
