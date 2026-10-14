package com.alera.seismic.domain.port.out;

import com.alera.seismic.domain.model.NearbySeismicEvent;
import com.alera.seismic.domain.model.SeismicEvent;
import com.alera.seismic.domain.model.SeismicSource;
import com.alera.shared.domain.Coordinates;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SeismicEventRepositoryPort {

    SeismicEvent save(SeismicEvent seismicEvent);

    Optional<SeismicEvent> findById(UUID id);

    Optional<SeismicEvent> findBySourceAndExternalId(SeismicSource source, String externalId);

    List<SeismicEvent> findRecent(int limit);

    List<NearbySeismicEvent> findNearby(Coordinates center, double radiusMeters, int limit);
}