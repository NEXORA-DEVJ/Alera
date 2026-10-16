package com.alera.community.api.dto;

import com.alera.community.domain.model.IncidentType;
import com.alera.shared.domain.DomainException;
import com.alera.shared.util.TextSanitizer;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
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

        @Size(max = 500, message = "La descripción no puede superar los 500 caracteres")
        String description,

        @NotNull(message = "La latitud es obligatoria")
        @DecimalMin(value = "-90.0", message = "La latitud mínima es -90.0")
        @DecimalMax(value = "90.0", message = "La latitud máxima es 90.0")
        Double latitude,

        @NotNull(message = "La longitud es obligatoria")
        @DecimalMin(value = "-180.0", message = "La longitud mínima es -180.0")
        @DecimalMax(value = "180.0", message = "La longitud máxima es 180.0")
        Double longitude,

        @Min(value = 50, message = "El radio mínimo de afectación es 50 metros")
        @Max(value = 100000, message = "El radio máximo de afectación es 100,000 metros (100 km)")
        Integer radiusMeters,

        @NotNull(message = "Debe adjuntar imágenes de evidencia")
        @Size(min = 1, max = 4, message = "Debe adjuntar entre 1 y 4 imágenes")
        List<String> images
) {
    public CreateIncidentRequestDto {
        // Sanitización automática contra XSS, scripts y URLs excesivas
        description = TextSanitizer.sanitize(description);
    }

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