package com.gestion_deportiva.api.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.core.env.PropertySource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.util.unit.DataSize;

import java.io.IOException;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

// Prueba de arranque del tope multipart (US-28): lee el application.yaml real, sin levantar la app ni Docker, y
// verifica que la política por imagen entre en el tope del contenedor. Si alguien sube uno de los dos valores, falla
class ApplicationYamlUploadLimitsTest {

    @Test
    void shouldShipAContainerLimitThatAllowsTheDefaultPolicy() throws IOException {
        MockEnvironment environment = new MockEnvironment();
        List<PropertySource<?>> sources = new YamlPropertySourceLoader()
                .load("application", new ClassPathResource("application.yaml"));
        sources.forEach(environment.getPropertySources()::addLast);

        DataSize containerFile = Binder.get(environment)
                .bind("spring.servlet.multipart.max-file-size", DataSize.class).get();
        DataSize containerRequest = Binder.get(environment)
                .bind("spring.servlet.multipart.max-request-size", DataSize.class).get();
        UploadProperties uploads = Binder.get(environment).bind("app.uploads", UploadProperties.class).get();

        assertEquals(DataSize.ofMegabytes(6), containerFile);
        assertEquals(DataSize.ofMegabytes(7), containerRequest);
        assertEquals(DataSize.ofMegabytes(5), uploads.maxImageSize());
        assertDoesNotThrow(() -> new UploadConfig(uploads, environment));
    }
}
