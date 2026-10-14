package com.alera.devices.api.rest;

import com.alera.devices.api.dto.DeviceResponseDto;
import com.alera.devices.api.dto.RegisterDeviceRequestDto;
import com.alera.devices.api.dto.UpdateDeviceLocationRequestDto;
import com.alera.devices.domain.model.Device;
import com.alera.devices.domain.port.in.RegisterDeviceUseCase;
import com.alera.devices.domain.port.in.UpdateDeviceLocationUseCase;
import com.alera.shared.api.dto.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Objects;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/devices")
public class DeviceController {

    private final RegisterDeviceUseCase registerDeviceUseCase;
    private final UpdateDeviceLocationUseCase updateDeviceLocationUseCase;

    public DeviceController(RegisterDeviceUseCase registerDeviceUseCase,
                            UpdateDeviceLocationUseCase updateDeviceLocationUseCase) {
        this.registerDeviceUseCase = Objects.requireNonNull(registerDeviceUseCase, "RegisterDeviceUseCase no puede ser nulo");
        this.updateDeviceLocationUseCase = Objects.requireNonNull(updateDeviceLocationUseCase, "UpdateDeviceLocationUseCase no puede ser nulo");
    }

    @PostMapping
    public ResponseEntity<ApiResponse<DeviceResponseDto>> registerDevice(
            @Valid @RequestBody RegisterDeviceRequestDto request) {

        Device device = registerDeviceUseCase.registerOrUpdate(
                request.fcmToken(),
                request.toPlatform(),
                request.userId()
        );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.ok(DeviceResponseDto.fromDomain(device)));
    }

    @PutMapping("/{id}/location")
    public ResponseEntity<ApiResponse<DeviceResponseDto>> updateLocation(
            @PathVariable("id") UUID id,
            @Valid @RequestBody UpdateDeviceLocationRequestDto request) {

        Device device = updateDeviceLocationUseCase.updateLocation(
                id,
                request.latitude(),
                request.longitude()
        );

        return ResponseEntity.ok(ApiResponse.ok(DeviceResponseDto.fromDomain(device)));
    }

    @PostMapping("/{id}/location")
    public ResponseEntity<ApiResponse<DeviceResponseDto>> updateLocationPost(
            @PathVariable("id") UUID id,
            @Valid @RequestBody UpdateDeviceLocationRequestDto request) {
        return updateLocation(id, request);
    }
}