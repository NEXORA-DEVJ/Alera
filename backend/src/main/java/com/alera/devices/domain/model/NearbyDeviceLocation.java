package com.alera.devices.domain.model;

import java.util.UUID;

public record NearbyDeviceLocation(
        UUID deviceId,
        double distanceKm
) {
}