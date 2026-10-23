package com.gestion_deportiva.api.common.exception;

import com.gestion_deportiva.api.config.ClockConfig;
import com.gestion_deportiva.api.config.JwtConfig;
import com.gestion_deportiva.api.config.SecurityConfig;
import com.gestion_deportiva.api.config.WebConfig;
import com.gestion_deportiva.api.user.exception.EmailAlreadyRegisteredException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.test.context.support.WithAnonymousUser;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(GlobalExceptionHandlerTest.ErrorTestController.class)
// JwtConfig y ClockConfig: SecurityConfig valida los JWT con el JwtDecoder que definen
@Import({GlobalExceptionHandlerTest.ErrorTestController.class, SecurityConfig.class, SecurityErrorHandler.class,
        JwtConfig.class, ClockConfig.class})
@WithMockUser
class GlobalExceptionHandlerTest {

    // El controller declara solo su recurso; WebConfig le agrega el prefijo /api
    private static final String MAPPING = "/test/errors";
    private static final String BASE = WebConfig.API_PREFIX + MAPPING;

    @Autowired
    private MockMvc mockMvc;

    @Test
    void validationErrorReturns400WithTheStandardFormatAndTheDetailOfEachField() throws Exception {
        mockMvc.perform(post(BASE + "/validation").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name": "", "email": "no-es-un-email"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.timestamp").exists())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").value(GlobalExceptionHandler.VALIDATION_MESSAGE))
                .andExpect(jsonPath("$.path").value(BASE + "/validation"))
                .andExpect(jsonPath("$.fieldErrors", hasSize(2)))
                .andExpect(jsonPath("$.fieldErrors[*].field", containsInAnyOrder("name", "email")));
    }

    @Test
    void malformedJsonReturns400WithAClearMessage() throws Exception {
        mockMvc.perform(post(BASE + "/validation").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\": \"Ana\", "))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value(GlobalExceptionHandler.MALFORMED_BODY_MESSAGE))
                .andExpect(jsonPath("$.fieldErrors").doesNotExist());
    }

    @Test
    @WithAnonymousUser
    void requestWithoutAuthenticationReturns401() throws Exception {
        mockMvc.perform(get(BASE + "/not-found"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.error").value("Unauthorized"))
                .andExpect(jsonPath("$.message").value(SecurityErrorHandler.UNAUTHORIZED_MESSAGE))
                .andExpect(jsonPath("$.path").value(BASE + "/not-found"));
    }

    @Test
    void accessDeniedInsideAControllerReturns403() throws Exception {
        mockMvc.perform(get(BASE + "/access-denied"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.message").value(SecurityErrorHandler.FORBIDDEN_MESSAGE));
    }

    @Test
    void unauthorizedExceptionReturns401WithItsOwnMessage() throws Exception {
        mockMvc.perform(get(BASE + "/unauthorized"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.error").value("Unauthorized"))
                .andExpect(jsonPath("$.message").value("Email o contraseña incorrectos"))
                .andExpect(jsonPath("$.path").value(BASE + "/unauthorized"));
    }

    @Test
    void forbiddenExceptionReturns403WithItsOwnMessage() throws Exception {
        mockMvc.perform(get(BASE + "/forbidden"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.error").value("Forbidden"))
                .andExpect(jsonPath("$.message").value("Tu cuenta está desactivada"));
    }

    @Test
    void resourceNotFoundReturns404WithTheExceptionMessage() throws Exception {
        mockMvc.perform(get(BASE + "/not-found"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.error").value("Not Found"))
                .andExpect(jsonPath("$.message").value("No se encontró el atleta"))
                .andExpect(jsonPath("$.path").value(BASE + "/not-found"))
                .andExpect(jsonPath("$.fieldErrors").doesNotExist());
    }

    @Test
    void emailAlreadyRegisteredReturns409() throws Exception {
        mockMvc.perform(get(BASE + "/conflict"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.message").value("Ya existe un usuario registrado con el email ana@test.com"));
    }

    @Test
    void dataIntegrityViolationReturns409WithoutDatabaseDetails() throws Exception {
        mockMvc.perform(get(BASE + "/data-integrity"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.error").value("Conflict"))
                .andExpect(jsonPath("$.message").value(GlobalExceptionHandler.DATA_CONFLICT_MESSAGE))
                .andExpect(jsonPath("$.path").value(BASE + "/data-integrity"))
                .andExpect(content().string(not(containsString("ux_users_email"))));
    }

    @Test
    void businessRuleViolationReturns422() throws Exception {
        mockMvc.perform(get(BASE + "/business-rule"))
                .andExpect(status().is(422))
                .andExpect(jsonPath("$.status").value(422))
                .andExpect(jsonPath("$.message").value("La sesión ya fue finalizada"));
    }

    @Test
    void unexpectedErrorReturnsAGeneric500WithoutInternalDetails() throws Exception {
        mockMvc.perform(get(BASE + "/unexpected"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.status").value(500))
                .andExpect(jsonPath("$.message").value(GlobalExceptionHandler.UNEXPECTED_MESSAGE))
                .andExpect(jsonPath("$.trace").doesNotExist())
                .andExpect(content().string(not(containsString("password"))))
                .andExpect(content().string(not(containsString("IllegalStateException"))));
    }

    @Test
    void unsupportedHttpMethodKeeps405WithTheStandardFormat() throws Exception {
        mockMvc.perform(put(BASE + "/not-found").with(csrf()))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.status").value(405))
                .andExpect(jsonPath("$.error").value("Method Not Allowed"))
                .andExpect(jsonPath("$.message").exists())
                .andExpect(jsonPath("$.path").value(BASE + "/not-found"));
    }

    // Anidado para que Spring no lo registre en otros tests; por eso se agrega con @Import.
    @RestController
    @RequestMapping(MAPPING)
    static class ErrorTestController {

        record SampleRequest(@NotBlank String name, @Email String email) {
        }

        // Las excepciones base son abstractas: subclases mínimas para probar el mapeo del handler
        static class SampleNotFoundException extends ResourceNotFoundException {
            SampleNotFoundException(String message) {
                super(message);
            }
        }

        static class SampleBusinessRuleException extends BusinessRuleException {
            SampleBusinessRuleException(String message) {
                super(message);
            }
        }

        static class SampleUnauthorizedException extends UnauthorizedException {
            SampleUnauthorizedException(String message) {
                super(message);
            }
        }

        static class SampleForbiddenException extends ForbiddenException {
            SampleForbiddenException(String message) {
                super(message);
            }
        }

        @PostMapping("/validation")
        void validation(@Valid @RequestBody SampleRequest request) {
        }

        @GetMapping("/not-found")
        void notFound() {
            throw new SampleNotFoundException("No se encontró el atleta");
        }

        @GetMapping("/conflict")
        void conflict() {
            throw new EmailAlreadyRegisteredException("ana@test.com");
        }

        @GetMapping("/data-integrity")
        void dataIntegrity() {
            throw new DataIntegrityViolationException(
                    "duplicate key value violates unique constraint \"ux_users_email\"");
        }

        @GetMapping("/unauthorized")
        void unauthorized() {
            throw new SampleUnauthorizedException("Email o contraseña incorrectos");
        }

        @GetMapping("/forbidden")
        void forbidden() {
            throw new SampleForbiddenException("Tu cuenta está desactivada");
        }

        @GetMapping("/business-rule")
        void businessRule() {
            throw new SampleBusinessRuleException("La sesión ya fue finalizada");
        }

        @GetMapping("/access-denied")
        void accessDenied() {
            throw new AccessDeniedException("detalle interno de seguridad");
        }

        @GetMapping("/unexpected")
        void unexpected() {
            throw new IllegalStateException("password=1234 en la conexión a la base");
        }
    }
}
