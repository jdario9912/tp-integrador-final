package com.gestion_deportiva.api.common.upload;

import com.gestion_deportiva.api.common.upload.exception.ImageTooLargeException;
import com.gestion_deportiva.api.common.upload.exception.InvalidImageException;
import com.gestion_deportiva.api.common.upload.exception.UnsupportedImageFormatException;
import com.gestion_deportiva.api.config.UploadProperties;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;

// Validación de una imagen subida, reutilizable por US-28 (fotos de progreso) y US-23 (foto de comida). Orden:
// presencia (400), tamaño de la política (413), formato por la firma (415) y estructura (400). No re-codifica la
// imagen: se guarda el archivo tal cual lo subió el cliente (contrato de US-28, sección 7.1)
@Component
public class ImageValidator {

    private final long maxImageBytes;

    public ImageValidator(UploadProperties uploadProperties) {
        this.maxImageBytes = uploadProperties.maxImageSize().toBytes();
    }

    public ValidatedImage validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw InvalidImageException.missing();
        }
        // Se mide antes de leer los bytes: una imagen que supera el límite no ocupa memoria
        if (file.getSize() > maxImageBytes) {
            throw new ImageTooLargeException(maxImageBytes);
        }
        byte[] content = readBytes(file);
        ImageFormat format = ImageFormat.detect(content).orElseThrow(UnsupportedImageFormatException::new);
        if (!ImageStructureChecker.isReadable(format, content)) {
            throw InvalidImageException.corrupt();
        }
        return new ValidatedImage(format, content);
    }

    // Un fallo al leer el archivo temporal es un problema del servidor (500), no un error del cliente
    private static byte[] readBytes(MultipartFile file) {
        try {
            return file.getBytes();
        } catch (IOException ex) {
            throw new UncheckedIOException("No se pudo leer la imagen subida", ex);
        }
    }
}
