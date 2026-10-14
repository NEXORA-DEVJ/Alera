package com.alera.community.domain.port.in;

import com.alera.community.domain.model.NearbyCommunityIncident;
import com.alera.shared.domain.Coordinates;

import java.util.List;

public interface GetNearbyIncidentsUseCase {

    List<NearbyCommunityIncident> getNearbyIncidents(Coordinates center, double radiusMeters);
}