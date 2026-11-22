grant usage on schema private to anon, authenticated;
grant execute on function private.get_public_clinician_directory_impl() to anon, authenticated;
notify pgrst, 'reload schema';

;
