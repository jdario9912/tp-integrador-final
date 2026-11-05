package com.gestion_deportiva.api.storage;

import java.time.Instant;

// URL temporal de lectura de un objeto privado y el instante en que deja de funcionar
public record SignedUrl(String url, Instant expiresAt) {
}
