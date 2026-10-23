package com.gestion_deportiva.api.coach.service;

import com.gestion_deportiva.api.coach.dto.CoachResponse;
import com.gestion_deportiva.api.coach.dto.RegisterCoachRequest;
import com.gestion_deportiva.api.coach.factory.CoachFactory;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.coach.repository.CoachRepository;
import com.gestion_deportiva.api.user.exception.EmailAlreadyRegisteredException;
import com.gestion_deportiva.api.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CoachService {

    private final CoachRepository coachRepository;
    private final UserRepository userRepository;
    private final CoachFactory coachFactory;

    // Transaccional: users y coaches se insertan juntos o no se inserta ninguno
    @Transactional
    public CoachResponse register(RegisterCoachRequest request) {
        Coach coach = coachFactory.create(request);

        // Chequeo global en users: un entrenador no puede usar el email de un atleta
        if (userRepository.existsByEmail(coach.getEmail())) {
            throw new EmailAlreadyRegisteredException(coach.getEmail());
        }

        // saveAndFlush ejecuta el INSERT acá: si dos registros simultáneos chocan contra ux_users_email,
        // la DataIntegrityViolationException sale de este método y la resuelve el GlobalExceptionHandler
        return CoachResponse.from(coachRepository.saveAndFlush(coach));
    }
}
