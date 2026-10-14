package com.alera.community.infrastructure.persistence.repository;

import com.alera.community.infrastructure.persistence.entity.IncidentConfirmationJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface IncidentConfirmationSpringDataJpaRepository extends JpaRepository<IncidentConfirmationJpaEntity, UUID> {

    boolean existsByIncidentIdAndDeviceId(UUID incidentId, UUID deviceId);
}