package com.alera.seismic.api.dto;

import com.alera.seismic.domain.model.SeismicEvent;

import java.time.Instant;
import java.util.UUID;

public record SeismicEventResponseDto(
        UUID id,
        String source,
        String externalId,
        double magnitude,
        double depthKm,
        double latitude,
        double longitude,
        String epicenterDescription,
        Instant originTime,
        String reviewStatus
) {
    public static SeismicEventResponseDto fromDomain(SeismicEvent event) {
        return new SeismicEventResponseDto(
                event.getId(),
                event.getSource().name(),
                event.getExternalId(),
                event.getMagnitude().value(),
                event.getDepth().kilometers(),
                event.getCoordinates().latitude(),
                event.getCoordinates().longitude(),
                event.getEpicenterDescription(),
                event.getOriginTime(),
                event.getReviewStatus().name()
        );
    }
}