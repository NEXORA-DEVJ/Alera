package com.alera.community.domain.model;

import com.alera.shared.domain.Coordinates;
import com.alera.shared.domain.DomainException;

import java.time.Duration;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

public class CommunityIncident {

    private static final int MIN_RADIUS_METERS = 100;
    private static final int MAX_RADIUS_METERS = 10000;
    private static final Duration DEFAULT_DURATION = Duration.ofHours(4);

    private final UUID id;
    private final UUID reporterDeviceId;
    private final IncidentType incidentType;
    private final String description;
    private final Coordinates coordinates;
    private final int radiusMeters;
    private IncidentStatus status;
    private int positiveVotes;
    private int negativeVotes;
    private final Instant reportedAt;
    private Instant expiresAt;
    private final Instant createdAt;
    private Instant updatedAt;

    private CommunityIncident(UUID id,
                              UUID reporterDeviceId,
                              IncidentType incidentType,
                              String description,
                              Coordinates coordinates,
                              int radiusMeters,
                              IncidentStatus status,
                              int positiveVotes,
                              int negativeVotes,
                              Instant reportedAt,
                              Instant expiresAt,
                              Instant createdAt,
                              Instant updatedAt) {
        validateInvariants(radiusMeters);
        this.id = Objects.requireNonNull(id, "El ID del incidente no puede ser nulo");
        this.reporterDeviceId = Objects.requireNonNull(reporterDeviceId, "El reporterDeviceId no puede ser nulo");
        this.incidentType = Objects.requireNonNull(incidentType, "El tipo de incidente no puede ser nulo");
        this.description = (description != null) ? description.trim() : null;
        this.coordinates = Objects.requireNonNull(coordinates, "Las coordenadas no pueden ser nulas");
        this.radiusMeters = radiusMeters;
        this.status = Objects.requireNonNull(status, "El estado no puede ser nulo");
        this.positiveVotes = Math.max(0, positiveVotes);
        this.negativeVotes = Math.max(0, negativeVotes);
        this.reportedAt = Objects.requireNonNull(reportedAt, "reportedAt no puede ser nulo");
        this.expiresAt = Objects.requireNonNull(expiresAt, "expiresAt no puede ser nulo");
        this.createdAt = Objects.requireNonNull(createdAt, "createdAt no puede ser nulo");
        this.updatedAt = Objects.requireNonNull(updatedAt, "updatedAt no puede ser nulo");
    }

    /**
     * Factoría para reportar un nuevo incidente ciudadano.
     */
    public static CommunityIncident report(UUID reporterDeviceId,
                                          IncidentType type,
                                          String description,
                                          Coordinates coordinates,
                                          int radiusMeters) {
        Instant now = Instant.now();
        Instant expires = now.plus(DEFAULT_DURATION);
        int safeRadius = (radiusMeters <= 0) ? 1000 : radiusMeters;

        return new CommunityIncident(
                UUID.randomUUID(),
                reporterDeviceId,
                type,
                description,
                coordinates,
                safeRadius,
                IncidentStatus.ACTIVE,
                0,
                0,
                now,
                expires,
                now,
                now
        );
    }

    /**
     * Factoría para reconstituir desde PostgreSQL.
     */
    public static CommunityIncident reconstitute(UUID id,
                                                 UUID reporterDeviceId,
                                                 IncidentType incidentType,
                                                 String description,
                                                 Coordinates coordinates,
                                                 int radiusMeters,
                                                 IncidentStatus status,
                                                 int positiveVotes,
                                                 int negativeVotes,
                                                 Instant reportedAt,
                                                 Instant expiresAt,
                                                 Instant createdAt,
                                                 Instant updatedAt) {
        return new CommunityIncident(id, reporterDeviceId, incidentType, description, coordinates,
                radiusMeters, status, positiveVotes, negativeVotes, reportedAt, expiresAt, createdAt, updatedAt);
    }

    /**
     * Aplica un voto comunitario y recalcula el estado de forma determinista.
     */
    public void registerVote(ConfirmationVoteType voteType) {
        if (Instant.now().isAfter(this.expiresAt)) {
            this.status = IncidentStatus.EXPIRED;
            this.updatedAt = Instant.now();
            return;
        }

        if (voteType == ConfirmationVoteType.STILL_ACTIVE) {
            this.positiveVotes++;
            // Con 2 o más votos positivos, el incidente se considera confirmado por la comunidad
            if (this.positiveVotes >= 2 && this.status == IncidentStatus.ACTIVE) {
                this.status = IncidentStatus.CONFIRMED_ACTIVE;
            }
        } else if (voteType == ConfirmationVoteType.RESOLVED) {
            this.negativeVotes++;
            // Si hay 3 o más votos negativos y superan a los positivos, se marca resuelto
            if (this.negativeVotes >= 3 && this.negativeVotes > this.positiveVotes) {
                this.status = IncidentStatus.RESOLVED;
            } else if (this.negativeVotes >= 2) {
                this.status = IncidentStatus.POSSIBLY_RESOLVED;
            }
        }

        this.updatedAt = Instant.now();
    }

    private static void validateInvariants(int radiusMeters) {
        if (radiusMeters < MIN_RADIUS_METERS || radiusMeters > MAX_RADIUS_METERS) {
            throw new DomainException(String.format(
                    "El radio de afectacion debe estar entre %d y %d metros. Valor recibido: %d",
                    MIN_RADIUS_METERS, MAX_RADIUS_METERS, radiusMeters));
        }
    }

    public UUID getId() { return id; }
    public UUID getReporterDeviceId() { return reporterDeviceId; }
    public IncidentType getIncidentType() { return incidentType; }
    public String getDescription() { return description; }
    public Coordinates getCoordinates() { return coordinates; }
    public int getRadiusMeters() { return radiusMeters; }
    public IncidentStatus getStatus() { return status; }
    public int getPositiveVotes() { return positiveVotes; }
    public int getNegativeVotes() { return negativeVotes; }
    public Instant getReportedAt() { return reportedAt; }
    public Instant getExpiresAt() { return expiresAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}