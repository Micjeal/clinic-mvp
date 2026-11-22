drop view if exists public.public_clinician_directory;
create view public.public_clinician_directory as
select distinct
  cp.slug, cp.membership_id, cp.user_id, cp.display_name, cp.professional_title, cp.public_bio, cp.photo_path, cp.accepting_appointments,
  m.organization_id, d.id as department_id, d.name as department_name,
  s.id as service_id, s.name as service_name, s.duration_minutes as service_duration_minutes,
  f.id as facility_id, f.name as facility_name, f.city as facility_city
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
grant select on public.public_clinician_directory to anon, authenticated;

;
