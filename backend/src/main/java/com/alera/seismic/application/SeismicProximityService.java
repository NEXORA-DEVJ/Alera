package com.alera.seismic.application;

import com.alera.risk.domain.model.RiskEvaluation;
import com.alera.risk.domain.service.RiskEvaluator;
import com.alera.seismic.domain.model.NearbySeismicEvent;
import com.alera.seismic.domain.port.in.GetNearbySeismicEventsUseCase;
import com.alera.seismic.domain.port.out.SeismicEventRepositoryPort;
import com.alera.shared.domain.Coordinates;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;

@Service
@Transactional(readOnly = true)
public class SeismicProximityService implements GetNearbySeismicEventsUseCase {

    private static final int DEFAULT_LIMIT = 20;
    private static final int MAX_LIMIT = 50;

    private final SeismicEventRepositoryPort repository;
    private final RiskEvaluator riskEvaluator;

    public SeismicProximityService(SeismicEventRepositoryPort repository, RiskEvaluator riskEvaluator) {
        this.repository = Objects.requireNonNull(repository, "El repositorio sismico no puede ser nulo");
        this.riskEvaluator = Objects.requireNonNull(riskEvaluator, "El evaluador de riesgo no puede ser nulo");
    }

    @Override
    public List<EvaluatedSeismicEvent> execute(Coordinates userLocation, double radiusKm, int limit) {
        Objects.requireNonNull(userLocation, "La ubicacion del usuario no puede ser nula");

        double safeRadiusKm = (radiusKm <= 0.0) ? 100.0 : Math.min(radiusKm, 1000.0);
        int safeLimit = (limit <= 0) ? DEFAULT_LIMIT : Math.min(limit, MAX_LIMIT);

        // Convertimos radio en km a metros para PostGIS (ST_DWithin)
        double radiusMeters = safeRadiusKm * 1000.0;

        List<NearbySeismicEvent> nearbyEvents = repository.findNearby(userLocation, radiusMeters, safeLimit);

        return nearbyEvents.stream()
                .map(nearby -> {
                    RiskEvaluation risk = riskEvaluator.evaluate(
                            nearby.event().getMagnitude().value(),
                            nearby.event().getDepth().kilometers(),
                            nearby.distanceKm()
                    );
                    return new EvaluatedSeismicEvent(nearby.event(), risk);
                })
                .toList();
    }
}