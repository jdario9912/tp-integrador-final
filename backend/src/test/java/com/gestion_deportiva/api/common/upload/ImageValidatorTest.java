package com.gestion_deportiva.api.common.upload;

import com.gestion_deportiva.api.common.upload.exception.ImageTooLargeException;
import com.gestion_deportiva.api.common.upload.exception.InvalidImageException;
import com.gestion_deportiva.api.common.upload.exception.UnsupportedImageFormatException;
import com.gestion_deportiva.api.config.UploadProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.util.unit.DataSize;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

// Validación de imágenes con archivos reales (JPG, PNG y WebP válidos; GIF) y con copias dañadas armadas en el test.
// Sin Spring ni Docker: el validador solo necesita UploadProperties
class ImageValidatorTest {

    private static final long MB = 1024L * 1024L;
    private static final String FILE = "file";

    private ImageValidator validator;

    @BeforeEach
    void setUp() {
        validator = new ImageValidator(new UploadProperties(DataSize.ofMegabytes(5)));
    }

    static Stream<Arguments> validImages() {
        return Stream.of(
                Arguments.of("foto-valida.jpg", ImageFormat.JPEG),
                Arguments.of("foto-valida.png", ImageFormat.PNG),
                Arguments.of("foto-valida.webp", ImageFormat.WEBP),
                Arguments.of("foto-valida-sin-perdida.webp", ImageFormat.WEBP));
    }

    @ParameterizedTest(name = "{0} se acepta como {1}")
    @MethodSource("validImages")
    void shouldAcceptARealImageAndKeepItsBytesAsUploaded(String resource, ImageFormat expected) throws Exception {
        byte[] content = load(resource);

        ValidatedImage image = validator.validate(new MockMultipartFile(FILE, resource, "application/octet-stream",
                content));

        assertEquals(expected, image.format());
        assertArrayEquals(content, image.content());
    }

    @Test
    void shouldDetectTheFormatByContentNotByTheNameOrTheContentTypeTheClientSent() throws Exception {
        // Un PNG disfrazado de JPG con Content-Type de JPG: se guarda como PNG
        MockMultipartFile disguised = new MockMultipartFile(FILE, "foto.jpg", "image/jpeg", load("foto-valida.png"));

        assertEquals(ImageFormat.PNG, validator.validate(disguised).format());
    }

    @Test
    void shouldAcceptAnImageExactlyAtTheLimit() throws Exception {
        byte[] content = padded(load("foto-valida.jpg"), 5 * MB);

        ValidatedImage image = validator.validate(new MockMultipartFile(FILE, "limite.jpg", "image/jpeg", content));

        assertEquals(ImageFormat.JPEG, image.format());
    }

    @Test
    void shouldRejectAnImageOneByteOverTheLimitBeforeReadingIt() {
        byte[] content = padded(load("foto-valida.jpg"), 5 * MB + 1);

        ImageTooLargeException ex = assertThrows(ImageTooLargeException.class,
                () -> validator.validate(new MockMultipartFile(FILE, "grande.jpg", "image/jpeg", content)));

        assertEquals("La foto supera el tamaño máximo permitido de 5 MB", ex.getMessage());
    }

    @Test
    void shouldRejectAGifEvenWhenItsNameAndContentTypeSayJpg() {
        MockMultipartFile gif = new MockMultipartFile(FILE, "foto.jpg", "image/jpeg", load("animacion.gif"));

        assertThrows(UnsupportedImageFormatException.class, () -> validator.validate(gif));
    }

    @Test
    void shouldRejectPlainTextAndPdfAsUnsupportedFormat() {
        MockMultipartFile text = new MockMultipartFile(FILE, "foto.png", "image/png",
                "esto no es una imagen".getBytes(StandardCharsets.UTF_8));
        MockMultipartFile pdf = new MockMultipartFile(FILE, "foto.webp", "image/webp",
                "%PDF-1.4\n%âãÏÓ".getBytes(StandardCharsets.ISO_8859_1));

        assertThrows(UnsupportedImageFormatException.class, () -> validator.validate(text));
        assertThrows(UnsupportedImageFormatException.class, () -> validator.validate(pdf));
    }

