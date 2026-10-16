package com.alera.seismic.domain.model;

import com.alera.shared.domain.DomainException;

import java.io.Serializable;

public record Magnitude(double value) implements Serializable {

    public Magnitude {
        if (value < 0.0 || value > 10.0) {
            throw new DomainException("La magnitud sísmica debe estar en el rango [0.0, 10.0]. Valor recibido: " + value);
        }
    }
}