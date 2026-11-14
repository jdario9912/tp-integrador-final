package com.gestion_deportiva.api.photo.service;

import com.gestion_deportiva.api.athlete.repository.AthleteRepository;
import com.gestion_deportiva.api.athlete.service.AthleteAccessGuard;
import com.gestion_deportiva.api.common.pagination.PageResponse;
import com.gestion_deportiva.api.common.security.AuthenticatedUser;
import com.gestion_deportiva.api.common.time.AppClock;
import com.gestion_deportiva.api.common.upload.ImageFormat;
import com.gestion_deportiva.api.common.upload.ImageValidator;
import com.gestion_deportiva.api.common.upload.ValidatedImage;
import com.gestion_deportiva.api.photo.dto.ProgressPhotoResponse;
import com.gestion_deportiva.api.photo.dto.ProgressPhotoUploadRequest;
import com.gestion_deportiva.api.photo.exception.FutureTakenOnException;
import com.gestion_deportiva.api.photo.exception.InvalidProgressPhotoTypeException;
import com.gestion_deportiva.api.photo.exception.InvalidTakenOnException;
import com.gestion_deportiva.api.photo.exception.ProgressPhotoNotFoundException;
import com.gestion_deportiva.api.photo.model.ProgressPhoto;
import com.gestion_deportiva.api.photo.model.enums.ProgressPhotoType;
import com.gestion_deportiva.api.photo.repository.ProgressPhotoRepository;
import com.gestion_deportiva.api.storage.ObjectStorage;
import com.gestion_deportiva.api.storage.SignedUrl;
import com.gestion_deportiva.api.storage.StorageUnavailableException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.stream.IntStream;

// Fotos de progreso del atleta (US-28). La regla de rol (subir y borrar solo ATHLETE) vive en SecurityConfig; la
// pertenencia, acá con AthleteAccessGuard. El orden de las validaciones sigue el contrato (sección 10): campos y
// archivo antes que el atleta, así un archivo inválido no revela nada del atleta.
//
// Consistencia con Storage (sección 8): nunca hay una fila que apunte a un objeto inexistente. La subida y las llamadas
// HTTP a Supabase van fuera de cualquier transacción; las escrituras de la base van en TransactionTemplate, cortas.
@Slf4j
@Service
@RequiredArgsConstructor
public class ProgressPhotoService {

    // Fecha en formato AAAA-MM-DD: LocalDate.parse solo no alcanza (acepta años de más de cuatro dígitos con signo)
    private static final Pattern TAKEN_ON_FORMAT = Pattern.compile("\\d{4}-\\d{2}-\\d{2}");

    private final ProgressPhotoRepository progressPhotoRepository;
    private final AthleteRepository athleteRepository;
    private final AthleteAccessGuard athleteAccessGuard;
    private final ImageValidator imageValidator;
    private final ObjectStorage objectStorage;
    private final AppClock appClock;
    private final TransactionTemplate transactionTemplate;

    // Orden: type y takenOn (400) → archivo (400, 413, 415, 400) → atleta (404) → pertenencia (403) → Storage (503) →
    // firma y fila (500 si la base falla). Si la firma o la fila fallan, se borra el objeto recién subido
    public ProgressPhotoResponse upload(AuthenticatedUser user, UUID athleteId, ProgressPhotoUploadRequest request) {
        ProgressPhotoType type = parseType(request.type());
        LocalDate takenOn = parseTakenOn(request.takenOn());
        ValidatedImage image = imageValidator.validate(request.file());

        athleteAccessGuard.verifyAccess(user, athleteId);

        String storagePath = newStoragePath(athleteId, image.format());
        uploadObject(storagePath, image);

        try {
            // La firma va antes del insert y fuera de la transacción: si falla, no hay fila que deshacer
            SignedUrl signedUrl = objectStorage.createSignedUrl(storagePath);
            ProgressPhoto photo = transactionTemplate.execute(status -> progressPhotoRepository.saveAndFlush(
                    new ProgressPhoto(athleteRepository.getReferenceById(athleteId), type, takenOn, storagePath,
                            appClock.now())));
            return ProgressPhotoResponse.from(photo, signedUrl);
        } catch (RuntimeException ex) {
            deleteObjectQuietly(storagePath);
            throw ex;
        }
    }

