package com.gestion_deportiva.api.athlete.service;

import com.gestion_deportiva.api.athlete.dto.AthleteResponse;
import com.gestion_deportiva.api.athlete.dto.CreateAthleteRequest;
import com.gestion_deportiva.api.athlete.exception.AthleteNotFoundException;
import com.gestion_deportiva.api.athlete.factory.AthleteFactory;
import com.gestion_deportiva.api.athlete.factory.NewAthlete;
import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.athlete.repository.AthleteRepository;
import com.gestion_deportiva.api.coach.exception.CoachNotFoundException;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.coach.repository.CoachRepository;
import com.gestion_deportiva.api.common.security.AuthenticatedUser;
import com.gestion_deportiva.api.user.exception.EmailAlreadyRegisteredException;
import com.gestion_deportiva.api.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AthleteService {

    private final AthleteRepository athleteRepository;
    private final CoachRepository coachRepository;
    private final UserRepository userRepository;
    private final AthleteFactory athleteFactory;
    private final AthleteAccessGuard athleteAccessGuard;

    // Recibe el id del entrenador y no el principal: el service no depende del mecanismo de autenticación.
    // Transaccional: users y athletes se insertan juntos o no se inserta ninguno
    @Transactional
    public AthleteResponse create(UUID coachId, CreateAthleteRequest request) {
        // Con un coach autenticado siempre existe; cubre el caso de que se haya borrado después de autenticarse
        Coach coach = coachRepository.findById(coachId)
                .orElseThrow(() -> new CoachNotFoundException(coachId));

        Athlete athlete = athleteFactory.create(new NewAthlete(request, coach));

        // Chequeo global en users: un atleta no puede usar el email de un entrenador ni de otro atleta
        if (userRepository.existsByEmail(athlete.getEmail())) {
            throw new EmailAlreadyRegisteredException(athlete.getEmail());
        }

        // saveAndFlush ejecuta el INSERT acá: si dos altas simultáneas chocan contra ux_users_email,
        // la DataIntegrityViolationException sale de este método y la resuelve el GlobalExceptionHandler
        return AthleteResponse.from(athleteRepository.saveAndFlush(athlete));
    }

    // La pertenencia se verifica en el service y no solo en el controller (US-04):
    // un entrenador ve solo a sus atletas y un atleta solo a sí mismo
    @Transactional(readOnly = true)
    public AthleteResponse findById(AuthenticatedUser user, UUID athleteId) {
        athleteAccessGuard.verifyAccess(user, athleteId);
        // orElseThrow: cubre que lo borren entre la verificación y la consulta
        return athleteRepository.findById(athleteId)
                .map(AthleteResponse::from)
                .orElseThrow(() -> new AthleteNotFoundException(athleteId));
    }
}
