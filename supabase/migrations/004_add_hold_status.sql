-- Replace "billing" with "hold" in data; app no longer uses project_status billing.
-- Enum value `billing` may remain on the type from older migrations.

ALTER TYPE project_status ADD VALUE 'hold';

UPDATE projects
SET status = 'hold'::project_status
WHERE status = 'billing'::project_status;
