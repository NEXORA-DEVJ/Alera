package com.alera.seismic.infrastructure.external.usgs.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record UsgsFeatureCollectionDto(
        String type,
        List<UsgsFeatureDto> features
) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record UsgsFeatureDto(
            String id,
            UsgsPropertiesDto properties,
            UsgsGeometryDto geometry
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record UsgsPropertiesDto(
            Double mag,
            String place,
            Long time,
            String status
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record UsgsGeometryDto(
            String type,
            List<Double> coordinates // [0]=longitude, [1]=latitude, [2]=depth_km
    ) {}
}