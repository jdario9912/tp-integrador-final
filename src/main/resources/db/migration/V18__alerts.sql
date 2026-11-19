-- =====================================================================
-- V18 · Alertas automáticas y su atención (US-47)
-- Tablas: severities, alert_types, alerts
-- Los "code" de los catálogos deben coincidir con los enums AlertSeverity y AlertType
-- y los "id" son fijos (el converter guarda el id).
-- =====================================================================

-- =========== CATÁLOGOS ===========
-- sort_order: mayor = más grave (las críticas se listan primero)
CREATE TABLE severities (
    id         smallint    PRIMARY KEY,
    code       varchar(20) NOT NULL UNIQUE,
    name       varchar(50) NOT NULL,
    sort_order smallint    NOT NULL UNIQUE
);

INSERT INTO severities (id, code, name, sort_order) VALUES
    (1, 'INFO',     'Información', 1),
    (2, 'WARNING',  'Advertencia', 2),
    (3, 'CRITICAL', 'Crítica',     3);

-- threshold_days es la ventana que evalúa cada condición (null = no depende de días). message_template es el texto
-- que se guarda en alerts.message: {days} se reemplaza por threshold_days; {count} y {planned}, por las cantidades que correspondan
CREATE TABLE alert_types (
    id               smallint     PRIMARY KEY,
    code             varchar(30)  NOT NULL UNIQUE,
    severity_id      smallint     NOT NULL REFERENCES severities (id),
    name             varchar(50)  NOT NULL,
    message_template varchar(255) NOT NULL,
    threshold_days   smallint     CONSTRAINT ck_alert_types_threshold_days CHECK (threshold_days > 0)
);

INSERT INTO alert_types (id, code, severity_id, name, message_template, threshold_days) VALUES
    (1, 'INACTIVITY',     3, 'Inactividad',
        'No finalizó ningún entrenamiento en los últimos {days} días', 14),
    (2, 'NO_ROUTINE',     2, 'Sin rutina',
        'No tiene una rutina asignada y vigente', NULL),
    (3, 'LOW_COMPLIANCE', 2, 'Bajo cumplimiento',
        'Finalizó {count} de {planned} entrenamientos planificados en los últimos {days} días', 7),
    (4, 'NO_WEIGHT_LOG',  1, 'Sin registro de peso',
        'No registró su peso en los últimos {days} días', 7),
    (5, 'PENDING_REVIEW', 1, 'Sesiones sin revisar',
        'Tiene {count} sesiones finalizadas sin revisar', NULL);

-- =========== ALERTS ===========
-- Una alerta abierta (handled_at null) por atleta y tipo: la evaluación no la duplica mientras siga abierta.
-- handled_by es el entrenador que la atendió; se completan juntos. Sin ON DELETE CASCADE: bajas lógicas
CREATE TABLE alerts (
    id            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id    uuid         NOT NULL REFERENCES athletes (user_id),
    alert_type_id smallint     NOT NULL REFERENCES alert_types (id),
    handled_by    uuid         REFERENCES coaches (user_id),
    message       varchar(255) NOT NULL CONSTRAINT ck_alerts_message CHECK (btrim(message) <> ''),
    generated_at  timestamptz  NOT NULL DEFAULT now(),
    handled_at    timestamptz,
    CONSTRAINT ck_alerts_handled CHECK ((handled_at IS NULL) = (handled_by IS NULL)),
    CONSTRAINT ck_alerts_handled_after_generated CHECK (handled_at IS NULL OR handled_at >= generated_at)
);

-- Sin duplicados para la misma condición abierta, aunque dos evaluaciones corran a la vez
CREATE UNIQUE INDEX ux_alerts_athlete_type_open ON alerts (athlete_id, alert_type_id) WHERE handled_at IS NULL;
-- Historial por atleta; cubre también la FK
CREATE INDEX ix_alerts_athlete_generated ON alerts (athlete_id, generated_at);
CREATE INDEX ix_alerts_handled_by ON alerts (handled_by);
