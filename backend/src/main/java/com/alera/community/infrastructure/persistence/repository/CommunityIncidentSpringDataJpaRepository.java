package com.alera.community.infrastructure.persistence.repository;

import com.alera.community.infrastructure.persistence.entity.CommunityIncidentJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CommunityIncidentSpringDataJpaRepository extends JpaRepository<CommunityIncidentJpaEntity, UUID> {

    @Query(value = """
        SELECT i.id AS id,
               i.reporter_device_id AS reporterDeviceId,
               i.incident_type AS incidentType,
               i.description AS description,
               i.latitude AS latitude,
               i.longitude AS longitude,
               i.radius_meters AS radiusMeters,
               i.status AS status,
               i.positive_votes AS positiveVotes,
               i.negative_votes AS negativeVotes,
               i.reported_at AS reportedAt,
               i.expires_at AS expiresAt,
               i.image_urls AS imageUrls,
               i.created_at AS createdAt,
               i.updated_at AS updatedAt,
               ST_Distance(i.location, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography) AS distanceMeters
        FROM community_incidents i
        WHERE i.status != 'EXPIRED'
          AND i.expires_at > NOW()
          AND ST_DWithin(i.location, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography, :radiusMeters)
        ORDER BY distanceMeters ASC
        """, nativeQuery = true)
    List<NearbyIncidentProjection> findNearbyActive(@Param("lat") double lat,
                                                   @Param("lon") double lon,
                                                   @Param("radiusMeters") double radiusMeters);
}