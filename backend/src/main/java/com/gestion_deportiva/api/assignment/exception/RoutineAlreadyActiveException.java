package com.gestion_deportiva.api.assignment.exception;

import com.gestion_deportiva.api.common.exception.BusinessRuleException;

// La rutina que se quiere asignar ya es la activa del atleta. Es un 422 y no un 409 para que el cliente no lo
// confunda con el pedido de confirmación de ActiveAssignmentExistsException
public class RoutineAlreadyActiveException extends BusinessRuleException {

    public static final String MESSAGE = "El atleta ya tiene asignada esta rutina";

    public RoutineAlreadyActiveException() {
        super(MESSAGE);
    }
}
