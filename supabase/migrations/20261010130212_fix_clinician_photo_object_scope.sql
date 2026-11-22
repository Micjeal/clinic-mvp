drop policy if exists clinician_photo_objects_staff_insert on public.clinician_photo_objects;
drop policy if exists clinician_photo_objects_staff_update on public.clinician_photo_objects;

create policy clinician_photo_objects_staff_insert
on public.clinician_photo_objects for insert to authenticated
with check (
  private.has_permission(clinician_photo_objects.organization_id, 'staff.manage')
  and exists (
    select 1
    from public.staff_memberships m
    where m.id = clinician_photo_objects.membership_id
      and m.organization_id = clinician_photo_objects.organization_id
      and m.is_active
  )
);

create policy clinician_photo_objects_staff_update
on public.clinician_photo_objects for update to authenticated
using (private.has_permission(clinician_photo_objects.organization_id, 'staff.manage'))
with check (
  private.has_permission(clinician_photo_objects.organization_id, 'staff.manage')
  and exists (
    select 1
    from public.staff_memberships m
    where m.id = clinician_photo_objects.membership_id
      and m.organization_id = clinician_photo_objects.organization_id
      and m.is_active
  )
);
