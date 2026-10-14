package com.alera.notifications.domain.port.in;

import java.util.UUID;

public record SeismicAlertDispatchResult(
        UUID seismicEventId,
        double magnitude,
        double searchRadiusKm,
        int devicesInRadius,
        int alertsSent,
        int alertsFailed
) {
}