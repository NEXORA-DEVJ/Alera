package com.alera.notifications.api.dto;

import com.alera.notifications.domain.port.in.SeismicAlertDispatchResult;

import java.util.UUID;

public record DispatchAlertsResponseDto(
        UUID seismicEventId,
        double magnitude,
        double searchRadiusKm,
        int devicesInRadius,
        int alertsSent,
        int alertsFailed
) {
    public static DispatchAlertsResponseDto fromResult(SeismicAlertDispatchResult result) {
        return new DispatchAlertsResponseDto(
                result.seismicEventId(),
                result.magnitude(),
                result.searchRadiusKm(),
                result.devicesInRadius(),
                result.alertsSent(),
                result.alertsFailed()
        );
    }
}