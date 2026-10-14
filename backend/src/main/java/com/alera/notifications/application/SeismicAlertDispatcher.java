package com.alera.notifications.application;

import com.alera.devices.application.DeviceService;
import com.alera.notifications.domain.model.NotificationResult;
import com.alera.notifications.domain.model.PushAlertMessage;
import com.alera.notifications.domain.port.in.DispatchSeismicAlertsUseCase;
import com.alera.notifications.domain.port.in.SeismicAlertDispatchResult;
import com.alera.notifications.domain.port.out.PushNotificationSenderPort;
import com.alera.risk.domain.model.RiskEvaluation;
import com.alera.risk.domain.model.RiskLevel;
import com.alera.risk.domain.service.RiskEvaluator;
import com.alera.seismic.domain.model.SeismicEvent;
import com.alera.seismic.domain.port.out.SeismicEventRepositoryPort;
import com.alera.shared.domain.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@Service
public class SeismicAlertDispatcher implements DispatchSeismicAlertsUseCase {

    private static final Logger log = LoggerFactory.getLogger(SeismicAlertDispatcher.class);

    private final SeismicEventRepositoryPort seismicRepository;
    private final DeviceService deviceService;
    private final PushNotificationSenderPort notificationSender;
    private final RiskEvaluator riskEvaluator;

    public SeismicAlertDispatcher(SeismicEventRepositoryPort seismicRepository,
                                  DeviceService deviceService,
                                  PushNotificationSenderPort notificationSender,
                                  RiskEvaluator riskEvaluator) {
        this.seismicRepository = Objects.requireNonNull(seismicRepository, "SeismicEventRepositoryPort no puede ser nulo");
        this.deviceService = Objects.requireNonNull(deviceService, "DeviceService no puede ser nulo");
        this.notificationSender = Objects.requireNonNull(notificationSender, "PushNotificationSenderPort no puede ser nulo");
        this.riskEvaluator = Objects.requireNonNull(riskEvaluator, "RiskEvaluator no puede ser nulo");
    }

    @Override
    public SeismicAlertDispatchResult dispatchForEvent(UUID seismicEventId) {
        SeismicEvent event = seismicRepository.findById(seismicEventId)
                .orElseThrow(() -> new ResourceNotFoundException("Sismo no encontrado con ID: " + seismicEventId));

        return dispatchForEvent(event);
    }

    @Override
    public SeismicAlertDispatchResult dispatchForEvent(SeismicEvent event) {
        double magnitude = event.getMagnitude().value();
        double depthKm = event.getDepth().kilometers();
        double searchRadiusKm = calculateImpactRadiusKm(magnitude);

        log.info("Iniciando evaluacion de despacho de alerta para sismo ID: {} (M {}, prof: {} km, radio: {} km)",
                event.getId(), magnitude, depthKm, searchRadiusKm);

        // 1. Consultar en Redis los dispositivos activos con sus distancias al epicentro
        List<DeviceService.NearbyActiveDevice> nearbyDevices =
                deviceService.findActiveDevicesNearbyWithDistance(event.getCoordinates(), searchRadiusKm);

        int devicesInRadius = nearbyDevices.size();
        int sentCount = 0;
        int failedCount = 0;

        for (DeviceService.NearbyActiveDevice target : nearbyDevices) {
            double distanceKm = target.distanceKm();

            // 2. Evaluar el riesgo especifico para este dispositivo usando el servicio de riesgo inyectado
            RiskEvaluation risk = riskEvaluator.evaluate(magnitude, depthKm, distanceKm);

            // 3. Solo alertamos si el riesgo es perceptible (MODERATE, HIGH o CRITICAL)
            if (risk.level() != RiskLevel.LOW) {
                String title = String.format("ALERTA SISMICA ALERA - M %.1f", magnitude);
                String body = String.format("%s a %.1f km de tu ubicacion actual.", risk.summary(), distanceKm);

                Map<String, String> data = Map.of(
                        "eventId", event.getId().toString(),
                        "magnitude", String.valueOf(magnitude),
                        "depthKm", String.valueOf(depthKm),
                        "distanceKm", String.valueOf(distanceKm),
                        "riskLevel", risk.level().name(),
                        "calculationSource", risk.calculationSource()
                );

                PushAlertMessage alertMessage = new PushAlertMessage(
                        target.device().getFcmToken(),
                        title,
                        body,
                        data
                );

                NotificationResult result = notificationSender.send(alertMessage);
                if (result.success()) {
                    sentCount++;
                } else {
                    failedCount++;
                }
            } else {
                log.debug("Dispositivo {} descartado por riesgo bajo (distancia: {} km)",
                        target.device().getId(), distanceKm);
            }
        }

        log.info("Despacho completado para sismo {}: {} dispositivos en radio, {} alertas despachadas, {} fallidas",
                event.getId(), devicesInRadius, sentCount, failedCount);

        return new SeismicAlertDispatchResult(
                event.getId(),
                magnitude,
                searchRadiusKm,
                devicesInRadius,
                sentCount,
                failedCount
        );
    }

    private double calculateImpactRadiusKm(double magnitude) {
        if (magnitude >= 6.0) return 350.0;
        if (magnitude >= 5.0) return 250.0;
        if (magnitude >= 4.0) return 150.0;
        if (magnitude >= 3.5) return 80.0;
        return 40.0;
    }
}