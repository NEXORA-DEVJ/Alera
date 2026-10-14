package com.alera.risk.domain.model;

import java.util.Objects;

/**
 * Value Object que representa la evaluación de impacto calculada por ALERA.
 * Cumple la Regla #64: identificar explícitamente el origen del cálculo.
 */
public record RiskEvaluation(
        RiskLevel level,
        double distanceKm,
        String summary,
        String calculationSource
) {
    public static final String ALERA_SOURCE = "ALERA_CALCULATION";

    public RiskEvaluation {
        Objects.requireNonNull(level, "El nivel de riesgo no puede ser nulo");
        Objects.requireNonNull(summary, "El resumen no puede ser nulo");
        if (distanceKm < 0.0) {
            throw new IllegalArgumentException("La distancia no puede ser negativa");
        }
        if (calculationSource == null) {
            calculationSource = ALERA_SOURCE;
        }
    }

    public static RiskEvaluation of(RiskLevel level, double distanceKm, String summary) {
        return new RiskEvaluation(level, distanceKm, summary, ALERA_SOURCE);
    }
}