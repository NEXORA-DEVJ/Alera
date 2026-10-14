package com.alera.community.domain.port.in;

import com.alera.community.domain.model.CommunityIncident;
import com.alera.community.domain.model.IncidentType;
import com.alera.shared.domain.Coordinates;

import java.util.UUID;

public interface CreateCommunityIncidentUseCase {

    CommunityIncident createIncident(UUID reporterDeviceId,
                                     IncidentType type,
                                     String description,
                                     Coordinates coordinates,
                                     int radiusMeters);
}