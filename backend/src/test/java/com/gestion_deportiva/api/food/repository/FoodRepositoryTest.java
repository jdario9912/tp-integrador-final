package com.gestion_deportiva.api.food.repository;

import com.gestion_deportiva.api.AbstractIntegrationTest;
import com.gestion_deportiva.api.food.model.Food;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.util.List;

import static com.gestion_deportiva.api.food.repository.FoodSpecifications.nameContains;
import static com.gestion_deportiva.api.support.FoodFixtures.food;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Los alimentos precargados por la V9 pueden no estar (FoodE2ETest hace TRUNCATE foods): cada test arranca
// con el catálogo vacío (el rollback de AbstractIntegrationTest deshace el DELETE)
class FoodRepositoryTest extends AbstractIntegrationTest {

    @Autowired
    private FoodRepository foodRepository;

    @Autowired
    private JdbcTemplate jdbc;

    @BeforeEach
    void setUp() {
        jdbc.execute("DELETE FROM foods");
    }

    @Test
    void savesTheFoodWithItsValuesAndTimestamps() {
        Food saved = foodRepository.saveAndFlush(food("Pechuga de pollo"));

        BigDecimal fat = jdbc.queryForObject("select fat_g from foods where id = ?", BigDecimal.class,
                saved.getId());
        assertEquals(0, new BigDecimal("3.6").compareTo(fat));
        assertNotNull(saved.getCreatedAt());
        assertNotNull(saved.getUpdatedAt());
    }

    @Test
    void rejectsADuplicateNameIgnoringCase() {
        foodRepository.saveAndFlush(food("Arroz"));

        assertThrows(DataIntegrityViolationException.class, () -> foodRepository.saveAndFlush(food("ARROZ")));
    }

    @Test
    void checksTheNameIgnoringCase() {
        foodRepository.saveAndFlush(food("Arroz"));

        assertTrue(foodRepository.existsByNameIgnoreCase("aRRoz"));
        assertFalse(foodRepository.existsByNameIgnoreCase("Arroz integral"));
    }

    @Test
    void searchesByNameContainingIgnoringCase() {
        foodRepository.saveAllAndFlush(List.of(food("Arroz blanco"), food("Arroz integral"), food("Avena")));

        List<String> names = foodRepository.findAll(nameContains("ARROZ"), PageRequest.of(0, 10, Sort.by("name")))
                .map(Food::getName)
                .getContent();

        assertEquals(List.of("Arroz blanco", "Arroz integral"), names);
    }

    @Test
    void rejectsNegativeValuesAtTheDatabase() {
        Food saved = foodRepository.saveAndFlush(food("Arroz"));

        assertThrows(DataIntegrityViolationException.class,
                () -> jdbc.update("update foods set protein_g = -1 where id = ?", saved.getId()));
    }
}
