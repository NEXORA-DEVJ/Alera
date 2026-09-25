package com.alera.seismic.infrastructure.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import org.locationtech.jts.geom.Point;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "seismic_events", uniqueConstraints = {
        @UniqueConstraint(name = "uk_seismic_source_external", columnNames = {"source", "external_id"})
})
public class SeismicEventJpaEntity {

    @Id
    private UUID id;

    @Column(name = "source", nullable = false, length = 20)
    private String source;

    @Column(name = "external_id", nullable = false, length = 100)
    private String externalId;

    @Column(name = "magnitude", nullable = false)
    private double magnitude;

    @Column(name = "depth_km", nullable = false)
    private double depthKm;

    @Column(name = "latitude", nullable = false)
    private double latitude;

    @Column(name = "longitude", nullable = false)
    private double longitude;

    @Column(name = "location", columnDefinition = "geography(Point, 4326)", nullable = false)
    private Point location;

    @Column(name = "epicenter_description")
    private String epicenterDescription;

    @Column(name = "origin_time", nullable = false)
    private Instant originTime;

    @Column(name = "review_status", nullable = false, length = 30)
    private String reviewStatus;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    // Constructor sin argumentos obligatorio para Hibernate
    public SeismicEventJpaEntity() {
    }

    public SeismicEventJpaEntity(UUID id,
                                 String source,
                                 String externalId,
                                 double magnitude,
                                 double depthKm,
                                 double latitude,
                                 double longitude,
                                 Point location,
                                 String epicenterDescription,
                                 Instant originTime,
                                 String reviewStatus,
                                 Instant createdAt,
                                 Instant updatedAt) {
        this.id = id;
        this.source = source;
        this.externalId = externalId;
        this.magnitude = magnitude;
        this.depthKm = depthKm;
        this.latitude = latitude;
        this.longitude = longitude;
        this.location = location;
        this.epicenterDescription = epicenterDescription;
        this.originTime = originTime;
        this.reviewStatus = reviewStatus;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }

    public String getExternalId() { return externalId; }
    public void setExternalId(String externalId) { this.externalId = externalId; }

    public double getMagnitude() { return magnitude; }
    public void setMagnitude(double magnitude) { this.magnitude = magnitude; }

    public double getDepthKm() { return depthKm; }
    public void setDepthKm(double depthKm) { this.depthKm = depthKm; }

    public double getLatitude() { return latitude; }
    public void setLatitude(double latitude) { this.latitude = latitude; }

    public double getLongitude() { return longitude; }
    public void setLongitude(double longitude) { this.longitude = longitude; }

    public Point getLocation() { return location; }
    public void setLocation(Point location) { this.location = location; }

    public String getEpicenterDescription() { return epicenterDescription; }
    public void setEpicenterDescription(String epicenterDescription) { this.epicenterDescription = epicenterDescription; }

    public Instant getOriginTime() { return originTime; }
    public void setOriginTime(Instant originTime) { this.originTime = originTime; }

    public String getReviewStatus() { return reviewStatus; }
    public void setReviewStatus(String reviewStatus) { this.reviewStatus = reviewStatus; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}