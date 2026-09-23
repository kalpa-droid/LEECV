create or replace function public.get_ai_telemetry_stats()
returns table(total_cost numeric, total_tokens bigint) as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'No autorizado';
  end if;
  return query
    select
      coalesce(sum(estimated_cost_usd), 0)::numeric,
      coalesce(sum(prompt_tokens + completion_tokens), 0)::bigint
    from public.ai_usage_telemetry;
end;
$$ language plpgsql security definer;
