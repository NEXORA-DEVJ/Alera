package com.alera.community.domain.port.out;

import com.alera.community.domain.model.ConfirmationVoteType;

import java.util.UUID;

public interface IncidentConfirmationRepositoryPort {

    boolean hasDeviceVoted(UUID incidentId, UUID deviceId);

    void saveConfirmation(UUID incidentId, UUID deviceId, ConfirmationVoteType voteType);
}