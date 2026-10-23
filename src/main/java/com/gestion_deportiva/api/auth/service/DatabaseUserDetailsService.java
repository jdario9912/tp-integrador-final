package com.gestion_deportiva.api.auth.service;

import com.gestion_deportiva.api.auth.security.AuthenticatedUser;
import com.gestion_deportiva.api.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// Valida las credenciales contra la tabla users (reemplaza al usuario en memoria de Spring Boot).
// Hoy lo usa httpBasic; con JWT lo va a reutilizar el login a través del AuthenticationManager (ver docs/AUTH.md)
@Service
@RequiredArgsConstructor
public class DatabaseUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String email) {
        // findByEmail compara en minúsculas: el email se acepta sin importar mayúsculas
        return userRepository.findByEmail(email.trim())
                .map(AuthenticatedUser::from)
                // Mensaje interno: al cliente siempre le llega el 401 genérico del SecurityErrorHandler
                .orElseThrow(() -> new UsernameNotFoundException("No existe un usuario con el email " + email));
    }
}
