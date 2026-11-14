package com.gestion_deportiva.api.common.upload;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ImageFormatTest {

    @Test
    void shouldDetectJpegBySignatureEvenWithoutTheRestOfTheFile() {
        assertEquals(Optional.of(ImageFormat.JPEG),
                ImageFormat.detect(new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF}));
    }

    @Test
    void shouldDetectPngBySignature() {
        byte[] signature = {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};

        assertEquals(Optional.of(ImageFormat.PNG), ImageFormat.detect(signature));
    }

    @Test
    void shouldDetectWebpByRiffAndWebpMarkers() {
        byte[] header = "RIFF\u0000\u0000\u0000\u0000WEBPVP8 ".getBytes(StandardCharsets.ISO_8859_1);

        assertEquals(Optional.of(ImageFormat.WEBP), ImageFormat.detect(header));
    }

    @Test
    void shouldNotTakeAWaveFileForWebp() {
        byte[] wave = "RIFF\u0000\u0000\u0000\u0000WAVEfmt ".getBytes(StandardCharsets.ISO_8859_1);

        assertEquals(Optional.empty(), ImageFormat.detect(wave));
    }

    @Test
    void shouldNotDetectGifOrAnyOtherContent() {
        assertFalse(ImageFormat.detect("GIF89a".getBytes(StandardCharsets.US_ASCII)).isPresent());
        assertFalse(ImageFormat.detect("%PDF-1.7".getBytes(StandardCharsets.US_ASCII)).isPresent());
        assertFalse(ImageFormat.detect(new byte[0]).isPresent());
    }

    @Test
    void shouldNotDetectAPartialSignature() {
        // Un JPEG de dos bytes no alcanza la firma de tres
        assertTrue(ImageFormat.detect(new byte[]{(byte) 0xFF, (byte) 0xD8}).isEmpty());
        // Un PNG cortado antes del último byte de la firma
        assertTrue(ImageFormat.detect(new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A})
                .isEmpty());
    }

    @Test
    void shouldExposeTheContentTypeAndExtensionStoredInTheBucket() {
        assertEquals("image/jpeg", ImageFormat.JPEG.contentType());
        assertEquals("jpg", ImageFormat.JPEG.extension());
        assertEquals("image/png", ImageFormat.PNG.contentType());
        assertEquals("png", ImageFormat.PNG.extension());
        assertEquals("image/webp", ImageFormat.WEBP.contentType());
        assertEquals("webp", ImageFormat.WEBP.extension());
    }
}
