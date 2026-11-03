-- Exact row count of every table in every schema (the pg-boss schema included), one line each:
-- `<schema>.<table> <rows>`. Run with: psql -U moq -d moq -tA -F ' ' < table-counts.sql
select
  format('%I.%I', t.table_schema, t.table_name) as table_name,
  (
    xpath(
      '/row/n/text()',
      query_to_xml(format('select count(*) as n from %I.%I', t.table_schema, t.table_name), false, true, '')
    )
  )[1]::text::bigint as row_count
from information_schema.tables t
where t.table_type = 'BASE TABLE'
  and t.table_schema not in ('pg_catalog', 'information_schema')
order by t.table_schema, t.table_name;
