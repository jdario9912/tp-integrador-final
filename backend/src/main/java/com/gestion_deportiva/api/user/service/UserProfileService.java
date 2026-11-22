package com.gestion_deportiva.api.user.service;

import com.gestion_deportiva.api.common.security.AuthenticatedUser;
import com.gestion_deportiva.api.user.dto.ChangePasswordRequest;
import com.gestion_deportiva.api.user.dto.UpdateProfileRequest;
import com.gestion_deportiva.api.user.dto.UserProfileResponse;
import org.springframework.web.multipart.MultipartFile;

// US-48 · Perfil propio: datos comunes, contraseña y foto del usuario del token (COACH o ATHLETE). Todos los métodos
// actúan sobre el usuario autenticado; no hay id de otro usuario en ninguna firma
public interface UserProfileService {

    UserProfileResponse findProfile(AuthenticatedUser caller);

    UserProfileResponse updateProfile(AuthenticatedUser caller, UpdateProfileRequest request);

    void changePassword(AuthenticatedUser caller, ChangePasswordRequest request);

    // Reemplaza la foto de perfil (si tenía una, borra el objeto anterior)
    UserProfileResponse uploadPhoto(AuthenticatedUser caller, MultipartFile file);

    // Idempotente: sin foto no llama a Storage
    void deletePhoto(AuthenticatedUser caller);
}
