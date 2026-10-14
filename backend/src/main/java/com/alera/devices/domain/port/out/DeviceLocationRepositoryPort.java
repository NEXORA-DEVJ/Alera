package com.alera.devices.domain.port.out;

import com.alera.devices.domain.model.NearbyDeviceLocation;
import com.alera.shared.domain.Coordinates;

import java.util.List;
import java.util.UUID;

public interface DeviceLocationRepositoryPort {

    void saveLocation(UUID deviceId, Coordinates coordinates, long ttlSeconds);

    List<UUID> findDeviceIdsNearby(Coordinates center, double radiusKm);

    List<NearbyDeviceLocation> findNearbyDevicesWithDistance(Coordinates center, double radiusKm);
}