package com.alera.seismic.application;

import com.alera.seismic.domain.model.SeismicEvent;
import com.alera.seismic.domain.port.in.IngestSeismicEventsUseCase;
import com.alera.seismic.domain.port.in.IngestionResult;
import com.alera.seismic.domain.port.out.SeismicDataProviderPort;
import com.alera.seismic.domain.port.out.SeismicEventRepositoryPort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
public class SeismicIngestionService implements IngestSeismicEventsUseCase {

    private final SeismicEventRepositoryPort repository;

    public SeismicIngestionService(SeismicEventRepositoryPort repository) {
        this.repository = Objects.requireNonNull(repository, "El repositorio sísmico no puede ser nulo");
    }

    @Override
    @Transactional
    public IngestionResult execute(SeismicDataProviderPort dataProvider) {
        Objects.requireNonNull(dataProvider, "El proveedor de datos no puede ser nulo");

        List<SeismicEvent> incomingEvents = dataProvider.fetchRecentEvents();
        if (incomingEvents == null || incomingEvents.isEmpty()) {
            return IngestionResult.empty();
        }

        int newCount = 0;
        int updatedCount = 0;
        int ignoredCount = 0;

        for (SeismicEvent incoming : incomingEvents) {
            Optional<SeismicEvent> existingOpt = repository.findBySourceAndExternalId(
                    incoming.getSource(),
                    incoming.getExternalId()
            );

            if (existingOpt.isEmpty()) {
                repository.save(incoming);
                newCount++;
            } else {
                SeismicEvent existing = existingOpt.get();
                if (hasEventChanged(existing, incoming)) {
                    existing.updateDetails(
                            incoming.getMagnitude(),
                            incoming.getDepth(),
                            incoming.getCoordinates(),
                            incoming.getEpicenterDescription(),
                            incoming.getReviewStatus()
                    );
                    repository.save(existing);
                    updatedCount++;
                } else {
                    ignoredCount++;
                }
            }
        }

        return new IngestionResult(incomingEvents.size(), newCount, updatedCount, ignoredCount);
    }

    private boolean hasEventChanged(SeismicEvent existing, SeismicEvent incoming) {
        return !existing.getMagnitude().equals(incoming.getMagnitude())
                || !existing.getDepth().equals(incoming.getDepth())
                || !existing.getCoordinates().equals(incoming.getCoordinates())
                || !existing.getEpicenterDescription().equals(incoming.getEpicenterDescription())
                || existing.getReviewStatus() != incoming.getReviewStatus();
    }
}