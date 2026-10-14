package com.alera.risk.domain.service;

import com.alera.risk.domain.model.RiskEvaluation;
import com.alera.risk.domain.model.RiskLevel;
import org.springframework.stereotype.Service;

@Service
public class RiskEvaluator {

    /**
     * Evalúa el impacto de un sismo respecto a la posición de un usuario.
     * Algoritmo contextual basado en magnitud, profundidad focal y distancia epicentral.
     */
    public RiskEvaluation evaluate(double magnitude, double depthKm, double distanceKm) {
        double roundedDistance = Math.round(distanceKm * 10.0) / 10.0;

        // Caso 1: Crítico (Gran energía cercana y superficial)
        if (magnitude >= 5.5 && roundedDistance <= 60.0 && depthKm <= 50.0) {
            return RiskEvaluation.of(
                    RiskLevel.CRITICAL,
                    roundedDistance,
                    "Alerta critica: sismo de gran magnitud a corta distancia (" + roundedDistance + " km)"
            );
        }

        // Caso 2: Alto (Magnitud moderada-alta superficial muy cercana)
        if (magnitude >= 4.5 && roundedDistance <= 100.0 && depthKm <= 35.0) {
            return RiskEvaluation.of(
                    RiskLevel.HIGH,
                    roundedDistance,
                    "Alerta alta: sismo superficial sentido fuertemente a " + roundedDistance + " km"
            );
        }

        // Caso 3: Moderado (Dentro de radio de percepción de sismos medianos)
        if (magnitude >= 4.0 && roundedDistance <= 180.0) {
            return RiskEvaluation.of(
                    RiskLevel.MODERATE,
                    roundedDistance,
                    "Alerta moderada: evento sismico perceptible en la region a " + roundedDistance + " km"
            );
        }

        // Caso 4: Bajo (Lejano, profundo o de baja aceleración esperada)
        return RiskEvaluation.of(
                    RiskLevel.LOW,
                    roundedDistance,
                    "Alerta baja: sismo registrado a " + roundedDistance + " km; impacto menor estimado"
            );
    }
}