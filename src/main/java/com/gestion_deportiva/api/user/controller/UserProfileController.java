package com.gestion_deportiva.api.user.controller;

import com.gestion_deportiva.api.common.security.AuthenticatedUser;
import com.gestion_deportiva.api.user.dto.ChangePasswordRequest;
import com.gestion_deportiva.api.user.dto.UpdateProfileRequest;
import com.gestion_deportiva.api.user.dto.UserProfileResponse;
import com.gestion_deportiva.api.user.service.UserProfileService;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

// US-48 · Perfil propio (contrato 18). Los dos roles usan estos endpoints (reglas en SecurityConfig). Sin id en la ruta:
// siempre se actúa sobre el usuario del token, así que nadie puede tocar el perfil de otro
@RestController
@RequestMapping("/users/me")
@RequiredArgsConstructor
public class UserProfileController {

    private final UserProfileService userProfileService;

    // US-48 (bloque propio): errores documentados para Swagger
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Perfil del usuario del token"),
            @ApiResponse(responseCode = "401", description = "Sin token o usuario eliminado"),
            @ApiResponse(responseCode = "403", description = "Cuenta desactivada")
    })
    @GetMapping("/profile")
    public UserProfileResponse findProfile(@AuthenticationPrincipal Jwt jwt) {
        return userProfileService.findProfile(AuthenticatedUser.from(jwt));
    }

    // Los cuatro campos viajan completos. 409 si el email ya lo usa otro usuario
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Datos guardados"),
            @ApiResponse(responseCode = "400", description = "Campo inválido"),
            @ApiResponse(responseCode = "401", description = "Sin token o usuario eliminado"),
            @ApiResponse(responseCode = "403", description = "Cuenta desactivada"),
            @ApiResponse(responseCode = "409", description = "El email ya lo usa otro usuario")
    })
    @PutMapping("/profile")
    public UserProfileResponse updateProfile(@AuthenticationPrincipal Jwt jwt,
                                             @Valid @RequestBody UpdateProfileRequest request) {
        return userProfileService.updateProfile(AuthenticatedUser.from(jwt), request);
    }

    // 204 sin body. La sesión actual sigue activa
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Contraseña cambiada"),
            @ApiResponse(responseCode = "400", description = "Campo inválido, contraseña actual incorrecta o nueva igual a la actual"),
            @ApiResponse(responseCode = "401", description = "Sin token o usuario eliminado"),
            @ApiResponse(responseCode = "403", description = "Cuenta desactivada")
    })
    @PutMapping("/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody ChangePasswordRequest request) {
        userProfileService.changePassword(AuthenticatedUser.from(jwt), request);
    }

    // Parte "file" (JPG, PNG o WebP, hasta 5 MB). Opcional en la firma para que la validación sea del ImageValidator y el
    // 400 salga con fieldErrors. consumes: Swagger documenta el cuerpo como multipart/form-data
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Foto reemplazada"),
            @ApiResponse(responseCode = "400", description = "Falta el archivo, está dañado o el cuerpo multipart es inválido"),
            @ApiResponse(responseCode = "401", description = "Sin token o usuario eliminado"),
            @ApiResponse(responseCode = "403", description = "Cuenta desactivada"),
            @ApiResponse(responseCode = "413", description = "La foto supera 5 MB"),
            @ApiResponse(responseCode = "415", description = "Formato no permitido (solo JPG, PNG o WebP)"),
            @ApiResponse(responseCode = "503", description = "Storage no disponible")
    })
    @PutMapping(value = "/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public UserProfileResponse uploadPhoto(@AuthenticationPrincipal Jwt jwt,
                                           @RequestPart(value = "file", required = false) MultipartFile file) {
        return userProfileService.uploadPhoto(AuthenticatedUser.from(jwt), file);
    }

    // 204 sin body, también si no tenía foto (idempotente)
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Foto quitada (o no había foto)"),
            @ApiResponse(responseCode = "401", description = "Sin token o usuario eliminado"),
            @ApiResponse(responseCode = "403", description = "Cuenta desactivada")
    })
    @DeleteMapping("/photo")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePhoto(@AuthenticationPrincipal Jwt jwt) {
        userProfileService.deletePhoto(AuthenticatedUser.from(jwt));
    }
}
