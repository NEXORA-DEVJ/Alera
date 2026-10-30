package com.alera.notifications.api.rest;

import com.alera.devices.infrastructure.persistence.repository.DeviceSpringDataJpaRepository;
import com.alera.notifications.api.dto.DispatchAlertsResponseDto;
import com.alera.notifications.domain.model.PushAlertMessage;
import com.alera.notifications.domain.port.in.DispatchSeismicAlertsUseCase;
import com.alera.notifications.domain.port.in.SeismicAlertDispatchResult;
import com.alera.notifications.domain.port.out.PushNotificationSenderPort;
import com.alera.shared.api.dto.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/seismic-events")
public class SeismicAlertController {

    private static volatile Map<String, Object> activeEmergencyAlert = null;
    private static volatile long activeEmergencyAlertExpiry = 0L;

    private final DispatchSeismicAlertsUseCase dispatchAlertsUseCase;
    private final PushNotificationSenderPort notificationSender;
    private final DeviceSpringDataJpaRepository deviceRepository;

    @org.springframework.beans.factory.annotation.Value("${alera.security.admin-key:alera_admin_secret_key_2026}")
    private String configuredAdminKey;

    public SeismicAlertController(DispatchSeismicAlertsUseCase dispatchAlertsUseCase,
                                  PushNotificationSenderPort notificationSender,
                                  DeviceSpringDataJpaRepository deviceRepository) {
        this.dispatchAlertsUseCase = Objects.requireNonNull(dispatchAlertsUseCase, "DispatchSeismicAlertsUseCase no puede ser nulo");
        this.notificationSender = Objects.requireNonNull(notificationSender, "PushNotificationSenderPort no puede ser nulo");
        this.deviceRepository = Objects.requireNonNull(deviceRepository, "DeviceSpringDataJpaRepository no puede ser nulo");
    }

    private void verifyAdminKey(String requestKey) {
        if (configuredAdminKey == null || configuredAdminKey.isBlank()) {
            return;
        }
        if (requestKey == null || !requestKey.trim().equals(configuredAdminKey.trim())) {
            throw new SecurityException("Acceso no autorizado: Cabecera 'X-ALERA-ADMIN-KEY' ausente o invalida.");
        }
    }

    @PostMapping("/{id}/dispatch-alerts")
    public ResponseEntity<ApiResponse<DispatchAlertsResponseDto>> dispatchAlerts(
            @PathVariable("id") UUID id,
            @org.springframework.web.bind.annotation.RequestHeader(value = "X-ALERA-ADMIN-KEY", required = false) String adminKey) {
        verifyAdminKey(adminKey);
        SeismicAlertDispatchResult result = dispatchAlertsUseCase.dispatchForEvent(id);

        return ResponseEntity.ok(ApiResponse.ok(DispatchAlertsResponseDto.fromResult(result)));
    }

    @PostMapping("/test-alert")
    public ResponseEntity<ApiResponse<Map<String, Object>>> dispatchTestAlert(
            @org.springframework.web.bind.annotation.RequestHeader(value = "X-ALERA-ADMIN-KEY", required = false) String adminKey) {
        verifyAdminKey(adminKey);
        long now = System.currentTimeMillis();
        String alertId = "test-seismic-" + now;

        activeEmergencyAlert = Map.of(
                "id", alertId,
                "type", "seismic",
                "title", "ALERTA SISMICA ALERA - M 6.2 (SIMULACRO DE PRUEBA)",
                "body", "Simulacro oficial de prueba ALERA: Sismo fuerte simulado en Mesa de los Santos. Tu dispositivo esta correctamente configurado.",
                "magnitude", 6.2,
                "depthKm", 145.0,
                "timestamp", now
        );
        activeEmergencyAlertExpiry = now + 45000L; // Activa durante 45 segundos

        var devices = deviceRepository.findAll();
        int sent = 0;

        for (var dev : devices) {
            if (dev.getFcmToken() != null && !dev.getFcmToken().isBlank()) {
                PushAlertMessage msg = new PushAlertMessage(
                        dev.getFcmToken(),
                        "ALERTA SISMICA ALERA - M 6.2 (SIMULACRO DE PRUEBA)",
                        "Simulacro oficial de prueba ALERA: Sismo fuerte simulado en Mesa de los Santos. Tu dispositivo esta correctamente configurado.",
                        Map.of(
                                "type", "seismic",
                                "magnitude", "6.2",
                                "depthKm", "145.0",
                                "distanceKm", "25.0",
                                "riskLevel", "HIGH",
                                "isSimulation", "true"
                        )
                );
                notificationSender.send(msg);
                sent++;
            }
        }

        Map<String, Object> result = Map.of(
                "status", "DISPATCHED",
                "alertId", alertId,
                "devicesFound", devices.size(),
                "notificationsSent", sent,
                "message", "Simulacro de alerta sismica despachado y sincronizado en tiempo real con los dispositivos activos."
        );

        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/active-emergency")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getActiveEmergency() {
        long now = System.currentTimeMillis();
        if (activeEmergencyAlert != null && now < activeEmergencyAlertExpiry) {
            return ResponseEntity.ok(ApiResponse.ok(activeEmergencyAlert));
        }
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}