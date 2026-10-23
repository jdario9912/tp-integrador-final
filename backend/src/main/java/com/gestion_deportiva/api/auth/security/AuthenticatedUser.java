package com.gestion_deportiva.api.auth.security;

import com.gestion_deportiva.api.user.model.User;
import com.gestion_deportiva.api.user.model.enums.Role;
import lombok.Getter;
import org.springframework.security.core.CredentialsContainer;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

// Principal del SecurityContext: los controllers lo reciben con @AuthenticationPrincipal.
// Es independiente del mecanismo de autenticación: se mantiene al migrar a JWT (ver docs/AUTH.md)
public final class AuthenticatedUser implements UserDetails, CredentialsContainer {

    @Getter
    private final UUID id;

    @Getter
    private final String email;

    @Getter
    private final Role role;

    private final boolean active;
    private String passwordHash;

    public AuthenticatedUser(UUID id, String email, String passwordHash, Role role, boolean active) {
        this.id = Objects.requireNonNull(id, "id");
        this.email = Objects.requireNonNull(email, "email");
        this.passwordHash = passwordHash;
        this.role = Objects.requireNonNull(role, "role");
        this.active = active;
    }

    public static AuthenticatedUser from(User user) {
        return new AuthenticatedUser(user.getId(), user.getEmail(), user.getPasswordHash(), user.getRole(),
                user.isActive());
    }

    // "ROLE_COACH" / "ROLE_ATHLETE": es el formato que espera hasRole("COACH") en SecurityConfig
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return email;
    }

    // Un usuario desactivado no puede autenticarse (DisabledException → 401)
    @Override
    public boolean isEnabled() {
        return active;
    }

    // Spring lo llama después de autenticar: el hash no queda en memoria dentro del SecurityContext
    @Override
    public void eraseCredentials() {
        this.passwordHash = null;
    }
}
