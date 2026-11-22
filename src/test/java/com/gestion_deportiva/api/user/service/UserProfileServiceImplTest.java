package com.gestion_deportiva.api.user.service;

import com.gestion_deportiva.api.auth.exception.AccountDisabledException;
import com.gestion_deportiva.api.auth.exception.SessionExpiredException;
import com.gestion_deportiva.api.coach.model.Coach;
import com.gestion_deportiva.api.common.security.AuthenticatedUser;
import com.gestion_deportiva.api.common.upload.ImageFormat;
import com.gestion_deportiva.api.common.upload.ImageValidator;
import com.gestion_deportiva.api.common.upload.ValidatedImage;
import com.gestion_deportiva.api.common.upload.exception.InvalidImageException;
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
import com.gestion_deportiva.api.user.model.enums.Role;
import com.gestion_deportiva.api.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static com.gestion_deportiva.api.support.IdentityFixtures.coach;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

// US-48 · Service del perfil propio con los puertos simulados: datos, email, contraseña y foto. Los datos y la contraseña
// se prueban con BCrypt real (con costo bajo) para que "la actual coincide" sea de verdad
@ExtendWith(MockitoExtension.class)
class UserProfileServiceImplTest {

    private static final UUID USER_ID = UUID.fromString("5d9b1c7e-3f2a-4b8e-9c61-2a7f4e0d1b93");
    private static final String RAW_PASSWORD = "password123";
    private static final String SIGNED = "https://signed.test/";
    private static final Instant EXPIRES = Instant.parse("2026-11-20T15:10:00Z");

    @Mock
    private UserRepository userRepository;

    @Mock
    private ImageValidator imageValidator;

    @Mock
    private ObjectStorage objectStorage;

    private PasswordEncoder passwordEncoder;

    private UserProfileServiceImpl service;

    private Coach ana;

    private AuthenticatedUser caller;

