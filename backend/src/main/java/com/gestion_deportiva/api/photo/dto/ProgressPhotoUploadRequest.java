package com.gestion_deportiva.api.photo.dto;

import org.springframework.web.multipart.MultipartFile;

// Partes de la subida (contrato de US-28, sección 3.1). type y takenOn llegan como texto y los valida el service:
// así el 400 sale en español y con fieldErrors, como el resto de la API. Todas pueden venir nulas
public record ProgressPhotoUploadRequest(MultipartFile file, String type, String takenOn) {
}
