package com.gestion_deportiva.api.user.model.enums.converter;

import com.gestion_deportiva.api.common.catalog.AbstractCatalogConverter;
import com.gestion_deportiva.api.user.model.enums.Role;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class RoleConverter extends AbstractCatalogConverter<Role> {

    public RoleConverter() {
        super(Role.class);
    }
}
