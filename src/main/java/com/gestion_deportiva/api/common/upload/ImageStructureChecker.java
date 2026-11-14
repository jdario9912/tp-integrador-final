package com.gestion_deportiva.api.common.upload;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;

// Comprueba que la cabecera de la imagen sea legible y coherente. No decodifica los píxeles: una foto de 5 MB no
// ocupa memoria de imagen. Es el último paso de ImageValidator (contrato de US-28, sección 7.1)
final class ImageStructureChecker {

    // La caché de ImageIO escribe archivos temporales en el disco: se apaga y la lectura queda en memoria
    static {
        ImageIO.setUseCache(false);
    }

    // RIFF (4) + tamaño (4) + WEBP (4) + nombre del primer chunk (4) + tamaño del chunk (4)
    private static final int WEBP_HEADER_SIZE = 20;
    private static final String VP8 = "VP8 ";
    private static final String VP8L = "VP8L";
    private static final String VP8X = "VP8X";

    private ImageStructureChecker() {
    }

    static boolean isReadable(ImageFormat format, byte[] content) {
        return switch (format) {
            case JPEG -> hasDimensions("jpeg", content);
            case PNG -> hasDimensions("png", content);
            case WEBP -> hasValidWebpChunk(content);
        };
    }

    // ImageIO lee solo la cabecera: el ancho y el alto salen del primer marco (JPEG) o del IHDR (PNG)
    private static boolean hasDimensions(String formatName, byte[] content) {
        Iterator<ImageReader> readers = ImageIO.getImageReadersByFormatName(formatName);
        if (!readers.hasNext()) {
            return false;
        }
        ImageReader reader = readers.next();
        try (ImageInputStream input = ImageIO.createImageInputStream(new ByteArrayInputStream(content))) {
            if (input == null) {
                return false;
            }
            reader.setInput(input);
            return reader.getWidth(0) > 0 && reader.getHeight(0) > 0;
        } catch (IOException | RuntimeException ex) {
            // Ante datos truncados o corruptos, los lectores de ImageIO lanzan IIOException o excepciones de índice.
            // Para el cliente es una imagen no válida, no un error del servidor
            return false;
        } finally {
            reader.dispose();
        }
    }

    // El JDK no lee WebP. Se verifica que la cabecera RIFF no declare más bytes de los que llegaron y que el primer
    // chunk sea VP8, VP8L o VP8X con su tamaño dentro del archivo. Los tamaños son enteros sin signo little-endian
    private static boolean hasValidWebpChunk(byte[] content) {
        if (content.length < WEBP_HEADER_SIZE) {
            return false;
        }
        long riffEnd = 8 + unsignedLittleEndian32(content, 4);
        if (riffEnd > content.length) {
            return false;
        }
        String chunk = new String(content, 12, 4, StandardCharsets.US_ASCII);
        if (!VP8.equals(chunk) && !VP8L.equals(chunk) && !VP8X.equals(chunk)) {
            return false;
        }
        long chunkEnd = WEBP_HEADER_SIZE + unsignedLittleEndian32(content, 16);
        return chunkEnd <= riffEnd;
    }

    private static long unsignedLittleEndian32(byte[] content, int offset) {
        return (content[offset] & 0xFFL)
                | (content[offset + 1] & 0xFFL) << 8
                | (content[offset + 2] & 0xFFL) << 16
                | (content[offset + 3] & 0xFFL) << 24;
    }
}
