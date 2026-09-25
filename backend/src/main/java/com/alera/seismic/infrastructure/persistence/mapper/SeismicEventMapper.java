package com.alera.seismic.infrastructure.persistence.mapper;

import com.alera.seismic.domain.model.Depth;
import com.alera.seismic.domain.model.Magnitude;
import com.alera.seismic.domain.model.SeismicEvent;
import com.alera.seismic.domain.model.SeismicReviewStatus;
import com.alera.seismic.domain.model.SeismicSource;
import com.alera.seismic.infrastructure.persistence.entity.SeismicEventJpaEntity;
import com.alera.shared.domain.Coordinates;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.stereotype.Component;

@Component
public class SeismicEventMapper {

    // SRID 4326 = Estándar GPS mundial WGS84
    private final GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);

    /**
     * Convierte del Dominio puro hacia la Entidad de Base de Datos.
     */
    public SeismicEventJpaEntity toJpaEntity(SeismicEvent domain) {
        if (domain == null) return null;

        // OGC Standard: X = Longitude, Y = Latitude
        Point locationPoint = geometryFactory.createPoint(
                new Coordinate(domain.getCoordinates().longitude(), domain.getCoordinates().latitude())
        );

        return new SeismicEventJpaEntity(
                domain.getId(),
                domain.getSource().name(),
                domain.getExternalId(),
                domain.getMagnitude().value(),
                domain.getDepth().kilometers(),
                domain.getCoordinates().latitude(),
                domain.getCoordinates().longitude(),
                locationPoint,
                domain.getEpicenterDescription(),
                domain.getOriginTime(),
                domain.getReviewStatus().name(),
                domain.getCreatedAt(),
                domain.getUpdatedAt()
        );
    }

    /**
     * Convierte de la Entidad de Base de Datos hacia el Dominio puro.
     */
    public SeismicEvent toDomain(SeismicEventJpaEntity entity) {
        if (entity == null) return null;

        return SeismicEvent.reconstitute(
                entity.getId(),
                SeismicSource.valueOf(entity.getSource()),
                entity.getExternalId(),
                new Magnitude(entity.getMagnitude()),
                new Depth(entity.getDepthKm()),
                new Coordinates(entity.getLatitude(), entity.getLongitude()),
                entity.getEpicenterDescription(),
                entity.getOriginTime(),
                SeismicReviewStatus.valueOf(entity.getReviewStatus()),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}