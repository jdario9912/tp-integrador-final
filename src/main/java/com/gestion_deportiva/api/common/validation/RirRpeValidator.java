package com.gestion_deportiva.api.common.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.math.BigDecimal;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class RirRpeValidator implements ConstraintValidator<ValidRirRpe, String> {

    // El valor admite medio punto ("RPE 8.5"); que RIR sea entero se controla después
    private static final Pattern FORMAT = Pattern.compile("^(RIR|RPE)\\s*(\\d{1,2}(?:\\.5)?)$");
    private static final BigDecimal RIR_MAX = BigDecimal.TEN;
    private static final BigDecimal RPE_MIN = BigDecimal.ONE;
    private static final BigDecimal RPE_MAX = BigDecimal.TEN;

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null || value.isBlank()) {
            return true;
        }
        Matcher matcher = FORMAT.matcher(value.trim().toUpperCase(Locale.ROOT));
        if (!matcher.matches()) {
            return false;
        }
        BigDecimal number = new BigDecimal(matcher.group(2));
        if (matcher.group(1).equals("RIR")) {
            return number.stripTrailingZeros().scale() <= 0 && number.compareTo(RIR_MAX) <= 0;
        }
        return number.compareTo(RPE_MIN) >= 0 && number.compareTo(RPE_MAX) <= 0;
    }
}
