package com.gestion_deportiva.api.user.factory;

import com.gestion_deportiva.api.user.model.User;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;

// Factory Method: el paso común (hashear la contraseña) vive acá y cada subclase decide qué User concreto arma
@RequiredArgsConstructor
public abstract class UserFactory<R, U extends User> {

    private final PasswordEncoder passwordEncoder;

    public final U create(R request) {
        return instantiate(request, passwordEncoder.encode(rawPassword(request)));
    }

    protected abstract String rawPassword(R request);

    protected abstract U instantiate(R request, String passwordHash);
}
