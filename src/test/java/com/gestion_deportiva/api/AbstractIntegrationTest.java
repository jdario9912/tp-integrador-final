package com.gestion_deportiva.api;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.Transactional;

// Base de los tests de integración: PostgreSQL real (Testcontainers) + migraciones Flyway.
// Cada test corre en una transacción que se revierte al final: no quedan datos entre tests.
@SpringBootTest
@Import(TestcontainersConfiguration.class)
@Transactional
public abstract class AbstractIntegrationTest {
}
