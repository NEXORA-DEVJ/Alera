package com.alera.devices.api.dto;

import com.alera.devices.domain.model.Device;

import java.time.Instant;
import java.util.UUID;

public record DeviceResponseDto(
        UUID id,
        UUID userId,
        String fcmToken,
        String platform,
        boolean isActive,
        Instant lastSeenAt,
        Instant createdAt,
        Instant updatedAt
) {
    public static DeviceResponseDto fromDomain(Device device) {
        return new DeviceResponseDto(
                device.getId(),
                device.getUserId(),
                device.getFcmToken(),
                device.getPlatform().name(),
                device.isActive(),
                device.getLastSeenAt(),
                device.getCreatedAt(),
                device.getUpdatedAt()
        );
    }
}