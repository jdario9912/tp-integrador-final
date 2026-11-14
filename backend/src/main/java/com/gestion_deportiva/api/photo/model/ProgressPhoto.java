package com.gestion_deportiva.api.photo.model;

import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.photo.model.enums.ProgressPhotoType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Objects;
import java.util.UUID;

// Foto de progreso del atleta (US-28). Vive en el bucket privado: la fila guarda solo la ruta del objeto, que nunca
// sale en la API (la respuesta lleva una URL firmada). Se crea después de subir el objeto y no se edita: para
// corregirla se borra y se sube otra. El createdAt lo fija el service con el AppClock, igual que los pesos
@Entity
@Table(name = "progress_photos")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED) // lo exige JPA
public class ProgressPhoto {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // El dueño no cambia después del alta
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "athlete_id", nullable = false, updatable = false)
    private Athlete athlete;

    // Catálogo photo_types: se guarda el id por el converter (autoApply)
    @Column(name = "type_id", nullable = false, updatable = false)
    private ProgressPhotoType type;

    // Día en que se tomó la foto (el "takenOn" de la API)
    @Column(name = "taken_on", nullable = false, updatable = false)
    private LocalDate takenOn;

    @Column(name = "storage_path", nullable = false, length = 255, updatable = false)
    private String storagePath;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public ProgressPhoto(Athlete athlete, ProgressPhotoType type, LocalDate takenOn, String storagePath,
                         Instant createdAt) {
        this.athlete = Objects.requireNonNull(athlete, "athlete");
        this.type = Objects.requireNonNull(type, "type");
        this.takenOn = Objects.requireNonNull(takenOn, "takenOn");
        this.storagePath = requireStoragePath(storagePath);
        // timestamptz guarda microsegundos: con la misma precisión, la respuesta del alta coincide con la del listado
        this.createdAt = Objects.requireNonNull(createdAt, "createdAt").truncatedTo(ChronoUnit.MICROS);
    }

    // Misma regla que el CHECK de la base: una ruta no vacía (y dentro de los 255 caracteres de la columna)
    private static String requireStoragePath(String storagePath) {
        if (storagePath == null || storagePath.isBlank()) {
            throw new IllegalArgumentException("storagePath es obligatorio");
        }
        if (storagePath.length() > 255) {
            throw new IllegalArgumentException("storagePath admite hasta 255 caracteres");
        }
        return storagePath;
    }

    // equals/hashCode por id: patrón seguro para entidades JPA (no usar @Data)
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ProgressPhoto other)) return false;
        return id != null && id.equals(other.getId());
    }

    @Override
    public int hashCode() {
        return ProgressPhoto.class.hashCode();
    }
}
