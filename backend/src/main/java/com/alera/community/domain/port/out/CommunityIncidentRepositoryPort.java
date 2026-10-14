package com.alera.community.domain.port.out;

import com.alera.community.domain.model.CommunityIncident;
import com.alera.community.domain.model.NearbyCommunityIncident;
import com.alera.shared.domain.Coordinates;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CommunityIncidentRepositoryPort {

    CommunityIncident save(CommunityIncident incident);

    Optional<CommunityIncident> findById(UUID id);

    List<NearbyCommunityIncident> findNearby(Coordinates center, double radiusMeters);
}