package com.alera.community.infrastructure.persistence.adapter;

import com.alera.community.domain.model.ConfirmationVoteType;
import com.alera.community.domain.port.out.IncidentConfirmationRepositoryPort;
import com.alera.community.infrastructure.persistence.entity.IncidentConfirmationJpaEntity;
import com.alera.community.infrastructure.persistence.repository.IncidentConfirmationSpringDataJpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Repository
public class IncidentConfirmationPostgresRepositoryAdapter implements IncidentConfirmationRepositoryPort {

    private final IncidentConfirmationSpringDataJpaRepository jpaRepository;

    public IncidentConfirmationPostgresRepositoryAdapter(IncidentConfirmationSpringDataJpaRepository jpaRepository) {
        this.jpaRepository = Objects.requireNonNull(jpaRepository, "IncidentConfirmationSpringDataJpaRepository no puede ser nulo");
    }

    @Override
    public boolean hasDeviceVoted(UUID incidentId, UUID deviceId) {
        return jpaRepository.existsByIncidentIdAndDeviceId(incidentId, deviceId);
    }

    @Override
    public void saveConfirmation(UUID incidentId, UUID deviceId, ConfirmationVoteType voteType) {
        IncidentConfirmationJpaEntity entity = new IncidentConfirmationJpaEntity(
                UUID.randomUUID(),
                incidentId,
                deviceId,
                voteType.name(),
                Instant.now()
        );
        jpaRepository.save(entity);
    }
}