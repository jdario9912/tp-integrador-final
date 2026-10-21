package com.gestion_deportiva.api.user.repository;

import com.gestion_deportiva.api.user.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.NoRepositoryBean;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

// Consultas comunes a todos los subtipos de User. @NoRepositoryBean: Spring no crea un bean para esta interfaz.
@NoRepositoryBean
public interface UserBaseRepository<T extends User> extends JpaRepository<T, UUID> {

    // #{#entityName} es User, Coach o Athlete según el repositorio concreto.
    // lower(email) usa el índice único ux_users_email de la V1
    @Query("select u from #{#entityName} u where lower(u.email) = lower(:email)")
    Optional<T> findByEmail(@Param("email") String email);
}
