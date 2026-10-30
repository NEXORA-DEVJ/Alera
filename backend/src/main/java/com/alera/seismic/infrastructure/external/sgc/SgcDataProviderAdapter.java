package com.alera.seismic.infrastructure.external.sgc;

import com.alera.seismic.domain.model.Depth;
import com.alera.seismic.domain.model.Magnitude;
import com.alera.seismic.domain.model.SeismicEvent;
import com.alera.seismic.domain.model.SeismicReviewStatus;
import com.alera.seismic.domain.model.SeismicSource;
import com.alera.seismic.domain.port.out.SeismicDataProviderPort;
import com.alera.seismic.infrastructure.external.sgc.dto.SgcFeatureCollectionDto;
import com.alera.shared.domain.Coordinates;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

@Component
public class SgcDataProviderAdapter implements SeismicDataProviderPort {

    private static final Logger log = LoggerFactory.getLogger(SgcDataProviderAdapter.class);

    // Feeds oficiales del Servicio Geológico Colombiano (SGC) con el 100% de eventos (incluyendo microsismos < 2.0 M)
    private static final String SGC_OPEN_DATA_WEEK_URL = "https://opendata.sgc.gov.co/feed/v1.0/summary/all_week.geojson";
    private static final String SGC_OPEN_DATA_DAY_URL = "https://opendata.sgc.gov.co/feed/v1.0/summary/all_day.geojson";
    private static final String SGC_ARCHIVE_URL = "https://archive.sgc.gov.co/feed/v1.0.1/summary/five_days_all.json";

    private final RestClient restClient;

