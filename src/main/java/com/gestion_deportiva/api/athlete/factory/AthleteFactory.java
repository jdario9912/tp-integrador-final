package com.gestion_deportiva.api.athlete.factory;

import com.gestion_deportiva.api.athlete.dto.CreateAthleteRequest;
import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.user.factory.UserFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AthleteFactory extends UserFactory<NewAthlete, Athlete> {

    public AthleteFactory(PasswordEncoder passwordEncoder) {
        super(passwordEncoder);
    }

    @Override
    protected String rawPassword(NewAthlete newAthlete) {
        return newAthlete.request().password();
    }

    // El constructor heredado de User normaliza el email
    @Override
    protected Athlete instantiate(NewAthlete newAthlete, String passwordHash) {
        CreateAthleteRequest request = newAthlete.request();
        return Athlete.builder()
                .firstName(request.firstName().trim())
                .lastName(request.lastName().trim())
                .email(request.email())
                .passwordHash(passwordHash)
                .coach(newAthlete.coach())
                .phone(request.phone())
                .sex(request.sex())
                .experienceLevel(request.experienceLevel())
                .birthDate(request.birthDate())
                .heightCm(request.heightCm())
                .initialWeightKg(request.initialWeightKg())
                .goal(request.goal())
                .injuries(request.injuries())
                .limitations(request.limitations())
                .availableDays(request.availableDays())
                .startDate(request.startDate())
                .build();
    }
}
