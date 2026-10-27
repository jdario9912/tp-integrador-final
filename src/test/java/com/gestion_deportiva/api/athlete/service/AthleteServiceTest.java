package com.gestion_deportiva.api.athlete.service;

import com.gestion_deportiva.api.athlete.dto.AthleteResponse;
import com.gestion_deportiva.api.athlete.dto.AthleteSearchFilter;
import com.gestion_deportiva.api.athlete.dto.CreateAthleteRequest;
import com.gestion_deportiva.api.athlete.exception.AthleteAccessDeniedException;
import com.gestion_deportiva.api.athlete.factory.AthleteFactory;
import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.athlete.model.enums.AthleteStatus;
import com.gestion_deportiva.api.athlete.repository.AthleteRepository;
import com.gestion_deportiva.api.coach.exception.CoachNotFoundException;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.coach.repository.CoachRepository;
import com.gestion_deportiva.api.common.pagination.PageResponse;
import com.gestion_deportiva.api.common.security.AuthenticatedUser;
import com.gestion_deportiva.api.user.exception.EmailAlreadyRegisteredException;
import com.gestion_deportiva.api.user.model.enums.Role;
import com.gestion_deportiva.api.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static com.gestion_deportiva.api.support.IdentityFixtures.PASSWORD_HASH;
import static com.gestion_deportiva.api.support.IdentityFixtures.RAW_PASSWORD;
import static com.gestion_deportiva.api.support.IdentityFixtures.athlete;
import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static com.gestion_deportiva.api.support.IdentityFixtures.createAthleteRequest;
import static com.gestion_deportiva.api.support.IdentityFixtures.createAthleteRequestWithOnlyRequired;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AthleteServiceTest {

    private static final UUID COACH_ID = UUID.randomUUID();

    @Mock
    private AthleteRepository athleteRepository;

    @Mock
    private CoachRepository coachRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AthleteAccessGuard athleteAccessGuard;

    private AthleteService athleteService;

    private Coach coach;

    @BeforeEach
    void setUp() {
        athleteService = new AthleteService(athleteRepository, coachRepository, userRepository,
                new AthleteFactory(passwordEncoder), athleteAccessGuard);
        coach = coach("ana@test.com");
    }

    @Test
    void shouldCreateAthleteAssignedToCoachWithHashedPasswordAndProfile() {
        // Arrange
        CreateAthleteRequest request = createAthleteRequest("leo@test.com");
        givenCoachExists();
        when(userRepository.existsByEmail("leo@test.com")).thenReturn(false);
        when(passwordEncoder.encode(RAW_PASSWORD)).thenReturn(PASSWORD_HASH);
        when(athleteRepository.saveAndFlush(any(Athlete.class))).thenAnswer(inv -> inv.getArgument(0));

        // Act
        AthleteResponse response = athleteService.create(COACH_ID, request);

        // Assert
        Athlete saved = captureSavedAthlete();
        assertEquals(Role.ATHLETE, saved.getRole());
        assertEquals(AthleteStatus.ACTIVE, saved.getStatus());
        assertSame(coach, saved.getCoach());
        assertEquals(PASSWORD_HASH, saved.getPasswordHash());
        assertEquals("Leo", saved.getFirstName());
        assertEquals("Gil", saved.getLastName());
        assertEquals(request.phone(), saved.getPhone());
        assertEquals(request.sex(), saved.getSex());
        assertEquals(request.experienceLevel(), saved.getExperienceLevel());
        assertEquals(request.birthDate(), saved.getBirthDate());
        assertEquals(request.heightCm(), saved.getHeightCm());
        assertEquals(request.initialWeightKg(), saved.getInitialWeightKg());
        assertEquals(request.goal(), saved.getGoal());
        assertEquals(request.injuries(), saved.getInjuries());
        assertEquals(request.limitations(), saved.getLimitations());
        assertEquals(request.availableDays(), saved.getAvailableDays());
        assertEquals(request.startDate(), saved.getStartDate());
        assertEquals("leo@test.com", response.email());
        assertEquals(AthleteStatus.ACTIVE, response.status());
        assertEquals(request.goal(), response.goal());
    }

    @Test
    void shouldNormalizeEmailAndTrimNames() {
        // Arrange
        CreateAthleteRequest request = new CreateAthleteRequest("  Leo ", " Gil  ", "  Leo@Test.COM ",
                RAW_PASSWORD, null, null, null, null, null, null, null, null, null, null, null);
        givenCoachExists();
        when(userRepository.existsByEmail("leo@test.com")).thenReturn(false);
        when(passwordEncoder.encode(RAW_PASSWORD)).thenReturn(PASSWORD_HASH);
        when(athleteRepository.saveAndFlush(any(Athlete.class))).thenAnswer(inv -> inv.getArgument(0));

        // Act
        athleteService.create(COACH_ID, request);

        // Assert
        Athlete saved = captureSavedAthlete();
        assertEquals("leo@test.com", saved.getEmail());
        assertEquals("Leo", saved.getFirstName());
        assertEquals("Gil", saved.getLastName());
    }

    @Test
    void shouldCreateAthleteWithoutOptionalFields() {
        // Arrange
        givenCoachExists();
        when(passwordEncoder.encode(RAW_PASSWORD)).thenReturn(PASSWORD_HASH);
        when(athleteRepository.saveAndFlush(any(Athlete.class))).thenAnswer(inv -> inv.getArgument(0));

        // Act
        AthleteResponse response = athleteService.create(COACH_ID,
                createAthleteRequestWithOnlyRequired("leo@test.com", RAW_PASSWORD));

        // Assert
        assertEquals(AthleteStatus.ACTIVE, response.status());
        assertNull(response.phone());
        assertNull(response.sex());
        assertNull(response.experienceLevel());
        assertNull(response.birthDate());
        assertNull(response.heightCm());
        assertNull(response.initialWeightKg());
        assertNull(response.goal());
        assertNull(response.availableDays());
        assertNull(response.startDate());
    }

    @Test
    void shouldThrowWhenEmailAlreadyRegistered() {
        // Arrange
        givenCoachExists();
        when(passwordEncoder.encode(RAW_PASSWORD)).thenReturn(PASSWORD_HASH);
        when(userRepository.existsByEmail("leo@test.com")).thenReturn(true);

        // Act
        EmailAlreadyRegisteredException ex = assertThrows(EmailAlreadyRegisteredException.class,
                () -> athleteService.create(COACH_ID, createAthleteRequest("LEO@test.com")));

        // Assert
        assertEquals("leo@test.com", ex.getEmail());
        verify(athleteRepository, never()).saveAndFlush(any());
    }

    @Test
    void shouldThrowWhenCoachDoesNotExist() {
        // Arrange
        when(coachRepository.findById(COACH_ID)).thenReturn(Optional.empty());

        // Act
        CoachNotFoundException ex = assertThrows(CoachNotFoundException.class,
                () -> athleteService.create(COACH_ID, createAthleteRequest("leo@test.com")));

        // Assert
        assertEquals(COACH_ID, ex.getCoachId());
        assertEquals("No existe el entrenador con id " + COACH_ID, ex.getMessage());
        verifyNoInteractions(athleteRepository, userRepository, passwordEncoder);
    }

    @Test
    void shouldPropagateDataIntegrityViolationToTheGlobalHandler() {
        // Arrange: otra alta con el mismo email ganó la carrera entre el chequeo y el insert
        DataIntegrityViolationException cause = new DataIntegrityViolationException("ux_users_email");
        givenCoachExists();
        when(userRepository.existsByEmail("leo@test.com")).thenReturn(false);
        when(passwordEncoder.encode(RAW_PASSWORD)).thenReturn(PASSWORD_HASH);
        when(athleteRepository.saveAndFlush(any(Athlete.class))).thenThrow(cause);

        // Act
        DataIntegrityViolationException ex = assertThrows(DataIntegrityViolationException.class,
                () -> athleteService.create(COACH_ID, createAthleteRequest("leo@test.com")));

        // Assert
        assertSame(cause, ex);
    }

    // ---------- consulta por id (US-04) ----------

    @Test
    void shouldReturnTheAthleteWhenTheCallerCanAccessIt() {
        // Arrange
        UUID athleteId = UUID.randomUUID();
        AuthenticatedUser caller = new AuthenticatedUser(COACH_ID, Role.COACH);
        when(athleteRepository.findById(athleteId)).thenReturn(Optional.of(athlete("leo@test.com", coach)));

        // Act
        AthleteResponse response = athleteService.findById(caller, athleteId);

        // Assert
        verify(athleteAccessGuard).verifyAccess(caller, athleteId);
        assertEquals("leo@test.com", response.email());
        assertEquals("Leo", response.firstName());
    }

    @Test
    void shouldNotReadTheAthleteWhenTheGuardDeniesAccess() {
        // Arrange
        UUID athleteId = UUID.randomUUID();
        AuthenticatedUser caller = new AuthenticatedUser(UUID.randomUUID(), Role.COACH);
        doThrow(new AthleteAccessDeniedException()).when(athleteAccessGuard).verifyAccess(caller, athleteId);

        // Act + Assert
        assertThrows(AthleteAccessDeniedException.class, () -> athleteService.findById(caller, athleteId));
        verify(athleteRepository, never()).findById(any());
    }

    // ---------- "Mis atletas" (US-08) ----------

    @Test
    @SuppressWarnings("unchecked")
    void shouldListTheCoachsAthletesWithTheFixedSortAndRequestedPage() {
        // Arrange: el cliente pide ordenar por passwordHash; se ignora
        Pageable requested = PageRequest.of(1, 2, Sort.by("passwordHash"));
        Athlete leo = athlete("leo@test.com", coach);
        when(athleteRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenAnswer(inv -> new PageImpl<>(List.of(leo), inv.getArgument(1), 3));

        // Act
        PageResponse<AthleteResponse> response = athleteService.findMyAthletes(COACH_ID,
                new AthleteSearchFilter("leo", null), requested);

        // Assert
        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(athleteRepository).findAll(any(Specification.class), pageable.capture());
        assertEquals(1, pageable.getValue().getPageNumber());
        assertEquals(2, pageable.getValue().getPageSize());
        assertEquals(AthleteService.MY_ATHLETES_SORT, pageable.getValue().getSort());
        assertEquals(1, response.page());
        assertEquals(2, response.size());
        assertEquals(3, response.totalElements());
        assertEquals(2, response.totalPages());
        assertEquals(List.of("leo@test.com"), response.content().stream().map(AthleteResponse::email).toList());
    }

    private void givenCoachExists() {
        when(coachRepository.findById(COACH_ID)).thenReturn(Optional.of(coach));
    }

    private Athlete captureSavedAthlete() {
        ArgumentCaptor<Athlete> captor = ArgumentCaptor.forClass(Athlete.class);
        verify(athleteRepository).saveAndFlush(captor.capture());
        return captor.getValue();
    }
}
