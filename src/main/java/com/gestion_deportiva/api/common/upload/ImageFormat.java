package com.gestion_deportiva.api.common.upload;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Optional;

// Formatos de imagen que acepta la app (US-28 y, en la ola 2, la foto de comida). El formato se detecta por la
// firma de los primeros bytes (magic bytes), nunca por el nombre ni por el Content-Type que manda el cliente
public enum ImageFormat {

    JPEG("image/jpeg", "jpg"),
    PNG("image/png", "png"),
    WEBP("image/webp", "webp");

    // FF D8 FF: los tres primeros bytes de cualquier JPEG
    private static final byte[] JPEG_SIGNATURE = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};
    // 89 50 4E 47 0D 0A 1A 0A
    private static final byte[] PNG_SIGNATURE = {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};
    private static final byte[] RIFF_TAG = ascii("RIFF");
    private static final byte[] WEBP_TAG = ascii("WEBP");

    private final String contentType;
    private final String extension;

    ImageFormat(String contentType, String extension) {
        this.contentType = contentType;
        this.extension = extension;
    }

    // Content-Type con el que se guarda el objeto
    public String contentType() {
        return contentType;
    }

    // Extensión del objeto en el bucket (la ruta la arma el service con un uuid)
    public String extension() {
        return extension;
    }

    // Formato según la cabecera del contenido. Vacío si no es JPG, PNG ni WebP (por ejemplo GIF, PDF o texto)
    public static Optional<ImageFormat> detect(byte[] content) {
        if (startsWith(content, 0, JPEG_SIGNATURE)) {
            return Optional.of(JPEG);
        }
        if (startsWith(content, 0, PNG_SIGNATURE)) {
            return Optional.of(PNG);
        }
        // WebP: RIFF en los bytes 0 a 3 y WEBP en los bytes 8 a 11 (el tamaño del medio va en los bytes 4 a 7)
        if (startsWith(content, 0, RIFF_TAG) && startsWith(content, 8, WEBP_TAG)) {
            return Optional.of(WEBP);
        }
        return Optional.empty();
    }

    private static boolean startsWith(byte[] content, int offset, byte[] signature) {
        return content.length >= offset + signature.length
                && Arrays.equals(content, offset, offset + signature.length, signature, 0, signature.length);
    }

    private static byte[] ascii(String text) {
        return text.getBytes(StandardCharsets.US_ASCII);
    }
}
