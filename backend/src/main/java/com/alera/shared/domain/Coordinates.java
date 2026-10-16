package com.alera.shared.domain;

import java.io.Serializable;

public record Coordinates(double latitude, double longitude) implements Serializable {

    public Coordinates {
        if (latitude < -90.0 || latitude > 90.0) {
            throw new DomainException("La latitud debe estar en el rango [-90.0, 90.0]. Valor recibido: " + latitude);
        }
        if (longitude < -180.0 || longitude > 180.0) {
            throw new DomainException("La longitud debe estar en el rango [-180.0, 180.0]. Valor recibido: " + longitude);
        }
    }
}