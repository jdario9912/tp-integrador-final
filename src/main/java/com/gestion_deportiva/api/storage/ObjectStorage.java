package com.gestion_deportiva.api.storage;

import java.time.Duration;

// Puerto de almacenamiento de archivos (fotos de progreso, US-28). Se guarda la ruta del objeto,
// nunca la URL firmada: cada lectura pide una URL nueva con su vencimiento.
// Cualquier fallo del proveedor se informa con StorageUnavailableException (503).
public interface ObjectStorage {

    // Sube el contenido a la ruta indicada (ej. "progress/<athleteId>/<uuid>.jpg"); falla si ya existe
    void upload(String objectPath, byte[] content, String contentType);

    // URL firmada con el vencimiento configurado por defecto
    SignedUrl createSignedUrl(String objectPath);

    SignedUrl createSignedUrl(String objectPath, Duration ttl);

    void delete(String objectPath);
}
