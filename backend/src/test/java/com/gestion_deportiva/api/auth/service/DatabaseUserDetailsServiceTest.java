package com.gestion_deportiva.api.auth.service;

import com.gestion_deportiva.api.athlete.model.Athlete;
import com.gestion_deportiva.api.auth.security.AuthenticatedUser;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.user.model.User;
import com.gestion_deportiva.api.user.model.enums.Role;
import com.gestion_deportiva.api.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import static com.gestion_deportiva.api.support.IdentityFixtures.PASSWORD_HASH;
import static com.gestion_deportiva.api.support.IdentityFixtures.athlete;
import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DatabaseUserDetailsServiceTest {

    @Mock
    private UserRepository userRepository;

    private DatabaseUserDetailsService userDetailsService;

    @BeforeEach
    void setUp() {
        userDetailsService = new DatabaseUserDetailsService(userRepository);
    }

    @Test
    void shouldLoadCoachAsAuthenticatedUserWithCoachRole() {
        // Arrange
        Coach coach = withId(coach("ana@test.com"));
        when(userRepository.findByEmail("ana@test.com")).thenReturn(Optional.of(coach));

        // Act
        UserDetails details = userDetailsService.loadUserByUsername("ana@test.com");

        // Assert
        AuthenticatedUser user = assertInstanceOf(AuthenticatedUser.class, details);
        assertEquals(coach.getId(), user.getId());
        assertEquals(Role.COACH, user.getRole());
        assertEquals("ana@test.com", user.getUsername());
        assertEquals(PASSWORD_HASH, user.getPassword());
        assertEquals(Set.of("ROLE_COACH"), authorities(user));
        assertTrue(user.isEnabled());
    }

    @Test
    void shouldLoadAthleteWithAthleteRole() {
        // Arrange
        Athlete athlete = withId(athlete("leo@test.com", null));
        when(userRepository.findByEmail("leo@test.com")).thenReturn(Optional.of(athlete));

        // Act
        UserDetails details = userDetailsService.loadUserByUsername("leo@test.com");

        // Assert
        assertEquals(Set.of("ROLE_ATHLETE"), authorities(details));
    }

    @Test
    void shouldTrimEmailBeforeSearching() {
        // Arrange
        when(userRepository.findByEmail("ana@test.com")).thenReturn(Optional.of(withId(coach("ana@test.com"))));

        // Act
        UserDetails details = userDetailsService.loadUserByUsername("  ana@test.com ");

        // Assert
        assertEquals("ana@test.com", details.getUsername());
    }

    @Test
    void shouldThrowWhenEmailIsNotRegistered() {
        // Arrange
        when(userRepository.findByEmail("nadie@test.com")).thenReturn(Optional.empty());

        // Act + Assert
        assertThrows(UsernameNotFoundException.class,
                () -> userDetailsService.loadUserByUsername("nadie@test.com"));
    }

    @Test
    void shouldMarkInactiveUserAsDisabled() {
        // Arrange
        Coach coach = withId(coach("ana@test.com"));
        coach.deactivate();
        when(userRepository.findByEmail("ana@test.com")).thenReturn(Optional.of(coach));

        // Act
        UserDetails details = userDetailsService.loadUserByUsername("ana@test.com");

        // Assert
        assertFalse(details.isEnabled());
    }

    @Test
    void shouldEraseThePasswordHashAfterAuthentication() {
        // Arrange
        when(userRepository.findByEmail("ana@test.com")).thenReturn(Optional.of(withId(coach("ana@test.com"))));
        AuthenticatedUser user = (AuthenticatedUser) userDetailsService.loadUserByUsername("ana@test.com");

        // Act
        user.eraseCredentials();

        // Assert
        assertNull(user.getPassword());
    }

    // El id lo genera JPA al persistir: en un test unitario se fija a mano
    private static <T extends User> T withId(T user) {
        ReflectionTestUtils.setField(user, "id", UUID.randomUUID());
        return user;
    }

    private static Set<String> authorities(UserDetails details) {
        return details.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toSet());
    }
}
