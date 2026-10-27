package com.gestion_deportiva.api.common.pagination;

import org.springframework.data.domain.Page;

import java.util.List;

// Formato común de los listados paginados. Record propio y no Page de Spring: el JSON no cambia si cambia la
// serialización interna de Spring Data, y el front recibe siempre los mismos campos.
// "page" empieza en 0, igual que el query param ?page=
public record PageResponse<T>(
        List<T> content,
        int page,
        int size,
        long totalElements,
        int totalPages
) {

    public static <T> PageResponse<T> from(Page<T> page) {
        return new PageResponse<>(page.getContent(), page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages());
    }
}
