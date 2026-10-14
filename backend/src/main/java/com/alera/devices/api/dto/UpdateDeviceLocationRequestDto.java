package com.alera.devices.api.dto;

import jakarta.validation.constraints.NotNull;

public record UpdateDeviceLocationRequestDto(
        @NotNull(message = "La latitud es obligatoria")
        Double latitude,

        @NotNull(message = "La longitud es obligatoria")
        Double longitude
) {
}