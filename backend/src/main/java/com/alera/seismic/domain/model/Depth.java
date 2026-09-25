package com.alera.seismic.domain.model;

import com.alera.shared.domain.DomainException;

public record Depth(double kilometers) {

    public Depth{
        if (kilometers < 0.0 || kilometers > 800.0) {
            throw new DomainException("La profundidad sísmica debe estar en el rango [0.0, 800.0]. Valor recibido: " + kilometers);
        }
    }
}
