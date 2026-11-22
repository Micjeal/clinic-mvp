-- Keep the GiST operator classes required by clinician overlap protection
-- outside the exposed public schema.
create schema if not exists extensions;
alter extension btree_gist set schema extensions;

;
