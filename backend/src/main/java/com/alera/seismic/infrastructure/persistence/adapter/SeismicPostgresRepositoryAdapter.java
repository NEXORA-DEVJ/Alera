package com.alera.seismic.infrastructure.persistence.adapter;

import com.alera.seismic.domain.model.SeismicEvent;
import com.alera.seismic.domain.model.SeismicSource;
import com.alera.seismic.domain.port.out.SeismicEventRepositoryPort;
import com.alera.seismic.infrastructure.persistence.entity.SeismicEventJpaEntity;
import com.alera.seismic.infrastructure.persistence.mapper.SeismicEventMapper;
import com.alera.seismic.infrastructure.persistence.repository.SeismicSpringDataJpaRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

@Repository
public class SeismicPostgresRepositoryAdapter implements SeismicEventRepositoryPort {

    private final SeismicSpringDataJpaRepository jpaRepository;
    private final SeismicEventMapper mapper;

    public SeismicPostgresRepositoryAdapter(SeismicSpringDataJpaRepository jpaRepository, SeismicEventMapper mapper) {
        this.jpaRepository = Objects.requireNonNull(jpaRepository, "SeismicSpringDataJpaRepository no puede ser nulo");
        this.mapper = Objects.requireNonNull(mapper, "SeismicEventMapper no puede ser nulo");
    }

    @Override
    public SeismicEvent save(SeismicEvent seismicEvent) {
        SeismicEventJpaEntity entityToSave = mapper.toJpaEntity(seismicEvent);
        SeismicEventJpaEntity savedEntity = jpaRepository.save(entityToSave);
        return mapper.toDomain(savedEntity);
    }

    @Override
    public Optional<SeismicEvent> findById(UUID id) {
        return jpaRepository.findById(id).map(mapper::toDomain);
    }

    @Override
    public Optional<SeismicEvent> findBySourceAndExternalId(SeismicSource source, String externalId) {
        return jpaRepository.findBySourceAndExternalId(source.name(), externalId).map(mapper::toDomain);
    }

    @Override
    public List<SeismicEvent> findRecent(int limit) {
        return jpaRepository.findRecentEvents(PageRequest.of(0, limit))
                .stream()
                .map(mapper::toDomain)
                .toList();
    }
}