package com.gestion_deportiva.api.common.exception;

import com.gestion_deportiva.api.common.exception.ApiErrorResponse.FieldErrorDetail;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import java.util.List;

// Extiende ResponseEntityExceptionHandler para que las excepciones de Spring MVC (405, 415, etc.)
// conserven su status en lugar de caer en el handler de Exception como 500.
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    static final String VALIDATION_MESSAGE = "La solicitud tiene campos inválidos";
    static final String MALFORMED_BODY_MESSAGE = "El cuerpo de la solicitud no es un JSON válido";
    static final String UNEXPECTED_MESSAGE = "Ocurrió un error inesperado. Intente nuevamente más tarde";
    static final String DEFAULT_MESSAGE = "No se pudo procesar la solicitud";

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleResourceNotFound(ResourceNotFoundException ex,
                                                                   HttpServletRequest request) {
        return build(HttpStatus.NOT_FOUND, ex.getMessage(), request);
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ApiErrorResponse> handleConflict(ConflictException ex, HttpServletRequest request) {
        return build(HttpStatus.CONFLICT, ex.getMessage(), request);
    }

    @ExceptionHandler(BusinessRuleException.class)
    public ResponseEntity<ApiErrorResponse> handleBusinessRule(BusinessRuleException ex,
                                                               HttpServletRequest request) {
        return build(HttpStatus.UNPROCESSABLE_CONTENT, ex.getMessage(), request);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiErrorResponse> handleAccessDenied(AccessDeniedException ex,
                                                               HttpServletRequest request) {
        return build(HttpStatus.FORBIDDEN, SecurityErrorHandler.FORBIDDEN_MESSAGE, request);
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiErrorResponse> handleAuthentication(AuthenticationException ex,
                                                                 HttpServletRequest request) {
        return build(HttpStatus.UNAUTHORIZED, SecurityErrorHandler.UNAUTHORIZED_MESSAGE, request);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleUnexpected(Exception ex, HttpServletRequest request) {
        log.error("Error no controlado en {} {}", request.getMethod(), request.getRequestURI(), ex);
        return build(HttpStatus.INTERNAL_SERVER_ERROR, UNEXPECTED_MESSAGE, request);
    }

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex,
                                                                  HttpHeaders headers, HttpStatusCode status,
                                                                  WebRequest request) {
        List<FieldErrorDetail> fieldErrors = ex.getBindingResult().getFieldErrors().stream()
                .map(error -> new FieldErrorDetail(error.getField(), error.getDefaultMessage()))
                .toList();
        return ResponseEntity.status(status).headers(headers)
                .body(ApiErrorResponse.of(status, VALIDATION_MESSAGE, path(request), fieldErrors));
    }

    @Override
    protected ResponseEntity<Object> handleHttpMessageNotReadable(HttpMessageNotReadableException ex,
                                                                  HttpHeaders headers, HttpStatusCode status,
                                                                  WebRequest request) {
        return ResponseEntity.status(status).headers(headers)
                .body(ApiErrorResponse.of(status, MALFORMED_BODY_MESSAGE, path(request)));
    }

    @Override
    protected ResponseEntity<Object> handleExceptionInternal(Exception ex, Object body, HttpHeaders headers,
                                                             HttpStatusCode statusCode, WebRequest request) {
        if (statusCode.is5xxServerError()) {
            log.error("Error de Spring MVC en {}", path(request), ex);
        }
        return ResponseEntity.status(statusCode).headers(headers)
                .body(ApiErrorResponse.of(statusCode, springDetail(ex, body), path(request)));
    }

    private static ResponseEntity<ApiErrorResponse> build(HttpStatus status, String message,
                                                          HttpServletRequest request) {
        return ResponseEntity.status(status).body(ApiErrorResponse.of(status, message, request.getRequestURI()));
    }

    private static String path(WebRequest request) {
        return ((ServletWebRequest) request).getRequest().getRequestURI();
    }

    private static String springDetail(Exception ex, Object body) {
        String detail = null;
        if (body instanceof ProblemDetail problem) {
            detail = problem.getDetail();
        } else if (ex instanceof ErrorResponse errorResponse) {
            detail = errorResponse.getBody().getDetail();
        }
        return detail != null ? detail : DEFAULT_MESSAGE;
    }
}
