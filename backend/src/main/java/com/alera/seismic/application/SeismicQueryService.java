package com.alera.seismic.application;

import com.alera.seismic.domain.model.SeismicEvent;
import com.alera.seismic.domain.port.in.GetRecentSeismicEventsUseCase;
import com.alera.seismic.domain.port.out.SeismicEventRepositoryPort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;

@Service
@Transactional(readOnly = true)
public class SeismicQueryService implements GetRecentSeismicEventsUseCase {

    private static final int DEFAULT_LIMIT = 20;
    private static final int MAX_LIMIT = 100;

    private final SeismicEventRepositoryPort repository;

    public SeismicQueryService(SeismicEventRepositoryPort repository) {
        this.repository = Objects.requireNonNull(repository, "El repositorio sísmico no puede ser nulo");
    }

    @Override
    public List<SeismicEvent> execute(int limit) {
        int safeLimit = (limit <= 0) ? DEFAULT_LIMIT : Math.min(limit, MAX_LIMIT);
        return repository.findRecent(safeLimit);
    }
}