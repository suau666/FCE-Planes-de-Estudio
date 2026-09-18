-- Las preguntas que queremos poder responder. Se corren tal cual en el editor
-- SQL de Neon.

-- ── Cuánta gente hay en cada carrera ────────────────────────────────────────
select titulo, inscriptos
from estadisticas_carreras
order by inscriptos desc;

-- ── En qué carrera hay más porcentaje aprobado ──────────────────────────────
-- Promedio de materias aprobadas por persona sobre el total del plan.
select titulo, inscriptos, aprobadas_promedio, materias_del_plan, porcentaje_aprobado
from estadisticas_carreras
where inscriptos > 0
order by porcentaje_aprobado desc;

-- ── Qué materia es la menos aprobada ────────────────────────────────────────
-- Sobre la gente que la tiene en su plan. Se piden al menos 5 para que una
-- materia con 1 sola persona no encabece la lista.
select codigo, nombre, la_cursan, aprobaron, porcentaje_aprobado
from estadisticas_materias
where la_cursan >= 5
order by porcentaje_aprobado asc
limit 20;

-- ── La menos aprobada dentro de una carrera ─────────────────────────────────
select m.codigo, cm.nombre_en_plan,
       count(*) filter (where pr.estado = 'aprobada') as aprobaron,
       count(distinct p.id)                           as la_cursan
from carrera_materias cm
join materias m on m.codigo = cm.codigo
left join perfiles p  on p.carrera_id = cm.carrera_id
left join progreso pr on pr.usuario_id = p.id and pr.codigo = cm.codigo
where cm.carrera_id = 'actuario'
group by m.codigo, cm.nombre_en_plan
order by aprobaron asc;

-- ── Dónde se traba la gente: materias regularizadas pero no aprobadas ───────
-- Las "finales colgados", que suelen ser el cuello de botella real.
select m.codigo, m.nombre,
       count(*) filter (where pr.estado = 'regular')  as colgadas,
       count(*) filter (where pr.estado = 'aprobada') as aprobadas
from materias m
join progreso pr on pr.codigo = m.codigo
group by m.codigo, m.nombre
having count(*) filter (where pr.estado = 'regular') > 0
order by colgadas desc
limit 20;

-- ── Materias compartidas: cuántas carreras las cursan ───────────────────────
select codigo, nombre, carreras_que_la_tienen, la_cursan
from estadisticas_materias
where carreras_que_la_tienen > 1
order by carreras_que_la_tienen desc, la_cursan desc;
