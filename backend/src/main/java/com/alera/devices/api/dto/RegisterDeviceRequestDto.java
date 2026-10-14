package com.alera.devices.api.dto;

import com.alera.devices.domain.model.Platform;
import com.alera.shared.domain.DomainException;
import jakarta.validation.constraints.NotBlank;

import java.util.UUID;

public record RegisterDeviceRequestDto(
        @NotBlank(message = "El token FCM es obligatorio")
        String fcmToken,

        @NotBlank(message = "La plataforma (ANDROID / IOS) es obligatoria")
        String platform,

        UUID userId
) {
    public Platform toPlatform() {
        try {
            return Platform.valueOf(platform.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new DomainException("Plataforma invalida: " + platform + ". Valores permitidos: ANDROID, IOS");
        }
    }
}