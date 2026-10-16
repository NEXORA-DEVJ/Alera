package com.alera.seismic.domain.model;

import com.alera.shared.domain.Coordinates;
import com.alera.shared.domain.DomainException;

import java.io.Serializable;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

public class SeismicEvent implements Serializable {

    private static final long serialVersionUID = 1L;

    private final UUID id;
    private final SeismicSource source;
    private final String externalId;
    private Magnitude magnitude;
    private Depth depth;
    private Coordinates coordinates;
    private String epicenterDescription;
    private final Instant originTime;
    private SeismicReviewStatus reviewStatus;
    private final Instant createdAt;
    private Instant updatedAt;

    private SeismicEvent(UUID id,
                         SeismicSource source,
                         String externalId,
                         Magnitude magnitude,
                         Depth depth,
                         Coordinates coordinates,
                         String epicenterDescription,
                         Instant originTime,
                         SeismicReviewStatus reviewStatus,
                         Instant createdAt,
                         Instant updatedAt) {
        validateInvariants(source, externalId, magnitude, depth, coordinates, originTime);
        this.id = Objects.requireNonNull(id, "El ID del sismo no puede ser nulo");
        this.source = source;
        this.externalId = externalId.trim();
        this.magnitude = magnitude;
        this.depth = depth;
        this.coordinates = coordinates;
        this.epicenterDescription = epicenterDescription != null ? epicenterDescription.trim() : "";
        this.originTime = originTime;
        this.reviewStatus = reviewStatus != null ? reviewStatus : SeismicReviewStatus.PRELIMINARY;
        this.createdAt = Objects.requireNonNull(createdAt, "createdAt no puede ser nulo");
        this.updatedAt = Objects.requireNonNull(updatedAt, "updatedAt no puede ser nulo");
    }

    /**
     * Factoría para crear un evento sísmico nuevo capturado por primera vez.
     */
    public static SeismicEvent create(SeismicSource source,
                                      String externalId,
                                      Magnitude magnitude,
                                      Depth depth,
                                      Coordinates coordinates,
                                      String epicenterDescription,
                                      Instant originTime,
                                      SeismicReviewStatus reviewStatus) {
        Instant now = Instant.now();
        return new SeismicEvent(
                UUID.randomUUID(),
                source,
                externalId,
                magnitude,
                depth,
                coordinates,
                epicenterDescription,
                originTime,
                reviewStatus,
                now,
                now
        );
    }

    /**
     * Factoría para reconstruir una entidad existente desde la base de datos (Persistencia).
     */
    public static SeismicEvent reconstitute(UUID id,
                                            SeismicSource source,
                                            String externalId,
                                            Magnitude magnitude,
                                            Depth depth,
                                            Coordinates coordinates,
                                            String epicenterDescription,
                                            Instant originTime,
                                            SeismicReviewStatus reviewStatus,
                                            Instant createdAt,
                                            Instant updatedAt) {
        return new SeismicEvent(
                id,
                source,
                externalId,
                magnitude,
                depth,
                coordinates,
                epicenterDescription,
                originTime,
                reviewStatus,
                createdAt,
                updatedAt
        );
    }

    /**
     * Actualiza la información técnica cuando una fuente oficial refina los datos del sismo.
     */
    public void updateDetails(Magnitude newMagnitude,
                              Depth newDepth,
                              Coordinates newCoordinates,
                              String newEpicenterDescription,
                              SeismicReviewStatus newStatus) {
        this.magnitude = Objects.requireNonNull(newMagnitude, "La nueva magnitud no puede ser nula");
        this.depth = Objects.requireNonNull(newDepth, "La nueva profundidad no puede ser nula");
        this.coordinates = Objects.requireNonNull(newCoordinates, "Las nuevas coordenadas no pueden ser nulas");
        if (newEpicenterDescription != null) {
            this.epicenterDescription = newEpicenterDescription.trim();
        }
        if (newStatus != null) {
            this.reviewStatus = newStatus;
        }
        this.updatedAt = Instant.now();
    }

    private static void validateInvariants(SeismicSource source,
                                           String externalId,
                                           Magnitude magnitude,
                                           Depth depth,
                                           Coordinates coordinates,
                                           Instant originTime) {
        if (source == null) {
            throw new DomainException("La fuente sísmica es obligatoria");
        }
        if (externalId == null || externalId.trim().isEmpty()) {
            throw new DomainException("El ID externo de la fuente sísmica no puede estar vacío");
        }
        if (magnitude == null) {
            throw new DomainException("La magnitud es obligatoria");
        }
        if (depth == null) {
            throw new DomainException("La profundidad es obligatoria");
        }
        if (coordinates == null) {
            throw new DomainException("Las coordenadas son obligatorias");
        }
        if (originTime == null) {
            throw new DomainException("La fecha/hora de origen es obligatoria");
        }
        if (originTime.isAfter(Instant.now().plusSeconds(300))) {
            throw new DomainException("La fecha del sismo no puede ser en el futuro");
        }
    }

    // Getters de lectura inmutable
    public UUID getId() { return id; }
    public SeismicSource getSource() { return source; }
    public String getExternalId() { return externalId; }
    public Magnitude getMagnitude() { return magnitude; }
    public Depth getDepth() { return depth; }
    public Coordinates getCoordinates() { return coordinates; }
    public String getEpicenterDescription() { return epicenterDescription; }
    public Instant getOriginTime() { return originTime; }
    public SeismicReviewStatus getReviewStatus() { return reviewStatus; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}