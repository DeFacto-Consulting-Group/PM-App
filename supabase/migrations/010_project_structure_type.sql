-- Optional structure type selected on intake/edit forms.
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS structure_type text;

