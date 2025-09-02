-- supabase/rls_fixes.sql
-- Run in Supabase SQL editor if you still see 403 after pushing the client change.

-- TABLE: public.reports
alter table public.reports enable row level security;

drop policy if exists "read-own-reports" on public.reports;
create policy "read-own-reports"
on public.reports
for select
to authenticated
using (
  business_id in (
    select bp.id
    from public.business_profiles bp
    where bp.user_id = auth.uid()
  )
);

drop policy if exists "insert-own-reports" on public.reports;
create policy "insert-own-reports"
on public.reports
for insert
to authenticated
with check (
  business_id in (
    select bp.id
    from public.business_profiles bp
    where bp.user_id = auth.uid()
  )
);

-- STORAGE: storage.objects for bucket 'enrich-reports'
alter table storage.objects enable row level security;

-- Adjust path extraction if you use a different key format than "enrich-reports/{business_id}/..."
drop policy if exists "read-own-report-files" on storage.objects;
create policy "read-own-report-files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'enrich-reports'
  and exists (
    select 1
    from public.business_profiles bp
    where bp.user_id = auth.uid()
      and bp.id = split_part(name, '/', 1)
  )
);

drop policy if exists "insert-own-report-files" on storage.objects;
create policy "insert-own-report-files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'enrich-reports'
  and exists (
    select 1
    from public.business_profiles bp
    where bp.user_id = auth.uid()
      and bp.id = split_part(name, '/', 1)
  )
);
