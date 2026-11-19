package com.gestion_deportiva.api.note.repository;

import com.gestion_deportiva.api.note.model.Note;
import com.gestion_deportiva.api.note.model.enums.NoteType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface NoteRepository extends JpaRepository<Note, UUID> {

    // De la más reciente a la más antigua (índice ix_notes_athlete_created). El filtro por tipo va en la consulta:
    // para el atleta, las privadas no se leen de la base
    @Query("""
            select n from Note n
             where n.athlete.id = :athleteId and n.type in :types
             order by n.createdAt desc, n.id desc""")
    List<Note> findNewestFirst(@Param("athleteId") UUID athleteId, @Param("types") Collection<NoteType> types);

    Optional<Note> findByIdAndAthleteIdAndTypeIn(UUID id, UUID athleteId, Collection<NoteType> types);
}
