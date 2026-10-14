package com.alera.devices.domain.port.in;

import com.alera.devices.domain.model.Device;

import java.util.UUID;

public interface UpdateDeviceLocationUseCase {

    Device updateLocation(UUID deviceId, double latitude, double longitude);
}