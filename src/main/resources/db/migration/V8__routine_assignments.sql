-- =====================================================================
-- V8 · Asignación de rutinas a atletas (US-16)
-- Tablas: routine_assignments
-- Las columnas siguen el UML (RoutineAssignment): id, assignmentDate, active.
-- =====================================================================

-- =========== ROUTINE_ASSIGNMENTS ===========
-- Historial de rutinas del atleta: una sola activa a la vez; al reemplazarla, la anterior queda con active = false.
-- No se borran: son el historial
CREATE TABLE routine_assignments (
    id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id      uuid    NOT NULL REFERENCES athletes (user_id),
    routine_id      uuid    NOT NULL REFERENCES routines (id),
    assignment_date date    NOT NULL,
    active          boolean NOT NULL DEFAULT true
);

-- Una sola asignación activa por atleta, aunque dos asignaciones lleguen en paralelo
CREATE UNIQUE INDEX ux_routine_assignments_athlete_active ON routine_assignments (athlete_id) WHERE active;

-- Historial del atleta: primero la activa y después de la más reciente a la más antigua
CREATE INDEX ix_routine_assignments_athlete ON routine_assignments (athlete_id, active, assignment_date);

-- Consultas por rutina (por ejemplo, saber a qué atletas está asignada)
CREATE INDEX ix_routine_assignments_routine ON routine_assignments (routine_id);
