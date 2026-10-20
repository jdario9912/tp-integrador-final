package com.gestion_deportiva.api.athlete.model;

import com.gestion_deportiva.api.athlete.model.enums.AthleteStatus;
import com.gestion_deportiva.api.athlete.model.enums.ExperienceLevel;
import com.gestion_deportiva.api.athlete.model.enums.Sex;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.user.model.User;
import com.gestion_deportiva.api.user.model.enums.Role;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrimaryKeyJoinColumn;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Period;
import java.util.Objects;
import java.util.OptionalInt;

@Entity
@Table(name = "athletes")
@PrimaryKeyJoinColumn(name = "user_id")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Athlete extends User {

    // Puede quedar en null si el atleta se desvincula (US-07)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "coach_id")
    private Coach coach;

    // Los enums se guardan como id (smallint) gracias a los converters con autoApply
    @Setter
    @Column(name = "sex_id")
    private Sex sex;

    @Setter
    @Column(name = "experience_level_id")
    private ExperienceLevel experienceLevel;

    @Column(name = "status_id", nullable = false)
    private AthleteStatus status = AthleteStatus.ACTIVE;

    @Setter
    @Column(name = "birth_date")
    private LocalDate birthDate;

    @Setter
    @Column(name = "height_cm", precision = 5, scale = 2)
    private BigDecimal heightCm;

    @Setter
    @Column(name = "initial_weight_kg", precision = 5, scale = 2)
    private BigDecimal initialWeightKg;

    @Setter
    @Column(length = 255)
    private String goal;

    @Setter
    @Column(length = 500)
    private String injuries;

    @Setter
    @Column(length = 500)
    private String limitations;

    @Column(name = "available_days")
    private Short availableDays;

    @Setter
    @Column(name = "start_date")
    private LocalDate startDate;

    public Athlete(String firstName, String lastName, String email, String passwordHash, Coach coach) {
        super(Role.ATHLETE, firstName, lastName, email, passwordHash);
        this.coach = coach;
    }

    public void assignCoach(Coach newCoach) {
        this.coach = Objects.requireNonNull(newCoach, "coach");
    }

    public void unassignCoach() {
        this.coach = null;
    }

    public void changeStatus(AthleteStatus newStatus) {
        this.status = Objects.requireNonNull(newStatus, "status");
    }

    // Misma regla que el CHECK de la base: entre 1 y 7 (o sin dato)
    public void setAvailableDays(Short days) {
        if (days != null && (days < 1 || days > 7)) {
            throw new IllegalArgumentException("availableDays debe estar entre 1 y 7: " + days);
        }
        this.availableDays = days;
    }

    // Edad en años a la fecha indicada; vacío si no se cargó la fecha de nacimiento
    public OptionalInt age(LocalDate today) {
        if (birthDate == null) return OptionalInt.empty();
        return OptionalInt.of(Period.between(birthDate, today).getYears());
    }
}
