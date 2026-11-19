package com.gestion_deportiva.api.alert.service;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

// US-47 · Job diario que evalúa las alertas de todas las carteras. La hora (app.alerts.scheduler.cron) está en la
// zona de la app. Se apaga con app.alerts.scheduler.enabled=false
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "app.alerts.scheduler", name = "enabled", havingValue = "true", matchIfMissing = true)
public class AlertScheduler {

    private final AlertEvaluator alertEvaluator;

    @Scheduled(cron = "${app.alerts.scheduler.cron}", zone = "${app.time-zone}")
    public void evaluateAll() {
        alertEvaluator.evaluateAll();
    }
}
