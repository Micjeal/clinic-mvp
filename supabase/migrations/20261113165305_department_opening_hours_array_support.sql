-- The app slot engine accepts opening_hours values as either a compact string
-- ("08:00-12:00,14:00-17:00") or an array of windows, but the database check only
-- read a single string and silently treated arrays as "closed". Accept both forms
-- (and full weekday names / numeric keys) so app and database agree.

create or replace function private.department_open_at(
  target_department_id uuid,
  local_start timestamp,
  local_end timestamp
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_hours jsonb;
  v_value jsonb;
  v_dow integer;
  v_key text;
  v_entry text;
  v_part text;
  v_starts time;
  v_ends time;
begin
  if local_end <= local_start then
    return false;
  end if;

  select d.opening_hours into v_hours
  from public.departments d
  where d.id = target_department_id;

  -- Unconfigured hours mean "no restriction" rather than "always closed".
  if v_hours is null or v_hours = '{}'::jsonb then
    return true;
  end if;

  v_dow := extract(dow from local_start)::integer;
  v_key := (array['sun','mon','tue','wed','thu','fri','sat'])[v_dow + 1];
  v_value := coalesce(
    v_hours -> v_key,
    v_hours -> (array['sunday','monday','tuesday','wednesday','thursday','friday','saturday'])[v_dow + 1],
    v_hours -> v_dow::text
  );

  -- A configured object without this weekday means the department is closed.
  if v_value is null then
    return false;
  end if;

  if jsonb_typeof(v_value) = 'array' then
    for v_entry in select jsonb_array_elements_text(v_value) loop
      for v_part in select regexp_split_to_table(v_entry, ',') loop
        begin
          v_starts := nullif(btrim(split_part(v_part, '-', 1)), '')::time;
          v_ends := nullif(btrim(split_part(v_part, '-', 2)), '')::time;
        exception when others then
          continue;
        end;
        if v_starts is not null and v_ends is not null
          and local_start::time >= v_starts
          and local_end::time <= v_ends then
          return true;
        end if;
      end loop;
    end loop;
    return false;
  end if;

  if jsonb_typeof(v_value) <> 'string' then
    return false;
  end if;

  for v_part in select regexp_split_to_table(v_value #>> '{}', ',') loop
    begin
      v_starts := nullif(btrim(split_part(v_part, '-', 1)), '')::time;
      v_ends := nullif(btrim(split_part(v_part, '-', 2)), '')::time;
    exception when others then
      continue;
    end;
    if v_starts is not null and v_ends is not null
      and local_start::time >= v_starts
      and local_end::time <= v_ends then
      return true;
    end if;
  end loop;

  return false;
end;
$function$;
