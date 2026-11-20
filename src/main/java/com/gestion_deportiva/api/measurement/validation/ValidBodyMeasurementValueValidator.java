package com.gestion_deportiva.api.measurement.validation;

import com.gestion_deportiva.api.measurement.dto.BodyMeasurementValueRequest;
import com.gestion_deportiva.api.measurement.model.enums.BodyMeasurementType;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.math.BigDecimal;

public class ValidBodyMeasurementValueValidator
        implements ConstraintValidator<ValidBodyMeasurementValue, BodyMeasurementValueRequest> {

    // Sin tipo no hay reglas que aplicar: el "type obligatorio" lo informa @NotNull. Un valor null lo informa @NotNull
    // y un valor no positivo lo informa @DecimalMin: el rango solo se mira con un valor positivo, para no repetir el error
    @Override
    public boolean isValid(BodyMeasurementValueRequest request, ConstraintValidatorContext context) {
        if (request == null || request.type() == null) {
            return true;
        }
        context.disableDefaultConstraintViolation();
        boolean valid = true;

        BodyMeasurementType type = request.type();
        if (!type.acceptsSide(request.side())) {
            valid = false;
            String message = type.isBilateral()
                    ? "Indique el lado de la medida (LEFT o RIGHT)"
                    : "Esta medida no admite lado";
            addViolation(context, "side", message);
        }

        BigDecimal value = request.value();
        if (value != null && value.signum() > 0 && !type.isWithinRange(value)) {
            valid = false;
            addViolation(context, "value", "El valor debe estar entre " + type.getMinValue().toPlainString()
                    + " y " + type.getMaxValue().toPlainString());
        }
        return valid;
    }

    private static void addViolation(ConstraintValidatorContext context, String property, String message) {
        context.buildConstraintViolationWithTemplate(message)
                .addPropertyNode(property)
                .addConstraintViolation();
    }
}
