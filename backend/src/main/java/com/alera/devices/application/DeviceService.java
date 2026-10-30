package com.alera.devices.application;

import com.alera.devices.domain.model.Device;
import com.alera.devices.domain.model.NearbyDeviceLocation;
import com.alera.devices.domain.model.Platform;
import com.alera.devices.domain.port.in.RegisterDeviceUseCase;
import com.alera.devices.domain.port.in.UpdateDeviceLocationUseCase;
import com.alera.devices.domain.port.out.DeviceLocationRepositoryPort;
import com.alera.devices.domain.port.out.DeviceRepositoryPort;
import com.alera.shared.domain.Coordinates;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

@Service
public class DeviceService implements RegisterDeviceUseCase, UpdateDeviceLocationUseCase {

    private static final long DEFAULT_LOCATION_TTL_SECONDS = 7200; // 2 horas de vigencia de ubicacion efimera

    private final DeviceRepositoryPort deviceRepository;
    private final DeviceLocationRepositoryPort locationRepository;

    public record NearbyActiveDevice(
            Device device,
            double distanceKm
    ) {}

    public DeviceService(DeviceRepositoryPort deviceRepository,
                         DeviceLocationRepositoryPort locationRepository) {
        this.deviceRepository = Objects.requireNonNull(deviceRepository, "DeviceRepositoryPort no puede ser nulo");
        this.locationRepository = Objects.requireNonNull(locationRepository, "DeviceLocationRepositoryPort no puede ser nulo");
    }

    @Override
    @Transactional
    public Device registerOrUpdate(String fcmToken, Platform platform, UUID userId) {
        return registerOrUpdate(null, fcmToken, platform, userId);
    }

    @Override
    @Transactional
    public Device registerOrUpdate(UUID deviceId, String fcmToken, Platform platform, UUID userId) {
        // 1. Si viene con deviceId explícito, buscarlo para actualizar su token
        if (deviceId != null) {
            Optional<Device> byId = deviceRepository.findById(deviceId);
            if (byId.isPresent()) {
                Device dev = byId.get();
                dev.updateToken(fcmToken);
                return deviceRepository.save(dev);
            }
        }

        // 2. Si ya existe un registro con ese fcmToken, actualizarlo
        Optional<Device> existingDevice = deviceRepository.findByFcmToken(fcmToken);
        if (existingDevice.isPresent()) {
            Device device = existingDevice.get();
            device.updateToken(fcmToken);
            return deviceRepository.save(device);
        }

        // 3. Crear nuevo dispositivo (respetando deviceId si fue provisto)
        Device newDevice = (deviceId != null)
                ? Device.reconstitute(
                        deviceId,
                        userId,
                        fcmToken,
                        platform,
                        true,
                        java.time.Instant.now(),
                        java.time.Instant.now(),
                        java.time.Instant.now()
                )
                : Device.register(fcmToken, platform, userId);

        return deviceRepository.save(newDevice);
    }

    @Override
    @Transactional
    public Device updateLocation(UUID deviceId, double latitude, double longitude) {
        Device device = deviceRepository.findById(deviceId)
                .orElseGet(() -> Device.reconstitute(
                        deviceId,
                        null,
                        "DEV_TOKEN_" + deviceId.toString().substring(0, 8),
                        Platform.ANDROID,
                        true,
                        java.time.Instant.now(),
                        java.time.Instant.now(),
                        java.time.Instant.now()
                ));

        Coordinates coordinates = new Coordinates(latitude, longitude);

        device.touch();
        Device updatedDevice = deviceRepository.save(device);

        locationRepository.saveLocation(deviceId, coordinates, DEFAULT_LOCATION_TTL_SECONDS);

        return updatedDevice;
    }

    @Transactional(readOnly = true)
    public List<Device> findActiveDevicesNearby(Coordinates center, double radiusKm) {
        List<UUID> nearbyDeviceIds = locationRepository.findDeviceIdsNearby(center, radiusKm);
        if (nearbyDeviceIds.isEmpty()) {
            return List.of();
        }
        return deviceRepository.findAllById(nearbyDeviceIds);
    }

    @Transactional(readOnly = true)
    public List<NearbyActiveDevice> findActiveDevicesNearbyWithDistance(Coordinates center, double radiusKm) {
        List<NearbyDeviceLocation> geoResults =
                locationRepository.findNearbyDevicesWithDistance(center, radiusKm);

        if (geoResults.isEmpty()) {
            return List.of();
        }

        List<UUID> ids = geoResults.stream()
                .map(NearbyDeviceLocation::deviceId)
                .toList();

        List<Device> devices = deviceRepository.findAllById(ids);
        java.util.Map<UUID, Device> deviceMap = devices.stream()
                .collect(java.util.stream.Collectors.toMap(Device::getId, d -> d));

        return geoResults.stream()
                .map(r -> {
                    Device d = deviceMap.get(r.deviceId());
                    return d != null ? new NearbyActiveDevice(d, r.distanceKm()) : null;
                })
                .filter(Objects::nonNull)
                .toList();
    }
}
