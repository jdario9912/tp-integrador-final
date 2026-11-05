package com.gestion_deportiva.api.storage;

// El almacenamiento no respondió, respondió con error o no está configurado.
// El mensaje es para el log (nunca incluye la clave); al cliente le llega un 503 con un texto genérico.
public class StorageUnavailableException extends RuntimeException {

    public StorageUnavailableException(String message) {
        super(message);
    }

    public StorageUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
