-- Esquema para Neon, con Neon Auth (Better Auth administrado) y Data API.
--
-- Antes de correrlo, en la consola de Neon: activar Auth y Data API. Eso crea
-- el esquema `neon_auth` (usuarios), la función `auth.user_id()` y los roles
-- `authenticated` y `anonymous` que usa este archivo.
--
-- Idea general: el progreso se guarda por CÓDIGO de materia, no por carrera.
-- Es como ya funciona la app: aprobar 241 vale para las 5 carreras. Por eso
-- `progreso` no tiene carrera_id — la carrera del usuario está en `perfiles`.
--
-- Orden: correr este archivo y después db/seed.sql (npm run db:seed lo genera).
-- El navegador habla directo con el Data API; el RLS de abajo es lo único que
-- separa el progreso de cada uno, así que no hay backend propio.

-- ── Catálogo (lo carga el seed, es igual para todos) ────────────────────────

create table if not exists carreras (
  id         text primary key,          -- 'actuario', 'administracion', ...
  nombre     text not null,
  titulo     text not null,
  orden      int  not null,
  optativas  int  not null default 0    -- cuántas optativas pide el plan
);

create table if not exists materias (
  codigo int primary key,               -- código de la FCE, global
  nombre text not null
);

create table if not exists carrera_materias (
  carrera_id     text not null references carreras(id) on delete cascade,
  codigo         int  not null references materias(codigo) on delete cascade,
  tramo          int  not null,         -- 1, 2 (previos) o 3 (ciclo profesional)
  col            int,                   -- posición en la grilla del ciclo
  fila           int,
  nombre_en_plan text not null,         -- cómo la llama este plan
  primary key (carrera_id, codigo)
);

create table if not exists correlativas (
  carrera_id      text not null references carreras(id) on delete cascade,
  codigo          int  not null,
  requiere_codigo int  not null,
  primary key (carrera_id, codigo, requiere_codigo),
  foreign key (carrera_id, codigo)          references carrera_materias(carrera_id, codigo) on delete cascade,
  foreign key (carrera_id, requiere_codigo) references carrera_materias(carrera_id, codigo) on delete cascade
);

-- ── Usuarios ────────────────────────────────────────────────────────────────
-- `perfiles.id` es el id del usuario de Neon Auth (uuid en neon_auth."user").
-- `auth.user_id()` devuelve ese mismo id como texto, de ahí los ::text abajo.

create table if not exists perfiles (
  id         uuid primary key references neon_auth."user"(id) on delete cascade,
  carrera_id text references carreras(id),
  tema       text not null default 'dark',
  creado_en  timestamptz not null default now()
);

-- Sólo se guarda lo que el usuario marcó. Pendiente y "puedo cursar" se
-- calculan con las correlativas, no se guardan.
create table if not exists progreso (
  usuario_id    uuid not null references perfiles(id) on delete cascade,
  codigo        int  not null references materias(codigo),
  estado        text not null check (estado in ('regular', 'aprobada')),
  actualizado   timestamptz not null default now(),
  primary key (usuario_id, codigo)
);

-- Las optativas son propias de cada carrera y el nombre lo escribe el usuario.
create table if not exists progreso_optativas (
  usuario_id uuid not null references perfiles(id) on delete cascade,
  carrera_id text not null references carreras(id) on delete cascade,
  slot       text not null,             -- 'opt1', 'opt2', ...
  nombre     text,
  estado     text check (estado in ('regular', 'aprobada')),
  primary key (usuario_id, carrera_id, slot)
);

create index if not exists progreso_codigo_idx on progreso (codigo);
create index if not exists perfiles_carrera_idx on perfiles (carrera_id);

-- ── Permisos ────────────────────────────────────────────────────────────────
-- Cada uno ve y escribe lo suyo. El catálogo lo lee cualquiera.

alter table perfiles           enable row level security;
alter table progreso           enable row level security;
alter table progreso_optativas enable row level security;

create policy "cada uno su perfil" on perfiles
  for all to authenticated
  using (auth.user_id() = id::text) with check (auth.user_id() = id::text);

create policy "cada uno su progreso" on progreso
  for all to authenticated
  using (auth.user_id() = usuario_id::text) with check (auth.user_id() = usuario_id::text);

create policy "cada uno sus optativas" on progreso_optativas
  for all to authenticated
  using (auth.user_id() = usuario_id::text) with check (auth.user_id() = usuario_id::text);

alter table carreras         enable row level security;
alter table materias         enable row level security;
alter table carrera_materias enable row level security;
alter table correlativas     enable row level security;

create policy "catálogo público" on carreras         for select using (true);
create policy "catálogo público" on materias         for select using (true);
create policy "catálogo público" on carrera_materias for select using (true);
create policy "catálogo público" on correlativas     for select using (true);

-- El Data API además necesita los grants: el RLS filtra filas, el grant
-- habilita la tabla.
grant usage on schema public to anonymous, authenticated;
grant select on carreras, materias, carrera_materias, correlativas
  to anonymous, authenticated;
grant select, insert, update, delete on perfiles, progreso, progreso_optativas
  to authenticated;

-- ── Estadísticas ────────────────────────────────────────────────────────────
-- Las vistas salen agregadas: nadie ve el progreso de otro, sólo los totales.
-- `security_invoker = off` hace que corran con los permisos del dueño de la
-- vista (el dueño de las tablas, que no pasa por RLS), salteando el RLS de
-- `progreso` a propósito. Correr el archivo con el rol dueño (neondb_owner).

create or replace view estadisticas_carreras
with (security_invoker = off) as
select
  c.id as carrera_id,
  c.titulo,
  count(distinct p.id)                                    as inscriptos,
  count(distinct cm.codigo)                               as materias_del_plan,
  round(avg(u.aprobadas)::numeric, 1)                     as aprobadas_promedio,
  round(100 * avg(u.aprobadas) / nullif(count(distinct cm.codigo), 0), 1)
                                                          as porcentaje_aprobado
from carreras c
left join perfiles p on p.carrera_id = c.id
left join carrera_materias cm on cm.carrera_id = c.id
left join lateral (
  select count(*) as aprobadas
  from progreso pr
  join carrera_materias cm2 on cm2.codigo = pr.codigo and cm2.carrera_id = c.id
  where pr.usuario_id = p.id and pr.estado = 'aprobada'
) u on true
group by c.id, c.titulo, c.orden
order by c.orden;

create or replace view estadisticas_materias
with (security_invoker = off) as
select
  m.codigo,
  m.nombre,
  count(distinct cm.carrera_id)                           as carreras_que_la_tienen,
  count(distinct p.id)                                    as la_cursan,
  count(*) filter (where pr.estado = 'aprobada')          as aprobaron,
  count(*) filter (where pr.estado = 'regular')           as regularizaron,
  round(100.0 * count(*) filter (where pr.estado = 'aprobada')
        / nullif(count(distinct p.id), 0), 1)             as porcentaje_aprobado
from materias m
join carrera_materias cm on cm.codigo = m.codigo
left join perfiles p on p.carrera_id = cm.carrera_id
left join progreso pr on pr.usuario_id = p.id and pr.codigo = m.codigo
group by m.codigo, m.nombre
order by porcentaje_aprobado nulls last;

grant select on estadisticas_carreras, estadisticas_materias to anonymous, authenticated;