    // Listado cronológico (de la más antigua a la más nueva). Cada foto lleva su URL firmada; la página entera
    // comparte el mismo vencimiento. Una página vacía no llama a Storage
    public PageResponse<ProgressPhotoResponse> findByAthlete(AuthenticatedUser user, UUID athleteId,
                                                             Pageable pageable) {
        athleteAccessGuard.verifyAccess(user, athleteId);
        Page<ProgressPhoto> page = progressPhotoRepository.findChronological(athleteId, pageable);
        List<ProgressPhoto> photos = page.getContent();
        List<ProgressPhotoResponse> content = photos.isEmpty() ? List.of() : withSignedUrls(photos);
        return new PageResponse<>(content, page.getNumber(), page.getSize(), page.getTotalElements(),
                page.getTotalPages());
    }

    // Detalle con una URL nueva: lo usa el frontend cuando la URL venció. Después de la pertenencia, para que solo el
    // dueño sepa si un photoId existe
    public ProgressPhotoResponse findOne(AuthenticatedUser user, UUID athleteId, UUID photoId) {
        athleteAccessGuard.verifyAccess(user, athleteId);
        ProgressPhoto photo = findOwnedPhoto(athleteId, photoId);
        return ProgressPhotoResponse.from(photo, objectStorage.createSignedUrl(photo.getStoragePath()));
    }

    // Fila primero (commit) y después el objeto. Si Storage falla, la foto ya no se ve y queda un objeto huérfano que se
    // loguea con su ruta; la respuesta sigue siendo 204. Al revés, un fallo de la base dejaría filas sin objeto
    public void delete(AuthenticatedUser user, UUID athleteId, UUID photoId) {
        athleteAccessGuard.verifyAccess(user, athleteId);
        String storagePath = transactionTemplate.execute(status -> {
            ProgressPhoto photo = findOwnedPhoto(athleteId, photoId);
            progressPhotoRepository.delete(photo);
            progressPhotoRepository.flush();
            return photo.getStoragePath();
        });
        deleteObjectQuietly(storagePath);
    }

    private List<ProgressPhotoResponse> withSignedUrls(List<ProgressPhoto> photos) {
        List<String> storagePaths = photos.stream().map(ProgressPhoto::getStoragePath).toList();
        List<SignedUrl> signedUrls = objectStorage.createSignedUrls(storagePaths);
        return IntStream.range(0, photos.size())
                .mapToObj(index -> ProgressPhotoResponse.from(photos.get(index), signedUrls.get(index)))
                .toList();
    }

    // La foto solo si es de ese atleta: la de otro atleta responde igual que una inexistente
    private ProgressPhoto findOwnedPhoto(UUID athleteId, UUID photoId) {
        return progressPhotoRepository.findByIdAndAthleteId(photoId, athleteId)
                .orElseThrow(() -> new ProgressPhotoNotFoundException(photoId));
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

    // Ruta generada por el service (nunca el nombre del cliente): progress/<athleteId>/<uuid>.<ext>
    private static String newStoragePath(UUID athleteId, ImageFormat format) {
        return "progress/" + athleteId + "/" + UUID.randomUUID() + "." + format.extension();
    }

    private static ProgressPhotoType parseType(String type) {
        return Arrays.stream(ProgressPhotoType.values())
                .filter(candidate -> candidate.name().equals(type))
                .findFirst()
                .orElseThrow(InvalidProgressPhotoTypeException::new);
    }

    // Sin takenOn (o vacío), la foto es de hoy en la zona de la app. Nunca futura, sin límite inferior
    private LocalDate parseTakenOn(String takenOn) {
        LocalDate today = appClock.today();
        if (takenOn == null || takenOn.isBlank()) {
            return today;
        }
        String value = takenOn.strip();
        if (!TAKEN_ON_FORMAT.matcher(value).matches()) {
            throw new InvalidTakenOnException();
        }
        LocalDate date;
        try {
            date = LocalDate.parse(value);
        } catch (DateTimeParseException ex) {
            throw new InvalidTakenOnException();
        }
        if (date.isAfter(today)) {
            throw new FutureTakenOnException();
        }
        return date;
    }
}
