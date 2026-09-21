-- Correr en Neon si ya tenías el esquema de antes: agrega la tabla con la
-- carrera (o dos) que estudia cada uno, y rehace las vistas para que los
-- "inscriptos" salgan de ahí.
--
-- Si corrés schema.sql de cero, este archivo no hace falta.

create table if not exists perfil_carreras (
  usuario_id uuid not null references perfiles(id) on delete cascade,
  carrera_id text not null references carreras(id) on delete cascade,
  orden      int  not null default 1 check (orden >= 1),
  primary key (usuario_id, carrera_id)
);

create unique index if not exists perfil_carreras_orden_idx
  on perfil_carreras (usuario_id, orden);

alter table perfil_carreras enable row level security;

drop policy if exists "cada uno sus carreras" on perfil_carreras;
create policy "cada uno sus carreras" on perfil_carreras
  for all to authenticated
  using (auth.user_id() = usuario_id::text) with check (auth.user_id() = usuario_id::text);

grant select, insert, update, delete on perfil_carreras to authenticated;

-- Las cuentas que ya existían: su carrera pasa a ser la principal.
insert into perfil_carreras (usuario_id, carrera_id, orden)
select id, carrera_id, 1 from perfiles where carrera_id is not null
on conflict (usuario_id, carrera_id) do nothing;

-- ── Vistas ──────────────────────────────────────────────────────────────────

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
left join perfil_carreras pc on pc.carrera_id = c.id
left join perfiles p on p.id = pc.usuario_id
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
left join perfil_carreras pc on pc.carrera_id = cm.carrera_id
left join perfiles p on p.id = pc.usuario_id
left join progreso pr on pr.usuario_id = p.id and pr.codigo = m.codigo
group by m.codigo, m.nombre
order by porcentaje_aprobado nulls last;

grant select on estadisticas_carreras, estadisticas_materias to anonymous, authenticated;
