package com.alera.seismic.infrastructure.persistence.repository;

import java.time.Instant;
import java.util.UUID;

/**
 * Proyección de interfaz de Spring Data JPA para mapear el resultado de la consulta nativa PostGIS.
 */
public interface NearbySeismicProjection {
    UUID getId();
    String getSource();
    String getExternalId();
    double getMagnitude();
    double getDepthKm();
    double getLatitude();
    double getLongitude();
    String getEpicenterDescription();
    Instant getOriginTime();
    String getReviewStatus();
    Instant getCreatedAt();
    Instant getUpdatedAt();
    double getDistanceMeters();
}