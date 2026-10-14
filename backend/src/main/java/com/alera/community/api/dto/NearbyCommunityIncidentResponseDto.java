package com.alera.community.api.dto;

import com.alera.community.domain.model.NearbyCommunityIncident;

public record NearbyCommunityIncidentResponseDto(
        CommunityIncidentResponseDto incident,
        double distanceMeters,
        double distanceKm
) {
    public static NearbyCommunityIncidentResponseDto fromDomain(NearbyCommunityIncident nearby) {
        return new NearbyCommunityIncidentResponseDto(
                CommunityIncidentResponseDto.fromDomain(nearby.incident()),
                nearby.distanceMeters(),
                nearby.distanceKm()
        );
    }
}