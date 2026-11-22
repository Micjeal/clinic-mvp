drop function if exists public.get_public_clinician_directory();

create or replace function private.get_public_clinician_directory_impl()
returns table (
  slug text, membership_id uuid, user_id uuid, display_name text, professional_title text, public_bio text, photo_path text,
  accepting_appointments boolean, organization_id uuid, department_id uuid, department_name text, service_id uuid,
  service_name text, service_duration_minutes integer, facility_id uuid, facility_name text, facility_city text
)
language sql stable security definer set search_path = public, private
as $$
  select distinct cp.slug, cp.membership_id, cp.user_id, cp.display_name, cp.professional_title, cp.public_bio, cp.photo_path, cp.accepting_appointments,
    m.organization_id, d.id, d.name, s.id, s.name, s.duration_minutes, f.id, f.name, f.city
  from public.clinician_profiles cp
  join public.staff_memberships m on m.id = cp.membership_id and m.is_active
  join public.roles r on r.id = m.role_id and r.role_key = 'doctor'
  join public.organizations o on o.id = m.organization_id and o.status = 'active'
  join public.staff_department_assignments sda on sda.membership_id = m.id
  join public.departments d on d.id = sda.department_id and d.is_active and d.is_public
  left join public.staff_service_assignments ssa on ssa.membership_id = m.id and ssa.is_active
  left join public.services s on s.id = ssa.service_id and s.is_active and s.is_public
  left join public.facilities f on f.id = coalesce(s.facility_id, m.primary_facility_id) and f.is_active and f.is_public
  where cp.is_public;
$$;
revoke all on function private.get_public_clinician_directory_impl() from public;
grant execute on function private.get_public_clinician_directory_impl() to anon, authenticated;

create or replace function public.get_public_clinician_directory()
returns table (
  slug text, membership_id uuid, user_id uuid, display_name text, professional_title text, public_bio text, photo_path text,
  accepting_appointments boolean, organization_id uuid, department_id uuid, department_name text, service_id uuid,
  service_name text, service_duration_minutes integer, facility_id uuid, facility_name text, facility_city text
)
language sql stable security invoker set search_path = public, private
as $$ select * from private.get_public_clinician_directory_impl(); $$;
revoke all on function public.get_public_clinician_directory() from public;
grant execute on function public.get_public_clinician_directory() to anon, authenticated;

;
