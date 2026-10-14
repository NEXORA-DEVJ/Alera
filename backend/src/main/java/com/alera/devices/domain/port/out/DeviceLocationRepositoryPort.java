package com.alera.devices.domain.port.out;

import com.alera.shared.domain.Coordinates;

import java.util.List;
import java.util.UUID;

public interface DeviceLocationRepositoryPort {

    /**
     * Guarda en Redis la ubicación con un TTL de expiración automática.
     */
    void saveLocation(UUID deviceId, Coordinates coordinates, long ttlSeconds);

    /**
     * Consulta en Redis los IDs de dispositivos ubicados dentro de un radio en kilómetros.
     */
    List<UUID> findDeviceIdsNearby(Coordinates center, double radiusKm);
}