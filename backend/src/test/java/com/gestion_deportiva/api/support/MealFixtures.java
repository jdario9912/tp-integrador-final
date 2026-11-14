package com.gestion_deportiva.api.support;

import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.food.model.Food;
import com.gestion_deportiva.api.meal.dto.MealItemRequest;
import com.gestion_deportiva.api.meal.dto.MealRequest;
import com.gestion_deportiva.api.meal.model.Meal;
import com.gestion_deportiva.api.meal.model.MealItem;
import com.gestion_deportiva.api.meal.model.enums.MealType;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

// Datos de prueba reutilizables para las comidas (US-23). Los alimentos llevan id (como si vinieran de la base),
// porque la copia del ítem guarda el id del alimento
public final class MealFixtures {

    // Momento del alta de las comidas armadas con meal(...)
    public static final Instant CREATED_AT = Instant.parse("2026-11-01T12:00:00Z");

    // Fecha pasada fija: nunca es futura, corra cuando corra el test
    public static final LocalDate DATE = LocalDate.of(2026, 1, 10);

    private MealFixtures() {
    }

    // Alimento con id, como si ya estuviera en el catálogo. Los valores son por porción de referencia
    public static Food food(String name, String referencePortionG, String caloriesKcal, String proteinG,
                            String carbsG, String fatG) {
        Food food = Food.builder()
                .name(name)
                .referencePortionG(new BigDecimal(referencePortionG))
                .caloriesKcal(new BigDecimal(caloriesKcal))
                .proteinG(new BigDecimal(proteinG))
                .carbsG(new BigDecimal(carbsG))
                .fatG(new BigDecimal(fatG))
                .build();
        ReflectionTestUtils.setField(food, "id", UUID.randomUUID());
        return food;
    }

    // Pechuga de pollo por 100 g (valores del contrato 11.8)
    public static Food chicken() {
        return food("Pechuga de pollo cocida", "100", "165", "31", "0", "3.6");
    }

    // Arroz blanco cocido por 100 g (valores del contrato 11.8)
    public static Food rice() {
        return food("Arroz blanco cocido", "100", "130", "2.7", "28", "0.3");
    }

    public static MealItem item(Food food, String quantityG) {
        return MealItem.of(food, new BigDecimal(quantityG));
    }

    public static Meal meal(Athlete athlete, LocalDate date, MealType type, String description, MealItem... items) {
        return new Meal(athlete, date, type, description, List.of(items), CREATED_AT);
    }

    public static MealItemRequest itemRequest(UUID foodId, String quantityG) {
        return new MealItemRequest(foodId, quantityG == null ? null : new BigDecimal(quantityG));
    }

    // Request válido con descripción e ítems (los que se pasen)
    public static MealRequest mealRequest(LocalDate date, MealType type, String description,
                                          MealItemRequest... items) {
        return new MealRequest(date, type, description, List.of(items));
    }

    // Almuerzo con pollo (150 g) y arroz (200 g): 507.50 kcal en total
    public static MealRequest lunchRequest(LocalDate date, UUID chickenId, UUID riceId) {
        return mealRequest(date, MealType.LUNCH, null, itemRequest(chickenId, "150"), itemRequest(riceId, "200"));
    }
}
