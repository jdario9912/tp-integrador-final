package com.gestion_deportiva.api.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.util.unit.DataSize;

import static org.assertj.core.api.Assertions.assertThat;

// Arranque de la configuración de subidas sin levantar la app ni Docker: el límite de la política tiene que entrar en
// el tope del contenedor (spring.servlet.multipart.max-file-size), o la app no arranca
class UploadConfigTest {

    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withUserConfiguration(UploadConfig.class);

    @Test
    void shouldStartWhenThePolicyFitsInsideTheContainerLimit() {
        runner.withPropertyValues("app.uploads.max-image-size=5MB", "spring.servlet.multipart.max-file-size=6MB")
                .run(context -> {
                    assertThat(context).hasNotFailed();
                    assertThat(context.getBean(UploadProperties.class).maxImageSize())
                            .isEqualTo(DataSize.ofMegabytes(5));
                });
    }

    @Test
    void shouldStartWhenThePolicyEqualsTheContainerLimit() {
        runner.withPropertyValues("app.uploads.max-image-size=6MB", "spring.servlet.multipart.max-file-size=6MB")
                .run(context -> assertThat(context).hasNotFailed());
    }

    @Test
    void shouldFailToStartWhenThePolicyIsLargerThanTheContainerLimit() {
        runner.withPropertyValues("app.uploads.max-image-size=8MB", "spring.servlet.multipart.max-file-size=6MB")
                .run(context -> assertThat(context).hasFailed()
                        .getFailure().hasStackTraceContaining("app.uploads.max-image-size"));
    }

    @Test
    void shouldUseTheSpringDefaultContainerLimitWhenNotConfigured() {
        // Sin tope configurado, Spring admite 1 MB por archivo: una política de 5 MB no puede arrancar
        runner.run(context -> assertThat(context).hasFailed());
    }

    @Test
    void shouldDefaultThePolicyToFiveMegabytesWhenNotConfigured() {
        runner.withPropertyValues("spring.servlet.multipart.max-file-size=6MB")
                .run(context -> assertThat(context.getBean(UploadProperties.class).maxImageSize())
                        .isEqualTo(DataSize.ofMegabytes(5)));
    }
}
