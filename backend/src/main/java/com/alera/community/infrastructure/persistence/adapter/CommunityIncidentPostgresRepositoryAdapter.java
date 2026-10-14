package com.alera.community.infrastructure.persistence.adapter;

import com.alera.community.domain.model.CommunityIncident;
import com.alera.community.domain.model.IncidentStatus;
import com.alera.community.domain.model.IncidentType;
import com.alera.community.domain.model.NearbyCommunityIncident;
import com.alera.community.domain.port.out.CommunityIncidentRepositoryPort;
import com.alera.community.infrastructure.persistence.entity.CommunityIncidentJpaEntity;
import com.alera.community.infrastructure.persistence.mapper.CommunityIncidentMapper;
import com.alera.community.infrastructure.persistence.repository.CommunityIncidentSpringDataJpaRepository;
import com.alera.community.infrastructure.persistence.repository.NearbyIncidentProjection;
import com.alera.shared.domain.Coordinates;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

@Repository
public class CommunityIncidentPostgresRepositoryAdapter implements CommunityIncidentRepositoryPort {

    private final CommunityIncidentSpringDataJpaRepository jpaRepository;
    private final CommunityIncidentMapper mapper;

    public CommunityIncidentPostgresRepositoryAdapter(CommunityIncidentSpringDataJpaRepository jpaRepository,
                                                     CommunityIncidentMapper mapper) {
        this.jpaRepository = Objects.requireNonNull(jpaRepository, "CommunityIncidentSpringDataJpaRepository no puede ser nulo");
        this.mapper = Objects.requireNonNull(mapper, "CommunityIncidentMapper no puede ser nulo");
    }

    @Override
    public CommunityIncident save(CommunityIncident incident) {
        CommunityIncidentJpaEntity entity = mapper.toJpaEntity(incident);
        CommunityIncidentJpaEntity saved = jpaRepository.save(entity);
        return mapper.toDomain(saved);
    }

    @Override
    public Optional<CommunityIncident> findById(UUID id) {
        return jpaRepository.findById(id).map(mapper::toDomain);
    }

    @Override
    public List<NearbyCommunityIncident> findNearby(Coordinates center, double radiusMeters) {
        List<NearbyIncidentProjection> projections = jpaRepository.findNearbyActive(
                center.latitude(),
                center.longitude(),
                radiusMeters
        );

        return projections.stream()
                .map(p -> {
                    CommunityIncident incident = CommunityIncident.reconstitute(
                            p.getId(),
                            p.getReporterDeviceId(),
                            IncidentType.valueOf(p.getIncidentType()),
                            p.getDescription(),
                            new Coordinates(p.getLatitude(), p.getLongitude()),
                            p.getRadiusMeters(),
                            IncidentStatus.valueOf(p.getStatus()),
                            p.getPositiveVotes(),
                            p.getNegativeVotes(),
                            p.getReportedAt(),
                            p.getExpiresAt(),
                            p.getCreatedAt(),
                            p.getUpdatedAt()
                    );
                    return new NearbyCommunityIncident(incident, p.getDistanceMeters());
                })
                .toList();
    }
}