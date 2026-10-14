package com.alera.seismic.api.dto;

import com.alera.risk.domain.model.RiskEvaluation;
import com.alera.seismic.domain.port.in.GetNearbySeismicEventsUseCase.EvaluatedSeismicEvent;

public record NearbySeismicEventResponseDto(
        SeismicEventResponseDto event,
        RiskEvaluationDto riskEvaluation
) {
    public record RiskEvaluationDto(
            String level,
            double distanceKm,
            String summary,
            String calculationSource
    ) {
        public static RiskEvaluationDto fromDomain(RiskEvaluation domain) {
            return new RiskEvaluationDto(
                    domain.level().name(),
                    domain.distanceKm(),
                    domain.summary(),
                    domain.calculationSource()
            );
        }
    }

    public static NearbySeismicEventResponseDto fromDomain(EvaluatedSeismicEvent evaluated) {
        return new NearbySeismicEventResponseDto(
                SeismicEventResponseDto.fromDomain(evaluated.event()),
                RiskEvaluationDto.fromDomain(evaluated.riskEvaluation())
        );
    }
}