    @BeforeEach
    void setUp() {
        passwordEncoder = new BCryptPasswordEncoder(4);
        service = new UserProfileServiceImpl(userRepository, passwordEncoder, imageValidator, objectStorage,
                new TransactionTemplate(mock(PlatformTransactionManager.class)));
        ana = coach("ana@test.com");
        ana.changePassword(passwordEncoder.encode(RAW_PASSWORD));
        ReflectionTestUtils.setField(ana, "id", USER_ID);
        caller = new AuthenticatedUser(USER_ID, Role.COACH);
        // Por defecto el usuario existe y está activo; el repositorio devuelve lo que se guarda
        lenient().when(userRepository.findById(USER_ID)).thenReturn(Optional.of(ana));
        lenient().when(userRepository.saveAndFlush(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    // ---------- lectura ----------

    @Test
    void shouldReturnTheProfileWithoutCallingStorageWhenThereIsNoPhoto() {
        UserProfileResponse response = service.findProfile(caller);

        assertEquals(USER_ID, response.id());
        assertEquals("COACH", response.role());
        assertEquals("ana@test.com", response.email());
        assertNull(response.photoUrl());
        assertNull(response.photoUrlExpiresAt());
        verifyNoInteractions(objectStorage);
    }

    @Test
    void shouldSignThePhotoOnEveryRead() {
        ana.changeProfilePhoto("profile-photos/a.jpg");
        when(objectStorage.createSignedUrl("profile-photos/a.jpg")).thenReturn(new SignedUrl(SIGNED + "a", EXPIRES));

        UserProfileResponse response = service.findProfile(caller);

        assertEquals(SIGNED + "a", response.photoUrl());
        assertEquals(EXPIRES, response.photoUrlExpiresAt());
    }

    // Storage caído no tumba la lectura del perfil: responde sin foto (contrato 18.3)
    @Test
    void shouldReturnTheProfileWithoutPhotoWhenStorageCannotSign() {
        ana.changeProfilePhoto("profile-photos/a.jpg");
        when(objectStorage.createSignedUrl(anyString())).thenThrow(new StorageUnavailableException("caído"));

        UserProfileResponse response = service.findProfile(caller);

        assertEquals("ana@test.com", response.email());
        assertNull(response.photoUrl());
        assertNull(response.photoUrlExpiresAt());
    }

    @Test
    void shouldRejectAUserWhoWasDeletedWithSessionExpired() {
        when(userRepository.findById(USER_ID)).thenReturn(Optional.empty());

        assertThrows(SessionExpiredException.class, () -> service.findProfile(caller));
    }

    @Test
    void shouldRejectADeactivatedAccountWithForbidden() {
        ana.deactivate();

        assertThrows(AccountDisabledException.class, () -> service.findProfile(caller));
    }

    // ---------- datos personales ----------

    @Test
    void shouldSaveTheProfileWithStrippedNamesNormalizedEmailAndNullBlankPhone() {
        UserProfileResponse response = service.updateProfile(caller,
                new UpdateProfileRequest("  Ana María ", " Paz ", "  ANA.Nueva@Test.com ", "   "));

        assertEquals("Ana María", ana.getFirstName());
        assertEquals("Paz", ana.getLastName());
        assertEquals("ana.nueva@test.com", ana.getEmail());
        assertNull(ana.getPhone());
        assertEquals("ana.nueva@test.com", response.email());
        verify(userRepository).saveAndFlush(ana);
    }

    @Test
    void shouldAllowKeepingTheSameEmailEvenThoughTheUserOwnsIt() {
        when(userRepository.findByEmail("ana@test.com")).thenReturn(Optional.of(ana));

        UserProfileResponse response = service.updateProfile(caller,
                new UpdateProfileRequest("Ana", "Paz", "ana@test.com", "+54 11 1111-1111"));

        assertEquals("+54 11 1111-1111", response.phone());
        verify(userRepository).saveAndFlush(ana);
    }

    @Test
    void shouldRejectAnEmailUsedByAnotherUserWithoutSaving() {
        Coach other = coach("otra@test.com");
        ReflectionTestUtils.setField(other, "id", UUID.randomUUID());
        when(userRepository.findByEmail("otra@test.com")).thenReturn(Optional.of(other));

        EmailAlreadyRegisteredException ex = assertThrows(EmailAlreadyRegisteredException.class,
                () -> service.updateProfile(caller, new UpdateProfileRequest("Ana", "Paz", "Otra@test.com", null)));

        assertEquals("otra@test.com", ex.getEmail());
        assertEquals("ana@test.com", ana.getEmail());
        verify(userRepository, never()).saveAndFlush(any());
    }

    // ---------- contraseña ----------

    @Test
    void shouldStoreTheHashOfTheNewPasswordWhenTheCurrentOneMatches() {
        service.changePassword(caller, new ChangePasswordRequest(RAW_PASSWORD, "nueva-clave-2026"));

        assertTrue(passwordEncoder.matches("nueva-clave-2026", ana.getPasswordHash()));
        assertFalse(passwordEncoder.matches(RAW_PASSWORD, ana.getPasswordHash()));
    }

    @Test
    void shouldRejectAWrongCurrentPasswordAndKeepTheOldHash() {
        String before = ana.getPasswordHash();

        InvalidCurrentPasswordException ex = assertThrows(InvalidCurrentPasswordException.class,
                () -> service.changePassword(caller, new ChangePasswordRequest("otra-clave", "nueva-clave-2026")));

        assertEquals("currentPassword", ex.getField());
        assertEquals(before, ana.getPasswordHash());
    }

    @Test
    void shouldRejectANewPasswordEqualToTheCurrentOne() {
        SamePasswordException ex = assertThrows(SamePasswordException.class,
                () -> service.changePassword(caller, new ChangePasswordRequest(RAW_PASSWORD, RAW_PASSWORD)));

        assertEquals("newPassword", ex.getField());
    }

    @Test
    void shouldRejectTheChangeWhenTheAccountIsDeactivated() {
        ana.deactivate();

        assertThrows(AccountDisabledException.class,
                () -> service.changePassword(caller, new ChangePasswordRequest(RAW_PASSWORD, "nueva-clave-2026")));
    }

    // ---------- foto: subida ----------

    @Test
    void shouldUploadTheImageUnderTheProfilePrefixStoreThePathAndDeleteThePreviousPhoto() {
        ana.changeProfilePhoto("profile-photos/" + USER_ID + "/anterior.jpg");
        MockMultipartFile file = new MockMultipartFile("file", "x.png", "image/png", new byte[] {1});
        byte[] content = {1, 2, 3};
        when(imageValidator.validate(file)).thenReturn(new ValidatedImage(ImageFormat.PNG, content));
        when(objectStorage.createSignedUrl(anyString())).thenReturn(new SignedUrl(SIGNED + "nueva", EXPIRES));

        UserProfileResponse response = service.uploadPhoto(caller, file);

        ArgumentCaptor<String> uploaded = ArgumentCaptor.forClass(String.class);
        verify(objectStorage).upload(uploaded.capture(), eq(content), eq("image/png"));
        assertTrue(uploaded.getValue().startsWith("profile-photos/" + USER_ID + "/"), uploaded.getValue());
        assertTrue(uploaded.getValue().endsWith(".png"), uploaded.getValue());
        assertEquals(uploaded.getValue(), ana.getProfilePhotoPath());
        assertEquals(SIGNED + "nueva", response.photoUrl());
        assertEquals(EXPIRES, response.photoUrlExpiresAt());
        verify(objectStorage).delete("profile-photos/" + USER_ID + "/anterior.jpg");
    }

    @Test
    void shouldNotDeleteAnythingWhenTheUserHadNoPhoto() {
        MockMultipartFile file = new MockMultipartFile("file", "x.jpg", "image/jpeg", new byte[] {1});
        when(imageValidator.validate(file)).thenReturn(new ValidatedImage(ImageFormat.JPEG, new byte[] {1}));
        when(objectStorage.createSignedUrl(anyString())).thenReturn(new SignedUrl(SIGNED, EXPIRES));

        service.uploadPhoto(caller, file);

        verify(objectStorage, never()).delete(anyString());
    }

    @Test
    void shouldRejectAnInvalidImageBeforeTouchingStorageOrTheAccount() {
        MockMultipartFile file = new MockMultipartFile("file", "x.jpg", "image/jpeg", new byte[0]);
        when(imageValidator.validate(file)).thenThrow(InvalidImageException.missing());

        assertThrows(InvalidImageException.class, () -> service.uploadPhoto(caller, file));

        verifyNoInteractions(objectStorage);
        verify(userRepository, never()).findById(any());
    }

    @Test
    void shouldNotUploadForADeactivatedAccount() {
        ana.deactivate();
        MockMultipartFile file = new MockMultipartFile("file", "x.jpg", "image/jpeg", new byte[] {1});
        when(imageValidator.validate(file)).thenReturn(new ValidatedImage(ImageFormat.JPEG, new byte[] {1}));

        assertThrows(AccountDisabledException.class, () -> service.uploadPhoto(caller, file));

        verify(objectStorage, never()).upload(anyString(), any(), anyString());
    }

    // Storage no subió: no hay fila ni objeto que limpiar, y la foto anterior sigue como estaba
    @Test
    void shouldKeepThePreviousPhotoWhenTheUploadFails() {
        ana.changeProfilePhoto("profile-photos/anterior.jpg");
        MockMultipartFile file = new MockMultipartFile("file", "x.jpg", "image/jpeg", new byte[] {1});
        when(imageValidator.validate(file)).thenReturn(new ValidatedImage(ImageFormat.JPEG, new byte[] {1}));
        doThrow(new StorageUnavailableException("caído")).when(objectStorage).upload(anyString(), any(), anyString());

        assertThrows(StorageUnavailableException.class, () -> service.uploadPhoto(caller, file));

        assertEquals("profile-photos/anterior.jpg", ana.getProfilePhotoPath());
        verify(objectStorage, never()).delete("profile-photos/anterior.jpg");
    }

    // Subió, pero la firma falló: el objeto recién subido se borra y la foto anterior no se toca
    @Test
    void shouldDeleteTheNewObjectWhenSigningFails() {
        ana.changeProfilePhoto("profile-photos/anterior.jpg");
        MockMultipartFile file = new MockMultipartFile("file", "x.jpg", "image/jpeg", new byte[] {1});
        when(imageValidator.validate(file)).thenReturn(new ValidatedImage(ImageFormat.JPEG, new byte[] {1}));
        when(objectStorage.createSignedUrl(anyString())).thenThrow(new StorageUnavailableException("caído"));

        assertThrows(StorageUnavailableException.class, () -> service.uploadPhoto(caller, file));

        ArgumentCaptor<String> deleted = ArgumentCaptor.forClass(String.class);
        verify(objectStorage).delete(deleted.capture());
        assertTrue(deleted.getValue().startsWith("profile-photos/" + USER_ID + "/"), deleted.getValue());
        assertEquals("profile-photos/anterior.jpg", ana.getProfilePhotoPath());
        verify(objectStorage, never()).delete("profile-photos/anterior.jpg");
    }

    // Si la base falla al guardar la ruta, el objeto recién subido se borra (no queda una foto sin fila)
    @Test
    void shouldDeleteTheNewObjectWhenTheRowCannotBeSaved() {
        MockMultipartFile file = new MockMultipartFile("file", "x.jpg", "image/jpeg", new byte[] {1});
        when(imageValidator.validate(file)).thenReturn(new ValidatedImage(ImageFormat.JPEG, new byte[] {1}));
        when(objectStorage.createSignedUrl(anyString())).thenReturn(new SignedUrl(SIGNED, EXPIRES));
        when(userRepository.saveAndFlush(any(User.class))).thenThrow(new IllegalStateException("base caída"));

        assertThrows(IllegalStateException.class, () -> service.uploadPhoto(caller, file));

        // El rollback lo hace la base; acá se prueba que el objeto recién subido no queda huérfano
        verify(objectStorage).delete(anyString());
    }

    // ---------- foto: borrado ----------

    @Test
    void shouldRemoveThePhotoRowAndThenDeleteTheObject() {
        ana.changeProfilePhoto("profile-photos/a.jpg");

        service.deletePhoto(caller);

        assertFalse(ana.hasProfilePhoto());
        verify(objectStorage).delete("profile-photos/a.jpg");
    }

    @Test
    void shouldBeIdempotentWhenThereIsNoPhoto() {
        service.deletePhoto(caller);

        verifyNoInteractions(objectStorage);
    }

    // La fila ya quedó sin foto: si Storage falla, el borrado responde bien y el objeto queda en el log
    @Test
    void shouldNotFailWhenTheObjectCannotBeDeletedAfterTheRowIsGone() {
        ana.changeProfilePhoto("profile-photos/a.jpg");
        doThrow(new StorageUnavailableException("caído")).when(objectStorage).delete(anyString());

        service.deletePhoto(caller);

        assertFalse(ana.hasProfilePhoto());
        verify(objectStorage).delete("profile-photos/a.jpg");
    }

    @Test
    void shouldKeepThePhotoWhenTheAccountIsDeactivated() {
        ana.changeProfilePhoto("profile-photos/a.jpg");
        ana.deactivate();

        assertThrows(AccountDisabledException.class, () -> service.deletePhoto(caller));

        assertTrue(ana.hasProfilePhoto());
        verify(objectStorage, never()).delete(anyString());
    }
}
