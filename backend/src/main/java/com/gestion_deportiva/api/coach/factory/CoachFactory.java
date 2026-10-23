package com.gestion_deportiva.api.coach.factory;

import com.gestion_deportiva.api.coach.dto.RegisterCoachRequest;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.user.factory.UserFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class CoachFactory extends UserFactory<RegisterCoachRequest, Coach> {

    public CoachFactory(PasswordEncoder passwordEncoder) {
        super(passwordEncoder);
    }

    @Override
    protected String rawPassword(RegisterCoachRequest request) {
        return request.password();
    }

    // El constructor heredado de User normaliza el email
    @Override
    protected Coach instantiate(RegisterCoachRequest request, String passwordHash) {
        return Coach.builder()
                .firstName(request.firstName().trim())
                .lastName(request.lastName().trim())
                .email(request.email())
                .passwordHash(passwordHash)
                .phone(request.phone())
                .specialty(request.specialty())
                .licenseNumber(request.licenseNumber())
                .bio(request.bio())
                .build();
    }
}
