package com.gestion_deportiva.api.common.upload.exception;

import java.util.Locale;

// La imagen supera el límite de la política (app.uploads.max-image-size): 413
public class ImageTooLargeException extends RuntimeException {

    private static final long MEGABYTE = 1024L * 1024L;

    public ImageTooLargeException(long maxBytes) {
        super(messageFor(maxBytes));
    }

    // Texto para el cliente. GlobalExceptionHandler lo usa también para el 413 del tope del contenedor
    public static String messageFor(long maxBytes) {
        String size = maxBytes % MEGABYTE == 0
                ? (maxBytes / MEGABYTE) + " MB"
                : String.format(Locale.ROOT, "%.1f MB", maxBytes / (double) MEGABYTE);
        return "La foto supera el tamaño máximo permitido de " + size;
    }
}
