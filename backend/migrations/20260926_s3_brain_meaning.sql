-- S3: meaning is persisted inside the canonical lifecycle JSONB.
-- No new table and no user-visible action is created by this migration.
-- The migration is intentionally a documentation/contract checkpoint: the
-- `meaning` object lives inside last_life_intention and therefore requires no
-- schema change beyond S2.1.1.
COMMENT ON COLUMN public.twin_internal_states.last_life_intention IS
  'Lifecycle evidence plus deterministic internal meaning (S3), never a direct action command';
