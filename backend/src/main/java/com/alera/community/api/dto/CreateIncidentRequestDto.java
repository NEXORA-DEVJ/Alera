package com.alera.community.api.dto;

import com.alera.community.domain.model.IncidentType;
import com.alera.shared.domain.DomainException;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

public record CreateIncidentRequestDto(
        @NotNull(message = "El reporterDeviceId es obligatorio")
        UUID reporterDeviceId,

        @NotBlank(message = "El tipo de incidente es obligatorio")
        String incidentType,

        String description,

        @NotNull(message = "La latitud es obligatoria")
        Double latitude,

        @NotNull(message = "La longitud es obligatoria")
        Double longitude,

        Integer radiusMeters,

        @NotNull(message = "Debe adjuntar imagenes de evidencia")
        @Size(min = 1, max = 4, message = "Debe adjuntar entre 1 y 4 imagenes")
        List<String> images
) {
    public IncidentType toIncidentType() {
        try {
            return IncidentType.valueOf(incidentType.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new DomainException("Tipo de incidente invalido: " + incidentType);
        }
    }

    public int getEffectiveRadius() {
        return (radiusMeters == null || radiusMeters <= 0) ? 1000 : radiusMeters;
    }
}