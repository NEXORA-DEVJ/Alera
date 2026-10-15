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

    // Bounding Box para Colombia: Lat [-4.5, 13.5], Lon [-79.2, -66.5]
    private static final String USGS_COLOMBIA_URL =
            "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&orderby=time&minmagnitude=0.5&limit=200&minlatitude=-4.5&maxlatitude=13.5&minlongitude=-79.2&maxlongitude=-66.5";

    private final RestClient restClient;

    public UsgsDataProviderAdapter() {
        this.restClient = RestClient.builder().build();
    }

    @Override
    public SeismicSource getSource() {
        return SeismicSource.USGS;
    }

    @Override
    public List<SeismicEvent> fetchRecentEvents() {
        try {
            log.info("Consultando eventos sismicos de Colombia en USGS API...");
            UsgsFeatureCollectionDto response = restClient.get()
                    .uri(USGS_COLOMBIA_URL)
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

            log.info("USGS: Se obtuvieron y procesaron {} sismos para Colombia.", events.size());
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

        // Filtro estricto: descartar eventos que corresponden al territorio de Panama
        if (props.place() != null) {
            String placeLower = props.place().toLowerCase();
            if ((placeLower.contains("panama") || placeLower.contains("panamá")) && !placeLower.contains("colombia")) {
                return null;
            }
        }

        double longitude = geom.coordinates().get(0);
        double latitude = geom.coordinates().get(1);
        double depthKm = geom.coordinates().get(2);

        // Mapeo defensivo hacia nuestros Value Objects
        Coordinates coordinates = new Coordinates(latitude, longitude);
        Magnitude magnitude = new Magnitude(props.mag());
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
                props.place(),
                originTime,
                status
        );
    }
}