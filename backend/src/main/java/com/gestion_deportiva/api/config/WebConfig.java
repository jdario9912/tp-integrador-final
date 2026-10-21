package com.gestion_deportiva.api.config;

import com.gestion_deportiva.api.ApiApplication;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.method.HandlerTypePredicate;
import org.springframework.web.servlet.config.annotation.PathMatchConfigurer;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    // Prefijo común de la API: los controllers declaran solo su recurso (ej. "/coaches").
    // Solo a los @RestController de este proyecto: springdoc también expone /v3/api-docs con un
    // @RestController propio y, si se le aplicara el prefijo, Swagger UI no encontraría la spec.
    public static final String API_PREFIX = "/api";

    @Override
    public void configurePathMatch(PathMatchConfigurer configurer) {
        configurer.addPathPrefix(API_PREFIX, HandlerTypePredicate.forBasePackageClass(ApiApplication.class)
                .and(HandlerTypePredicate.forAnnotation(RestController.class)));
    }
}
