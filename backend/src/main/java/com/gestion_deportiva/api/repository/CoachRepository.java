package com.gestion_deportiva.api.repository;

import com.gestion_deportiva.api.model.Coach;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface CoachRepository extends JpaRepository<Coach, UUID> {

    @Query("select c from Coach c where lower(c.email) = lower(:email)")
    Optional<Coach> findByEmail(@Param("email") String email);
}
