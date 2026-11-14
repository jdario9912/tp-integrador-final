package com.gestion_deportiva.api.common.exception;

import com.gestion_deportiva.api.common.upload.exception.ImageTooLargeException;
import com.gestion_deportiva.api.common.upload.exception.UnsupportedImageFormatException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Handlers de subidas (US-28) sin contenedor ni base: un controller de prueba lanza cada excepción y se verifica el
// status y el mensaje del ApiErrorResponse. Cubre el tope del contenedor, que el e2e no puede probar porque Tomcat
// corta la conexión antes de que el cliente lea la respuesta
class GlobalExceptionHandlerUploadTest {

    private static final long MB = 1024L * 1024L;
    private static final String TOO_LARGE_MESSAGE = "La foto supera el tamaño máximo permitido de 5 MB";

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new UploadProbeController())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void containerLimitAnswers413WithThePolicyMessageAndNoFieldErrors() throws Exception {
        mockMvc.perform(post("/probe/container").contentType(MediaType.MULTIPART_FORM_DATA))
                .andExpect(status().isPayloadTooLarge())
                .andExpect(jsonPath("$.status").value(413))
                .andExpect(jsonPath("$.message").value(TOO_LARGE_MESSAGE))
                .andExpect(jsonPath("$.path").value("/probe/container"))
                .andExpect(jsonPath("$.fieldErrors").doesNotExist());
    }

    @Test
    void policyLimitAnswers413WithTheSameMessage() throws Exception {
        mockMvc.perform(post("/probe/policy"))
                .andExpect(status().isPayloadTooLarge())
                .andExpect(jsonPath("$.message").value(TOO_LARGE_MESSAGE));
    }

    @Test
    void unsupportedFormatAnswers415WithoutFieldErrors() throws Exception {
        mockMvc.perform(post("/probe/format"))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.message").value("Formato no permitido. Subí una foto en JPG, PNG o WebP"))
                .andExpect(jsonPath("$.fieldErrors").doesNotExist());
    }

    @Test
    void brokenMultipartBodyAnswers400WithItsOwnMessageInsteadOfA500() throws Exception {
        mockMvc.perform(post("/probe/multipart"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("La solicitud de subida no es válida"))
                .andExpect(jsonPath("$.fieldErrors").doesNotExist());
    }

    @RestController
    @RequestMapping("/probe")
    static class UploadProbeController {

        @PostMapping("/container")
        String container() {
            throw new MaxUploadSizeExceededException(6 * MB);
        }

        @PostMapping("/policy")
        String policy() {
            throw new ImageTooLargeException(5 * MB);
        }

        @PostMapping("/format")
        String format() {
            throw new UnsupportedImageFormatException();
        }

        @PostMapping("/multipart")
        String multipart() {
            throw new MultipartException("cuerpo multipart incompleto");
        }
    }
}
