package com.gestion_deportiva.api.coach.model;

import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.user.model.User;
import com.gestion_deportiva.api.user.model.enums.Role;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.PrimaryKeyJoinColumn;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "coaches")
@PrimaryKeyJoinColumn(name = "user_id")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Coach extends User {

    @Column(length = 100)
    private String specialty;

    @Column(name = "license_number", length = 50)
    private String licenseNumber;

    @Column(length = 1000)
    private String bio;

    public Coach(String firstName, String lastName, String email, String passwordHash) {
        super(Role.COACH, firstName, lastName, email, passwordHash);
    }

    // Builder sobre el constructor (no @SuperBuilder): el rol no se expone y se mantienen
    // las validaciones y la normalización del email de User
    @Builder
    private Coach(String firstName, String lastName, String email, String passwordHash,
                  String phone, String specialty, String licenseNumber, String bio) {
        this(firstName, lastName, email, passwordHash);
        setPhone(phone);
        this.specialty = specialty;
        this.licenseNumber = licenseNumber;
        this.bio = bio;
    }

    // Si el atleta pertenece a este entrenador (base de la verificación de pertenencia, US-04)
    public boolean isOwnerOf(Athlete athlete) {
        return athlete != null
                && athlete.getCoach() != null
                && getId() != null
                && getId().equals(athlete.getCoach().getId());
    }
}
