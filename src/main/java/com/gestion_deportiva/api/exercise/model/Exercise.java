package com.gestion_deportiva.api.exercise.model;

import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.exercise.model.enums.MuscleGroup;
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
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.SQLRestriction;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

// Ejercicio del catálogo (US-38). Sin autor es un ejercicio del sistema (global): lo ven todos los entrenadores
// y nadie lo edita. @SQLRestriction: los eliminados (baja lógica) no aparecen en ninguna consulta de JPA
@Entity
@Table(name = "exercises")
@SQLRestriction("deleted_at is null")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED) // lo exige JPA
public class Exercise {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Setter
    @Column(name = "muscle_group_id", nullable = false)
    private MuscleGroup muscleGroup;

    // null = ejercicio del sistema. La autoría no cambia después del alta
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", updatable = false)
    private Coach createdBy;

    // Siempre sin espacios al principio ni al final: la unicidad compara lower(name)
    @Column(nullable = false, length = 100)
    private String name;

    @Setter
    @Column(length = 500)
    private String description;

    @Setter
    @Column(name = "video_url", length = 500)
    private String videoUrl;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    // Baja lógica: con valor, el ejercicio sale del catálogo y su nombre queda libre (índices parciales de la V3)
    @Column(name = "deleted_at")
    private Instant deletedAt;

    public Exercise(String name, MuscleGroup muscleGroup, Coach createdBy) {
        rename(name);
        this.muscleGroup = Objects.requireNonNull(muscleGroup, "muscleGroup");
        this.createdBy = createdBy;
    }

    // Builder sobre el constructor: name y muscleGroup siguen siendo obligatorios (el nombre se normaliza)
    // y el id, los timestamps y la baja lógica no se exponen
    @Builder
    private Exercise(String name, MuscleGroup muscleGroup, Coach createdBy, String description, String videoUrl) {
        this(name, muscleGroup, createdBy);
        this.description = description;
        this.videoUrl = videoUrl;
    }

    public void rename(String newName) {
        this.name = Objects.requireNonNull(newName, "name").trim();
    }

    public boolean isGlobal() {
        return createdBy == null;
    }

    // Solo lee el id del autor: con el proxy LAZY no dispara una consulta
    public boolean isOwnedBy(UUID coachId) {
        return createdBy != null && createdBy.getId().equals(coachId);
    }

    public void markDeleted(Instant at) {
        this.deletedAt = Objects.requireNonNull(at, "at");
    }

    public boolean isDeleted() {
        return deletedAt != null;
    }

    // equals/hashCode por id: patrón seguro para entidades JPA (no usar @Data)
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Exercise other)) return false;
        return id != null && id.equals(other.getId());
    }

    @Override
    public int hashCode() {
        return Exercise.class.hashCode();
    }
}
