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

import com.alera.media.domain.MediaStorageService;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

@Component
public class CommunityIncidentMapper {

    private final GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);
    private final MediaStorageService storageService;
    private static final String IMAGE_DELIMITER = ";;;";

    public CommunityIncidentMapper(MediaStorageService storageService) {
        this.storageService = storageService;
    }

    public CommunityIncidentJpaEntity toJpaEntity(CommunityIncident domain) {
        if (domain == null) return null;

        Point location = geometryFactory.createPoint(
                new Coordinate(domain.getCoordinates().longitude(), domain.getCoordinates().latitude())
        );

        List<String> sanitizedImages = new ArrayList<>();
        if (domain.getImageUrls() != null) {
            for (String img : domain.getImageUrls()) {
                if (img == null || img.isBlank()) continue;
                if (img.startsWith("data:image/") || (img.length() > 255 && !img.startsWith("http"))) {
                    try {
                        String filename = storageService.storeBase64(img);
                        sanitizedImages.add("/api/v1/media/" + filename);
                    } catch (Exception e) {
                        sanitizedImages.add(img);
                    }
                } else {
                    sanitizedImages.add(img);
                }
            }
        }

        String imagesJoined = String.join(IMAGE_DELIMITER, sanitizedImages);

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
                imagesJoined,
                domain.getCreatedAt(),
                domain.getUpdatedAt()
        );
    }

    public CommunityIncident toDomain(CommunityIncidentJpaEntity entity) {
        if (entity == null) return null;

        List<String> images = (entity.getImageUrls() != null && !entity.getImageUrls().isBlank())
                ? Arrays.asList(entity.getImageUrls().split(IMAGE_DELIMITER))
                : Collections.emptyList();

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
                images,
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}