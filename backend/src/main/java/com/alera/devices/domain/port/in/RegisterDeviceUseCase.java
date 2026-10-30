package com.alera.devices.domain.port.in;

import com.alera.devices.domain.model.Device;
import com.alera.devices.domain.model.Platform;

import java.util.UUID;

public interface RegisterDeviceUseCase {

    Device registerOrUpdate(String fcmToken, Platform platform, UUID userId);

    Device registerOrUpdate(UUID deviceId, String fcmToken, Platform platform, UUID userId);
}
