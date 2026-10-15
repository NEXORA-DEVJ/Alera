package com.alera.community.infrastructure.persistence.repository;

import java.time.Instant;
import java.util.UUID;

public interface NearbyIncidentProjection {
    UUID getId();
    UUID getReporterDeviceId();
    String getIncidentType();
    String getDescription();
    double getLatitude();
    double getLongitude();
    int getRadiusMeters();
    String getStatus();
    int getPositiveVotes();
    int getNegativeVotes();
    Instant getReportedAt();
    Instant getExpiresAt();
    String getImageUrls();
    Instant getCreatedAt();
    Instant getUpdatedAt();
    double getDistanceMeters();
}