package com.alera.seismic.domain.port.in;

/**
 * Resultado de una ejecución de ingestión sísmica.
 * Permite auditar cuántos eventos fueron nuevos, cuántos se actualizaron y cuántos se ignoraron por ser idénticos.
 */
public record IngestionResult(
        int totalFetched,
        int newEventsCount,
        int updatedEventsCount,
        int ignoredCount
) {
    public static IngestionResult empty() {
        return new IngestionResult(0, 0, 0, 0);
    }
}