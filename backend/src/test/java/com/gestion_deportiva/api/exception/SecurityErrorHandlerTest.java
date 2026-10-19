package com.gestion_deportiva.api.exception;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.InsufficientAuthenticationException;
import tools.jackson.databind.json.JsonMapper;

import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;


class SecurityErrorHandlerTest {

    private final SecurityErrorHandler handler = new SecurityErrorHandler(JsonMapper.builder().build());

    @Test
    void unauthenticatedRequestGets401WithTheStandardFormat() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/atletas");
        MockHttpServletResponse response = new MockHttpServletResponse();

        handler.commence(request, response, new InsufficientAuthenticationException("Full authentication is required"));

        assertStandardError(response, 401, "Unauthorized", SecurityErrorHandler.UNAUTHORIZED_MESSAGE, "/api/atletas");
    }

    @Test
    void requestWithoutPermissionGets403WithoutTheInternalDetail() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/rutinas/5");
        MockHttpServletResponse response = new MockHttpServletResponse();

        handler.handle(request, response, new AccessDeniedException("detalle interno de seguridad"));

        assertStandardError(response, 403, "Forbidden", SecurityErrorHandler.FORBIDDEN_MESSAGE, "/api/rutinas/5");
        assertFalse(response.getContentAsString(StandardCharsets.UTF_8).contains("detalle interno"));
    }

    private static void assertStandardError(MockHttpServletResponse response, int status, String error,
                                            String message, String path) throws Exception {
        assertEquals(status, response.getStatus());
        assertTrue(response.getContentType().startsWith(MediaType.APPLICATION_JSON_VALUE));

        String json = response.getContentAsString(StandardCharsets.UTF_8);
        Integer jsonStatus = JsonPath.read(json, "$.status");
        String jsonError = JsonPath.read(json, "$.error");
        String jsonMessage = JsonPath.read(json, "$.message");
        String jsonRequestPath = JsonPath.read(json, "$.path");
        Object timestamp = JsonPath.read(json, "$.timestamp");

        assertEquals(status, jsonStatus);
        assertEquals(error, jsonError);
        assertEquals(message, jsonMessage);
        assertEquals(path, jsonRequestPath);
        assertNotNull(timestamp);
    }
}
