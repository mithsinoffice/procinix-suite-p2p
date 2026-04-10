create table if not exists public.erp_document_store (
  domain text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.erp_document_store enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'erp_document_store'
      and policyname = 'anon can read erp document store'
  ) then
    create policy "anon can read erp document store"
    on public.erp_document_store
    for select
    to anon
    using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'erp_document_store'
      and policyname = 'anon can upsert erp document store'
  ) then
    create policy "anon can upsert erp document store"
    on public.erp_document_store
    for insert
    to anon
    with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'erp_document_store'
      and policyname = 'anon can update erp document store'
  ) then
    create policy "anon can update erp document store"
    on public.erp_document_store
    for update
    to anon
    using (true)
    with check (true);
  end if;
end
$$;
