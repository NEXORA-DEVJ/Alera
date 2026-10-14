package com.alera.community.infrastructure.persistence.mapper;

import com.alera.community.domain.model.CommunityIncident;
import com.alera.community.domain.model.IncidentStatus;
import com.alera.community.domain.model.IncidentType;
import com.alera.community.infrastructure.persistence.entity.CommunityIncidentJpaEntity;
import com.alera.shared.domain.Coordinates;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.stereotype.Component;

@Component
public class CommunityIncidentMapper {

    private final GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);

    public CommunityIncidentJpaEntity toJpaEntity(CommunityIncident domain) {
        if (domain == null) return null;

        Point location = geometryFactory.createPoint(
                new Coordinate(domain.getCoordinates().longitude(), domain.getCoordinates().latitude())
        );

        return new CommunityIncidentJpaEntity(
                domain.getId(),
                domain.getReporterDeviceId(),
                domain.getIncidentType().name(),
                domain.getDescription(),
                domain.getCoordinates().latitude(),
                domain.getCoordinates().longitude(),
                location,
                domain.getRadiusMeters(),
                domain.getStatus().name(),
                domain.getPositiveVotes(),
                domain.getNegativeVotes(),
                domain.getReportedAt(),
                domain.getExpiresAt(),
                domain.getCreatedAt(),
                domain.getUpdatedAt()
        );
    }

    public CommunityIncident toDomain(CommunityIncidentJpaEntity entity) {
        if (entity == null) return null;

        return CommunityIncident.reconstitute(
                entity.getId(),
                entity.getReporterDeviceId(),
                IncidentType.valueOf(entity.getIncidentType()),
                entity.getDescription(),
                new Coordinates(entity.getLatitude(), entity.getLongitude()),
                entity.getRadiusMeters(),
                IncidentStatus.valueOf(entity.getStatus()),
                entity.getPositiveVotes(),
                entity.getNegativeVotes(),
                entity.getReportedAt(),
                entity.getExpiresAt(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}