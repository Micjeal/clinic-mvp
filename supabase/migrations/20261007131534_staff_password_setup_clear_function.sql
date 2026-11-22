create or replace function public.clear_staff_password_setup(p_membership_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.staff_memberships
  set must_change_password = false,
      updated_at = now()
  where id = p_membership_id
    and user_id = auth.uid()
    and is_active = true
    and must_change_password = true;
  return found;
end;
$$;
revoke all on function public.clear_staff_password_setup(uuid) from public;
grant execute on function public.clear_staff_password_setup(uuid) to authenticated;;
