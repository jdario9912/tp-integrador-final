package com.gestion_deportiva.api.athlete.service;

import com.gestion_deportiva.api.athlete.dto.AthleteResponse;
import com.gestion_deportiva.api.athlete.dto.AthleteSearchFilter;
import com.gestion_deportiva.api.athlete.dto.CreateAthleteRequest;
import com.gestion_deportiva.api.athlete.dto.UpdateAthleteRequest;
import com.gestion_deportiva.api.athlete.exception.AthleteNotFoundException;
import com.gestion_deportiva.api.athlete.factory.AthleteFactory;
import com.gestion_deportiva.api.athlete.factory.NewAthlete;
import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.athlete.repository.AthleteRepository;
import com.gestion_deportiva.api.auth.repository.RefreshTokenRepository;
import com.gestion_deportiva.api.coach.exception.CoachNotFoundException;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.coach.repository.CoachRepository;
import com.gestion_deportiva.api.common.pagination.PageResponse;
import com.gestion_deportiva.api.common.security.AuthenticatedUser;
import com.gestion_deportiva.api.user.exception.EmailAlreadyRegisteredException;
import com.gestion_deportiva.api.user.model.User;
import com.gestion_deportiva.api.user.model.enums.Role;
import com.gestion_deportiva.api.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.UUID;

import static com.gestion_deportiva.api.athlete.repository.AthleteSpecifications.belongsToCoach;
import static com.gestion_deportiva.api.athlete.repository.AthleteSpecifications.goalContains;
import static com.gestion_deportiva.api.athlete.repository.AthleteSpecifications.nameContains;

@Service
@RequiredArgsConstructor
public class AthleteService {

    // Orden fijo del listado: el "sort" del cliente se ignora para no ordenar por campos internos
    // (ej. passwordHash) ni responder 500 por una propiedad inexistente. El id desempata para que la
    // paginación sea estable
    static final Sort MY_ATHLETES_SORT = Sort.by("lastName", "firstName", "id");

    private final AthleteRepository athleteRepository;
    private final CoachRepository coachRepository;
    private final UserRepository userRepository;
    private final AthleteFactory athleteFactory;
    private final AthleteAccessGuard athleteAccessGuard;
    private final RefreshTokenRepository refreshTokenRepository;
    private final Clock clock;

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

    // "Mis atletas" (US-08): la consulta filtra siempre por el entrenador autenticado, así que no hace falta
    // AthleteAccessGuard. Los atletas desvinculados no aparecen
    @Transactional(readOnly = true)
    public PageResponse<AthleteResponse> findMyAthletes(UUID coachId, AthleteSearchFilter filter, Pageable pageable) {
        Specification<Athlete> spec = Specification.allOf(
                belongsToCoach(coachId),
                nameContains(filter.name()),
                goalContains(filter.goal()));
        Pageable page = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), MY_ATHLETES_SORT);
        // AthleteResponse solo lee el id del coach (proxy LAZY): no dispara una consulta por atleta
        return PageResponse.from(athleteRepository.findAll(spec, page).map(AthleteResponse::from));
    }

    // Edición completa (US-07). El email sigue siendo único en toda la tabla users
    @Transactional
    public AthleteResponse update(UUID coachId, UUID athleteId, UpdateAthleteRequest request) {
        Athlete athlete = findOwnedAthlete(coachId, athleteId);

        // Solo se consulta si cambia: el propio email (en otras mayúsculas) no es un duplicado
        String email = User.normalizeEmail(request.email());
        if (!email.equals(athlete.getEmail()) && userRepository.existsByEmail(email)) {
            throw new EmailAlreadyRegisteredException(email);
        }

        athlete.setFirstName(request.firstName().trim());
        athlete.setLastName(request.lastName().trim());
        athlete.changeEmail(email);
        athlete.setPhone(request.phone());
        athlete.setSex(request.sex());
        athlete.setExperienceLevel(request.experienceLevel());
        athlete.setBirthDate(request.birthDate());
        athlete.setHeightCm(request.heightCm());
        athlete.setInitialWeightKg(request.initialWeightKg());
        athlete.setGoal(request.goal());
        athlete.setInjuries(request.injuries());
        athlete.setLimitations(request.limitations());
        athlete.setAvailableDays(request.availableDays());
        athlete.setStartDate(request.startDate());

        // saveAndFlush: igual que en create, una carrera contra ux_users_email sale como
        // DataIntegrityViolationException y la resuelve el GlobalExceptionHandler
        return AthleteResponse.from(athleteRepository.saveAndFlush(athlete));
    }

    // Un atleta desactivado no puede iniciar sesión ni refrescar su sesión (lo controla AuthService).
    // Sigue vinculado y en el listado del entrenador, que lo puede reactivar. Idempotente
    @Transactional
    public AthleteResponse deactivate(UUID coachId, UUID athleteId) {
        Athlete athlete = findOwnedAthlete(coachId, athleteId);
        athlete.deactivate();
        return AthleteResponse.from(athleteRepository.saveAndFlush(athlete));
    }

    @Transactional
    public AthleteResponse reactivate(UUID coachId, UUID athleteId) {
        Athlete athlete = findOwnedAthlete(coachId, athleteId);
        athlete.reactivate();
        return AthleteResponse.from(athleteRepository.saveAndFlush(athlete));
    }

    // Baja lógica del vínculo (US-07): el atleta y su historial quedan en la base, pero deja de pertenecerle
    // al entrenador (sale de "Mis atletas" y AthleteAccessGuard le responde 403). La cuenta del atleta no cambia
    @Transactional
    public void unlink(UUID coachId, UUID athleteId) {
        Athlete athlete = findOwnedAthlete(coachId, athleteId);
        athlete.unassignCoach();
        athleteRepository.saveAndFlush(athlete);
    }

    // Baja lógica (US-07): la fila y su historial quedan en la base, pero el atleta deja de existir para la
    // aplicación (@SQLRestriction de User): sale de "Mis atletas", la consulta por id responde 404, no puede
    // iniciar sesión y su email queda libre. Se borran sus refresh tokens para cortar la sesión abierta
    @Transactional
    public void delete(UUID coachId, UUID athleteId) {
        Athlete athlete = findOwnedAthlete(coachId, athleteId);
        athlete.markDeleted(clock.instant());
        athleteRepository.saveAndFlush(athlete);
        refreshTokenRepository.deleteAllByUserId(athleteId);
    }

    // Recibe el id del entrenador y no un AuthenticatedUser: estas operaciones son solo de entrenadores, así que
    // un atleta nunca pasa la verificación aunque se cambie la regla de SecurityConfig
    private Athlete findOwnedAthlete(UUID coachId, UUID athleteId) {
        athleteAccessGuard.verifyAccess(new AuthenticatedUser(coachId, Role.COACH), athleteId);
        // orElseThrow: cubre que lo borren entre la verificación y la consulta
        return athleteRepository.findById(athleteId)
                .orElseThrow(() -> new AthleteNotFoundException(athleteId));
    }
}
