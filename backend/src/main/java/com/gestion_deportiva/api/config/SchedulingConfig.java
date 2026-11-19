package com.gestion_deportiva.api.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

// Habilita los @Scheduled de la app (US-47: evaluación diaria de alertas, AlertScheduler)
@Configuration
@EnableScheduling
public class SchedulingConfig {
}
