package com.alera.seismic.domain.port.in;

import com.alera.risk.domain.model.RiskEvaluation;
import com.alera.seismic.domain.model.SeismicEvent;
import com.alera.shared.domain.Coordinates;

import java.util.List;

public interface GetNearbySeismicEventsUseCase {

    record EvaluatedSeismicEvent(
            SeismicEvent event,
            RiskEvaluation riskEvaluation
    ) {}

    List<EvaluatedSeismicEvent> execute(Coordinates userLocation, double radiusKm, int limit);
}