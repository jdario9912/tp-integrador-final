package com.gestion_deportiva.api.meal.model;

import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.meal.model.enums.MealType;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

// Comida del atleta en un día (US-23): tipo, descripción y/o alimentos con cantidades. Una comida no tiene estado:
// se edita (reemplaza todo, incluidos los ítems) o se borra (con sus ítems). Los timestamps los fija quien crea o
// edita la comida con el reloj de la app (AppClock), igual que los registros de peso
@Entity
@Table(name = "meals")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED) // lo exige JPA
public class Meal {

    public static final int MAX_DESCRIPTION_LENGTH = 500;
    public static final int MAX_ITEMS = 50;
    public static final int MAX_OBSERVATION_LENGTH = 1000;

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // El dueño no cambia después del alta
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "athlete_id", nullable = false, updatable = false)
    private Athlete athlete;

    // El "date" de la API: el día de la comida
    @Column(name = "eaten_on", nullable = false)
    private LocalDate eatenOn;

    // Catálogo meal_types: el converter guarda el id
    @Column(name = "meal_type_id", nullable = false)
    private MealType type;

    // Sin espacios en los extremos; null si no hay (nunca "": ver ck_meals_description)
    @Column(length = MAX_DESCRIPTION_LENGTH)
    private String description;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    // US-25: última revisión del entrenador. null si nunca la revisó o si el atleta la editó después (V16)
    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    // US-25: comentario del entrenador (opcional, hasta 1000 caracteres). Revisar de nuevo lo reemplaza (V16)
    @Column(name = "coach_observation", length = MAX_OBSERVATION_LENGTH)
    private String coachObservation;

    // Los ítems se reemplazan completos al editar y se borran con la comida (contrato 11.11)
    @OneToMany(mappedBy = "meal", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    private List<MealItem> items = new ArrayList<>();

    public Meal(Athlete athlete, LocalDate eatenOn, MealType type, String description, List<MealItem> items,
                Instant createdAt) {
        this.athlete = Objects.requireNonNull(athlete, "athlete");
        changeData(eatenOn, type, description, items);
        this.createdAt = toDatabasePrecision(createdAt, "createdAt");
        this.updatedAt = this.createdAt;
    }

    // Edición completa (PUT): reemplaza fecha, tipo, descripción y todos los ítems. Los ítems que se mantienen en el
    // body también se cargan de nuevo, con la copia del catálogo del momento. US-25: la revisión del entrenador era
    // sobre los datos anteriores, así que se descarta (la comida vuelve a quedar pendiente de revisión)
    public void correct(LocalDate eatenOn, MealType type, String description, List<MealItem> items,
                        Instant correctedAt) {
        changeData(eatenOn, type, description, items);
        this.updatedAt = toDatabasePrecision(correctedAt, "correctedAt");
        this.reviewedAt = null;
        this.coachObservation = null;
    }

    // US-25 · El entrenador revisa la comida. Revisar de nuevo reemplaza el comentario y el instante, sin duplicar
    // nada. El comentario llega ya recortado por el request (null si estaba vacío)
    public void review(Instant reviewedAt, String observation) {
        if (observation != null && observation.length() > MAX_OBSERVATION_LENGTH) {
            throw new IllegalArgumentException("observation admite hasta " + MAX_OBSERVATION_LENGTH + " caracteres");
        }
        this.reviewedAt = toDatabasePrecision(reviewedAt, "reviewedAt");
        this.coachObservation = observation;
    }

    public boolean isReviewed() {
        return reviewedAt != null;
    }

    // Suma de las calorías de los ítems (cada una ya redondeada, así el total coincide con el detalle).
    // Null si no hay ítems: una comida solo con descripción no tiene calorías calculables, no es 0
    public BigDecimal getTotalCaloriesKcal() {
        if (items.isEmpty()) {
            return null;
        }
        return items.stream()
                .map(MealItem::getCaloriesKcal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    // Los ítems en su orden (sort_order); la lista no se puede modificar desde afuera
    public List<MealItem> getItems() {
        return Collections.unmodifiableList(items);
    }

    // Valida antes de tocar nada: si falla, la comida conserva sus datos
    private void changeData(LocalDate newEatenOn, MealType newType, String newDescription,
                            List<MealItem> newItems) {
        Objects.requireNonNull(newEatenOn, "eatenOn");
        Objects.requireNonNull(newType, "type");
        Objects.requireNonNull(newItems, "items");
        String cleanDescription = blankToNull(newDescription);
        if (cleanDescription != null && cleanDescription.length() > MAX_DESCRIPTION_LENGTH) {
            throw new IllegalArgumentException("description admite hasta " + MAX_DESCRIPTION_LENGTH + " caracteres");
        }
        if (newItems.size() > MAX_ITEMS) {
            throw new IllegalArgumentException("Una comida admite hasta " + MAX_ITEMS + " alimentos");
        }
        if (cleanDescription == null && newItems.isEmpty()) {
            throw new IllegalArgumentException("La comida necesita una descripción o al menos un alimento");
        }

        this.eatenOn = newEatenOn;
        this.type = newType;
        this.description = cleanDescription;
        replaceItems(newItems);
    }

    private void replaceItems(List<MealItem> newItems) {
        items.clear();
        for (short order = 0; order < newItems.size(); order++) {
            MealItem item = newItems.get(order);
            item.attachTo(this, order);
            items.add(item);
        }
    }

    private static String blankToNull(String text) {
        return text == null || text.isBlank() ? null : text.trim();
    }

    // timestamptz guarda microsegundos: con la misma precisión, la respuesta del alta coincide con la del listado
    private static Instant toDatabasePrecision(Instant instant, String name) {
        return Objects.requireNonNull(instant, name).truncatedTo(ChronoUnit.MICROS);
    }

    // equals/hashCode por id: patrón seguro para entidades JPA (no usar @Data)
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Meal other)) return false;
        return id != null && id.equals(other.getId());
    }

    @Override
    public int hashCode() {
        return Meal.class.hashCode();
    }
}
