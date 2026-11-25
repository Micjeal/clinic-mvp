-- Fix replace_clinician_profile: jsonb_to_recordset + WITH ORDINALITY +
-- column definition list is invalid in Postgres; use jsonb_array_elements.

create or replace function public.replace_clinician_profile(
  p_membership_id uuid,
  p_slug text,
  p_display_name text,
  p_professional_title text,
  p_public_bio text,
  p_photo_path text,
  p_years_experience integer,
  p_experience_summary text,
  p_languages text[],
  p_specializations jsonb,
  p_qualifications jsonb,
  p_achievements jsonb
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_organization_id uuid;
  v_user_id uuid;
  v_count integer;
begin
  if jsonb_typeof(p_specializations) <> 'array'
    or jsonb_typeof(p_qualifications) <> 'array'
    or jsonb_typeof(p_achievements) <> 'array' then
    raise exception 'Profile collections must be arrays.';
  end if;

  select m.organization_id, m.user_id into v_organization_id, v_user_id
  from public.staff_memberships m
  join public.roles r on r.id = m.role_id and r.role_key = 'doctor'
  where m.id = p_membership_id
    and private.has_permission(m.organization_id, 'staff.manage');

  if v_organization_id is null then
    raise exception 'Doctor account is not available.';
  end if;
  if nullif(trim(p_display_name), '') is null or nullif(trim(p_professional_title), '') is null then
    raise exception 'Display name and professional title are required.';
  end if;
  if p_years_experience is not null and p_years_experience not between 0 and 100 then
    raise exception 'Years of experience is invalid.';
  end if;
  if p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'Clinician slug is invalid.';
  end if;
  if p_photo_path is not null and not exists (
    select 1
    from public.clinician_photo_objects photo
    where photo.object_path = p_photo_path
      and photo.organization_id = v_organization_id
      and photo.membership_id = p_membership_id
  ) then
    raise exception 'Clinician photo is not registered for this Doctor.';
  end if;

  insert into public.clinician_profiles (
    membership_id, user_id, slug, display_name, professional_title,
    public_bio, photo_path, years_experience, experience_summary, languages
  ) values (
    p_membership_id, v_user_id, p_slug, trim(p_display_name), trim(p_professional_title),
    nullif(trim(p_public_bio), ''), p_photo_path, p_years_experience,
    nullif(trim(p_experience_summary), ''), coalesce(p_languages, array[]::text[])
  )
  on conflict (membership_id) do update set
    slug = coalesce(public.clinician_profiles.slug, excluded.slug),
    display_name = excluded.display_name,
    professional_title = excluded.professional_title,
    public_bio = excluded.public_bio,
    photo_path = excluded.photo_path,
    years_experience = excluded.years_experience,
    experience_summary = excluded.experience_summary,
    languages = excluded.languages,
    updated_at = now();

  delete from public.clinician_specializations where membership_id = p_membership_id;
  insert into public.clinician_specializations (
    membership_id, organization_id, name, description, sort_order
  )
  select p_membership_id, v_organization_id, trim(t.item->>'name'), nullif(trim(t.item->>'description'), ''), t.ordinality - 1
  from jsonb_array_elements(p_specializations) with ordinality as t(item, ordinality);
  get diagnostics v_count = row_count;
  if v_count <> jsonb_array_length(p_specializations) then
    raise exception 'Specialization replacement count mismatch.';
  end if;

  delete from public.clinician_qualifications where membership_id = p_membership_id;
  insert into public.clinician_qualifications (
    membership_id, organization_id, qualification_type, qualification,
    institution, country, year, sort_order
  )
  select p_membership_id, v_organization_id, t.item->>'qualification_type',
    trim(t.item->>'qualification'), trim(t.item->>'institution'), nullif(trim(t.item->>'country'), ''),
    nullif(t.item->>'year','')::integer, t.ordinality - 1
  from jsonb_array_elements(p_qualifications) with ordinality as t(item, ordinality);
  get diagnostics v_count = row_count;
  if v_count <> jsonb_array_length(p_qualifications) then
    raise exception 'Qualification replacement count mismatch.';
  end if;

  delete from public.clinician_achievements where membership_id = p_membership_id;
  insert into public.clinician_achievements (
    membership_id, organization_id, title, description, year, sort_order
  )
  select p_membership_id, v_organization_id, trim(t.item->>'title'),
    nullif(trim(t.item->>'description'), ''), nullif(t.item->>'year','')::integer, t.ordinality - 1
  from jsonb_array_elements(p_achievements) with ordinality as t(item, ordinality);
  get diagnostics v_count = row_count;
  if v_count <> jsonb_array_length(p_achievements) then
    raise exception 'Achievement replacement count mismatch.';
  end if;

  return p_photo_path;
end;
$$;

