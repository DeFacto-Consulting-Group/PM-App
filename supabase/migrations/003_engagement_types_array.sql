-- Optional multi-select engagement types (UI enforces Appraisal exclusivity).
-- Legacy rows: engagement_types IS NULL → treat as single engagement_type.
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS engagement_types engagement_type[] DEFAULT NULL;
