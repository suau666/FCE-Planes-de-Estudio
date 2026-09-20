-- Correr en Neon sólo si ya corriste schema.sql ANTES de que existiera
-- `progreso_plan` (la tabla del planificador de cuatrimestres).
--
-- Si corrés schema.sql de cero, este archivo no hace falta.

create table if not exists progreso_plan (
  usuario_id uuid not null references perfiles(id) on delete cascade,
  carrera_id text not null references carreras(id) on delete cascade,
  plan       jsonb not null default '{}'::jsonb,
  primary key (usuario_id, carrera_id)
);

alter table progreso_plan enable row level security;

drop policy if exists "cada uno su plan" on progreso_plan;
create policy "cada uno su plan" on progreso_plan
  for all to authenticated
  using (auth.user_id() = usuario_id::text) with check (auth.user_id() = usuario_id::text);

grant select, insert, update, delete on progreso_plan to authenticated;
