package com.gestion_deportiva.api.alert.repository;

// Fila de alert_types: thresholdDays es null en los tipos que no dependen de una ventana de días
public interface AlertTypeRule {

    String getCode();

    Short getThresholdDays();

    String getMessageTemplate();
}
