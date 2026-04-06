-- Optional second point of contact (intake + display)
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS point_of_contact_secondary text;

COMMENT ON COLUMN projects.point_of_contact_secondary IS 'Optional second client point of contact';
