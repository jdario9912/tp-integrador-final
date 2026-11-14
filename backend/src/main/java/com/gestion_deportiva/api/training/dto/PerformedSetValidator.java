package com.gestion_deportiva.api.training.dto;

import com.gestion_deportiva.api.training.model.enums.SetStatus;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;

public class PerformedSetValidator implements ConstraintValidator<ValidPerformedSet, PerformedSetRequest> {

    static final BigDecimal WEIGHT_MAX = new BigDecimal("9999.99");
    static final int WEIGHT_MAX_DECIMALS = 2;
    static final int REPS_MIN = 1;
    static final int REPS_MAX = 999;
    static final int RPE_MIN = 1;
    static final int RPE_MAX = 10;
    static final int SKIP_REASON_MAX_LENGTH = 200;

    // Sin estado no hay nada que cruzar: @NotNull ya informa el campo faltante
    @Override
    public boolean isValid(PerformedSetRequest request, ConstraintValidatorContext context) {
        if (request == null || request.status() == null) {
            return true;
        }
        Map<String, String> errors = new LinkedHashMap<>();
        if (request.status() == SetStatus.DONE) {
            checkDone(request, errors);
        } else {
            checkSkipped(request, errors);
        }
        if (errors.isEmpty()) {
            return true;
        }
        context.disableDefaultConstraintViolation();
        errors.forEach((field, message) -> context.buildConstraintViolationWithTemplate(message)
                .addPropertyNode(field)
                .addConstraintViolation());
        return false;
    }

    // Realizada: peso y repeticiones obligatorios; el RPE es opcional. Un motivo que llegue se ignora
    private static void checkDone(PerformedSetRequest request, Map<String, String> errors) {
        BigDecimal weight = request.weight();
        if (weight == null) {
            errors.put("weight", "Ingresá el peso de una serie realizada");
        } else if (weight.signum() < 0) {
            errors.put("weight", "El peso no puede ser negativo");
        } else if (weight.compareTo(WEIGHT_MAX) > 0 || weight.stripTrailingZeros().scale() > WEIGHT_MAX_DECIMALS) {
            errors.put("weight", "El peso debe estar entre 0 y 9999,99");
        }

        Integer reps = request.reps();
        if (reps == null) {
            errors.put("reps", "Ingresá las repeticiones de una serie realizada");
        } else if (reps < REPS_MIN || reps > REPS_MAX) {
            errors.put("reps", "Las repeticiones deben estar entre 1 y 999");
        }

        Integer rpe = request.rpe();
        if (rpe != null && (rpe < RPE_MIN || rpe > RPE_MAX)) {
            errors.put("rpe", "El RPE debe estar entre 1 y 10");
        }
    }

    // Omitida: el motivo obligatorio. Peso, repeticiones y RPE que lleguen se descartan, sin error
    private static void checkSkipped(PerformedSetRequest request, Map<String, String> errors) {
        String reason = request.skipReason() == null ? "" : request.skipReason().strip();
        if (reason.isEmpty()) {
            errors.put("skipReason", "Ingresá el motivo de una serie omitida");
        } else if (reason.length() > SKIP_REASON_MAX_LENGTH) {
            errors.put("skipReason", "El motivo no puede superar los 200 caracteres");
        }
    }
}
