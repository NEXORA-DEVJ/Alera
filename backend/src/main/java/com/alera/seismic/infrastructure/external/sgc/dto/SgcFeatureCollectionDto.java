package com.alera.seismic.infrastructure.external.sgc.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record SgcFeatureCollectionDto(
        String type,
        List<SgcFeatureDto> features
) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SgcFeatureDto(
            String id,
            SgcPropertiesDto properties,
            SgcGeometryDto geometry
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SgcPropertiesDto(
            Double mag,
            String magType,
            String place,
            String title,
            String closerTowns,
            String status,
            Long time,
            String utc_time,
            String local_time,
            String utcTime,
            String localTime,
            Double latitude,
            Double longitude,
            Double depth,
            String agency
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SgcGeometryDto(
            String type,
            List<Double> coordinates
    ) {}
}
