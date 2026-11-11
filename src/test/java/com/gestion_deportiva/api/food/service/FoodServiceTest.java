package com.gestion_deportiva.api.food.service;

import com.gestion_deportiva.api.common.pagination.PageResponse;
import com.gestion_deportiva.api.food.dto.FoodRequest;
import com.gestion_deportiva.api.food.dto.FoodResponse;
import com.gestion_deportiva.api.food.dto.FoodSearchFilter;
import com.gestion_deportiva.api.food.exception.FoodNameAlreadyExistsException;
import com.gestion_deportiva.api.food.exception.FoodNotFoundException;
import com.gestion_deportiva.api.food.model.Food;
import com.gestion_deportiva.api.food.repository.FoodRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static com.gestion_deportiva.api.support.FoodFixtures.food;
import static com.gestion_deportiva.api.support.FoodFixtures.foodRequest;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FoodServiceTest {

    private static final UUID FOOD_ID = UUID.randomUUID();

    @Mock
    private FoodRepository foodRepository;

    private FoodService foodService;

    @BeforeEach
    void setUp() {
        foodService = new FoodService(foodRepository);
    }

    // ---------- create ----------

    @Test
    void shouldCreateTheFoodWithTrimmedName() {
        // Arrange
        when(foodRepository.saveAndFlush(any(Food.class))).thenAnswer(inv -> inv.getArgument(0));

        // Act
        FoodResponse response = foodService.create(foodRequest("  Pechuga de pollo "));

        // Assert
        Food saved = captureSaved();
        assertEquals("Pechuga de pollo", saved.getName());
        assertEquals(new BigDecimal("100"), saved.getReferencePortionG());
        assertEquals(new BigDecimal("165"), saved.getCaloriesKcal());
        assertEquals(new BigDecimal("31"), saved.getProteinG());
        assertEquals(BigDecimal.ZERO, saved.getCarbsG());
        assertEquals(new BigDecimal("3.6"), saved.getFatG());
        assertEquals("Pechuga de pollo", response.name());
        verify(foodRepository).existsByNameIgnoreCase("Pechuga de pollo");
    }

    @Test
    void shouldThrowWhenTheNameAlreadyExistsIgnoringCase() {
        when(foodRepository.existsByNameIgnoreCase("ARROZ")).thenReturn(true);

        assertThrows(FoodNameAlreadyExistsException.class, () -> foodService.create(foodRequest(" ARROZ ")));
        verify(foodRepository, never()).saveAndFlush(any());
    }

    // ---------- findAll ----------

    @Test
    @SuppressWarnings("unchecked")
    void shouldIgnoreTheClientSortAndKeepThePage() {
        // Arrange
        Pageable requested = PageRequest.of(2, 5);
        when(foodRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(food("Arroz")), PageRequest.of(2, 5), 11));

        // Act
        PageResponse<FoodResponse> page = foodService.findAll(new FoodSearchFilter("arr"), requested);

        // Assert
        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(foodRepository).findAll(any(Specification.class), captor.capture());
        assertEquals(PageRequest.of(2, 5, FoodService.CATALOG_SORT), captor.getValue());
        assertEquals(List.of("Arroz"), page.content().stream().map(FoodResponse::name).toList());
        assertEquals(11, page.totalElements());
    }

    // ---------- findById ----------

    @Test
    void shouldReturnTheFood() {
        when(foodRepository.findById(FOOD_ID)).thenReturn(Optional.of(foodWithId("Arroz")));

        assertEquals(FOOD_ID, foodService.findById(FOOD_ID).id());
    }

    @Test
    void shouldThrowWhenTheFoodDoesNotExist() {
        when(foodRepository.findById(FOOD_ID)).thenReturn(Optional.empty());

        assertThrows(FoodNotFoundException.class, () -> foodService.findById(FOOD_ID));
    }

    // ---------- update ----------

    @Test
    void shouldUpdateNameAndNutrition() {
        // Arrange
        Food existing = foodWithId("Arroz");
        when(foodRepository.findById(FOOD_ID)).thenReturn(Optional.of(existing));
        when(foodRepository.saveAndFlush(existing)).thenReturn(existing);
        FoodRequest request = new FoodRequest(" Arroz integral ", new BigDecimal("50"), new BigDecimal("56"),
                new BigDecimal("1.15"), new BigDecimal("12"), new BigDecimal("0.4"));

        // Act
        FoodResponse response = foodService.update(FOOD_ID, request);

        // Assert
        assertEquals("Arroz integral", existing.getName());
        assertEquals(new BigDecimal("50"), existing.getReferencePortionG());
        assertEquals(new BigDecimal("1.15"), existing.getProteinG());
        assertEquals("Arroz integral", response.name());
    }

    @Test
    void shouldNotTreatTheOwnNameInOtherCaseAsADuplicate() {
        Food existing = foodWithId("Arroz");
        when(foodRepository.findById(FOOD_ID)).thenReturn(Optional.of(existing));
        when(foodRepository.saveAndFlush(existing)).thenReturn(existing);

        foodService.update(FOOD_ID, foodRequest("ARROZ"));

        verify(foodRepository, never()).existsByNameIgnoreCase(anyString());
        assertEquals("ARROZ", existing.getName());
    }

    @Test
    void shouldThrowWhenRenamingToAnExistingName() {
        when(foodRepository.findById(FOOD_ID)).thenReturn(Optional.of(foodWithId("Arroz")));
        when(foodRepository.existsByNameIgnoreCase("Avena")).thenReturn(true);

        assertThrows(FoodNameAlreadyExistsException.class, () -> foodService.update(FOOD_ID, foodRequest("Avena")));
        verify(foodRepository, never()).saveAndFlush(any());
    }

    @Test
    void shouldThrowWhenUpdatingAFoodThatDoesNotExist() {
        when(foodRepository.findById(eq(FOOD_ID))).thenReturn(Optional.empty());

        assertThrows(FoodNotFoundException.class, () -> foodService.update(FOOD_ID, foodRequest("Arroz")));
    }

    private Food captureSaved() {
        ArgumentCaptor<Food> captor = ArgumentCaptor.forClass(Food.class);
        verify(foodRepository).saveAndFlush(captor.capture());
        return captor.getValue();
    }

    private static Food foodWithId(String name) {
        Food food = food(name);
        ReflectionTestUtils.setField(food, "id", FOOD_ID);
        return food;
    }
}
