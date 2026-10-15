package com.alera.community.application;

import com.alera.community.domain.model.CommunityIncident;
import com.alera.community.domain.model.ConfirmationVoteType;
import com.alera.community.domain.model.IncidentType;
import com.alera.community.domain.model.NearbyCommunityIncident;
import com.alera.community.domain.port.in.ConfirmIncidentUseCase;
import com.alera.community.domain.port.in.CreateCommunityIncidentUseCase;
import com.alera.community.domain.port.in.GetNearbyIncidentsUseCase;
import com.alera.community.domain.port.out.CommunityIncidentRepositoryPort;
import com.alera.community.domain.port.out.IncidentConfirmationRepositoryPort;
import com.alera.devices.application.DeviceService;
import com.alera.notifications.domain.model.PushAlertMessage;
import com.alera.notifications.domain.port.out.PushNotificationSenderPort;
import com.alera.shared.domain.Coordinates;
import com.alera.shared.domain.DomainException;
import com.alera.shared.domain.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@Service
public class CommunityIncidentService implements CreateCommunityIncidentUseCase, ConfirmIncidentUseCase, GetNearbyIncidentsUseCase {

    private static final Logger log = LoggerFactory.getLogger(CommunityIncidentService.class);

    private final CommunityIncidentRepositoryPort incidentRepository;
    private final IncidentConfirmationRepositoryPort confirmationRepository;
    private final DeviceService deviceService;
    private final PushNotificationSenderPort notificationSender;

    public CommunityIncidentService(CommunityIncidentRepositoryPort incidentRepository,
                                    IncidentConfirmationRepositoryPort confirmationRepository,
                                    DeviceService deviceService,
                                    PushNotificationSenderPort notificationSender) {
        this.incidentRepository = Objects.requireNonNull(incidentRepository, "CommunityIncidentRepositoryPort no puede ser nulo");
        this.confirmationRepository = Objects.requireNonNull(confirmationRepository, "IncidentConfirmationRepositoryPort no puede ser nulo");
        this.deviceService = Objects.requireNonNull(deviceService, "DeviceService no puede ser nulo");
        this.notificationSender = Objects.requireNonNull(notificationSender, "PushNotificationSenderPort no puede ser nulo");
    }

    @Override
    @Transactional
    public CommunityIncident createIncident(UUID reporterDeviceId,
                                            IncidentType type,
                                            String description,
                                            Coordinates coordinates,
                                            int radiusMeters,
                                            List<String> images) {
        CommunityIncident incident = CommunityIncident.report(reporterDeviceId, type, description, coordinates, radiusMeters, images);
        CommunityIncident saved = incidentRepository.save(incident);

        log.info("Nuevo incidente comunitario registrado: ID {}, Tipo {}, Radio {}m con {} imagenes",
                saved.getId(), saved.getIncidentType(), saved.getRadiusMeters(), images.size());

        notifyNearbyDevices(saved);

        return saved;
    }

    @Override
    @Transactional
    public CommunityIncident confirmIncident(UUID incidentId, UUID deviceId, ConfirmationVoteType voteType) {
        // Regla anti-abuso: un dispositivo no puede votar dos veces
        if (confirmationRepository.hasDeviceVoted(incidentId, deviceId)) {
            throw new DomainException("Este dispositivo ya ha emitido un voto para este incidente.");
        }

        CommunityIncident incident = incidentRepository.findById(incidentId)
                .orElseThrow(() -> new ResourceNotFoundException("Incidente no encontrado con ID: " + incidentId));

        incident.registerVote(voteType);
        confirmationRepository.saveConfirmation(incidentId, deviceId, voteType);
        CommunityIncident updated = incidentRepository.save(incident);

        log.info("Voto {} registrado para incidente {}. Nuevo estado: {} (+{}/-{})",
                voteType, incidentId, updated.getStatus(), updated.getPositiveVotes(), updated.getNegativeVotes());

        return updated;
    }

    @Override
    @Transactional(readOnly = true)
    public List<NearbyCommunityIncident> getNearbyIncidents(Coordinates center, double radiusMeters) {
        double safeRadius = (radiusMeters <= 0) ? 5000.0 : radiusMeters;
        return incidentRepository.findNearby(center, safeRadius);
    }

    @Transactional(readOnly = true)
    public CommunityIncident getIncidentById(UUID id) {
        return incidentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Incidente no encontrado con ID: " + id));
    }

    private void notifyNearbyDevices(CommunityIncident incident) {
        try {
            double radiusKm = incident.getRadiusMeters() / 1000.0;
            List<DeviceService.NearbyActiveDevice> nearby =
                    deviceService.findActiveDevicesNearbyWithDistance(incident.getCoordinates(), radiusKm);

            log.info("Despachando alertas comunitarias para incidente {} (radio {} km). Dispositivos activos en zona: {}",
                    incident.getId(), radiusKm, nearby.size());

            for (DeviceService.NearbyActiveDevice target : nearby) {
                String typeName = switch (incident.getIncidentType()) {
                    case LANDSLIDE -> "Derrumbe en vía";
                    case FIRE -> "Incendio activo";
                    case STRUCTURAL_DAMAGE -> "Falla estructural";
                    case ROAD_BLOCK, ACCIDENT -> "Vía obstruida / accidente";
                    default -> "Incidente comunitario";
                };

                String title = String.format("ALERTA COMUNITARIA: %s", typeName);
                String body = String.format("Estás dentro del radio de afectación (%.1f km). %s",
                        target.distanceKm(),
                        (incident.getDescription() != null && !incident.getDescription().isBlank())
                                ? incident.getDescription().trim()
                                : "Reportado por la comunidad vecinal.");

                Map<String, String> data = Map.of(
                        "incidentId", incident.getId().toString(),
                        "incidentType", incident.getIncidentType().name(),
                        "type", "community",
                        "status", incident.getStatus().name(),
                        "distanceKm", String.format(java.util.Locale.US, "%.1f", target.distanceKm())
                );

                notificationSender.send(new PushAlertMessage(
                        target.device().getFcmToken(),
                        title,
                        body,
                        data
                ));
            }
        } catch (Exception e) {
            log.error("Error al despachar notificaciones comunitarias para incidente {}: ", incident.getId(), e);
        }
    }
}