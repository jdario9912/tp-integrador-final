package com.gestion_deportiva.api.user.service;

import com.gestion_deportiva.api.auth.exception.AccountDisabledException;
import com.gestion_deportiva.api.auth.exception.SessionExpiredException;
import com.gestion_deportiva.api.common.security.AuthenticatedUser;
import com.gestion_deportiva.api.common.upload.ImageFormat;
import com.gestion_deportiva.api.common.upload.ImageValidator;
import com.gestion_deportiva.api.common.upload.ValidatedImage;
import com.gestion_deportiva.api.storage.ObjectStorage;
import com.gestion_deportiva.api.storage.SignedUrl;
import com.gestion_deportiva.api.storage.StorageUnavailableException;
import com.gestion_deportiva.api.user.dto.ChangePasswordRequest;
import com.gestion_deportiva.api.user.dto.UpdateProfileRequest;
import com.gestion_deportiva.api.user.dto.UserProfileResponse;
import com.gestion_deportiva.api.user.exception.EmailAlreadyRegisteredException;
import com.gestion_deportiva.api.user.exception.InvalidCurrentPasswordException;
import com.gestion_deportiva.api.user.exception.SamePasswordException;
import com.gestion_deportiva.api.user.model.User;
import com.gestion_deportiva.api.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

// US-48 · Perfil propio. Los cambios de datos y de contraseña son una transacción normal. Las operaciones de la foto
// llaman a Storage (HTTP), así que la subida y la firma van fuera de cualquier transacción y la escritura de la base va
// en un TransactionTemplate corto (mismo criterio que ProgressPhotoService, sección 8 del contrato de US-28).
//
// Consistencia con Storage: nunca hay una fila que apunte a un objeto inexistente. Se sube primero, se guarda la ruta
// después; el objeto anterior se borra después del commit (best-effort).
@Slf4j
@Service
@RequiredArgsConstructor
public class UserProfileServiceImpl implements UserProfileService {

    // Prefijo propio de las fotos de perfil en el bucket privado (las de progreso van bajo "progress/")
    static final String PHOTO_PREFIX = "profile-photos/";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ImageValidator imageValidator;
    private final ObjectStorage objectStorage;
    private final TransactionTemplate transactionTemplate;

    // Lectura sin transacción propia: la firma de la URL es una llamada HTTP
    @Override
    public UserProfileResponse findProfile(AuthenticatedUser caller) {
        return toResponse(loadActive(caller.id()));
    }

    // El email se revisa contra los demás usuarios (el propio no cuenta). Si dos cambios chocan contra el índice único,
    // la DataIntegrityViolationException llega al GlobalExceptionHandler y responde 409
    @Override
    public UserProfileResponse updateProfile(AuthenticatedUser caller, UpdateProfileRequest request) {
        String email = User.normalizeEmail(request.email());
        User updated = transactionTemplate.execute(status -> {
            User user = loadActive(caller.id());
            userRepository.findByEmail(email)
                    .filter(other -> !other.getId().equals(user.getId()))
                    .ifPresent(other -> {
                        throw new EmailAlreadyRegisteredException(email);
                    });
            user.changeProfile(request.firstName().strip(), request.lastName().strip(), email, request.phone());
            return userRepository.saveAndFlush(user);
        });
        return toResponse(updated);
    }

