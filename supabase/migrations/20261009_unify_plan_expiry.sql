-- 1. Unify expiration dates
update public.profiles
set plan_vence = coalesce(plan_vence, premium_vence);

-- 2. Update trigger to remove references to premium_vence and premium_activo
create or replace function public.protect_privileged_columns()
returns trigger as $$
begin
  if public.is_admin(auth.uid()) then
    return new;
  end if;

  if new.role is distinct from old.role
     or new.plan is distinct from old.plan
     or new.plan_vence is distinct from old.plan_vence
     or new.metodo_pago is distinct from old.metodo_pago then
    raise exception 'No autorizado para modificar campos de rol o estado premium';
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- 3. Drop columns
alter table public.profiles
drop column if exists premium_vence,
drop column if exists premium_activo;

-- 4. Drop old duplicate function
drop function if exists public.downgrade_expired_plans();
