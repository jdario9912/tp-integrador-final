package com.gestion_deportiva.api.user.repository;

import com.gestion_deportiva.api.user.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {

    // lower(email) usa el índice único ux_users_email de la V1
    @Query("select u from User u where lower(u.email) = lower(:email)")
    Optional<User> findByEmail(@Param("email") String email);

    @Query("select case when count(u) > 0 then true else false end from User u where lower(u.email) = lower(:email)")
    boolean existsByEmail(@Param("email") String email);
}
