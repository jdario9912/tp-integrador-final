package com.gestion_deportiva.api.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

// Email saliente (US-44). El JavaMailSender lo arma Spring Boot con spring.mail.*: en dev apunta a Mailpit
@Configuration
@EnableConfigurationProperties(PasswordResetProperties.class)
public class MailConfig {
}
