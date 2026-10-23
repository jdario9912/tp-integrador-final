package com.gestion_deportiva.api.coach.service;

import com.gestion_deportiva.api.coach.dto.CoachResponse;
import com.gestion_deportiva.api.coach.dto.RegisterCoachRequest;
import com.gestion_deportiva.api.coach.factory.CoachFactory;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.coach.repository.CoachRepository;
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
import org.springframework.security.crypto.password.PasswordEncoder;

import static com.gestion_deportiva.api.support.IdentityFixtures.PASSWORD_HASH;
import static com.gestion_deportiva.api.support.IdentityFixtures.RAW_PASSWORD;
import static com.gestion_deportiva.api.support.IdentityFixtures.registerCoachRequest;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CoachServiceTest {

    @Mock
    private CoachRepository coachRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    private CoachService coachService;

    @BeforeEach
    void setUp() {
        coachService = new CoachService(coachRepository, userRepository, new CoachFactory(passwordEncoder));
    }

    @Test
    void shouldRegisterCoachWithHashedPasswordAndProfile() {
        // Arrange
        RegisterCoachRequest request = registerCoachRequest("ana@test.com");
        when(userRepository.existsByEmail("ana@test.com")).thenReturn(false);
        when(passwordEncoder.encode(RAW_PASSWORD)).thenReturn(PASSWORD_HASH);
        when(coachRepository.saveAndFlush(any(Coach.class))).thenAnswer(inv -> inv.getArgument(0));

        // Act
        CoachResponse response = coachService.register(request);

        // Assert
        Coach saved = captureSavedCoach();
        assertEquals(Role.COACH, saved.getRole());
        assertEquals(PASSWORD_HASH, saved.getPasswordHash());
        assertEquals("Ana", saved.getFirstName());
        assertEquals("Paz", saved.getLastName());
        assertEquals(request.phone(), saved.getPhone());
        assertEquals(request.specialty(), saved.getSpecialty());
        assertEquals(request.licenseNumber(), saved.getLicenseNumber());
        assertEquals(request.bio(), saved.getBio());
        assertEquals("ana@test.com", response.email());
        assertEquals(request.specialty(), response.specialty());
    }

    @Test
    void shouldNormalizeEmailAndTrimNames() {
        // Arrange
        RegisterCoachRequest request = new RegisterCoachRequest("  Ana ", " Paz  ", "  Ana@Test.COM ",
                RAW_PASSWORD, null, null, null, null);
        when(userRepository.existsByEmail("ana@test.com")).thenReturn(false);
        when(passwordEncoder.encode(RAW_PASSWORD)).thenReturn(PASSWORD_HASH);
        when(coachRepository.saveAndFlush(any(Coach.class))).thenAnswer(inv -> inv.getArgument(0));

        // Act
        coachService.register(request);

        // Assert
        Coach saved = captureSavedCoach();
        assertEquals("ana@test.com", saved.getEmail());
        assertEquals("Ana", saved.getFirstName());
        assertEquals("Paz", saved.getLastName());
    }

    @Test
    void shouldRegisterCoachWithoutOptionalFields() {
        // Arrange
        RegisterCoachRequest request = new RegisterCoachRequest("Ana", "Paz", "ana@test.com",
                RAW_PASSWORD, null, null, null, null);
        when(passwordEncoder.encode(RAW_PASSWORD)).thenReturn(PASSWORD_HASH);
        when(coachRepository.saveAndFlush(any(Coach.class))).thenAnswer(inv -> inv.getArgument(0));

        // Act
        CoachResponse response = coachService.register(request);

        // Assert
        assertNull(response.phone());
        assertNull(response.specialty());
        assertNull(response.licenseNumber());
        assertNull(response.bio());
    }

    @Test
    void shouldThrowWhenEmailAlreadyRegistered() {
        // Arrange
        when(passwordEncoder.encode(RAW_PASSWORD)).thenReturn(PASSWORD_HASH);
        when(userRepository.existsByEmail("ana@test.com")).thenReturn(true);

        // Act
        EmailAlreadyRegisteredException ex = assertThrows(EmailAlreadyRegisteredException.class,
                () -> coachService.register(registerCoachRequest("ANA@test.com")));

        // Assert
        assertEquals("ana@test.com", ex.getEmail());
        verify(coachRepository, never()).saveAndFlush(any());
    }

    @Test
    void shouldPropagateDataIntegrityViolationToTheGlobalHandler() {
        // Arrange: otro registro con el mismo email ganó la carrera entre el chequeo y el insert
        DataIntegrityViolationException cause = new DataIntegrityViolationException("ux_users_email");
        when(userRepository.existsByEmail("ana@test.com")).thenReturn(false);
        when(passwordEncoder.encode(RAW_PASSWORD)).thenReturn(PASSWORD_HASH);
        when(coachRepository.saveAndFlush(any(Coach.class))).thenThrow(cause);

        // Act
        DataIntegrityViolationException ex = assertThrows(DataIntegrityViolationException.class,
                () -> coachService.register(registerCoachRequest("ana@test.com")));

        // Assert
        assertSame(cause, ex);
    }

    private Coach captureSavedCoach() {
        ArgumentCaptor<Coach> captor = ArgumentCaptor.forClass(Coach.class);
        verify(coachRepository).saveAndFlush(captor.capture());
        return captor.getValue();
    }
}
