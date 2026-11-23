-- Reception flow fixes: allow front-desk check-in/walk-in encounter creation
-- and give clinicians visibility of the operational queue.

insert into public.role_permissions(role_id, permission_key)
select r.id, p.permission_key
from public.roles r
join public.permissions p on p.permission_key = 'encounter.create'
where r.role_key = 'receptionist'
on conflict do nothing;

insert into public.role_permissions(role_id, permission_key)
select r.id, p.permission_key
from public.roles r
join public.permissions p on p.permission_key in ('queue.read', 'queue.manage')
where r.role_key = 'doctor'
on conflict do nothing;