    @Test
    void shouldRejectAMissingOrEmptyFileAsAFieldError() {
        InvalidImageException missing = assertThrows(InvalidImageException.class, () -> validator.validate(null));
        InvalidImageException empty = assertThrows(InvalidImageException.class,
                () -> validator.validate(new MockMultipartFile(FILE, "vacio.jpg", "image/jpeg", new byte[0])));

        assertEquals("file", missing.getField());
        assertEquals("Adjuntá una foto", missing.getMessage());
        assertEquals("Adjuntá una foto", empty.getMessage());
    }

    @Test
    void shouldRejectAJpegTruncatedInTheHeader() throws Exception {
        // Empieza como JPG (FF D8 FF) pero se corta antes del marco: no hay dimensiones que leer
        byte[] truncated = Arrays.copyOf(load("foto-valida.jpg"), 40);

        InvalidImageException ex = assertThrows(InvalidImageException.class,
                () -> validator.validate(new MockMultipartFile(FILE, "cortada.jpg", "image/jpeg", truncated)));

        assertEquals("El archivo no es una imagen válida. Probá con otra foto", ex.getMessage());
    }

    @Test
    void shouldRejectAPngTruncatedInTheHeader() throws Exception {
        // Firma PNG completa pero sin el bloque IHDR entero
        byte[] truncated = Arrays.copyOf(load("foto-valida.png"), 20);

        assertThrows(InvalidImageException.class,
                () -> validator.validate(new MockMultipartFile(FILE, "cortada.png", "image/png", truncated)));
    }

    @Test
    void shouldRejectAWebpWhoseRiffHeaderDeclaresMoreBytesThanTheFile() throws Exception {
        byte[] content = load("foto-valida.webp");
        writeLittleEndian(content, 4, 1000); // el RIFF dice que el archivo mide 1008 bytes y mide 42

        assertThrows(InvalidImageException.class,
                () -> validator.validate(new MockMultipartFile(FILE, "riff.webp", "image/webp", content)));
    }

    @Test
    void shouldRejectAWebpWhoseFirstChunkIsNotAKnownBitstream() throws Exception {
        byte[] content = load("foto-valida.webp");
        System.arraycopy("XXXX".getBytes(StandardCharsets.US_ASCII), 0, content, 12, 4);

        assertThrows(InvalidImageException.class,
                () -> validator.validate(new MockMultipartFile(FILE, "chunk.webp", "image/webp", content)));
    }

    @Test
    void shouldRejectAWebpWhoseFirstChunkDoesNotFitInTheFile() throws Exception {
        byte[] content = load("foto-valida.webp");
        writeLittleEndian(content, 16, 0x7FFFFFF0L); // el chunk VP8 declara 2 GB

        assertThrows(InvalidImageException.class,
                () -> validator.validate(new MockMultipartFile(FILE, "chunk-grande.webp", "image/webp", content)));
    }

    @Test
    void shouldRejectAWebpShorterThanItsHeader() throws Exception {
        byte[] truncated = Arrays.copyOf(load("foto-valida.webp"), 16);

        assertThrows(InvalidImageException.class,
                () -> validator.validate(new MockMultipartFile(FILE, "corto.webp", "image/webp", truncated)));
    }

    private static byte[] load(String name) {
        try {
            return new ClassPathResource("images/" + name).getContentAsByteArray();
        } catch (java.io.IOException ex) {
            throw new IllegalStateException("No se pudo leer el fixture " + name, ex);
        }
    }

    // Rellena con ceros al final: los bytes de cabecera siguen siendo los de la imagen válida
    private static byte[] padded(byte[] content, long size) {
        return Arrays.copyOf(content, (int) size);
    }

    private static void writeLittleEndian(byte[] content, int offset, long value) {
        for (int i = 0; i < 4; i++) {
            content[offset + i] = (byte) (value >>> (8 * i));
        }
    }
}
