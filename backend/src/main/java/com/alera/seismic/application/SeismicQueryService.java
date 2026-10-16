package com.alera.seismic.application;

import com.alera.seismic.domain.model.SeismicEvent;
import com.alera.seismic.domain.port.in.GetRecentSeismicEventsUseCase;
import com.alera.seismic.domain.port.in.GetSeismicEventByIdUseCase;
import com.alera.seismic.domain.port.out.SeismicEventRepositoryPort;
import com.alera.shared.domain.ResourceNotFoundException;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class SeismicQueryService implements GetRecentSeismicEventsUseCase, GetSeismicEventByIdUseCase {

    private static final int DEFAULT_LIMIT = 500;
    private static final int MAX_LIMIT = 1000;

    private final SeismicEventRepositoryPort repository;

    public SeismicQueryService(SeismicEventRepositoryPort repository) {
        this.repository = Objects.requireNonNull(repository, "El repositorio sísmico no puede ser nulo");
    }

    @Override
    @Cacheable(value = "recent_seisms", key = "#limit")
    public List<SeismicEvent> execute(int limit) {
        int safeLimit = (limit <= 0) ? DEFAULT_LIMIT : Math.min(limit, MAX_LIMIT);
        return repository.findRecent(safeLimit);
    }

    @Override
    public SeismicEvent execute(UUID id) {
        Objects.requireNonNull(id, "El ID del sismo no puede ser nulo");
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("No se encontró el evento sísmico con ID: " + id));
    }
}