package com.alera.community.domain.port.in;

import com.alera.community.domain.model.CommunityIncident;
import com.alera.community.domain.model.ConfirmationVoteType;

import java.util.UUID;

public interface ConfirmIncidentUseCase {

    CommunityIncident confirmIncident(UUID incidentId, UUID deviceId, ConfirmationVoteType voteType);
}