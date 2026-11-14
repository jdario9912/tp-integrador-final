package com.gestion_deportiva.api.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.util.unit.DataSize;

// Habilita UploadProperties y verifica al arrancar que la política por imagen entre en el tope del contenedor.
// Si la política fuera mayor, el contenedor cortaría antes (413 sin el texto de la política): la app no arranca
@Configuration
@EnableConfigurationProperties(UploadProperties.class)
public class UploadConfig {

    // Mismo nombre y valor por defecto que usa Spring Boot para el tope por archivo
    static final String CONTAINER_MAX_FILE_SIZE_PROPERTY = "spring.servlet.multipart.max-file-size";
    static final DataSize CONTAINER_MAX_FILE_SIZE_DEFAULT = DataSize.ofMegabytes(1);

    public UploadConfig(UploadProperties uploadProperties, Environment environment) {
        DataSize containerMaxFileSize = Binder.get(environment)
                .bind(CONTAINER_MAX_FILE_SIZE_PROPERTY, DataSize.class)
                .orElse(CONTAINER_MAX_FILE_SIZE_DEFAULT);
        if (uploadProperties.maxImageSize().compareTo(containerMaxFileSize) > 0) {
            throw new IllegalStateException("app.uploads.max-image-size (UPLOAD_MAX_IMAGE_SIZE) ("
                    + uploadProperties.maxImageSize() + ") no puede superar " + CONTAINER_MAX_FILE_SIZE_PROPERTY
                    + " (" + containerMaxFileSize + "): subir el tope del contenedor en application.yaml");
        }
    }
}
