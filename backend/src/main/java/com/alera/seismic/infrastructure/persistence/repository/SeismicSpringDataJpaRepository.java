package com.alera.seismic.infrastructure.persistence.repository;

import com.alera.seismic.infrastructure.persistence.entity.SeismicEventJpaEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SeismicSpringDataJpaRepository extends JpaRepository<SeismicEventJpaEntity, UUID> {

    Optional<SeismicEventJpaEntity> findBySourceAndExternalId(String source, String externalId);

    @Query("SELECT e FROM SeismicEventJpaEntity e ORDER BY e.originTime DESC")
    List<SeismicEventJpaEntity> findRecentEvents(Pageable pageable);

    @Query(value = """
        SELECT e.id AS id,
               e.source AS source,
               e.external_id AS externalId,
               e.magnitude AS magnitude,
               e.depth_km AS depthKm,
               e.latitude AS latitude,
               e.longitude AS longitude,
               e.epicenter_description AS epicenterDescription,
               e.origin_time AS originTime,
               e.review_status AS reviewStatus,
               e.created_at AS createdAt,
               e.updated_at AS updatedAt,
               ST_Distance(e.location, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography) AS distanceMeters
        FROM seismic_events e
        WHERE ST_DWithin(e.location, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography, :radiusMeters)
        ORDER BY distanceMeters ASC
        LIMIT :limit
        """, nativeQuery = true)
    List<NearbySeismicProjection> findNearby(@Param("lat") double lat,
                                            @Param("lon") double lon,
                                            @Param("radiusMeters") double radiusMeters,
                                            @Param("limit") int limit);
}