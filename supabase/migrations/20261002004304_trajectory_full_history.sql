-- Use the requester's complete continuous, comparable history.
-- Keep permissions, anonymous output, and designated test scope unchanged.
do $migration$
declare definition text;
begin
  definition := pg_get_functiondef('public.score_tracker_trajectory_match(uuid,text[],text,text)'::regprocedure);
  if strpos(definition,'while i>0 and cardinality(target)<6 loop') > 0 then
    definition := replace(definition,'while i>0 and cardinality(target)<6 loop','while i>0 loop');
    execute definition;
  elsif strpos(definition,'while i>0 loop') = 0 then
    raise exception 'Unexpected trajectory matching implementation';
  end if;
end;
$migration$;
