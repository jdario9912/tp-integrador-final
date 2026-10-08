# ---------- Etapa 1: build ----------
FROM eclipse-temurin:17-jdk AS build
WORKDIR /app

# Wrapper y archivos de Gradle primero, para aprovechar la caché de capas
COPY gradlew* settings.gradle* build.gradle* gradle.properties* ./
COPY gradle gradle
RUN chmod +x gradlew && ./gradlew dependencies --no-daemon > /dev/null 2>&1 || true

# Código fuente y empaquetado
COPY src src
RUN ./gradlew bootJar -x test --no-daemon \
    && cp "$(ls build/libs/*.jar | grep -v -- '-plain.jar' | head -n 1)" /app/app.jar

# ---------- Etapa 2: runtime ----------
FROM eclipse-temurin:17-jre
WORKDIR /app

# Usuario sin privilegios
RUN useradd --system --no-create-home appuser
USER appuser

COPY --from=build /app/app.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]