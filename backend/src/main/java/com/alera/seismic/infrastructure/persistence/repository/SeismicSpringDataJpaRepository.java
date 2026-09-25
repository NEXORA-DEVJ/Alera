package com.alera.seismic.infrastructure.persistence.repository;

import com.alera.seismic.infrastructure.persistence.entity.SeismicEventJpaEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SeismicSpringDataJpaRepository extends JpaRepository<SeismicEventJpaEntity, UUID> {

    Optional<SeismicEventJpaEntity> findBySourceAndExternalId(String source, String externalId);

    @Query("SELECT e FROM SeismicEventJpaEntity e ORDER BY e.originTime DESC")
    List<SeismicEventJpaEntity> findRecentEvents(Pageable pageable);
}