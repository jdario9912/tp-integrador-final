package com.gestion_deportiva.api.common.upload.exception;

// El contenido no es JPG, PNG ni WebP (por ejemplo GIF, PDF o texto): 415 sin fieldErrors
public class UnsupportedImageFormatException extends RuntimeException {

    public static final String MESSAGE = "Formato no permitido. Subí una foto en JPG, PNG o WebP";

    public UnsupportedImageFormatException() {
        super(MESSAGE);
    }
}
