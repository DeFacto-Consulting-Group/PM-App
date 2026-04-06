-- "Other Parties" (name/role/standing/notes) stored as JSONB array
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS other_parties jsonb NOT NULL DEFAULT '[]'::jsonb;

