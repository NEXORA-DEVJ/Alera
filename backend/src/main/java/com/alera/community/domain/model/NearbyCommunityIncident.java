package com.alera.community.domain.model;

public record NearbyCommunityIncident(
        CommunityIncident incident,
        double distanceMeters
) {
    public double distanceKm() {
        return Math.round((distanceMeters / 1000.0) * 10.0) / 10.0;
    }
}