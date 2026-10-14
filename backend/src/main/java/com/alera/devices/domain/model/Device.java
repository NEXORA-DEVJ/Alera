package com.alera.devices.domain.model;

import com.alera.shared.domain.DomainException;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

public class Device {

    private final UUID id;
    private UUID userId;
    private String fcmToken;
    private final Platform platform;
    private boolean isActive;
    private Instant lastSeenAt;
    private final Instant createdAt;
    private Instant updatedAt;

    private Device(UUID id,
                   UUID userId,
                   String fcmToken,
                   Platform platform,
                   boolean isActive,
                   Instant lastSeenAt,
                   Instant createdAt,
                   Instant updatedAt) {
        validateInvariants(fcmToken, platform);
        this.id = Objects.requireNonNull(id, "El ID del dispositivo no puede ser nulo");
        this.userId = userId;
        this.fcmToken = fcmToken.trim();
        this.platform = platform;
        this.isActive = isActive;
        this.lastSeenAt = Objects.requireNonNull(lastSeenAt, "lastSeenAt no puede ser nulo");
        this.createdAt = Objects.requireNonNull(createdAt, "createdAt no puede ser nulo");
        this.updatedAt = Objects.requireNonNull(updatedAt, "updatedAt no puede ser nulo");
    }

    /**
     * Factoría para registrar un nuevo dispositivo móvil.
     */
    public static Device register(String fcmToken, Platform platform, UUID userId) {
        Instant now = Instant.now();
        return new Device(
                UUID.randomUUID(),
                userId,
                fcmToken,
                platform,
                true,
                now,
                now,
                now
        );
    }

    /**
     * Factoría para reconstituir desde PostgreSQL.
     */
    public static Device reconstitute(UUID id,
                                      UUID userId,
                                      String fcmToken,
                                      Platform platform,
                                      boolean isActive,
                                      Instant lastSeenAt,
                                      Instant createdAt,
                                      Instant updatedAt) {
        return new Device(id, userId, fcmToken, platform, isActive, lastSeenAt, createdAt, updatedAt);
    }

    public void updateToken(String newFcmToken) {
        if (newFcmToken == null || newFcmToken.trim().isEmpty()) {
            throw new DomainException("El nuevo token FCM no puede estar vacio");
        }
        this.fcmToken = newFcmToken.trim();
        this.isActive = true;
        this.touch();
    }

    public void touch() {
        this.lastSeenAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public void deactivate() {
        this.isActive = false;
        this.updatedAt = Instant.now();
    }

    private static void validateInvariants(String fcmToken, Platform platform) {
        if (fcmToken == null || fcmToken.trim().isEmpty()) {
            throw new DomainException("El token FCM es obligatorio");
        }
        if (platform == null) {
            throw new DomainException("La plataforma (ANDROID/IOS) es obligatoria");
        }
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public String getFcmToken() { return fcmToken; }
    public Platform getPlatform() { return platform; }
    public boolean isActive() { return isActive; }
    public Instant getLastSeenAt() { return lastSeenAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}