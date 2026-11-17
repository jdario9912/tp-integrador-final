package com.gestion_deportiva.api.meal.repository;

import com.gestion_deportiva.api.meal.model.Meal;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MealRepository extends JpaRepository<Meal, UUID> {

    // La comida solo si es de ese atleta: la de otro atleta responde igual que una inexistente (404)
    Optional<Meal> findByIdAndAthleteId(UUID id, UUID athleteId);

    // Comidas del día del atleta, en el orden del listado (contrato 11.7): por tipo del catálogo (que es el id) y,
    // dentro de cada tipo, por alta. El id desempata. Los ítems vienen en la misma consulta (sin N+1)
    @EntityGraph(attributePaths = "items")
    @Query("select m from Meal m where m.athlete.id = :athleteId and m.eatenOn = :eatenOn"
            + " order by m.type, m.createdAt, m.id")
    List<Meal> findDay(@Param("athleteId") UUID athleteId, @Param("eatenOn") LocalDate eatenOn);

    // US-24 · Totales del día en una sola consulta (contrato 16.6). Cada ítem se redondea a 2 decimales (HALF_UP, igual
    // que MealItem) y el total suma esos valores. El LEFT JOIN deja una fila por comida sin ítems, con el id del ítem
    // nulo: así se cuentan las comidas (mealCount) y las que no tienen datos nutricionales. Sin comidas, una fila en 0
    @Query(value = """
            select count(distinct m.id) as "mealCount",
                   count(*) filter (where i.id is null) as "mealsWithoutNutrition",
                   coalesce(sum(round(i.quantity_g * i.ref_calories_kcal / i.ref_portion_g, 2)), 0.00) as "caloriesKcal",
                   coalesce(sum(round(i.quantity_g * i.ref_protein_g / i.ref_portion_g, 2)), 0.00) as "proteinG",
                   coalesce(sum(round(i.quantity_g * i.ref_carbs_g / i.ref_portion_g, 2)), 0.00) as "carbsG",
                   coalesce(sum(round(i.quantity_g * i.ref_fat_g / i.ref_portion_g, 2)), 0.00) as "fatG"
            from meals m
            left join meal_items i on i.meal_id = m.id
            where m.athlete_id = :athleteId and m.eaten_on = :eatenOn
            """, nativeQuery = true)
    MealDayTotals sumDay(@Param("athleteId") UUID athleteId, @Param("eatenOn") LocalDate eatenOn);

    // US-25 · Los mismos totales que sumDay, uno por día del rango (inclusivo), en orden de fecha. Solo trae los días
    // con comidas: el service completa los demás en cero
    @Query(value = """
            select m.eaten_on as "date",
                   count(distinct m.id) as "mealCount",
                   count(*) filter (where i.id is null) as "mealsWithoutNutrition",
                   coalesce(sum(round(i.quantity_g * i.ref_calories_kcal / i.ref_portion_g, 2)), 0.00) as "caloriesKcal",
                   coalesce(sum(round(i.quantity_g * i.ref_protein_g / i.ref_portion_g, 2)), 0.00) as "proteinG",
                   coalesce(sum(round(i.quantity_g * i.ref_carbs_g / i.ref_portion_g, 2)), 0.00) as "carbsG",
                   coalesce(sum(round(i.quantity_g * i.ref_fat_g / i.ref_portion_g, 2)), 0.00) as "fatG"
            from meals m
            left join meal_items i on i.meal_id = m.id
            where m.athlete_id = :athleteId and m.eaten_on between :from and :to
            group by m.eaten_on
            order by m.eaten_on
            """, nativeQuery = true)
    List<MealDateTotals> sumRange(@Param("athleteId") UUID athleteId, @Param("from") LocalDate from,
                                  @Param("to") LocalDate to);
}
