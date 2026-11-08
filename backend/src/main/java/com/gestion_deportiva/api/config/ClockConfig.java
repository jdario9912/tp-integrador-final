package com.gestion_deportiva.api.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;

// Reloj inyectable: en los tests se reemplaza por uno fijo para controlar vencimientos.
// El reloj es UTC; la fecha de "hoy" se calcula en la zona de la app (TimeZoneProperties, app.time-zone)
@Configuration
@EnableConfigurationProperties(TimeZoneProperties.class)
public class ClockConfig {

    @Bean
    public Clock clock() {
        return Clock.systemUTC();
    }
}
