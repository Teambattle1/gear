-- GEAR: anonyme RPC'er til RLS-lockdown på MAIN (IKKE anvendt — kør manuelt efter review).
--
-- /teambox (instruktør-hub på TeamBox-tablets) bruges uden login. Hubbens eneste
-- database-skrivning er fejlrapporter i fejlsogning_reports. Efter lockdown må anon
-- ikke skrive direkte i tabellen, så rapporten går gennem denne funktion, som kun
-- kan oprette én TeamBox-rapport ad gangen (faste activity/reported_by-felter,
-- længdebegrænsede tekster). Den kan ikke læse, rette eller slette rapporter.

create or replace function public.gear_submit_teambox_report(
  p_activity_name text,
  p_date date,
  p_gear text,
  p_description text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if coalesce(btrim(p_gear), '') = '' or coalesce(btrim(p_description), '') = '' then
    raise exception 'gear and description are required' using errcode = '22023';
  end if;
  if p_activity_name not in ('TeamBox', 'TeamBox - Nulstilling') then
    raise exception 'unsupported activity_name' using errcode = '22023';
  end if;

  insert into public.fejlsogning_reports
    (activity, activity_name, date, gear, description, reported_by, reported_by_name, created_at)
  values
    ('teambox', p_activity_name, coalesce(p_date, current_date),
     left(p_gear, 200), left(p_description, 5000), 'gear', 'GEAR', now());
end;
$$;

revoke all on function public.gear_submit_teambox_report(text, date, text, text) from public;
grant execute on function public.gear_submit_teambox_report(text, date, text, text) to anon, authenticated;

comment on function public.gear_submit_teambox_report(text, date, text, text) is
  'GEAR /teambox: insert one TeamBox fault report into fejlsogning_reports. Anonymous by design (TeamBox tablets).';
