package com.gestion_deportiva.api.photo.repository;

import com.gestion_deportiva.api.photo.model.ProgressPhoto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ProgressPhotoRepository extends JpaRepository<ProgressPhoto, UUID> {

    // Orden fijo del listado: de la foto más antigua a la más nueva (contrato 4 de US-28). El id desempata
    Sort CHRONOLOGICAL = Sort.by(Sort.Order.asc("takenOn"), Sort.Order.asc("createdAt"), Sort.Order.asc("id"));

    // La foto solo si es de ese atleta: la de otro atleta responde igual que una inexistente (404)
    Optional<ProgressPhoto> findByIdAndAthleteId(UUID id, UUID athleteId);

    // Página de fotos del atleta en orden cronológico. Toma la página y el tamaño pedidos e ignora el sort del
    // cliente. Método default: Spring Data no lo interpreta como consulta derivada
    default Page<ProgressPhoto> findChronological(UUID athleteId, Pageable pageable) {
        return findByAthleteId(athleteId,
                PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), CHRONOLOGICAL));
    }

    Page<ProgressPhoto> findByAthleteId(UUID athleteId, Pageable pageable);
}
