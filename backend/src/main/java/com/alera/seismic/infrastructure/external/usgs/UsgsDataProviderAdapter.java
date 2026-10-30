package com.alera.seismic.infrastructure.external.usgs;

import com.alera.seismic.domain.model.Depth;
import com.alera.seismic.domain.model.Magnitude;
import com.alera.seismic.domain.model.SeismicEvent;
import com.alera.seismic.domain.model.SeismicReviewStatus;
import com.alera.seismic.domain.model.SeismicSource;
import com.alera.seismic.domain.port.out.SeismicDataProviderPort;
import com.alera.seismic.infrastructure.external.usgs.dto.UsgsFeatureCollectionDto;
import com.alera.shared.domain.Coordinates;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Component
public class UsgsDataProviderAdapter implements SeismicDataProviderPort {

    private static final Logger log = LoggerFactory.getLogger(UsgsDataProviderAdapter.class);

    // Bounding Box regional ampliado: cubre Colombia y paises limitrofes
    // (Venezuela, Panama, Ecuador, Peru, Brasil): Lat [-6.0, 15.0], Lon [-84.0, -60.0]
    private static final String USGS_REGIONAL_URL =
            "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&orderby=time&minmagnitude=1.0&limit=250&minlatitude=-6.0&maxlatitude=15.0&minlongitude=-84.0&maxlongitude=-60.0";

    private final RestClient restClient;

    public UsgsDataProviderAdapter() {
        org.springframework.http.client.SimpleClientHttpRequestFactory factory =
                new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(java.time.Duration.ofSeconds(5));
        factory.setReadTimeout(java.time.Duration.ofSeconds(10));

        this.restClient = RestClient.builder()
                .requestFactory(factory)
                .build();
    }

    @Override
    public SeismicSource getSource() {
        return SeismicSource.USGS;
    }

    @Override
    public List<SeismicEvent> fetchRecentEvents() {
        try {
            log.info("Consultando eventos sismicos de Colombia y region fronteriza en USGS API...");
            UsgsFeatureCollectionDto response = restClient.get()
                    .uri(USGS_REGIONAL_URL)
                    .retrieve()
                    .body(UsgsFeatureCollectionDto.class);

            if (response == null || response.features() == null) {
                return List.of();
            }

            List<SeismicEvent> events = new ArrayList<>();
            for (var feature : response.features()) {
                try {
                    SeismicEvent event = mapToDomain(feature);
                    if (event != null) {
                        events.add(event);
                    }
                } catch (Exception ex) {
                    log.warn("Evento de USGS descartado por inconsistencia de datos: id={}, error={}", feature.id(), ex.getMessage());
                }
            }

            log.info("USGS: Se obtuvieron y procesaron {} sismos relevantes para Colombia y zonas limitrofes.", events.size());
            return events;
        } catch (Exception ex) {
            log.error("Fallo al consultar la API sismica de USGS: {}", ex.getMessage());
            return List.of();
        }
    }

    private SeismicEvent mapToDomain(UsgsFeatureCollectionDto.UsgsFeatureDto feature) {
        if (feature == null || feature.properties() == null || feature.geometry() == null) {
            return null;
        }

        var props = feature.properties();
        var geom = feature.geometry();

        if (props.mag() == null || geom.coordinates() == null || geom.coordinates().size() < 3) {
            return null;
        }

        double longitude = geom.coordinates().get(0);
        double latitude = geom.coordinates().get(1);
        double depthKm = geom.coordinates().get(2);
        double mag = props.mag();

        String rawPlace = props.place() != null ? props.place() : "Epicentro No Especificado";
        String placeLower = rawPlace.toLowerCase();
        boolean isInternalColombia = placeLower.contains("colombia");

        // Evaluacion de sismos internacionales transfronterizos (Venezuela, Panama, Ecuador, Peru, Brasil)
        if (!isInternalColombia) {
            // Regla estricta: solo se alertan sismos internacionales si su Magnitud es mayor o igual a 5.5
            if (mag < 5.5) {
                return null;
            }

            // Calculo de distancia desde el epicentro exterior hacia el limite fronterizo mas cercano de Colombia
            double closestColLat = Math.max(-4.2, Math.min(12.5, latitude));
            double closestColLon = Math.max(-79.0, Math.min(-66.8, longitude));
            double distanceToColombiaBorder = calculateDistanceKm(latitude, longitude, closestColLat, closestColLon);

            // Radio de propagacion de ondas perceptibles para M >= 5.5
            double maxWaveRadiusKm = (mag - 3.5) * 200.0; // ej: M 5.5 -> 400 km; M 6.0 -> 500 km

            if (distanceToColombiaBorder > maxWaveRadiusKm) {
                // El sismo es fuerte pero demasiado lejano para que sus ondas se sientan en Colombia
                return null;
            }

            rawPlace = "[Sismo Internacional con Ondas en Colombia] " + rawPlace;
        }

        Coordinates coordinates = new Coordinates(latitude, longitude);
        Magnitude magnitude = new Magnitude(mag);
        Depth depth = new Depth(depthKm >= 0.0 ? depthKm : 0.0);

        Instant originTime = props.time() != null ? Instant.ofEpochMilli(props.time()) : Instant.now();

        SeismicReviewStatus status = "reviewed".equalsIgnoreCase(props.status())
                ? SeismicReviewStatus.REVIEWED
                : SeismicReviewStatus.PRELIMINARY;

        return SeismicEvent.create(
                SeismicSource.USGS,
                feature.id(),
                magnitude,
                depth,
                coordinates,
                rawPlace,
                originTime,
                status
        );
    }

    private double calculateDistanceKm(double lat1, double lon1, double lat2, double lon2) {
        final double R = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}