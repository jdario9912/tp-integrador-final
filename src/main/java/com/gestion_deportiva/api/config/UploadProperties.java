package com.gestion_deportiva.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.util.unit.DataSize;

// Límites de las imágenes subidas (app.uploads.*, US-28). Es la política por imagen: el tope del contenedor
// (spring.servlet.multipart.*) tiene que ser mayor, y UploadConfig lo verifica al arrancar
@ConfigurationProperties(prefix = "app.uploads")
public record UploadProperties(DataSize maxImageSize) {

    public static final DataSize DEFAULT_MAX_IMAGE_SIZE = DataSize.ofMegabytes(5);

    public UploadProperties {
        maxImageSize = maxImageSize == null ? DEFAULT_MAX_IMAGE_SIZE : maxImageSize;
        if (maxImageSize.toBytes() <= 0) {
            throw new IllegalArgumentException("app.uploads.max-image-size (UPLOAD_MAX_IMAGE_SIZE) debe ser mayor que 0");
        }
    }
}
