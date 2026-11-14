package com.gestion_deportiva.api.meal.model;

import com.gestion_deportiva.api.food.model.Food;
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

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Objects;
import java.util.UUID;

// Alimento de una comida con la cantidad consumida (US-23). Al cargarlo copia el nombre y los valores de referencia
// del alimento en ese momento (contrato 11.8): el historial no cambia si después se corrige el catálogo. Las
// calorías y los macros del ítem salen de esa copia: cantidad × valor de referencia / porción de referencia, con
// HALF_UP a 2 decimales en cada ítem. No se guardan: son un cálculo
@Entity
@Table(name = "meal_items")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED) // lo exige JPA
public class MealItem {

    // Mismos límites que el CHECK de la base y la validación del request: hasta 5 enteros y 2 decimales
    public static final BigDecimal MAX_QUANTITY_G = new BigDecimal("99999.99");
    private static final int SCALE = 2;

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // La comida dueña del ítem. Lo fija Meal al reemplazar sus ítems (attachTo)
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "meal_id", nullable = false, updatable = false)
    private Meal meal;

    // Posición dentro de la comida (0, 1, 2...): el orden en que se cargaron
    @Column(name = "sort_order", nullable = false)
    private short sortOrder;

    // Alimento de origen del catálogo (US-39). Sin FK en el mapeo: la FK está en la base
    @Column(name = "food_id", nullable = false, updatable = false)
    private UUID foodId;

    @Column(name = "food_name", nullable = false, length = 100)
    private String foodName;

    @Column(name = "quantity_g", nullable = false, precision = 7, scale = 2)
    private BigDecimal quantityG;

    @Column(name = "ref_portion_g", nullable = false, precision = 7, scale = 2)
    private BigDecimal refPortionG;

    @Column(name = "ref_calories_kcal", nullable = false, precision = 7, scale = 2)
    private BigDecimal refCaloriesKcal;

    @Column(name = "ref_protein_g", nullable = false, precision = 7, scale = 2)
    private BigDecimal refProteinG;

    @Column(name = "ref_carbs_g", nullable = false, precision = 7, scale = 2)
    private BigDecimal refCarbsG;

    @Column(name = "ref_fat_g", nullable = false, precision = 7, scale = 2)
    private BigDecimal refFatG;

    // Ítem nuevo con la copia del alimento tal como está ahora en el catálogo
    public static MealItem of(Food food, BigDecimal quantityG) {
        Objects.requireNonNull(food, "food");
        MealItem item = new MealItem();
        item.foodId = food.getId();
        item.foodName = food.getName();
        item.refPortionG = scale(food.getReferencePortionG(), "referencePortionG");
        item.refCaloriesKcal = scale(food.getCaloriesKcal(), "caloriesKcal");
        item.refProteinG = scale(food.getProteinG(), "proteinG");
        item.refCarbsG = scale(food.getCarbsG(), "carbsG");
        item.refFatG = scale(food.getFatG(), "fatG");
        item.quantityG = requireValidQuantity(quantityG);
        return item;
    }

    // Lo llama Meal al reemplazar sus ítems: la posición es la de la lista
    void attachTo(Meal meal, short sortOrder) {
        this.meal = meal;
        this.sortOrder = sortOrder;
    }

    // Calorías del ítem para la cantidad cargada (contrato 11.8)
    public BigDecimal getCaloriesKcal() {
        return valueFor(refCaloriesKcal);
    }

    public BigDecimal getProteinG() {
        return valueFor(refProteinG);
    }

    public BigDecimal getCarbsG() {
        return valueFor(refCarbsG);
    }

    public BigDecimal getFatG() {
        return valueFor(refFatG);
    }

    private BigDecimal valueFor(BigDecimal referenceValue) {
        return quantityG.multiply(referenceValue).divide(refPortionG, SCALE, RoundingMode.HALF_UP);
    }

    // Siempre con escala 2 (150 pasa a 150.00), igual que lo devuelve la base
    private static BigDecimal scale(BigDecimal value, String name) {
        return Objects.requireNonNull(value, name).setScale(SCALE, RoundingMode.UNNECESSARY);
    }

    private static BigDecimal requireValidQuantity(BigDecimal quantityG) {
        Objects.requireNonNull(quantityG, "quantityG");
        if (quantityG.signum() <= 0 || quantityG.compareTo(MAX_QUANTITY_G) > 0) {
            throw new IllegalArgumentException("quantityG debe ser mayor a 0 y hasta 99999.99: " + quantityG);
        }
        // Sin redondeos silenciosos: numeric(7,2) redondearía 150.555 a 150.56
        if (quantityG.stripTrailingZeros().scale() > SCALE) {
            throw new IllegalArgumentException("quantityG admite hasta 2 decimales: " + quantityG);
        }
        return quantityG.setScale(SCALE, RoundingMode.UNNECESSARY);
    }

    // equals/hashCode por id: patrón seguro para entidades JPA (no usar @Data)
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof MealItem other)) return false;
        return id != null && id.equals(other.getId());
    }

    @Override
    public int hashCode() {
        return MealItem.class.hashCode();
    }
}
