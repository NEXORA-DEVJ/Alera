package com.alera.devices.domain.port.out;

import com.alera.devices.domain.model.Device;

import java.util.Optional;
import java.util.UUID;

public interface DeviceRepositoryPort {

    Device save(Device device);

    Optional<Device> findById(UUID id);

    Optional<Device> findByFcmToken(String fcmToken);
}