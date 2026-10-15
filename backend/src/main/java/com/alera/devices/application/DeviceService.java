package com.alera.devices.application;

import com.alera.devices.domain.model.Device;
import com.alera.devices.domain.model.NearbyDeviceLocation;
import com.alera.devices.domain.model.Platform;
import com.alera.devices.domain.port.in.RegisterDeviceUseCase;
import com.alera.devices.domain.port.in.UpdateDeviceLocationUseCase;
import com.alera.devices.domain.port.out.DeviceLocationRepositoryPort;
import com.alera.devices.domain.port.out.DeviceRepositoryPort;
import com.alera.shared.domain.Coordinates;
import com.alera.shared.domain.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

@Service
public class DeviceService implements RegisterDeviceUseCase, UpdateDeviceLocationUseCase {

    private static final long DEFAULT_LOCATION_TTL_SECONDS = 1200L; // 20 minutos

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
        Optional<Device> existingDevice = deviceRepository.findByFcmToken(fcmToken);

        if (existingDevice.isPresent()) {
            Device device = existingDevice.get();
            device.updateToken(fcmToken);
            return deviceRepository.save(device);
        }

        Device newDevice = Device.register(fcmToken, platform, userId);
        return deviceRepository.save(newDevice);
    }

    @Override
    @Transactional
    public Device updateLocation(UUID deviceId, double latitude, double longitude) {
        Device device = deviceRepository.findById(deviceId)
                .orElseGet(() -> {
                    Device autoRegistered = Device.reconstitute(
                            deviceId,
                            null,
                            "DEV_TOKEN_" + deviceId.toString().substring(0, 8),
                            Platform.IOS,
                            true,
                            java.time.Instant.now(),
                            java.time.Instant.now(),
                            java.time.Instant.now()
                    );
                    return deviceRepository.save(autoRegistered);
                });

        Coordinates coordinates = new Coordinates(latitude, longitude);

        device.touch();
        Device updatedDevice = deviceRepository.save(device);

        locationRepository.saveLocation(deviceId, coordinates, DEFAULT_LOCATION_TTL_SECONDS);

        return updatedDevice;
    }

    @Transactional(readOnly = true)
    public List<Device> findActiveDevicesNearby(Coordinates center, double radiusKm) {
        List<UUID> nearbyDeviceIds = locationRepository.findDeviceIdsNearby(center, radiusKm);

        return nearbyDeviceIds.stream()
                .map(deviceRepository::findById)
                .flatMap(Optional::stream)
                .filter(Device::isActive)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<NearbyActiveDevice> findActiveDevicesNearbyWithDistance(Coordinates center, double radiusKm) {
        List<NearbyDeviceLocation> nearby = locationRepository.findNearbyDevicesWithDistance(center, radiusKm);

        return nearby.stream()
                .map(loc -> deviceRepository.findById(loc.deviceId())
                        .filter(Device::isActive)
                        .map(dev -> new NearbyActiveDevice(dev, loc.distanceKm())))
                .flatMap(Optional::stream)
                .toList();
    }
}