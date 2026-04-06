-- Allow additional Side (client_type) values: Carrier, Owner/Insured, N/A, Other.

ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_client_type_check;

ALTER TABLE projects ADD CONSTRAINT projects_client_type_check
  CHECK (
    client_type IN (
      'defense',
      'plaintiff',
      'carrier',
      'owner_insured',
      'na',
      'other'
    )
  );
