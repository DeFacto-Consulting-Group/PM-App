-- Optional peril classification selected on intake/edit forms.
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS peril text;

