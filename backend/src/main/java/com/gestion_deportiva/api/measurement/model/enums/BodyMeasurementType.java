package com.gestion_deportiva.api.measurement.model.enums;

import com.gestion_deportiva.api.common.catalog.CatalogEnum;

import java.math.BigDecimal;

// Catálogo body_measurement_types (US-45): las medidas que se pueden registrar, con su unidad, si son bilaterales
// y el rango válido de cada valor (inclusive). Los ids coinciden con la V20 y CatalogSchemaTest mantiene igual la tabla
public enum BodyMeasurementType implements CatalogEnum {

    WAIST(1, "Cintura", "cm", false, 20, 300),
    CHEST(2, "Pecho", "cm", false, 20, 300),
    HIP(3, "Cadera", "cm", false, 20, 300),
    ARM(4, "Brazo", "cm", true, 5, 100),
    LEG(5, "Pierna (muslo)", "cm", true, 10, 150),
    BODY_FAT(6, "% de grasa", "%", false, 1, 75);

    private final short id;
    private final String displayName;
    private final String unit;
    private final boolean bilateral;
    private final BigDecimal minValue;
    private final BigDecimal maxValue;

    BodyMeasurementType(int id, String displayName, String unit, boolean bilateral, int minValue, int maxValue) {
        this.id = (short) id;
        this.displayName = displayName;
        this.unit = unit;
        this.bilateral = bilateral;
        this.minValue = new BigDecimal(minValue);
        this.maxValue = new BigDecimal(maxValue);
    }

    @Override
    public short getId() {
        return id;
    }

    // Nombre en castellano para mostrar en el front
    public String getDisplayName() {
        return displayName;
    }

    public String getUnit() {
        return unit;
    }

    // true: la medida se toma de los dos lados y el registro necesita el side (LEFT o RIGHT)
    public boolean isBilateral() {
        return bilateral;
    }

    public BigDecimal getMinValue() {
        return minValue;
    }

    public BigDecimal getMaxValue() {
        return maxValue;
    }

    // Bilateral: el lado es obligatorio (un solo lado también vale). No bilateral: el lado no se admite (null)
    public boolean acceptsSide(MeasurementSide side) {
        return bilateral ? side != null : side == null;
    }

    // Rango inclusive de min a max. No mira la escala: eso lo controla el valor al guardarse
    public boolean isWithinRange(BigDecimal value) {
        return value.compareTo(minValue) >= 0 && value.compareTo(maxValue) <= 0;
    }

    public static BodyMeasurementType fromId(short id) {
        return CatalogEnum.fromId(BodyMeasurementType.class, id);
    }
}
