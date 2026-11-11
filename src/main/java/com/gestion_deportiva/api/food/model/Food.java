package com.gestion_deportiva.api.food.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

// Alimento del catálogo (US-39). Catálogo global: no tiene autor, lo editan los entrenadores y lo consultan
// los dos roles. Los valores nutricionales corresponden a la porción de referencia (en gramos)
@Entity
@Table(name = "foods")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED) // lo exige JPA
public class Food {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // Siempre sin espacios al principio ni al final: la unicidad compara lower(name)
    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "reference_portion_g", nullable = false, precision = 7, scale = 2)
    private BigDecimal referencePortionG;

    @Column(name = "calories_kcal", nullable = false, precision = 7, scale = 2)
    private BigDecimal caloriesKcal;

    @Column(name = "protein_g", nullable = false, precision = 7, scale = 2)
    private BigDecimal proteinG;

    @Column(name = "carbs_g", nullable = false, precision = 7, scale = 2)
    private BigDecimal carbsG;

    @Column(name = "fat_g", nullable = false, precision = 7, scale = 2)
    private BigDecimal fatG;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    // Builder sobre el constructor: todos los campos son obligatorios (el nombre se normaliza)
    // y el id y los timestamps no se exponen
    @Builder
    private Food(String name, BigDecimal referencePortionG, BigDecimal caloriesKcal, BigDecimal proteinG,
                 BigDecimal carbsG, BigDecimal fatG) {
        rename(name);
        updateNutrition(referencePortionG, caloriesKcal, proteinG, carbsG, fatG);
    }

    public void rename(String newName) {
        this.name = Objects.requireNonNull(newName, "name").trim();
    }

    // Reemplaza la información nutricional completa: siempre se edita como un conjunto
    public void updateNutrition(BigDecimal referencePortionG, BigDecimal caloriesKcal, BigDecimal proteinG,
                                BigDecimal carbsG, BigDecimal fatG) {
        this.referencePortionG = Objects.requireNonNull(referencePortionG, "referencePortionG");
        this.caloriesKcal = Objects.requireNonNull(caloriesKcal, "caloriesKcal");
        this.proteinG = Objects.requireNonNull(proteinG, "proteinG");
        this.carbsG = Objects.requireNonNull(carbsG, "carbsG");
        this.fatG = Objects.requireNonNull(fatG, "fatG");
    }

    // equals/hashCode por id: patrón seguro para entidades JPA (no usar @Data)
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Food other)) return false;
        return id != null && id.equals(other.getId());
    }

    @Override
    public int hashCode() {
        return Food.class.hashCode();
    }
}
