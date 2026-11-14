package com.gestion_deportiva.api.common.upload;

// Imagen aceptada: el formato que detectó el servidor (no el que mandó el cliente) y los bytes tal cual se subieron
public record ValidatedImage(ImageFormat format, byte[] content) {
}
