package com.gestion_deportiva.api.coach.service;

import com.gestion_deportiva.api.coach.dto.CoachResponse;
import com.gestion_deportiva.api.coach.dto.RegisterCoachRequest;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.coach.repository.CoachRepository;
import com.gestion_deportiva.api.user.exception.EmailAlreadyRegisteredException;
import com.gestion_deportiva.api.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CoachService {

    private final CoachRepository coachRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    // Transaccional: users y coaches se insertan juntos o no se inserta ninguno
    @Transactional
    public CoachResponse register(RegisterCoachRequest request) {
        // El constructor heredado de User normaliza el email
        Coach coach = Coach.builder()
                .firstName(request.firstName().trim())
                .lastName(request.lastName().trim())
                .email(request.email())
                .passwordHash(passwordEncoder.encode(request.password()))
                .phone(request.phone())
                .specialty(request.specialty())
                .licenseNumber(request.licenseNumber())
                .bio(request.bio())
                .build();

        // Chequeo global en users: un entrenador no puede usar el email de un atleta
        if (userRepository.existsByEmail(coach.getEmail())) {
            throw new EmailAlreadyRegisteredException(coach.getEmail());
        }

        // saveAndFlush ejecuta el INSERT acá: si dos registros simultáneos chocan contra ux_users_email,
        // la DataIntegrityViolationException sale de este método y la resuelve el GlobalExceptionHandler
        return CoachResponse.from(coachRepository.saveAndFlush(coach));
    }
}
