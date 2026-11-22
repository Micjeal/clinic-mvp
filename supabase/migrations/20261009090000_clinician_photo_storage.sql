insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'clinician-photos',
  'clinician-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists clinician_photos_staff_select on storage.objects;
drop policy if exists clinician_photos_staff_insert on storage.objects;
drop policy if exists clinician_photos_staff_update on storage.objects;
drop policy if exists clinician_photos_staff_delete on storage.objects;
create policy clinician_photos_staff_select
on storage.objects for select to authenticated
using (
  bucket_id = 'clinician-photos'
  and exists (
    select 1
    from public.staff_memberships doctor
    where doctor.organization_id::text = (storage.foldername(name))[1]
      and doctor.id::text = (storage.foldername(name))[2]
      and private.has_permission(doctor.organization_id, 'staff.manage')
  )
);
create policy clinician_photos_staff_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'clinician-photos'
  and exists (
    select 1
    from public.staff_memberships doctor
    where doctor.organization_id::text = (storage.foldername(name))[1]
      and doctor.id::text = (storage.foldername(name))[2]
      and doctor.is_active
      and private.has_permission(doctor.organization_id, 'staff.manage')
  )
);
create policy clinician_photos_staff_update
on storage.objects for update to authenticated
using (
  bucket_id = 'clinician-photos'
  and exists (
    select 1
    from public.staff_memberships doctor
    where doctor.organization_id::text = (storage.foldername(name))[1]
      and doctor.id::text = (storage.foldername(name))[2]
      and private.has_permission(doctor.organization_id, 'staff.manage')
  )
)
with check (
  bucket_id = 'clinician-photos'
  and exists (
    select 1
    from public.staff_memberships doctor
    where doctor.organization_id::text = (storage.foldername(name))[1]
      and doctor.id::text = (storage.foldername(name))[2]
      and private.has_permission(doctor.organization_id, 'staff.manage')
  )
);
create policy clinician_photos_staff_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'clinician-photos'
  and exists (
    select 1
    from public.staff_memberships doctor
    where doctor.organization_id::text = (storage.foldername(name))[1]
      and doctor.id::text = (storage.foldername(name))[2]
      and private.has_permission(doctor.organization_id, 'staff.manage')
  )
);
