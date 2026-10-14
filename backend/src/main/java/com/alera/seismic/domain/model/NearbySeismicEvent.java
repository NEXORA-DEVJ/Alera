package com.alera.seismic.domain.model;

/**
 * Value Object de dominio que asocia un sismo con la distancia calculada en metros.
 */
public record NearbySeismicEvent(
        SeismicEvent event,
        double distanceMeters
) {
    public double distanceKm() {
        return Math.round((distanceMeters / 1000.0) * 10.0) / 10.0;
    }
}