    // Con la actual correcta se guarda el hash de la nueva. La sesión sigue activa (contrato 18.9)
    @Override
    @Transactional
    public void changePassword(AuthenticatedUser caller, ChangePasswordRequest request) {
        User user = loadActive(caller.id());
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new InvalidCurrentPasswordException();
        }
        if (passwordEncoder.matches(request.newPassword(), user.getPasswordHash())) {
            throw new SamePasswordException();
        }
        user.changePassword(passwordEncoder.encode(request.newPassword()));
    }

    // Orden: archivo (400, 413, 415, 400) → cuenta vigente (401, 403) → subida (503) → firma (503) → fila. Si algo falla
    // después de subir, se borra el objeto recién subido. Recién después del commit se borra la foto anterior
    @Override
    public UserProfileResponse uploadPhoto(AuthenticatedUser caller, MultipartFile file) {
        ValidatedImage image = imageValidator.validate(file);
        loadActive(caller.id());

        String storagePath = newStoragePath(caller.id(), image.format());
        uploadObject(storagePath, image);

        ReplacedPhoto replaced;
        SignedUrl signedUrl;
        try {
            signedUrl = objectStorage.createSignedUrl(storagePath);
            replaced = transactionTemplate.execute(status -> replacePhoto(caller.id(), storagePath));
        } catch (RuntimeException ex) {
            deleteObjectQuietly(storagePath);
            throw ex;
        }
        // Fuera del try: si el borrado de la anterior fallara, no se debe borrar la foto nueva que ya quedó guardada
        if (replaced.previousPath() != null) {
            deleteObjectQuietly(replaced.previousPath());
        }
        return UserProfileResponse.of(replaced.user(), signedUrl);
    }

    // Fila primero (commit) y después el objeto. Sin foto no hace nada: idempotente. La respuesta es 204 aunque Storage
    // falle: la foto ya no se ve, y el objeto huérfano queda en el log (contrato 18.7)
    @Override
    public void deletePhoto(AuthenticatedUser caller) {
        String previousPath = transactionTemplate.execute(status -> {
            User user = loadActive(caller.id());
            String path = user.getProfilePhotoPath();
            user.removeProfilePhoto();
            return path;
        });
        if (previousPath != null) {
            deleteObjectQuietly(previousPath);
        }
    }

    // Misma regla de cuenta que /auth/me: un usuario eliminado sigue con token hasta que venza (401), y uno desactivado
    // responde 403
    private User loadActive(UUID userId) {
        User user = userRepository.findById(userId).orElseThrow(SessionExpiredException::new);
        if (!user.isActive()) {
            throw new AccountDisabledException();
        }
        return user;
    }

    private ReplacedPhoto replacePhoto(UUID userId, String storagePath) {
        User user = loadActive(userId);
        String previousPath = user.getProfilePhotoPath();
        user.changeProfilePhoto(storagePath);
        return new ReplacedPhoto(userRepository.saveAndFlush(user), previousPath);
    }

    // Si Storage no firma la URL, la lectura sigue sin foto (200): el perfil no depende del bucket (contrato 18.3)
    private UserProfileResponse toResponse(User user) {
        if (!user.hasProfilePhoto()) {
            return UserProfileResponse.of(user, null);
        }
        try {
            return UserProfileResponse.of(user, objectStorage.createSignedUrl(user.getProfilePhotoPath()));
        } catch (StorageUnavailableException ex) {
            log.warn("No se pudo firmar la foto de perfil del usuario {}: {}", user.getId(), ex.getMessage());
            return UserProfileResponse.of(user, null);
        }
    }

    private void uploadObject(String storagePath, ValidatedImage image) {
        try {
            objectStorage.upload(storagePath, image.content(), image.format().contentType());
        } catch (RuntimeException ex) {
            // Un timeout pudo dejar el objeto a medias: se intenta borrar la ruta (best-effort)
            deleteObjectQuietly(storagePath);
            throw ex;
        }
    }

    // Objeto sin fila: no lo ve nadie, pero ocupa espacio. Se loguea la ruta para limpiarlo más adelante
    private void deleteObjectQuietly(String storagePath) {
        try {
            objectStorage.delete(storagePath);
        } catch (StorageUnavailableException ex) {
            log.warn("No se pudo borrar el objeto {} (queda sin fila): {}", storagePath, ex.getMessage());
        }
    }

    // Ruta generada por el service: profile-photos/<userId>/<uuid>.<ext>. Nunca el nombre que mandó el cliente
    private static String newStoragePath(UUID userId, ImageFormat format) {
        return PHOTO_PREFIX + userId + "/" + UUID.randomUUID() + "." + format.extension();
    }

    // Lo que devuelve la transacción de la foto: el usuario ya guardado y la ruta que tenía antes (null si no tenía)
    private record ReplacedPhoto(User user, String previousPath) {
    }
}
