package com.alera.community.api.dto;

import com.alera.community.domain.model.CommunityIncident;

import java.time.Instant;
import java.util.UUID;

public record CommunityIncidentResponseDto(
        UUID id,
        UUID reporterDeviceId,
        String incidentType,
        String description,
        double latitude,
        double longitude,
        int radiusMeters,
        String status,
        int positiveVotes,
        int negativeVotes,
        Instant reportedAt,
        Instant expiresAt,
        Instant createdAt,
        Instant updatedAt
) {
    public static CommunityIncidentResponseDto fromDomain(CommunityIncident incident) {
        return new CommunityIncidentResponseDto(
                incident.getId(),
                incident.getReporterDeviceId(),
                incident.getIncidentType().name(),
                incident.getDescription(),
                incident.getCoordinates().latitude(),
                incident.getCoordinates().longitude(),
                incident.getRadiusMeters(),
                incident.getStatus().name(),
                incident.getPositiveVotes(),
                incident.getNegativeVotes(),
                incident.getReportedAt(),
                incident.getExpiresAt(),
                incident.getCreatedAt(),
                incident.getUpdatedAt()
        );
    }
}