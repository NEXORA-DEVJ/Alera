package com.alera.seismic.domain.port.out;

import com.alera.seismic.domain.model.SeismicEvent;
import com.alera.seismic.domain.model.SeismicSource;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SeismicEventRepositoryPort {

    SeismicEvent save(SeismicEvent seismicEvent);

    Optional<SeismicEvent> findById(UUID id);

    Optional<SeismicEvent> findBySourceAndExternalId(SeismicSource source, String externalId);

    List<SeismicEvent> findRecent(int limit);
}