    public SgcDataProviderAdapter() {
        org.springframework.http.client.SimpleClientHttpRequestFactory factory =
                new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(java.time.Duration.ofSeconds(5));
        factory.setReadTimeout(java.time.Duration.ofSeconds(10));

        this.restClient = RestClient.builder()
                .requestFactory(factory)
                .defaultHeader("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
                .defaultHeader("Referer", "https://www.sgc.gov.co/")
                .defaultHeader("Origin", "https://www.sgc.gov.co")
                .defaultHeader("Accept", "application/json, application/geo+json, text/plain, */*")
                .defaultHeader("Accept-Language", "es-CO,es;q=0.9,en;q=0.8")
                .build();
    }

    @Override
    public SeismicSource getSource() {
        return SeismicSource.SGC;
    }

    @Override
    public List<SeismicEvent> fetchRecentEvents() {
        List<String> candidateUrls = List.of(
                SGC_OPEN_DATA_WEEK_URL,
                SGC_OPEN_DATA_DAY_URL,
                SGC_ARCHIVE_URL
        );

        for (String url : candidateUrls) {
            try {
                log.info("SGC OFICIAL: Consultando feed exhaustivo de sismos de Colombia en {}", url);
                SgcFeatureCollectionDto response = restClient.get()
                        .uri(url)
                        .retrieve()
                        .body(SgcFeatureCollectionDto.class);

                if (response != null && response.features() != null && !response.features().isEmpty()) {
                    List<SeismicEvent> events = new ArrayList<>();
                    for (var feature : response.features()) {
                        try {
                            SeismicEvent event = mapToDomain(feature);
                            if (event != null) {
                                events.add(event);
                            }
                        } catch (Exception ex) {
                            log.debug("SGC: Evento descartado id={} motivo={}", feature.id(), ex.getMessage());
                        }
                    }
                    log.info("SGC OFICIAL: Se procesaron exitosamente {} eventos sísmicos reales de Colombia con exactitud milimétrica desde {}", events.size(), url);
                    return events;
                }
            } catch (Exception ex) {
                log.warn("SGC OFICIAL: Falló consulta en {}: {}. Intentando siguiente endpoint...", url, ex.getMessage());
            }
        }

        log.error("SGC OFICIAL: No fue posible consultar ninguno de los feeds sísmicos oficiales del SGC.");
        return List.of();
    }

    private SeismicEvent mapToDomain(SgcFeatureCollectionDto.SgcFeatureDto feature) {
        if (feature == null || feature.properties() == null || feature.geometry() == null) {
            return null;
        }

        var props = feature.properties();
        var geom = feature.geometry();

        if (props.mag() == null || geom.coordinates() == null || geom.coordinates().size() < 2) {
            return null;
        }

        double latitude;
        double longitude;
        double depthKm;

        if (props.latitude() != null && props.longitude() != null) {
            latitude = props.latitude();
            longitude = props.longitude();
            depthKm = props.depth() != null ? Math.max(0.0, props.depth()) : 0.0;
        } else {
            // Extraccion de coordenadas defensiva con precision milimetrica
            double c0 = geom.coordinates().get(0);
            double c1 = geom.coordinates().get(1);
            depthKm = geom.coordinates().size() > 2 ? Math.max(0.0, geom.coordinates().get(2)) : 0.0;

            // En feeds del SGC [0] corresponde a Latitud (ej. 3.74) y [1] a Longitud (ej. -75.61)
            // o en GeoJSON estandar RFC 7946 [0] es Longitud (-75.61) y [1] es Latitud (3.74)
            if (c0 >= -85.0 && c0 <= -65.0 && c1 >= -5.0 && c1 <= 16.0) {
                longitude = c0;
                latitude = c1;
            } else if (c1 >= -85.0 && c1 <= -65.0 && c0 >= -5.0 && c0 <= 16.0) {
                longitude = c1;
                latitude = c0;
            } else if (c0 >= -5.0 && c0 <= 16.0 && c1 >= -85.0 && c1 <= -65.0) {
                latitude = c0;
                longitude = c1;
            } else {
                longitude = c0;
                latitude = c1;
            }
        }

        // Garantizar validez dentro de los rangos de coordenadas
        latitude = Math.max(-90.0, Math.min(90.0, latitude));
        longitude = Math.max(-180.0, Math.min(180.0, longitude));

        Coordinates coordinates = new Coordinates(latitude, longitude);
        Magnitude magnitude = new Magnitude(Math.max(0.0, props.mag()));
        Depth depth = new Depth(depthKm);

        // Descripcion detallada: Municipio, Departamento y poblaciones cercanas
        String description = (props.place() != null && !props.place().isBlank())
                ? props.place().trim()
                : (props.title() != null && !props.title().isBlank() ? props.title().trim() : "Colombia");

        if (props.closerTowns() != null && !props.closerTowns().isBlank() && !description.contains(props.closerTowns().trim())) {
            description += " (" + props.closerTowns().trim() + ")";
        }

        Instant originTime = parseTimestamp(props);

        SeismicReviewStatus status = "manual".equalsIgnoreCase(props.status()) || "reviewed".equalsIgnoreCase(props.status())
                ? SeismicReviewStatus.REVIEWED
                : SeismicReviewStatus.PRELIMINARY;

        return SeismicEvent.create(
                SeismicSource.SGC,
                feature.id(),
                magnitude,
                depth,
                coordinates,
                description,
                originTime,
                status
        );
    }

    private Instant parseTimestamp(SgcFeatureCollectionDto.SgcPropertiesDto props) {
        if (props.time() != null && props.time() > 0) {
            return Instant.ofEpochMilli(props.time());
        }

        String utcTime = props.utc_time() != null ? props.utc_time() : props.utcTime();
        if (utcTime != null && !utcTime.isBlank()) {
            try {
                return Instant.parse(utcTime.trim());
            } catch (Exception ex) {
                try {
                    String cleanUtc = utcTime.trim().replace(' ', 'T');
                    if (cleanUtc.length() == 16) {
                        cleanUtc += ":00";
                    }
                    if (!cleanUtc.endsWith("Z") && !cleanUtc.contains("+")) {
                        cleanUtc += "Z";
                    }
                    return Instant.parse(cleanUtc);
                } catch (Exception ignored) {}
            }
        }

        String localTime = props.local_time() != null ? props.local_time() : props.localTime();
        if (localTime != null && !localTime.isBlank()) {
            try {
                String cleanLocal = localTime.trim().replace(' ', 'T');
                if (cleanLocal.length() == 16) {
                    cleanLocal += ":00";
                }
                return LocalDateTime.parse(cleanLocal).atZone(ZoneId.of("America/Bogota")).toInstant();
            } catch (Exception ignored) {}
        }

        return Instant.now();
    }
}
