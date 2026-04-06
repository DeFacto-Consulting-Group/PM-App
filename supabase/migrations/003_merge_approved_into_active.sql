-- Merge legacy project_status "approved" into "active" (same business meaning in app).
-- Enum value `approved` may remain on the type for old DBs; application code uses `active` only.

UPDATE projects
SET status = 'active'::project_status
WHERE status = 'approved'::project_status;
