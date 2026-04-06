-- Optional cause number (open text), separate from claim_number / case_number.
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS cause_number text;
