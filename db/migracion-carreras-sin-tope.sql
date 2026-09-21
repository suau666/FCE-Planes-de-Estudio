-- Correr en Neon si ya habías creado `perfil_carreras` con el tope de dos
-- carreras. Saca ese límite: se pueden cursar todas las que quieras, con la
-- primera como principal.
--
-- Si corrés schema.sql de cero, este archivo no hace falta.

alter table perfil_carreras drop constraint if exists perfil_carreras_orden_check;

alter table perfil_carreras
  add constraint perfil_carreras_orden_check check (orden >= 1);
