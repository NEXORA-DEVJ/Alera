package com.alera.seismic.domain.port.in;

import com.alera.seismic.domain.port.out.SeismicDataProviderPort;

public interface IngestSeismicEventsUseCase {

    IngestionResult execute(SeismicDataProviderPort dataProvider);
}