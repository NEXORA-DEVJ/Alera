package com.alera.seismic.infrastructure.scheduler;

import com.alera.seismic.domain.port.in.IngestSeismicEventsUseCase;
import com.alera.seismic.domain.port.in.IngestionResult;
import com.alera.seismic.domain.port.out.SeismicDataProviderPort;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Objects;

@Component
public class SeismicIngestionScheduler {

    private static final Logger log = LoggerFactory.getLogger(SeismicIngestionScheduler.class);

    private final IngestSeismicEventsUseCase ingestUseCase;
    private final List<SeismicDataProviderPort> providers;

    public SeismicIngestionScheduler(IngestSeismicEventsUseCase ingestUseCase,
                                     List<SeismicDataProviderPort> providers) {
        this.ingestUseCase = Objects.requireNonNull(ingestUseCase, "IngestSeismicEventsUseCase no puede ser nulo");
        this.providers = Objects.requireNonNull(providers, "La lista de proveedores no puede ser nula");
    }

    /**
     * Tarea programada:
     * - initialDelay = 5000 (espera 5 segundos tras el arranque).
     * - fixedDelay = 60000 (se ejecuta cada 60 segundos tras finalizar la anterior).
     */
    @Scheduled(initialDelay = 5000, fixedDelay = 60000)
    public void runIngestion() {
        log.info(">>> Iniciando ciclo de ingesta sismica automatica...");

        for (SeismicDataProviderPort provider : providers) {
            try {
                IngestionResult result = ingestUseCase.execute(provider);
                log.info(">>> Ingesta completada para [{}] -> Consultados: {}, Nuevos: {}, Actualizados: {}, Ignorados: {}",
                        provider.getSource(),
                        result.totalFetched(),
                        result.newEventsCount(),
                        result.updatedEventsCount(),
                        result.ignoredCount());
            } catch (Exception ex) {
                log.error(">>> Error durante la ingesta del proveedor [{}]: {}", provider.getSource(), ex.getMessage());
            }
        }
    }
}