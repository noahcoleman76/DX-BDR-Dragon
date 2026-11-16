create table public.bdr_workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{"version":1,"accounts":[],"contacts":[],"accountMessages":[],"contactMessages":[],"tasks":[],"ownerColors":{}}'::jsonb,
  revision bigint not null default 0,
  updated_at timestamptz not null default now()
);
create table public.bdr_workspace_mutations (
  user_id uuid not null references auth.users(id) on delete cascade,
  mutation_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, mutation_id)
);
alter table public.bdr_workspaces enable row level security;
alter table public.bdr_workspace_mutations enable row level security;
revoke all on public.bdr_workspaces, public.bdr_workspace_mutations from anon;
grant select, insert, update on public.bdr_workspaces to authenticated;
grant select, insert on public.bdr_workspace_mutations to authenticated;
create policy "Private workspace read" on public.bdr_workspaces for select to authenticated using ((select auth.uid()) = user_id);
create policy "Private workspace insert" on public.bdr_workspaces for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Private workspace update" on public.bdr_workspaces for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Private mutation read" on public.bdr_workspace_mutations for select to authenticated using ((select auth.uid()) = user_id);
create policy "Private mutation insert" on public.bdr_workspace_mutations for insert to authenticated with check ((select auth.uid()) = user_id);

create function public.bdr_apply_changes(mutation_id uuid, changes jsonb, expected_user_id uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  uid uuid := auth.uid();
  doc jsonb;
  rev bigint;
  op jsonb;
  collection text;
  rid text;
  row_data jsonb;
  child_ids text[];
begin
  if uid is null or uid is distinct from expected_user_id or auth.jwt()->>'is_anonymous' = 'true' then raise exception 'Sign in to save your workspace.'; end if;
  if jsonb_typeof(changes) <> 'object' or jsonb_typeof(coalesce(changes->'records','[]'::jsonb)) <> 'array' then raise exception 'Invalid changes.'; end if;
  insert into public.bdr_workspaces(user_id) values(uid) on conflict(user_id) do nothing;
  select w.data,w.revision into doc,rev from public.bdr_workspaces w where w.user_id=uid for update;
  if exists(select 1 from public.bdr_workspace_mutations m where m.user_id=uid and m.mutation_id=bdr_apply_changes.mutation_id) then
    return jsonb_build_object('data',doc,'revision',rev);
  end if;
  if changes->'fields' ? 'sdrName' then
    if jsonb_typeof(changes->'fields'->'sdrName') <> 'string' then raise exception 'Invalid SDR name.'; end if;
    doc := jsonb_set(doc,'{sdrName}',changes->'fields'->'sdrName');
  end if;
  if changes->'fields' ? 'ownerColors' then
    if jsonb_typeof(changes->'fields'->'ownerColors') <> 'object' then raise exception 'Invalid colors.'; end if;
    doc := jsonb_set(doc,'{ownerColors}',(doc->'ownerColors') || (changes->'fields'->'ownerColors'));
  end if;
  for op in select value from jsonb_array_elements(coalesce(changes->'records','[]'::jsonb)) loop
    collection := op->>'collection'; rid := op->>'id';
    if collection not in ('accounts','contacts','accountMessages','contactMessages','tasks') or rid is null or rid='' or op->>'kind' not in ('upsert','delete') then raise exception 'Invalid record change.'; end if;
    if op->>'kind' = 'delete' then
      if collection='accounts' then
        select coalesce(array_agg(c->>'id'),'{}'::text[]) into child_ids from jsonb_array_elements(doc->'contacts') c where c->>'accountId'=rid;
        doc := jsonb_set(doc,'{contacts}',(select coalesce(jsonb_agg(c),'[]'::jsonb) from jsonb_array_elements(doc->'contacts') c where c->>'accountId' is distinct from rid));
        doc := jsonb_set(doc,'{contactMessages}',(select coalesce(jsonb_agg(m),'[]'::jsonb) from jsonb_array_elements(doc->'contactMessages') m where not (coalesce(m->>'contactId','')=any(child_ids))));
        doc := jsonb_set(doc,'{accountMessages}',(select coalesce(jsonb_agg(m),'[]'::jsonb) from jsonb_array_elements(doc->'accountMessages') m where m->>'accountId' is distinct from rid));
        doc := jsonb_set(doc,'{tasks}',(select coalesce(jsonb_agg(case when t->>'accountId'=rid then t || '{"accountId":null}'::jsonb else t end),'[]'::jsonb) from jsonb_array_elements(doc->'tasks') t));
      elsif collection='contacts' then
        doc := jsonb_set(doc,'{contactMessages}',(select coalesce(jsonb_agg(m),'[]'::jsonb) from jsonb_array_elements(doc->'contactMessages') m where m->>'contactId' is distinct from rid));
      end if;
      doc := jsonb_set(doc,array[collection],(select coalesce(jsonb_agg(r),'[]'::jsonb) from jsonb_array_elements(doc->collection) r where r->>'id' is distinct from rid));
    else
      if jsonb_typeof(op->'patch') <> 'object' then raise exception 'Invalid record patch.'; end if;
      select value into row_data from jsonb_array_elements(doc->collection) where value->>'id'=rid;
      if row_data is null and not (op->'patch' ? 'createdAt') then continue; end if;
      row_data := coalesce(row_data,'{}'::jsonb) || (op->'patch') || jsonb_build_object('id',rid);
      if collection in ('accounts','contacts','tasks') and (jsonb_typeof(row_data->'name') <> 'string' or length(trim(row_data->>'name'))=0) then raise exception 'Name is required.'; end if;
      if row_data->>'createdAt' is null or row_data->>'updatedAt' is null then raise exception 'Record dates are required.'; end if;
      if collection='contacts' and not exists(select 1 from jsonb_array_elements(doc->'accounts') a where a->>'id'=row_data->>'accountId') then raise exception 'This account no longer exists. Refresh and try again.'; end if;
      if collection='accountMessages' and not exists(select 1 from jsonb_array_elements(doc->'accounts') a where a->>'id'=row_data->>'accountId') then raise exception 'This account no longer exists.'; end if;
      if collection='contactMessages' and not exists(select 1 from jsonb_array_elements(doc->'contacts') c where c->>'id'=row_data->>'contactId') then raise exception 'This contact no longer exists.'; end if;
      if collection='tasks' and row_data->>'accountId' is not null and not exists(select 1 from jsonb_array_elements(doc->'accounts') a where a->>'id'=row_data->>'accountId') then row_data := row_data || '{"accountId":null}'::jsonb; end if;
      doc := jsonb_set(doc,array[collection],(select coalesce(jsonb_agg(case when r->>'id'=rid then row_data else r end),'[]'::jsonb) from jsonb_array_elements(doc->collection) r));
      if not exists(select 1 from jsonb_array_elements(doc->collection) r where r->>'id'=rid) then doc := jsonb_set(doc,array[collection],jsonb_build_array(row_data) || (doc->collection)); end if;
    end if;
  end loop;
  update public.bdr_workspaces w set data=doc,revision=rev+1,updated_at=now() where w.user_id=uid;
  insert into public.bdr_workspace_mutations(user_id,mutation_id) values(uid,bdr_apply_changes.mutation_id);
  return jsonb_build_object('data',doc,'revision',rev+1);
end;
$$;
revoke all on function public.bdr_apply_changes(uuid,jsonb,uuid) from public,anon;
grant execute on function public.bdr_apply_changes(uuid,jsonb,uuid) to authenticated;
alter publication supabase_realtime add table public.bdr_workspaces;
