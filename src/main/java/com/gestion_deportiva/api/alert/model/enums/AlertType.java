package com.gestion_deportiva.api.alert.model.enums;

import com.gestion_deportiva.api.common.catalog.CatalogEnum;

// Catálogo alert_types (US-47): la condición que genera la alerta y su severidad (severity_id de la V18). El umbral
// en días y el texto del mensaje se leen de la tabla (AlertRepository.findTypeRules), así se ajustan sin tocar código
public enum AlertType implements CatalogEnum {

    INACTIVITY(1, AlertSeverity.CRITICAL),
    NO_ROUTINE(2, AlertSeverity.WARNING),
    LOW_COMPLIANCE(3, AlertSeverity.WARNING),
    NO_WEIGHT_LOG(4, AlertSeverity.INFO),
    PENDING_REVIEW(5, AlertSeverity.INFO);

    private final short id;
    private final AlertSeverity severity;

    AlertType(int id, AlertSeverity severity) {
        this.id = (short) id;
        this.severity = severity;
    }

    @Override
    public short getId() {
        return id;
    }

    public AlertSeverity getSeverity() {
        return severity;
    }

    public static AlertType fromId(short id) {
        return CatalogEnum.fromId(AlertType.class, id);
    }
}
