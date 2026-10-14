package com.alera.community.infrastructure.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "community_incident_confirmations", uniqueConstraints = {
        @UniqueConstraint(name = "uk_incident_device_confirmation", columnNames = {"incident_id", "device_id"})
})
public class IncidentConfirmationJpaEntity {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "incident_id", nullable = false)
    private UUID incidentId;

    @Column(name = "device_id", nullable = false)
    private UUID deviceId;

    @Column(name = "vote_type", nullable = false, length = 30)
    private String voteType;

    @Column(name = "voted_at", nullable = false)
    private Instant votedAt;

    public IncidentConfirmationJpaEntity() {
    }

    public IncidentConfirmationJpaEntity(UUID id, UUID incidentId, UUID deviceId, String voteType, Instant votedAt) {
        this.id = id;
        this.incidentId = incidentId;
        this.deviceId = deviceId;
        this.voteType = voteType;
        this.votedAt = votedAt;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getIncidentId() { return incidentId; }
    public void setIncidentId(UUID incidentId) { this.incidentId = incidentId; }

    public UUID getDeviceId() { return deviceId; }
    public void setDeviceId(UUID deviceId) { this.deviceId = deviceId; }

    public String getVoteType() { return voteType; }
    public void setVoteType(String voteType) { this.voteType = voteType; }

    public Instant getVotedAt() { return votedAt; }
    public void setVotedAt(Instant votedAt) { this.votedAt = votedAt; }
}