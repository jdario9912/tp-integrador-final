package com.gestion_deportiva.api.common.exception;

import com.fasterxml.jackson.annotation.JsonInclude;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;

import java.time.Instant;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiErrorResponse(
        Instant timestamp,
        int status,
        String error,
        String message,
        String path,
        List<FieldErrorDetail> fieldErrors
) {

    public record FieldErrorDetail(String field, String message) {
    }

    public static ApiErrorResponse of(HttpStatusCode status, String message, String path) {
        return of(status, message, path, null);
    }

    public static ApiErrorResponse of(HttpStatusCode status, String message, String path,
                                      List<FieldErrorDetail> fieldErrors) {
        return new ApiErrorResponse(Instant.now(), status.value(), reasonPhrase(status), message, path, fieldErrors);
    }

    private static String reasonPhrase(HttpStatusCode status) {
        HttpStatus known = HttpStatus.resolve(status.value());
        return known != null ? known.getReasonPhrase() : String.valueOf(status.value());
    }
}
