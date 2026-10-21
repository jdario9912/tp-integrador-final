package com.gestion_deportiva.api.user.repository;

import com.gestion_deportiva.api.user.model.User;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends UserBaseRepository<User> {

    // Busca en toda la tabla users: el email es único entre entrenadores y atletas
    @Query("select case when count(u) > 0 then true else false end from User u where lower(u.email) = lower(:email)")
    boolean existsByEmail(@Param("email") String email);
}
