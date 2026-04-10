create or replace function public.create_erp_master_table(table_name text)
returns void
language plpgsql
as $$
begin
  execute format(
    'create table if not exists public.%I (
      id text primary key,
      record_code text,
      record_name text,
      status text,
      approval_status text,
      payload jsonb not null default ''{}''::jsonb,
      created_at timestamptz not null default timezone(''utc'', now()),
      updated_at timestamptz not null default timezone(''utc'', now())
    )',
    table_name
  );

  execute format('alter table public.%I enable row level security', table_name);

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = table_name
      and policyname = format('%s_select_anon', table_name)
  ) then
    execute format(
      'create policy "%s_select_anon"
       on public.%I
       for select
       to anon
       using (true)',
      table_name,
      table_name
    );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = table_name
      and policyname = format('%s_insert_anon', table_name)
  ) then
    execute format(
      'create policy "%s_insert_anon"
       on public.%I
       for insert
       to anon
       with check (true)',
      table_name,
      table_name
    );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = table_name
      and policyname = format('%s_update_anon', table_name)
  ) then
    execute format(
      'create policy "%s_update_anon"
       on public.%I
       for update
       to anon
       using (true)
       with check (true)',
      table_name,
      table_name
    );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = table_name
      and policyname = format('%s_delete_anon', table_name)
  ) then
    execute format(
      'create policy "%s_delete_anon"
       on public.%I
       for delete
       to anon
       using (true)',
      table_name,
      table_name
    );
  end if;
end;
$$;

select public.create_erp_master_table('erp_master_categories');
select public.create_erp_master_table('erp_master_colors');
select public.create_erp_master_table('erp_master_countries');
select public.create_erp_master_table('erp_master_states');
select public.create_erp_master_table('erp_master_departments');
select public.create_erp_master_table('erp_master_tax_codes');
select public.create_erp_master_table('erp_master_sizes');
select public.create_erp_master_table('erp_master_item_categories');
select public.create_erp_master_table('erp_master_vendor_payment_terms');
select public.create_erp_master_table('erp_master_products');
select public.create_erp_master_table('erp_master_skus');
select public.create_erp_master_table('erp_master_uoms');
select public.create_erp_master_table('erp_master_debit_note_reasons');
select public.create_erp_master_table('erp_master_cost_centres');
select public.create_erp_master_table('erp_master_profit_centres');
select public.create_erp_master_table('erp_master_employees');
select public.create_erp_master_table('erp_master_contracts');
select public.create_erp_master_table('erp_master_currencies');
select public.create_erp_master_table('erp_master_exchange_rates');

alter table public.entities
  add column if not exists legal_name text,
  add column if not exists tax_regime text;

alter table public.roles
  add column if not exists description text,
  add column if not exists approval_status text;

alter table public.users
  add column if not exists phone text,
  add column if not exists department text,
  add column if not exists approval_status text;
