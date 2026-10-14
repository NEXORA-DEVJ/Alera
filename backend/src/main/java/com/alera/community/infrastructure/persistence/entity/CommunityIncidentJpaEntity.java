package com.alera.community.infrastructure.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.locationtech.jts.geom.Point;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "community_incidents")
public class CommunityIncidentJpaEntity {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "reporter_device_id", nullable = false)
    private UUID reporterDeviceId;

    @Column(name = "incident_type", nullable = false, length = 40)
    private String incidentType;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @Column(name = "latitude", nullable = false)
    private double latitude;

    @Column(name = "longitude", nullable = false)
    private double longitude;

    @Column(name = "location", columnDefinition = "geography(Point, 4326)", nullable = false)
    private Point location;

    @Column(name = "radius_meters", nullable = false)
    private int radiusMeters;

    @Column(name = "status", nullable = false, length = 30)
    private String status;

    @Column(name = "positive_votes", nullable = false)
    private int positiveVotes;

    @Column(name = "negative_votes", nullable = false)
    private int negativeVotes;

    @Column(name = "reported_at", nullable = false)
    private Instant reportedAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public CommunityIncidentJpaEntity() {
    }

    public CommunityIncidentJpaEntity(UUID id,
                                      UUID reporterDeviceId,
                                      String incidentType,
                                      String description,
                                      double latitude,
                                      double longitude,
                                      Point location,
                                      int radiusMeters,
                                      String status,
                                      int positiveVotes,
                                      int negativeVotes,
                                      Instant reportedAt,
                                      Instant expiresAt,
                                      Instant createdAt,
                                      Instant updatedAt) {
        this.id = id;
        this.reporterDeviceId = reporterDeviceId;
        this.incidentType = incidentType;
        this.description = description;
        this.latitude = latitude;
        this.longitude = longitude;
        this.location = location;
        this.radiusMeters = radiusMeters;
        this.status = status;
        this.positiveVotes = positiveVotes;
        this.negativeVotes = negativeVotes;
        this.reportedAt = reportedAt;
        this.expiresAt = expiresAt;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getReporterDeviceId() { return reporterDeviceId; }
    public void setReporterDeviceId(UUID reporterDeviceId) { this.reporterDeviceId = reporterDeviceId; }

    public String getIncidentType() { return incidentType; }
    public void setIncidentType(String incidentType) { this.incidentType = incidentType; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public double getLatitude() { return latitude; }
    public void setLatitude(double latitude) { this.latitude = latitude; }

    public double getLongitude() { return longitude; }
    public void setLongitude(double longitude) { this.longitude = longitude; }

    public Point getLocation() { return location; }
    public void setLocation(Point location) { this.location = location; }

    public int getRadiusMeters() { return radiusMeters; }
    public void setRadiusMeters(int radiusMeters) { this.radiusMeters = radiusMeters; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public int getPositiveVotes() { return positiveVotes; }
    public void setPositiveVotes(int positiveVotes) { this.positiveVotes = positiveVotes; }

    public int getNegativeVotes() { return negativeVotes; }
    public void setNegativeVotes(int negativeVotes) { this.negativeVotes = negativeVotes; }

    public Instant getReportedAt() { return reportedAt; }
    public void setReportedAt(Instant reportedAt) { this.reportedAt = reportedAt; }

    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}