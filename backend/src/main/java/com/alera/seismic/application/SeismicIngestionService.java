package com.alera.seismic.application;

import com.alera.seismic.domain.model.SeismicEvent;
import com.alera.seismic.domain.port.in.IngestSeismicEventsUseCase;
import com.alera.seismic.domain.port.in.IngestionResult;
import com.alera.seismic.domain.port.out.SeismicDataProviderPort;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;

@Service
public class SeismicIngestionService implements IngestSeismicEventsUseCase {

    private final SeismicPersistenceService persistenceService;

    public SeismicIngestionService(SeismicPersistenceService persistenceService) {
        this.persistenceService = Objects.requireNonNull(persistenceService, "El servicio de persistencia no puede ser nulo");
    }

    @Override
    public IngestionResult execute(SeismicDataProviderPort dataProvider) {
        Objects.requireNonNull(dataProvider, "El proveedor de datos no puede ser nulo");

        // 1. Consulta HTTP externa fuera de la transacción de base de datos (evita fugas en pool de conexiones)
        List<SeismicEvent> incomingEvents = dataProvider.fetchRecentEvents();
        if (incomingEvents == null || incomingEvents.isEmpty()) {
            return IngestionResult.empty();
        }

        // 2. Persistencia atómica transaccional y limpieza de caché
        return persistenceService.persistEvents(incomingEvents);
    }
}
