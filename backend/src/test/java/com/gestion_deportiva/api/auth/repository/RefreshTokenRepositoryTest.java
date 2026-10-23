package com.gestion_deportiva.api.auth.repository;

import com.gestion_deportiva.api.AbstractIntegrationTest;
import com.gestion_deportiva.api.auth.model.RefreshToken;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.coach.repository.CoachRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.Instant;

import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static com.gestion_deportiva.api.support.IdentityFixtures.refreshToken;
import static com.gestion_deportiva.api.support.IdentityFixtures.tokenHash;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RefreshTokenRepositoryTest extends AbstractIntegrationTest {

    private static final Instant NOW = Instant.parse("2026-10-13T10:00:00Z");

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private CoachRepository coachRepository;

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void findByTokenHash() {
        Coach coach = coachRepository.saveAndFlush(coach("ana@test.com"));
        RefreshToken saved = refreshTokenRepository.saveAndFlush(refreshToken(coach, 'a', NOW));

        RefreshToken found = refreshTokenRepository.findByTokenHash(tokenHash('a')).orElseThrow();
        assertEquals(saved.getId(), found.getId());
        assertEquals(coach.getId(), found.getUser().getId());
        assertTrue(refreshTokenRepository.findByTokenHash(tokenHash('z')).isEmpty());
    }

    @Test
    void duplicateTokenHashIsRejected() {
        Coach coach = coachRepository.saveAndFlush(coach("ana@test.com"));
        refreshTokenRepository.saveAndFlush(refreshToken(coach, 'a', NOW));

        assertThrows(DataIntegrityViolationException.class,
                () -> refreshTokenRepository.saveAndFlush(refreshToken(coach, 'a', NOW)));
    }

    @Test
    void revokeAllByUserIdRevokesOnlyThatUsersActiveTokens() {
        Coach ana = coachRepository.saveAndFlush(coach("ana@test.com"));
        Coach bruno = coachRepository.saveAndFlush(coach("bruno@test.com"));
        refreshTokenRepository.saveAndFlush(refreshToken(ana, 'a', NOW));
        refreshTokenRepository.saveAndFlush(refreshToken(ana, 'b', NOW));
        RefreshToken alreadyRevoked = refreshToken(ana, 'c', NOW);
        alreadyRevoked.revoke();
        refreshTokenRepository.saveAndFlush(alreadyRevoked);
        refreshTokenRepository.saveAndFlush(refreshToken(bruno, 'd', NOW));

        int revoked = refreshTokenRepository.revokeAllByUserId(ana.getId());

        assertEquals(2, revoked); // el que ya estaba revocado no cuenta
        assertEquals(0, countActive(ana));
        assertEquals(1, countActive(bruno));
    }

    @Test
    void expirationBeforeIssueIsRejectedByTheDatabase() {
        Coach coach = coachRepository.saveAndFlush(coach("ana@test.com"));

        assertThrows(DataIntegrityViolationException.class, () -> jdbc.update(
                "insert into refresh_tokens (user_id, token_hash, expires_at) values (?, ?, now() - interval '1 day')",
                coach.getId(), tokenHash('x')));
    }

    @Test
    void deletingTheUserDeletesItsTokens() {
        Coach coach = coachRepository.saveAndFlush(coach("ana@test.com"));
        refreshTokenRepository.saveAndFlush(refreshToken(coach, 'a', NOW));

        jdbc.update("delete from users where id = ?", coach.getId());

        Integer remaining = jdbc.queryForObject(
                "select count(*) from refresh_tokens where user_id = ?", Integer.class, coach.getId());
        assertEquals(0, remaining == null ? 0 : remaining.intValue());
    }

    @Test
    void deleteAllByUserIdDeletesOnlyThatUsersTokens() {
        // Arrange
        Coach ana = coachRepository.saveAndFlush(coach("ana@test.com"));
        Coach bruno = coachRepository.saveAndFlush(coach("bruno@test.com"));
        refreshTokenRepository.saveAndFlush(refreshToken(ana, 'a', NOW));
        refreshTokenRepository.saveAndFlush(refreshToken(ana, 'b', NOW));
        refreshTokenRepository.saveAndFlush(refreshToken(bruno, 'c', NOW));

        // Act
        int deleted = refreshTokenRepository.deleteAllByUserId(ana.getId());

        // Assert
        assertEquals(2, deleted);
        assertEquals(0, countTokens(ana));
        assertEquals(1, countTokens(bruno));
    }

    // Base del reclamo atómico del refresh: el segundo borrado del mismo token no afecta filas
    @Test
    void deleteOneReportsWhetherTheTokenStillExisted() {
        // Arrange
        Coach coach = coachRepository.saveAndFlush(coach("ana@test.com"));
        RefreshToken token = refreshTokenRepository.saveAndFlush(refreshToken(coach, 'a', NOW));

        // Act + Assert
        assertEquals(1, refreshTokenRepository.deleteOne(token.getId()));
        assertEquals(0, refreshTokenRepository.deleteOne(token.getId()));
        assertEquals(0, countTokens(coach));
    }

    private int countTokens(Coach user) {
        Integer value = jdbc.queryForObject(
                "select count(*) from refresh_tokens where user_id = ?", Integer.class, user.getId());
        return value == null ? 0 : value;
    }

    private int countActive(Coach user) {
        Integer value = jdbc.queryForObject(
                "select count(*) from refresh_tokens where user_id = ? and not revoked", Integer.class, user.getId());
        return value == null ? 0 : value;
    }
}
